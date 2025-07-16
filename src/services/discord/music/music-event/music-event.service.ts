import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { GuildQueue, QueueRepeatMode } from 'discord-player';
import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  Guild,
  GuildTextBasedChannel,
  Message,
  TextChannel,
  User,
  VoiceChannel,
} from 'discord.js';
import { EmbedInteractionService } from '../../embed/embed-interaction/embed-interaction.service';
import { EmbedService } from '../../embed/embed.service';
import { QueueUpdatesGateway } from '../../../../controller/discord/gateway/queue.gateway';
import { OnLavalinkManager, LavalinkManagerContextOf, PlayerManager } from '@necord/lavalink';
import { Context } from 'necord';
import { Queue, Player, Track, LoadTypes, UnresolvedTrack, SearchPlatform, RepeatMode } from 'lavalink-client/dist/types';
import { MusicService } from '../music.service';
import { GeneralService } from '../general/general.service';

export interface QueueJson {
  current: { track: Track; time: number };
  tracks: (Track | UnresolvedTrack)[];
  previous: Track;
}
@Injectable()
export class MusicEventService {
  private readonly logger = new Logger(MusicEventService.name);
  private guildCache = new Map<string, Guild>();
  private textChannelCache = new Map<string, TextChannel | null>();
  private voiceChannelCache = new Map<string, VoiceChannel | null>();
  private messageCache = new Map<string, Message>();
  private embedCache = new Map<string, EmbedService>();

  constructor(
    private client: Client,
    private embedService: EmbedService,
    private generalService: GeneralService,
    private readonly playerManager: PlayerManager,
    @Inject(forwardRef(() => EmbedInteractionService))
    private embedInteraction: EmbedInteractionService,
    @Inject(forwardRef(() => QueueUpdatesGateway))
    private gatewayService: QueueUpdatesGateway,
  ) {}

  private messageLocks = new Map<string, boolean>();

  serialize(queue: Queue): QueueJson {
    return { current: { track: queue.current, time: null }, previous: queue.previous[0], tracks: queue.tracks };
  }

  @OnLavalinkManager('playerCreate')
  public async onPlayerCreate(@Context() [player]: LavalinkManagerContextOf<'playerCreate'>) {
    const channel = await this.client.channels.fetch(player.textChannelId);

    this.textChannelCache.set(player.guildId, channel as TextChannel);
  }

  @OnLavalinkManager('trackStart')
  public async onTrackStart(@Context() [player, track]: LavalinkManagerContextOf<'trackStart'>) {
    const guildID = player.guildId;
    const user = track.requester as User;

    const channel = this.textChannelCache.get(guildID);

    while (this.messageLocks.get(guildID)) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!channel) {
      console.log('No channel found for guild:', guildID);
    } else {
      try {
      const embed = this.embedService
        .Info({
          title: `Now Playing!`,
          thumbnail: { url: track.info.artworkUrl },
          description: `[${track.info.title}](${track.info.uri})`,
          fields: [
            { name: 'Author', value: `${track.info.author}`, inline: true },
            { name: 'Duration', value: `${this.generalService.msToTime(track.info.duration)}`, inline: true },
          ],
        })
        .withAuthor(user);

      
        const message = await channel.send({ embeds: [embed] });
        this.embedInteraction.handleInteractionGeneral(message, player, embed, track.info.duration);
        this.embedCache.set(guildID, embed);
        this.messageCache.set(guildID, message);
        console.log('Cached new message for track:', track.info.title);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    this.gatewayService.queueUpdate(player.guildId, this.serialize(player.queue));
    this.logger.log(`Track started: ${track.info.title}`);
  }

  @OnLavalinkManager('trackEnd')
  public async onTrackEnd(@Context() [player, track, error]: LavalinkManagerContextOf<'trackEnd'>) {
    const guildID = player.guildId;

    const cachedMessage = this.messageCache.get(guildID);
    if (!cachedMessage) {
      console.log('No cached message for guild:', guildID, ' Track:', track.info.title);
      return;
    }

    // Acquire the lock
    this.messageLocks.set(guildID, true);

    try {
      console.log('Deleting message for track:', track.info.title);
      await cachedMessage.delete();
      this.messageCache.delete(guildID);
      console.log('Deleted cached message for guild:', track.info.title);
    } catch (error) {
      this.logger.error(`Failed to delete message: ${error}`);
    } finally {
      // Release the lock
      this.messageLocks.set(guildID, false);
    }
  }

  @OnLavalinkManager('trackError')
  public async onTrackError(@Context() [player, track, error]: LavalinkManagerContextOf<'trackError'>) {
    const guildID = player.guildId;
    this.logger.error(`Error with track "${track.info.title}" in guild ${guildID}: ${error}`);

    // Attempt to delete the cached message (if any)
    const cachedMessage = this.messageCache.get(guildID);
    if (cachedMessage) {
      try {
        await cachedMessage.delete();
        this.messageCache.delete(guildID);
        console.log('Deleted cached message due to track error for track:', track.info.title);
      } catch (err) {
        this.logger.error(`Failed to delete message on track error: ${err}`);
      }
    }

    // Update the queue state on the gateway (if desired)
    // this.gatewayService.queueUpdate(guildID, this.serialize(player.queue, guildID));
  }

  @OnLavalinkManager('queueEnd')
  public async onQueueEnd(@Context() [player, track, error]: LavalinkManagerContextOf<'queueEnd'>) {
    const guildID = player.guildId;
    this.logger.log(`Queue ended in guild: ${guildID}`);

    const cachedMessage = this.messageCache.get(guildID);
    if (cachedMessage) {
      try {
        await cachedMessage.delete();
        this.messageCache.delete(guildID);
        console.log('Deleted cached message as queue ended for guild:', guildID);
      } catch (err) {
        this.logger.error(`Failed to delete message on queue end: ${err}`);
      }
    }

    // Optionally update the gateway with an empty or updated queue
    // this.gatewayService.queueUpdate(guildID, this.serialize(player.queue, guildID));
  }

  onTrackAdded(
    track: Track | Track[] | UnresolvedTrack[],
    interaction: ChatInputCommandInteraction<CacheType>,
    loadType: LoadTypes,
    queue: Queue,
  ) {
    const buildTrackEmbed = (singleTrack: Track) =>
      this.embedService
        .Info({
          title: `Track queued at position #${queue.tracks.length}!`,
          thumbnail: { url: singleTrack.info.artworkUrl },
          description: `[${singleTrack.info.title}](${singleTrack.info.uri})`,
          fields: [
            { name: 'Author', value: `${singleTrack.info.author}`, inline: true },
            { name: 'Duration', value: `${this.generalService.msToTime(singleTrack.info.duration)}`, inline: true },
          ],
        })
        .withAuthor(singleTrack.requester);

    const buildPlaylistEmbed = (tracks: Track[]) =>
      this.embedService
        .Info({
          title: `Playlist Added!`,
          description: `Added **${tracks.length}** tracks from the playlist.`,
          thumbnail: { url: tracks[0].info.artworkUrl },
        })
        .withAuthor(interaction.user);

    const embed = loadType === 'search' ? buildTrackEmbed(track[0] as Track) : buildPlaylistEmbed(track as Track[]);
    this.gatewayService.tracksUpdate(interaction.guildId, queue.tracks);
    interaction.followUp({ embeds: [embed] });
    return;
  }

  async onPausedDash(event: 'pause' | 'resume', guildID: string, time?: number): Promise<void> {
    const message = this.messageCache.get(guildID);
    const embed = this.embedCache.get(guildID);
    console.log(event)
    if (!message || !embed) {
      console.log({ message, embed });
      return;
    }
    console.log(Math.round(time * 1000) )
    const player = this.playerManager.get(guildID);
    if (event === 'pause') {
      if (!player.paused)
        await player.pause();
      embed.setTitle('Now Playing! (paused)');
    } else if (event === 'resume') {
      if (player.paused) {
        player.seek(Math.round(time * 1000))
        await player.resume();
      }
      embed.setTitle('Now Playing!');
    }

    message.edit({ embeds: [embed] });
  }

  onRepeatMode(repeatMode: RepeatMode, guildID: string) {
    const player = this.playerManager.get(guildID);
  }
}
