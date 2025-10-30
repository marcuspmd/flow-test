/**
 * @fileoverview Configuration types for the Flow Test Engine.
 *
 * @remarks
 * This module defines the configuration interfaces used throughout the Flow Test Engine.
 * It provides comprehensive type definitions for engine configuration, execution options,
 * test discovery, and result reporting.
 *
 * @packageDocumentation
 */

// Import types from engine.types to avoid circular import
import type { FlowDependency, InputResult } from "./engine.types";
import type { DynamicVariableAssignment } from "./common.types";

/**
 * Maximum depth allowed for nested steps within scenarios.
 *
 * @remarks
 * This constant limits how deeply scenarios can nest steps within their then/else blocks
 * to prevent infinite recursion and maintain code readability. The depth is configurable
 * via the global config `max_scenario_nesting_depth` property.
 *
 * @example Nested scenario structure
 * ```
 * Level 1: Step with scenario
 *   Level 2: scenario.then.steps[0] with scenario
 *     Level 3: scenario.then.steps[0] with scenario
 *       ... up to MAX_SCENARIO_NESTING_DEPTH
 * ```
 *
 * @public
 */
export const MAX_SCENARIO_NESTING_DEPTH = 5;

/**
 * Global configuration for the Flow Test Engine.
 *
 * @remarks
 * This interface defines the complete configuration structure for the Flow Test Engine,
 * including project settings, test discovery patterns, execution behavior, and reporting options.
 *
 * @example
 * ```typescript
 * const config: EngineConfig = {
 *   project_name: "My API Tests",
 *   test_directory: "./tests",
 *   globals: {
 *     base_url: "https://api.example.com",
 *     variables: { api_key: "{{$env.API_KEY}}" }
 *   },
 *   execution: {
 *     mode: "parallel",
 *     max_parallel: 5
 *   }
 * };
 * ```
 *
 * @public
 */
export interface EngineConfig {
  /** The name of the project used in reports and logs */
  project_name: string;

  /** Directory containing test YAML files */
  test_directory: string;

  /** Global configuration including variables and timeouts */
  globals?: GlobalConfig;

  /** Test discovery patterns and exclusions */
  discovery?: DiscoveryConfig;

  /** Priority system configuration */
  priorities?: PriorityConfig;

  /** Execution mode and behavior settings */
  execution?: ExecutionConfig;

  /** Report generation and output configuration */
  reporting?: ReportingConfig;
}

/**
 * Global settings including variables, timeouts, and base configuration.
 *
 * @remarks
 * Defines global settings that apply across all test suites, including
 * environment variables, timeout configurations, and base URLs for requests.
 * Supports loading environment variables from .env files.
 *
 * @example
 * ```typescript
 * const globals: GlobalConfig = {
 *   base_url: "https://api.example.com",
 *   env_files: [".env", ".env.local", ".env.test"],
 *   variables: {
 *     api_key: "{{$env.API_KEY}}",
 *     user_id: "12345"
 *   },
 *   timeouts: {
 *     default: 30000,
 *     slow_tests: 60000
 *   }
 * };
 * ```
 *
 * @public
 */
export interface GlobalConfig {
  /**
   * Paths to .env files to load before test execution.
   * Files are loaded in order, with later files overriding earlier ones.
   * Paths are relative to the project root.
   *
   * @example
   * ```yaml
   * globals:
   *   env_files:
   *     - .env
   *     - .env.local
   *     - .env.test
   * ```
   */
  env_files?: string[];

  /** Global variables available to all test suites */
  variables?: Record<string, any>;

  /** Timeout configurations for different test scenarios */
  timeouts?: {
    /** Default timeout for HTTP requests in milliseconds */
    default?: number;
    /** Extended timeout for slow tests in milliseconds */
    slow_tests?: number;
  };

  /** Base URL prepended to relative request URLs */
  base_url?: string;

  /**
   * Global SSL/TLS client certificates for HTTPS authentication (mTLS).
   * Certificates can be applied to all requests or filtered by domain patterns.
   *
   * @example
   * ```yaml
   * globals:
   *   certificates:
   *     - name: "Corporate API Certificate"
   *       cert_path: "./certs/client.crt"
   *       key_path: "./certs/client.key"
   *       passphrase: "{{$env.CERT_PASSWORD}}"
   *       domains: ["*.company.com"]
   * ```
   */
  certificates?: import("./certificate.types").CertificateEntry[];

  /**
   * INTERNAL FEATURE FLAG: Enable Strategy Pattern refactor for executeStep.
   *
   * @remarks
   * Controls whether the execution service uses the new Strategy Pattern architecture
   * for step execution. When true, steps are delegated to specialized strategy classes
   * (RequestStepStrategy, InputStepStrategy, etc.) instead of the monolithic executeStep method.
   *
   * **Status**: EXPERIMENTAL - In development (ADR-001)
   * **Default**: `false` (disabled)
   * **Environment override**: `FLOW_TEST_USE_STRATEGY_PATTERN=true`
   *
   * @internal
   * @experimental
   * @since 1.2.0
   *
   * @example Enable via config
   * ```yaml
   * globals:
   *   use_strategy_pattern: true
   * ```
   *
   * @example Enable via environment variable
   * ```bash
   * export FLOW_TEST_USE_STRATEGY_PATTERN=true
   * npm test
   * ```
   */
  use_strategy_pattern?: boolean;

  /**
   * Maximum depth for nested steps within scenarios.
   *
   * @remarks
   * Controls how deeply scenarios can nest steps within their then/else blocks.
   * Setting this too high may cause performance issues or stack overflow.
   * Setting it to 0 disables nested steps entirely.
   *
   * **Default**: 5 (from MAX_SCENARIO_NESTING_DEPTH)
   *
   * @example
   * ```yaml
   * globals:
   *   max_scenario_nesting_depth: 3
   * ```
   *
   * @public
   */
  max_scenario_nesting_depth?: number;
}

/**
 * Configuration for automatic test discovery and filtering.
 *
 * @remarks
 * Controls how the engine discovers test files in the filesystem,
 * including glob patterns for inclusion and exclusion, and recursion behavior.
 *
 * @example
 * ```typescript
 * const discovery: DiscoveryConfig = {
 *   patterns: ["**/ /*-test.yaml", "**/ /*-spec.yaml"],
 *   exclude: ["node_modules/**", "dist/**"],
 *   recursive: true
 * };
 * ```
 *
 * @public
 */
export interface DiscoveryConfig {
  /** Glob patterns for discovering test files */
  patterns: string[];

  /** Glob patterns for excluding files from discovery */
  exclude?: string[];

  /** Whether to search directories recursively */
  recursive?: boolean;
}

/**
 * Priority system configuration for test execution order and behavior.
 *
 * @remarks
 * Defines priority levels and execution rules, including which priorities
 * are required and whether to fail fast on required priority failures.
 *
 * @example
 * ```typescript
 * const priorities: PriorityConfig = {
 *   levels: ["critical", "high", "medium", "low"],
 *   required: ["critical", "high"],
 *   fail_fast_on_required: true
 * };
 * ```
 *
 * @public
 */
export interface PriorityConfig {
  /** Available priority levels in execution order */
  levels: string[];

  /** Priority levels that must pass for overall success */
  required?: string[];

  /** Whether to stop execution immediately on required priority failure */
  fail_fast_on_required?: boolean;
}

/**
 * Test execution configuration and behavior settings.
 *
 * @remarks
 * Controls how tests are executed, including parallel vs sequential execution,
 * timeout settings, failure handling, and retry mechanisms.
 *
 * @example
 * ```typescript
 * const execution: ExecutionConfig = {
 *   mode: "parallel",
 *   max_parallel: 5,
 *   timeout: 30000,
 *   continue_on_failure: true,
 *   retry_failed: {
 *     enabled: true,
 *     max_attempts: 3,
 *     delay_ms: 1000
 *   }
 * };
 * ```
 *
 * @public
 */
export interface ExecutionConfig {
  /** Execution mode: sequential or parallel */
  mode: "sequential" | "parallel";

  /** Maximum number of parallel executions when mode is parallel */
  max_parallel?: number;

  /** Global timeout for test execution in milliseconds */
  timeout?: number;

  /** Whether to continue executing remaining tests after a failure */
  continue_on_failure?: boolean;

  /** Retry configuration for failed tests */
  retry_failed?: {
    /** Whether retry mechanism is enabled */
    enabled: boolean;
    /** Maximum number of retry attempts */
    max_attempts: number;
    /** Delay between retry attempts in milliseconds */
    delay_ms: number;
  };
}

/**
 * Report generation and output configuration.
 *
 * @remarks
 * Defines how test results are reported, including output formats,
 * directory structure, and additional metrics to include.
 *
 * @example
 * ```typescript
 * const reporting: ReportingConfig = {
 *   formats: ["json"],
 *   output_dir: "./results",
 *   aggregate: true,
 *   include_performance_metrics: true,
 *   include_variables_state: false
 * };
 * ```
 *
 * @public
 */
export interface ReportingConfig {
  /** Whether reporting is enabled (defaults to true) */
  enabled?: boolean;

  /** Report output formats to generate */
  formats: ReportFormat[];

  /** Directory where reports will be saved */
  output_dir: string;

  /** Whether to generate aggregated reports across all suites */
  aggregate: boolean;

  /** Whether to include performance metrics in reports */
  include_performance_metrics?: boolean;

  /** Whether to include final variable state in reports */
  include_variables_state?: boolean;

  /** Additional configuration for HTML report generation */
  html?: HtmlReportingConfig;
}

/**
 * Available report output formats.
 *
 * @remarks
 * Defines the supported formats for test result reports:
 * - `json`: Machine-readable JSON format
 * - `html`: Rich HTML summary views generated directly by the engine
 * - `qa`: QA/tester-friendly JSON format designed for documentation and HTML/PDF generation
 *
 * Additional visualizations can still be produced through the standalone
 * report dashboard when more advanced dashboards are required.
 *
 * @public
 */
export type ReportFormat = "json" | "html" | "qa";

/**
 * Configuration for HTML report generation options.
 *
 * @remarks
 * Controls how HTML summaries are generated alongside JSON reports, including
 * whether to emit per-suite detail pages, aggregate summaries, and which
 * directory structure to use for the generated artifacts.
 *
 * @example
 * ```typescript
 * const config: HtmlReportingConfig = {
 *   per_suite: true,
 *   aggregate: true,
 *   output_subdir: "html"
 * };
 * ```
 *
 * @public
 */
export interface HtmlReportingConfig {
  /** Whether to generate an aggregate run summary HTML page */
  aggregate?: boolean;

  /** Whether to generate detailed HTML reports for each suite */
  per_suite?: boolean;

  /** Subdirectory (within the reporting output) where HTML files are stored */
  output_subdir?: string;
}

/**
 * Hierarchical variable context for test execution.
 *
 * @remarks
 * Provides a structured context for variables at different scopes during test execution.
 * Variables are resolved in order of precedence: runtime > suite > global > environment > imported.
 *
 * @example
 * ```typescript
 * const context: GlobalVariableContext = {
 *   environment: { API_KEY: "env-key-123" },
 *   global: { base_url: "https://api.example.com" },
 *   suite: { user_id: "12345" },
 *   runtime: { auth_token: "runtime-token-456" },
 *   imported: {
 *     "auth-suite": { session_id: "abc123" }
 *   }
 * };
 * ```
 *
 * @public
 */
export interface GlobalVariableContext {
  /** Variables from environment (process.env) */
  environment: Record<string, any>;

  /** Global variables defined in configuration */
  global: Record<string, any>;

  /** Suite-level variables defined in test YAML */
  suite: Record<string, any>;

  /** Runtime variables captured during execution */
  runtime: Record<string, any>;

  /** Variables imported from other test suites, keyed by node ID */
  imported: Record<string, Record<string, any>>;
}

/**
 * Discovered test with metadata and dependency information.
 *
 * @remarks
 * Represents a test suite discovered during the discovery phase, including
 * its location, dependencies, and execution metadata.
 *
 * @example
 * ```typescript
 * const test: DiscoveredTest = {
 *   file_path: "./tests/auth-flow.yaml",
 *   node_id: "auth-flow",
 *   suite_name: "Authentication Flow Tests",
 *   priority: "critical",
 *   depends: [
 *     { node_id: "setup-user", type: "sequential" }
 *   ],
 *   exports: ["auth_token", "user_data"],
 *   estimated_duration: 5000
 * };
 * ```
 *
 * @public
 */
export interface DiscoveredTest {
  /** Absolute path to the test YAML file */
  file_path: string;

  /** Unique identifier for the test suite */
  node_id: string;

  /** Human-readable name of the test suite */
  suite_name: string;

  /** Priority level for execution ordering */
  priority?: string;

  /** New dependency format with execution types */
  depends?: FlowDependency[];

  /** Variable names exported by this suite for use by other suites */
  exports?: string[];
  /** Optional variable names to export (no warnings if not found) */
  exports_optional?: string[];

  /** Estimated execution duration in milliseconds */
  estimated_duration?: number;
}

/**
 * Resultado agregado de execução
 */
export interface AggregatedResult {
  project_name: string;
  start_time: string;
  end_time: string;
  total_duration_ms: number;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  skipped_tests: number;
  success_rate: number;
  suites_results: SuiteExecutionResult[];
  global_variables_final_state: Record<string, any>;
  performance_summary?: PerformanceSummary;
}

/**
 * Resultado de execução de uma suíte individual
 */
export interface SuiteExecutionResult {
  node_id: string;
  suite_name: string;
  file_path: string;
  priority?: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: "success" | "failure" | "skipped";
  /** Total number of steps that were processed, including skipped ones */
  steps_executed: number;
  /** Number of steps that completed successfully */
  steps_successful: number;
  /** Number of steps that ended in failure */
  steps_failed: number;
  success_rate: number;
  steps_results: StepExecutionResult[];
  error_message?: string;
  variables_captured: Record<string, any>;
  available_variables?: Record<string, any>;
  /** Original YAML content of the test suite for frontend processing */
  suite_yaml_content?: string;
}

/**
 * Resultado de execução de um step individual
 */
export interface StepExecutionResult {
  /** Identifier assigned to the executed step */
  step_id?: string;
  /** Suite-scoped identifier combining node_id and the normalized step_id */
  qualified_step_id?: string;
  step_name: string;
  status: "success" | "failure" | "skipped";
  duration_ms: number;
  request_details?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    full_url?: string;
    curl_command?: string;
    raw_request?: string;
    raw_url?: string;
    base_url?: string;
  };
  response_details?: {
    status_code: number;
    headers: Record<string, string>;
    body: any;
    size_bytes: number;
    raw_response?: string;
    /** Detailed timing breakdown for performance analysis */
    timing?: {
      /** Time spent on DNS lookup in milliseconds */
      dns_lookup_ms?: number;
      /** Time spent establishing TCP connection in milliseconds */
      tcp_connection_ms?: number;
      /** Time spent on TLS handshake in milliseconds (HTTPS only) */
      tls_handshake_ms?: number;
      /** Time to first byte (TTFB) in milliseconds */
      time_to_first_byte_ms?: number;
      /** Time spent downloading response content in milliseconds */
      content_download_ms?: number;
      /** Total request time in milliseconds (may differ slightly from duration_ms due to framework overhead) */
      total_ms?: number;
      /** Timestamp when request started (ISO 8601) */
      started_at?: string;
      /** Timestamp when response completed (ISO 8601) */
      completed_at?: string;
    };
  };
  assertions_results?: AssertionResult[];
  captured_variables?: Record<string, any>;
  input_results?: InputResult[];
  dynamic_assignments?: DynamicVariableAssignment[];
  available_variables?: Record<string, any>;
  iteration_results?: StepExecutionResult[];
  scenarios_meta?: ScenarioMeta;
  error_message?: string;
}

/**
 * Resultado de uma assertion
 */
export interface AssertionResult {
  field: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

export interface ScenarioEvaluation {
  index: number;
  condition: string;
  matched: boolean;
  executed: boolean;
  branch: "then" | "else" | "none";
  assertions_added?: number;
  captures_added?: number;
}

export interface ScenarioMeta {
  has_scenarios: boolean;
  executed_count: number;
  evaluations: ScenarioEvaluation[];
}

/**
 * Resumo de performance
 */
export interface PerformanceSummary {
  total_requests: number;
  average_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  requests_per_second: number;
  slowest_endpoints: Array<{
    url: string;
    average_time_ms: number;
    call_count: number;
  }>;
}

/**
 * Opções de execução do engine
 */
export interface EngineExecutionOptions {
  config_file?: string;
  test_directory?: string;
  environment?: string;
  verbosity?: "silent" | "simple" | "detailed" | "verbose";
  filters?: {
    priority?: string[];
    node_ids?: string[];
    suite_names?: string[];
    tags?: string[];
    file_patterns?: string[];
    /**
     * Optional list of step identifiers to execute.
     *
     * @remarks
     * Accepts either raw step IDs defined in the YAML or fully-qualified values
     * in the form `node_id::step_id`. Identifiers are normalized by lower-casing
     * and replacing spaces with hyphens before matching.
     */
    step_ids?: string[];
  };
  logging?: {
    enabled?: boolean;
  };
  dry_run?: boolean;
  /** Runtime reporting overrides including output formats */
  reporting?: {
    enabled?: boolean;
    formats?: ReportFormat[];
    html?: HtmlReportingConfig;
  };
  /** Enable runner interactive mode for input prompts */
  runner_interactive_mode?: boolean;
}
