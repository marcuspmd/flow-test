/**
 * @fileoverview Core type definitions for the Flow Test Engine.
 *
 * @remarks
 * This module contains the fundamental type definitions for the Flow Test Engine v1.0 architecture.
 * It provides comprehensive interfaces for test suites, steps, HTTP requests, assertions,
 * and execution results with support for advanced features like scenarios, iterations, and dependencies.
 *
 * @since 1.0.0
 * @packageDocumentation
 */

import {
  DynamicVariableAssignment,
  InputDynamicConfig,
  InputValidationConfig,
} from "./common.types";
import type { CertificateConfig } from "./certificate.types";
import type { StepCallConfig } from "./call.types";

/**
 * HTTP request details with comprehensive configuration options.
 *
 * @remarks
 * Enhanced version supporting all major HTTP methods including HEAD and OPTIONS
 * for advanced use cases, with configurable timeouts and parameter support.
 *
 * @example
 * ```typescript
 * const request: RequestDetails = {
 *   method: "POST",
 *   url: "/api/users",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": "Bearer {{auth_token}}"
 *   },
 *   body: {
 *     name: "John Doe",
 *     email: "john@example.com"
 *   },
 *   timeout: 30000
 * };
 * ```
 *
 * @public
 */
export interface RequestDetails {
  /** HTTP method for the request */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

  /** URL path, can be absolute or relative to base_url */
  url: string;

  /** HTTP headers to include with the request */
  headers?: Record<string, string>;

  /** Request body payload for POST/PUT/PATCH methods */
  body?: any;

  /** Query string parameters */
  params?: Record<string, any>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** SSL/TLS client certificate configuration for HTTPS requests (mTLS) */
  certificate?: import("./certificate.types").CertificateConfig;
}

/**
 * Advanced validation rules for response field checking.
 *
 * @remarks
 * Comprehensive assertion checks supporting type validation, existence checks,
 * pattern matching, numerical comparisons, and length validations for arrays and strings.
 *
 * @example Basic field validation
 * ```typescript
 * const userIdCheck: AssertionChecks = {
 *   type: "number",
 *   greater_than: 0,
 *   exists: true
 * };
 * ```
 *
 * @example Email validation with regex
 * ```typescript
 * const emailCheck: AssertionChecks = {
 *   type: "string",
 *   regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
 *   exists: true
 * };
 * ```
 *
 * @example Array length validation
 * ```typescript
 * const itemsCheck: AssertionChecks = {
 *   type: "array",
 *   length: {
 *     greater_than: 0,
 *     less_than: 100
 *   }
 * };
 * ```
 *
 * @public
 */
export interface AssertionChecks {
  /** Exact value equality check */
  equals?: any;

  /** Check if field contains the specified value */
  contains?: any;

  /** Check if field does not equal the specified value */
  not_equals?: any;

  /** Numerical greater than comparison */
  greater_than?: number;

  /** Numerical less than comparison */
  less_than?: number;

  /** Regular expression pattern matching */
  regex?: string;

  /** Check if field exists in the response */
  exists?: boolean;

  /** Type validation */
  type?: "string" | "number" | "boolean" | "object" | "array";

  /** Length validation for arrays and strings */
  length?: {
    /** Exact length match */
    equals?: number;
    /** Minimum length */
    greater_than?: number;
    /** Maximum length */
    less_than?: number;
  };

  /** Regular expression pattern matching (alias for regex) */
  pattern?: string;

  /** Minimum length validation for strings and arrays */
  minLength?: number;

  /** Check if field is not empty (null, undefined, empty string, empty array, or empty object) */
  notEmpty?: boolean;
}

/**
 * Comprehensive assertion configuration for HTTP response validation.
 *
 * @remarks
 * Defines all possible validations that can be applied to an HTTP response,
 * including status code checks, body field validation, header verification,
 * response time constraints, and custom assertion scripts.
 *
  call?: StepCallConfig;
 * ```yaml
 * assert:
 *   status_code: 200
 *   body:
 *     success:
 *       equals: true
 *     data:
 *       type: object
 *       exists: true
 *     user:
 *       id:
 *         type: number
 *         greater_than: 0
 *       email:
 *         regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
 *   headers:
 *     content-type:
 *       contains: "application/json"
 *   response_time_ms:
 *     less_than: 2000
 *     greater_than: 10
 *   custom:
 *     - name: "Valid user ID format"
 *       condition: "body.user.id && typeof body.user.id === 'number'"
 *       message: "User ID must be a number"
 * ```
 *
 * @public
 */
export interface Assertions {
  /** Expected HTTP status code or status code validation rules */
  status_code?: number | AssertionChecks;

  /** Body field validations using nested assertion checks */
  body?: Record<string, AssertionChecks>;

  /** HTTP header validations */
  headers?: Record<string, AssertionChecks>;

  /** Response time performance constraints */
  response_time_ms?: {
    /** Maximum acceptable response time in milliseconds */
    less_than?: number;
    /** Minimum expected response time in milliseconds */
    greater_than?: number;
  };
  /** Custom assertion scripts for advanced validation */
  custom?: Array<{
    /** Name of the custom assertion */
    name: string;
    /** JMESPath expression or JavaScript condition to evaluate */
    condition: string;
    /** Optional error message when assertion fails */
    message?: string;
  }>;
}

/**
 * Conditional scenario configuration for dynamic test behavior.
 *
 * @remarks
 * Enables conditional execution of assertions, captures, and variable assignments
 * based on JMESPath expressions evaluated against the response data.
 * Supports both positive (`then`) and negative (`else`) conditions.
 *
 * @example Role-based conditional testing
 * ```typescript
 * const scenario: ConditionalScenario = {
 *   name: "Admin vs User permissions",
 *   condition: "body.user.role == 'admin'",
 *   then: {
 *     assert: {
 *       status_code: 200,
 *       body: { permissions: { contains: "admin_access" } }
 *     },
 *     capture: { admin_id: "body.user.id" }
 *   },
 *   else: {
 *     assert: { status_code: 403 },
 *     variables: { is_admin: false }
 *   }
 * };
 * ```
 *
 * @public
 */
export interface ConditionalScenario {
  /** Optional descriptive name for the scenario */
  name?: string;

  /** JMESPath expression to evaluate the condition against response data */
  condition: string;

  /** Actions to execute when condition evaluates to true */
  then?: {
    /** Additional assertions to perform */
    assert?: Assertions;
    /** Variables to capture from the response */
    capture?: Record<string, string>;
    /** Static variables to set */
    variables?: Record<string, any>;
  };

  /** Actions to execute when condition evaluates to false */
  else?: {
    /** Additional assertions to perform */
    assert?: Assertions;
    /** Variables to capture from the response */
    capture?: Record<string, string>;
    /** Static variables to set */
    variables?: Record<string, any>;
  };
}

/**
 * Configuration for iterating over arrays in test steps.
 *
 * @remarks
 * Enables data-driven testing by executing a test step multiple times,
 * once for each item in the specified array. The current item is available
 * as a variable within each iteration.
 *
 * @example Testing multiple user scenarios
 * ```yaml
 * iterate:
 *   over: "{{test_users}}"
 *   as: "current_user"
 * request:
 *   url: "/users/{{current_user.id}}"
 * ```
 *
 * @public
 */
export interface ArrayIterationConfig {
  /** JMESPath expression or variable name pointing to the array to iterate over */
  over: string;

  /** Variable name to use for the current item in each iteration */
  as: string;
}

/**
 * Configuration for iterating over numeric ranges in test steps.
 *
 * @remarks
 * Enables repeated execution of test steps across a numeric range,
 * useful for pagination testing, batch operations, or stress testing.
 *
 * @example Testing pagination across multiple pages
 * ```yaml
 * iterate:
 *   range: "1..10"
 *   as: "page_number"
 * request:
 *   url: "/api/items?page={{page_number}}"
 * ```
 *
 * @public
 */
export interface RangeIterationConfig {
  /** Range specification in format "start..end" (inclusive) */
  range: string;

  /** Variable name to use for the current index in each iteration */
  as: string;
}

/**
 * Unified iteration configuration supporting both array and range iteration.
 *
 * @remarks
 * Use array iteration for data-driven testing with predefined datasets,
 * or range iteration for numeric sequence testing like pagination or batch processing.
 *
 * @public
 */
export type IterationConfig = ArrayIterationConfig | RangeIterationConfig;

/**
 * Interactive input configuration for user prompts during test execution.
 *
 * @remarks
 * Enables test flows to pause execution and request user input, making tests interactive
 * and dynamic. Input steps can only be used in sequential execution mode as they block
 * execution until user provides input.
 *
 * **Key Features:**
 * - **Multiple Input Types**: text, password, number, email, select, confirm, etc.
 * - **Dynamic Prompts**: Use response data and variables in prompts
 * - **Validation**: Built-in and custom validation rules
 * - **Conditional Execution**: Only show input when conditions are met
 * - **Timeout Support**: Automatic fallback after timeout
 * - **Styling Options**: Different visual presentations
 *
 * @example Basic text input
 * ```typescript
 * const input: InputConfig = {
 *   prompt: "Enter your API key:",
 *   variable: "api_key",
 *   type: "password",
 *   required: true,
 *   validation: {
 *     min_length: 20,
 *     pattern: "^sk-[a-zA-Z0-9]+"
 *   }
 * };
 * ```
 *
 * @example Select with dynamic options from response
 * ```typescript
 * const input: InputConfig = {
 *   prompt: "Found {{users | length(@)}} users. Select one:",
 *   variable: "selected_user_id",
 *   type: "select",
 *   options: "{{users[*].{value: id, label: name}}}",
 *   description: "User will be used for subsequent API calls"
 * };
 * ```
 *
 * @public
 */
export interface InputConfig {
  /** The prompt message displayed to the user */
  prompt: string;
  /** Variable name to store the input value */
  variable: string;
  /** Type of input control to display */
  type:
    | "text"
    | "password"
    | "number"
    | "email"
    | "url"
    | "select"
    | "confirm"
    | "multiline";
  /** Optional detailed description */
  description?: string;
  /** Default value if user doesn't provide input */
  default?: any;
  /** Placeholder text shown in input field */
  placeholder?: string;
  /** Whether input is required (cannot be empty) */
  required?: boolean;
  /** Visual style for the prompt */
  style?: "simple" | "boxed" | "highlighted";
  /** Timeout in seconds before using default value */
  timeout_seconds?: number;
  /** JMESPath condition - input only shown if condition is true */
  condition?: string;
  /** Value to use automatically in CI/non-interactive environments */
  ci_default?: any;
  /** Validation rules for the input */
  validation?: InputValidationConfig;
  /** Dynamic processing configuration for derived variables */
  dynamic?: InputDynamicConfig;
  /** For select type: array of options or JMESPath expression */
  options?: Array<{ value: any; label: string }> | string;
}

/**
 * Input execution result containing the captured value and metadata.
 *
 * @remarks
 * Contains the result of an interactive input operation, including the value
 * provided by the user, timing information, and any validation results.
 *
 * @example Input result
 * ```typescript
 * const result: InputResult = {
 *   variable: "api_key",
 *   value: "sk-abc123def456",
 *   input_time_ms: 15000,
 *   validation_passed: true,
 *   used_default: false,
 *   timed_out: false
 * };
 * ```
 *
 * @public
 */
export interface InputResult {
  /** Variable name that was set */
  variable: string;
  /** The value provided by user or default */
  value: any;
  /** Time taken for user to provide input in milliseconds */
  input_time_ms: number;
  /** Whether validation passed */
  validation_passed: boolean;
  /** Whether default value was used */
  used_default: boolean;
  /** Whether input timed out */
  timed_out: boolean;
  /** Validation error message if validation failed */
  validation_error?: string;
  /** Dynamic variable assignments derived from this input */
  derived_assignments?: DynamicVariableAssignment[];
  /** Non-blocking validation warnings */
  validation_warnings?: string[];
}

/**
 * Context information for interactive input in runner mode
 */
export interface InputExecutionContext {
  /** Suite name */
  suite_name?: string;
  /** Suite file path */
  suite_path?: string;
  /** Step name */
  step_name?: string;
  /** Step ID */
  step_id?: string;
  /** Step index */
  step_index?: number;
  /** Cache key for input caching */
  cache_key?: string;
}

/**
 * Interactive input request for runner mode
 */
export interface InteractiveInputRequest {
  /** Variable name to capture */
  variable: string;
  /** Prompt text */
  prompt: string;
  /** Whether input is required */
  required: boolean;
  /** Whether to mask input */
  masked: boolean;
  /** Input type */
  input_type:
    | "text"
    | "password"
    | "number"
    | "confirm"
    | "select"
    | "email"
    | "url"
    | "multiline";
  /** Default value */
  default?: any;
  /** Options for select type */
  options?: Array<{ label: string; value: any }>;
  /** Execution context */
  suite_name?: string;
  suite_path?: string;
  step_name?: string;
  step_id?: string;
  step_index?: number;
  cache_key?: string;
}

/**
 * Event emitted to runner for interactive input
 */
export interface RunnerInputEvent {
  type: "request" | "info";
  request?: InteractiveInputRequest;
  message?: string;
}

/**
 * Runtime context for a single iteration execution.
 *
 * @remarks
 * Provides metadata and state information during iteration execution,
 * including the current index, value, and position within the iteration sequence.
 *
 * @example Iteration context usage
 * ```typescript
 * const context: IterationContext = {
 *   index: 2,
 *   value: { name: "Alice", id: 123 },
 *   variableName: "current_user",
 *   isFirst: false,
 *   isLast: false
 * };
 * ```
 *
 * @public
 */
export interface IterationContext {
  /** Current iteration index (0-based) */
  index: number;

  /** Current item (for array iteration) or current value (for range iteration) */
  value: any;

  /** Variable name to bind the current value to */
  variableName: string;

  /** Whether this is the first iteration */
  isFirst: boolean;

  /** Whether this is the last iteration */
  isLast: boolean;
}

/**
 * Metadata configuration for test step execution and behavior.
 *
 * @remarks
 * Provides fine-grained control over test step execution including
 * priority levels, tagging for organization, timeout configurations,
 * retry mechanisms, and dependency management.
 *
 * @example Comprehensive step metadata
 * ```typescript
 * const metadata: TestStepMetadata = {
 *   priority: "critical",
 *   tags: ["auth", "security", "smoke"],
 *   timeout: 10000,
 *   retry: {
 *     max_attempts: 3,
 *     delay_ms: 1000
 *   },
 *   depends_on: ["setup_auth_token"],
 *   description: "Validates authentication token and user permissions"
 * };
 * ```
 *
 * @public
 */
export interface TestStepMetadata {
  /** Execution priority level (critical, high, medium, low) */
  priority?: string;

  /** Tags for categorization, filtering, and organization */
  tags?: string[];

  /** Maximum execution time in milliseconds before timeout */
  timeout?: number;

  /** Retry configuration for handling transient failures */
  retry?: {
    /** Maximum number of retry attempts */
    max_attempts: number;
    /** Delay between retry attempts in milliseconds */
    delay_ms: number;
  };

  /** Names of steps that must complete successfully before this step executes */
  depends_on?: string[];

  /** Human-readable description of what this step accomplishes */
  description?: string;
}

/**
 * Complete test step definition with comprehensive configuration options.
 *
 * @remarks
 * Represents a single test step within a test suite, containing the HTTP request
 * specification, response validation rules, data extraction patterns, conditional
 * scenarios, iteration configuration, and execution metadata.
 *
 * @example Complete test step with all features
 * ```typescript
 * const step: TestStep = {
 *   name: "Create new user account",
 *   request: {
 *     method: "POST",
 *     url: "/api/users",
 *     headers: {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer {{auth_token}}"
 *     },
 *     body: {
 *       username: "{{test_username}}",
 *       email: "{{test_email}}",
 *       role: "user"
 *     },
 *     timeout: 30000
 *   },
 *   assert: {
 *     status_code: 201,
 *     body: {
 *       "id": { exists: true, type: "number" },
 *       "username": { equals: "{{test_username}}" },
 *       "email": { regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
 *     },
 *     response_time_ms: { less_than: 2000 }
 *   },
 *   capture: {
 *     user_id: "body.id",
 *     created_at: "body.created_at",
 *     user_email: "body.email"
 *   },
 *   scenarios: [{
 *     name: "Check if admin user",
 *     condition: "body.role == 'admin'",
 *     then: {
 *       capture: { admin_permissions: "body.permissions" }
 *     }
 *   }],
 *   continue_on_failure: false,
 *   metadata: {
 *     priority: "high",
 *     tags: ["user-management", "regression"],
 *     timeout: 10000,
 *     description: "Creates a new user account and validates the response"
 *   }
 * };
 * ```
 *
 * @public
 */
export interface TestStep {
  /** Descriptive name identifying the purpose of this test step */
  name: string;

  /** Optional unique identifier used for targeted execution */
  step_id?: string;

  /** HTTP request configuration including method, URL, headers, and body (optional if step only contains inputs) */
  request?: RequestDetails;

  /** Response validation rules and assertions */
  assert?: Assertions;

  /** Chamada de step externo cross-suite */
  call?: import("./call.types").StepCallConfig;

  /** Data extraction patterns using JMESPath expressions */
  capture?: Record<string, string>;

  /** Conditional scenarios for dynamic test behavior based on response data */
  scenarios?: ConditionalScenario[];

  /** Iteration configuration for data-driven testing */
  iterate?: IterationConfig;

  /** Interactive input configuration - can be single input or array of inputs */
  input?: InputConfig | InputConfig[];

  /** Whether to continue test suite execution if this step fails */
  continue_on_failure?: boolean;

  /** Additional metadata for execution control and organization */
  metadata?: TestStepMetadata;
}

/**
 * Flow dependency configuration
 *
 * @example Relative path (default)
 * ```typescript
 * const dependency: FlowDependency = {
 *   path: "./auth/setup-auth.yaml",
 *   required: true,
 *   cache: 300, // 5 minutes TTL
 *   condition: "environment == 'test'",
 *   variables: {
 *     test_mode: true
 *   },
 *   retry: {
 *     max_attempts: 2,
 *     delay_ms: 1000
 *   }
 * };
 * ```
 *
 * @example Absolute path from test directory
 * ```typescript
 * const dependency: FlowDependency = {
 *   path: "common/auth/setup-auth.yaml",
 *   path_type: "absolute",  // resolve from test_directory
 *   required: true
 * };
 * ```
 */
export interface FlowDependency {
  /** Path to the dependency flow or node_id for direct reference */
  path?: string;
  /**
   * Path resolution strategy
   * - "relative": Path is relative to the current file (default)
   * - "absolute": Path is relative to test_directory root
   */
  path_type?: "relative" | "absolute";
  /** Node ID for direct reference to another test suite */
  node_id?: string;
  /** Whether this dependency is required for execution */
  required?: boolean;
  /** Cache configuration: true, false, or TTL in seconds */
  cache?: boolean | number;
  /** JMESPath condition for conditional execution */
  condition?: string;
  /** Variables to override in the dependency */
  variables?: Record<string, any>;
  /** Retry configuration for failed dependencies */
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
}

/**
 * Result of dependency execution
 *
 * @example
 * ```typescript
 * const result: DependencyResult = {
 *   flowPath: "./auth/setup-auth.yaml",
 *   suiteName: "Authentication Setup",
 *   success: true,
 *   executionTime: 1250,
 *   exportedVariables: {
 *     auth_token: "abc123",
 *     user_id: "user_456"
 *   },
 *   cached: false
 * };
 * ```
 */
export interface DependencyResult {
  /** Path to the executed dependency flow */
  flowPath: string;
  /** Node ID of the executed dependency */
  nodeId: string;
  /** Name of the executed suite */
  suiteName: string;
  /** Whether the dependency executed successfully */
  success: boolean;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Variables exported by the dependency */
  exportedVariables: Record<string, any>;
  /** Whether the result was retrieved from cache */
  cached: boolean;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Reusable flow definition
 *
 * @example
 * ```typescript
 * const reusableFlow: ReusableFlow = {
 *   flow_name: "User Registration Flow",
 *   description: "Complete user registration with validation",
 *   variables: {
 *     base_url: "https://api.example.com",
 *     test_email: "test@example.com"
 *   },
 *   steps: [
 *     {
 *       name: "Create user account",
 *       request: {
 *         method: "POST",
 *         url: "/users",
 *         body: { email: "{{test_email}}" }
 *       }
 *     }
 *   ]
 * };
 * ```
 */
export interface ReusableFlow {
  /** Name of the reusable flow */
  flow_name: string;
  /** Description of what this flow does */
  description?: string;
  /** Default variables for the flow */
  variables?: Record<string, any>;
  /** Test steps that comprise the flow */
  steps: TestStep[];
  /** Variables to export to global scope after execution */
  exports?: string[];
  /** Optional variables to export (no warnings if not found) */
  exports_optional?: string[];
  /** Flow dependencies that must be executed first */
  depends?: FlowDependency[];
  /** Additional metadata for flow execution */
  metadata?: {
    priority?: string;
    tags?: string[];
    estimated_duration_ms?: number;
  };
}

/**
 * Complete test suite definition with extended metadata
 *
 * @example
 * ```typescript
 * const testSuite: TestSuite = {
 *   node_id: "user-mgmt-e2e",
 *   suite_name: "E2E User Management Tests",
 *   description: "Complete end-to-end testing of user management features",
 *   base_url: "https://api.example.com",
 *   // Flow dependencies replaced by 'depends' field
 *   variables: {
 *     test_user_email: "test@example.com",
 *     api_version: "v1"
 *   },
 *   steps: [
 *     {
 *       name: "Create user",
 *       request: {
 *         method: "POST",
 *         url: "/users",
 *         body: { email: "{{test_user_email}}" }
 *       }
 *     }
 *   ],
 *   exports: ["created_user_id", "auth_token"],
 *   depends: [
 *     {
 *       node_id: "database_setup",
 *       required: true
 *     }
 *   ],
 *   metadata: {
 *     priority: "high",
 *     tags: ["e2e", "user-management", "regression"],
 *     timeout: 30000,
 *     estimated_duration_ms: 15000
 *   }
 * };
 * ```
 */
export interface TestSuite {
  /** Unique node identifier for this test suite */
  node_id: string;
  /** Name of the test suite */
  suite_name: string;
  /** Description of what this suite tests */
  description?: string;
  /** Base URL for all requests in this suite */
  base_url?: string;
  /** Variables available to all steps */
  variables?: Record<string, any>;
  /** Test steps to execute */
  steps: TestStep[];
  /** Variables to export to global scope */
  exports?: string[];
  /** Optional variables to export (no warnings if not found) */
  exports_optional?: string[];
  /** Dependencies that must be satisfied before execution */
  depends?: FlowDependency[];
  /** Extended metadata for suite configuration */
  metadata?: {
    priority?: string;
    tags?: string[];
    timeout?: number;
    estimated_duration_ms?: number;
  };
  /** Certificate configuration for all requests in this suite */
  certificate?: CertificateConfig;
}

/**
 * Execution context for a running test
 *
 * Contains all runtime information and state for the currently executing test,
 * including suite definition, variable scopes, and execution metadata.
 *
 * @example
 * ```typescript
 * const context: ExecutionContext = {
 *   suite: {
 *     suite_name: "User API Tests",
 *     steps: [...]
 *   },
 *   global_variables: {
 *     api_base_url: "https://api.example.com",
 *     auth_token: "abc123"
 *   },
 *   runtime_variables: {
 *     user_id: "user_456",
 *     test_timestamp: "2024-01-01T12:00:00Z"
 *   },
 *   step_index: 2,
 *   total_steps: 5,
 *   start_time: new Date("2024-01-01T12:00:00Z"),
 *   execution_id: "exec_789"
 * };
 * ```
 */
export interface ExecutionContext {
  /** The test suite being executed */
  suite: TestSuite;
  /** Variables shared across all tests */
  global_variables: Record<string, any>;
  /** Variables specific to current execution */
  runtime_variables: Record<string, any>;
  /** Current step index (0-based) */
  step_index: number;
  /** Total number of steps in suite */
  total_steps: number;
  /** When execution started */
  start_time: Date;
  /** Unique identifier for this execution */
  execution_id: string;
}

/**
 * Real-time execution statistics and metrics
 *
 * Provides comprehensive metrics about the current execution state,
 * including counts, timing, and performance data.
 *
 * @example
 * ```typescript
 * const stats: ExecutionStats = {
 *   tests_discovered: 15,
 *   tests_completed: 10,
 *   tests_successful: 8,
 *   tests_failed: 2,
 *   tests_skipped: 0,
 *   current_test: "User Authentication Tests",
 *   estimated_time_remaining_ms: 45000,
 *   requests_made: 127,
 *   total_response_time_ms: 12500
 * };
 * ```
 */
export interface ExecutionStats {
  /** Total number of test suites discovered */
  tests_discovered: number;
  /** Number of test suites completed */
  tests_completed: number;
  /** Number of test suites that passed */
  tests_successful: number;
  /** Number of test suites that failed */
  tests_failed: number;
  /** Number of test suites that were skipped */
  tests_skipped: number;
  /** Name of currently executing test */
  current_test?: string;
  /** Estimated time remaining in milliseconds */
  estimated_time_remaining_ms?: number;
  /** Total HTTP requests made */
  requests_made: number;
  /** Cumulative response time across all requests */
  total_response_time_ms: number;
}

/**
 * Engine lifecycle hooks for monitoring and extending test execution
 *
 * Provides callback functions that are triggered at different stages of test execution,
 * allowing for custom logging, monitoring, reporting, and integration with external systems.
 * All hooks are optional and can be async functions.
 *
 * @example
 * ```typescript
 * const hooks: EngineHooks = {
 *   onTestDiscovered: async (test) => {
 *     console.log(`📋 Discovered: ${test.suite_name}`);
 *     await analyticsTracker.trackTestDiscovered(test);
 *   },
 *
 *   onSuiteStart: async (suite) => {
 *     console.log(`🚀 Starting suite: ${suite.suite_name}`);
 *     await notificationService.notifySuiteStart(suite);
 *   },
 *
 *   onStepStart: async (step, context) => {
 *     console.log(`▶️ Step: ${step.name}`);
 *     await monitoring.startStepTimer(step.name);
 *   },
 *
 *   onStepEnd: async (step, result, context) => {
 *     const status = result.status === 'success' ? '✅' : '❌';
 *     console.log(`${status} ${step.name} (${result.duration_ms}ms)`);
 *     await monitoring.recordStepResult(step.name, result);
 *   },
 *
 *   onSuiteEnd: async (suite, result) => {
 *     const rate = (result.successful_steps / result.total_steps * 100).toFixed(1);
 *     console.log(`📊 Suite ${suite.suite_name}: ${rate}% success rate`);
 *     await reportingService.saveSuiteResult(suite, result);
 *   },
 *
 *   onExecutionStart: async (stats) => {
 *     console.log(`🎯 Starting execution of ${stats.tests_discovered} test(s)`);
 *     await dashboard.updateExecutionStatus('running');
 *   },
 *
 *   onExecutionEnd: async (result) => {
 *     console.log(`✨ Execution completed: ${result.success_rate}% success rate`);
 *     await dashboard.updateExecutionStatus('completed', result);
 *     await slackNotifier.sendSummary(result);
 *   },
 *
 *   onError: async (error, context) => {
 *     console.error(`💥 Error occurred: ${error.message}`);
 *     await errorTracker.reportError(error, context);
 *     await alertingService.sendAlert(error);
 *   }
 * };
 *
 * const engine = new FlowTestEngine('./config.yml', hooks);
 * ```
 *
 * @since 1.0.0
 */
export interface EngineHooks {
  /**
   * Called when a test suite is discovered during the discovery phase
   *
   * @param test - The discovered test with metadata (suite name, priority, file path, etc.)
   * @example
   * ```typescript
   * onTestDiscovered: async (test) => {
   *   logger.info(`Found test: ${test.suite_name} (priority: ${test.priority})`);
   *   await testRegistry.register(test);
   * }
   * ```
   */
  onTestDiscovered?: (test: any) => void | Promise<void>;

  /**
   * Called when a test suite execution begins
   *
   * @param suite - The test suite about to be executed
   * @example
   * ```typescript
   * onSuiteStart: async (suite) => {
   *   console.log(`🚀 Starting ${suite.suite_name} with ${suite.steps.length} steps`);
   *   await metrics.startTimer(`suite.${suite.suite_name}`);
   * }
   * ```
   */
  onSuiteStart?: (suite: TestSuite) => void | Promise<void>;

  /**
   * Called when a test suite execution completes (success or failure)
   *
   * @param suite - The test suite that was executed
   * @param result - The execution result containing status, metrics, and details
   * @example
   * ```typescript
   * onSuiteEnd: async (suite, result) => {
   *   const duration = await metrics.endTimer(`suite.${suite.suite_name}`);
   *   await reportDB.saveSuiteResult({
   *     suiteName: suite.suite_name,
   *     status: result.status,
   *     duration,
   *     steps: result.steps_results
   *   });
   * }
   * ```
   */
  onSuiteEnd?: (suite: TestSuite, result: any) => void | Promise<void>;

  /**
   * Called before each test step execution
   *
   * @param step - The test step about to be executed
   * @param context - Current execution context with variables and metadata
   * @example
   * ```typescript
   * onStepStart: async (step, context) => {
   *   console.log(`▶️ Executing: ${step.name}`);
   *   console.log(`Variables: ${Object.keys(context.runtime_variables).join(', ')}`);
   *   await tracing.startSpan(`step.${step.name}`);
   * }
   * ```
   */
  onStepStart?: (
    step: TestStep,
    context: ExecutionContext
  ) => void | Promise<void>;

  /**
   * Called after each test step execution completes
   *
   * @param step - The test step that was executed
   * @param result - The step execution result
   * @param context - Current execution context
   * @example
   * ```typescript
   * onStepEnd: async (step, result, context) => {
   *   const emoji = result.status === 'success' ? '✅' : '❌';
   *   console.log(`${emoji} ${step.name}: ${result.duration_ms}ms`);
   *
   *   if (result.status === 'failure') {
   *     await bugTracker.createIssue({
   *       title: `Test failed: ${step.name}`,
   *       description: result.error_message,
   *       suite: context.suite.suite_name
   *     });
   *   }
   *
   *   await tracing.endSpan(`step.${step.name}`, {
   *     status: result.status,
   *     duration: result.duration_ms
   *   });
   * }
   * ```
   */
  onStepEnd?: (
    step: TestStep,
    result: any,
    context: ExecutionContext
  ) => void | Promise<void>;

  /**
   * Called at the beginning of the entire test execution
   *
   * @param stats - Initial execution statistics
   * @example
   * ```typescript
   * onExecutionStart: async (stats) => {
   *   console.log(`🎯 Starting execution of ${stats.tests_discovered} test suite(s)`);
   *   await ciSystem.updateBuildStatus('running');
   *   await slack.notify(`Test execution started: ${stats.tests_discovered} suites`);
   * }
   * ```
   */
  onExecutionStart?: (stats: ExecutionStats) => void | Promise<void>;

  /**
   * Called when the entire test execution completes
   *
   * @param result - Final aggregated results of all test executions
   * @example
   * ```typescript
   * onExecutionEnd: async (result) => {
   *   const rate = result.success_rate.toFixed(1);
   *   console.log(`✨ Execution completed: ${rate}% success rate`);
   *
   *   // Update CI system
   *   const status = result.failed_tests === 0 ? 'passed' : 'failed';
   *   await ciSystem.updateBuildStatus(status);
   *
   *   // Send notifications
   *   await emailService.sendExecutionSummary({
   *     successRate: result.success_rate,
   *     totalTests: result.total_tests,
   *     duration: result.total_duration_ms,
   *     reportUrl: `${process.env.REPORT_URL}/latest.json`
   *   });
   * }
   * ```
   */
  onExecutionEnd?: (result: any) => void | Promise<void>;

  /**
   * Called when any error occurs during execution
   *
   * @param error - The error that occurred
   * @param context - Optional context information about where the error occurred
   * @example
   * ```typescript
   * onError: async (error, context) => {
   *   console.error(`💥 Error in ${context?.suite_name || 'unknown'}: ${error.message}`);
   *
   *   // Log to monitoring system
   *   await errorTracking.reportError(error, {
   *     suite: context?.suite_name,
   *     step: context?.current_step,
   *     timestamp: new Date().toISOString(),
   *     stack: error.stack
   *   });
   *
   *   // Alert if critical
   *   if (error.message.includes('CRITICAL')) {
   *     await pagerDuty.triggerAlert({
   *       title: 'Critical test failure',
   *       description: error.message,
   *       severity: 'high'
   *     });
   *   }
   * }
   * ```
   */
  onError?: (error: Error, context?: any) => void | Promise<void>;
}

/**
 * Filtros de execução
 */
export interface ExecutionFilters {
  priorities?: string[];
  node_ids?: string[];
  suite_names?: string[];
  tags?: string[];
  file_patterns?: string[];
  exclude_patterns?: string[];
  max_duration_ms?: number;
}

/**
 * Configuração de cache
 */
export interface CacheConfig {
  enabled: boolean;
  variable_interpolation: boolean;
  response_cache?: {
    enabled: boolean;
    ttl_ms: number;
    key_strategy: "url" | "url_and_headers" | "custom";
  };
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
 * @public
 */
export type ReportFormat = "json" | "html" | "qa";

/**
 * Re-export dos tipos de configuração
 */
export * from "./config.types";
