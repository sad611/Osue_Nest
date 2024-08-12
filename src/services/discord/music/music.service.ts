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
} from 'discord.js';
import { EngineMenuInterceptor, LoopMenuInterceptor } from './options/menu.interceptor';
import { EmbedService } from '../embed/embed.service';
import { EmbedInteractionService } from '../embed/embed-interaction/embed-interaction.service';
import { MenuService } from '../components/menu/menu.service';
import * as fs from 'fs';
import { MusicEventService } from './music-event/music-event.service';

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
    client: Client,
    private menuService: MenuService,
    private embedService: EmbedService,
    private musicEvent: MusicEventService,
    @Inject(forwardRef(() => EmbedInteractionService)) private embedInteraction: EmbedInteractionService,
  ) {
    this.createPlayer(client);
    this.musicEvent.playerListen(this.player);
  }

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
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const channel = member.voice.channel;
      if (!channel)
        return interaction.reply({ content: 'You need to be connected to a voice channel!', ephemeral: true });
      if (!choicesSet.has(engine)) engine = 'autoSearch' as SearchQueryType;

      await interaction.deferReply();

      const result = await this.player.search(query, { requestedBy: interaction.user});
      if (!result.hasTracks()) {
        return interaction.followUp({ content: 'No tracks found', ephemeral: true });
      }
      
      const queue =
        this.player.queues.get(interaction.guild) ||
        this.player.queues.create(interaction.guild, { metadata: { channel: interaction.channel } });
      const { track } = await this.player.play(channel, result, {
        nodeOptions: {
          noEmitInsert: true,
          preferBridgedMetadata: true,
          disableBiquad: true,
          leaveOnEnd: false,
          leaveOnStop: false,
          leaveOnEmpty: false,
          
        },
        connectionOptions: {
          deaf: true,
        },
      });
      if (!track) return;

      if (queue.tracks.size === 0) return interaction.deleteReply();

      const embed = this.embedService
        .Info({
          title: `${result.hasPlaylist() ? 'Playlist queued!' : `Track queued at position #${queue.tracks.size}!`}`,
          thumbnail: { url: track.thumbnail },
          description: `[${track.title}](${track.url})`,
          fields: result.playlist
            ? [{ name: 'Playlist', value: result.playlist.title }]
            : [
                { name: 'Author', value: `${track.author}`, inline: true },
                { name: '', value: ``, inline: true },
                { name: 'Duration', value: `${track.duration}`, inline: true },
              ],
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    } catch (err) {
      console.log(err);
    }
  }

  @Subcommand({ name: 'np', description: 'The song currently playing' })
  public async nowMusic(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply({ ephemeral: true });

    const queue = useQueue(interaction.guildId);

    if (!queue || !queue.isPlaying()) {
      return interaction.followUp({ content: 'There is currently no song playing', ephemeral: true });
    }

    const queueNode = new GuildQueuePlayerNode(queue);

    const track = queue.currentTrack;
    const progressBar = queueNode.createProgressBar();

    const embed = this.embedService.Info({
      title: 'Now Playing!',
      description: `[${track.title}](${track.url})`,
      fields: [{ name: 'Progress', value: progressBar }],
      thumbnail: { url: track.thumbnail },
      footer: {
        text: `Requested by ${track.requestedBy.tag}`,
        iconURL: track.requestedBy?.displayAvatarURL(),
      },
    });

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'skip', description: 'Skips the currently playing song' })
  public async skipMusic(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply();

    const timeline = useTimeline(interaction.guildId);
    const queue = useQueue(interaction.guild);

    if (!queue.isPlaying()) {
      return interaction.followUp({ content: 'There is currently no song playing', ephemeral: true });
    }
    const track = queue.currentTrack;
    queue.node.skip();
    const embed = this.embedService.Info({
      title: 'Song skipped!',
      description: `[${track.title}](${track.url})`,
      fields: [
        { name: 'Author', value: `${track.author}`, inline: true },
        { name: '', value: ``, inline: true },
        { name: 'Duration', value: `${track.duration}`, inline: true },
      ],
    });
    return interaction.followUp({ content: `Song skipped: ${timeline.track.title}`, ephemeral: true });
  }

  @Subcommand({ name: 'queue', description: 'Display this guild music queue' })
  public async queueMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);
    await interaction.deferReply();

    if (!queue) return interaction.followUp({ content: 'There is no queue created', ephemeral: true });
    const tracks = queue.tracks;
    interaction.deleteReply();
    await this.embedInteraction.handleInteractionQueue(interaction.channel, queue, tracks.toArray(), interaction.user);
  }

  @UseInterceptors(LoopMenuInterceptor)
  @Subcommand({ name: 'loop', description: 'Loops queue or current song' })
  public async loopMusic(@Context() [interaction]: SlashCommandContext, @Options() { loop }: LoopDto) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });
    if (!queue?.isPlaying()) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (!loop) loop = QueueRepeatMode.QUEUE;

    if (queue?.repeatMode !== QueueRepeatMode.OFF) loop = QueueRepeatMode.OFF;

    queue.setRepeatMode(loop);
    const embed = this.embedService.Info({ title: 'Loop', description: `Loop mode is ${QueueRepeatMode[loop]}` });

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'pause', description: 'Pauses the player' })
  public async pauseMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });

    if (!queue?.isPlaying()) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const timeline = useTimeline(interaction.guild);
    const isPaused = timeline.paused;

    let action: string;
    if (isPaused) {
      timeline.resume();
      action = 'Resumed';
    } else {
      timeline.pause();
      action = 'Paused';
    }

    const embed = this.embedService.Info({ title: action }).withAuthor(interaction.user);
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'resume', description: 'Resumes the player' })
  public async resumeMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });

    if (!queue?.isPlaying()) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const timeline = useTimeline(interaction.guild);

    if (!timeline.paused) {
      const embed = this.embedService.Info({ title: `I'm already playing` }).withAuthor(interaction.user);
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    timeline.resume();
    const embed = this.embedService.Info({ title: 'Resumed' }).withAuthor(interaction.user);

    this.embedInteraction.handleInteractionGeneral(
      interaction.channel,
      queue,
      embed,
      timeline.track.durationMS,
      interaction.user,
    );
  }

  @Subcommand({ name: 'shuffle', description: 'Shuffles the queue' })
  public async shuffleMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });

    if (!queue?.tracks) {
      const embed = this.embedService.Info({
        title: 'Empty queue',
        description: `There's no tracks in the queue to shuffle`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    queue.enableShuffle(false);

    const embed = this.embedService.Info({ title: 'Queue shuffled' }).withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'move', description: 'Moves the track to a position (head of the queue if no second argument)' })
  public async moveMusic(@Context() [interaction]: SlashCommandContext, @Options() { from, to }: MoveDto) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });

    if (!queue?.tracks || queue.tracks.size === 0) {
      const embed = this.embedService.Info({
        title: 'Empty queue',
        description: `There are no tracks in the queue to move.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (from < 1 || from > queue.tracks.size) {
      const embed = this.embedService.Info({
        title: 'Invalid position',
        description: `The 'from' position ${from} is out of bounds.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (to === null) to = 1;

    if (to < 1 || to > queue.tracks.size + 1) {
      const embed = this.embedService.Info({
        title: 'Invalid position',
        description: `The 'to' position ${to} is out of bounds.`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const fromIndex = from - 1;
    const toIndex = to - 1;
    const track = queue.tracks.at(fromIndex);
    queue.node.move(fromIndex, toIndex);
    const embed = this.embedService
      .Info({
        title: 'Track moved',
        description: `Moved track [${track.title}](${track.url}) from position ${from} to position ${to}.`,
      })
      .withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'leave', description: 'Leaves the voice channel' })
  public async leaveMusic(@Context() [interaction]: SlashCommandContext, @Options() { from, to }: MoveDto) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guildId);

    if (!queue) {
      const embed = this.embedService
        .Info({
          title: 'Not playing',
          description: 'I am not playing anything right now',
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    }

    const connection = this.player.voiceUtils.getConnection(interaction.guild.id);
    this.player.voiceUtils.disconnect(connection);
    queue.delete();

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

    const queue = useQueue(interaction.guildId);

    if (!queue) {
      const embed = this.embedService
        .Info({
          title: 'Not playing',
          description: 'I am not playing anything right now',
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    }

    if (!queue.tracks) {
      const embed = this.embedService
        .Info({
          title: 'No music in queue!',
        })
        .withAuthor(interaction.user);

      return interaction.followUp({ embeds: [embed] });
    }

    queue.tracks.clear();

    const embed = this.embedService
      .Info({
        title: 'Queue cleared!',
      })
      .withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed] });
  }

  @UseInterceptors(EngineMenuInterceptor)
  @Subcommand({ name: 'search', description: 'Searches a music' })
  public async searchMusic(@Context() [interaction]: SlashCommandContext, @Options() { query, engine }: MusicQueryDto) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const channel = member.voice.channel;
      if (!channel) return;
      await interaction.deferReply();
      if (!choicesSet.has(engine)) engine = 'autoSearch';

      const result = await this.player.search(query, { requestedBy: interaction.user });
      if (!result.hasTracks()) {
        return interaction.followUp({ content: 'No tracks found', ephemeral: true });
      }

      const topResults = result.tracks.slice(0, 10);
      const selectMenu = this.menuService.createStringSelectMenu(topResults);

      const embed1 = this.embedService
        .Info({
          title: 'These are the top results!',
        })
        .withAuthor(interaction.user);

      const menuMessage = await interaction.followUp({
        content: 'Select a track:',
        embeds: [embed1],
        components: [selectMenu],
      });

      try {
        const interactionResponse = await interaction.channel.awaitMessageComponent({
          filter: (i) => i.isMessageComponent() && i.customId === 'search-menu',
          time: 60000,
        });

        const selectInteraction = interactionResponse as StringSelectMenuInteraction;
        const index = parseInt(selectInteraction.values[0]);
        const selectedTrack = topResults[index];
        menuMessage.delete();

        const queue =
          this.player.queues.get(interaction.guild) ||
          this.player.queues.create(interaction.guild, { metadata: { channel: channel } });

        const { track } = await this.player.play(channel, selectedTrack, {
          searchEngine: engine,
          nodeOptions: {
            volume: 0,
            noEmitInsert: true,
            leaveOnStop: false,
            leaveOnEmptyCooldown: 60000,
            preferBridgedMetadata: true,
            disableBiquad: true,
          },
          connectionOptions: {
            deaf: true,
          },
        });
        if (queue.tracks.size === 0) return interaction.deleteReply();
        const embed2 = this.embedService
          .Info({
            title: `Track queued at position #${queue.tracks.size}!`,
            thumbnail: { url: track.thumbnail },
            description: `[${track.title}](${track.url})`,
            fields: result.playlist
              ? [{ name: 'Playlist', value: result.playlist.title }]
              : [
                  { name: 'Author', value: `${track.author}`, inline: true },
                  { name: '', value: ``, inline: true },
                  { name: 'Duration', value: `${track.duration}`, inline: true },
                ],
          })
          .withAuthor(interaction.user);

        return interaction.followUp({ embeds: [embed2] });
      } catch (timeoutError) {
        menuMessage.delete();
        return interaction.followUp({ content: 'No track selected within the time limit', ephemeral: true });
      }
    } catch (err) {
      console.log(err);
    }
  }

  @Subcommand({ name: 'lyrics', description: 'Lyrics of a song' })
  public async lyricsMusic(@Context() [interaction]: SlashCommandContext, @Options() { query }: LyricsDto) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });
    if (!queue?.isPlaying()) {
      const embed = this.embedService.Info({ title: 'Not playing', description: `I'm currently not playing anything` });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (!query) query = queue.currentTrack.title;

    const lyricsExtract = lyricsExtractor();

    try {
      const result = await lyricsExtract.search(query);

      if (!result || !result.lyrics) {
        const embed = this.embedService.Info({
          title: 'Lyrics not found',
          description: `Could not find lyrics for the song "${query}".`,
        });
        return interaction.followUp({ embeds: [embed], ephemeral: true });
      }

      const embed = this.embedService.Info({
        title: `Lyrics for ${result.title}`,
        description: result.lyrics,
        thumbnail: { url: result.image },
      });

      return interaction.followUp({ embeds: [embed], ephemeral: true });
    } catch (err) {
      const embed = this.embedService.Info({
        title: 'Error fetching the lyrics',
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }

  @Subcommand({ name: 'disconnect', description: 'Disconnect from channel' })
  public async disconnectMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);

    await interaction.deferReply({ ephemeral: true });
    if (!queue?.channel) {
      const embed = this.embedService.Info({
        title: 'Not in channel',
        description: `I'm currently not in any channel`,
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const embed = this.embedService.Info({ title: 'Left voice channel!' });
    queue.dispatcher.disconnect();
    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'join', description: 'Joins a voice channel' })
  public async joinMusic(@Context() [interaction]: SlashCommandContext) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await interaction.deferReply({ ephemeral: true });
    if (!member.voice.channel) {
      const embed = this.embedService.Info({
        title: 'User not in channel',
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const queue = useQueue(interaction.guild);
    if (queue?.isPlaying) {
      const embed = this.embedService.Info({
        title: 'Already playing in another channel',
      });
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    this.player.voiceUtils.join(member.voice.channel, { deaf: true });

    const embed = this.embedService.Info({ title: `Joined ${member.voice.channel}!` });
    return interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  @Subcommand({ name: 'test', description: 'test' })
  public async testMusic(@Context() [interaction]: SlashCommandContext) {
    const member = await interaction.guild.members.fetch('473268285362667522');
    const role = await interaction.guild.roles.fetch('1253319749895585883');
    member.roles.remove(role).then((res) => console.log(res));
  }
}
