import { Module } from '@nestjs/common';
import { ExecutionEventsGateway } from './execution-events.gateway';

@Module({
  providers: [ExecutionEventsGateway],
  exports: [ExecutionEventsGateway],
})
export class RealtimeModule {}