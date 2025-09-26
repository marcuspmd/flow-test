import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { PRIORITY_LEVEL_VALUES } from '../../common/enums/prisma.enums';
import type { PriorityLevelValue } from '../../common/enums/prisma.enums';

export class CreateFlowSuiteDto {
  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(PRIORITY_LEVEL_VALUES)
  defaultPriority?: PriorityLevelValue;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
