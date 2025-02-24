import { Test, TestingModule } from '@nestjs/testing';
import { ButtonColorService } from './button-color.service';

describe('ButtonColorService', () => {
  let service: ButtonColorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ButtonColorService],
    }).compile();

    service = module.get<ButtonColorService>(ButtonColorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
