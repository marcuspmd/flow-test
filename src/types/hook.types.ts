/**
 * @fileoverview Type definitions for the Lifecycle Hooks system.
 *
 * @remarks
 * This module provides comprehensive type definitions for the lifecycle hooks system,
 * allowing injection of logic at specific points in the test execution flow.
 * Inspired by patterns from Express.js, NestJS, and Jest.
 *
 * @packageDocumentation
 */

import { StepCallConfig } from "./call.types";

/**
 * Severity level for validation results in hooks
 *
 * @public
 */
export type HookValidationSeverity = "error" | "warning" | "info";

/**
 * Log level for custom logging in hooks
 *
 * @public
 */
export type HookLogLevel = "debug" | "info" | "warn" | "error";

/**
 * Validation configuration for hook actions
 *
 * @remarks
 * Allows validation of conditions with custom messages and severity levels.
 * Expressions are evaluated as JavaScript and should return a boolean.
 *
 * @example
 * ```typescript
 * const validation: HookValidation = {
 *   expression: "username && password",
 *   message: "Username and password are required",
 *   severity: "error"
 * };
 * ```
 *
 * @public
 */
export interface HookValidation {
  /**
   * JavaScript expression that should evaluate to boolean
   * @example "product_id && quantity > 0"
   */
  expression: string;

  /**
   * Custom error message to display if validation fails
   */
  message?: string;

  /**
   * Severity of the validation failure
   * @defaultValue "error"
   */
  severity?: HookValidationSeverity;
}

/**
 * Custom logging configuration for hooks
 *
 * @remarks
 * Provides structured logging capabilities within hooks with
 * support for log levels and metadata.
 *
 * @example
 * ```typescript
 * const logConfig: HookLogConfig = {
 *   level: "info",
 *   message: "Processing item {{item_id}}",
 *   metadata: {
 *     user_id: "123",
 *     action: "add_to_cart"
 *   }
 * };
 * ```
 *
 * @public
 */
export interface HookLogConfig {
  /**
   * Log level for this message
   * @defaultValue "info"
   */
  level?: HookLogLevel;

  /**
   * Log message (supports variable interpolation)
   */
  message: string;

  /**
   * Additional metadata to include in log entry
   */
  metadata?: Record<string, any>;
}

/**
 * Metric/telemetry configuration for hooks
 *
 * @remarks
 * Allows emission of custom metrics and telemetry data during test execution.
 * Useful for tracking performance, business metrics, and custom events.
 *
 * @example
 * ```typescript
 * const metric: HookMetricConfig = {
 *   name: "api_call_duration",
 *   value: 150,
 *   tags: {
 *     endpoint: "/users",
 *     status: "success"
 *   }
 * };
 * ```
 *
 * @public
 */
export interface HookMetricConfig {
  /**
   * Metric name/identifier
   */
  name: string;

  /**
   * Metric value (number, string, boolean, etc.)
   */
  value: any;

  /**
   * Tags/labels for metric categorization
   */
  tags?: Record<string, string>;

  /**
   * Timestamp for the metric (defaults to current time)
   */
  timestamp?: number;
}

/**
 * Comprehensive hook action configuration
 *
 * @remarks
 * Defines all possible actions that can be executed within a lifecycle hook.
 * Each hook execution can perform multiple actions in sequence.
 *
 * **Available Actions:**
 * - `compute`: Calculate and store variables (replaces ComputedService)
 * - `capture`: Extract data using JMESPath from execution context
 * - `exports`: Export variables to global scope
 * - `validate`: Validate conditions with custom messages
 * - `log`: Custom structured logging
 * - `metric`: Emit metrics/telemetry
 * - `script`: Execute arbitrary JavaScript code
 * - `call`: Execute another step/suite
 * - `wait`: Introduce delays
 *
 * @example Basic compute and log
 * ```typescript
 * const hookAction: HookAction = {
 *   compute: {
 *     timestamp: "{{$js:Date.now()}}",
 *     request_id: "{{$js:crypto.randomUUID()}}"
 *   },
 *   log: {
 *     level: "info",
 *     message: "Request {{request_id}} at {{timestamp}}"
 *   }
 * };
 * ```
 *
 * @example Capture and export from response
 * ```typescript
 * const hookAction: HookAction = {
 *   capture: {
 *     user_id: "response.body.data.user.id",
 *     token: "response.body.token",
 *     status_code: "response.status_code"
 *   },
 *   exports: ["user_id", "token"],
 *   log: {
 *     message: "Captured user_id={{user_id}} and exported to global scope"
 *   }
 * };
 * ```
 *
 * @example Validation and conditional logic
 * ```typescript
 * const hookAction: HookAction = {
 *   validate: [
 *     {
 *       expression: "product_id && quantity > 0",
 *       message: "Valid product and quantity required",
 *       severity: "error"
 *     }
 *   ],
 *   compute: {
 *     total_price: "{{$js:price * quantity}}"
 *   }
 * };
 * ```
 *
 * @public
 */
export interface HookAction {
  /**
   * Compute and store variables
   *
   * @remarks
   * Key-value pairs where keys are variable names and values are expressions
   * to evaluate (supports interpolation and JavaScript expressions).
   * Replaces the functionality of ComputedService.
   *
   * @example
   * ```yaml
   * compute:
   *   timestamp: "{{$js:Date.now()}}"
   *   user_agent: "Flow-Test-Engine/1.0"
   *   expires_at: "{{$js:Date.now() + 3600000}}"
   *   count: 42
   *   enabled: true
   * ```
   */
  compute?: Record<string, any>;

  /**
   * Capture data using JMESPath expressions from execution context
   *
   * @remarks
   * Extract and store values from the execution context using JMESPath queries.
   * Available context varies by hook point:
   * - `response`: Available in post_request and later hooks (body, headers, status_code)
   * - `variables`: Available in all hooks
   * - `call_result`: Available in post_call hooks
   * - `input`: Available in post_input and later hooks
   * - `capturedVariables`: Available in post_capture hooks
   * - `assertionResults`: Available in post_assertion hooks
   *
   * @example Capture from response
   * ```yaml
   * capture:
   *   user_id: "response.body.data.user.id"
   *   token: "response.body.token"
   *   status: "response.status_code"
   *   content_type: "response.headers.\"content-type\""
   * ```
   *
   * @example Capture from variables
   * ```yaml
   * capture:
   *   user_email: "variables.current_user.email"
   *   item_count: "variables.items | length(@)"
   * ```
   *
   * @example Capture from call result
   * ```yaml
   * capture:
   *   remote_user_id: "call_result.propagated_variables.user_id"
   *   call_status: "call_result.status"
   * ```
   */
  capture?: Record<string, string>;

  /**
   * Export variables to global scope
   *
   * @remarks
   * Array of variable names to export to the global variable registry.
   * Variables must exist in runtime context (from compute, capture, or previous steps).
   * Exported variables become available to all subsequent test suites.
   *
   * @example Export captured variables
   * ```yaml
   * capture:
   *   auth_token: "response.body.token"
   *   user_id: "response.body.user.id"
   * exports:
   *   - auth_token
   *   - user_id
   * ```
   *
   * @example Export computed variables
   * ```yaml
   * compute:
   *   session_id: "{{$js:crypto.randomUUID()}}"
   *   timestamp: "{{$js:Date.now()}}"
   * exports:
   *   - session_id
   * ```
   */
  exports?: string[];

  /**
   * Validate conditions
   *
   * @remarks
   * Array of validation rules to check. If any validation fails with
   * severity "error", execution will halt. Warnings are logged but
   * don't stop execution.
   *
   * @example
   * ```yaml
   * validate:
   *   - expression: "auth_token"
   *     message: "Auth token is required"
   *     severity: "error"
   *   - expression: "cart_total < 10000"
   *     message: "High value cart detected"
   *     severity: "warning"
   * ```
   */
  validate?: HookValidation[];

  /**
   * Custom logging
   *
   * @remarks
   * Emit structured log messages with metadata. Messages support
   * variable interpolation.
   */
  log?: HookLogConfig;

  /**
   * Emit metrics/telemetry
   *
   * @remarks
   * Track custom metrics for performance monitoring, business analytics,
   * or custom events. Metrics can be aggregated and visualized in reports.
   */
  metric?: HookMetricConfig;

  /**
   * Execute arbitrary JavaScript code
   *
   * @remarks
   * Allows execution of custom JavaScript logic. Use sparingly and
   * prefer other actions when possible for better maintainability.
   *
   * @example
   * ```yaml
   * script: |
   *   const hash = require('crypto').createHash('sha256');
   *   hash.update(response.body.token);
   *   return hash.digest('hex');
   * ```
   */
  script?: string;

  /**
   * Call another step or suite
   *
   * @remarks
   * Allows orchestration of complex flows by calling other test steps
   * or suites from within a hook.
   */
  call?: StepCallConfig;

  /**
   * Introduce a delay
   *
   * @remarks
   * Wait for specified milliseconds before continuing execution.
   * Useful for rate limiting or waiting for async operations.
   *
   * @example
   * ```yaml
   * wait: 1000  # Wait 1 second
   * ```
   */
  wait?: number;
}

/**
 * Collection of lifecycle hooks for a test step
 *
 * @remarks
 * Defines all available hook points in the test step execution lifecycle.
 * Hooks are executed in order at specific points during step execution.
 *
 * **Execution Order:**
 * 1. `pre_input` (if input present)
 * 2. Input collection
 * 3. `post_input` (if input present)
 * 4. `pre_iteration` (if iteration present, per iteration)
 * 5. `pre_request` (if request present)
 * 6. HTTP request execution
 * 7. `post_request` (if request present)
 * 8. `pre_assertion` (if assertions present)
 * 9. Assertion execution
 * 10. `post_assertion` (if assertions present)
 * 11. `pre_capture` (if capture present)
 * 12. Capture execution
 * 13. `post_capture` (if capture present)
 * 14. `post_iteration` (if iteration present, per iteration)
 *
 * @example Complete lifecycle hooks
 * ```typescript
 * const hooks: StepHooks = {
 *   pre_request: [
 *     {
 *       compute: { timestamp: "{{$js:Date.now()}}" },
 *       validate: [{ expression: "auth_token", message: "Token required" }]
 *     }
 *   ],
 *   post_request: [
 *     {
 *       compute: { response_time: "{{$js:Date.now() - timestamp}}" },
 *       metric: { name: "api_latency", value: "{{response_time}}" },
 *       log: { message: "Request completed in {{response_time}}ms" }
 *     }
 *   ]
 * };
 * ```
 *
 * @public
 */
export interface StepHooks {
  /**
   * Executed before input collection
   *
   * @remarks
   * Use for preparing default values, validating context before
   * requesting user input.
   */
  pre_input?: HookAction[];

  /**
   * Executed after input collection
   *
   * @remarks
   * Use for sanitizing, validating, or transforming user input
   * before it's used in subsequent steps.
   */
  post_input?: HookAction[];

  /**
   * Executed before each iteration (when using iterate)
   *
   * @remarks
   * Use for per-iteration setup, logging, or preparation.
   * Has access to iteration variables and index.
   */
  pre_iteration?: HookAction[];

  /**
   * Executed after each iteration (when using iterate)
   *
   * @remarks
   * Use for per-iteration cleanup, aggregation, or logging.
   * Has access to iteration results.
   */
  post_iteration?: HookAction[];

  /**
   * Executed before HTTP request
   *
   * @remarks
   * Use for computing request-specific variables, validating
   * prerequisites, preparing request data, or logging.
   */
  pre_request?: HookAction[];

  /**
   * Executed after HTTP request
   *
   * @remarks
   * Use for processing responses, extracting metadata,
   * emitting metrics, or conditional logging.
   * Has access to response object.
   */
  post_request?: HookAction[];

  /**
   * Executed before assertions
   *
   * @remarks
   * Use for preparing assertion data, logging expected
   * vs actual values, or conditional assertion setup.
   */
  pre_assertion?: HookAction[];

  /**
   * Executed after assertions
   *
   * @remarks
   * Use for processing assertion results, alerting on
   * failures, or aggregating validation metrics.
   */
  post_assertion?: HookAction[];

  /**
   * Executed before variable capture
   *
   * @remarks
   * Use for validating response structure before capture,
   * preparing capture context, or logging capture intent.
   */
  pre_capture?: HookAction[];

  /**
   * Executed after variable capture
   *
   * @remarks
   * Use for transforming captured values, validating
   * captured data, or logging captured variables.
   */
  post_capture?: HookAction[];
}

/**
 * Context available during hook execution
 *
 * @remarks
 * Provides access to step execution state, variables, and response data
 * during hook processing. Context is immutable from hook perspective.
 *
 * @public
 */
export interface HookExecutionContext {
  /**
   * Current step name
   */
  stepName: string;

  /**
   * Step index in suite
   */
  stepIndex: number;

  /**
   * Current iteration index (if in loop)
   */
  iterationIndex?: number;

  /**
   * All available variables at this point
   */
  variables: Record<string, any>;

  /**
   * Response data (available in post_request and later hooks)
   */
  response?: {
    status: number;
    status_code: number;
    headers: Record<string, string>;
    body: any;
    response_time_ms: number;
  };

  /**
   * Input data (available in post_input and later hooks)
   */
  input?: Record<string, any>;

  /**
   * Assertion results (available in post_assertion hook)
   */
  assertionResults?: any[];

  /**
   * Captured variables (available in post_capture hook)
   */
  capturedVariables?: Record<string, any>;

  /**
   * Call result data (available in post_call hooks)
   */
  call_result?: {
    success: boolean;
    status?: string;
    suite_name?: string;
    propagated_variables?: Record<string, any>;
    request_details?: any;
    response_details?: any;
    assertions_results?: any[];
    error?: string;
    [key: string]: any;
  };

  /**
   * Metadata for context tracking
   */
  metadata?: Record<string, any>;
}

/**
 * Result of hook execution
 *
 * @remarks
 * Contains computed variables, captured variables, validation results,
 * metrics, logs, and export information generated during hook execution.
 *
 * @public
 */
export interface HookExecutionResult {
  /**
   * Whether hook executed successfully
   */
  success: boolean;

  /**
   * Variables computed during hook execution (from compute action)
   */
  computedVariables: Record<string, any>;

  /**
   * Variables captured during hook execution (from capture action using JMESPath)
   */
  capturedVariables: Record<string, any>;

  /**
   * Names of variables that were exported to global scope
   */
  exportedVariables: string[];

  /**
   * Validation results
   */
  validations: {
    passed: boolean;
    failures: Array<{
      expression: string;
      message: string;
      severity: HookValidationSeverity;
    }>;
  };

  /**
   * Metrics emitted during hook execution
   */
  metrics: HookMetricConfig[];

  /**
   * Log entries generated
   */
  logs: Array<{
    level: HookLogLevel;
    message: string;
    metadata?: Record<string, any>;
    timestamp: number;
  }>;

  /**
   * Execution duration in milliseconds
   */
  duration_ms: number;

  /**
   * Error if hook execution failed
   */
  error?: string;
}
