import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { Context, createCommandGroupDecorator, Options, SlashCommandContext, Subcommand } from 'necord';
import {
  GuildQueuePlayerNode,
  Player,
  QueueRepeatMode,
  SearchQueryType,
  useMainPlayer,
  usePlayer,
  useQueue,
  useTimeline,
} from 'discord-player';
import { LoopDto, MusicQueryDto } from './options/dto';
import { Client, TextChannel } from 'discord.js';
import { YoutubeExtractor, YouTubeExtractor } from '@discord-player/extractor';
import { EngineMenuInterceptor, LoopMenuInterceptor } from './options/menu.interceptor';
import { EmbedService } from '../embed/embed.service';
import { EmbedInteractionService } from '../embed/embed-interaction/embed-interaction.service';

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

@UtilsCommands()
@Injectable()
export class MusicService {
  private player: Player;
  private logger: Logger;
  constructor(client: Client, private embedService: EmbedService, private embedInteraction: EmbedInteractionService) {
    this.player = new Player(client);

    this.player.events.on('playerStart', (queue, track) => {
      console.log(track.title)
      const embed = embedService.Info({
        title: `Now Playing!`,
        thumbnail: { url: track.thumbnail },
        description: `[${track.title}](${track.url})`,
        fields: [
          { name: 'Author', value: `${track.author}`, inline: true },
          { name: '', value: ``, inline: true },
          { name: 'Duration', value: `${track.duration}`, inline: true },
        ],
      });

      const channel = queue.metadata.textChannel as TextChannel;
      channel.send({embeds: [embed]})
    });

    this.player.events.on('playerError', (queue, error) => {
      console.log(error);
    });
  }
  @UseInterceptors(EngineMenuInterceptor)
  @Subcommand({ name: 'play', description: 'Queues a music' })
  public async playMusic(@Context() [interaction]: SlashCommandContext, @Options() { query, engine }: MusicQueryDto) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const channel = member.voice.channel;

      if (!channel) return;
      if (!choicesSet.has(engine)) engine = 'autoSearch';

      await interaction.deferReply({ ephemeral: true });

      const result = await this.player.search(query, { requestedBy: interaction.user });
      if (!result.hasTracks()) {
        return interaction.followUp({ content: 'No tracks found', ephemeral: true });
      }

      if (!this.player.queues.get(interaction.guild)) this.player.queues.create(interaction.guild);

      const queue = this.player.queues.get(interaction.guild) || this.player.queues.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
        },
      });

      queue.setMetadata({textChannel: interaction.channel})


      const { track } = await this.player.play(channel, result, {
        
        searchEngine: engine,
        nodeOptions: {
          metadata: interaction,
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

      const embed = this.embedService
        .Info({
          title: `${result.hasPlaylist() ? 'Playlist' : 'Track'} queued!`,
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
      this.logger.log(err);
    }
  }

  @Subcommand({ name: 'np', description: 'The song currently playing' })
  public async nowMusic(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply({ephemeral: true});

    const queue = useQueue(interaction.guildId);

    if (!queue || !queue.isPlaying()) {
      return interaction.followUp({ content: 'There is currently no song playing', ephemeral: true });
    }

    const queueNode = new GuildQueuePlayerNode(queue);

    const track = queue.currentTrack;
    const progressBar = queueNode.createProgressBar();

    const embed = this.embedService
      .Info({
        title: 'Now Playing',
        description: `[${track.title}](${track.url})`,
        fields: [{ name: 'Progress', value: progressBar }],
        thumbnail: { url: track.thumbnail },
        footer: {
          text: `Requested by ${track.requestedBy.tag}`,
          iconURL: track.requestedBy?.displayAvatarURL(),
        },
      })
      .withAuthor(interaction.user);

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

    queue.node.skip();

    return interaction.followUp({ content: `Song skipped: ${timeline.track.title}`, ephemeral: true });
  }

  @Subcommand({ name: 'queue', description: 'Display this guild music queue' })
  public async queueMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);

    if (!queue) return interaction.followUp({ content: 'There is no music in the queue', ephemeral: true });
    const tracks = queue.tracks;
    await this.embedInteraction.handleInteractionQueue(interaction, tracks.toArray());
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

    if (isPaused) {
      timeline.resume();
    } else {
      timeline.pause();
    }

    const action = isPaused ? 'Resumed' : 'Paused';
    const embed = this.embedService.Info({ title: action }).withAuthor(interaction.user);

    return interaction.followUp({ embeds: [embed], ephemeral: true });
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

    return interaction.followUp({ embeds: [embed], ephemeral: true });
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
}
