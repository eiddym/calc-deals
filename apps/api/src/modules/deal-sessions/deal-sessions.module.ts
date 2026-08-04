import { Module } from '@nestjs/common';
import { DealSessionsController } from './deal-sessions.controller';
import { DealSessionsService } from './deal-sessions.service';

@Module({
  controllers: [DealSessionsController],
  providers: [DealSessionsService],
})
export class DealSessionsModule {}
