import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { CreateFlowSuiteDto } from './dto/create-flow-suite.dto';
import { CreateFlowVersionDto } from './dto/create-flow-version.dto';
import { QueryFlowDto } from './dto/query-flow.dto';
import { FlowService } from './flow.service';

@Controller('flows')
export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  @Post()
  createSuite(@Body() dto: CreateFlowSuiteDto) {
    return this.flowService.createSuite(dto);
  }

  @Get()
  listSuites(@Query() query: QueryFlowDto) {
    return this.flowService.listSuites(query);
  }

  @Get(':nodeId')
  getSuite(@Param('nodeId') nodeId: string) {
    return this.flowService.getSuite(nodeId);
  }

  @Post(':nodeId/versions')
  createVersion(
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateFlowVersionDto,
  ) {
    return this.flowService.createVersion(nodeId, dto);
  }

  @Get(':nodeId/versions')
  listVersions(@Param('nodeId') nodeId: string) {
    return this.flowService.listVersions(nodeId);
  }

  @Get(':nodeId/versions/:version')
  getVersion(
    @Param('nodeId') nodeId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.flowService.getVersion(nodeId, version);
  }
}
