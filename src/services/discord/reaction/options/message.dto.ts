import { QueueRepeatMode, SearchQueryType } from 'discord-player';
import { BooleanOption, NumberOption, StringOption } from 'necord';

export class MusicQueryDto {
    @StringOption({
        name: 'description',
        description: 'Description of the message to register (optional)',
    })
    query: string;
     @StringOption({
        name: 'engine',
        description: 'Search engine used (Defaults to youtube)',
    })
    engine: SearchQueryType;
}
