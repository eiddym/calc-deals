import { Test, TestingModule } from '@nestjs/testing';
import { DealSessionsService } from './deal-sessions.service';

describe('DealSessionsService', () => {
  let service: DealSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DealSessionsService],
    }).compile();

    service = module.get<DealSessionsService>(DealSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
