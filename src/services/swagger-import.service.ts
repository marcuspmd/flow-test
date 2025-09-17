import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { SwaggerParser } from "../core/swagger/parser/swagger-parser";
import {
  OpenAPISpec,
  ParsedEndpoint,
  OpenAPIParameter,
  OpenAPISchema,
  ImportResult,
} from "../types/swagger.types";
import { TestSuite, TestStep } from "../types/engine.types";
import { FakerService } from "./faker.service";

/**
 * Swagger/OpenAPI Import Service for Flow Test Engine
 *
 * Converts OpenAPI/Swagger specifications into YAML test files
 * compatible with the Flow Test Engine.
 *
 * @since 1.0.0
 */
export class SwaggerImportService {
  private parser: SwaggerParser;
  private fakerService: FakerService;

  constructor() {
    this.parser = new SwaggerParser();
    this.fakerService = FakerService.getInstance();
  }

  /**
   * Imports a Swagger/OpenAPI specification and generates test files
   */
  async importSpec(
    specFilePath: string,
    outputDir: string = "./tests/imported",
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      generatedSuites: 0,
      generatedDocs: 0,
      outputPath: outputDir,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Parse the specification
      const parseResult = await this.parser.parseFile(specFilePath);

      if (parseResult.errors.length > 0) {
        result.errors.push(...parseResult.errors);
        return result;
      }

      result.warnings.push(...parseResult.warnings);

      // 2. Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 3. Generate test suites
      const suites = this.generateTestSuites(
        parseResult.spec,
        parseResult.endpoints,
        options
      );

      // 4. Save YAML files
      for (const suite of suites) {
        const fileName = this.sanitizeFileName(suite.suite_name) + ".yaml";
        const filePath = path.join(outputDir, fileName);

        const yamlContent = yaml.dump(suite, {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
        });

        fs.writeFileSync(filePath, yamlContent, "utf-8");
        result.generatedSuites++;
      }

      // 5. Gerar documentação se solicitado
      if (options.generateDocs) {
        const docPath = await this.generateDocumentation(
          parseResult.spec,
          outputDir
        );
        if (docPath) {
          result.generatedDocs++;
        }
      }

      result.success = true;
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(`Erro durante importação: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Gera suites de teste baseadas nos endpoints da API
   */
  private generateTestSuites(
    spec: OpenAPISpec,
    endpoints: ParsedEndpoint[],
    options: ImportOptions
  ): TestSuite[] {
    const suites: TestSuite[] = [];

    // Agrupar endpoints por tag ou criar suite única
    if (options.groupByTags && this.hasTaggedEndpoints(endpoints)) {
      const groupedEndpoints = this.groupEndpointsByTag(endpoints);

      for (const [tag, tagEndpoints] of Object.entries(groupedEndpoints)) {
        const suite = this.createTestSuite(spec, tag, tagEndpoints, options);
        suites.push(suite);
      }
    } else {
      // Criar suite única com todos os endpoints
      const suiteName = spec.info.title
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase();
      const suite = this.createTestSuite(spec, suiteName, endpoints, options);
      suites.push(suite);
    }

    return suites;
  }

  /**
   * Cria uma suite de teste para um conjunto de endpoints
   */
  private createTestSuite(
    spec: OpenAPISpec,
    suiteName: string,
    endpoints: ParsedEndpoint[],
    options: ImportOptions
  ): TestSuite {
    const baseUrl = this.extractBaseUrl(spec);
    const variables = this.generateVariables(spec, endpoints, options);

    const steps: TestStep[] = endpoints.map((endpoint) =>
      this.createTestStep(endpoint, options)
    );

    return {
      node_id: suiteName,
      suite_name: suiteName,
      description: `Testes importados de ${spec.info.title} v${spec.info.version}`,
      metadata: {
        priority: "medium",
        tags: ["imported", "swagger", suiteName.toLowerCase()],
      },
      base_url: baseUrl,
      variables,
      steps,
    };
  }

  /**
   * Cria um step de teste para um endpoint
   */
  private createTestStep(
    endpoint: ParsedEndpoint,
    options: ImportOptions
  ): TestStep {
    const headers = this.generateHeaders(endpoint, options);
    const body = this.generateRequestBody(endpoint, options);

    const request: any = {
      method: endpoint.method as any,
      url: this.convertPathParameters(endpoint.path),
    };

    if (headers && Object.keys(headers).length > 0) {
      request.headers = headers;
    }

    if (body) {
      request.body = body;
    }

    const assertions = this.generateAssertions(endpoint, options);
    const capture = this.generateCaptures(endpoint, options);

    const step: TestStep = {
      name: this.generateStepName(endpoint),
      request,
    };

    if (assertions && Object.keys(assertions).length > 0) {
      step.assert = assertions;
    }

    if (capture && Object.keys(capture).length > 0) {
      step.capture = capture;
    }

    return step;
  }

  /**
   * Gera nome para o step baseado no endpoint
   */
  private generateStepName(endpoint: ParsedEndpoint): string {
    if (endpoint.operation.operationId) {
      return endpoint.operation.operationId;
    }

    const pathParts = endpoint.path
      .split("/")
      .filter((part) => part && !part.startsWith("{"));
    const resourceName = pathParts[pathParts.length - 1] || "root";

    return `${endpoint.method.toLowerCase()}_${resourceName}`;
  }

  /**
   * Gera headers para o request
   */
  private generateHeaders(
    endpoint: ParsedEndpoint,
    options: ImportOptions
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // Headers de parâmetros
    const headerParams = endpoint.parameters.filter((p) => p.in === "header");
    for (const param of headerParams) {
      const value = this.generateParameterValue(param, options);
      headers[param.name] = value;
    }

    // Content-Type para requests com body
    if (endpoint.requestBody && endpoint.method !== "GET") {
      const contentTypes = Object.keys(endpoint.requestBody.content);
      if (contentTypes.length > 0) {
        headers["Content-Type"] = contentTypes[0];
      }
    }

    return headers;
  }

  /**
   * Gera corpo da requisição
   */
  private generateRequestBody(
    endpoint: ParsedEndpoint,
    options: ImportOptions
  ): any {
    if (!endpoint.requestBody || endpoint.method === "GET") {
      return undefined;
    }

    const contentTypes = Object.keys(endpoint.requestBody.content);
    if (contentTypes.length === 0) {
      return undefined;
    }

    const mediaType = endpoint.requestBody.content[contentTypes[0]];
    if (!mediaType.schema) {
      return undefined;
    }

    return this.generateSchemaExample(mediaType.schema, options);
  }

  /**
   * Gera assertions baseadas nas respostas
   */
  private generateAssertions(
    endpoint: ParsedEndpoint,
    options: ImportOptions
  ): any {
    const assertions: any = {};

    // Assertion básica de status code para respostas de sucesso
    const successCodes = Object.keys(endpoint.responses).filter(
      (code) => code.startsWith("2") || code === "default"
    );

    if (successCodes.length > 0) {
      const statusCode =
        successCodes[0] === "default" ? "200" : successCodes[0];
      assertions.status_code = parseInt(statusCode);
    }

    return assertions;
  }

  /**
   * Gera captures baseadas nas respostas
   */
  private generateCaptures(
    endpoint: ParsedEndpoint,
    options: ImportOptions
  ): Record<string, string> {
    const captures: Record<string, string> = {};

    // Capturar IDs de recursos criados em operações POST
    if (endpoint.method === "POST") {
      captures.resource_id = "body.id";
    }

    return captures;
  }

  /**
   * Gera variáveis baseadas nos parâmetros da API
   */
  private generateVariables(
    spec: OpenAPISpec,
    endpoints: ParsedEndpoint[],
    options: ImportOptions
  ): Record<string, any> {
    const variables: Record<string, any> = {};

    // Extrair parâmetros únicos
    const allParams = new Map<string, OpenAPIParameter>();

    for (const endpoint of endpoints) {
      for (const param of endpoint.parameters) {
        if (!allParams.has(param.name)) {
          allParams.set(param.name, param);
        }
      }
    }

    // Gerar valores para cada parâmetro
    for (const [name, param] of allParams) {
      if (param.in === "path" || param.in === "query") {
        variables[name] = this.generateParameterValue(param, options);
      }
    }

    return variables;
  }

  /**
   * Gera valor para um parâmetro
   */
  private generateParameterValue(
    param: OpenAPIParameter,
    options: ImportOptions
  ): string {
    if (param.example !== undefined) {
      return String(param.example);
    }

    if (param.schema) {
      const example = this.generateSchemaExample(param.schema, options);
      return String(example);
    }

    // Valores padrão baseados no nome/tipo
    if (param.name.toLowerCase().includes("id")) {
      return "{{faker.uuid}}";
    }

    return `{{${param.name}}}`;
  }

  /**
   * Gera exemplo baseado em schema
   */
  private generateSchemaExample(
    schema: OpenAPISchema,
    options: ImportOptions
  ): any {
    if (schema.example !== undefined) {
      return schema.example;
    }

    if (schema.default !== undefined) {
      return schema.default;
    }

    switch (schema.type) {
      case "string":
        if (schema.format === "email") return "{{faker.email}}";
        if (schema.format === "date") return "{{faker.date}}";
        if (schema.format === "uuid") return "{{faker.uuid}}";
        return "{{faker.word}}";

      case "integer":
      case "number":
        return "{{faker.number}}";

      case "boolean":
        return "{{faker.boolean}}";

      case "array":
        if (schema.items) {
          return [this.generateSchemaExample(schema.items, options)];
        }
        return [];

      case "object":
        const obj: any = {};
        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(
            schema.properties
          )) {
            obj[propName] = this.generateSchemaExample(propSchema, options);
          }
        }
        return obj;

      default:
        return null;
    }
  }

  /**
   * Extrai URL base da especificação
   */
  private extractBaseUrl(spec: OpenAPISpec): string {
    // OpenAPI 3.x
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }

    // Swagger 2.0
    if (spec.host) {
      const scheme = spec.schemes ? spec.schemes[0] : "https";
      const basePath = spec.basePath || "";
      return `${scheme}://${spec.host}${basePath}`;
    }

    return "";
  }

  /**
   * Verifica se endpoints têm tags
   */
  private hasTaggedEndpoints(endpoints: ParsedEndpoint[]): boolean {
    return endpoints.some(
      (endpoint) =>
        endpoint.operation.tags && endpoint.operation.tags.length > 0
    );
  }

  /**
   * Agrupa endpoints por tag
   */
  private groupEndpointsByTag(
    endpoints: ParsedEndpoint[]
  ): Record<string, ParsedEndpoint[]> {
    const groups: Record<string, ParsedEndpoint[]> = {};

    for (const endpoint of endpoints) {
      const tags = endpoint.operation.tags || ["default"];

      for (const tag of tags) {
        if (!groups[tag]) {
          groups[tag] = [];
        }
        groups[tag].push(endpoint);
      }
    }

    return groups;
  }

  /**
   * Sanitiza nome de arquivo
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Gera documentação adicional
   */
  private async generateDocumentation(
    spec: OpenAPISpec,
    outputDir: string
  ): Promise<string | null> {
    try {
      const docContent = this.generateMarkdownDoc(spec);
      const docPath = path.join(outputDir, "README.md");

      fs.writeFileSync(docPath, docContent, "utf-8");
      return docPath;
    } catch (error) {
      return null;
    }
  }

  /**
   * Gera documentação Markdown
   */
  private generateMarkdownDoc(spec: OpenAPISpec): string {
    return `# ${spec.info.title}

${spec.info.description || ""}

**Versão:** ${spec.info.version}

## Testes Importados

Este diretório contém testes automaticamente gerados a partir da especificação OpenAPI.

### Como usar

\`\`\`bash
# Executar todos os testes
flow-test --directory .

# Executar teste específico
flow-test suite-name.yaml
\`\`\`

### Variáveis

Os testes utilizam variáveis para parametrização. Você pode sobrescrever os valores:

- Editando os arquivos YAML diretamente
- Usando variáveis de ambiente
- Passando via configuração

### Notas

- Testes gerados automaticamente podem precisar de ajustes
- Revise assertions e captures conforme necessário
- Adapte variáveis para seu ambiente de teste
`;
  }

  /**
   * Converte parâmetros de path do formato OpenAPI {param} para Flow Test Engine {{param}}
   */
  private convertPathParameters(path: string): string {
    return path.replace(/\{([^}]+)\}/g, "{{$1}}");
  }
}

/**
 * Opções para importação
 */
export interface ImportOptions {
  groupByTags?: boolean;
  generateDocs?: boolean;
  includeExamples?: boolean;
  useFakerForData?: boolean;
  outputFormat?: "yaml" | "json";
}
