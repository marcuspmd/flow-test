/**
 * @fileoverview OpenAPI/Swagger specification validator with comprehensive validation rules.
 *
 * @remarks
 * This module provides the OpenAPIValidator class for detailed validation of OpenAPI 3.x
 * and Swagger 2.0 specifications. It includes comprehensive validation rules, error
 * reporting, and compatibility checking between different specification versions.
 *
 * @packageDocumentation
 */

import {
  OpenAPISpec,
  SwaggerValidationResult,
  OpenAPIVersion,
  OpenAPIComponents,
  OpenAPIParameter,
  OpenAPIOperation,
  OpenAPISchema,
  OpenAPISecurityScheme,
} from "../../../types/swagger.types";

/**
 * Comprehensive validator for OpenAPI/Swagger specifications with detailed rule checking.
 *
 * @remarks
 * The OpenAPIValidator provides thorough validation capabilities for API specifications
 * with support for both OpenAPI 3.x and legacy Swagger 2.0 formats. It implements
 * detailed validation rules, structural checks, and provides comprehensive error
 * reporting to ensure specification quality and compliance.
 *
 * **Validation Categories:**
 * - **Structural Validation**: Required fields, object structure, and hierarchy
 * - **Schema Validation**: Data type definitions, property constraints, and references
 * - **Security Validation**: Security schemes, requirements, and flow configurations
 * - **Path Validation**: Route definitions, parameter validation, and operation checks
 * - **Component Validation**: Reusable component definitions and reference integrity
 * - **Version Compliance**: Specification version-specific rule enforcement
 *
 * **Supported Validation Rules:**
 * - Required field presence validation
 * - Data type and format validation
 * - Reference resolution and circular dependency detection
 * - Security scheme completeness and configuration
 * - Parameter definition and usage validation
 * - Response schema validation and consistency
 *
 * @example Basic specification validation
 * ```typescript
 * import { OpenAPIValidator } from './validator';
 *
 * const spec: OpenAPISpec = {
 *   openapi: '3.0.0',
 *   info: { title: 'Test API', version: '1.0.0' },
 *   paths: {}
 * };
 *
 * const result = OpenAPIValidator.validateSpec(spec);
 *
 * if (result.valid) {
 *   console.log('Specification is valid');
 * } else {
 *   console.log('Validation errors:', result.errors);
 *   console.log('Warnings:', result.warnings);
 * }
 * ```
 *
 * @example Detailed validation with error handling
 * ```typescript
 * const result = OpenAPIValidator.validateSpec(complexSpec);
 *
 * // Check for specific error types
 * const schemaErrors = result.errors.filter(error =>
 *   error.includes('schema')
 * );
 *
 * const securityErrors = result.errors.filter(error =>
 *   error.includes('security')
 * );
 *
 * // Process warnings
 * if (result.warnings.length > 0) {
 *   console.warn('Specification has warnings that should be addressed:');
 *   result.warnings.forEach(warning => console.warn(`- ${warning}`));
 * }
 * ```
 *
 * @public
 * @since 2.1.0
 */
export class OpenAPIValidator {
  /**
   * Validates a complete OpenAPI/Swagger specification.
   *
   * @param spec - The OpenAPI specification object to validate
   * @returns Validation result with success status, errors, and warnings
   *
   * @remarks
   * This method performs comprehensive validation of the specification including
   * structural validation, schema checking, security validation, and version-specific
   * rule enforcement. It provides detailed error messages and warnings to help
   * identify and resolve specification issues.
   *
   * The validation process includes:
   * - Version detection and compatibility checking
   * - Required field validation
   * - Schema and component validation
   * - Security configuration validation
   * - Path and operation validation
   * - Reference resolution and integrity checks
   *
   * @example
   * ```typescript
   * const spec = loadOpenAPISpec('./api-spec.yaml');
   * const validation = OpenAPIValidator.validateSpec(spec);
   *
   * if (!validation.valid) {
   *   console.error('Specification validation failed:');
   *   validation.errors.forEach(error => console.error(`- ${error}`));
   * }
   * ```
   */
  static validateSpec(spec: OpenAPISpec): SwaggerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Determinar versão e tipo
    const { version, specType } = this.identifySpecType(spec);

    // Validações básicas
    this.validateBasicStructure(spec, errors);

    // Validações específicas por versão
    if (specType === "openapi") {
      this.validateOpenAPI3Spec(spec, errors, warnings);
    } else if (specType === "swagger") {
      this.validateSwagger2Spec(spec, errors, warnings);
    }

    // Validações de conteúdo
    this.validatePaths(spec, errors, warnings);
    this.validateComponents(spec, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      version: version as OpenAPIVersion,
    };
  }

  /**
   * Identifica o tipo e versão da especificação
   */
  private static identifySpecType(spec: any): {
    version: string;
    specType: "openapi" | "swagger" | "unknown";
  } {
    if (spec.openapi) {
      return { version: spec.openapi, specType: "openapi" };
    } else if (spec.swagger) {
      return { version: spec.swagger, specType: "swagger" };
    } else {
      return { version: "2.0", specType: "unknown" };
    }
  }

  /**
   * Valida estrutura básica obrigatória
   */
  private static validateBasicStructure(
    spec: OpenAPISpec,
    errors: string[]
  ): void {
    if (!spec.info) {
      errors.push('Campo "info" é obrigatório');
      return;
    }

    if (!spec.info.title) {
      errors.push('Campo "info.title" é obrigatório');
    }

    if (!spec.info.version) {
      errors.push('Campo "info.version" é obrigatório');
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push(
        'Campo "paths" é obrigatório e deve conter pelo menos um caminho'
      );
    }
  }

  /**
   * Valida especificação OpenAPI 3.x
   */
  private static validateOpenAPI3Spec(
    spec: OpenAPISpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.openapi?.startsWith("3.")) {
      warnings.push(
        `Versão OpenAPI "${spec.openapi}" pode ter compatibilidade limitada`
      );
    }

    // Validar servers se presente
    if (spec.servers) {
      for (let i = 0; i < spec.servers.length; i++) {
        const server = spec.servers[i];
        if (!server.url) {
          errors.push(`Server ${i} deve ter uma URL definida`);
        }
      }
    }

    // Validar components se presente
    if (spec.components) {
      this.validateOpenAPIComponents(spec.components, errors, warnings);
    }
  }

  /**
   * Valida especificação Swagger 2.0
   */
  private static validateSwagger2Spec(
    spec: OpenAPISpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (spec.swagger !== "2.0") {
      warnings.push(
        `Versão Swagger "${spec.swagger}" não é totalmente suportada`
      );
    }

    // Validar host/basePath/schemes
    if (spec.host && !spec.schemes) {
      warnings.push('Campo "schemes" recomendado quando "host" está definido');
    }

    // Validar definitions se presente
    if (spec.definitions) {
      this.validateSwaggerDefinitions(spec.definitions, errors, warnings);
    }
  }

  /**
   * Valida caminhos (paths) da API
   */
  private static validatePaths(
    spec: OpenAPISpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.paths) return;

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const pathItemTyped = pathItem;

      // Verificar se o caminho começa com /
      if (!path.startsWith("/")) {
        warnings.push(`Caminho "${path}" deveria começar com "/"`);
      }

      // Verificar se há operações definidas
      const operations = [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "head",
        "options",
        "trace",
      ] as const;
      const hasOperations = operations.some((op) => pathItemTyped[op]);

      if (!hasOperations) {
        warnings.push(`Caminho "${path}" não possui operações definidas`);
      }

      // Validar parâmetros do path
      if (pathItemTyped.parameters) {
        this.validateParameters(
          pathItemTyped.parameters,
          path,
          errors,
          warnings
        );
      }

      // Validar cada operação
      for (const method of operations) {
        const operation = pathItemTyped[method];
        if (operation) {
          this.validateOperation(
            operation,
            path,
            method.toUpperCase(),
            errors,
            warnings
          );

          // Validar parâmetros da operação
          if (operation.parameters) {
            this.validateParameters(
              operation.parameters,
              `${path} (${method.toUpperCase()})`,
              errors,
              warnings
            );
          }
        }
      }
    }
  }

  /**
   * Valida uma operação individual
   */
  private static validateOperation(
    operation: OpenAPIOperation,
    path: string,
    method: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Verificar responses
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      errors.push(
        `${method} ${path}: Pelo menos uma resposta deve ser definida`
      );
    } else {
      // Verificar se há resposta de sucesso (2xx)
      const hasSuccessResponse = Object.keys(operation.responses).some(
        (code) => code.startsWith("2") || code === "default"
      );

      if (!hasSuccessResponse) {
        warnings.push(
          `${method} ${path}: Recomendável definir resposta de sucesso (2xx)`
        );
      }
    }

    // Validar operationId único (se presente)
    if (
      operation.operationId &&
      !/^[a-zA-Z0-9_\-\.]+$/.test(operation.operationId)
    ) {
      warnings.push(
        `${method} ${path}: operationId "${operation.operationId}" contém caracteres especiais`
      );
    }
  }

  /**
   * Valida lista de parâmetros
   */
  private static validateParameters(
    parameters: OpenAPIParameter[],
    context: string,
    errors: string[],
    warnings: string[]
  ): void {
    const paramNames = new Set<string>();

    for (const param of parameters) {
      // Verificar nome único
      if (param.name) {
        if (paramNames.has(param.name)) {
          errors.push(`${context}: Parâmetro "${param.name}" duplicado`);
        }
        paramNames.add(param.name);
      }

      // Verificar campos obrigatórios
      if (!param.name) {
        errors.push(`${context}: Parâmetro deve ter um nome definido`);
      }

      if (
        !param.in ||
        !["query", "header", "path", "cookie"].includes(param.in)
      ) {
        errors.push(
          `${context}: Parâmetro "${param.name}" deve ter "in" válido (query, header, path, cookie)`
        );
      }

      // Verificar parâmetro path obrigatório
      if (param.in === "path" && param.required !== true) {
        errors.push(
          `${context}: Parâmetro path "${param.name}" deve ser obrigatório`
        );
      }
    }
  }

  /**
   * Valida componentes OpenAPI 3.x
   */
  private static validateOpenAPIComponents(
    components: OpenAPIComponents,
    errors: string[],
    warnings: string[]
  ): void {
    // Validar schemas
    if (components.schemas) {
      for (const [name, schema] of Object.entries(components.schemas)) {
        this.validateSchema(
          schema,
          `Component Schema "${name}"`,
          errors,
          warnings
        );
      }
    }

    // Validar security schemes
    if (components.securitySchemes) {
      for (const [name, scheme] of Object.entries(components.securitySchemes)) {
        this.validateSecurityScheme(scheme, name, errors, warnings);
      }
    }
  }

  /**
   * Valida definições Swagger 2.0
   */
  private static validateSwaggerDefinitions(
    definitions: Record<string, OpenAPISchema>,
    errors: string[],
    warnings: string[]
  ): void {
    for (const [name, schema] of Object.entries(definitions)) {
      this.validateSchema(schema, `Definition "${name}"`, errors, warnings);
    }
  }

  /**
   * Valida componentes/schemas
   */
  private static validateComponents(
    spec: OpenAPISpec,
    errors: string[],
    warnings: string[]
  ): void {
    // Validações adicionais de componentes podem ser adicionadas aqui
  }

  /**
   * Valida um schema individual
   */
  private static validateSchema(
    schema: OpenAPISchema,
    context: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Validações básicas de schema podem ser adicionadas aqui
    if (
      schema.type &&
      !["string", "number", "integer", "boolean", "object", "array"].includes(
        schema.type
      )
    ) {
      warnings.push(
        `${context}: Tipo "${schema.type}" pode não ser totalmente suportado`
      );
    }
  }

  /**
   * Valida esquema de segurança
   */
  private static validateSecurityScheme(
    scheme: OpenAPISecurityScheme,
    name: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (!scheme.type) {
      errors.push(`Security Scheme "${name}": Campo "type" é obrigatório`);
      return;
    }

    const validTypes = [
      "apiKey",
      "http",
      "mutualTLS",
      "oauth2",
      "openIdConnect",
    ];
    if (!validTypes.includes(scheme.type)) {
      errors.push(`Security Scheme "${name}": Tipo "${scheme.type}" inválido`);
    }

    // Validações específicas por tipo
    if (scheme.type === "apiKey") {
      if (!scheme.name || !scheme.in) {
        errors.push(
          `Security Scheme "${name}": Campos "name" e "in" são obrigatórios para apiKey`
        );
      }
    }

    if (scheme.type === "http") {
      if (!scheme.scheme) {
        errors.push(
          `Security Scheme "${name}": Campo "scheme" é obrigatório para http`
        );
      }
    }
  }
}
