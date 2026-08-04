import { BadRequestException, Injectable } from '@nestjs/common';
import { DealSessionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDealSessionDto } from './dto/create-deal-session.dto';

@Injectable()
export class DealSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDealSessionDto) {
    const totalPct = dto.companyPct + dto.externalPct;

    if (Math.abs(totalPct - 100) > 0.001) {
      throw new BadRequestException(
        'companyPct y externalPct deben sumar exactamente 100',
      );
    }

    return this.prisma.dealSession.create({
      data: {
        name: dto.name,
        contractGrossAmount: dto.contractGrossAmount,
        companyPct: dto.companyPct,
        externalPct: dto.externalPct,
        notes: dto.notes,
        status: DealSessionStatus.BORRADOR,
      },
    });
  }

  async findAll() {
    return this.prisma.dealSession.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.dealSession.findUnique({
      where: { id },
    });
  }
}
