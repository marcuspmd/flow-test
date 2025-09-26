import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateFlowVersionDto {
  @IsNotEmpty()
  @IsString()
  yamlRaw!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  effectiveVariables?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  compiledConfig?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
