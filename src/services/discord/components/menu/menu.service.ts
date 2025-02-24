import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  Role,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { StringSelect, Context, StringSelectContext, SelectedStrings } from 'necord';

import { Queue, Player, UnresolvedTrack, Track} from 'lavalink-client/dist/types';
import { MusicService } from '../../music/music.service';
import { GeneralService } from '../../music/general/general.service';

@Injectable()
export class MenuService {

  constructor(private generalService: GeneralService) {}

  public createStringSelectMenu(results: (Track | UnresolvedTrack)[]) {
    const options = results.map((track, index) => ({
      label: track.info.title,
      description: `Duration: [${this.generalService.msToTime(track.info.duration)}] || Author: ${track.info.author}`,
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

  public createMessageRoleSelectMenu(roles: Role[]) {
    try {
      console.log()
      const options = roles.map((role) => ({
        label: role.name,
        value: role.id, 
      }));

      console.log('Select Menu Options:', options); 

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('role-select-menu')
        .setPlaceholder('Select a role')
        .setMinValues(1)
        .setOptions(options);

      return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(selectMenu);
    } catch (error) {
      console.error('Error creating select menu options:', error);
      throw error;
    }
  }
}
