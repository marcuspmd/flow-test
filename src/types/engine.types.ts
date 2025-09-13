/**
 * Definições de tipos específicas para o motor de testes
 *
 * Este módulo contém as definições de tipos da arquitetura v1.0 do Flow Test Engine.
 * Estende e substitui common.types.ts com nova arquitetura aprimorada,
 * incluindo suporte a metadados, hooks, filtros avançados e estatísticas detalhadas.
 *
 * @since 1.0.0
 */

/**
 * Detalhes de uma requisição HTTP com suporte estendido
 *
 * Versão aprimorada que inclui timeout configurável e métodos HTTP adicionais
 * como HEAD e OPTIONS para casos de uso avançados.
 */
export interface RequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Regras de validação estendidas para um campo específico
 *
 * Versão aprimorada das regras de assertion incluindo validações de tipo,
 * existência, comprimento e outras verificações avançadas.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     user_id:
 *       type: number
 *       greater_than: 0
 *     email:
 *       exists: true
 *       regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
 *     items:
 *       length:
 *         greater_than: 0
 *         less_than: 100
 * ```
 */
export interface AssertionChecks {
  equals?: any;
  contains?: any;
  not_equals?: any;
  greater_than?: number;
  less_than?: number;
  regex?: string;
  exists?: boolean;
  type?: "string" | "number" | "boolean" | "object" | "array";
  length?: {
    equals?: number;
    greater_than?: number;
    less_than?: number;
  };
}

/**
 * Conjunto completo de validações para uma resposta HTTP
 *
 * Define todas as validações que podem ser aplicadas a uma resposta,
 * incluindo assertions customizadas e validações de tempo de resposta
 * com limites superior e inferior.
 *
 * @example
 * ```yaml
 * assert:
 *   status_code: 200
 *   body:
 *     success:
 *       equals: true
 *     data:
 *       type: object
 *       exists: true
 *   headers:
 *     content-type:
 *       contains: "application/json"
 *   response_time_ms:
 *     less_than: 2000
 *     greater_than: 10
 *   custom:
 *     - name: "Valid user ID format"
 *       condition: "body.user.id && type(body.user.id) == 'number'"
 *       message: "User ID must be a number"
 * ```
 */
export interface Assertions {
  status_code?: number | AssertionChecks;
  body?: Record<string, AssertionChecks>;
  headers?: Record<string, AssertionChecks>;
  response_time_ms?: {
    less_than?: number;
    greater_than?: number;
  };
  custom?: Array<{
    name: string;
    condition: string; // JMESPath expression
    message?: string;
  }>;
}

/**
 * Conditional scenarios for happy/sad path testing
 *
 * @example
 * ```typescript
 * const scenario: ConditionalScenario = {
 *   name: "Check user role",
 *   condition: "body.user.role == 'admin'",
 *   then: {
 *     assert: { status_code: 200 },
 *     capture: { admin_id: "body.user.id" }
 *   },
 *   else: {
 *     assert: { status_code: 403 },
 *     variables: { is_admin: false }
 *   }
 * };
 * ```
 */
export interface ConditionalScenario {
  /** Optional name for the scenario */
  name?: string;
  /** JMESPath expression to evaluate condition */
  condition: string;
  /** Actions to execute if condition is true */
  then?: {
    assert?: Assertions;
    capture?: Record<string, string>;
    variables?: Record<string, any>;
  };
  /** Actions to execute if condition is false */
  else?: {
    assert?: Assertions;
    capture?: Record<string, string>;
    variables?: Record<string, any>;
  };
}

/**
 * Configuration for array iteration in test steps
 *
 * @example
 * ```yaml
 * iterate:
 *   over: "{{test_cases}}"
 *   as: "item"
 * ```
 */
export interface ArrayIterationConfig {
  /** JMESPath expression or variable name pointing to the array to iterate over */
  over: string;
  /** Variable name to use for the current item in each iteration */
  as: string;
}

/**
 * Configuration for range iteration in test steps
 *
 * @example
 * ```yaml
 * iterate:
 *   range: "1..5"
 *   as: "index"
 * ```
 */
export interface RangeIterationConfig {
  /** Range specification in format "start..end" (inclusive) */
  range: string;
  /** Variable name to use for the current index in each iteration */
  as: string;
}

/**
 * Unified iteration configuration
 *
 * Supports both array iteration and range iteration patterns.
 */
export type IterationConfig = ArrayIterationConfig | RangeIterationConfig;

/**
 * Context for a single iteration execution
 */
export interface IterationContext {
  /** Current iteration index (0-based) */
  index: number;
  /** Current item (for array iteration) or current value (for range iteration) */
  value: any;
  /** Variable name to bind the value to */
  variableName: string;
  /** Whether this is the first iteration */
  isFirst: boolean;
  /** Whether this is the last iteration */
  isLast: boolean;
}

/**
 * Metadata for test step configuration and behavior
 *
 * @example
 * ```typescript
 * const metadata: TestStepMetadata = {
 *   priority: "high",
 *   tags: ["auth", "smoke"],
 *   timeout: 5000,
 *   retry: {
 *     max_attempts: 3,
 *     delay_ms: 1000
 *   },
 *   depends_on: ["login_step"],
 *   description: "Validates user authentication token"
 * };
 * ```
 */
export interface TestStepMetadata {
  /** Execution priority (high, medium, low) */
  priority?: string;
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Maximum execution time in milliseconds */
  timeout?: number;
  /** Retry configuration for failed steps */
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
  /** Array of step names this step depends on */
  depends_on?: string[];
  /** Human-readable description of the step */
  description?: string;
}

/**
 * Complete test step definition with extended metadata
 *
 * @example
 * ```typescript
 * const step: TestStep = {
 *   name: "Create new user account",
 *   request: {
 *     method: "POST",
 *     url: "/api/users",
 *     headers: { "Content-Type": "application/json" },
 *     body: {
 *       username: "{{test_username}}",
 *       email: "{{test_email}}"
 *     }
 *   },
 *   assert: {
 *     status_code: 201,
 *     body: {
 *       "id": { exists: true },
 *       "username": { equals: "{{test_username}}" }
 *     }
 *   },
 *   capture: {
 *     user_id: "body.id",
 *     created_at: "body.created_at"
 *   },
 *   continue_on_failure: false,
 *   metadata: {
 *     priority: "high",
 *     tags: ["user-management", "regression"],
 *     timeout: 10000
 *   }
 * };
 * ```
 */
export interface TestStep {
  /** Descriptive name for the test step */
  name: string;
  /** HTTP request configuration */
  request: RequestDetails;
  /** Response assertions to validate */
  assert?: Assertions;
  /** Data extraction from response */
  capture?: Record<string, string>;
  /** Conditional scenarios for complex flows */
  scenarios?: ConditionalScenario[];
  /** Iteration configuration for repeating the step multiple times */
  iterate?: IterationConfig;
  /** Whether to continue execution if this step fails */
  continue_on_failure?: boolean;
  /** Additional metadata for step configuration */
  metadata?: TestStepMetadata;
}


/**
 * Flow dependency configuration
 *
 * @example
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
 */
export interface FlowDependency {
  /** Path to the dependency flow or node_id for direct reference */
  path?: string;
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
  /** Dependencies that must be satisfied before execution */
  depends?: FlowDependency[];
  /** Extended metadata for suite configuration */
  metadata?: {
    priority?: string;
    tags?: string[];
    timeout?: number;
    estimated_duration_ms?: number;
  };
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
   *     reportUrl: `${process.env.REPORT_URL}/latest.html`
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
 * Re-export dos tipos de configuração
 */
export * from "./config.types";
