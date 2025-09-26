/**
 * @fileoverview Swagger/OpenAPI specification parser with validation and endpoint extraction.
 *
 * @remarks
 * This module provides the SwaggerParserService class for comprehensive parsing of Swagger 2.0
 * and OpenAPI 3.x specifications. It includes file processing, structure validation,
 * endpoint extraction, and reference resolution capabilities.
 *
 * @packageDocumentation
 */

import { Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import {
  OpenAPISpec,
  SwaggerParseResult,
  ParsedEndpoint,
  OpenAPIPath,
  OpenAPIOperation,
  OpenAPIParameter,
  SwaggerValidationResult,
  OpenAPIVersion,
} from '../types/swagger.types';
import { SwaggerValidatorService } from './swagger-validator.service';

/**
 * Comprehensive parser for Swagger/OpenAPI specifications with advanced processing capabilities.
 *
 * @remarks
 * The SwaggerParserService class provides robust parsing and processing of API specifications
 * with support for both Swagger 2.0 and OpenAPI 3.x formats. It handles content processing,
 * format detection, structure validation, and advanced features like reference resolution
 * and endpoint extraction for test generation.
 *
 * **Key Capabilities:**
 * - **Multi-Format Support**: Handles JSON and YAML specification content
 * - **Version Detection**: Automatic detection of Swagger 2.0 vs OpenAPI 3.x
 * - **Structure Validation**: Comprehensive validation using dedicated validator
 * - **Reference Resolution**: Resolves $ref references within specifications
 * - **Endpoint Extraction**: Extracts and processes API endpoints with metadata
 * - **Error Handling**: Detailed error reporting for parsing and validation issues
 *
 * @public
 * @since 1.0.0
 */
@Injectable()
export class SwaggerParserService {
  private readonly logger = new Logger(SwaggerParserService.name);

  /** Parsed OpenAPI specification object */
  private spec: OpenAPISpec | null = null;

  constructor(private readonly validator: SwaggerValidatorService) {}

  /**
   * Parses a Swagger/OpenAPI specification content.
   *
   * @param content - Raw content of the Swagger/OpenAPI specification (JSON or YAML)
   * @param fileName - Original file name for context and format detection
   * @returns Promise resolving to parse result with extracted endpoints and metadata
   *
   * @remarks
   * This method handles the complete parsing workflow including content parsing,
   * format detection, validation, and endpoint extraction. It supports both
   * JSON and YAML format detection based on file extension and content analysis.
   *
   * @example
   * ```typescript
   * const parser = new SwaggerParserService(validator);
   * const result = await parser.parseContent(yamlContent, 'api.yaml');
   *
   * if (result.errors.length === 0) {
   *   console.log('Endpoints found:', result.endpoints.length);
   *   result.endpoints.forEach(endpoint => {
   *     console.log(`${endpoint.method.toUpperCase()} ${endpoint.path}`);
   *   });
   * }
   * ```
   */
  async parseContent(
    content: string,
    fileName: string,
  ): Promise<SwaggerParseResult> {
    this.logger.log(`Starting parse of ${fileName}`);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Parse content based on file extension
      const spec = this.parseRawContent(content, fileName) as OpenAPISpec;

      // 2. Validate specification using the validator
      const validation = this.validator.validateSpec(spec);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (!validation.isValid) {
        this.logger.warn(
          `Validation failed for ${fileName}: ${errors.join(', ')}`,
        );
        return {
          spec,
          endpoints: [],
          errors,
          warnings,
        };
      }

      // 3. Extract endpoints
      const endpoints = this.extractEndpoints(spec);

      // 4. Store spec for reference resolution
      this.spec = spec;

      this.logger.log(
        `Successfully parsed ${fileName}: ${endpoints.length} endpoints found`,
      );

      return {
        spec,
        endpoints,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(`Error processing ${fileName}: ${errorMessage}`);
      this.logger.error(
        `Error parsing ${fileName}: ${errorMessage}`,
        error.stack,
      );

      return {
        spec: {} as OpenAPISpec,
        endpoints: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Parse content based on file extension
   */
  private parseRawContent(content: string, fileName: string): unknown {
    const fileType = this.detectFileType(fileName, content);

    switch (fileType) {
      case 'yaml':
        return yaml.load(content);
      case 'json':
        return JSON.parse(content);
      default:
        throw new Error(
          `Unsupported file format for ${fileName}. Use .json, .yaml or .yml`,
        );
    }
  }

  /**
   * Detects file type based on extension and content
   */
  private detectFileType(
    fileName: string,
    content: string,
  ): 'json' | 'yaml' | null {
    // First, try by extension
    const ext = this.getFileExtension(fileName);
    if (ext === '.json') return 'json';
    if (ext === '.yaml' || ext === '.yml') return 'yaml';

    // Fallback: try to detect by content
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }

    // Assume YAML if not clearly JSON
    return 'yaml';
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1
      ? ''
      : fileName.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Extract all endpoints from the specification
   */
  private extractEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];

    if (!spec.paths) {
      this.logger.warn('No paths found in specification');
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const operations = [
        'get',
        'post',
        'put',
        'delete',
        'patch',
        'head',
        'options',
        'trace',
      ] as const;
      const pathItemTyped = pathItem;

      for (const method of operations) {
        const operation = pathItemTyped[method];
        if (operation) {
          // Combine path parameters with operation parameters
          const pathParams = (pathItemTyped.parameters || []).map((param) =>
            this.resolveParameterRef(param),
          );
          const operationParams = (operation.parameters || []).map((param) =>
            this.resolveParameterRef(param),
          );

          const allParameters = [...pathParams, ...operationParams];

          endpoints.push({
            path,
            method: method.toUpperCase(),
            operation,
            parameters: allParameters,
            requestBody: operation.requestBody,
            responses: operation.responses || {},
          });
        }
      }
    }

    this.logger.log(
      `Extracted ${endpoints.length} endpoints from specification`,
    );
    return endpoints;
  }

  /**
   * Resolve parameter reference (can be a $ref reference or direct parameter)
   */
  private resolveParameterRef(
    param: OpenAPIParameter | { $ref: string },
  ): OpenAPIParameter {
    if ('$ref' in param && param.$ref) {
      try {
        const resolved = this.resolveRef(param.$ref);
        return resolved as OpenAPIParameter;
      } catch (error) {
        this.logger.warn(
          `Failed to resolve parameter reference ${param.$ref}: ${
            (error as Error).message
          }`,
        );
        // Return the reference as-is if resolution fails
        return param as OpenAPIParameter;
      }
    }
    return param as OpenAPIParameter;
  }

  /**
   * Resolve references ($ref) in the specification
   */
  private resolveRef(ref: string): unknown {
    if (!ref.startsWith('#/')) {
      throw new Error(`External references are not supported: ${ref}`);
    }

    const path = ref.substring(2).split('/');
    let current: unknown = this.spec;

    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        throw new Error(`Reference not found: ${ref}`);
      }
    }

    if (current === undefined) {
      throw new Error(`Reference not found: ${ref}`);
    }

    return current;
  }

  /**
   * Get the current specification (after parsing)
   */
  getSpec(): OpenAPISpec | null {
    return this.spec;
  }

  /**
   * Check if a file is supported based on extension
   */
  static isSupportedFile(fileName: string): boolean {
    const supportedExtensions = ['.json', '.yaml', '.yml'];
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return supportedExtensions.includes(ext);
  }

  /**
   * Detect file type based on extension
   */
  static getFileType(fileName: string): 'json' | 'yaml' | null {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    switch (ext) {
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      default:
        return null;
    }
  }
}
