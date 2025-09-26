import { Module } from '@nestjs/common';

import { FlowModule } from '../flow/flow.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RunController } from './run.controller';
import { RunService } from './run.service';

@Module({
  imports: [PrismaModule, FlowModule],
  controllers: [RunController],
  providers: [RunService],
})
export class RunModule {}
