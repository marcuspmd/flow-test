import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, JobsOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

import { FlowRunJobPayload } from './flow-run-job.interface';
import { DEFAULT_FLOW_RUN_JOB_NAME } from './queue.constants';

@Injectable()
export class FlowRunQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(FlowRunQueueService.name);
  private readonly queue: Queue<FlowRunJobPayload>;
  private readonly queueName: string;
  private readonly connection: RedisOptions;
  private readonly defaultJobOptions: JobsOptions;

  constructor(private readonly configService: ConfigService) {
    this.queueName =
      this.configService.get<string>('queue.flowRun') ?? 'flow-run-queue';
    this.connection = {
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      username: this.configService.get<string>('redis.username') ?? undefined,
      password: this.configService.get<string>('redis.password') ?? undefined,
    };

    const attempts = this.configService.get<number>('queue.defaultAttempts');
    this.defaultJobOptions = {
      attempts: attempts && attempts > 0 ? attempts : 1,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    };

    this.queue = new Queue<FlowRunJobPayload>(this.queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions,
    });

    this.logger.log(`Flow run queue initialised: ${this.queueName}`);
  }

  getQueueName(): string {
    return this.queueName;
  }

  getConnection(): RedisOptions {
    return this.connection;
  }

  getQueue(): Queue<FlowRunJobPayload> {
    return this.queue;
  }

  async addRunJob(
    payload: FlowRunJobPayload,
    options?: JobsOptions,
  ): Promise<string | undefined> {
    const jobOptions = options
      ? { ...this.defaultJobOptions, ...options }
      : this.defaultJobOptions;

    const job = await this.queue.add(
      DEFAULT_FLOW_RUN_JOB_NAME,
      payload,
      jobOptions,
    );
    this.logger.debug(`Run ${payload.runId} enfileirado (job ${job.id})`);
    return job.id;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Encerrando fila de execuções');
    await this.queue.close();
  }
}
