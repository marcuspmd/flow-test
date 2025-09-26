/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { PriorityLevel } from '@prisma/client';

import { FlowService } from '../flow/flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRunDto } from './dto/query-run.dto';
import { RetryRunDto } from './dto/retry-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';
import { RunService } from './run.service';

type PrismaMock = {
  $transaction: jest.Mock<Promise<unknown[]>, [Array<Promise<unknown>>]>;
  flowRun: {
    findMany: jest.Mock<Promise<unknown>, [unknown?]>;
    count: jest.Mock<Promise<number>, [unknown?]>;
    create: jest.Mock<Promise<unknown>, [unknown]>;
    update: jest.Mock<Promise<unknown>, [unknown]>;
  };
};

type VersionFixture = {
  id: string;
  suite: {
    id: string;
    nodeId: string;
    name: string;
    defaultPriority: PriorityLevel;
  };
};

type FlowServiceMock = {
  getVersionById: jest.Mock<Promise<VersionFixture>, [string]>;
  getVersion: jest.Mock<Promise<VersionFixture>, [string, number]>;
  getLatestVersion: jest.Mock<Promise<VersionFixture>, [string]>;
};

type RunRecord = {
  id: string;
  versionId: string;
  status: string;
  triggerSource: string;
  priority: string;
  requestedById: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  inputPayload: unknown;
  resultSummary: unknown;
  [key: string]: unknown;
};

const buildRunRecord = (overrides: Partial<RunRecord> = {}): RunRecord => ({
  id: 'run-1',
  versionId: 'version-1',
  status: 'QUEUED',
  triggerSource: 'API',
  priority: 'MEDIUM',
  requestedById: null,
  queuedAt: new Date(),
  startedAt: null,
  finishedAt: null,
  inputPayload: null,
  resultSummary: null,
  ...overrides,
});

describe('RunService', () => {
  let runService: RunService;
  let prismaMock: PrismaMock;
  let flowServiceMock: FlowServiceMock;

  beforeEach(() => {
    prismaMock = {
      $transaction: jest
        .fn<Promise<unknown[]>, [Array<Promise<unknown>>]>()
        .mockImplementation(async (operations) => Promise.all(operations)),
      flowRun: {
        findMany: jest.fn<Promise<unknown>, [unknown?]>(),
        count: jest.fn<Promise<number>, [unknown?]>(),
        create: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
    };

    flowServiceMock = {
      getVersionById: jest.fn<Promise<VersionFixture>, [string]>(),
      getVersion: jest.fn<Promise<VersionFixture>, [string, number]>(),
      getLatestVersion: jest.fn<Promise<VersionFixture>, [string]>(),
    };

    runService = new RunService(
      prismaMock as unknown as PrismaService,
      flowServiceMock as unknown as FlowService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('listRuns', () => {
    it('should query runs with filters and pagination', async () => {
      const query = {
        suiteNodeId: 'suite-123',
        status: 'COMPLETED',
        triggerSource: 'API',
        priority: 'HIGH',
        skip: 5,
        take: 10,
      } as QueryRunDto;
      const expectedRuns = [buildRunRecord({ id: 'run-42' })];

      prismaMock.flowRun.findMany.mockResolvedValueOnce(expectedRuns);
      prismaMock.flowRun.count.mockResolvedValueOnce(1);

      const result = await runService.listRuns(query);

      expect(prismaMock.flowRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
            priority: 'HIGH',
            triggerSource: 'API',
            version: {
              suite: {
                nodeId: 'suite-123',
              },
            },
          }),
          skip: 5,
          take: 10,
        }),
      );
      expect(prismaMock.flowRun.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );
      expect(result).toEqual({
        data: expectedRuns,
        meta: { total: 1, skip: 5, take: 10 },
      });
    });
  });

  describe('triggerRun', () => {
    it('should create a run using defaults from the version', async () => {
      const version: VersionFixture = {
        id: 'version-1',
        suite: {
          id: 'suite-id',
          nodeId: 'suite-node',
          name: 'Payments Suite',
          defaultPriority: 'MEDIUM',
        },
      };
      const createdRun = {
        ...buildRunRecord(),
        version,
      };

      flowServiceMock.getVersionById.mockResolvedValueOnce(version);
      prismaMock.flowRun.create.mockResolvedValueOnce(createdRun);

      const executeRunMock = jest.fn().mockResolvedValue(undefined);
      Reflect.set(runService, 'executeRun', executeRunMock);

      const dto: TriggerRunDto = {
        versionId: 'version-1',
        label: 'nightly',
      } as TriggerRunDto;

      const result = await runService.triggerRun(dto);

      expect(flowServiceMock.getVersionById).toHaveBeenCalledWith('version-1');
      expect(prismaMock.flowRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionId: 'version-1',
            status: 'QUEUED',
            priority: 'MEDIUM',
            triggerSource: 'API',
            requestedById: null,
          }),
        }),
      );
      expect(executeRunMock).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({}),
        'nightly',
      );
      expect(result).toBe(createdRun);
    });
  });

  describe('retryRun', () => {
    it('should forward previous run data into a new trigger', async () => {
      const existingRun = buildRunRecord({
        id: 'run-previous',
        versionId: 'version-1',
        priority: 'LOW',
        triggerSource: 'CLI',
        inputPayload: { foo: 'bar' },
        requestedById: 'user-1',
      });
      const retryDto = {
        priority: 'HIGH',
        label: 'retry',
      } as RetryRunDto;

      const getRunSpy = jest
        .spyOn(runService, 'getRun')
        .mockResolvedValueOnce(existingRun as never);
      const triggerSpy = jest
        .spyOn(runService, 'triggerRun')
        .mockResolvedValueOnce(buildRunRecord({ id: 'new-run' }) as never);

      const result = await runService.retryRun('run-previous', retryDto);

      expect(getRunSpy).toHaveBeenCalledWith('run-previous');
      expect(triggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: 'version-1',
          priority: 'HIGH',
          triggerSource: 'CLI',
          label: 'retry',
          inputPayload: { foo: 'bar' },
          requestedById: 'user-1',
        }),
      );
      expect(result).toEqual(buildRunRecord({ id: 'new-run' }));
    });
  });
});
