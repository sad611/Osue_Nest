import { forwardRef, Inject, Injectable, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { Context, createCommandGroupDecorator, Options, SlashCommandContext, Subcommand } from 'necord';
import { GuildQueuePlayerNode, Player, QueueRepeatMode, SearchQueryType, useQueue, useTimeline } from 'discord-player';
import { lyricsExtractor } from '@discord-player/extractor';
import { LoopDto, LyricsDto, MoveDto, MusicQueryDto } from './options/dto';
import {
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  Guild,
  GuildBasedChannel,
  GuildTextBasedChannel,
  Message,
  StringSelectMenuInteraction,
  TextChannel,
} from 'discord.js';
import { EngineMenuInterceptor, LoopMenuInterceptor } from './options/menu.interceptor';
import { EmbedService } from '../embed/embed.service';
import { EmbedInteractionService } from '../embed/embed-interaction/embed-interaction.service';
import { MenuService } from '../components/menu/menu.service';
import * as fs from 'fs';
import { MusicEventService } from './music-event/music-event.service';
import { HttpService } from '@nestjs/axios';
import { NecordLavalinkService, PlayerManager } from '@necord/lavalink';
import { GeneralService } from './general/general.service';
import { QueueUpdatesGateway } from '../../../controller/discord/gateway/queue.gateway';
import { MusicPreconditions } from './guards/music.preconditions.decorator';
import { MusicCommandGuard } from './guards/music-command.guard';
import { GuardedInteraction } from './guards/guarded-interaction.interface';

const choicesSet = new Set<SearchQueryType>(['youtubeSearch', 'spotifySearch', 'soundcloudSearch']);

const UtilsCommands = createCommandGroupDecorator({
  name: 'music',
  description: 'music',
});

// ilter
// dc
// move
// bota no biotao
// botar musica que vai tocar
// botar footer no nowPlaying

@UtilsCommands()
@Injectable()
export class MusicService {
  private player: Player;
  private logger: Logger;
  private cookie;
  constructor(
    private client: Client,
    private generalService: GeneralService,
    private menuService: MenuService,
    private embedService: EmbedService,
    private musicEvent: MusicEventService,
    private readonly httpService: HttpService,
    private gatewayService: QueueUpdatesGateway,
    @Inject(forwardRef(() => EmbedInteractionService)) private embedInteraction: EmbedInteractionService,
    private readonly playerManager: PlayerManager,
    private readonly lavalinkService: NecordLavalinkService,
  ) {}

  createPlayer(client: Client) {
    const cookie = JSON.parse(fs.readFileSync('src/json/cookie.json', 'utf8'));

    this.player = new Player(client, {
      ytdlOptions: {
        requestOptions: {
          headers: {
            cookie: cookie,
          },
        },
      },
    });
  }

  @MusicPreconditions({ requiresSameVoiceChannel: true })
  @UseGuards(MusicCommandGuard)
  @UseInterceptors(EngineMenuInterceptor)
  @Subcommand({ name: 'play', description: 'Queues a music' })
  public async playMusic(@Context() [interaction]: [GuardedInteraction], @Options() { query, engine }: MusicQueryDto) {
    const player =
      this.playerManager.get(interaction.guild.id) ??
      this.playerManager.create({
        ...this.lavalinkService.extractInfoForPlayer(interaction),
        selfDeaf: true,
        selfMute: false,
        volume: 100,
      });

    const res = await player.search(
      {
        query,
        source: 'youtube',
      },
      interaction.user,
    );

    if (!res.tracks.length) {
      return interaction.followUp({ content: 'No tracks found', ephemeral: true });
    }

    if (!player.connected) await player.connect();
    res.loadType === 'playlist' ? player.queue.add(res.tracks) : player.queue.add(res.tracks[0]);
    if (!player.playing) await player.play();

    if (player.queue.tracks.length !== 0) {
      return this.musicEvent.onTrackAdded(res.tracks, interaction, res.loadType, player.queue);
    }
    interaction.deleteReply();
    return;
  }

  @MusicPreconditions({ requiresCurrentTrack: true, replyType: 'public' })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'np', description: 'The song currently playing' })
  public async nowMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer!;
    const track = player.queue.current.info;
    const progressBar = this.splitBar(track.duration, player.position, 15);

    const embed = this.embedService.Info({
      title: 'Now Playing!',
      description: `[${track.title}](${track.uri})`,
      fields: [
        { name: 'Progress', value: `[${progressBar}]`, inline: true },
        {
          name: 'Duration',
          value: `${this.generalService.msToTime(player.position)}/${this.generalService.msToTime(track.duration)}`,
          inline: true,
        },
      ],

      thumbnail: { url: track.artworkUrl },
    });

    const message = await interaction.followUp({ embeds: [embed] });

    this.embedInteraction.handleInteractionGeneral(message, player, embed, track.duration);
  }

  @MusicPreconditions({ requiresCurrentTrack: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'skip', description: 'Skips the currently playing song' })
  public async skipMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    const track = player.queue.current;

    player.skip(0, false);

    // const embed = this.embedService.Info({
    //   title: 'Song skipped!',
    //   description: `[${track.info.title}](${track.info.uri})`,
    //   fields: [
    //     { name: 'Author', value: `${track.info.author}`, inline: true },
    //     { name: '', value: ``, inline: true },
    //     { name: 'Duration', value: `${this.msToTime(track.info.duration)}`, inline: true },
    //   ],
    // });
    return interaction.followUp({ content: `Song skipped: ${track.info.title}` });
  }

  @MusicPreconditions({ requiresPlayer: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'queue', description: 'Display this guild music queue' })
  public async queueMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    const tracks = player.queue.tracks;

    if (!tracks || tracks.length === 0) {
      const embed = this.embedService.Info({
        title: 'Empty queue',
        description: `There's no tracks in the queue`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    interaction.deleteReply();
    await this.embedInteraction.handleInteractionQueue(interaction.channel, tracks, interaction.user);
  }

  @UseInterceptors(LoopMenuInterceptor)
  @MusicPreconditions({ requiresPlayer: true, replyType: 'public' })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'loop', description: 'Loops queue or current song' })
  public async loopMusic(@Context() [interaction]: [GuardedInteraction], @Options() { loop }: LoopDto) {
    const player = interaction.guildPlayer;
    if (!loop) loop = 'queue';

    if (player.repeatMode !== 'off') loop = 'off';

    await player.setRepeatMode(loop);
    const embed = this.embedService.Info({ title: 'Loop', description: `Loop mode is ${player.repeatMode}` });

    return interaction.followUp({ embeds: [embed] });
  }

  @MusicPreconditions({ requiresPlayerPlaying: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'pause', description: 'Pauses the player' })
  public async pauseMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    if (!player.playing) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const isPaused = player.paused;

    let action: string;
    if (isPaused) {
      player.resume();
      action = 'Resumed';
    } else {
      player.pause();
      action = 'Paused';
    }

    const embed = this.embedService.Info({ title: action }).withAuthor(interaction.user);
    await interaction.followUp({ embeds: [embed] });
  }

  @MusicPreconditions({ requiresPlayerPaused: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'resume', description: 'Resumes the player' })
  public async resumeMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    player.resume();
    // const embed = this.embedService.Info({ title: 'Resumed' }).withAuthor(interaction.user);
  }

  @MusicPreconditions({ requiresQueueNotEmpty: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'shuffle', description: 'Shuffles the queue' })
  public async shuffleMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    player.queue.shuffle();

    this.gatewayService.tracksUpdate(interaction.guildId, player.queue.tracks);
    const embed = this.embedService.Info({ title: 'Queue shuffled' }).withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @MusicPreconditions({ requiresQueueNotEmpty: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'move', description: 'Moves the track to a position (head of the queue if no second argument)' })
  public async moveMusic(@Context() [interaction]: [GuardedInteraction], @Options() { from, to }: MoveDto) {
    const player = interaction.guildPlayer;

    if (from < 1 || from > player.queue.tracks.length) {
      const embed = this.embedService.Info({
        title: 'Invalid position',
        description: `The 'from' position ${from} is out of bounds.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (to === null) to = 1;

    if (to < 1 || to > player.queue.tracks.length) {
      const embed = this.embedService.Info({
        title: 'Invalid position',
        description: `The 'to' position ${to} is out of bounds.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const fromIndex = from - 1;
    const toIndex = to - 1;

    const [track] = player.queue.tracks.splice(fromIndex, 1);

    player.queue.tracks.splice(toIndex, 0, track);

    this.gatewayService.tracksUpdate(interaction.guildId, player.queue.tracks);
    const embed = this.embedService
      .Info({
        title: 'Track moved',
        description: `Moved track [${track.info.title}](${track.info.uri}) from position ${from} to position ${to}.`,
      })
      .withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @MusicPreconditions({ requiresSameVoiceChannel: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'leave', description: 'Leaves the voice channel' })
  public async leaveMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    player.disconnect();
    player.destroy();

    const embed = this.embedService
      .Info({
        title: 'Disconnected!',
        description: 'I have left the voice channel.',
      })
      .withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed] });
  }

  @MusicPreconditions({ requiresQueueNotEmpty: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'clear', description: 'Clear the queue' })
  public async clearMusic(@Context() [interaction]: [GuardedInteraction], @Options() MoveDto) {
    const player = interaction.guildPlayer;

    player.queue.tracks.splice(0, player.queue.tracks.length);

    const embed = this.embedService
      .Info({
        title: 'Queue cleared!',
      })
      .withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed] });
  }

  @MusicPreconditions({ requiresSameVoiceChannel: true, replyType: 'public' })
  @UseGuards(MusicCommandGuard)
  @UseInterceptors(EngineMenuInterceptor)
  @Subcommand({ name: 'search', description: 'Searches a music' })
  public async searchMusic(@Context() [interaction]: [GuardedInteraction], @Options() { query }: MusicQueryDto) {
    try {
      const player =
        this.playerManager.get(interaction.guild.id) ??
        this.playerManager.create({
          ...this.lavalinkService.extractInfoForPlayer(interaction),
          selfDeaf: true,
          selfMute: false,
          volume: 100,
        });

      const res = await player.search({ query }, interaction.user);
      if (!res.tracks || res.tracks.length === 0) {
        return interaction.editReply({ content: 'No tracks found' });
      }

      const topResults = res.tracks.slice(0, 10);
      const selectMenu = this.menuService.createStringSelectMenu(topResults);
      const embed = this.embedService.Info({ title: 'These are the top results!' }).withAuthor(interaction.user);

      const menuMessage = await interaction.editReply({
        content: 'Select a track:',
        embeds: [embed],
        components: [selectMenu],
      });

      let selectInteraction: StringSelectMenuInteraction;
      try {
        const interactionResponse = await menuMessage.awaitMessageComponent({
          filter: (i) => i.isMessageComponent() && i.customId === 'search-menu' && i.user.id === interaction.user.id,
          time: 60000,
        });
        selectInteraction = interactionResponse as StringSelectMenuInteraction;
      } catch (timeoutError) {
        await interaction.editReply({
          content: 'No track selected within the time limit.',
          embeds: [],
          components: [],
        });
        return;
      }

      const index = parseInt(selectInteraction.values[0], 10);
      const selectedTrack = topResults[index];
      if (!selectedTrack) {
        await interaction.editReply({ content: 'Invalid track selection.', embeds: [], components: [] });
        return;
      }

      if (!player.connected) {
        await player.connect();
      }

      player.queue.add(selectedTrack);
      if (!player.playing) {
        await player.play();
      }
      await selectInteraction.update({
        content: `✅ Queued **${selectedTrack.info.title}**`,
        embeds: [],
        components: [],
      });

      if (player.queue.tracks.length !== 0) {
        this.musicEvent.onTrackAdded(res.tracks, interaction, res.loadType, player.queue);
      }
    } catch (err) {
      console.error(err);
      if (!interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while processing your request.' });
      } else {
        await interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
      }
    }
  }

  @MusicPreconditions({ requiresCurrentTrack: true, replyType: 'public' })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'lyrics', description: 'Lyrics of a song' }) //@Options() { query }: LyricsDto
  public async lyricsMusic(@Context() [interaction]: [GuardedInteraction]) {
    return;
    const player = interaction.guildPlayer;
    try {
      const track = player.queue.current;
      const lyrics = await player.getLyrics(track, true);

      if (!lyrics) return;

      const currentTime = track.info.duration - player.position;
      this.embedInteraction.handleInteractionLyrics(
        interaction.channel,
        lyrics.lines,
        track.info,
        currentTime,
        interaction.user,
      );
      interaction.deleteReply();
    } catch (err) {
      console.error(err);
      return interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
    }
  }

  @MusicPreconditions({ requiresSameVoiceChannel: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'disconnect', description: 'Disconnect from channel' })
  public async disconnectMusic(@Context() [interaction]: [GuardedInteraction]) {
    const player = interaction.guildPlayer;

    const embed = this.embedService.Info({ title: 'Left voice channel!' });
    player.disconnect();
    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @MusicPreconditions({ requiresVoiceChannel: true, requiresPlayer: false })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'join', description: 'Joins a voice channel' })
  public async joinMusic(@Context() [interaction]: [GuardedInteraction]) {
    let player = interaction.guildPlayer;

    if (!player) {
      player = this.playerManager.create({
        ...this.lavalinkService.extractInfoForPlayer(interaction),
        selfDeaf: true,
        selfMute: false,
        volume: 100,
      });
    }

    await player.connect();

    // console.log(interaction.memberVoiceChannel);

    const embed = this.embedService.Info({
      title: `Joined ${interaction.memberVoiceChannel}!`,
    });
    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @MusicPreconditions({ requiresSameVoiceChannel: true })
  @UseGuards(MusicCommandGuard)
  @Subcommand({ name: 'teste', description: 'Joins a voice channel' })
  public async testeMusic(@Context() [interaction]: SlashCommandContext) {
    return;
  }

  splitBar(duration: number, position: number, barLength: number): string {
    if (duration <= 0) return '▬'.repeat(barLength);

    const progress = Math.min(position / duration, 1);

    const progressIndex = Math.min(Math.floor(progress * barLength), barLength - 1);

    let bar = '';
    for (let i = 0; i < barLength; i++) {
      bar += i === progressIndex ? '🔘' : '▬';
    }
    return bar;
  }
}
