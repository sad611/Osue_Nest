import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  GuildTextBasedChannel,
  User,
  Message,
} from 'discord.js';
import { EmbedService } from '../embed.service';
import { MusicService } from '../../music/music.service';
import { GuildQueue, useTimeline } from 'discord-player';

@Injectable()
export class EmbedInteractionService {
  private readonly nextButton: ButtonBuilder;
  private readonly prevButton: ButtonBuilder;
  private readonly firstButton: ButtonBuilder;
  private readonly lastButton: ButtonBuilder;
  private readonly skipButton: ButtonBuilder;
  private readonly pauseButton: ButtonBuilder;
  private readonly queueButton: ButtonBuilder;
  private readonly loopButton: ButtonBuilder;

  constructor(
    private embedService: EmbedService,
    @Inject(forwardRef(() => MusicService))
    private musicService: MusicService,
  ) {
    this.prevButton = new ButtonBuilder().setCustomId('prev-page').setLabel('Previous').setStyle(ButtonStyle.Secondary);
    this.nextButton = new ButtonBuilder().setCustomId('next-page').setLabel('Next').setStyle(ButtonStyle.Secondary);
    this.firstButton = new ButtonBuilder().setCustomId('first-page').setLabel('First').setStyle(ButtonStyle.Secondary);
    this.lastButton = new ButtonBuilder().setCustomId('last-page').setLabel('Last').setStyle(ButtonStyle.Secondary);
    this.pauseButton = new ButtonBuilder()
      .setCustomId('pause-track')
      .setLabel('Pause | Resume')
      .setStyle(ButtonStyle.Secondary);
    this.skipButton = new ButtonBuilder().setCustomId('skip-track').setLabel('Skip').setStyle(ButtonStyle.Danger);
    this.loopButton = new ButtonBuilder().setCustomId('loop').setLabel('Loop').setStyle(ButtonStyle.Secondary);
    this.queueButton = new ButtonBuilder().setCustomId('queue').setLabel('Queue').setStyle(ButtonStyle.Success);
  }

  public async handleInteractionQueue(
    channel: GuildTextBasedChannel,
    queue: GuildQueue<any>,
    tracks: any,
    author: User,
  ): Promise<void> {
    if (queue.tracks.size === 0) {
      const embed = this.embedService
        .Info({
          title: 'Queue!',
          description: 'There is currently no track on the queue',
        })
        .withAuthor(author);
      await channel.send({ embeds: [embed] });
      return;
    }

    let curPage = 1;
    const sliceLength = 10;
    const totalPages = Math.ceil(queue.tracks.size / sliceLength);

    const sendQueuePage = async (page: number): Promise<Message<true>> => {
      const paginatedTracks = this.paginateArray(tracks, sliceLength, page);
      const description = this.createQueuePageDescription(paginatedTracks, page);
      const embed = this.embedService
        .Info({ title: 'Queue!', description })
        .setFooter({
          text: `Página ${page} de ${totalPages}, duração da fila ${queue.durationFormatted}`,
        })
        .withAuthor(author);
      const row = this.createButtonRowQueue(page, tracks.length, sliceLength);
      return await channel.send({ embeds: [embed], components: [row] });
    };

    const interactionResponse = await sendQueuePage(curPage);
    const collector = interactionResponse.createMessageComponentCollector({ idle: 45000, time: 120000 });

    collector.on('collect', async (e) => {
      switch (e.customId) {
        case 'first-page':
          curPage = 1;
          break;
        case 'next-page':
          curPage = Math.min(curPage + 1, totalPages);
          break;
        case 'prev-page':
          curPage = Math.max(curPage - 1, 1);
          break;
        case 'last-page':
          curPage = totalPages;
          break;
      }

      const paginatedTracks = this.paginateArray(tracks, sliceLength, curPage);
      const description = this.createQueuePageDescription(paginatedTracks, curPage);
      const embed = this.embedService
        .Info({ title: 'Queue!', description })
        .setFooter({
          text: `Página ${curPage} de ${totalPages}, duração da fila ${queue.durationFormatted}`,
        })
        .withAuthor(author);
      const row = this.createButtonRowQueue(curPage, tracks.length, sliceLength);

      await e.update({ embeds: [embed], components: [row] });
    });

    collector.on('end', () => {
      interactionResponse.delete();
    });
  }

  public async handleInteractionGeneral(
    channel: GuildTextBasedChannel,
    queue: GuildQueue<any>,
    embed: EmbedService,
    duration: number,
    author: User,
  ) {
    const row = this.createButtonRowGeneral();
    const message = await channel.send({ embeds: [embed], components: [row] });
    const collector = message.createMessageComponentCollector({ idle: duration, time: duration });
    const timeline = useTimeline(channel.guild.id);
    queue.setMetadata({ channel: channel, message: message });
    collector.on('collect', async (e) => {
      switch (e.customId) {
        case 'skip-track':
          queue.node.skip();
          collector.stop();
          break;
        case 'pause-track':
          const isPaused = timeline.paused;
          isPaused ? timeline.resume() : timeline.pause();
          const newTitle = !isPaused ? '(paused) ' : '';
          embed.setTitle(`Now Playing! ${newTitle}`);
          collector.resetTimer();
          await e.update({ embeds: [embed], components: [row] });
          break;
        case 'queue':
          await e.update({ embeds: [embed], components: [row] });
          this.handleInteractionQueue(channel, queue, queue.tracks.toArray(), e.member.user);
          break;

        // case 'loop':
        //   let loopMode: QueueRepeatMode;
        //   if (queue.repeatMode === QueueRepeatMode.OFF) {
        //     loopMode = QueueRepeatMode.QUEUE;
        //     embed.setFooter({ text: 'Queue is in loop mode' });
        //   } else {
        //     loopMode = QueueRepeatMode.OFF;
        //     embed.setFooter({ text: '' });
        //   }
        //   queue.setRepeatMode(loopMode);
        //   await e.update({ embeds: [embed], components: [row] });
        //   break;
      }
    });
  }

  private createButtonRowQueue(
    curPage: number,
    tracksLength: number,
    sliceLength: number,
  ): ActionRowBuilder<ButtonBuilder> {
    const nextDisabled = !(curPage < Math.ceil(tracksLength / sliceLength));
    const prevDisabled = curPage === 1;
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.firstButton.setDisabled(prevDisabled),
      this.prevButton.setDisabled(prevDisabled),
      this.nextButton.setDisabled(nextDisabled),
      this.lastButton.setDisabled(nextDisabled),
    );
  }

  private createButtonRowGeneral(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.pauseButton,
      this.skipButton,
      // this.loopButton,
      this.queueButton,
    );
  }

  public createQueuePageDescription(tracks: any[], curPage: number): string {
    return tracks
      .map((track, index) => {
        const { title, url, requestedBy, duration } = track;
        return `${index + 1 + (curPage - 1) * 10}. [${title}](${url}) - ${duration} requested by ${requestedBy}`;
      })
      .join('\n');
  }

  public paginateArray<T>(array: T[], pageSize: number, pageNumber: number): T[] {
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return array.slice(startIndex, endIndex);
  }
}
