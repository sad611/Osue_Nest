import { Test, TestingModule } from '@nestjs/testing';
import { EmbedInteractionService } from './embed-interaction.service';

describe('EmbedInteractionService', () => {
  let service: EmbedInteractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbedInteractionService],
    }).compile();

    service = module.get<EmbedInteractionService>(EmbedInteractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
