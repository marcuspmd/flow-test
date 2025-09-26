import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import * as yaml from 'yaml';
import { FlowEngineService, FlowExecutionOptions } from '../engine/services/flow-engine.service';
import { FlowSuite } from '../engine/types/engine.types';
import { ExecutionEventsGateway } from '../realtime/execution-events.gateway';

import { FlowService } from '../flow/flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRunDto } from './dto/query-run.dto';
import { RetryRunDto } from './dto/retry-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);
  private readonly defaultTake = 25;

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowService: FlowService,
    private readonly flowEngine: FlowEngineService,
    private readonly executionGateway: ExecutionEventsGateway,
  ) {
    // Inject the WebSocket gateway into the flow engine
    this.flowEngine.setExecutionGateway(this.executionGateway);
  }

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
      data: runs,
      meta: { total, skip, take },
    };
  }

  async getRun(id: string) {
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

  async triggerRun(dto: TriggerRunDto) {
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

    this.executeRun(run.id, executionOptions, dto.label).catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to execute run ${run.id}: ${err.message}`,
        err.stack,
      );
    });

    return run;
  }

  async retryRun(runId: string, dto: RetryRunDto) {
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

  private async resolveVersion(dto: TriggerRunDto) {
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

  private async executeRun(
    runId: string,
    options: FlowExecutionOptions,
    label?: string,
  ) {
    const run = await this.prisma.flowRun.update({
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

    try {
      this.logger.log(`Run ${runId} started${label ? ` (${label})` : ''}`);

      // Parse YAML flow suite
      const flowSuite: FlowSuite = yaml.parse(run.version.yamlRaw);

      // Execute flow using our new engine service
      const result = await this.flowEngine.executeFlow(
        flowSuite,
        {
          ...options,
          variables: options.variables || {},
        },
        runId,
      );

      // Update run status based on execution result
      const status = result.status === 'success' ? 'COMPLETED' : 'FAILED';
      const summary = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;

      await this.prisma.flowRun.update({
        where: { id: runId },
        data: {
          status,
          finishedAt: new Date(),
          resultSummary: summary,
        },
      });

      this.logger.log(`Run ${runId} finished with status: ${result.status}`);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Run ${runId} failed: ${err.message}`, err.stack);

      await this.prisma.flowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          resultSummary: {
            error: err.message,
            stack: err.stack,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }
}
