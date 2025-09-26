import { Module } from '@nestjs/common';

import { FlowRunQueueService } from './flow-run-queue.service';

@Module({
  providers: [FlowRunQueueService],
  exports: [FlowRunQueueService],
})
export class QueueModule {}
