import { Test, TestingModule } from '@nestjs/testing';
import { MusicEventService } from './music-event.service';

describe('MusicEventService', () => {
  let service: MusicEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MusicEventService],
    }).compile();

    service = module.get<MusicEventService>(MusicEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
