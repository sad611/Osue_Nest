import { QueueRepeatMode, SearchQueryType } from 'discord-player';
import { BooleanOption, NumberOption, StringOption } from 'necord';
import { RepeatMode, SearchPlatform} from 'lavalink-client/dist/types';

export class MusicQueryDto {
    @StringOption({
        name: 'name',
        description: 'Video to play',
        required: true
    })
    query: string;
     @StringOption({
        name: 'engine',
        description: 'Search engine used',
        autocomplete: true
    })
    engine: SearchPlatform;
}

export class LoopDto {
    @StringOption({
        name: 'loop',
        description: 'Type of loop',
        autocomplete: true
    })
    loop: RepeatMode;
}


export class MoveDto {
    @NumberOption({
        name: 'from',
        description: 'Index of track to move',
        required: true
    })
    from: number;
    @NumberOption({
        name: 'to',
        description: 'Target to move track',
    })
    to: number;
}

export class LyricsDto {
    @StringOption({
        name: 'song',
        description: 'Song to search lyrics, if none passed returns lyrics from current track',
    })
    query: string;
}