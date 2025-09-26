import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpEngineService } from './services/http-engine.service';
import { AssertionService } from './services/assertion.service';
import { CaptureService } from './services/capture.service';
import { VariableService } from './services/variable.service';
import { LoggerService } from './services/logger.service';
import { FlowEngineService } from './services/flow-engine.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [
    HttpEngineService,
    AssertionService,
    CaptureService,
    VariableService,
    LoggerService,
    FlowEngineService,
  ],
  exports: [
    HttpEngineService,
    AssertionService,
    CaptureService,
    VariableService,
    LoggerService,
    FlowEngineService,
  ],
})
export class EngineModule {}