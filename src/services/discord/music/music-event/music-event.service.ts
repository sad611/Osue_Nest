import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { GuildQueue, Player, QueueRepeatMode, Track } from 'discord-player';
import { GuildTextBasedChannel } from 'discord.js';
import { EmbedInteractionService } from '../../embed/embed-interaction/embed-interaction.service';
import { EmbedService } from '../../embed/embed.service';
import { QueueUpdatesGateway } from '../../../../controller/discord/gateway/queue.gateway';

export interface QueueJson {
  currentTrack: Track<unknown>;
  tracks: any;
}
@Injectable()
export class MusicEventService {
  constructor(
    private embedService: EmbedService,
    private gatewayService: QueueUpdatesGateway,
    @Inject(forwardRef(() => EmbedInteractionService)) private embedInteraction: EmbedInteractionService,
  ) {}

  serialize(queue: GuildQueue<any>) {
    const queueI: QueueJson = {
      currentTrack: queue.currentTrack,
      tracks: queue.tracks,
    };
    return queueI;
  }

  playerListen(player: Player) {
    player.events.on('playerStart', async (queue, track) => {
      const embed = this.embedService
        .Info({
          title: `Now Playing!`,
          thumbnail: { url: track.thumbnail },
          description: `[${track.title}](${track.url})`,
          fields: [
            { name: 'Author', value: `${track.author}`, inline: true },
            { name: '', value: ``, inline: true },
            { name: 'Duration', value: `${track.duration}`, inline: true },
          ],
        })
        .setFooter({ text: `${track.requestedBy.username}`, iconURL: `${track.requestedBy.displayAvatarURL()}` });

      if (queue.repeatMode === QueueRepeatMode.QUEUE) {
        embed.setFooter({ text: 'Queue is in loop' });
      }

      this.gatewayService.queueUpdate(queue.guild.id, this.serialize(queue));

      const channel = queue.metadata.channel as GuildTextBasedChannel;

      this.embedInteraction.handleInteractionGeneral(channel, queue, embed, track.durationMS, track.requestedBy);
    });

    player.events.on('playerError', (queue, error) => {
      console.log(error);
      this.gatewayService.queueUpdate(queue.guild.id, this.serialize(queue));
    });

    player.events.on('audioTrackAdd', (queue, track) => {
      this.gatewayService.queueUpdate(queue.guild.id, this.serialize(queue));
    });

    player.events.on('audioTracksAdd', (queue, tracks) => {
      this.gatewayService.queueUpdate(queue.guild.id, this.serialize(queue));
    });

    player.events.on('playerFinish', (queue) => {
      try {
        const { message } = queue.metadata;
        this.gatewayService.queueUpdate(queue.guild.id, this.serialize(queue));
        message.delete();
      } catch (e) {
        console.log(e);
      }
    });

    player.events.on('disconnect', (queue) => {
      this.gatewayService.queueUpdate(queue.guild.id, this.serialize(queue));
    });
  }
}
