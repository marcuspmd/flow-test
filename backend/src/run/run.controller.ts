import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { QueryRunDto } from './dto/query-run.dto';
import { RetryRunDto } from './dto/retry-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';
import { RunService } from './run.service';

@Controller('runs')
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Get()
  listRuns(@Query() query: QueryRunDto) {
    return this.runService.listRuns(query);
  }

  @Get(':id')
  getRun(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.runService.getRun(id);
  }

  @Post()
  triggerRun(@Body() dto: TriggerRunDto) {
    return this.runService.triggerRun(dto);
  }

  @Post(':id/retry')
  retryRun(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RetryRunDto,
  ) {
    return this.runService.retryRun(id, dto);
  }
}
