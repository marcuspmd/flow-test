/**
 * @fileoverview Central export point for all Zod schemas.
 *
 * @remarks
 * This module provides a single entry point for importing all Zod schemas
 * used throughout the Flow Test Engine. It organizes schemas by category
 * for easy discovery and use.
 *
 * @example Import all schemas
 * ```typescript
 * import * as Schemas from 'flow-test-engine/schemas';
 *
 * // Use engine schemas
 * const suite = Schemas.TestSuiteSchema.parse(yamlData);
 *
 * // Use config schemas
 * const config = Schemas.EngineConfigSchema.parse(configData);
 *
 * // Use common schemas
 * const assignment = Schemas.DynamicVariableAssignmentSchema.parse(data);
 * ```
 *
 * @example Import specific schema categories
 * ```typescript
 * import { TestSuiteSchema, TestStepSchema } from 'flow-test-engine/schemas';
 * import { EngineConfigSchema } from 'flow-test-engine/schemas';
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Common Schemas - Shared type definitions
// ============================================================================

export {
  // Enums
  DynamicVariableScopeSchema,
  DynamicVariableSourceSchema,
  DynamicExpressionLanguageSchema,

  // Objects
  DynamicVariableDefinitionSchema,
  DynamicVariableAssignmentSchema,
  InputDynamicConfigSchema,
  InputValidationExpressionSchema,
  InputValidationConfigSchema,
  InputProcessingResultSchema,

  // Types
  type DynamicVariableScope,
  type DynamicVariableSource,
  type DynamicExpressionLanguage,
  type DynamicVariableDefinition,
  type DynamicVariableAssignment,
  type InputDynamicConfig,
  type InputValidationExpression,
  type InputValidationConfig,
  type InputProcessingResult,
} from "./common.schemas";

// ============================================================================
// Engine Schemas - Core test engine types
// ============================================================================

export {
  // Enums
  HttpMethodSchema,

  // Request & Response
  RequestDetailsSchema,
  AssertionChecksSchema,
  CustomAssertionSchema,
  AssertionsSchema,

  // Scenarios & Iterations
  ConditionalScenarioSchema,
  ArrayIterationConfigSchema,
  RangeIterationConfigSchema,
  IterationConfigSchema,

  // Input & Context
  InputConfigSchema,
  InputResultSchema,
  IterationContextSchema,

  // Test Structure
  TestStepMetadataSchema,
  TestStepSchema,
  FlowDependencySchema,
  ReusableFlowSchema,
  TestSuiteSchema,

  // Types
  type HttpMethod,
  type RequestDetails,
  type AssertionChecks,
  type CustomAssertion,
  type Assertions,
  type ConditionalScenario,
  type ArrayIterationConfig,
  type RangeIterationConfig,
  type IterationConfig,
  type InputConfig,
  type InputResult,
  type IterationContext,
  type TestStepMetadata,
  type TestStep,
  type FlowDependency,
  type ReusableFlow,
  type TestSuite,
} from "./engine.schemas";

// ============================================================================
// Config Schemas - Configuration and execution types
// ============================================================================

export {
  // Report Formats
  ReportFormatSchema,
  HtmlReportingConfigSchema,
  ReportingConfigSchema,

  // Execution Config
  RetryConfigSchema,
  ExecutionConfigSchema,
  PriorityConfigSchema,
  DiscoveryConfigSchema,
  GlobalConfigSchema,
  EngineConfigSchema,

  // Variables & Discovery
  GlobalVariableContextSchema,
  DiscoveredTestSchema,

  // Results
  AssertionResultSchema,
  ScenarioEvaluationSchema,
  ScenarioMetaSchema,
  StepExecutionResultSchema,
  SuiteExecutionResultSchema,
  PerformanceSummarySchema,
  AggregatedResultSchema,

  // Execution Options
  ExecutionFiltersSchema,
  EngineExecutionOptionsSchema,

  // Types
  type ReportFormat,
  type HtmlReportingConfig,
  type ReportingConfig,
  type RetryConfig,
  type ExecutionConfig,
  type PriorityConfig,
  type DiscoveryConfig,
  type GlobalConfig,
  type EngineConfig,
  type GlobalVariableContext,
  type DiscoveredTest,
  type AssertionResult,
  type ScenarioEvaluation,
  type ScenarioMeta,
  type StepExecutionResult,
  type SuiteExecutionResult,
  type PerformanceSummary,
  type AggregatedResult,
  type ExecutionFilters,
  type EngineExecutionOptions,
} from "./config.schemas";

// ============================================================================
// Call Schemas - Cross-suite step call types
// ============================================================================

export {
  // Enums
  StepCallErrorStrategySchema,

  // Objects
  StepCallRetrySchema,
  StepCallConfigSchema,
  StepCallRequestSchema,
  StepCallResultSchema,
  StepCallExecutionOptionsSchema,

  // Types
  type StepCallErrorStrategy,
  type StepCallRetry,
  type StepCallConfig,
  type StepCallRequest,
  type StepCallResult,
  type StepCallExecutionOptions,
} from "./call.schemas";

// ============================================================================
// Swagger Schemas - OpenAPI/Swagger specification types
// ============================================================================

export {
  // Enums
  OpenAPIVersionSchema,

  // Info & Metadata
  OpenAPIContactSchema,
  OpenAPILicenseSchema,
  OpenAPIInfoSchema,

  // Server Configuration
  OpenAPIServerVariableSchema,
  OpenAPIServerSchema,

  // Documentation
  OpenAPIExternalDocsSchema,
  OpenAPITagSchema,

  // Schema Objects
  OpenAPISchemaObjectSchema,
  OpenAPIExampleSchema,
  OpenAPIMediaTypeSchema,

  // Parameters & Headers
  OpenAPIParameterSchema,
  OpenAPIRequestBodySchema,
  OpenAPIHeaderSchema,
  OpenAPIResponseSchema,

  // Security
  OpenAPISecurityRequirementSchema,
  OpenAPISecuritySchemeSchema,

  // Operations & Paths
  OpenAPIOperationSchema,
  OpenAPIPathSchema,

  // Components
  OpenAPIComponentsSchema,

  // Complete Spec
  OpenAPISpecSchema,

  // Parsing & Validation
  ParsedEndpointSchema,
  SwaggerParseResultSchema,
  SwaggerValidationResultSchema,
  ImportResultSchema,

  // Types
  type OpenAPIVersion,
  type OpenAPIContact,
  type OpenAPILicense,
  type OpenAPIInfo,
  type OpenAPIServerVariable,
  type OpenAPIServer,
  type OpenAPIExternalDocs,
  type OpenAPITag,
  type OpenAPISchema,
  type OpenAPIExample,
  type OpenAPIMediaType,
  type OpenAPIParameter,
  type OpenAPIRequestBody,
  type OpenAPIHeader,
  type OpenAPIResponse,
  type OpenAPISecurityRequirement,
  type OpenAPISecurityScheme,
  type OpenAPIOperation,
  type OpenAPIPath,
  type OpenAPIComponents,
  type OpenAPISpec,
  type ParsedEndpoint,
  type SwaggerParseResult,
  type SwaggerValidationResult,
  type ImportResult,
} from "./swagger.schemas";

/**
 * Schema validation utilities
 *
 * @remarks
 * These utilities provide helper functions for common validation scenarios,
 * making it easier to validate data with proper error handling and reporting.
 */
export const SchemaUtils = {
  /**
   * Safely parse data with a schema, returning null on error.
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Parsed data or null if validation failed
   *
   * @example
   * ```typescript
   * import { SchemaUtils, TestSuiteSchema } from 'flow-test-engine/schemas';
   *
   * const suite = SchemaUtils.safeParse(TestSuiteSchema, yamlData);
   * if (suite) {
   *   console.log('Valid suite:', suite.suite_name);
   * } else {
   *   console.error('Invalid suite data');
   * }
   * ```
   */
  safeParse: <T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } }, data: unknown): T | null => {
    const result = schema.safeParse(data);
    return result.success ? result.data! : null;
  },

  /**
   * Parse data with a schema and get detailed error messages.
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Object with success status, data, and formatted errors
   *
   * @example
   * ```typescript
   * import { SchemaUtils, EngineConfigSchema } from 'flow-test-engine/schemas';
   *
   * const result = SchemaUtils.parseWithErrors(EngineConfigSchema, configData);
   * if (result.success) {
   *   console.log('Valid config:', result.data);
   * } else {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  parseWithErrors: <T>(
    schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
    data: unknown
  ): { success: boolean; data?: T; errors?: string[] } => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    const errors = result.error?.errors?.map(
      (err: any) => `${err.path.join(".")}: ${err.message}`
    ) || ["Unknown validation error"];
    return { success: false, errors };
  },

  /**
   * Validate data and throw descriptive error on failure.
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @param context - Optional context string for error messages
   * @returns Validated and typed data
   * @throws Error with detailed validation failure information
   *
   * @example
   * ```typescript
   * import { SchemaUtils, TestStepSchema } from 'flow-test-engine/schemas';
   *
   * try {
   *   const step = SchemaUtils.validateOrThrow(
   *     TestStepSchema,
   *     stepData,
   *     'Step validation'
   *   );
   *   // Use validated step
   * } catch (error) {
   *   console.error('Validation failed:', error.message);
   * }
   * ```
   */
  validateOrThrow: <T>(
    schema: { parse: (data: unknown) => T },
    data: unknown,
    context?: string
  ): T => {
    try {
      return schema.parse(data);
    } catch (error: any) {
      const prefix = context ? `${context}: ` : "";
      const errors = error?.errors?.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      ).join(", ") || error.message;
      throw new Error(`${prefix}${errors}`);
    }
  },
};
