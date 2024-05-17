import { Injectable } from '@nestjs/common';
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction } from 'discord.js';
import { EmbedService } from '../embed.service';

@Injectable()
export class EmbedInteractionService {
  private readonly nextButton: ButtonBuilder;
  private readonly prevButton: ButtonBuilder;

  constructor(private embedService: EmbedService) {
    this.prevButton = new ButtonBuilder().setCustomId('prev-page').setLabel('Previous').setStyle(ButtonStyle.Secondary);
    this.nextButton = new ButtonBuilder().setCustomId('next-page').setLabel('Next').setStyle(ButtonStyle.Secondary);
  }

  public async handleInteractionQueue(interaction: ChatInputCommandInteraction<CacheType>, tracks: any): Promise<void> {
    let curPage = 1;
    const sliceLength = 10;

    const page = this.paginateArray(tracks, sliceLength, curPage);
    const description = this.createQueuePageDescription(page, curPage);

    const embed = this.embedService.Info({ title: 'Queue!', description: description });
    const row = this.createButtonRow(curPage, tracks.length, sliceLength);
    const interactionResponse = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const collector = interactionResponse.createMessageComponentCollector({ idle: 15000, time: 30000 });

    collector.on('collect', async (e) => {
      switch (e.customId) {
        case 'next-page':
          curPage += 1;
          break;
        case 'prev-page':
          curPage -= 1;
          break;
      }
      const newPage = this.paginateArray(tracks, sliceLength, curPage);
      const nextDescription = this.createQueuePageDescription(newPage, curPage);
      const updatedRow = this.createButtonRow(curPage, tracks.length, sliceLength);
      await e.update({ embeds: [this.embedService.Info({ title: 'Queue!', description: nextDescription })], components: [updatedRow] });
    });
  }

  private createButtonRow(curPage: number, tracksLength: number, sliceLength: number): ActionRowBuilder<ButtonBuilder> {
    const nextDisabled = !(curPage < Math.ceil(tracksLength / sliceLength));
    const prevDisabled = curPage === 1;
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.prevButton.setDisabled(prevDisabled),
      this.nextButton.setDisabled(nextDisabled),
    );
  }

  public createQueuePageDescription(tracks: any[], curPage: number): string {
    return tracks
      .map((track, index) => {
        const { title, url, requestedBy, duration } = track;
        return `${index + 1 + (curPage - 1) * 10}. [${title}](${url}) - ${duration} (requested by ${requestedBy?.tag})`;
      })
      .join('\n');
  }

  public paginateArray<T>(array: T[], pageSize: number, pageNumber: number): T[] {
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return array.slice(startIndex, endIndex);
  }
}
