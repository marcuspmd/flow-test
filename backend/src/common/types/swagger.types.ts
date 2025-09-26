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
  | '2.0'
  | '3.0.0'
  | '3.0.1'
  | '3.0.2'
  | '3.0.3'
  | '3.1.0';

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
 * @since 1.0.0
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
 * @public
 * @since 1.0.0
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
 * @public
 * @since 1.0.0
 */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

/**
 * Server variable configuration
 */
export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

/**
 * API path definition
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
 * API operation (endpoint)
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
 * Operation parameter
 */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema;
  example?: unknown;
  examples?: Record<string, OpenAPIExample>;
  content?: Record<string, OpenAPIMediaType>;
}

/**
 * Request body
 */
export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

/**
 * Media type
 */
export interface OpenAPIMediaType {
  schema?: OpenAPISchema;
  example?: unknown;
  examples?: Record<string, OpenAPIExample>;
  encoding?: Record<string, OpenAPIEncoding>;
}

/**
 * API response
 */
export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink>;
}

/**
 * OpenAPI Schema
 */
export interface OpenAPISchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
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
  enum?: unknown[];
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
  example?: unknown;
  examples?: unknown[];
  deprecated?: boolean;
  $ref?: string;
}

/**
 * OpenAPI Components
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
 * Security scheme
 */
export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'mutualTLS' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

/**
 * OAuth2 flows
 */
export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

/**
 * Individual OAuth2 flow
 */
export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * Security requirement
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
  value?: unknown;
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
  example?: unknown;
  examples?: Record<string, OpenAPIExample>;
}

export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
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

// Types for processing and result

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

export interface SwaggerImportResult {
  success: boolean;
  generatedSuites: number;
  outputFiles: string[];
  errors: string[];
  warnings: string[];
  suites: Array<{
    name: string;
    nodeId: string;
    yamlContent: string;
    metadata: {
      stepCount: number;
      hasVariables: boolean;
      hasDependencies: boolean;
      tags: string[];
      priority?: string;
    };
  }>;
}

export interface SwaggerImportOptions {
  groupByTags?: boolean;
  generateDocs?: boolean;
  includeExamples?: boolean;
  useFakerForData?: boolean;
  outputFormat?: 'yaml' | 'json';
}