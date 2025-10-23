/**
 * Strict type definitions for enhanced type safety in Flow Test Engine
 *
 * This module provides strongly-typed interfaces and discriminated unions
 * to replace loose 'any' types throughout the codebase.
 */

import type { TestSuite, TestStep, Assertions } from "./engine.types";
import type { EngineConfig } from "./config.types";

/**
 * Parsed test suite with validated structure
 * Replaces generic 'any' type used in YAML parsing
 */
export interface ParsedTestSuite extends TestSuite {
  /** Source file path where this suite was loaded from */
  _source_file?: string;
  /** Timestamp when the suite was loaded */
  _loaded_at?: string;
  /** Parser version that validated this suite */
  _parser_version?: string;
}

/**
 * Result type for step execution - discriminated union
 */
export type StepExecutionResult =
  | StepExecutionSuccess
  | StepExecutionFailure
  | StepExecutionSkipped;

/**
 * Successful step execution result
 */
export interface StepExecutionSuccess {
  status: "success";
  step_name: string;
  duration_ms: number;
  request_details?: HTTPRequestDetails;
  response_details?: HTTPResponseDetails;
  captured_variables?: Record<string, unknown>;
  assertions_passed?: number;
  timestamp: string;
}

/**
 * Failed step execution result
 */
export interface StepExecutionFailure {
  status: "failure";
  step_name: string;
  duration_ms: number;
  error_message: string;
  error_code?: string;
  request_details?: HTTPRequestDetails;
  response_details?: HTTPResponseDetails;
  failed_assertions?: AssertionFailure[];
  timestamp: string;
  stack_trace?: string;
}

/**
 * Skipped step execution result
 */
export interface StepExecutionSkipped {
  status: "skipped";
  step_name: string;
  reason: string;
  timestamp: string;
}

/**
 * HTTP request details with proper typing
 */
export interface HTTPRequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

/**
 * HTTP response details with proper typing
 */
export interface HTTPResponseDetails {
  status_code: number;
  status_text: string;
  headers: Record<string, string>;
  body: unknown;
  response_time_ms: number;
  response_size_bytes: number;
}

/**
 * Assertion failure details
 */
export interface AssertionFailure {
  field_path: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  message: string;
}

/**
 * Variable scope hierarchy for resolution priority
 */
export enum VariableScope {
  STEP = "step",
  SUITE = "suite",
  GLOBAL = "global",
  ENVIRONMENT = "environment",
}

/**
 * Variable resolution context
 */
export interface VariableResolutionContext {
  step_variables?: Record<string, unknown>;
  suite_variables?: Record<string, unknown>;
  global_variables?: Record<string, unknown>;
  environment_variables?: Record<string, string>;
  /** Priority order for resolution */
  resolution_order: VariableScope[];
}

/**
 * Interpolation result - discriminated union
 */
export type InterpolationResult = InterpolationSuccess | InterpolationFailure;

/**
 * Successful interpolation
 */
export interface InterpolationSuccess {
  success: true;
  original: string;
  interpolated: unknown;
  variables_used: string[];
}

/**
 * Failed interpolation
 */
export interface InterpolationFailure {
  success: false;
  original: string;
  error_message: string;
  missing_variables?: string[];
}

/**
 * Test suite execution result
 */
export interface TestSuiteResult {
  suite_name: string;
  node_id: string;
  status: "success" | "failure" | "partial";
  total_steps: number;
  successful_steps: number;
  failed_steps: number;
  skipped_steps: number;
  duration_ms: number;
  steps_results: StepExecutionResult[];
  exported_variables: Record<string, unknown>;
  error_summary?: string;
  timestamp: string;
}

/**
 * Complete execution result aggregating all suites
 */
export interface ExecutionResult {
  success: boolean;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  skipped_tests: number;
  total_duration_ms: number;
  success_rate: number;
  suite_results: TestSuiteResult[];
  global_variables: Record<string, unknown>;
  execution_id: string;
  started_at: string;
  completed_at: string;
}

/**
 * CLI argument structure with strict typing
 */
export interface CLIArguments {
  /** Test files or directories to run */
  files: string[];
  /** Config file path */
  config?: string;
  /** Environment to use */
  environment?: string;
  /** Priority filter */
  priority?: string[];
  /** Tag filter */
  tags?: string[];
  /** Suite name filter */
  suites?: string[];
  /** Dry run mode */
  dryRun: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Silent mode */
  silent: boolean;
  /** Inline YAML content */
  inlineYaml?: string;
  /** Show help */
  showHelp: boolean;
  /** Show version */
  showVersion: boolean;
  /** Swagger import path */
  swaggerImport?: string;
  /** Swagger output directory */
  swaggerOutput?: string;
  /** Postman import path */
  postmanImport?: string;
  /** Postman import output directory */
  postmanImportOutput?: string;
  /** Postman export source file */
  postmanExport?: string;
  /** Postman output file */
  postmanOutput?: string;
  /** Export from results file */
  postmanExportFromResults?: string;
  /** Dashboard command */
  dashboardCommand?: "install" | "dev" | "build" | "preview" | "serve";
  /** Graph command */
  graphCommand?: "mermaid";
  /** Graph output file */
  graphOutput?: string;
  /** Graph direction */
  graphDirection?: "TD" | "LR" | "BT" | "RL";
  /** Hide orphan nodes in graph */
  graphNoOrphans?: boolean;
  /** Init command options */
  initCommand?: boolean;
  /** Init template */
  initTemplate?: string;
}

/**
 * Hook callback signatures with proper typing
 */
export interface TypedEngineHooks {
  onTestDiscovered?: (test: ParsedTestSuite) => void | Promise<void>;
  onSuiteStart?: (suite: ParsedTestSuite) => void | Promise<void>;
  onSuiteEnd?: (
    suite: ParsedTestSuite,
    result: TestSuiteResult
  ) => void | Promise<void>;
  onStepStart?: (
    step: TestStep,
    context: ExecutionContextTyped
  ) => void | Promise<void>;
  onStepEnd?: (
    step: TestStep,
    result: StepExecutionResult,
    context: ExecutionContextTyped
  ) => void | Promise<void>;
  onExecutionStart?: (stats: ExecutionStatsTyped) => void | Promise<void>;
  onExecutionEnd?: (result: ExecutionResult) => void | Promise<void>;
  onError?: (error: Error, context?: ErrorContext) => void | Promise<void>;
}

/**
 * Execution context with strict typing
 */
export interface ExecutionContextTyped {
  suite: ParsedTestSuite;
  global_variables: Record<string, unknown>;
  runtime_variables: Record<string, unknown>;
  step_index: number;
  total_steps: number;
  start_time: Date;
  execution_id: string;
}

/**
 * Execution stats with strict typing
 */
export interface ExecutionStatsTyped {
  tests_discovered: number;
  tests_completed: number;
  tests_successful: number;
  tests_failed: number;
  tests_skipped: number;
  current_test?: string;
  estimated_time_remaining_ms?: number;
  requests_made: number;
  total_response_time_ms: number;
}

/**
 * Error context for structured error handling
 */
export interface ErrorContext {
  suite_name?: string;
  suite_path?: string;
  step_name?: string;
  step_index?: number;
  execution_phase?: ExecutionPhase;
  additional_data?: Record<string, unknown>;
}

/**
 * Execution phase for tracking where errors occur
 */
export enum ExecutionPhase {
  DISCOVERY = "discovery",
  DEPENDENCY_RESOLUTION = "dependency_resolution",
  SUITE_EXECUTION = "suite_execution",
  STEP_EXECUTION = "step_execution",
  ASSERTION = "assertion",
  CAPTURE = "capture",
  REPORTING = "reporting",
}

/**
 * Dependency discovery result
 */
export interface DependencyDiscoveryResult {
  discovered_files: string[];
  processed_suites: ParsedTestSuite[];
  dependency_graph: Map<string, string[]>;
  execution_order: string[];
  errors: DependencyDiscoveryError[];
}

/**
 * Dependency discovery error
 */
export interface DependencyDiscoveryError {
  file_path: string;
  error_message: string;
  error_type:
    | "parse_error"
    | "validation_error"
    | "circular_dependency"
    | "missing_file";
}

/**
 * Type guard for step execution success
 */
export function isStepSuccess(
  result: StepExecutionResult
): result is StepExecutionSuccess {
  return result.status === "success";
}

/**
 * Type guard for step execution failure
 */
export function isStepFailure(
  result: StepExecutionResult
): result is StepExecutionFailure {
  return result.status === "failure";
}

/**
 * Type guard for step execution skipped
 */
export function isStepSkipped(
  result: StepExecutionResult
): result is StepExecutionSkipped {
  return result.status === "skipped";
}

/**
 * Type guard for interpolation success
 */
export function isInterpolationSuccess(
  result: InterpolationResult
): result is InterpolationSuccess {
  return result.success === true;
}

/**
 * Type guard for interpolation failure
 */
export function isInterpolationFailure(
  result: InterpolationResult
): result is InterpolationFailure {
  return result.success === false;
}

/**
 * Validation result for runtime checks
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field_path: string;
  message: string;
  expected_type?: string;
  actual_type?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field_path: string;
  message: string;
  suggestion?: string;
}
