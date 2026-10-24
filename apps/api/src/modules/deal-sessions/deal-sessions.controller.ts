import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { CreateDealSessionDto } from './dto/create-deal-session.dto';
import { DealSessionsService } from './deal-sessions.service';

@Controller('deal-sessions')
export class DealSessionsController {
  constructor(private readonly dealSessionsService: DealSessionsService) {}

  @Post()
  create(@Body() dto: CreateDealSessionDto) {
    return this.dealSessionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.dealSessionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const session = await this.dealSessionsService.findOne(id);

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session;
  }
}
