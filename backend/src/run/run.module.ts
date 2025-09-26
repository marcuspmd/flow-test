import { Module } from '@nestjs/common';

import { FlowModule } from '../flow/flow.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EngineModule } from '../engine/engine.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RunController } from './run.controller';
import { RunService } from './run.service';

@Module({
  imports: [PrismaModule, FlowModule, EngineModule, RealtimeModule],
  controllers: [RunController],
  providers: [RunService],
})
export class RunModule {}
