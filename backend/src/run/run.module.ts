import { Module } from '@nestjs/common';

import { FlowModule } from '../flow/flow.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EngineModule } from '../engine/engine.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { QueueModule } from '../queue/queue.module';
import { RunController } from './run.controller';
import { RunService } from './run.service';
import { RunExecutorService } from './run-executor.service';

@Module({
  imports: [
    PrismaModule,
    FlowModule,
    EngineModule,
    RealtimeModule,
    QueueModule,
  ],
  controllers: [RunController],
  providers: [RunService, RunExecutorService],
  exports: [RunExecutorService],
})
export class RunModule {}
