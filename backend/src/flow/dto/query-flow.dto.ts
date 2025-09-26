import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { PRIORITY_LEVEL_VALUES } from '../../common/enums/prisma.enums';
import type { PriorityLevelValue } from '../../common/enums/prisma.enums';

export class QueryFlowDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }): PriorityLevelValue | undefined =>
    typeof value === 'string'
      ? (value.toUpperCase() as PriorityLevelValue)
      : undefined,
  )
  @IsIn(PRIORITY_LEVEL_VALUES)
  priority?: PriorityLevelValue;
}
