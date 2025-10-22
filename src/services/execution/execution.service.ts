/**
 * @fileoverview Test execution service for orchestrating test suite execution.
 *
 * @remarks
 * This module provides the ExecutionService class which handles the complete
 * test execution lifecycle including dependency resolution, scenario processing,
 * HTTP request execution, assertion validation, and result aggregation.
 *
 * @packageDocumentation
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ConfigManager } from "../../core/config";
import { VariableService } from "../variable.service";
import { PriorityService } from "../priority";
import { DependencyService } from "../dependency.service";
import { GlobalRegistryService } from "../global-registry.service";
import { HttpService } from "../http.service";
import {
  maskSensitiveVariables,
  smartFilterAndMask,
} from "../../utils/variable-masking.utils";
import { CertificateService } from "../certificate";
import { AssertionService } from "../assertion";
import { CaptureService } from "../capture.service";
import { ComputedService } from "../computed.service";
import { DynamicExpressionService } from "../dynamic-expression.service";
import { ScenarioService } from "../scenario.service";
import { IterationService } from "../iteration.service";
import { InputService } from "../input";
import { ScriptExecutorService } from "../script-executor.service";
import { JavaScriptService } from "../javascript.service";
import { HookExecutorService } from "./hook-executor.service";
import { getLogger } from "../logger.service";
import {
  DiscoveredTest,
  TestSuite,
  TestStep,
  InputResult,
  SuiteExecutionResult,
  StepExecutionResult,
  ExecutionStats,
  EngineHooks,
  PerformanceSummary,
  DependencyResult,
  InputExecutionContext,
} from "../../types/engine.types";
import type {
  StepCallResult,
  StepExecutionHandlerInput,
} from "../../types/call.types";
import { DelayConfig } from "../../types/common.types";
import { CallService } from "../call.service";
import { EngineExecutionOptions } from "../../types/config.types";
import { StepStrategyFactory } from "./strategies/step-strategy.factory";
import { RequestStepStrategy } from "./strategies/request-step.strategy";
import { InputStepStrategy } from "./strategies/input-step.strategy";
import { CallStepStrategy } from "./strategies/call-step.strategy";
import { IteratedStepStrategy } from "./strategies/iterated-step.strategy";
import { ScenarioStepStrategy } from "./strategies/scenario-step.strategy";
import type { StepExecutionContext } from "./strategies/step-execution.strategy";

type StepIdentifiers = {
  stepId: string;
  qualifiedStepId: string;
  normalizedQualifiedStepId: string;
};

type StepFilterSets = {
  simple: Set<string>;
  qualified: Set<string>;
};

/**
 * Comprehensive test execution service for orchestrating complete test suite execution.
 *
 * @remarks
 * The ExecutionService is the core orchestrator for test execution, managing the
 * complete lifecycle from dependency resolution through result aggregation. It
 * coordinates multiple specialized services to provide comprehensive test execution
 * with advanced features like scenarios, iterations, performance monitoring, and hooks.
 *
 * **Execution Workflow:**
 * 1. **Dependency Resolution**: Resolves and validates inter-suite dependencies
 * 2. **Variable Preparation**: Sets up global and local variable contexts
 * 3. **Scenario Processing**: Handles conditional scenarios and branching logic
 * 4. **Iteration Management**: Processes data-driven test iterations
 * 5. **HTTP Execution**: Executes HTTP requests with comprehensive error handling
 * 6. **Assertion Validation**: Validates responses against defined assertions
 * 7. **Variable Capture**: Captures and stores variables for subsequent use
 * 8. **Result Aggregation**: Compiles comprehensive execution results
 *
 * **Key Features:**
 * - **Dependency Management**: Automatic resolution of test suite dependencies
 * - **Scenario Support**: Conditional test execution based on runtime conditions
 * - **Iteration Processing**: Data-driven testing with dynamic data sources
 * - **Performance Monitoring**: Comprehensive timing and performance metrics
 * - **Hook System**: Extensible hook system for custom execution logic
 * - **Error Handling**: Robust error handling with detailed reporting
 * - **Variable Management**: Sophisticated variable scoping and interpolation
 * - **Result Aggregation**: Detailed execution results with metrics and statistics
 *
 * @example Basic test suite execution
 * ```typescript
 * const configManager = new ConfigManager();
 * const globalRegistry = new GlobalRegistryService();
 * const executionService = new ExecutionService(configManager, globalRegistry);
 *
 * const discoveredTest: DiscoveredTest = {
 *   suite: testSuite,
 *   filePath: './tests/api-test.yaml',
 *   metadata: { priority: 'high', tags: ['api', 'smoke'] }
 * };
 *
 * const result = await executionService.executeSuite(discoveredTest);
 *
 * console.log(`Execution completed: ${result.success ? 'PASSED' : 'FAILED'}`);
 * console.log(`Steps executed: ${result.total_steps}`);
 * console.log(`Assertions: ${result.total_assertions_passed}/${result.total_assertions}`);
 * ```
 *
 * @example Advanced execution with hooks and monitoring
 * ```typescript
 * const hooks: EngineHooks = {
 *   beforeSuite: async (suite) => {
 *     console.log(`Starting suite: ${suite.suite_name}`);
 *   },
 *   afterStep: async (step, result) => {
 *     if (!result.success) {
 *       console.error(`Step failed: ${step.name}`, result.error_message);
 *     }
 *   },
 *   afterSuite: async (suite, result) => {
 *     console.log(`Suite completed in ${result.duration_ms}ms`);
 *   }
 * };
 *
 * const result = await executionService.executeSuite(discoveredTest, hooks);
 *
 * // Access detailed performance metrics
 * const performance = result.performance_summary;
 * console.log(`Average response time: ${performance.average_response_time}ms`);
 * console.log(`Total data transferred: ${performance.total_data_size} bytes`);
 * ```
 *
 * @example Batch execution with dependency resolution
 * ```typescript
 * const tests = await discovery.discoverTests();
 * const orderedTests = dependencyService.resolveExecutionOrder(tests);
 *
 * const results = await executionService.executeMultipleSuites(orderedTests, {
 *   maxConcurrency: 3,
 *   continueOnFailure: false,
 *   hooks: customHooks
 * });
 *
 * const aggregatedStats = executionService.aggregateResults(results);
 * console.log(`Overall success rate: ${aggregatedStats.success_rate}%`);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ExecutionService {
  private configManager: ConfigManager;
  private globalVariables: VariableService;
  private priorityService: PriorityService;
  private dependencyService: DependencyService;
  private globalRegistry: GlobalRegistryService;
  private hooks: EngineHooks;
  private logger = getLogger();

  // Services reused from previous version
  private httpService: HttpService;
  private certificateService?: CertificateService;
  private assertionService: AssertionService;
  private captureService: CaptureService;
  private scenarioService: ScenarioService;
  private iterationService: IterationService;
  private inputService: InputService;
  private computedService: ComputedService;
  private dynamicExpressionService: DynamicExpressionService;
  private callService: CallService;
  private scriptExecutorService: ScriptExecutorService;
  private javascriptService: JavaScriptService;
  private hookExecutorService: HookExecutorService;
  private stepCallStack: string[] = [];
  private stepStrategyFactory: StepStrategyFactory;

  // Performance statistics
  private performanceData: {
    requests: Array<{
      url: string;
      method: string;
      duration_ms: number;
      status_code: number;
    }>;
    start_time: number;
  };

  constructor(
    configManager: ConfigManager,
    globalVariables: VariableService,
    priorityService: PriorityService,
    dependencyService: DependencyService,
    globalRegistry: GlobalRegistryService,
    hooks: EngineHooks = {},
    executionOptions?: EngineExecutionOptions
  ) {
    this.configManager = configManager;
    this.globalVariables = globalVariables;
    this.priorityService = priorityService;
    this.dependencyService = dependencyService;
    this.globalRegistry = globalRegistry;
    this.hooks = hooks;

    const config = configManager.getConfig();

    // Initialize certificate service (always, even if no global certificates)
    // This allows suite-level and step-level certificates to work
    this.certificateService = new CertificateService(
      config.globals?.certificates || []
    );
    if (
      config.globals?.certificates &&
      config.globals.certificates.length > 0
    ) {
      this.logger.info(
        `Certificate service initialized with ${config.globals.certificates.length} global certificate(s)`
      );
    } else {
      this.logger.debug(
        "Certificate service initialized (no global certificates)"
      );
    }

    // Initializes HTTP services with global configuration
    this.httpService = new HttpService(
      config.globals?.base_url,
      config.execution?.timeout || config.globals?.timeouts?.default || 60000,
      this.certificateService
    );
    this.assertionService = new AssertionService();
    this.captureService = new CaptureService();
    this.iterationService = new IterationService();
    this.scenarioService = new ScenarioService();
    this.inputService = new InputService(
      executionOptions?.runner_interactive_mode || false
    );
    this.computedService = new ComputedService();
    this.dynamicExpressionService = new DynamicExpressionService(
      this.captureService,
      this.computedService
    );
    this.callService = new CallService(this.executeResolvedStepCall.bind(this));
    this.scriptExecutorService = new ScriptExecutorService(this.logger);
    this.javascriptService = new JavaScriptService();
    this.hookExecutorService = new HookExecutorService(
      this.globalVariables,
      this.javascriptService,
      this.callService
    );

    // Initialize Strategy Pattern factory and register strategies
    this.stepStrategyFactory = new StepStrategyFactory();

    // Register strategies in priority order (high to low)
    const iteratedStrategy = new IteratedStepStrategy();
    this.stepStrategyFactory.registerStrategy(iteratedStrategy, 0); // Highest priority
    iteratedStrategy.setFactory(this.stepStrategyFactory); // Enable delegation

    this.stepStrategyFactory.registerStrategy(new CallStepStrategy(), 1);
    this.stepStrategyFactory.registerStrategy(new ScenarioStepStrategy(), 2);
    this.stepStrategyFactory.registerStrategy(new InputStepStrategy(), 3);
    this.stepStrategyFactory.registerStrategy(new RequestStepStrategy(), 4); // Lowest priority (fallback)

    this.performanceData = {
      requests: [],
      start_time: Date.now(),
    };
  }

  private buildStepFilter(stepIds?: string[]): StepFilterSets | undefined {
    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      return undefined;
    }

    const simple = new Set<string>();
    const qualified = new Set<string>();

    for (const rawValue of stepIds) {
      if (typeof rawValue !== "string") {
        continue;
      }

      const trimmed = rawValue.trim();
      if (!trimmed) {
        continue;
      }

      if (trimmed.includes("::") || trimmed.includes(":")) {
        const separator = trimmed.includes("::") ? "::" : ":";
        const [suitePart, stepPart] = trimmed.split(separator);
        if (!suitePart || !stepPart) {
          continue;
        }
        const normalizedSuite = this.normalizeSuiteId(suitePart);
        const normalizedStep = this.normalizeStepId(stepPart);
        qualified.add(`${normalizedSuite}::${normalizedStep}`);
      } else {
        simple.add(this.normalizeStepId(trimmed));
      }
    }

    if (simple.size === 0 && qualified.size === 0) {
      return undefined;
    }

    return { simple, qualified };
  }

  private shouldExecuteStepFilter(
    identifiers: StepIdentifiers,
    filter?: StepFilterSets
  ): boolean {
    if (!filter) {
      return true;
    }

    if (filter.simple.has(identifiers.stepId)) {
      return true;
    }

    if (filter.qualified.has(identifiers.normalizedQualifiedStepId)) {
      return true;
    }

    return false;
  }

  private computeStepIdentifiers(
    suite: TestSuite,
    step: TestStep,
    index: number
  ): StepIdentifiers {
    const baseName = step.step_id?.trim() || `step-${index + 1}-${step.name}`;
    let stepId = this.normalizeStepId(baseName);

    if (!stepId) {
      stepId = `step-${index + 1}`;
    }

    const qualifiedStepId = `${suite.node_id}::${stepId}`;
    const normalizedQualifiedStepId = `${this.normalizeSuiteId(
      suite.node_id
    )}::${stepId}`;

    return {
      stepId,
      qualifiedStepId,
      normalizedQualifiedStepId,
    };
  }

  private normalizeSuiteId(value: string): string {
    return this.normalizeStepId(value);
  }

  private normalizeStepId(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_.:-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Executes list of discovered tests with dependency-aware execution
   */
  async executeTests(
    tests: DiscoveredTest[],
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const config = this.configManager.getConfig();

    let stats: ExecutionStats = {
      tests_discovered: tests.length,
      tests_completed: 0,
      tests_successful: 0,
      tests_failed: 0,
      tests_skipped: 0,
      requests_made: 0,
      total_response_time_ms: 0,
    };

    // 1. Validate input compatibility with execution mode
    this.validateInputCompatibility(tests, config);

    // 2. Builds dependency graph
    this.dependencyService.buildDependencyGraph(tests);

    // 3. Registers suites with exports in global registry
    this.registerSuitesWithExports(tests);

    // 4. Resolves execution order considering dependencies
    const orderedTests = this.dependencyService.resolveExecutionOrder(tests);

    this.logger.info(
      `Dependency-aware execution order resolved for ${orderedTests.length} test(s)`,
      { metadata: { type: "internal_debug", internal: true } }
    );
    if (config.execution!.mode === "parallel") {
      this.logger.warn(
        "Parallel execution with dependencies may be limited by dependency chains"
      );
    }

    // 5. Executes tests in resolved order
    const results = await this.executeTestsWithDependencies(
      orderedTests,
      stats,
      onStatsUpdate
    );

    return results;
  }

  /**
   * Registers suites that have exports in the Global Registry
   */
  private registerSuitesWithExports(tests: DiscoveredTest[]): void {
    for (const test of tests) {
      if (test.exports && test.exports.length > 0) {
        this.globalRegistry.registerNode(
          test.node_id,
          test.suite_name,
          test.exports,
          test.file_path
        );
      }
    }
  }

  /**
   * Executes tests respecting dependencies
   */
  private async executeTestsWithDependencies(
    tests: DiscoveredTest[],
    stats: ExecutionStats,
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const results: SuiteExecutionResult[] = [];

    for (const test of tests) {
      stats.current_test = test.suite_name;
      onStatsUpdate?.(stats);

      try {
        // Checks if there's already a cached result
        const cachedResult = this.dependencyService.getCachedResult(
          test.suite_name
        );
        if (cachedResult && cachedResult.success) {
          this.logger.info(`Using cached result for '${test.suite_name}'`);

          // Restores exported variables from cache
          this.restoreExportedVariables(cachedResult);

          // Creates result based on cache (without re-execution)
          const suiteResult = this.buildCachedSuiteResult(test, cachedResult);
          results.push(suiteResult);

          stats.tests_completed++;
          stats.tests_successful++;

          continue;
        }

        // Marks as executing
        this.dependencyService.markExecuting(test.suite_name);

        // Executes the test (exports are now handled inside executeSingleTest)
        const result = await this.executeSingleTest(test);
        results.push(result);

        // Marks as resolved in dependency graph
        const dependencyResult: DependencyResult = {
          flowPath: test.file_path,
          nodeId: test.node_id,
          suiteName: test.suite_name,
          success: result.status === "success",
          executionTime: result.duration_ms,
          exportedVariables: result.variables_captured,
          cached: false,
        };

        this.dependencyService.markResolved(test.suite_name, dependencyResult);

        // Updates statistics
        stats.tests_completed++;
        if (result.status === "success") {
          stats.tests_successful++;
        } else if (result.status === "failure") {
          stats.tests_failed++;

          // Checks if should stop on required test failure
          if (this.priorityService.isRequiredTest(test)) {
            this.logger.warn(
              `Stopping execution due to failure in required test: ${test.suite_name}`
            );
            break;
          }
        } else {
          stats.tests_skipped++;
        }

        onStatsUpdate?.(stats);
      } catch (error) {
        this.logger.error(`Unexpected error executing ${test.suite_name}`, {
          error: error as Error,
        });

        const errorResult = this.buildErrorSuiteResult(test, error as Error);
        results.push(errorResult);

        stats.tests_completed++;
        stats.tests_failed++;
        onStatsUpdate?.(stats);
      }
    }

    return results;
  }

  /**
   * Executes tests sequentially
   */
  private async executeTestsSequentially(
    tests: DiscoveredTest[],
    stats: ExecutionStats,
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const config = this.configManager.getConfig();
    const results: SuiteExecutionResult[] = [];

    for (const test of tests) {
      stats.current_test = test.suite_name;
      onStatsUpdate?.(stats);

      try {
        const result = await this.executeSingleTest(test);
        results.push(result);

        // Updates statistics
        stats.tests_completed++;
        if (result.status === "success") {
          stats.tests_successful++;
        } else if (result.status === "failure") {
          stats.tests_failed++;

          // Checks if should stop on required test failure
          if (
            this.priorityService.isRequiredTest(test) &&
            config.priorities!.fail_fast_on_required
          ) {
            this.logger.warn(
              `Stopping execution due to failure in required test: ${test.suite_name}`
            );
            break;
          }
        } else {
          stats.tests_skipped++;
        }

        onStatsUpdate?.(stats);
      } catch (error) {
        this.logger.error(`Unexpected error executing ${test.suite_name}`, {
          error: error as Error,
        });

        const errorResult: SuiteExecutionResult = {
          node_id: test.node_id,
          suite_name: test.suite_name,
          file_path: test.file_path,
          priority: test.priority,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: 0,
          status: "failure",
          steps_executed: 0,
          steps_successful: 0,
          steps_failed: 1,
          success_rate: 0,
          steps_results: [],
          error_message: `Unexpected error: ${error}`,
          variables_captured: this.getExportedVariables(test),
          available_variables: this.filterAvailableVariables(
            this.globalVariables.getAllVariables(),
            { isFirstStep: true }
          ),
        };

        results.push(errorResult);
        stats.tests_completed++;
        stats.tests_failed++;
        onStatsUpdate?.(stats);
      }
    }

    return results;
  }

  /**
   * Executes tests in parallel (simplified implementation)
   */
  private async executeTestsInParallel(
    tests: DiscoveredTest[],
    stats: ExecutionStats,
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const config = this.configManager.getConfig();
    const maxParallel = config.execution!.max_parallel || 5;

    // Groups tests in batches for parallel execution
    const batches: DiscoveredTest[][] = [];
    for (let i = 0; i < tests.length; i += maxParallel) {
      batches.push(tests.slice(i, i + maxParallel));
    }

    const results: SuiteExecutionResult[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map((test) => this.executeSingleTest(test));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const test = batch[index];

        if (result.status === "fulfilled") {
          results.push(result.value);

          stats.tests_completed++;
          if (result.value.status === "success") {
            stats.tests_successful++;
          } else if (result.value.status === "failure") {
            stats.tests_failed++;
          } else {
            stats.tests_skipped++;
          }
        } else {
          // Error handling in parallel execution
          const errorResult: SuiteExecutionResult = {
            node_id: test.node_id,
            suite_name: test.suite_name,
            file_path: test.file_path,
            priority: test.priority,
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            duration_ms: 0,
            status: "failure",
            steps_executed: 0,
            steps_successful: 0,
            steps_failed: 1,
            success_rate: 0,
            steps_results: [],
            error_message: `Parallel execution error: ${result.reason}`,
            variables_captured: this.getExportedVariables(batch[index]),
            available_variables: this.filterAvailableVariables(
              {
                ...this.globalVariables.getAllVariables(),
                ...this.globalVariables.getVariablesByScope("runtime"),
              },
              { isFirstStep: true }
            ),
          };

          results.push(errorResult);
          stats.tests_completed++;
          stats.tests_failed++;
        }
      });

      onStatsUpdate?.(stats);
    }

    return results;
  }

  /**
   * Executes a single test
   */
  private async executeSingleTest(
    discoveredTest: DiscoveredTest
  ): Promise<SuiteExecutionResult> {
    const startTime = new Date();

    try {
      // Loads the test suite
      const suite = await this.loadTestSuite(discoveredTest.file_path);

      // Fires suite start hook
      await this.hooks.onSuiteStart?.(suite);

      // Display test metadata
      (this.logger as any).displayTestMetadata?.(suite);

      // CRITICAL: Register node in GlobalRegistry BEFORE executing steps
      // This ensures that capture/export operations can find the node
      if (
        (discoveredTest.exports && discoveredTest.exports.length > 0) ||
        (discoveredTest.exports_optional &&
          discoveredTest.exports_optional.length > 0)
      ) {
        this.globalRegistry.registerNode(
          discoveredTest.node_id,
          discoveredTest.suite_name,
          [
            ...(discoveredTest.exports || []),
            ...(discoveredTest.exports_optional || []),
          ],
          discoveredTest.file_path
        );
        this.logger.debug(
          `Registered node '${discoveredTest.node_id}' with exports: [${[
            ...(discoveredTest.exports || []),
            ...(discoveredTest.exports_optional || []),
          ].join(", ")}]`,
          { metadata: { type: "internal_debug", internal: true } }
        );
      }

      // VARIABLE CLEANUP: Clean non-global variables before starting new node
      // This ensures that runtime, suite and imported variables from previous node don't leak to this node
      this.globalVariables.clearAllNonGlobalVariables();

      this.logger.info(
        `Starting fresh variable context for node '${discoveredTest.node_id}'`,
        { metadata: { type: "internal_debug", internal: true } }
      );

      // Reset dynamic definitions registered by previous suites
      this.dynamicExpressionService.reset();

      // Configures suite variables
      if (suite.variables) {
        this.globalVariables.setSuiteVariables(suite.variables);
      }

      // Configures dependencies for variable resolution
      if (discoveredTest.depends && discoveredTest.depends.length > 0) {
        const dependencyNodeIds = discoveredTest.depends
          .map((dep) => dep.node_id)
          .filter((nodeId): nodeId is string => Boolean(nodeId));
        this.globalVariables.setDependencies(dependencyNodeIds);
      }

      // Interpolates and configures suite base_url if specified
      if (suite.base_url) {
        const interpolatedBaseUrl = this.globalVariables.interpolateString(
          suite.base_url
        );

        this.logger.debug(
          `Creating new HttpService for suite with certificateService: ${!!this
            .certificateService}`
        );

        this.httpService = new HttpService(
          interpolatedBaseUrl,
          this.configManager.getConfig().execution?.timeout || 60000,
          this.certificateService
        );
      }

      // Store suite-level certificate for later use in steps
      if (suite.certificate) {
        this.globalVariables.setRuntimeVariable(
          "__suite_certificate",
          suite.certificate
        );
      }

      const runtimeFilters = this.configManager.getRuntimeFilters();
      const stepFilter = this.buildStepFilter(runtimeFilters.step_ids);

      // Executes all steps
      const stepResults: StepExecutionResult[] = [];
      let successfulSteps = 0;
      let failedSteps = 0;

      for (let i = 0; i < suite.steps.length; i++) {
        const step = suite.steps[i];
        const identifiers = this.computeStepIdentifiers(suite, step, i);
        const shouldExecute = this.shouldExecuteStepFilter(
          identifiers,
          stepFilter
        );

        try {
          const stepResult = await this.executeStep(
            step,
            suite,
            i,
            identifiers,
            shouldExecute,
            discoveredTest
          );
          stepResults.push(stepResult);

          if (stepResult.status === "success") {
            successfulSteps++;

            // Display captured variables if any
            if (
              stepResult.captured_variables &&
              Object.keys(stepResult.captured_variables).length > 0
            ) {
              (this.logger as any).displayCapturedVariables?.(
                stepResult.captured_variables,
                {
                  stepName: step.name,
                  nodeId: suite.node_id,
                }
              );
            }
          } else if (stepResult.status === "failure") {
            failedSteps++;

            // Display error details for failed step
            if (stepResult.error_message) {
              (this.logger as any).displayErrorContext?.(
                new Error(stepResult.error_message),
                {
                  stepName: step.name,
                  request: stepResult.request_details,
                  response: stepResult.response_details,
                  assertion: stepResult.assertions_results?.find(
                    (a) => !a.passed
                  ),
                }
              );
            }

            // Checks if should continue after failure
            if (
              !step.continue_on_failure &&
              !this.configManager.getConfig().execution!.continue_on_failure
            ) {
              break;
            }
          }

          // Updates captured variables globally (already done inside executeStep)
          // if (stepResult.captured_variables) {
          //   this.globalVariables.setRuntimeVariables(
          //     this.processCapturedVariables(
          //       stepResult.captured_variables,
          //       suite
          //     )
          //   );
          // }
        } catch (error) {
          this.logger.error(`Error in step '${step.name}'`, {
            error: error as Error,
            stepName: step.name,
          });

          // Display detailed error context
          (this.logger as any).displayErrorContext?.(error as Error, {
            stepName: step.name,
          });

          const errorStepResult: StepExecutionResult = {
            step_id: identifiers.stepId,
            qualified_step_id: identifiers.qualifiedStepId,
            step_name: step.name,
            status: "failure",
            duration_ms: 0,
            error_message: `Step execution error: ${error}`,
            captured_variables: {},
            available_variables: this.filterAvailableVariables(
              this.globalVariables.getAllVariables(),
              { stepName: step.name }
            ),
          };

          stepResults.push(errorStepResult);
          failedSteps++;

          if (
            !step.continue_on_failure &&
            !this.configManager.getConfig().execution!.continue_on_failure
          ) {
            break;
          }
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const processedSteps = stepResults.length;
      const executedSteps = successfulSteps + failedSteps;
      const successRate =
        executedSteps === 0 ? 100 : (successfulSteps / executedSteps) * 100;

      // Read original YAML content for frontend processing
      let suiteYamlContent: string | undefined;
      try {
        if (fs.existsSync(discoveredTest.file_path)) {
          suiteYamlContent = fs.readFileSync(discoveredTest.file_path, "utf-8");
        }
      } catch (error) {
        this.logger.warn(
          `Could not read YAML content for ${discoveredTest.file_path}: ${error}`
        );
      }

      // Create preliminary result for export capture
      const preliminaryResult: SuiteExecutionResult = {
        node_id: suite.node_id,
        suite_name: suite.suite_name,
        file_path: discoveredTest.file_path,
        priority: discoveredTest.priority,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: duration,
        status: failedSteps === 0 ? "success" : "failure",
        steps_executed: processedSteps,
        steps_successful: successfulSteps,
        steps_failed: failedSteps,
        success_rate: Math.round(successRate * 100) / 100,
        steps_results: stepResults,
        variables_captured: {}, // Will be populated after export
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables(),
          { stepName: `${suite.suite_name}_final` }
        ),
        suite_yaml_content: suiteYamlContent,
      };

      // Capture and register exports BEFORE finalizing result
      // This ensures exported variables are available in variables_captured
      if (
        (discoveredTest.exports && discoveredTest.exports.length > 0) ||
        (discoveredTest.exports_optional &&
          discoveredTest.exports_optional.length > 0)
      ) {
        this.captureAndRegisterExports(discoveredTest, preliminaryResult);
      }

      // Now get the exported variables after they've been registered
      const result: SuiteExecutionResult = {
        ...preliminaryResult,
        variables_captured: this.getExportedVariables(discoveredTest),
      };

      // Display final results in Jest style
      (this.logger as any).displayJestStyle?.(result);

      // Fires suite end hook
      await this.hooks.onSuiteEnd?.(suite, result);

      return result;
    } catch (error) {
      const endTime = new Date();

      // Read original YAML content for frontend processing (even in error case)
      let suiteYamlContent: string | undefined;
      try {
        if (fs.existsSync(discoveredTest.file_path)) {
          suiteYamlContent = fs.readFileSync(discoveredTest.file_path, "utf-8");
        }
      } catch (yamlError) {
        this.logger.warn(
          `Could not read YAML content for ${discoveredTest.file_path}: ${yamlError}`
        );
      }

      const errorResult: SuiteExecutionResult = {
        node_id: discoveredTest.node_id,
        suite_name: discoveredTest.suite_name,
        file_path: discoveredTest.file_path,
        priority: discoveredTest.priority,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: endTime.getTime() - startTime.getTime(),
        status: "failure",
        steps_executed: 0,
        steps_successful: 0,
        steps_failed: 1,
        success_rate: 0,
        steps_results: [],
        error_message: `Suite loading error: ${error}`,
        variables_captured: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables(),
          { isFirstStep: true }
        ),
        suite_yaml_content: suiteYamlContent,
      };

      return errorResult;
    }
  }

  /**
   * Intelligently filters variables to show only what's relevant for current context
   */
  private filterAvailableVariables(
    variables: Record<string, any>,
    context: {
      stepType?: "request" | "input" | "call" | "scenario" | "iteration";
      stepName?: string;
      isFirstStep?: boolean;
    } = {}
  ): Record<string, any> {
    // Get recently captured variables from global registry
    const recentCaptures = new Set<string>();

    // Look for variables that match patterns suggesting they were recently captured
    for (const key of Object.keys(variables)) {
      if (
        key.startsWith("captured_") ||
        key.includes("_result") ||
        key.includes("_response")
      ) {
        recentCaptures.add(key);
      }
    }

    // Use smart filtering with masking
    return smartFilterAndMask(
      variables,
      {
        stepType: context.stepType,
        stepName: context.stepName,
        recentCaptures,
        isFirstStep: context.isFirstStep,
      },
      {
        recentCapturesOnly: false,
        recentUsageDepth: 3,
        alwaysInclude: ["base_url", "suite_name", "node_id"],
        alwaysExclude: [
          "PATH",
          "HOME",
          "USER",
          "SHELL",
          "PWD",
          "LANG",
          "TERM",
          "TMPDIR",
        ],
        maxPerCategory: 8,
      },
      {
        maxDepth: 2,
        maxObjectSize: 20,
        maxArrayLength: 5,
        maxStringLength: 200,
      }
    );
  }

  /**
   * Gets all environment variables that should be excluded from available variables
   */
  private getEnvironmentVariablesToExclude(): Set<string> {
    const envVars = new Set<string>();

    // Add all system environment variables
    Object.keys(process.env).forEach((key) => {
      envVars.add(key);
    });

    // Try to read .env file if it exists
    try {
      const envFilePath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envFilePath)) {
        const envContent = fs.readFileSync(envFilePath, "utf8");
        const envLines = envContent.split("\n");

        for (const line of envLines) {
          const trimmedLine = line.trim();
          // Skip comments and empty lines
          if (trimmedLine && !trimmedLine.startsWith("#")) {
            const equalIndex = trimmedLine.indexOf("=");
            if (equalIndex > 0) {
              const key = trimmedLine.substring(0, equalIndex).trim();
              envVars.add(key);
            }
          }
        }
      }
    } catch (error) {
      // Silently ignore .env file reading errors
      this.logger.debug("Could not read .env file for variable filtering", {
        error: error as Error,
      });
    }

    return envVars;
  }

  /**
   * Executes an individual step
   */
  private async executeStep(
    step: TestStep,
    suite: TestSuite,
    stepIndex: number,
    identifiers: StepIdentifiers,
    shouldExecute = true,
    discoveredTest?: DiscoveredTest
  ): Promise<StepExecutionResult> {
    const stepStartTime = Date.now();

    // Fires step start hook
    const context = {
      suite,
      global_variables: this.globalVariables.getAllVariables(),
      runtime_variables: this.globalVariables.getVariablesByScope("runtime"),
      step_index: stepIndex,
      total_steps: suite.steps.length,
      start_time: new Date(),
      execution_id: `${suite.suite_name}_${stepIndex}`,
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
    };

    await this.hooks.onStepStart?.(step, context);

    // Skip step if not in execution filter
    if (!shouldExecute) {
      const skippedResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "skipped",
        duration_ms: 0,
        captured_variables: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables(),
          { stepName: step.name }
        ),
      };

      this.logger.info(
        `Skipping step '${step.name}' (${identifiers.stepId}) due to step filter`
      );

      await this.hooks.onStepEnd?.(step, skippedResult, context);
      return skippedResult;
    }

    // Execute step using Strategy Pattern
    try {
      // Get appropriate strategy for this step
      const strategy = this.stepStrategyFactory.getStrategy(step);
      const strategyName = strategy.constructor.name;

      this.logger.debug(
        `Using strategy: ${strategyName} for step '${step.name}'`
      );

      // Build execution context for strategy
      const strategyContext: StepExecutionContext = {
        step,
        suite,
        stepIndex,
        identifiers: {
          stepId: identifiers.stepId,
          qualifiedStepId: identifiers.qualifiedStepId,
          stepNumber: stepIndex + 1,
        } as any,
        logger: this.logger,
        globalVariables: this.globalVariables,
        httpService: this.httpService,
        assertionService: this.assertionService,
        captureService: this.captureService,
        scenarioService: this.scenarioService,
        callService: this.callService,
        inputService: this.inputService,
        iterationService: this.iterationService,
        dynamicExpressionService: this.dynamicExpressionService,
        scriptExecutorService: this.scriptExecutorService,
        hookExecutorService: this.hookExecutorService,
        hooks: this.hooks,
        configManager: this.configManager,
        stepCallStack: this.stepCallStack,
        discoveredTest: discoveredTest as any,
      };

      // Execute step using strategy
      const result = await strategy.execute(strategyContext);

      // Fire step end hook
      await this.hooks.onStepEnd?.(step, result, context);

      this.logger.debug(
        `Step '${step.name}' completed via ${strategyName}: ${result.status}`
      );

      return result;
    } catch (error: any) {
      this.logger.error(
        `Strategy execution failed for step '${step.name}': ${error.message}`
      );

      const failureResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "failure",
        duration_ms: Date.now() - stepStartTime,
        error_message: `Strategy execution error: ${error.message}`,
        captured_variables: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables(),
          { stepName: step.name }
        ),
      };

      await this.hooks.onStepEnd?.(step, failureResult, context);
      return failureResult;
    }
  }

  private async executeResolvedStepCall({
    resolved,
    request,
  }: StepExecutionHandlerInput): Promise<StepCallResult> {
    const shouldIsolate = request.isolate_context !== false;
    const restoreVariables = shouldIsolate
      ? this.globalVariables.createSnapshot()
      : undefined;
    const restoreDynamics = shouldIsolate
      ? this.dynamicExpressionService.createSnapshot()
      : undefined;

    const previousHttpService = this.httpService;
    const callStart = Date.now();

    try {
      if (shouldIsolate) {
        // Modo isolado: limpa contexto e define variáveis da suite chamada
        this.globalVariables.clearAllNonGlobalVariables();

        // Define variáveis da suite chamada primeiro
        if (resolved.suite.variables) {
          this.globalVariables.setSuiteVariables(resolved.suite.variables);
        }

        // Variáveis do call têm prioridade sobre as da suite
        if (request.variables && Object.keys(request.variables).length > 0) {
          this.globalVariables.setRuntimeVariables(request.variables);
        }
      } else {
        // Modo não-isolado: mantém contexto atual
        // Variáveis da suite chamada são apenas fallback (não sobrescrevem contexto atual)
        if (resolved.suite.variables) {
          const currentVars = this.globalVariables.getAllVariables();
          const suiteVarsToAdd: Record<string, any> = {};

          // Adiciona apenas variáveis da suite que não existem no contexto atual
          for (const [key, value] of Object.entries(resolved.suite.variables)) {
            if (!(key in currentVars)) {
              suiteVarsToAdd[key] = value;
            }
          }

          if (Object.keys(suiteVarsToAdd).length > 0) {
            const interpolatedVars = this.globalVariables.interpolate(
              this.cloneData(suiteVarsToAdd)
            );
            this.globalVariables.setRuntimeVariables(interpolatedVars);
          }
        }

        // Variáveis do call sempre têm prioridade
        if (request.variables && Object.keys(request.variables).length > 0) {
          this.globalVariables.setRuntimeVariables(request.variables);
        }
      }

      const baseUrl = resolved.suite.base_url
        ? this.globalVariables.interpolateString(resolved.suite.base_url)
        : previousHttpService.getBaseUrl();
      const timeout =
        request.timeout ??
        this.configManager.getConfig().execution?.timeout ??
        60000;

      // Propaga o certificateService para o HttpService da suite chamada
      this.httpService = new HttpService(
        baseUrl,
        timeout,
        this.certificateService
      );

      const callDiscovered: DiscoveredTest = {
        file_path: resolved.suitePath,
        node_id: resolved.suite.node_id,
        suite_name: resolved.suite.suite_name,
        priority: resolved.suite.metadata?.priority,
        exports: resolved.suite.exports,
        exports_optional: resolved.suite.exports_optional,
      };

      const identifiers = this.computeStepIdentifiers(
        resolved.suite,
        resolved.step,
        resolved.stepIndex
      );

      const stepResult = await this.executeStep(
        resolved.step,
        resolved.suite,
        resolved.stepIndex,
        identifiers,
        true,
        callDiscovered
      );

      const propagatedVariables =
        stepResult.captured_variables &&
        Object.keys(stepResult.captured_variables).length > 0
          ? this.processCapturedVariables(
              stepResult.captured_variables,
              resolved.suite,
              shouldIsolate
            )
          : undefined;

      return {
        success: stepResult.status === "success",
        status: stepResult.status,
        error: stepResult.error_message,
        captured_variables: stepResult.captured_variables,
        propagated_variables: propagatedVariables,
        available_variables: stepResult.available_variables,
        executionTime: Date.now() - callStart,
        step_name: stepResult.step_name,
        suite_name: resolved.suite.suite_name,
        suite_node_id: resolved.suite.node_id,
      };
    } finally {
      this.httpService = previousHttpService;
      if (shouldIsolate) {
        restoreDynamics?.();
        restoreVariables?.();
      }
    }
  }

  private interpolateCallVariables(
    variables?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!variables) {
      return undefined;
    }

    const cloned = this.cloneData(variables);
    return this.globalVariables.interpolate(cloned);
  }

  private cloneData<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    const structuredCloneFn = (globalThis as any).structuredClone as
      | ((input: any) => any)
      | undefined;

    if (typeof structuredCloneFn === "function") {
      return structuredCloneFn(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Loads a test suite from file
   */
  private async loadTestSuite(filePath: string): Promise<TestSuite> {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const suite = yaml.load(fileContent) as TestSuite;

      if (!suite || !suite.suite_name) {
        throw new Error("Invalid test suite: missing suite_name");
      }

      return suite;
    } catch (error) {
      throw new Error(`Failed to load test suite from ${filePath}: ${error}`);
    }
  }

  /**
   * Captures and registers exported variables in Global Registry
   */
  private captureAndRegisterExports(
    test: DiscoveredTest,
    result: SuiteExecutionResult
  ): void {
    const hasRequiredExports = test.exports && test.exports.length > 0;
    const hasOptionalExports =
      test.exports_optional && test.exports_optional.length > 0;

    if (!hasRequiredExports && !hasOptionalExports) return;

    // Get variables from multiple sources for comprehensive search
    // IMPORTANT: Include ALL variables (suite, runtime, input, captured, etc.)
    const allVars = this.globalVariables.getAllVariables();
    const runtimeVars = this.globalVariables.getVariablesByScope("runtime");
    const allCapturedVars = this.getAllCapturedVariables(result);

    // DEBUG: Log what we found
    this.logger.debug(
      `[EXPORT DEBUG] Node '${test.node_id}' - Looking for exports: [${[
        ...(test.exports || []),
        ...(test.exports_optional || []),
      ].join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );
    this.logger.debug(
      `[EXPORT DEBUG] All vars available: ${
        Object.keys(allVars).length
      } - [${Object.keys(allVars).join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );
    this.logger.debug(
      `[EXPORT DEBUG] Runtime vars available: ${
        Object.keys(runtimeVars).length
      } - [${Object.keys(runtimeVars).join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );
    this.logger.debug(
      `[EXPORT DEBUG] Captured vars from steps: ${
        Object.keys(allCapturedVars).length
      } - [${Object.keys(allCapturedVars).join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );

    // Merge all sources with correct precedence:
    // 1. Start with all variables (includes suite, input, etc.)
    // 2. Override with captured vars from steps
    // 3. Override with runtime vars (highest priority)
    const allAvailableVars = { ...allVars, ...allCapturedVars, ...runtimeVars };

    this.logger.debug(
      `[EXPORT DEBUG] Total available vars after merge: ${
        Object.keys(allAvailableVars).length
      } - [${Object.keys(allAvailableVars).join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );

    // Process required exports (with warnings)
    if (hasRequiredExports) {
      for (const exportName of test.exports!) {
        const value = allAvailableVars[exportName];

        if (value !== undefined) {
          this.globalRegistry.setExportedVariable(
            test.node_id,
            exportName,
            value
          );
          this.logger.debug(
            `[EXPORT DEBUG] Successfully exported '${exportName}' = ${JSON.stringify(
              value
            )?.substring(0, 100)}`,
            { metadata: { type: "internal_debug", internal: true } }
          );
        } else {
          this.logger.warn(
            `Export '${exportName}' not found in captured variables for suite '${test.suite_name}'`
          );
        }
      }
    }

    // Process optional exports (no warnings)
    if (hasOptionalExports) {
      for (const exportName of test.exports_optional!) {
        const value = allAvailableVars[exportName];

        if (value !== undefined) {
          this.globalRegistry.setExportedVariable(
            test.node_id,
            exportName,
            value
          );
          // Optional: log successful optional export for debugging
          this.logger.debug(
            `Optional export '${exportName}' found and registered for suite '${test.suite_name}'`
          );
        }
        // No warning when optional export is not found
      }
    }
  }

  /**
   * Collects all captured variables from step results and scenarios
   */
  private getAllCapturedVariables(
    result: SuiteExecutionResult
  ): Record<string, any> {
    const allCaptured: Record<string, any> = {};

    // Collect from step results
    if (result.steps_results) {
      for (const stepResult of result.steps_results) {
        if (stepResult.captured_variables) {
          Object.assign(allCaptured, stepResult.captured_variables);
        }
      }
    }

    return allCaptured;
  }

  /**
   * Gets only the variables that should be exported for a test
   */
  private getExportedVariables(test: DiscoveredTest): Record<string, any> {
    const exportedVars: Record<string, any> = {};

    if (test.exports && test.exports.length > 0) {
      // Get exported variables from Global Registry
      const allExportedVars = this.globalRegistry.getAllExportedVariables();

      for (const exportName of test.exports) {
        const namespacedKey = `${test.node_id}.${exportName}`;
        const value = allExportedVars[namespacedKey];

        if (value !== undefined) {
          exportedVars[exportName] = value;
        }
      }
    }

    return exportedVars;
  }

  /**
   * Processes captured variables, optionally applying namespace for exported variables
   */
  private processCapturedVariables(
    capturedVariables: Record<string, any>,
    suite: TestSuite,
    applyNamespace: boolean = false
  ): Record<string, any> {
    const processedVariables: Record<string, any> = {};

    for (const [variableName, value] of Object.entries(capturedVariables)) {
      const finalName = applyNamespace
        ? `${suite.node_id}.${variableName}`
        : variableName;

      processedVariables[finalName] = value;
    }

    return processedVariables;
  }

  /**
   * Restores exported variables from cache
   */
  private restoreExportedVariables(cachedResult: DependencyResult): void {
    for (const [variableName, value] of Object.entries(
      cachedResult.exportedVariables
    )) {
      this.globalRegistry.setExportedVariable(
        cachedResult.nodeId,
        variableName,
        value
      );
    }
  }

  /**
   * Builds suite result based on cache
   */
  private buildCachedSuiteResult(
    test: DiscoveredTest,
    cachedResult: DependencyResult
  ): SuiteExecutionResult {
    const now = new Date();
    return {
      node_id: test.node_id,
      suite_name: test.suite_name,
      file_path: test.file_path,
      priority: test.priority,
      start_time: now.toISOString(),
      end_time: now.toISOString(),
      duration_ms: 0, // Cache hit = no execution time
      status: "success",
      steps_executed: 1, // Assume 1 step for cached results
      steps_successful: 1,
      steps_failed: 0,
      success_rate: 100,
      steps_results: [],
      variables_captured: cachedResult.exportedVariables,
    };
  }

  /**
   * Builds error result for a suite
   */
  private buildErrorSuiteResult(
    test: DiscoveredTest,
    error: Error
  ): SuiteExecutionResult {
    const now = new Date();
    return {
      node_id: test.node_id,
      suite_name: test.suite_name,
      file_path: test.file_path,
      priority: test.priority,
      start_time: now.toISOString(),
      end_time: now.toISOString(),
      duration_ms: 0,
      status: "failure",
      steps_executed: 0,
      steps_successful: 0,
      steps_failed: 1,
      success_rate: 0,
      steps_results: [],
      error_message: `Execution error: ${error.message}`,
      variables_captured: this.getExportedVariables(test),
    };
  }

  /**
   * Records performance data
   */
  private recordPerformanceData(request: any, result: any): void {
    if (result.response_details) {
      this.performanceData.requests.push({
        url: request.url,
        method: request.method,
        duration_ms: result.duration_ms || 0,
        status_code: result.response_details.status_code,
      });
    }
  }

  /**
   * Preserves the original templated URL for reporting purposes
   */
  private attachRawUrlToResult(
    result: StepExecutionResult,
    rawUrl?: string
  ): void {
    if (!result?.request_details) {
      return;
    }

    const baseUrl =
      result.request_details.base_url || this.httpService.getBaseUrl();

    if (baseUrl && !result.request_details.base_url) {
      result.request_details.base_url = baseUrl;
    }

    if (!rawUrl) {
      return;
    }

    let templateUrl = rawUrl;
    const isAbsolute = /^(https?:)?\/\//i.test(rawUrl);

    const hasBasePlaceholder = rawUrl.includes("{{base_url}}");

    if (!isAbsolute && baseUrl && !hasBasePlaceholder) {
      const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
      templateUrl = `{{base_url}}${path}`;
    }

    result.request_details.raw_url = templateUrl;
  }

  /**
   * Execute delay/wait based on DelayConfig.
   * Supports fixed delays, interpolated delays, and random ranges.
   *
   * @param delayConfig - Delay configuration (number, string, or range object)
   * @param stepName - Name of the step (for logging)
   */
  private async executeDelay(
    delayConfig: DelayConfig,
    stepName: string
  ): Promise<void> {
    let delayMs: number;

    if (typeof delayConfig === "number") {
      // Fixed delay
      delayMs = delayConfig;
    } else if (typeof delayConfig === "string") {
      // Interpolated delay
      const interpolated = this.globalVariables.interpolate({
        delay: delayConfig,
      });
      const parsedDelay = parseInt(String(interpolated.delay), 10);

      if (isNaN(parsedDelay) || parsedDelay < 0) {
        this.logger.warn(
          `Invalid interpolated delay value for step '${stepName}': ${interpolated.delay}. Skipping delay.`
        );
        return;
      }

      delayMs = parsedDelay;
    } else if (
      typeof delayConfig === "object" &&
      "min" in delayConfig &&
      "max" in delayConfig
    ) {
      // Random range delay
      const min = delayConfig.min;
      const max = delayConfig.max;

      if (min < 0 || max < 0 || min > max) {
        this.logger.warn(
          `Invalid delay range for step '${stepName}': min=${min}, max=${max}. Skipping delay.`
        );
        return;
      }

      delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      this.logger.warn(
        `Invalid delay configuration for step '${stepName}'. Skipping delay.`
      );
      return;
    }

    if (delayMs > 0) {
      this.logger.info(
        `⏳ Waiting ${delayMs}ms before next step (step: ${stepName})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      this.logger.debug(`✅ Delay completed (${delayMs}ms)`);
    }
  }

  /**
   * Generates performance summary
   */
  getPerformanceSummary(): PerformanceSummary | undefined {
    const requests = this.performanceData.requests;

    if (requests.length === 0) {
      return undefined;
    }

    const totalTime = requests.reduce((sum, req) => sum + req.duration_ms, 0);
    const avgTime = totalTime / requests.length;
    const minTime = Math.min(...requests.map((r) => r.duration_ms));
    const maxTime = Math.max(...requests.map((r) => r.duration_ms));

    const totalExecutionTime = Date.now() - this.performanceData.start_time;
    const rps = (requests.length / totalExecutionTime) * 1000;

    // Calculates slowest endpoints
    const endpointStats = new Map<string, { total: number; count: number }>();
    requests.forEach((req) => {
      const key = `${req.method} ${req.url}`;
      const current = endpointStats.get(key) || { total: 0, count: 0 };
      current.total += req.duration_ms;
      current.count += 1;
      endpointStats.set(key, current);
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([url, stats]) => ({
        url,
        average_time_ms: stats.total / stats.count,
        call_count: stats.count,
      }))
      .sort((a, b) => b.average_time_ms - a.average_time_ms)
      .slice(0, 5);

    return {
      total_requests: requests.length,
      average_response_time_ms: Math.round(avgTime * 100) / 100,
      min_response_time_ms: minTime,
      max_response_time_ms: maxTime,
      requests_per_second: Math.round(rps * 100) / 100,
      slowest_endpoints: slowestEndpoints,
    };
  }

  /**
   * Validates that interactive inputs are only used in sequential execution mode
   */
  private validateInputCompatibility(
    tests: DiscoveredTest[],
    config: any
  ): void {
    const hasInputSteps = tests.some((test) => {
      try {
        // Read the test file to check for input steps
        const fs = require("fs");
        const yaml = require("js-yaml");
        const fileContent = fs.readFileSync(test.file_path, "utf8");
        const suite = yaml.load(fileContent) as any;

        return suite.steps?.some((step: any) => step.input);
      } catch (error) {
        // If we can't read the file, assume no input steps
        return false;
      }
    });

    if (hasInputSteps) {
      if (config.execution?.mode === "parallel") {
        const inputTests = tests.filter((test) => {
          try {
            const fs = require("fs");
            const yaml = require("js-yaml");
            const fileContent = fs.readFileSync(test.file_path, "utf8");
            const suite = yaml.load(fileContent) as any;
            return suite.steps?.some((step: any) => step.input);
          } catch {
            return false;
          }
        });

        const testNames = inputTests.map((t) => t.suite_name).join(", ");

        throw new Error(
          `❌ Interactive input steps detected in parallel execution mode!\n\n` +
            `Tests with input steps: ${testNames}\n\n` +
            `💡 Interactive inputs require sequential execution because:\n` +
            `   • Input steps block execution waiting for user input\n` +
            `   • Subsequent steps depend on input values\n` +
            `   • Parallel execution cannot wait for user interaction\n\n` +
            `🔧 Solutions:\n` +
            `   1. Set execution_mode: "sequential" in your config\n` +
            `   2. Remove input steps from test suites\n` +
            `   3. Use ci_default values for automated execution`
        );
      }

      // Force sequential mode if inputs are detected
      if (config.execution) {
        config.execution.mode = "sequential";
      }

      this.logger.warn(
        `⚠️  Interactive input steps detected - forcing sequential execution mode`
      );
      this.logger.info(
        `📋 Input steps will pause execution waiting for user interaction`
      );
    }
  }
}
