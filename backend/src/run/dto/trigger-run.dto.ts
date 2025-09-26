import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

import {
  PRIORITY_LEVEL_VALUES,
  TRIGGER_SOURCE_VALUES,
  type PriorityLevelValue,
  type TriggerSourceValue,
} from '../../common/enums/prisma.enums';

export class TriggerRunDto {
  @IsOptional()
  @IsUUID()
  versionId?: string;

  @ValidateIf((value: TriggerRunDto) => !value.versionId)
  @IsString()
  suiteNodeId?: string;

  @ValidateIf((value: TriggerRunDto) => value.versionId === undefined)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
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
  })
  @IsInt()
  version?: number;

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
