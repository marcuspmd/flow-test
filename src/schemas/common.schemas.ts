/**
 * @fileoverview Zod schemas for common shared type definitions.
 *
 * @remarks
 * This module provides Zod schemas for dynamic variables, input post-processing,
 * and expression reevaluation within the Flow Test Engine. These schemas enable
 * runtime validation of data structures and provide type inference.
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Schema for supported scopes of dynamically created variables.
 *
 * @remarks
 * Defines where a dynamic variable will be available:
 * - `runtime`: Available only for the current suite execution (default)
 * - `suite`: Persisted for the suite duration and shared across steps
 * - `global`: Exported to the global registry for reuse by other suites
 *
 * @example
 * ```typescript
 * import { DynamicVariableScopeSchema } from './schemas/common.schemas';
 *
 * const scope = DynamicVariableScopeSchema.parse('global');
 * // Type-safe: scope is "runtime" | "suite" | "global"
 * ```
 *
 * @public
 */
export const DynamicVariableScopeSchema = z.enum([
  "runtime",
  "suite",
  "global",
]);

/**
 * Schema for source tags describing where a dynamic variable originated from.
 *
 * @remarks
 * Tracks the origin of dynamic variables for debugging and traceability:
 * - `input`: Variable came from user input
 * - `capture`: Variable was captured from a response
 * - `computed`: Variable was computed from an expression
 * - `reevaluation`: Variable was created during a reevaluation cycle
 *
 * @example
 * ```typescript
 * import { DynamicVariableSourceSchema } from './schemas/common.schemas';
 *
 * const source = DynamicVariableSourceSchema.parse('capture');
 * ```
 *
 * @public
 */
export const DynamicVariableSourceSchema = z.enum([
  "input",
  "capture",
  "computed",
  "reevaluation",
]);

/**
 * Schema for expression languages supported when evaluating dynamic variables.
 *
 * @remarks
 * Supported languages for variable evaluation:
 * - `jmespath`: JMESPath query language for JSON data
 * - `javascript`: JavaScript expressions
 *
 * @example
 * ```typescript
 * import { DynamicExpressionLanguageSchema } from './schemas/common.schemas';
 *
 * const language = DynamicExpressionLanguageSchema.parse('jmespath');
 * ```
 *
 * @public
 */
export const DynamicExpressionLanguageSchema = z.enum([
  "jmespath",
  "javascript",
]);

/**
 * Schema for dynamic variable definition that can be reevaluated multiple times.
 *
 * @remarks
 * Defines a variable that will be computed dynamically during execution and can
 * be reevaluated when dependencies change. This enables reactive variable updates.
 *
 * @example
 * ```typescript
 * import { DynamicVariableDefinitionSchema } from './schemas/common.schemas';
 *
 * const definition = DynamicVariableDefinitionSchema.parse({
 *   name: 'user_count',
 *   expression: 'length(users)',
 *   type: 'computed',
 *   language: 'jmespath',
 *   scope: 'suite',
 *   description: 'Total number of users',
 *   persist: true,
 *   reevaluateOn: ['users']
 * });
 * ```
 *
 * @public
 */
export const DynamicVariableDefinitionSchema = z.object({
  /** Unique variable identifier that will be created/updated */
  name: z.string().min(1).describe("Variable name"),

  /** Expression used to compute the value */
  expression: z.string().min(1).describe("Evaluation expression"),

  /** Indicates whether expression should be processed as capture or computed */
  type: z.enum(["capture", "computed"]).describe("Variable type"),

  /** Optional explicit language override (defaults derive from type) */
  language: DynamicExpressionLanguageSchema.optional().describe(
    "Expression language"
  ),

  /** Target scope where the resulting value should be persisted */
  scope: DynamicVariableScopeSchema.optional().describe("Variable scope"),

  /** Optional textual description for logging/reporting */
  description: z.string().optional().describe("Variable description"),

  /**
   * Whether the variable should be exported to global registry/persisted
   * beyond the current runtime context.
   */
  persist: z.boolean().optional().describe("Persist to global registry"),

  /**
   * List of variable names that should trigger reevaluation when they change.
   * When undefined, the definition is assumed to depend on the owning input value.
   */
  reevaluateOn: z.array(z.string()).optional().describe("Reevaluation triggers"),
});

/**
 * Schema for concrete assignment produced after evaluating a dynamic variable.
 *
 * @remarks
 * Represents the result of evaluating a dynamic variable definition, including
 * the computed value, metadata about its source, and timing information.
 *
 * @example
 * ```typescript
 * import { DynamicVariableAssignmentSchema } from './schemas/common.schemas';
 *
 * const assignment = DynamicVariableAssignmentSchema.parse({
 *   name: 'auth_token',
 *   value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   scope: 'global',
 *   source: 'capture',
 *   expression: 'body.token',
 *   timestamp: new Date().toISOString(),
 *   reevaluated: false,
 *   persist: true
 * });
 * ```
 *
 * @public
 */
export const DynamicVariableAssignmentSchema = z.object({
  /** Variable name that received the assignment */
  name: z.string().min(1).describe("Variable name"),

  /** Value produced by evaluation */
  value: z.any().describe("Computed value"),

  /** Scope where the value was written */
  scope: DynamicVariableScopeSchema.describe("Assignment scope"),

  /** Metadata about the source of the assignment */
  source: DynamicVariableSourceSchema.describe("Assignment source"),

  /** Expression used to compute the value (for traceability) */
  expression: z.string().optional().describe("Source expression"),

  /**
   * Timestamp (ISO string) representing when the assignment was produced.
   * Allows reporting/monitoring tools to order updates.
   */
  timestamp: z.string().datetime().describe("Assignment timestamp"),

  /** Whether the assignment was produced as part of a reevaluation cycle */
  reevaluated: z.boolean().optional().describe("Is reevaluated"),

  /** Indicates if the assignment should be exported to the global registry */
  persist: z.boolean().optional().describe("Should persist"),
});

/**
 * Schema for metadata describing dynamic processing attached to an interactive input.
 *
 * @remarks
 * Configures how dynamic variables are derived from interactive inputs, including
 * capture expressions, computed values, reevaluation rules, and export settings.
 *
 * @example
 * ```typescript
 * import { InputDynamicConfigSchema } from './schemas/common.schemas';
 *
 * const config = InputDynamicConfigSchema.parse({
 *   scope: 'suite',
 *   capture: {
 *     user_id: 'id',
 *     username: 'name'
 *   },
 *   computed: {
 *     display_name: '`${name} (${id})`'
 *   },
 *   exports: ['user_id', 'username'],
 *   persist_to_global: true
 * });
 * ```
 *
 * @public
 */
export const InputDynamicConfigSchema = z.object({
  /** Default scope for variables derived from this input */
  scope: DynamicVariableScopeSchema.optional().describe("Default scope"),

  /** Map of variable name -> JMESPath expression to capture values from input context */
  capture: z.record(z.string(), z.string()).optional().describe("Capture expressions"),

  /** Map of variable name -> JavaScript expression for computed values */
  computed: z.record(z.string(), z.string()).optional().describe("Computed expressions"),

  /**
   * Optional collection of definitions registered for subsequent reevaluation
   * cycles triggered by other variable changes.
   */
  reevaluate: z
    .array(DynamicVariableDefinitionSchema)
    .optional()
    .describe("Reevaluation definitions"),

  /** List of variable names that should also be exported via global registry */
  exports: z.array(z.string()).optional().describe("Export list"),

  /**
   * When true, any derived variable will be stored in the global registry by default.
   * Useful shorthand instead of enumerating through `exports`.
   */
  persist_to_global: z.boolean().optional().describe("Auto-persist to global"),
});

/**
 * Schema for dynamic validation rule evaluated against input context and current variables.
 *
 * @remarks
 * Defines a validation expression that can be dynamically evaluated, with support
 * for multiple expression languages and severity levels (error vs warning).
 *
 * @example
 * ```typescript
 * import { InputValidationExpressionSchema } from './schemas/common.schemas';
 *
 * const validation = InputValidationExpressionSchema.parse({
 *   name: 'Valid email format',
 *   expression: 'email && /^[^@]+@[^@]+\.[^@]+$/.test(email)',
 *   language: 'javascript-inline',
 *   message: 'Please provide a valid email address',
 *   severity: 'error',
 *   reevaluateOn: ['email']
 * });
 * ```
 *
 * @public
 */
export const InputValidationExpressionSchema = z.object({
  /** Friendly name displayed in logs */
  name: z.string().optional().describe("Validation name"),

  /** Expression returning truthy for success */
  expression: z.string().min(1).describe("Validation expression"),

  /** Language used by the expression. Defaults depend on rule type. */
  language: z
    .enum(["jmespath", "javascript", "javascript-inline"])
    .optional()
    .describe("Expression language"),

  /** Message displayed when expression evaluates to false */
  message: z.string().min(1).describe("Error message"),

  /**
   * Severity controls whether violation blocks progression (`error`) or just warns.
   * Warnings are logged but do not fail validation.
   */
  severity: z.enum(["error", "warning"]).optional().describe("Severity level"),

  /** List of variable names that should trigger reevaluation of this rule */
  reevaluateOn: z.array(z.string()).optional().describe("Reevaluation triggers"),
});

/**
 * Schema for extended validation configuration for interactive inputs.
 *
 * @remarks
 * Provides comprehensive validation options for user inputs including length constraints,
 * pattern matching, numeric ranges, allowed options, and custom validation expressions.
 *
 * @example Basic validation
 * ```typescript
 * import { InputValidationConfigSchema } from './schemas/common.schemas';
 *
 * const config = InputValidationConfigSchema.parse({
 *   min_length: 8,
 *   max_length: 128,
 *   pattern: '^[a-zA-Z0-9_]+$'
 * });
 * ```
 *
 * @example Advanced validation with expressions
 * ```typescript
 * const config = InputValidationConfigSchema.parse({
 *   min: 1,
 *   max: 100,
 *   expressions: [
 *     {
 *       name: 'Valid range',
 *       expression: 'value >= 1 && value <= 100',
 *       language: 'javascript-inline',
 *       message: 'Value must be between 1 and 100',
 *       severity: 'error'
 *     }
 *   ]
 * });
 * ```
 *
 * @public
 */
export const InputValidationConfigSchema = z.object({
  /** Minimum length for string inputs */
  min_length: z.number().int().nonnegative().optional().describe("Min length"),

  /** Maximum length for string inputs */
  max_length: z.number().int().positive().optional().describe("Max length"),

  /** Regex pattern for validation */
  pattern: z.string().optional().describe("Regex pattern"),

  /** Minimum numeric value accepted */
  min: z.union([z.number(), z.string()]).optional().describe("Min value"),

  /** Maximum numeric value accepted */
  max: z.union([z.number(), z.string()]).optional().describe("Max value"),

  /**
   * Allowed options when validation needs to restrict possible values.
   * Can be an array or an expression returning the options list.
   */
  options: z
    .union([
      z.array(z.object({ value: z.any(), label: z.string() })),
      z.string(),
    ])
    .optional()
    .describe("Allowed options"),

  /** Legacy custom validation expression (JavaScript) */
  custom_validation: z.string().optional().describe("Custom validation"),

  /** Collection of dynamic validation expressions */
  expressions: z
    .array(InputValidationExpressionSchema)
    .optional()
    .describe("Validation expressions"),
});

/**
 * Schema for result of processing an input including derived dynamic variables.
 *
 * @remarks
 * Contains the complete result of an input operation, including the raw input
 * value and any derived dynamic variable assignments that were created.
 *
 * @example
 * ```typescript
 * import { InputProcessingResultSchema } from './schemas/common.schemas';
 *
 * const result = InputProcessingResultSchema.parse({
 *   input: {
 *     variable: 'api_key',
 *     value: 'sk-abc123',
 *     used_default: false,
 *     validation_passed: true,
 *     timed_out: false,
 *     input_time_ms: 15000
 *   },
 *   derived_assignments: [
 *     {
 *       name: 'masked_key',
 *       value: 'sk-***',
 *       scope: 'runtime',
 *       source: 'computed',
 *       timestamp: new Date().toISOString()
 *     }
 *   ]
 * });
 * ```
 *
 * @public
 */
export const InputProcessingResultSchema = z.object({
  /** Raw input result provided by the InputService */
  input: z.object({
    variable: z.string().describe("Variable name"),
    value: z.any().describe("Input value"),
    used_default: z.boolean().describe("Used default value"),
    validation_passed: z.boolean().describe("Validation passed"),
    timed_out: z.boolean().describe("Input timed out"),
    input_time_ms: z.number().nonnegative().describe("Input duration in ms"),
    validation_error: z.string().optional().describe("Validation error"),
  }),

  /** Derived dynamic assignments created from this input */
  derived_assignments: z
    .array(DynamicVariableAssignmentSchema)
    .describe("Derived assignments"),
});

/**
 * Type inference helpers for TypeScript compatibility
 */
export type DynamicVariableScope = z.infer<typeof DynamicVariableScopeSchema>;
export type DynamicVariableSource = z.infer<typeof DynamicVariableSourceSchema>;
export type DynamicExpressionLanguage = z.infer<
  typeof DynamicExpressionLanguageSchema
>;
export type DynamicVariableDefinition = z.infer<
  typeof DynamicVariableDefinitionSchema
>;
export type DynamicVariableAssignment = z.infer<
  typeof DynamicVariableAssignmentSchema
>;
export type InputDynamicConfig = z.infer<typeof InputDynamicConfigSchema>;
export type InputValidationExpression = z.infer<
  typeof InputValidationExpressionSchema
>;
export type InputValidationConfig = z.infer<typeof InputValidationConfigSchema>;
export type InputProcessingResult = z.infer<typeof InputProcessingResultSchema>;
