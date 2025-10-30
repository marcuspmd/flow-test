/**
 * @fileoverview Zod schemas for OpenAPI/Swagger specification handling.
 *
 * @remarks
 * This module provides Zod schemas for working with OpenAPI 3.0+ and Swagger 2.0
 * specifications, enabling runtime validation of API specifications and supporting
 * test generation from OpenAPI documents.
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Schema for OpenAPI version.
 *
 * @public
 */
export const OpenAPIVersionSchema = z.enum([
  "2.0",
  "3.0.0",
  "3.0.1",
  "3.0.2",
  "3.0.3",
  "3.1.0",
]);

/**
 * Schema for contact information.
 *
 * @public
 */
export const OpenAPIContactSchema = z.object({
  /** Contact name */
  name: z.string().optional().describe("Contact name"),

  /** Contact URL */
  url: z.string().url().optional().describe("Contact URL"),

  /** Contact email */
  email: z.string().email().optional().describe("Contact email"),
});

/**
 * Schema for license information.
 *
 * @public
 */
export const OpenAPILicenseSchema = z.object({
  /** License name */
  name: z.string().min(1).describe("License name"),

  /** License URL */
  url: z.string().url().optional().describe("License URL"),
});

/**
 * Schema for API metadata and information.
 *
 * @example
 * ```typescript
 * import { OpenAPIInfoSchema } from './schemas/swagger.schemas';
 *
 * const info = OpenAPIInfoSchema.parse({
 *   title: 'User Management API',
 *   version: '2.1.0',
 *   description: 'Comprehensive user management API',
 *   contact: {
 *     name: 'API Support',
 *     email: 'support@example.com',
 *     url: 'https://example.com/support'
 *   },
 *   license: {
 *     name: 'MIT',
 *     url: 'https://opensource.org/licenses/MIT'
 *   }
 * });
 * ```
 *
 * @public
 */
export const OpenAPIInfoSchema = z.object({
  /** The title of the API */
  title: z.string().min(1).describe("API title"),

  /** A detailed description of the API */
  description: z.string().optional().describe("API description"),

  /** The version of the OpenAPI document */
  version: z.string().min(1).describe("API version"),

  /** Contact information */
  contact: OpenAPIContactSchema.optional().describe("Contact info"),

  /** License information */
  license: OpenAPILicenseSchema.optional().describe("License info"),

  /** Terms of service URL */
  termsOfService: z.string().url().optional().describe("Terms of service"),
});

/**
 * Schema for server variable.
 *
 * @public
 */
export const OpenAPIServerVariableSchema = z.object({
  /** Enumeration of allowed values */
  enum: z.array(z.string()).optional().describe("Allowed values"),

  /** Default value */
  default: z.string().describe("Default value"),

  /** Description */
  description: z.string().optional().describe("Description"),
});

/**
 * Schema for server configuration.
 *
 * @example
 * ```typescript
 * import { OpenAPIServerSchema } from './schemas/swagger.schemas';
 *
 * const server = OpenAPIServerSchema.parse({
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
 * });
 * ```
 *
 * @public
 */
export const OpenAPIServerSchema = z.object({
  /** Server URL */
  url: z.string().min(1).describe("Server URL"),

  /** Server description */
  description: z.string().optional().describe("Description"),

  /** Server variables */
  variables: z
    .record(z.string(), OpenAPIServerVariableSchema)
    .optional()
    .describe("Variables"),
});

/**
 * Schema for external documentation.
 *
 * @public
 */
export const OpenAPIExternalDocsSchema = z.object({
  /** Description */
  description: z.string().optional().describe("Description"),

  /** External documentation URL */
  url: z.string().url().describe("Documentation URL"),
});

/**
 * Schema for tag.
 *
 * @public
 */
export const OpenAPITagSchema = z.object({
  /** Tag name */
  name: z.string().min(1).describe("Tag name"),

  /** Tag description */
  description: z.string().optional().describe("Description"),

  /** External documentation */
  externalDocs: OpenAPIExternalDocsSchema.optional().describe("External docs"),
});

/**
 * Schema for OpenAPI schema object (recursive).
 *
 * @remarks
 * Uses lazy evaluation to handle recursive schema definitions.
 * We use z.any() for recursive fields to avoid circular dependency issues.
 *
 * @public
 */
export const OpenAPISchemaObjectSchema = z.object({
  type: z.string().optional(),
  format: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  default: z.any().optional(),
  multipleOf: z.number().optional(),
  maximum: z.number().optional(),
  exclusiveMaximum: z.boolean().optional(),
  minimum: z.number().optional(),
  exclusiveMinimum: z.boolean().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  minLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  minItems: z.number().int().nonnegative().optional(),
  uniqueItems: z.boolean().optional(),
  maxProperties: z.number().int().nonnegative().optional(),
  minProperties: z.number().int().nonnegative().optional(),
  required: z.array(z.string()).optional(),
  enum: z.array(z.any()).optional(),
  allOf: z.array(z.any()).optional(),
  oneOf: z.array(z.any()).optional(),
  anyOf: z.array(z.any()).optional(),
  not: z.any().optional(),
  items: z.any().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  additionalProperties: z.union([z.boolean(), z.any()]).optional(),
  nullable: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  writeOnly: z.boolean().optional(),
  example: z.any().optional(),
  examples: z.array(z.any()).optional(),
  deprecated: z.boolean().optional(),
  $ref: z.string().optional(),
});

/**
 * Schema for example object.
 *
 * @public
 */
export const OpenAPIExampleSchema = z.object({
  /** Example summary */
  summary: z.string().optional().describe("Summary"),

  /** Example description */
  description: z.string().optional().describe("Description"),

  /** Example value */
  value: z.any().optional().describe("Value"),

  /** External value reference */
  externalValue: z.string().optional().describe("External value"),
});

/**
 * Schema for media type.
 *
 * @public
 */
export const OpenAPIMediaTypeSchema = z.object({
  /** Schema */
  schema: OpenAPISchemaObjectSchema.optional().describe("Schema"),

  /** Example */
  example: z.any().optional().describe("Example"),

  /** Examples */
  examples: z.record(z.string(), OpenAPIExampleSchema).optional().describe("Examples"),

  /** Encoding */
  encoding: z.record(z.string(), z.any()).optional().describe("Encoding"),
});

/**
 * Schema for parameter.
 *
 * @public
 */
export const OpenAPIParameterSchema = z.object({
  /** Parameter name */
  name: z.string().min(1).describe("Parameter name"),

  /** Parameter location */
  in: z.enum(["query", "header", "path", "cookie"]).describe("Location"),

  /** Parameter description */
  description: z.string().optional().describe("Description"),

  /** Whether parameter is required */
  required: z.boolean().optional().describe("Required"),

  /** Whether parameter is deprecated */
  deprecated: z.boolean().optional().describe("Deprecated"),

  /** Allow empty value */
  allowEmptyValue: z.boolean().optional().describe("Allow empty"),

  /** Parameter style */
  style: z.string().optional().describe("Style"),

  /** Explode parameter */
  explode: z.boolean().optional().describe("Explode"),

  /** Allow reserved characters */
  allowReserved: z.boolean().optional().describe("Allow reserved"),

  /** Parameter schema */
  schema: OpenAPISchemaObjectSchema.optional().describe("Schema"),

  /** Example */
  example: z.any().optional().describe("Example"),

  /** Examples */
  examples: z.record(z.string(), OpenAPIExampleSchema).optional().describe("Examples"),

  /** Content */
  content: z.record(z.string(), OpenAPIMediaTypeSchema).optional().describe("Content"),
});

/**
 * Schema for request body.
 *
 * @public
 */
export const OpenAPIRequestBodySchema = z.object({
  /** Description */
  description: z.string().optional().describe("Description"),

  /** Content types */
  content: z.record(z.string(), OpenAPIMediaTypeSchema).describe("Content"),

  /** Whether request body is required */
  required: z.boolean().optional().describe("Required"),
});

/**
 * Schema for header.
 *
 * @public
 */
export const OpenAPIHeaderSchema = z.object({
  /** Description */
  description: z.string().optional().describe("Description"),

  /** Required */
  required: z.boolean().optional().describe("Required"),

  /** Deprecated */
  deprecated: z.boolean().optional().describe("Deprecated"),

  /** Schema */
  schema: OpenAPISchemaObjectSchema.optional().describe("Schema"),

  /** Example */
  example: z.any().optional().describe("Example"),

  /** Examples */
  examples: z.record(z.string(), OpenAPIExampleSchema).optional().describe("Examples"),
});

/**
 * Schema for response.
 *
 * @public
 */
export const OpenAPIResponseSchema = z.object({
  /** Response description */
  description: z.string().describe("Description"),

  /** Response headers */
  headers: z.record(z.string(), OpenAPIHeaderSchema).optional().describe("Headers"),

  /** Response content */
  content: z.record(z.string(), OpenAPIMediaTypeSchema).optional().describe("Content"),

  /** Links */
  links: z.record(z.string(), z.any()).optional().describe("Links"),
});

/**
 * Schema for security requirement.
 *
 * @public
 */
export const OpenAPISecurityRequirementSchema = z.record(z.string(), z.array(z.string()));

/**
 * Schema for operation (endpoint).
 *
 * @public
 */
export const OpenAPIOperationSchema = z.object({
  /** Operation summary */
  summary: z.string().optional().describe("Summary"),

  /** Operation description */
  description: z.string().optional().describe("Description"),

  /** Operation ID */
  operationId: z.string().optional().describe("Operation ID"),

  /** Tags */
  tags: z.array(z.string()).optional().describe("Tags"),

  /** Parameters */
  parameters: z.array(OpenAPIParameterSchema).optional().describe("Parameters"),

  /** Request body */
  requestBody: OpenAPIRequestBodySchema.optional().describe("Request body"),

  /** Responses */
  responses: z.record(z.string(), OpenAPIResponseSchema).describe("Responses"),

  /** Deprecated */
  deprecated: z.boolean().optional().describe("Deprecated"),

  /** Security */
  security: z
    .array(OpenAPISecurityRequirementSchema)
    .optional()
    .describe("Security"),

  /** Servers */
  servers: z.array(OpenAPIServerSchema).optional().describe("Servers"),

  /** External docs */
  externalDocs: OpenAPIExternalDocsSchema.optional().describe("External docs"),
});

/**
 * Schema for path item.
 *
 * @public
 */
export const OpenAPIPathSchema = z.object({
  /** Summary */
  summary: z.string().optional().describe("Summary"),

  /** Description */
  description: z.string().optional().describe("Description"),

  /** GET operation */
  get: OpenAPIOperationSchema.optional().describe("GET"),

  /** POST operation */
  post: OpenAPIOperationSchema.optional().describe("POST"),

  /** PUT operation */
  put: OpenAPIOperationSchema.optional().describe("PUT"),

  /** DELETE operation */
  delete: OpenAPIOperationSchema.optional().describe("DELETE"),

  /** PATCH operation */
  patch: OpenAPIOperationSchema.optional().describe("PATCH"),

  /** HEAD operation */
  head: OpenAPIOperationSchema.optional().describe("HEAD"),

  /** OPTIONS operation */
  options: OpenAPIOperationSchema.optional().describe("OPTIONS"),

  /** TRACE operation */
  trace: OpenAPIOperationSchema.optional().describe("TRACE"),

  /** Parameters */
  parameters: z.array(OpenAPIParameterSchema).optional().describe("Parameters"),
});

/**
 * Schema for security scheme.
 *
 * @public
 */
export const OpenAPISecuritySchemeSchema = z.object({
  /** Security type */
  type: z
    .enum(["apiKey", "http", "mutualTLS", "oauth2", "openIdConnect"])
    .describe("Type"),

  /** Description */
  description: z.string().optional().describe("Description"),

  /** Name (for apiKey) */
  name: z.string().optional().describe("Name"),

  /** Location (for apiKey) */
  in: z.enum(["query", "header", "cookie"]).optional().describe("Location"),

  /** Scheme (for http) */
  scheme: z.string().optional().describe("Scheme"),

  /** Bearer format */
  bearerFormat: z.string().optional().describe("Bearer format"),

  /** OAuth flows */
  flows: z.any().optional().describe("Flows"),

  /** OpenID Connect URL */
  openIdConnectUrl: z.string().url().optional().describe("OpenID Connect URL"),
});

/**
 * Schema for components.
 *
 * @public
 */
export const OpenAPIComponentsSchema = z.object({
  /** Schemas */
  schemas: z.record(z.string(), OpenAPISchemaObjectSchema).optional().describe("Schemas"),

  /** Responses */
  responses: z.record(z.string(), OpenAPIResponseSchema).optional().describe("Responses"),

  /** Parameters */
  parameters: z.record(z.string(), OpenAPIParameterSchema).optional().describe("Parameters"),

  /** Examples */
  examples: z.record(z.string(), OpenAPIExampleSchema).optional().describe("Examples"),

  /** Request bodies */
  requestBodies: z
    .record(z.string(), OpenAPIRequestBodySchema)
    .optional()
    .describe("Request bodies"),

  /** Headers */
  headers: z.record(z.string(), OpenAPIHeaderSchema).optional().describe("Headers"),

  /** Security schemes */
  securitySchemes: z
    .record(z.string(), OpenAPISecuritySchemeSchema)
    .optional()
    .describe("Security schemes"),

  /** Links */
  links: z.record(z.string(), z.any()).optional().describe("Links"),

  /** Callbacks */
  callbacks: z.record(z.string(), z.any()).optional().describe("Callbacks"),
});

/**
 * Schema for complete OpenAPI specification.
 *
 * @example
 * ```typescript
 * import { OpenAPISpecSchema } from './schemas/swagger.schemas';
 *
 * const spec = OpenAPISpecSchema.parse({
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
 * });
 * ```
 *
 * @public
 */
export const OpenAPISpecSchema = z.object({
  /** OpenAPI version (3.x) */
  openapi: z.string().optional().describe("OpenAPI version"),

  /** Swagger version (2.0 - legacy) */
  swagger: z.string().optional().describe("Swagger version"),

  /** API metadata */
  info: OpenAPIInfoSchema.describe("API info"),

  /** Server configurations (OpenAPI 3.x) */
  servers: z.array(OpenAPIServerSchema).optional().describe("Servers"),

  /** Host (Swagger 2.0 - legacy) */
  host: z.string().optional().describe("Host"),

  /** Base path (Swagger 2.0 - legacy) */
  basePath: z.string().optional().describe("Base path"),

  /** Schemes (Swagger 2.0 - legacy) */
  schemes: z.array(z.string()).optional().describe("Schemes"),

  /** API paths */
  paths: z.record(z.string(), OpenAPIPathSchema).describe("Paths"),

  /** Components (OpenAPI 3.x) */
  components: OpenAPIComponentsSchema.optional().describe("Components"),

  /** Definitions (Swagger 2.0 - legacy) */
  definitions: z
    .record(z.string(), OpenAPISchemaObjectSchema)
    .optional()
    .describe("Definitions"),

  /** Parameters (Swagger 2.0 - legacy) */
  parameters: z.record(z.string(), OpenAPIParameterSchema).optional().describe("Parameters"),

  /** Responses (Swagger 2.0 - legacy) */
  responses: z.record(z.string(), OpenAPIResponseSchema).optional().describe("Responses"),

  /** Security definitions (Swagger 2.0 - legacy) */
  securityDefinitions: z
    .record(z.string(), OpenAPISecuritySchemeSchema)
    .optional()
    .describe("Security definitions"),

  /** Tags */
  tags: z.array(OpenAPITagSchema).optional().describe("Tags"),

  /** External documentation */
  externalDocs: OpenAPIExternalDocsSchema.optional().describe("External docs"),
});

/**
 * Schema for parsed endpoint.
 *
 * @public
 */
export const ParsedEndpointSchema = z.object({
  /** Endpoint path */
  path: z.string().describe("Path"),

  /** HTTP method */
  method: z.string().describe("Method"),

  /** Operation details */
  operation: OpenAPIOperationSchema.describe("Operation"),

  /** Parameters */
  parameters: z.array(OpenAPIParameterSchema).describe("Parameters"),

  /** Request body */
  requestBody: OpenAPIRequestBodySchema.optional().describe("Request body"),

  /** Responses */
  responses: z.record(z.string(), OpenAPIResponseSchema).describe("Responses"),
});

/**
 * Schema for swagger parse result.
 *
 * @public
 */
export const SwaggerParseResultSchema: z.ZodType<any> = z.object({
  /** Parsed specification */
  spec: OpenAPISpecSchema.describe("Specification"),

  /** Parsed endpoints */
  endpoints: z.array(ParsedEndpointSchema).describe("Endpoints"),

  /** Parsing errors */
  errors: z.array(z.string()).describe("Errors"),

  /** Parsing warnings */
  warnings: z.array(z.string()).describe("Warnings"),
});

/**
 * Schema for swagger validation result.
 *
 * @public
 */
export const SwaggerValidationResultSchema = z.object({
  /** Whether spec is valid */
  isValid: z.boolean().describe("Is valid"),

  /** Validation errors */
  errors: z.array(z.string()).describe("Errors"),

  /** Validation warnings */
  warnings: z.array(z.string()).describe("Warnings"),

  /** Detected version */
  version: OpenAPIVersionSchema.describe("Version"),
});

/**
 * Schema for import result.
 *
 * @public
 */
export const ImportResultSchema = z.object({
  /** Whether import succeeded */
  success: z.boolean().describe("Success"),

  /** Number of generated suites */
  generatedSuites: z.number().int().nonnegative().describe("Generated suites"),

  /** Number of generated docs */
  generatedDocs: z.number().int().nonnegative().describe("Generated docs"),

  /** Output path */
  outputPath: z.string().describe("Output path"),

  /** Import errors */
  errors: z.array(z.string()).describe("Errors"),

  /** Import warnings */
  warnings: z.array(z.string()).describe("Warnings"),
});

/**
 * Type inference helpers for TypeScript compatibility
 */
export type OpenAPIVersion = z.infer<typeof OpenAPIVersionSchema>;
export type OpenAPIContact = z.infer<typeof OpenAPIContactSchema>;
export type OpenAPILicense = z.infer<typeof OpenAPILicenseSchema>;
export type OpenAPIInfo = z.infer<typeof OpenAPIInfoSchema>;
export type OpenAPIServerVariable = z.infer<typeof OpenAPIServerVariableSchema>;
export type OpenAPIServer = z.infer<typeof OpenAPIServerSchema>;
export type OpenAPIExternalDocs = z.infer<typeof OpenAPIExternalDocsSchema>;
export type OpenAPITag = z.infer<typeof OpenAPITagSchema>;
export type OpenAPISchema = z.infer<typeof OpenAPISchemaObjectSchema>;
export type OpenAPIExample = z.infer<typeof OpenAPIExampleSchema>;
export type OpenAPIMediaType = z.infer<typeof OpenAPIMediaTypeSchema>;
export type OpenAPIParameter = z.infer<typeof OpenAPIParameterSchema>;
export type OpenAPIRequestBody = z.infer<typeof OpenAPIRequestBodySchema>;
export type OpenAPIHeader = z.infer<typeof OpenAPIHeaderSchema>;
export type OpenAPIResponse = z.infer<typeof OpenAPIResponseSchema>;
export type OpenAPISecurityRequirement = z.infer<
  typeof OpenAPISecurityRequirementSchema
>;
export type OpenAPIOperation = z.infer<typeof OpenAPIOperationSchema>;
export type OpenAPIPath = z.infer<typeof OpenAPIPathSchema>;
export type OpenAPISecurityScheme = z.infer<typeof OpenAPISecuritySchemeSchema>;
export type OpenAPIComponents = z.infer<typeof OpenAPIComponentsSchema>;
export type OpenAPISpec = z.infer<typeof OpenAPISpecSchema>;
export type ParsedEndpoint = z.infer<typeof ParsedEndpointSchema>;
export type SwaggerParseResult = z.infer<typeof SwaggerParseResultSchema>;
export type SwaggerValidationResult = z.infer<
  typeof SwaggerValidationResultSchema
>;
export type ImportResult = z.infer<typeof ImportResultSchema>;
