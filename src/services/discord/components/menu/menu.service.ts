import { Injectable } from '@nestjs/common';
import { Track } from 'discord-player';
import { ActionRowBuilder, MessageActionRowComponentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { StringSelect, Context, StringSelectContext, SelectedStrings } from 'necord';
@Injectable()
export class MenuService {
  public createStringSelectMenu(results: Track<unknown>[]) {
    const options = results.map((track, index) => ({
      label: track.title, 
      description: `Duration: [${track.duration}] || Author: ${track.author}`, 
      value: `${index}`, 
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('search-menu')
      .setPlaceholder('Select a track')
      .setMaxValues(1)
      .setMinValues(1)
      .setOptions(options);
    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(selectMenu);
  }
}
