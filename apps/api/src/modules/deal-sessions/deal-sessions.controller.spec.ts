import { Test, TestingModule } from '@nestjs/testing';
import { DealSessionsController } from './deal-sessions.controller';

describe('DealSessionsController', () => {
  let controller: DealSessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealSessionsController],
    }).compile();

    controller = module.get<DealSessionsController>(DealSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
