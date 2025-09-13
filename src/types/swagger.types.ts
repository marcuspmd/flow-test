/**
 * Tipos específicos para o sistema de importação Swagger/OpenAPI
 *
 * Este módulo contém as definições de tipos para trabalhar com especificações
 * OpenAPI 3.0+ e Swagger 2.0, incluindo estruturas para parsing, validação
 * e geração de código.
 *
 * @since 2.1.0
 */

export type OpenAPIVersion = "2.0" | "3.0.0" | "3.0.1" | "3.0.2" | "3.0.3" | "3.1.0";

/**
 * Especificação OpenAPI completa
 */
export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, OpenAPIPath>;
  components?: OpenAPIComponents;
  definitions?: Record<string, OpenAPISchema>;
  parameters?: Record<string, OpenAPIParameter>;
  responses?: Record<string, OpenAPIResponse>;
  securityDefinitions?: Record<string, OpenAPISecurityScheme>;
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocs;
}

/**
 * Informações da API
 */
export interface OpenAPIInfo {
  title: string;
  description?: string;
  version: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
  termsOfService?: string;
}

/**
 * Servidor da API
 */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

/**
 * Variável de servidor
 */
export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

/**
 * Definição de caminho da API
 */
export interface OpenAPIPath {
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  head?: OpenAPIOperation;
  options?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

/**
 * Operação da API (endpoint)
 */
export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  deprecated?: boolean;
  security?: OpenAPISecurityRequirement[];
  servers?: OpenAPIServer[];
  externalDocs?: OpenAPIExternalDocs;
}

/**
 * Parâmetro da operação
 */
export interface OpenAPIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema;
  example?: any;
  examples?: Record<string, OpenAPIExample>;
  content?: Record<string, OpenAPIMediaType>;
}

/**
 * Corpo da requisição
 */
export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

/**
 * Tipo de mídia
 */
export interface OpenAPIMediaType {
  schema?: OpenAPISchema;
  example?: any;
  examples?: Record<string, OpenAPIExample>;
  encoding?: Record<string, OpenAPIEncoding>;
}

/**
 * Resposta da API
 */
export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink>;
}

/**
 * Schema OpenAPI
 */
export interface OpenAPISchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  additionalProperties?: boolean | OpenAPISchema;
  nullable?: boolean;
  discriminator?: OpenAPIDiscriminator;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: OpenAPIXml;
  externalDocs?: OpenAPIExternalDocs;
  example?: any;
  examples?: any[];
  deprecated?: boolean;
  $ref?: string;
}

/**
 * Componentes OpenAPI
 */
export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  examples?: Record<string, OpenAPIExample>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  headers?: Record<string, OpenAPIHeader>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
  links?: Record<string, OpenAPILink>;
  callbacks?: Record<string, OpenAPICallback>;
}

/**
 * Esquema de segurança
 */
export interface OpenAPISecurityScheme {
  type: "apiKey" | "http" | "mutualTLS" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

/**
 * Flows OAuth2
 */
export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

/**
 * Flow OAuth2 individual
 */
export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * Requisito de segurança
 */
export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OpenAPILicense {
  name: string;
  url?: string;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
}

export interface OpenAPIExternalDocs {
  description?: string;
  url: string;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface OpenAPIEncoding {
  contentType?: string;
  headers?: Record<string, OpenAPIHeader>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema;
  example?: any;
  examples?: Record<string, OpenAPIExample>;
}

export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: OpenAPIServer;
}

export interface OpenAPIDiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface OpenAPIXml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export interface OpenAPICallback {
  [expression: string]: Record<string, OpenAPIPath>;
}

// Tipos para processamento e resultado

export interface ParsedEndpoint {
  path: string;
  method: string;
  operation: OpenAPIOperation;
  parameters: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
}

export interface SwaggerParseResult {
  spec: OpenAPISpec;
  endpoints: ParsedEndpoint[];
  errors: string[];
  warnings: string[];
}

export interface SwaggerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  version: OpenAPIVersion;
}

export interface ImportResult {
  success: boolean;
  generatedSuites: number;
  generatedDocs: number;
  outputPath: string;
  errors: string[];
  warnings: string[];
}