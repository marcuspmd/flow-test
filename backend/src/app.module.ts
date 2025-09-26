import { Module } from '@nestjs/common';

import { FlowModule } from './flow/flow.module';
import { PrismaModule } from './prisma/prisma.module';
import { RunModule } from './run/run.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, FlowModule, RunModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
