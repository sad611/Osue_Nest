import { Test, TestingModule } from '@nestjs/testing';
import { StringMenuInterceptor } from './string-menu.service';

describe('StringMenuInterceptor', () => {
  let service: StringMenuInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringMenuInterceptor],
    }).compile();

    service = module.get<StringMenuInterceptor>(StringMenuInterceptor);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
