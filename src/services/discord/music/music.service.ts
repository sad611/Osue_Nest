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
import { MusicQuery } from './options/music-query.dto';
import { Client } from 'discord.js';
import { YoutubeExtractor, YouTubeExtractor } from '@discord-player/extractor';
import { StringMenuInterceptor } from '../components/string-menu/string-menu.service';
import { EmbedService } from '../embed/embed.service';
import { EmbedInteractionService } from '../embed/embed-interaction/embed-interaction.service';

const choicesSet = new Set<SearchQueryType>(['youtubeSearch', 'spotifySearch', 'soundcloudSearch']);

const UtilsCommands = createCommandGroupDecorator({
  name: 'music',
  description: 'music',
});

// loop || da musica ou da queue
// queue
// ilter
// pause
// resume
// dc
// move
// shuffle
// bota no biotao
// botar musica que vai tocar

@UtilsCommands()
@Injectable()
export class MusicService {
  private player: Player;
  private logger: Logger;
  constructor(
    private client: Client,
    private embedService: EmbedService,
    private embedInteraction: EmbedInteractionService,
  ) {
    this.player = new Player(client);
  }
  @UseInterceptors(StringMenuInterceptor)
  @Subcommand({ name: 'play', description: 'Queues a music' })
  public async playMusic(@Context() [interaction]: SlashCommandContext, @Options() { query, engine }: MusicQuery) {
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

      interaction.followUp({ embeds: [embed] });
    } catch (err) {
      this.logger.log(err);
    }
  }

  @Subcommand({ name: 'np', description: 'The song currently playing' })
  public async nowMusic(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply();

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

    interaction.followUp({ embeds: [embed], ephemeral: true });
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

    interaction.followUp({ content: `Song skipped: ${timeline.track.title}` });
  }

  @Subcommand({ name: 'queue', description: 'Display this guild music queue' })
  public async queueMusic(@Context() [interaction]: SlashCommandContext) {
    const queue = useQueue(interaction.guild);

    if (!queue) return interaction.followUp({ content: 'There is no music in the queue', ephemeral: true });
    const tracks = queue.tracks;
    await this.embedInteraction.handleInteractionQueue(interaction, tracks.toArray());
  }
}
