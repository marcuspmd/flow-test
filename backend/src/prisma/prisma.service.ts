import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await super.$connect();
  }

  enableShutdownHooks(app: INestApplication): void {
    super.$on('beforeExit', () => {
      void app.close();
    });
  }

  async onModuleDestroy(): Promise<void> {
    await super.$disconnect();
  }
}
