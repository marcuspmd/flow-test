import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import * as yaml from 'yaml';

import {
  FlowEngineService,
  FlowExecutionOptions,
} from '../engine/services/flow-engine.service';
import { FlowSuite } from '../engine/types/engine.types';
import { ExecutionEventsGateway } from '../realtime/execution-events.gateway';
import { PrismaService } from '../prisma/prisma.service';

export interface RunExecutionContext {
  jobId?: string | number;
  queue?: string;
}

@Injectable()
export class RunExecutorService {
  private readonly logger = new Logger(RunExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowEngine: FlowEngineService,
    private readonly executionGateway: ExecutionEventsGateway,
  ) {
    this.flowEngine.setExecutionGateway(this.executionGateway);
  }

  async execute(
    runId: string,
    options: FlowExecutionOptions,
    label?: string,
    context?: RunExecutionContext,
  ): Promise<void> {
    type FlowRunWithVersion = Prisma.FlowRunGetPayload<{
      include: {
        version: {
          include: {
            suite: true;
          };
        };
      };
    }>;

    const run: FlowRunWithVersion = await this.prisma.flowRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
      include: {
        version: {
          include: {
            suite: true,
          },
        },
      },
    });

    const logPrefix = context?.jobId
      ? `job ${context.jobId} (${context.queue ?? 'queue'})`
      : 'inline';

    try {
      this.logger.log(
        `Run ${runId} started${label ? ` (${label})` : ''} via ${logPrefix}`,
      );

      const flowSuite = yaml.parse(run.version.yamlRaw) as FlowSuite;

      const result = await this.flowEngine.executeFlow(
        flowSuite,
        {
          ...options,
          variables: options.variables || {},
        },
        runId,
      );

      const status = result.status === 'success' ? 'COMPLETED' : 'FAILED';
      const summary = this.serializeResult(result);

      await this.prisma.flowRun.update({
        where: { id: runId },
        data: {
          status,
          finishedAt: new Date(),
          resultSummary: summary,
        },
      });

      this.logger.log(
        `Run ${runId} finished with status ${result.status} via ${logPrefix}`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Run ${runId} failed via ${logPrefix}: ${err.message}`,
        err.stack,
      );

      await this.prisma.flowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          resultSummary: this.serializeResult({
            error: err.message,
            stack: err.stack,
          }),
        },
      });
    }
  }

  private serializeResult(payload: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }
}
