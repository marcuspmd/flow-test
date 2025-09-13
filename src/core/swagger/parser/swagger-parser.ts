import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  OpenAPISpec,
  SwaggerParseResult,
  ParsedEndpoint,
  OpenAPIPath,
  OpenAPIOperation
} from '../../../types/swagger.types';
import { OpenAPIValidator } from './validator';

/**
 * Parser base para especificações Swagger/OpenAPI
 *
 * Esta classe é responsável por:
 * - Ler arquivos JSON/YAML
 * - Validar estrutura da especificação
 * - Extrair endpoints e metadados
 * - Resolver referências ($ref)
 *
 * @since 2.1.0
 */
export class SwaggerParser {
  private spec: OpenAPISpec | null = null;
  private filePath: string = '';

  /**
   * Faz o parse de um arquivo Swagger/OpenAPI
   *
   * @param filePath Caminho para o arquivo (.json, .yaml, .yml)
   * @returns Resultado do parsing com especificação e endpoints extraídos
   */
  async parseFile(filePath: string): Promise<SwaggerParseResult> {
    this.filePath = filePath;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Ler e parsear arquivo
      const rawContent = fs.readFileSync(filePath, 'utf-8');
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
          warnings
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
        warnings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Erro ao processar arquivo ${filePath}: ${errorMessage}`);

      return {
        spec: {} as OpenAPISpec,
        endpoints: [],
        errors,
        warnings
      };
    }
  }

  /**
   * Parse do conteúdo do arquivo baseado na extensão
   */
  private parseContent(content: string, filePath: string): any {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.yaml':
      case '.yml':
        return yaml.load(content);
      case '.json':
        return JSON.parse(content);
      default:
        throw new Error(`Formato de arquivo não suportado: ${ext}. Use .json, .yaml ou .yml`);
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
      const operations = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'] as const;
      const pathItemTyped = pathItem as OpenAPIPath;

      for (const method of operations) {
        const operation = pathItemTyped[method];
        if (operation) {
          // Combinar parâmetros do path com parâmetros da operação
          const pathParams = (pathItemTyped.parameters || []).map(param =>
            this.resolveParameterRef(param)
          );
          const operationParams = (operation.parameters || []).map(param =>
            this.resolveParameterRef(param)
          );

          const allParameters = [...pathParams, ...operationParams];

          endpoints.push({
            path,
            method: method.toUpperCase(),
            operation,
            parameters: allParameters,
            requestBody: operation.requestBody,
            responses: operation.responses || {}
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
        console.warn(`Failed to resolve parameter reference ${param.$ref}: ${(error as Error).message}`);
        return param;
      }
    }
    return param;
  }

  /**
   * Resolve referências ($ref) na especificação
   */
  resolveRef(ref: string): any {
    if (!ref.startsWith('#/')) {
      throw new Error(`Referências externas não são suportadas: ${ref}`);
    }

    const path = ref.substring(2).split('/');
    let current: any = this.spec;

    for (const segment of path) {
      if (current && typeof current === 'object') {
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
    return ['.json', '.yaml', '.yml'].includes(ext);
  }

  /**
   * Detecta o tipo de arquivo baseado na extensão
   */
  static getFileType(filePath: string): 'json' | 'yaml' | null {
    const ext = path.extname(filePath).toLowerCase();

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