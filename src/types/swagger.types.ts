/**
 * @fileoverview Type definitions for Swagger/OpenAPI integration and specification handling.
 *
 * @remarks
 * This module contains comprehensive type definitions for working with OpenAPI 3.0+ and
 * Swagger 2.0 specifications. It provides structured interfaces for parsing, validation,
 * and code generation from API specifications with full type safety.
 *
 * @packageDocumentation
 */

export type OpenAPIVersion =
  | "2.0"
  | "3.0.0"
  | "3.0.1"
  | "3.0.2"
  | "3.0.3"
  | "3.1.0";

/**
 * Complete OpenAPI specification structure.
 *
 * @remarks
 * Represents the root object of an OpenAPI specification document. This interface
 * supports both OpenAPI 3.x and legacy Swagger 2.0 specifications with appropriate
 * field validation and type safety.
 *
 * @example Basic OpenAPI spec structure
 * ```typescript
 * const spec: OpenAPISpec = {
 *   openapi: '3.0.0',
 *   info: {
 *     title: 'API Documentation',
 *     version: '1.0.0'
 *   },
 *   servers: [{
 *     url: 'https://api.example.com',
 *     description: 'Production server'
 *   }],
 *   paths: {
 *     '/users': {
 *       get: {
 *         summary: 'List users',
 *         responses: { '200': { description: 'Success' } }
 *       }
 *     }
 *   }
 * };
 * ```
 *
 * @public
 * @since 2.1.0
 */
export interface OpenAPISpec {
  /** OpenAPI version (3.x specifications) */
  openapi?: string;

  /** Swagger version (2.0 specifications - legacy) */
  swagger?: string;

  /** API metadata and information */
  info: OpenAPIInfo;

  /** Server configurations for OpenAPI 3.x */
  servers?: OpenAPIServer[];

  /** Host information for Swagger 2.0 (legacy) */
  host?: string;

  /** Base path for Swagger 2.0 (legacy) */
  basePath?: string;

  /** Supported schemes for Swagger 2.0 (legacy) */
  schemes?: string[];

  /** Available API paths and operations */
  paths: Record<string, OpenAPIPath>;

  /** Reusable components for OpenAPI 3.x */
  components?: OpenAPIComponents;

  /** Schema definitions for Swagger 2.0 (legacy) */
  definitions?: Record<string, OpenAPISchema>;

  /** Parameter definitions for Swagger 2.0 (legacy) */
  parameters?: Record<string, OpenAPIParameter>;

  /** Response definitions for Swagger 2.0 (legacy) */
  responses?: Record<string, OpenAPIResponse>;

  /** Security definitions for Swagger 2.0 (legacy) */
  securityDefinitions?: Record<string, OpenAPISecurityScheme>;

  /** API tags for grouping operations */
  tags?: OpenAPITag[];

  /** External documentation references */
  externalDocs?: OpenAPIExternalDocs;
}

/**
 * API metadata and information section.
 *
 * @remarks
 * Contains essential information about the API including title, version,
 * description, and contact details. This information is used for documentation
 * generation and API discovery.
 *
 * @example API info configuration
 * ```typescript
 * const info: OpenAPIInfo = {
 *   title: 'User Management API',
 *   version: '2.1.0',
 *   description: 'Comprehensive user management and authentication API',
 *   contact: {
 *     name: 'API Support',
 *     email: 'support@example.com',
 *     url: 'https://example.com/support'
 *   },
 *   license: {
 *     name: 'MIT',
 *     url: 'https://opensource.org/licenses/MIT'
 *   }
 * };
 * ```
 *
 * @public
 * @since 2.1.0
 */
export interface OpenAPIInfo {
  /** The title of the API */
  title: string;

  /** A detailed description of the API */
  description?: string;

  /** The version of the OpenAPI document */
  version: string;

  /** Contact information for the exposed API */
  contact?: OpenAPIContact;

  /** License information for the exposed API */
  license?: OpenAPILicense;

  /** A URL to the Terms of Service for the API */
  termsOfService?: string;
}

/**
 * Server configuration for API endpoints.
 *
 * @remarks
 * Defines server information including URL, description, and variable substitution
 * for different environments (development, staging, production). Used in OpenAPI 3.x
 * specifications to replace the legacy host/basePath approach.
 *
 * @example Server configuration with variables
 * ```typescript
 * const server: OpenAPIServer = {
 *   url: 'https://{environment}.api.example.com/{basePath}',
 *   description: 'Environment-specific API server',
 *   variables: {
 *     environment: {
 *       default: 'production',
 *       enum: ['development', 'staging', 'production'],
 *       description: 'API environment'
 *     },
 *     basePath: {
 *       default: 'v1',
 *       description: 'API version path'
 *     }
 *   }
 * };
 * ```
 *
 * @public
 * @since 2.1.0
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
