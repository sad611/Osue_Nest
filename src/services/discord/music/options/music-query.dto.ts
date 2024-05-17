import { SearchQueryType } from 'discord-player';
import { StringOption } from 'necord';

export class MusicQuery {
    @StringOption({
        name: 'query',
        description: 'Video to play',
        required: true
    })
    query: string;
     @StringOption({
        name: 'engine',
        description: 'Search engine used (Defaults to youtube)',
        autocomplete: true
    })
    engine: SearchQueryType;
}