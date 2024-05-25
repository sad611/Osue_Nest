import { Injectable } from '@nestjs/common';
import { QueueRepeatMode, SearchQueryType } from 'discord-player';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';

@Injectable()
export class EngineMenuInterceptor extends AutocompleteInterceptor {
  public transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    const choices: { name: string; value: SearchQueryType }[] = [
      { name: 'Youtube', value: 'youtubeSearch' },
      { name: 'Spotify', value: 'spotifySearch' },
      { name: 'Soundcloud', value: 'soundcloudSearch' },
    ];

    const filteredChoices = choices.filter((choice) => choice.name.toLowerCase().includes(focused.value.toLowerCase()));
    return interaction.respond(
      filteredChoices
      ,
      
    );
  }
}

@Injectable()
export class LoopMenuInterceptor extends AutocompleteInterceptor {
  public transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const choices = [
      { name: 'Queue', value: QueueRepeatMode.QUEUE },
      { name: 'Track', value: QueueRepeatMode.TRACK },
    ];

    const filteredChoices = choices.filter((choice) =>
      choice.name.toLowerCase().startsWith(focused.value.toLowerCase()),
    );
    console.log(filteredChoices);

    return interaction.respond(
      filteredChoices.map((choice) => ({
        name: choice.name,
        value: choice.value.toString(),
      })),
    );
  }
}
