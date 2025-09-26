import { Module } from '@nestjs/common';

import { FlowModule } from '../flow/flow.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadController } from './upload.controller';
import { YamlValidationService } from './yaml-validation.service';

@Module({
  imports: [PrismaModule, FlowModule],
  controllers: [UploadController],
  providers: [YamlValidationService],
  exports: [YamlValidationService],
})
export class UploadModule {}