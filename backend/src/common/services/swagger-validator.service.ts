/**
 * @fileoverview Swagger/OpenAPI specification validator service.
 *
 * @remarks
 * This service provides comprehensive validation for Swagger 2.0 and OpenAPI 3.x specifications.
 * It validates structure, required fields, and provides detailed error reporting.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  OpenAPISpec,
  SwaggerValidationResult,
  OpenAPIVersion,
} from '../types/swagger.types';

/**
 * Comprehensive validator for Swagger/OpenAPI specifications.
 *
 * @public
 * @since 1.0.0
 */
@Injectable()
export class SwaggerValidatorService {
  private readonly logger = new Logger(SwaggerValidatorService.name);

  /**
   * Validates a Swagger/OpenAPI specification
   *
   * @param spec - The specification to validate
   * @returns Validation result with errors and warnings
   */
  validateSpec(spec: OpenAPISpec): SwaggerValidationResult {
    const result: SwaggerValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      version: '3.0.0',
    };

    try {
      // 1. Detect version
      result.version = this.detectVersion(spec);

      // 2. Validate basic structure
      this.validateBasicStructure(spec, result);

      // 3. Validate version-specific requirements
      if (result.version.startsWith('3.')) {
        this.validateOpenAPI3(spec, result);
      } else if (result.version === '2.0') {
        this.validateSwagger2(spec, result);
      }

      // 4. Validate paths
      this.validatePaths(spec, result);

      // 5. Set as valid if no errors
      result.isValid = result.errors.length === 0;

      if (result.isValid) {
        this.logger.log(`Specification validation successful for ${spec.info?.title || 'unknown'}`);
      } else {
        this.logger.warn(`Specification validation failed: ${result.errors.join(', ')}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Validation error: ${errorMessage}`);
      this.logger.error(`Validation error: ${errorMessage}`, error.stack);
      return result;
    }
  }

  /**
   * Detect OpenAPI/Swagger version
   */
  private detectVersion(spec: OpenAPISpec): OpenAPIVersion {
    if (spec.openapi) {
      return spec.openapi as OpenAPIVersion;
    }

    if (spec.swagger) {
      return spec.swagger as OpenAPIVersion;
    }

    // Default to OpenAPI 3.0.0 if not specified
    return '3.0.0';
  }

  /**
   * Validate basic structure common to all versions
   */
  private validateBasicStructure(spec: OpenAPISpec, result: SwaggerValidationResult): void {
    // Check info object
    if (!spec.info) {
      result.errors.push('Missing required field: info');
      return;
    }

    if (!spec.info.title) {
      result.errors.push('Missing required field: info.title');
    }

    if (!spec.info.version) {
      result.errors.push('Missing required field: info.version');
    }

    // Check paths object
    if (!spec.paths) {
      result.errors.push('Missing required field: paths');
    } else if (typeof spec.paths !== 'object') {
      result.errors.push('Field paths must be an object');
    }
  }

  /**
   * Validate OpenAPI 3.x specific requirements
   */
  private validateOpenAPI3(spec: OpenAPISpec, result: SwaggerValidationResult): void {
    if (!spec.openapi) {
      result.errors.push('Missing required field for OpenAPI 3.x: openapi');
      return;
    }

    // Validate version format
    const version = spec.openapi;
    if (!version.match(/^3\.\d+\.\d+$/)) {
      result.errors.push(`Invalid OpenAPI version format: ${version}`);
    }

    // Servers are recommended for OpenAPI 3.x
    if (!spec.servers || spec.servers.length === 0) {
      result.warnings.push('No servers defined - consider adding server configurations');
    } else {
      // Validate servers
      spec.servers.forEach((server, index) => {
        if (!server.url) {
          result.errors.push(`servers[${index}]: Missing required field 'url'`);
        }
      });
    }

    // Validate components if present
    if (spec.components) {
      this.validateComponents(spec.components, result);
    }
  }

  /**
   * Validate Swagger 2.0 specific requirements
   */
  private validateSwagger2(spec: OpenAPISpec, result: SwaggerValidationResult): void {
    if (!spec.swagger) {
      result.errors.push('Missing required field for Swagger 2.0: swagger');
      return;
    }

    if (spec.swagger !== '2.0') {
      result.errors.push(`Invalid Swagger version: ${spec.swagger}. Expected '2.0'`);
    }

    // Host and schemes are recommended for Swagger 2.0
    if (!spec.host) {
      result.warnings.push('No host defined - consider adding host information');
    }

    if (!spec.schemes || spec.schemes.length === 0) {
      result.warnings.push('No schemes defined - consider adding supported schemes (http, https)');
    }
  }

  /**
   * Validate paths object
   */
  private validatePaths(spec: OpenAPISpec, result: SwaggerValidationResult): void {
    if (!spec.paths) {
      return;
    }

    const pathCount = Object.keys(spec.paths).length;
    if (pathCount === 0) {
      result.warnings.push('No paths defined in the specification');
      return;
    }

    // Validate individual paths
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      this.validatePath(path, pathItem, result);
    });

    this.logger.debug(`Validated ${pathCount} paths`);
  }

  /**
   * Validate individual path
   */
  private validatePath(path: string, pathItem: unknown, result: SwaggerValidationResult): void {
    if (!pathItem || typeof pathItem !== 'object') {
      result.errors.push(`Path '${path}': Must be an object`);
      return;
    }

    const pathObj = pathItem as Record<string, unknown>;

    // Check if at least one HTTP method is defined
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
    const hasOperation = httpMethods.some(method => method in pathObj);

    if (!hasOperation) {
      result.warnings.push(`Path '${path}': No HTTP operations defined`);
    }

    // Validate each operation
    httpMethods.forEach(method => {
      if (pathObj[method]) {
        this.validateOperation(path, method, pathObj[method], result);
      }
    });
  }

  /**
   * Validate individual operation
   */
  private validateOperation(
    path: string,
    method: string,
    operation: unknown,
    result: SwaggerValidationResult,
  ): void {
    if (!operation || typeof operation !== 'object') {
      result.errors.push(`Path '${path}' ${method.toUpperCase()}: Operation must be an object`);
      return;
    }

    const op = operation as Record<string, unknown>;

    // Responses are required
    if (!op.responses) {
      result.errors.push(`Path '${path}' ${method.toUpperCase()}: Missing required field 'responses'`);
    } else if (typeof op.responses !== 'object') {
      result.errors.push(`Path '${path}' ${method.toUpperCase()}: responses must be an object`);
    } else {
      const responses = op.responses as Record<string, unknown>;
      const responseCount = Object.keys(responses).length;

      if (responseCount === 0) {
        result.errors.push(`Path '${path}' ${method.toUpperCase()}: At least one response must be defined`);
      }

      // Check for success response
      const hasSuccessResponse = Object.keys(responses).some(code =>
        code.startsWith('2') || code === 'default'
      );

      if (!hasSuccessResponse) {
        result.warnings.push(`Path '${path}' ${method.toUpperCase()}: No success response (2xx) defined`);
      }
    }

    // Validate parameters if present
    if (op.parameters && Array.isArray(op.parameters)) {
      (op.parameters as unknown[]).forEach((param, index) => {
        this.validateParameter(path, method, index, param, result);
      });
    }
  }

  /**
   * Validate parameter
   */
  private validateParameter(
    path: string,
    method: string,
    index: number,
    parameter: unknown,
    result: SwaggerValidationResult,
  ): void {
    if (!parameter || typeof parameter !== 'object') {
      result.errors.push(
        `Path '${path}' ${method.toUpperCase()} parameter[${index}]: Must be an object`,
      );
      return;
    }

    const param = parameter as Record<string, unknown>;

    // Required fields for parameters
    if (!param.name) {
      result.errors.push(
        `Path '${path}' ${method.toUpperCase()} parameter[${index}]: Missing required field 'name'`,
      );
    }

    if (!param.in) {
      result.errors.push(
        `Path '${path}' ${method.toUpperCase()} parameter[${index}]: Missing required field 'in'`,
      );
    } else {
      const validLocations = ['query', 'header', 'path', 'cookie', 'formData', 'body'];
      if (!validLocations.includes(param.in as string)) {
        result.errors.push(
          `Path '${path}' ${method.toUpperCase()} parameter[${index}]: Invalid 'in' value '${param.in}'. Must be one of: ${validLocations.join(', ')}`,
        );
      }
    }
  }

  /**
   * Validate components (OpenAPI 3.x)
   */
  private validateComponents(components: unknown, result: SwaggerValidationResult): void {
    if (!components || typeof components !== 'object') {
      result.errors.push('components must be an object');
      return;
    }

    // Components validation is extensive but not critical for basic parsing
    // This is a placeholder for more detailed component validation
    this.logger.debug('Components validation passed basic checks');
  }
}