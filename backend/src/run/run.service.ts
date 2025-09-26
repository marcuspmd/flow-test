import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FlowTestEngine } from '@flow-test-engine/core/engine';
import type { EngineExecutionOptions } from '@flow-test-engine/types/config.types';

import { FlowService } from '../flow/flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRunDto } from './dto/query-run.dto';
import { RetryRunDto } from './dto/retry-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);
  private readonly defaultTake = 25;
  private readonly defaultConfigPath = path.resolve(
    process.cwd(),
    '../flow-test.config.yml',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowService: FlowService,
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

    const executionOptions = (dto.options ?? {}) as EngineExecutionOptions;

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
    options: EngineExecutionOptions,
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

    const suite = run.version.suite;
    const sanitizedNodeId = suite.nodeId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-run-'));
    const yamlPath = path.join(baseDir, `${sanitizedNodeId}.yaml`);

    await fs.writeFile(yamlPath, run.version.yamlRaw, 'utf8');

    const configFilePath = options.config_file ?? this.defaultConfigPath;
    const executionOptions: EngineExecutionOptions = {
      ...options,
      config_file: configFilePath,
      test_directory: baseDir,
    };

    try {
      const engine = new FlowTestEngine(executionOptions, {
        onExecutionStart: () => {
          this.logger.log(`Run ${runId} started${label ? ` (${label})` : ''}`);
        },
        onExecutionEnd: () => {
          this.logger.log(`Run ${runId} finished successfully`);
        },
        onError: (error: Error) => {
          this.logger.error(
            `Engine error on run ${runId}: ${error.message}`,
            error.stack,
          );
        },
      });

      const result = await engine.run();
      const summary = JSON.parse(
        JSON.stringify(result),
      ) as Prisma.InputJsonValue;

      await this.prisma.flowRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          resultSummary: summary,
        },
      });
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
          } as Prisma.InputJsonValue,
        },
      });
    } finally {
      try {
        await fs.rm(baseDir, { recursive: true, force: true });
      } catch (cleanupError) {
        const err = cleanupError as Error;
        this.logger.warn(
          `Failed to clean up temp directory for run ${runId}: ${err.message}`,
        );
      }
    }
  }
}
