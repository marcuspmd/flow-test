import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

import {
  FLOW_RUN_STATUS_VALUES,
  PRIORITY_LEVEL_VALUES,
  TRIGGER_SOURCE_VALUES,
  type FlowRunStatusValue,
  type PriorityLevelValue,
  type TriggerSourceValue,
} from '../../common/enums/prisma.enums';

const toOptionalInt = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
};

export class QueryRunDto {
  @IsOptional()
  @IsIn(FLOW_RUN_STATUS_VALUES)
  status?: FlowRunStatusValue;

  @IsOptional()
  @IsString()
  suiteNodeId?: string;

  @IsOptional()
  @IsIn(PRIORITY_LEVEL_VALUES)
  priority?: PriorityLevelValue;

  @IsOptional()
  @IsIn(TRIGGER_SOURCE_VALUES)
  triggerSource?: TriggerSourceValue;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  take?: number;
}
