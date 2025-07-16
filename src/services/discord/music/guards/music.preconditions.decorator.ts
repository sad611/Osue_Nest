// src/music/guards/music-preconditions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const MUSIC_PRECONDITIONS_KEY = 'music_preconditions';

export interface MusicCommandPreconditionsOptions {
  requiresVoiceChannel?: boolean;
  requiresSameVoiceChannel?: boolean;
  requiresPlayer?: boolean;
  requiresPlayerPlaying?: boolean;
  requiresPlayerPaused?: boolean;
  requiresPlayerNotPaused?: boolean;
  requiresQueueNotEmpty?: boolean;
  requiresCurrentTrack?: boolean;
  replyType?: 'ephemeral' | 'public';
}

export const MusicPreconditions = (options: MusicCommandPreconditionsOptions) =>
  SetMetadata(MUSIC_PRECONDITIONS_KEY, options);
