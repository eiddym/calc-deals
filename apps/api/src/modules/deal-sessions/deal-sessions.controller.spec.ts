import { Test, TestingModule } from '@nestjs/testing';
import { DealSessionsController } from './deal-sessions.controller';
import { DealSessionsService } from './deal-sessions.service';

describe('DealSessionsController', () => {
  let controller: DealSessionsController;

  const mockDealSessionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealSessionsController],
      providers: [
        {
          provide: DealSessionsService,
          useValue: mockDealSessionsService,
        },
      ],
    }).compile();

    controller = module.get<DealSessionsController>(DealSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
