import { forwardRef, Inject, Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { Context, createCommandGroupDecorator, Options, SlashCommandContext, Subcommand } from 'necord';
import { GuildQueuePlayerNode, Player, QueueRepeatMode, SearchQueryType, useQueue, useTimeline } from 'discord-player';
import { lyricsExtractor } from '@discord-player/extractor';
import { LoopDto, LyricsDto, MoveDto, MusicQueryDto } from './options/dto';
import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
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

  @UseInterceptors(EngineMenuInterceptor)
  @Subcommand({ name: 'play', description: 'Queues a music' })
  public async playMusic(@Context() [interaction]: SlashCommandContext, @Options() { query, engine }: MusicQueryDto) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const channel = member.voice.channel;

    await interaction.deferReply();

    if (!channel)
      return interaction.reply({ content: 'You need to be connected to a voice channel!', ephemeral: true });
    // if (!choicesSet.has(engine)) engine = 'autoSearch' as SearchQueryType;
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

  @Subcommand({ name: 'np', description: 'The song currently playing' })
  public async nowMusic(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply();
    const player = this.playerManager.get(interaction.guild.id);
    if (!player || !player.playing) {
      return interaction.followUp({ content: 'There is currently no song playing', ephemeral: true });
    }
    if (player.paused) {
      return interaction.followUp({ content: 'The current song on queue is paused', ephemeral: true });
    }
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
    await interaction.editReply({ embeds: [embed] });
    const replyMessage = await interaction.fetchReply();
    this.embedInteraction.handleInteractionGeneral(replyMessage, player, embed, track.duration);
  }

  @Subcommand({ name: 'skip', description: 'Skips the currently playing song' })
  public async skipMusic(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply();

    const player = this.playerManager.get(interaction.guild.id);
    if (!player || !player.playing) {
      return interaction.followUp({ content: 'There is currently no song playing', ephemeral: true });
    }

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

  @Subcommand({ name: 'queue', description: 'Display this guild music queue' })
  public async queueMusic(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply();

    const player = this.playerManager.get(interaction.guild.id);
    if (!player || !player.playing) {
      return interaction.followUp({ content: 'There is currently no song playing', ephemeral: true });
    }

    const tracks = player.queue.tracks;
    console.log(tracks);
    interaction.deleteReply();
    await this.embedInteraction.handleInteractionQueue(interaction.channel, tracks, interaction.user);
  }

  @UseInterceptors(LoopMenuInterceptor)
  @Subcommand({ name: 'loop', description: 'Loops queue or current song' })
  public async loopMusic(@Context() [interaction]: SlashCommandContext, @Options() { loop }: LoopDto) {
    const player = this.playerManager.get(interaction.guild.id);

    await interaction.deferReply();
    if (!player.playing) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (!loop) loop = 'queue';

    if (player.repeatMode !== 'off') loop = 'off';

    await player.setRepeatMode(loop);
    const embed = this.embedService.Info({ title: 'Loop', description: `Loop mode is ${player.repeatMode}` });

    return interaction.followUp({ embeds: [embed] });
  }

  @Subcommand({ name: 'pause', description: 'Pauses the player' })
  public async pauseMusic(@Context() [interaction]: SlashCommandContext) {
    const player = this.playerManager.get(interaction.guild.id);

    await interaction.deferReply({ ephemeral: true });

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
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'resume', description: 'Resumes the player' })
  public async resumeMusic(@Context() [interaction]: SlashCommandContext) {
    const player = this.playerManager.get(interaction.guild.id);

    await interaction.deferReply({ ephemeral: true });

    if (!player.playing) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (!player.paused) {
      const embed = this.embedService.Info({ title: `I'm already playing` }).withAuthor(interaction.user);
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    player.resume();
    // const embed = this.embedService.Info({ title: 'Resumed' }).withAuthor(interaction.user);
  }

  @Subcommand({ name: 'shuffle', description: 'Shuffles the queue' })
  public async shuffleMusic(@Context() [interaction]: SlashCommandContext) {
    const player = this.playerManager.get(interaction.guildId);

    await interaction.deferReply({ ephemeral: true });

    if (!player.queue.tracks) {
      const embed = this.embedService.Info({
        title: 'Empty queue',
        description: `There's no tracks in the queue to shuffle`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    player.queue.shuffle();

    const embed = this.embedService.Info({ title: 'Queue shuffled' }).withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'move', description: 'Moves the track to a position (head of the queue if no second argument)' })
  public async moveMusic(@Context() [interaction]: SlashCommandContext, @Options() { from, to }: MoveDto) {
    const player = this.playerManager.get(interaction.guildId);

    await interaction.deferReply({ ephemeral: true });

    if (!player.queue?.tracks || player.queue.tracks.length === 0) {
      const embed = this.embedService.Info({
        title: 'Empty queue',
        description: `There are no tracks in the queue to move.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (from < 1 || from > player.queue.tracks.length) {
      const embed = this.embedService.Info({
        title: 'Invalid position',
        description: `The 'from' position ${from} is out of bounds.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (to === null) to = 1;

    if (to < 1 || to > player.queue.tracks.length + 1) {
      const embed = this.embedService.Info({
        title: 'Invalid position',
        description: `The 'to' position ${to} is out of bounds.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const fromIndex = from - 1;
    const toIndex = to - 1;
    const track = player.queue.tracks.at(fromIndex);
    player.queue.tracks.splice(toIndex, 0, track);
    const embed = this.embedService
      .Info({
        title: 'Track moved',
        description: `Moved track [${track.info.title}](${track.info.uri}) from position ${from} to position ${to}.`,
      })
      .withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'leave', description: 'Leaves the voice channel' })
  public async leaveMusic(@Context() [interaction]: SlashCommandContext, @Options() { from, to }: MoveDto) {
    const player = this.playerManager.get(interaction.guildId);

    await interaction.deferReply();

    if (!player) {
      const embed = this.embedService
        .Info({
          title: 'Not playing',
          description: 'I am not playing anything right now',
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    }

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

  @Subcommand({ name: 'clear', description: 'Clear the queue' })
  public async clearMusic(@Context() [interaction]: SlashCommandContext, @Options() MoveDto) {
    await interaction.deferReply();

    const player = this.playerManager.get(interaction.guildId);

    if (!player) {
      const embed = this.embedService
        .Info({
          title: 'Not playing',
          description: 'I am not playing anything right now',
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    }

    if (!player.queue.tracks) {
      const embed = this.embedService
        .Info({
          title: 'No music in queue!',
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    }

    player.queue.tracks.splice(0, player.queue.tracks.length);

    const embed = this.embedService
      .Info({
        title: 'Queue cleared!',
      })
      .withAuthor(interaction.user);
    
    return interaction.followUp({ embeds: [embed] });
  }

  @UseInterceptors(EngineMenuInterceptor)
  @Subcommand({ name: 'search', description: 'Searches a music' })
  public async searchMusic(@Context() [interaction]: SlashCommandContext, @Options() { query }: MusicQueryDto) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const channel = member.voice.channel;
      if (!channel) {
        return interaction.followUp({ content: 'You must be in a voice channel.', ephemeral: true });
      }

      await interaction.deferReply();

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
        return interaction.followUp({ content: 'No tracks found', ephemeral: true });
      }
      const topResults = res.tracks.slice(0, 10);
      const selectMenu = this.menuService.createStringSelectMenu(topResults);
      const embed = this.embedService.Info({ title: 'These are the top results!' }).withAuthor(interaction.user);

      const menuMessage = await interaction.followUp({
        content: 'Select a track:',
        embeds: [embed],
        components: [selectMenu],
      });

      let selectInteraction: StringSelectMenuInteraction;
      try {
        const interactionResponse = await interaction.channel.awaitMessageComponent({
          filter: (i) => i.isMessageComponent() && i.customId === 'search-menu',
          time: 60000,
        });
        selectInteraction = interactionResponse as StringSelectMenuInteraction;
      } catch (timeoutError) {
        await menuMessage.delete();
        return interaction.followUp({ content: 'No track selected within the time limit', ephemeral: true });
      }

      const index = parseInt(selectInteraction.values[0], 10);
      const selectedTrack = topResults[index];
      if (!selectedTrack) {
        return interaction.followUp({ content: 'Invalid track selection', ephemeral: true });
      }
      console.log(selectedTrack.info.title);

      if (!player.connected) {
        await player.connect();
      }

      player.queue.add(selectedTrack);
      if (!player.playing) {
        await player.play();
      }

      if (player.queue.tracks.length !== 0) {
        this.musicEvent.onTrackAdded(res.tracks, interaction, res.loadType, player.queue);
      }

      // await interaction.deleteReply();
      await menuMessage.delete();
    } catch (err) {
      console.error(err);
      return interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
    }
  }

  @Subcommand({ name: 'lyrics', description: 'Lyrics of a song' }) //@Options() { query }: LyricsDto
  public async lyricsMusic(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply();

    const player = this.playerManager.get(interaction.guildId);

    if (!player.playing) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    try {
      const track = player.queue.current;
      const lyrics = await player.getLyrics(track);
      this.embedInteraction.handleInteractionLyrics(interaction.channel, lyrics.lines, track.info, interaction.user);
      interaction.deleteReply();
    } catch (err) {
      console.error(err);
      return interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
    }
  }

  @Subcommand({ name: 'disconnect', description: 'Disconnect from channel' })
  public async disconnectMusic(@Context() [interaction]: SlashCommandContext) {
    const player = this.playerManager.get(interaction.guildId);
    await interaction.deferReply({ ephemeral: true });
    if (!player) {
      const embed = this.embedService.Info({
        title: 'Not in channel',
        description: `I'm currently not in any channel`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (member.voice.channel.id !== player.voiceChannelId) {
      const embed = this.embedService.Info({
        title: 'Not in channel',
        description: `You need to be in the same voice channel as the Bot to use this command`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const embed = this.embedService.Info({ title: 'Left voice channel!' });
    player.disconnect();
    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'join', description: 'Joins a voice channel' })
  public async joinMusic(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    let player = this.playerManager.get(interaction.guild.id);

    if (player && player.playing) {
      const embed = this.embedService.Info({
        title: 'Already playing in another channel',
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (!player) {
      player = this.playerManager.create({
        ...this.lavalinkService.extractInfoForPlayer(interaction),
        selfDeaf: true,
        selfMute: false,
        volume: 100,
      });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.voice.channel) {
      const embed = this.embedService.Info({
        title: 'User not in channel',
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    await player.connect();

    const embed = this.embedService.Info({
      title: `Joined ${member.voice.channel}!`,
    });
    return interaction.followUp({ embeds: [embed], ephemeral: true });
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
