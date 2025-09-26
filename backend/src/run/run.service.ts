import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { FlowExecutionOptions } from '../engine/services/flow-engine.service';
import { FlowService } from '../flow/flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlowRunQueueService } from '../queue/flow-run-queue.service';
import { FlowRunJobPayload } from '../queue/flow-run-job.interface';
import { QueryRunDto } from './dto/query-run.dto';
import { RetryRunDto } from './dto/retry-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';
import { RunExecutorService } from './run-executor.service';

type FlowRunListItem = Prisma.FlowRunGetPayload<{
  include: {
    version: {
      include: {
        suite: true;
      };
    };
  };
}>;

type FlowRunDetail = Prisma.FlowRunGetPayload<{
  include: {
    version: {
      include: {
        suite: true;
      };
    };
    stepRuns: {
      include: {
        logs: true;
        variables: true;
      };
    };
    events: true;
    retryRequests: true;
    variables: true;
  };
}>;

type FlowVersionWithSuite = Prisma.FlowVersionGetPayload<{
  include: {
    suite: true;
  };
}>;

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);
  private readonly defaultTake = 25;

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowService: FlowService,
    private readonly queueService: FlowRunQueueService,
    private readonly runExecutor: RunExecutorService,
  ) {}

  async listRuns(query: QueryRunDto) {
    const take = query.take ?? this.defaultTake;
    const skip = query.skip ?? 0;

    const where: Prisma.FlowRunWhereInput = {
      status: query.status,
      priority: query.priority,
      triggerSource: query.triggerSource,
      version: query.suiteNodeId
        ? {
            suite: {
              nodeId: query.suiteNodeId,
            },
          }
        : undefined,
    };

    const [runs, total] = await this.prisma.$transaction([
      this.prisma.flowRun.findMany({
        where,
        include: {
          version: {
            include: {
              suite: true,
            },
          },
        },
        orderBy: { queuedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.flowRun.count({ where }),
    ]);

    return {
      data: runs as FlowRunListItem[],
      meta: { total, skip, take },
    };
  }

  async getRun(id: string): Promise<FlowRunDetail> {
    const run = await this.prisma.flowRun.findUnique({
      where: { id },
      include: {
        version: {
          include: {
            suite: true,
          },
        },
        stepRuns: {
          include: {
            logs: true,
            variables: true,
          },
        },
        events: true,
        retryRequests: true,
        variables: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`Run with id ${id} not found`);
    }

    return run;
  }

  async triggerRun(dto: TriggerRunDto): Promise<FlowRunListItem> {
    const version = await this.resolveVersion(dto);
    const priority = dto.priority ?? version.suite.defaultPriority;
    const triggerSource = dto.triggerSource ?? 'API';

    const run = await this.prisma.flowRun.create({
      data: {
        versionId: version.id,
        status: 'QUEUED',
        triggerSource,
        priority,
        requestedById: dto.requestedById ?? null,
        inputPayload:
          dto.inputPayload !== undefined
            ? (dto.inputPayload as Prisma.InputJsonValue)
            : undefined,
      },
      include: {
        version: {
          include: {
            suite: true,
          },
        },
      },
    });

    const executionOptions = (dto.options ?? {}) as FlowExecutionOptions;

    const payload: FlowRunJobPayload = {
      runId: run.id,
      options: executionOptions,
      label: dto.label,
    };

    try {
      const jobId = await this.queueService.addRunJob(payload);
      const queueName = this.queueService.getQueueName();
      const jobInfo = jobId ? ` (job ${jobId})` : '';
      this.logger.log(
        `Run ${run.id} enfileirado na fila ${queueName}${jobInfo}`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Falha ao enfileirar run ${run.id}: ${err.message}. Executando inline.`,
        err.stack,
      );

      await this.runExecutor.execute(run.id, executionOptions, dto.label);
    }

    return run;
  }

  async retryRun(runId: string, dto: RetryRunDto): Promise<FlowRunListItem> {
    const previous = await this.getRun(runId);

    const payload: TriggerRunDto = {
      versionId: previous.versionId,
      priority: dto.priority ?? previous.priority,
      triggerSource: dto.triggerSource ?? previous.triggerSource,
      label: dto.label,
      options: dto.options,
      inputPayload:
        dto.inputPayload ?? (previous.inputPayload as Record<string, unknown>),
      requestedById: dto.requestedById ?? previous.requestedById ?? undefined,
    };

    return this.triggerRun(payload);
  }

  private async resolveVersion(
    dto: TriggerRunDto,
  ): Promise<FlowVersionWithSuite> {
    if (dto.versionId) {
      return this.flowService.getVersionById(dto.versionId);
    }

    if (!dto.suiteNodeId) {
      throw new BadRequestException(
        'Either versionId or suiteNodeId must be provided',
      );
    }

    if (dto.version !== undefined) {
      return this.flowService.getVersion(dto.suiteNodeId, dto.version);
    }

    return this.flowService.getLatestVersion(dto.suiteNodeId);
  }
}
