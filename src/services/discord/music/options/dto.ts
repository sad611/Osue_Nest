import { QueueRepeatMode, SearchQueryType } from 'discord-player';
import { StringOption } from 'necord';

export class MusicQueryDto {
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

export class LoopDto {
    @StringOption({
        name: 'loop',
        description: 'Type of loop',
        autocomplete: true
    })
    loop: QueueRepeatMode;
}