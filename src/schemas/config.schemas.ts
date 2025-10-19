/**
 * @fileoverview Zod schemas for Flow Test Engine configuration types.
 *
 * @remarks
 * This module provides Zod schemas for engine configuration, execution options,
 * test discovery, and result reporting. These schemas enable runtime validation
 * of configuration files and execution parameters.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { FlowDependencySchema } from "./engine.schemas";
import { DynamicVariableAssignmentSchema } from "./common.schemas";

/**
 * Schema for report output formats.
 *
 * @remarks
 * Available formats:
 * - `json`: Machine-readable JSON format
 * - `html`: Rich HTML summary views
 * - `qa`: QA/tester-friendly JSON format
 *
 * @public
 */
export const ReportFormatSchema = z.enum(["json", "html", "qa"]);

/**
 * Schema for HTML report generation configuration.
 *
 * @example
 * ```typescript
 * import { HtmlReportingConfigSchema } from './schemas/config.schemas';
 *
 * const config = HtmlReportingConfigSchema.parse({
 *   per_suite: true,
 *   aggregate: true,
 *   output_subdir: "html"
 * });
 * ```
 *
 * @public
 */
export const HtmlReportingConfigSchema = z.object({
  /** Whether to generate an aggregate run summary HTML page */
  aggregate: z.boolean().optional().describe("Generate aggregate summary"),

  /** Whether to generate detailed HTML reports for each suite */
  per_suite: z.boolean().optional().describe("Generate per-suite reports"),

  /** Subdirectory where HTML files are stored */
  output_subdir: z.string().optional().describe("Output subdirectory"),
});

/**
 * Schema for report generation and output configuration.
 *
 * @example
 * ```typescript
 * import { ReportingConfigSchema } from './schemas/config.schemas';
 *
 * const config = ReportingConfigSchema.parse({
 *   formats: ["json"],
 *   output_dir: "./results",
 *   aggregate: true,
 *   include_performance_metrics: true,
 *   include_variables_state: false,
 *   html: {
 *     aggregate: true,
 *     per_suite: false
 *   }
 * });
 * ```
 *
 * @public
 */
export const ReportingConfigSchema = z.object({
  /** Whether reporting is enabled (defaults to true) */
  enabled: z.boolean().optional().describe("Reporting enabled"),

  /** Report output formats to generate */
  formats: z.array(ReportFormatSchema).describe("Output formats"),

  /** Directory where reports will be saved */
  output_dir: z.string().min(1).describe("Output directory"),

  /** Whether to generate aggregated reports across all suites */
  aggregate: z.boolean().describe("Aggregate reports"),

  /** Whether to include performance metrics in reports */
  include_performance_metrics: z
    .boolean()
    .optional()
    .describe("Include performance metrics"),

  /** Whether to include final variable state in reports */
  include_variables_state: z
    .boolean()
    .optional()
    .describe("Include variables state"),

  /** Additional configuration for HTML report generation */
  html: HtmlReportingConfigSchema.optional().describe("HTML config"),
});

/**
 * Schema for retry configuration for failed tests.
 *
 * @public
 */
export const RetryConfigSchema = z.object({
  /** Whether retry mechanism is enabled */
  enabled: z.boolean().describe("Retry enabled"),

  /** Maximum number of retry attempts */
  max_attempts: z.number().int().positive().describe("Max attempts"),

  /** Delay between retry attempts in milliseconds */
  delay_ms: z.number().nonnegative().describe("Delay in ms"),
});

/**
 * Schema for test execution configuration and behavior settings.
 *
 * @example
 * ```typescript
 * import { ExecutionConfigSchema } from './schemas/config.schemas';
 *
 * const config = ExecutionConfigSchema.parse({
 *   mode: "parallel",
 *   max_parallel: 5,
 *   timeout: 30000,
 *   continue_on_failure: true,
 *   retry_failed: {
 *     enabled: true,
 *     max_attempts: 3,
 *     delay_ms: 1000
 *   }
 * });
 * ```
 *
 * @public
 */
export const ExecutionConfigSchema = z.object({
  /** Execution mode: sequential or parallel */
  mode: z.enum(["sequential", "parallel"]).describe("Execution mode"),

  /** Maximum number of parallel executions when mode is parallel */
  max_parallel: z.number().int().positive().optional().describe("Max parallel"),

  /** Global timeout for test execution in milliseconds */
  timeout: z.number().positive().optional().describe("Global timeout"),

  /** Whether to continue executing remaining tests after a failure */
  continue_on_failure: z
    .boolean()
    .optional()
    .describe("Continue on failure"),

  /** Retry configuration for failed tests */
  retry_failed: RetryConfigSchema.optional().describe("Retry config"),
});

/**
 * Schema for priority system configuration.
 *
 * @example
 * ```typescript
 * import { PriorityConfigSchema } from './schemas/config.schemas';
 *
 * const config = PriorityConfigSchema.parse({
 *   levels: ["critical", "high", "medium", "low"],
 *   required: ["critical", "high"],
 *   fail_fast_on_required: true
 * });
 * ```
 *
 * @public
 */
export const PriorityConfigSchema = z.object({
  /** Available priority levels in execution order */
  levels: z.array(z.string()).min(1).describe("Priority levels"),

  /** Priority levels that must pass for overall success */
  required: z.array(z.string()).optional().describe("Required priorities"),

  /** Whether to stop execution immediately on required priority failure */
  fail_fast_on_required: z
    .boolean()
    .optional()
    .describe("Fail fast on required"),
});

/**
 * Schema for test discovery patterns and filtering.
 *
 * @example
 * ```typescript
 * import { DiscoveryConfigSchema } from './schemas/config.schemas';
 *
 * const config = DiscoveryConfigSchema.parse({
 *   patterns: ["** /*-test.yaml", "** /*-spec.yaml"],
 *   exclude: ["node_modules/** ", "dist/** "],
 *   recursive: true
 * });
 * ```
 *
 * @public
 */
export const DiscoveryConfigSchema = z.object({
  /** Glob patterns for discovering test files */
  patterns: z.array(z.string()).min(1).describe("Discovery patterns"),

  /** Glob patterns for excluding files from discovery */
  exclude: z.array(z.string()).optional().describe("Exclude patterns"),

  /** Whether to search directories recursively */
  recursive: z.boolean().optional().describe("Recursive search"),
});

/**
 * Schema for global settings including variables and timeouts.
 *
 * @example
 * ```typescript
 * import { GlobalConfigSchema } from './schemas/config.schemas';
 *
 * const config = GlobalConfigSchema.parse({
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
 * });
 * ```
 *
 * @public
 */
export const GlobalConfigSchema = z.object({
  /** Paths to .env files to load before test execution */
  env_files: z.array(z.string()).optional().describe("Environment files"),

  /** Global variables available to all test suites */
  variables: z.record(z.string(), z.any()).optional().describe("Global variables"),

  /** Timeout configurations for different test scenarios */
  timeouts: z
    .object({
      default: z.number().positive().optional(),
      slow_tests: z.number().positive().optional(),
    })
    .optional()
    .describe("Timeout configs"),

  /** Base URL prepended to relative request URLs */
  base_url: z.string().url().optional().describe("Base URL"),
});

/**
 * Schema for complete engine configuration.
 *
 * @example
 * ```typescript
 * import { EngineConfigSchema } from './schemas/config.schemas';
 *
 * const config = EngineConfigSchema.parse({
 *   project_name: "My API Tests",
 *   test_directory: "./tests",
 *   globals: {
 *     base_url: "https://api.example.com",
 *     variables: { api_key: "{{$env.API_KEY}}" }
 *   },
 *   execution: {
 *     mode: "parallel",
 *     max_parallel: 5
 *   },
 *   reporting: {
 *     formats: ["json", "html"],
 *     output_dir: "./results",
 *     aggregate: true
 *   }
 * });
 * ```
 *
 * @public
 */
export const EngineConfigSchema = z.object({
  /** The name of the project used in reports and logs */
  project_name: z.string().min(1).describe("Project name"),

  /** Directory containing test YAML files */
  test_directory: z.string().min(1).describe("Test directory"),

  /** Global configuration including variables and timeouts */
  globals: GlobalConfigSchema.optional().describe("Global config"),

  /** Test discovery patterns and exclusions */
  discovery: DiscoveryConfigSchema.optional().describe("Discovery config"),

  /** Priority system configuration */
  priorities: PriorityConfigSchema.optional().describe("Priority config"),

  /** Execution mode and behavior settings */
  execution: ExecutionConfigSchema.optional().describe("Execution config"),

  /** Report generation and output configuration */
  reporting: ReportingConfigSchema.optional().describe("Reporting config"),
});

/**
 * Schema for hierarchical variable context.
 *
 * @public
 */
export const GlobalVariableContextSchema = z.object({
  /** Variables from environment (process.env) */
  environment: z.record(z.string(), z.any()).describe("Environment variables"),

  /** Global variables defined in configuration */
  global: z.record(z.string(), z.any()).describe("Global variables"),

  /** Suite-level variables defined in test YAML */
  suite: z.record(z.string(), z.any()).describe("Suite variables"),

  /** Runtime variables captured during execution */
  runtime: z.record(z.string(), z.any()).describe("Runtime variables"),

  /** Variables imported from other test suites */
  imported: z.record(z.record(z.string(), z.any())).describe("Imported variables"),
});

/**
 * Schema for discovered test with metadata.
 *
 * @example
 * ```typescript
 * import { DiscoveredTestSchema } from './schemas/config.schemas';
 *
 * const test = DiscoveredTestSchema.parse({
 *   file_path: "./tests/auth-flow.yaml",
 *   node_id: "auth-flow",
 *   suite_name: "Authentication Flow Tests",
 *   priority: "critical",
 *   depends: [
 *     { node_id: "setup-user" }
 *   ],
 *   exports: ["auth_token", "user_data"],
 *   estimated_duration: 5000
 * });
 * ```
 *
 * @public
 */
export const DiscoveredTestSchema = z.object({
  /** Absolute path to the test YAML file */
  file_path: z.string().min(1).describe("File path"),

  /** Unique identifier for the test suite */
  node_id: z.string().min(1).describe("Node ID"),

  /** Human-readable name of the test suite */
  suite_name: z.string().min(1).describe("Suite name"),

  /** Priority level for execution ordering */
  priority: z.string().optional().describe("Priority"),

  /** Dependencies with execution types */
  depends: z.array(FlowDependencySchema).optional().describe("Dependencies"),

  /** Variable names exported by this suite */
  exports: z.array(z.string()).optional().describe("Exports"),

  /** Optional variable names to export */
  exports_optional: z.array(z.string()).optional().describe("Optional exports"),

  /** Estimated execution duration in milliseconds */
  estimated_duration: z.number().nonnegative().optional().describe("Duration"),
});

/**
 * Schema for assertion result.
 *
 * @public
 */
export const AssertionResultSchema = z.object({
  /** Field being asserted */
  field: z.string().describe("Field path"),

  /** Expected value */
  expected: z.any().describe("Expected value"),

  /** Actual value */
  actual: z.any().describe("Actual value"),

  /** Whether assertion passed */
  passed: z.boolean().describe("Passed"),

  /** Optional error message */
  message: z.string().optional().describe("Message"),
});

/**
 * Schema for scenario evaluation metadata.
 *
 * @public
 */
export const ScenarioEvaluationSchema = z.object({
  /** Scenario index */
  index: z.number().int().nonnegative().describe("Index"),

  /** Condition expression */
  condition: z.string().describe("Condition"),

  /** Whether condition matched */
  matched: z.boolean().describe("Matched"),

  /** Whether scenario was executed */
  executed: z.boolean().describe("Executed"),

  /** Which branch was taken */
  branch: z.enum(["then", "else", "none"]).describe("Branch"),

  /** Number of assertions added */
  assertions_added: z.number().int().nonnegative().optional().describe("Assertions added"),

  /** Number of captures added */
  captures_added: z.number().int().nonnegative().optional().describe("Captures added"),
});

/**
 * Schema for scenario execution metadata.
 *
 * @public
 */
export const ScenarioMetaSchema = z.object({
  /** Whether scenarios were present */
  has_scenarios: z.boolean().describe("Has scenarios"),

  /** Number of scenarios executed */
  executed_count: z.number().int().nonnegative().describe("Executed count"),

  /** Individual scenario evaluations */
  evaluations: z.array(ScenarioEvaluationSchema).describe("Evaluations"),
});

/**
 * Schema for step execution result.
 *
 * @public
 */
export const StepExecutionResultSchema = z.lazy(() =>
  z.object({
    /** Step identifier */
    step_id: z.string().optional().describe("Step ID"),

    /** Qualified step identifier */
    qualified_step_id: z.string().optional().describe("Qualified step ID"),

    /** Step name */
    step_name: z.string().describe("Step name"),

    /** Execution status */
    status: z.enum(["success", "failure", "skipped"]).describe("Status"),

    /** Duration in milliseconds */
    duration_ms: z.number().nonnegative().describe("Duration"),

    /** Request details */
    request_details: z
      .object({
        method: z.string(),
        url: z.string(),
        headers: z.record(z.string()).optional(),
        body: z.any().optional(),
        full_url: z.string().optional(),
        curl_command: z.string().optional(),
        raw_request: z.string().optional(),
        raw_url: z.string().optional(),
        base_url: z.string().optional(),
      })
      .optional()
      .describe("Request details"),

    /** Response details */
    response_details: z
      .object({
        status_code: z.number().int(),
        headers: z.record(z.string()),
        body: z.any(),
        size_bytes: z.number().nonnegative(),
        raw_response: z.string().optional(),
      })
      .optional()
      .describe("Response details"),

    /** Assertion results */
    assertions_results: z
      .array(AssertionResultSchema)
      .optional()
      .describe("Assertion results"),

    /** Captured variables */
    captured_variables: z.record(z.string(), z.any()).optional().describe("Captured variables"),

    /** Input results */
    input_results: z.array(z.any()).optional().describe("Input results"),

    /** Dynamic assignments */
    dynamic_assignments: z
      .array(DynamicVariableAssignmentSchema)
      .optional()
      .describe("Dynamic assignments"),

    /** Available variables */
    available_variables: z.record(z.string(), z.any()).optional().describe("Available variables"),

    /** Iteration results */
    iteration_results: z.array(z.any()).optional().describe("Iteration results"),

    /** Scenario metadata */
    scenarios_meta: ScenarioMetaSchema.optional().describe("Scenario metadata"),

    /** Error message */
    error_message: z.string().optional().describe("Error message"),
  })
);

/**
 * Schema for suite execution result.
 *
 * @public
 */
export const SuiteExecutionResultSchema = z.object({
  /** Node ID */
  node_id: z.string().describe("Node ID"),

  /** Suite name */
  suite_name: z.string().describe("Suite name"),

  /** File path */
  file_path: z.string().describe("File path"),

  /** Priority */
  priority: z.string().optional().describe("Priority"),

  /** Start time */
  start_time: z.string().datetime().describe("Start time"),

  /** End time */
  end_time: z.string().datetime().describe("End time"),

  /** Duration in milliseconds */
  duration_ms: z.number().nonnegative().describe("Duration"),

  /** Execution status */
  status: z.enum(["success", "failure", "skipped"]).describe("Status"),

  /** Steps executed */
  steps_executed: z.number().int().nonnegative().describe("Steps executed"),

  /** Steps successful */
  steps_successful: z.number().int().nonnegative().describe("Steps successful"),

  /** Steps failed */
  steps_failed: z.number().int().nonnegative().describe("Steps failed"),

  /** Success rate */
  success_rate: z.number().min(0).max(100).describe("Success rate"),

  /** Step results */
  steps_results: z.array(StepExecutionResultSchema).describe("Step results"),

  /** Error message */
  error_message: z.string().optional().describe("Error message"),

  /** Variables captured */
  variables_captured: z.record(z.string(), z.any()).describe("Captured variables"),

  /** Available variables */
  available_variables: z.record(z.string(), z.any()).optional().describe("Available variables"),

  /** Original YAML content */
  suite_yaml_content: z.string().optional().describe("Suite YAML"),
});

/**
 * Schema for performance summary.
 *
 * @public
 */
export const PerformanceSummarySchema = z.object({
  /** Total requests made */
  total_requests: z.number().int().nonnegative().describe("Total requests"),

  /** Average response time */
  average_response_time_ms: z.number().nonnegative().describe("Average response time"),

  /** Minimum response time */
  min_response_time_ms: z.number().nonnegative().describe("Min response time"),

  /** Maximum response time */
  max_response_time_ms: z.number().nonnegative().describe("Max response time"),

  /** Requests per second */
  requests_per_second: z.number().nonnegative().describe("Requests per second"),

  /** Slowest endpoints */
  slowest_endpoints: z
    .array(
      z.object({
        url: z.string(),
        average_time_ms: z.number().nonnegative(),
        call_count: z.number().int().nonnegative(),
      })
    )
    .describe("Slowest endpoints"),
});

/**
 * Schema for aggregated execution result.
 *
 * @public
 */
export const AggregatedResultSchema = z.object({
  /** Project name */
  project_name: z.string().describe("Project name"),

  /** Start time */
  start_time: z.string().datetime().describe("Start time"),

  /** End time */
  end_time: z.string().datetime().describe("End time"),

  /** Total duration */
  total_duration_ms: z.number().nonnegative().describe("Total duration"),

  /** Total tests */
  total_tests: z.number().int().nonnegative().describe("Total tests"),

  /** Successful tests */
  successful_tests: z.number().int().nonnegative().describe("Successful tests"),

  /** Failed tests */
  failed_tests: z.number().int().nonnegative().describe("Failed tests"),

  /** Skipped tests */
  skipped_tests: z.number().int().nonnegative().describe("Skipped tests"),

  /** Success rate */
  success_rate: z.number().min(0).max(100).describe("Success rate"),

  /** Suite results */
  suites_results: z.array(SuiteExecutionResultSchema).describe("Suite results"),

  /** Final global variables state */
  global_variables_final_state: z.record(z.string(), z.any()).describe("Global variables"),

  /** Performance summary */
  performance_summary: PerformanceSummarySchema.optional().describe("Performance summary"),
});

/**
 * Schema for execution filters.
 *
 * @public
 */
export const ExecutionFiltersSchema = z.object({
  /** Filter by priorities */
  priority: z.array(z.string()).optional().describe("Priorities"),

  /** Filter by node IDs */
  node_ids: z.array(z.string()).optional().describe("Node IDs"),

  /** Filter by suite names */
  suite_names: z.array(z.string()).optional().describe("Suite names"),

  /** Filter by tags */
  tags: z.array(z.string()).optional().describe("Tags"),

  /** Filter by file patterns */
  file_patterns: z.array(z.string()).optional().describe("File patterns"),

  /** Filter by step IDs */
  step_ids: z.array(z.string()).optional().describe("Step IDs"),
});

/**
 * Schema for engine execution options.
 *
 * @public
 */
export const EngineExecutionOptionsSchema = z.object({
  /** Config file path */
  config_file: z.string().optional().describe("Config file"),

  /** Test directory */
  test_directory: z.string().optional().describe("Test directory"),

  /** Environment */
  environment: z.string().optional().describe("Environment"),

  /** Verbosity level */
  verbosity: z
    .enum(["silent", "simple", "detailed", "verbose"])
    .optional()
    .describe("Verbosity"),

  /** Execution filters */
  filters: ExecutionFiltersSchema.optional().describe("Filters"),

  /** Logging configuration */
  logging: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional()
    .describe("Logging config"),

  /** Dry run mode */
  dry_run: z.boolean().optional().describe("Dry run"),

  /** Runtime reporting overrides */
  reporting: z
    .object({
      enabled: z.boolean().optional(),
      formats: z.array(ReportFormatSchema).optional(),
      html: HtmlReportingConfigSchema.optional(),
    })
    .optional()
    .describe("Reporting config"),

  /** Runner interactive mode */
  runner_interactive_mode: z.boolean().optional().describe("Interactive mode"),
});

/**
 * Type inference helpers for TypeScript compatibility
 */
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type HtmlReportingConfig = z.infer<typeof HtmlReportingConfigSchema>;
export type ReportingConfig = z.infer<typeof ReportingConfigSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type ExecutionConfig = z.infer<typeof ExecutionConfigSchema>;
export type PriorityConfig = z.infer<typeof PriorityConfigSchema>;
export type DiscoveryConfig = z.infer<typeof DiscoveryConfigSchema>;
export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;
export type EngineConfig = z.infer<typeof EngineConfigSchema>;
export type GlobalVariableContext = z.infer<typeof GlobalVariableContextSchema>;
export type DiscoveredTest = z.infer<typeof DiscoveredTestSchema>;
export type AssertionResult = z.infer<typeof AssertionResultSchema>;
export type ScenarioEvaluation = z.infer<typeof ScenarioEvaluationSchema>;
export type ScenarioMeta = z.infer<typeof ScenarioMetaSchema>;
export type StepExecutionResult = z.infer<typeof StepExecutionResultSchema>;
export type SuiteExecutionResult = z.infer<typeof SuiteExecutionResultSchema>;
export type PerformanceSummary = z.infer<typeof PerformanceSummarySchema>;
export type AggregatedResult = z.infer<typeof AggregatedResultSchema>;
export type ExecutionFilters = z.infer<typeof ExecutionFiltersSchema>;
export type EngineExecutionOptions = z.infer<typeof EngineExecutionOptionsSchema>;
