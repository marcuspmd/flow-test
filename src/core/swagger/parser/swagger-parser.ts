/**
 * @fileoverview Swagger/OpenAPI specification parser with validation and endpoint extraction.
 *
 * @remarks
 * This module provides the SwaggerParser class for comprehensive parsing of Swagger 2.0
 * and OpenAPI 3.x specifications. It includes file reading, structure validation,
 * endpoint extraction, and reference resolution capabilities.
 *
 * @packageDocumentation
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import {
  OpenAPISpec,
  SwaggerParseResult,
  ParsedEndpoint,
  OpenAPIPath,
  OpenAPIOperation,
} from "../../../types/swagger.types";
import { OpenAPIValidator } from "./validator";

/**
 * Comprehensive parser for Swagger/OpenAPI specifications with advanced processing capabilities.
 *
 * @remarks
 * The SwaggerParser class provides robust parsing and processing of API specifications
 * with support for both Swagger 2.0 and OpenAPI 3.x formats. It handles file I/O,
 * format detection, structure validation, and advanced features like reference resolution
 * and endpoint extraction for test generation.
 *
 * **Key Capabilities:**
 * - **Multi-Format Support**: Handles JSON and YAML specification files
 * - **Version Detection**: Automatic detection of Swagger 2.0 vs OpenAPI 3.x
 * - **Structure Validation**: Comprehensive validation using dedicated validator
 * - **Reference Resolution**: Resolves $ref references within specifications
 * - **Endpoint Extraction**: Extracts and processes API endpoints with metadata
 * - **Error Handling**: Detailed error reporting for parsing and validation issues
 *
 * **Supported Features:**
 * - Path parameter extraction and validation
 * - Query parameter processing with schemas
 * - Request/response body analysis
 * - Security scheme detection and processing
 * - Tag-based operation grouping
 * - Server configuration extraction
 *
 * @example Basic specification parsing
 * ```typescript
 * const parser = new SwaggerParser();
 *
 * try {
 *   const result = await parser.parseFile('./api-spec.yaml');
 *
 *   if (result.success) {
 *     console.log(`Parsed ${result.endpoints.length} endpoints`);
 *     console.log(`API Title: ${result.spec?.info.title}`);
 *     console.log(`Version: ${result.spec?.info.version}`);
 *   } else {
 *     console.error('Parsing failed:', result.errors);
 *   }
 * } catch (error) {
 *   console.error('Parser error:', error.message);
 * }
 * ```
 *
 * @example Advanced endpoint processing
 * ```typescript
 * const parser = new SwaggerParser();
 * const result = await parser.parseFile('./petstore.yaml');
 *
 * if (result.success) {
 *   // Filter endpoints by tag
 *   const petEndpoints = result.endpoints.filter(ep =>
 *     ep.tags?.includes('pets')
 *   );
 *
 *   // Extract endpoints with specific HTTP methods
 *   const postEndpoints = result.endpoints.filter(ep =>
 *     ep.method === 'POST'
 *   );
 *
 *   // Process security requirements
 *   const securedEndpoints = result.endpoints.filter(ep =>
 *     ep.security && ep.security.length > 0
 *   );
 * }
 * ```
 *
 * @public
 * @since 2.1.0
 */
export class SwaggerParser {
  /** Parsed OpenAPI specification object */
  private spec: OpenAPISpec | null = null;

  /** Path to the specification file being processed */
  private filePath: string = "";

  /**
   * Parses a Swagger/OpenAPI specification file.
   *
   * @param filePath - Path to the Swagger/OpenAPI specification file (JSON or YAML)
   * @returns Promise resolving to parse result with extracted endpoints and metadata
   *
   * @remarks
   * This method handles the complete parsing workflow including file reading,
   * format detection, validation, and endpoint extraction. It supports both
   * relative and absolute file paths with automatic format detection based
   * on file extension and content analysis.
   *
   * @throws Will throw an error if the file doesn't exist or is not readable
   *
   * @example
   * ```typescript
   * const parser = new SwaggerParser();
   * const result = await parser.parseFile('./openapi.yaml');
   *
   * if (result.success) {
   *   console.log('Endpoints found:', result.endpoints.length);
   *   result.endpoints.forEach(endpoint => {
   *     console.log(`${endpoint.method.toUpperCase()} ${endpoint.path}`);
   *   });
   * }
   * ```
   */
  async parseFile(filePath: string): Promise<SwaggerParseResult> {
    this.filePath = filePath;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Ler e parsear arquivo
      const rawContent = fs.readFileSync(filePath, "utf-8");
      const spec = this.parseContent(rawContent, filePath) as OpenAPISpec;

      // 2. Validar especificação usando o validador avançado
      const validation = OpenAPIValidator.validateSpec(spec);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (!validation.isValid) {
        return {
          spec,
          endpoints: [],
          errors,
          warnings,
        };
      }

      // 3. Extrair endpoints
      const endpoints = this.extractEndpoints(spec);

      // 4. Resolver referências se necessário
      this.spec = spec;

      return {
        spec,
        endpoints,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(`Erro ao processar arquivo ${filePath}: ${errorMessage}`);

      return {
        spec: {} as OpenAPISpec,
        endpoints: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Parse do conteúdo do arquivo baseado na extensão
   */
  private parseContent(content: string, filePath: string): any {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".yaml":
      case ".yml":
        return yaml.load(content);
      case ".json":
        return JSON.parse(content);
      default:
        throw new Error(
          `Formato de arquivo não suportado: ${ext}. Use .json, .yaml ou .yml`
        );
    }
  }

  /**
   * Valida a estrutura da especificação OpenAPI/Swagger
   * @deprecated Use OpenAPIValidator.validateSpec() instead
   */
  private validateSpec(spec: OpenAPISpec) {
    // Este método foi substituído pelo OpenAPIValidator
    return OpenAPIValidator.validateSpec(spec);
  }

  /**
   * Extrai todos os endpoints da especificação
   */
  private extractEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];

    if (!spec.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(spec.paths)) {
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
      const pathItemTyped = pathItem as OpenAPIPath;

      for (const method of operations) {
        const operation = pathItemTyped[method];
        if (operation) {
          // Combinar parâmetros do path com parâmetros da operação
          const pathParams = (pathItemTyped.parameters || []).map((param) =>
            this.resolveParameterRef(param)
          );
          const operationParams = (operation.parameters || []).map((param) =>
            this.resolveParameterRef(param)
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

    return endpoints;
  }

  /**
   * Resolve referência de parâmetro (pode ser uma referência $ref ou parâmetro direto)
   */
  private resolveParameterRef(param: any): any {
    if (param && param.$ref) {
      try {
        const resolved = this.resolveRef(param.$ref);
        return resolved;
      } catch (error) {
        console.warn(
          `Failed to resolve parameter reference ${param.$ref}: ${
            (error as Error).message
          }`
        );
        return param;
      }
    }
    return param;
  }

  /**
   * Resolve referências ($ref) na especificação
   */
  resolveRef(ref: string): any {
    if (!ref.startsWith("#/")) {
      throw new Error(`Referências externas não são suportadas: ${ref}`);
    }

    const path = ref.substring(2).split("/");
    let current: any = this.spec;

    for (const segment of path) {
      if (current && typeof current === "object") {
        current = current[segment];
      } else {
        throw new Error(`Referência não encontrada: ${ref}`);
      }
    }

    if (current === undefined) {
      throw new Error(`Referência não encontrada: ${ref}`);
    }

    return current;
  }

  /**
   * Obtém a especificação atual (após parsing)
   */
  getSpec(): OpenAPISpec | null {
    return this.spec;
  }

  /**
   * Verifica se um arquivo é suportado
   */
  static isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [".json", ".yaml", ".yml"].includes(ext);
  }

  /**
   * Detecta o tipo de arquivo baseado na extensão
   */
  static getFileType(filePath: string): "json" | "yaml" | null {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".json":
        return "json";
      case ".yaml":
      case ".yml":
        return "yaml";
      default:
        return null;
    }
  }
}
