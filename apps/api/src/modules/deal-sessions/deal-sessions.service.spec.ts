import { Test, TestingModule } from '@nestjs/testing';
import { DealSessionsService } from './deal-sessions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DealSessionsService', () => {
  let service: DealSessionsService;

  const mockPrismaService = {
    dealSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealSessionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DealSessionsService>(DealSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
