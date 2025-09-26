import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { YamlValidationService, YamlValidationResult } from './yaml-validation.service';
import { FlowService } from '../flow/flow.service';

interface UploadResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

interface ValidateYamlDto {
  yamlContent: string;
}

interface CreateFlowFromYamlDto {
  yamlContent: string;
  nodeId?: string;
  overwrite?: boolean;
}

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly yamlValidationService: YamlValidationService,
    private readonly flowService: FlowService,
  ) {}

  // Multer configuration for YAML files
  private getMulterOptions() {
    return {
      storage: diskStorage({
        destination: './uploads',
        filename: (req: any, file: any, callback: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req: any, file: any, callback: any) => {
        if (file.mimetype === 'text/yaml' ||
            file.mimetype === 'application/x-yaml' ||
            file.originalname.match(/\.(yml|yaml)$/)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only YAML files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    };
  }

  @Post('validate-yaml')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate YAML content',
    description: 'Validates YAML content for flow suite structure and syntax'
  })
  @ApiResponse({ status: 200, description: 'Validation completed' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        yamlContent: { type: 'string', description: 'YAML content to validate' }
      },
      required: ['yamlContent']
    }
  })
  async validateYaml(@Body() dto: ValidateYamlDto): Promise<UploadResponse> {
    if (!dto.yamlContent) {
      throw new BadRequestException('YAML content is required');
    }

    const validation = this.yamlValidationService.validateYamlContent(dto.yamlContent);

    return {
      success: validation.isValid,
      message: validation.isValid ? 'YAML is valid' : 'YAML validation failed',
      data: {
        metadata: validation.metadata,
        flowSuite: validation.isValid ? validation.flowSuite : undefined,
      },
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  @Post('validate-file')
  @UseInterceptors(FileInterceptor('file', {}))
  @ApiOperation({
    summary: 'Validate uploaded YAML file',
    description: 'Upload and validate a YAML file for flow suite structure'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'File validation completed' })
  async validateYamlFile(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.match(/\.(yml|yaml)$/)) {
      throw new BadRequestException('Only YAML files (.yml or .yaml) are allowed');
    }

    const yamlContent = file.buffer.toString('utf8');
    const validation = this.yamlValidationService.validateYamlContent(yamlContent);

    return {
      success: validation.isValid,
      message: validation.isValid ? 'YAML file is valid' : 'YAML file validation failed',
      data: {
        filename: file.originalname,
        size: file.size,
        metadata: validation.metadata,
        flowSuite: validation.isValid ? validation.flowSuite : undefined,
      },
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  @Post('validate-multiple')
  @UseInterceptors(FilesInterceptor('files', 10, {}))
  @ApiOperation({
    summary: 'Validate multiple YAML files',
    description: 'Upload and validate multiple YAML files at once'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Multiple files validation completed' })
  async validateMultipleYamlFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<UploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate file types
    const invalidFiles = files.filter(file => !file.originalname.match(/\.(yml|yaml)$/));
    if (invalidFiles.length > 0) {
      throw new BadRequestException(
        `Invalid file types: ${invalidFiles.map(f => f.originalname).join(', ')}. Only YAML files are allowed.`
      );
    }

    const yamlContents = files.map(file => file.buffer.toString('utf8'));
    const validations = this.yamlValidationService.validateMultipleYamlFiles(yamlContents);

    // Check for duplicate suite names
    const duplicateNames = this.yamlValidationService.findDuplicateSuiteNames(yamlContents);

    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    validations.forEach(validation => {
      allErrors.push(...validation.errors);
      allWarnings.push(...validation.warnings);
    });

    if (duplicateNames.length > 0) {
      allErrors.push(`Duplicate suite names found: ${duplicateNames.join(', ')}`);
    }

    const overallSuccess = validations.every(v => v.isValid) && duplicateNames.length === 0;

    return {
      success: overallSuccess,
      message: overallSuccess
        ? `All ${files.length} YAML files are valid`
        : 'Some YAML files failed validation',
      data: {
        totalFiles: files.length,
        validFiles: validations.filter(v => v.isValid).length,
        invalidFiles: validations.filter(v => !v.isValid).length,
        duplicateNames,
        files: files.map((file, index) => ({
          filename: file.originalname,
          size: file.size,
          isValid: validations[index].isValid,
          metadata: validations[index].metadata,
          errors: validations[index].errors,
          warnings: validations[index].warnings,
        })),
      },
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  @Post('create-flow')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create flow from YAML content',
    description: 'Create a new flow suite and version from YAML content'
  })
  @ApiResponse({ status: 201, description: 'Flow created successfully' })
  async createFlowFromYaml(@Body() dto: CreateFlowFromYamlDto): Promise<UploadResponse> {
    if (!dto.yamlContent) {
      throw new BadRequestException('YAML content is required');
    }

    // First validate the YAML
    const validation = this.yamlValidationService.validateYamlContent(dto.yamlContent);

    if (!validation.isValid) {
      return {
        success: false,
        message: 'YAML validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    try {
      const flowSuite = validation.flowSuite!;
      const nodeId = dto.nodeId || this.generateNodeId(flowSuite.suite_name);

      // Check if suite already exists
      let suite;
      try {
        suite = await this.flowService.getSuite(nodeId);
        if (!dto.overwrite) {
          return {
            success: false,
            message: 'Flow suite already exists',
            errors: [`Suite with nodeId '${nodeId}' already exists. Set overwrite=true to replace it.`],
          };
        }
      } catch {
        // Suite doesn't exist, create it
        suite = await this.flowService.createSuite({
          nodeId,
          name: flowSuite.suite_name,
          description: `Imported from YAML upload`,
          defaultPriority: (flowSuite.priority?.toUpperCase() as any) || 'MEDIUM',
          tags: flowSuite.tags || [],
        });
      }

      // Create new version
      const version = await this.flowService.createVersion(nodeId, {
        yamlRaw: dto.yamlContent,
        metadata: {
          imported: true,
          uploadedAt: new Date().toISOString(),
          stepCount: validation.metadata.stepCount,
          hasVariables: validation.metadata.hasVariables,
          hasDependencies: validation.metadata.hasDependencies,
        },
        compiledConfig: flowSuite as unknown as Record<string, unknown>,
        effectiveVariables: flowSuite.variables || {},
      });

      return {
        success: true,
        message: 'Flow created successfully',
        data: {
          suite,
          version,
          metadata: validation.metadata,
        },
        warnings: validation.warnings,
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to create flow',
        errors: [`Database error: ${error.message}`],
      };
    }
  }

  @Post('upload-and-create')
  @UseInterceptors(FileInterceptor('file', {}))
  @ApiOperation({
    summary: 'Upload YAML file and create flow',
    description: 'Upload a YAML file and create a flow suite in one step'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Flow created from uploaded file' })
  async uploadAndCreateFlow(
    @UploadedFile() file: Express.Multer.File,
    @Body('nodeId') nodeId?: string,
    @Body('overwrite') overwrite?: string,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.match(/\.(yml|yaml)$/)) {
      throw new BadRequestException('Only YAML files (.yml or .yaml) are allowed');
    }

    const yamlContent = file.buffer.toString('utf8');

    return this.createFlowFromYaml({
      yamlContent,
      nodeId,
      overwrite: overwrite === 'true',
    });
  }

  private generateNodeId(suiteName: string): string {
    return suiteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substr(2, 8);
  }
}