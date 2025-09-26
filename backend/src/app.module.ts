import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { FlowModule } from './flow/flow.module';
import { PrismaModule } from './prisma/prisma.module';
import { RunModule } from './run/run.module';
import { UploadModule } from './upload/upload.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrismaModule,
    FlowModule,
    RunModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
