import { Test, TestingModule } from '@nestjs/testing';
import { LavalinkService } from './lavalink.service';

describe('LavalinkService', () => {
  let service: LavalinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LavalinkService],
    }).compile();

    service = module.get<LavalinkService>(LavalinkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
