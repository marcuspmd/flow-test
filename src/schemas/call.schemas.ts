/**
 * @fileoverview Zod schemas for step call cross-suite functionality.
 *
 * @remarks
 * This module provides Zod schemas for step call configurations, enabling
 * runtime validation of cross-suite step invocations with support for
 * variable passing, context isolation, and error handling strategies.
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Schema for step call error handling strategy.
 *
 * @remarks
 * Defines how to handle errors during step call execution:
 * - `fail`: Stop execution and mark as failed (default)
 * - `continue`: Continue execution despite errors
 * - `warn`: Log warning but continue execution
 *
 * @public
 */
export const StepCallErrorStrategySchema = z.enum(["fail", "continue", "warn"]);

/**
 * Schema for retry configuration.
 *
 * @public
 */
export const StepCallRetrySchema = z.object({
  /** Maximum number of retry attempts */
  max_attempts: z.number().int().positive().describe("Max attempts"),

  /** Delay between retry attempts in milliseconds */
  delay_ms: z.number().nonnegative().describe("Delay in ms"),
});

/**
 * Schema for step call configuration.
 *
 * @remarks
 * Configures a cross-suite step call, allowing one test suite to invoke
 * a specific step from another suite with custom variables and execution settings.
 *
 * @example Basic step call
 * ```typescript
 * import { StepCallConfigSchema } from './schemas/call.schemas';
 *
 * const config = StepCallConfigSchema.parse({
 *   test: "./auth/login.yaml",
 *   step: "authenticate_user",
 *   variables: {
 *     username: "testuser",
 *     password: "secret123"
 *   }
 * });
 * ```
 *
 * @example Advanced step call with retry and error handling
 * ```typescript
 * const config = StepCallConfigSchema.parse({
 *   test: "common/database/setup.yaml",
 *   path_type: "absolute",
 *   step: "initialize_database",
 *   isolate_context: true,
 *   on_error: "continue",
 *   timeout: 30000,
 *   retry: {
 *     max_attempts: 3,
 *     delay_ms: 2000
 *   }
 * });
 * ```
 *
 * @public
 */
export const StepCallConfigSchema = z.object({
  /** Path to the target test file */
  test: z.string().min(1).describe("Test file path"),

  /**
   * Path resolution strategy
   * - "relative": Path is relative to the current file (default)
   * - "absolute": Path is relative to test_directory root
   */
  path_type: z.enum(["relative", "absolute"]).optional().describe("Path type"),

  /** Name of the step to call in the target file */
  step: z.string().min(1).describe("Step name"),

  /** Variables to pass to the called step context */
  variables: z.record(z.string(), z.any()).optional().describe("Variables"),

  /**
   * Alias to prefix captured variables (optional)
   * - If defined: variables will be prefixed with "alias." (e.g., "auth.access_token")
   * - If not defined: variables will be prefixed with "node_id." (e.g., "func_auth.access_token")
   * - Useful to avoid long prefixes and improve readability
   */
  alias: z.string().optional().describe("Variable prefix alias"),

  /** Execute in isolated context (default: true) */
  isolate_context: z.boolean().optional().describe("Isolate context"),

  /** Error handling strategy: fail | continue | warn (default: fail) */
  on_error: StepCallErrorStrategySchema.optional().describe("Error strategy"),

  /** Timeout in milliseconds (optional) */
  timeout: z.number().positive().optional().describe("Timeout ms"),

  /** Retry configuration (optional) */
  retry: StepCallRetrySchema.optional().describe("Retry config"),
});

/**
 * Schema for step call request.
 *
 * @public
 */
export const StepCallRequestSchema = z.object({
  /** Path to the target test file */
  test: z.string().min(1).describe("Test file path"),

  /** Path resolution strategy */
  path_type: z.enum(["relative", "absolute"]).optional().describe("Path type"),

  /** Name of the step to call */
  step: z.string().min(1).describe("Step name"),

  /** Variables to pass */
  variables: z.record(z.string(), z.any()).optional().describe("Variables"),

  /** Alias to prefix captured variables */
  alias: z.string().optional().describe("Variable prefix alias"),

  /** Execute in isolated context */
  isolate_context: z.boolean().optional().describe("Isolate context"),

  /** Timeout in milliseconds */
  timeout: z.number().positive().optional().describe("Timeout"),

  /** Retry configuration */
  retry: StepCallRetrySchema.optional().describe("Retry config"),

  /** Error handling strategy */
  on_error: StepCallErrorStrategySchema.optional().describe("Error strategy"),
});

/**
 * Schema for step call result.
 *
 * @remarks
 * Contains the result of executing a cross-suite step call, including
 * success status, captured variables, and execution metadata.
 *
 * @example
 * ```typescript
 * import { StepCallResultSchema } from './schemas/call.schemas';
 *
 * const result = StepCallResultSchema.parse({
 *   success: true,
 *   captured_variables: {
 *     auth_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     user_id: "12345"
 *   },
 *   propagated_variables: {
 *     "login::auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "login::user_id": "12345"
 *   },
 *   executionTime: 1250,
 *   step_name: "authenticate_user",
 *   suite_name: "Login Flow",
 *   suite_node_id: "login-flow",
 *   status: "success"
 * });
 * ```
 *
 * @public
 */
export const StepCallResultSchema = z.object({
  /** Whether the step call succeeded */
  success: z.boolean().describe("Success"),

  /** Error message if call failed */
  error: z.string().optional().describe("Error message"),

  /** Variables captured during step execution */
  captured_variables: z
    .record(z.string(), z.any())
    .optional()
    .describe("Captured variables"),

  /** Variables ready to be propagated to caller (after namespace adjustments) */
  propagated_variables: z
    .record(z.any())
    .optional()
    .describe("Propagated variables"),

  /** All available variables after execution */
  available_variables: z
    .record(z.string(), z.any())
    .optional()
    .describe("Available variables"),

  /** Execution time in milliseconds */
  executionTime: z.number().nonnegative().optional().describe("Execution time"),

  /** Name of the executed step */
  step_name: z.string().optional().describe("Step name"),

  /** Name of the suite containing the step */
  suite_name: z.string().optional().describe("Suite name"),

  /** Node ID of the suite */
  suite_node_id: z.string().optional().describe("Suite node ID"),

  /** Execution status */
  status: z
    .enum(["success", "failure", "skipped"])
    .optional()
    .describe("Status"),
});

/**
 * Schema for step call execution options.
 *
 * @public
 */
export const StepCallExecutionOptionsSchema = z.object({
  /** Absolute path of the file that originated the call */
  callerSuitePath: z.string().min(1).describe("Caller suite path"),

  /** Unique identifier (node_id) of the current suite */
  callerNodeId: z.string().optional().describe("Caller node ID"),

  /** Friendly name of the current suite */
  callerSuiteName: z.string().optional().describe("Caller suite name"),

  /** Root directory allowed for suite resolution (sanitization) */
  allowedRoot: z.string().optional().describe("Allowed root"),

  /** Call stack for loop detection */
  callStack: z.array(z.string()).optional().describe("Call stack"),

  /** Maximum allowed depth */
  maxDepth: z.number().int().positive().optional().describe("Max depth"),
});

/**
 * Type inference helpers for TypeScript compatibility
 */
export type StepCallErrorStrategy = z.infer<typeof StepCallErrorStrategySchema>;
export type StepCallRetry = z.infer<typeof StepCallRetrySchema>;
export type StepCallConfig = z.infer<typeof StepCallConfigSchema>;
export type StepCallRequest = z.infer<typeof StepCallRequestSchema>;
export type StepCallResult = z.infer<typeof StepCallResultSchema>;
export type StepCallExecutionOptions = z.infer<
  typeof StepCallExecutionOptionsSchema
>;
