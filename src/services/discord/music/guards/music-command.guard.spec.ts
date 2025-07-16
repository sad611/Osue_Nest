// src/music/guards/music-command.guard.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MusicCommandGuard } from './music-command.guard';
import { Reflector } from '@nestjs/core';
import { PlayerManager } from '@necord/lavalink'; // Adjust import if needed
import { EmbedService } from '../../embed/embed.service'; // Adjust import if needed

// 1. Create mock objects for the dependencies
const mockReflector = {};
const mockPlayerManager = {};
const mockEmbedService = {};

describe('MusicCommandGuard', () => {
  let guard: MusicCommandGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MusicCommandGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PlayerManager,
          useValue: mockPlayerManager,
        },
        {
          provide: EmbedService,
          useValue: mockEmbedService,
        },
      ],
    }).compile();

    guard = module.get<MusicCommandGuard>(MusicCommandGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});