import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { FlowController } from './flow.controller';
import { FlowService } from './flow.service';

@Module({
  imports: [PrismaModule],
  controllers: [FlowController],
  providers: [FlowService],
  exports: [FlowService],
})
export class FlowModule {}
