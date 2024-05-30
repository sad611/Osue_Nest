import { Injectable } from '@nestjs/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction } from 'discord.js';
import { Button, Context, ButtonContext, ComponentParam } from 'necord';
import { CanvasService } from '../../canvas/canvas.service';

@Injectable()
export class ButtonColorService {
  private readonly nextButton: ButtonBuilder;
  private readonly prevButton: ButtonBuilder;
  private image: Buffer;
  private row: ActionRowBuilder<ButtonBuilder>;

  constructor(private readonly canvasService: CanvasService) {
    this.prevButton = new ButtonBuilder().setCustomId('prev-page').setLabel('Previous').setStyle(ButtonStyle.Secondary);

    this.nextButton = new ButtonBuilder().setCustomId('next-page').setLabel('Next').setStyle(ButtonStyle.Secondary);
  }

  public async handleInteraction(
    interaction: ChatInputCommandInteraction<CacheType>,
    roles: any[],
    sliceLength: number,
  ): Promise<void> {
    let curPage = 1;

    this.row = this.createButtonRow(curPage, roles.length, sliceLength);
    this.image = await this.canvasService.createColorNamesImage(roles);
    const interactionResponse = await interaction.reply({
      files: [this.image],
      components: [this.row],
      ephemeral: true,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interactionResponse.createMessageComponentCollector({ filter, idle: 15000, time: 30000 });

    collector.on('collect', async (e) => {
      switch (e.customId) {
        case 'next-page':
          curPage += 1;
          break;
        case 'prev-page':
          curPage -= 1;
          break;
      }
      this.image = await this.canvasService.createColorNamesImage(roles[curPage]);
      this.row = this.createButtonRow(curPage, roles[curPage].length, sliceLength);
      await e.update({ files: [this.image], components: [this.row] });
    });
  }

  private createButtonRow(curPage: number, rolesLength: number, sliceLength: number): ActionRowBuilder<ButtonBuilder> {
    const nextDisabled = curPage === Math.ceil(rolesLength / sliceLength);
    const prevDisabled = curPage === 1;

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.prevButton.setDisabled(prevDisabled),
      this.nextButton.setDisabled(nextDisabled),
    );
  }
}
