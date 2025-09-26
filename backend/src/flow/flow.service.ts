import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  PRIORITY_LEVEL_VALUES,
  type PriorityLevelValue,
} from '../common/enums/prisma.enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowSuiteDto } from './dto/create-flow-suite.dto';
import { CreateFlowVersionDto } from './dto/create-flow-version.dto';
import { QueryFlowDto } from './dto/query-flow.dto';

@Injectable()
export class FlowService {
  constructor(private readonly prisma: PrismaService) {}

  private isPriorityLevel(
    value: string | undefined,
  ): value is PriorityLevelValue {
    return (
      typeof value === 'string' &&
      PRIORITY_LEVEL_VALUES.includes(value as PriorityLevelValue)
    );
  }

  createSuite(dto: CreateFlowSuiteDto) {
    const defaultPriority = dto.defaultPriority ?? 'MEDIUM';
    if (!this.isPriorityLevel(defaultPriority)) {
      throw new BadRequestException('Invalid priority value');
    }

    return this.prisma.flowSuite.create({
      data: {
        nodeId: dto.nodeId,
        name: dto.name,
        description: dto.description ?? null,
        defaultPriority,
        tags: dto.tags ?? [],
      },
    });
  }

  listSuites({ priority, search }: QueryFlowDto) {
    const normalizedPriority = priority?.toUpperCase();

    return this.prisma.flowSuite.findMany({
      where: {
        defaultPriority: this.isPriorityLevel(normalizedPriority)
          ? normalizedPriority
          : undefined,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { nodeId: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVersion(nodeId: string, dto: CreateFlowVersionDto) {
    const suite = await this.ensureSuite(nodeId);

    const lastVersion = await this.prisma.flowVersion.findFirst({
      where: { suiteId: suite.id },
      orderBy: { version: 'desc' },
    });

    const nextVersionNumber = (lastVersion?.version ?? 0) + 1;
    const yamlHash = createHash('sha256').update(dto.yamlRaw).digest('hex');

    return this.prisma.flowVersion.create({
      data: {
        suiteId: suite.id,
        version: nextVersionNumber,
        yamlRaw: dto.yamlRaw,
        yamlHash,
        metadata: dto.metadata as any,
        compiledConfig: dto.compiledConfig as any,
        effectiveVariables: dto.effectiveVariables as any,
        createdById: dto.createdById,
      },
    });
  }

  async getSuite(nodeId: string) {
    const suite = await this.prisma.flowSuite.findUnique({
      where: { nodeId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!suite) {
      throw new NotFoundException(`Suite with nodeId ${nodeId} not found`);
    }

    return suite;
  }

  async listVersions(nodeId: string) {
    const suite = await this.getSuite(nodeId);
    return suite.versions;
  }

  async getVersion(nodeId: string, version: number) {
    const suite = await this.ensureSuite(nodeId);

    const flowVersion = await this.prisma.flowVersion.findFirst({
      where: {
        suiteId: suite.id,
        version,
      },
      include: {
        suite: true,
      },
    });

    if (!flowVersion) {
      const message = `Version ${version} for suite ${nodeId} not found`;
      throw new NotFoundException(message);
    }

    return flowVersion;
  }

  async getLatestVersion(nodeId: string) {
    const suite = await this.ensureSuite(nodeId);

    const flowVersion = await this.prisma.flowVersion.findFirst({
      where: { suiteId: suite.id },
      orderBy: { version: 'desc' },
      include: { suite: true },
    });

    if (!flowVersion) {
      const message = `No versions found for suite with nodeId ${nodeId}`;
      throw new NotFoundException(message);
    }

    return flowVersion;
  }

  async getVersionById(versionId: string) {
    const flowVersion = await this.prisma.flowVersion.findUnique({
      where: { id: versionId },
      include: { suite: true },
    });

    if (!flowVersion) {
      throw new NotFoundException(`Version with id ${versionId} not found`);
    }

    return flowVersion;
  }

  private async ensureSuite(nodeId: string) {
    const suite = await this.prisma.flowSuite.findUnique({
      where: { nodeId },
    });

    if (!suite) {
      throw new NotFoundException(`Suite with nodeId ${nodeId} not found`);
    }

    return suite;
  }
}
