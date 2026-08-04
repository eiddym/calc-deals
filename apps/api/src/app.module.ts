import { Module } from '@nestjs/common';
import { DealSessionsModule } from './modules/deal-sessions/deal-sessions.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, DealSessionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
