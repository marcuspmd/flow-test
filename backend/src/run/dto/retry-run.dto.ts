import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

import {
  PRIORITY_LEVEL_VALUES,
  TRIGGER_SOURCE_VALUES,
  type PriorityLevelValue,
  type TriggerSourceValue,
} from '../../common/enums/prisma.enums';

export class RetryRunDto {
  @IsOptional()
  @IsIn(PRIORITY_LEVEL_VALUES)
  priority?: PriorityLevelValue;

  @IsOptional()
  @IsIn(TRIGGER_SOURCE_VALUES)
  triggerSource?: TriggerSourceValue;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  inputPayload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  requestedById?: string;
}
