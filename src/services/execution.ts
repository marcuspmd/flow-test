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
import { ConfigManager } from "../core/config";
import { GlobalVariablesService } from "./global-variables";
import { PriorityService } from "./priority";
import { DependencyService } from "./dependency.service";
import { GlobalRegistryService } from "./global-registry.service";
import { HttpService } from "./http.service";
import { CertificateService } from "./certificate.service";
import { AssertionService } from "./assertion.service";
import { CaptureService } from "./capture.service";
import { ComputedService } from "./computed.service";
import { DynamicExpressionService } from "./dynamic-expression.service";
import { ScenarioService } from "./scenario.service";
import { IterationService } from "./iteration.service";
import { InputService } from "./input.service";
import { getLogger } from "./logger.service";
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
} from "../types/engine.types";
import type {
  StepCallExecutionOptions,
  StepCallRequest,
  StepCallResult,
  StepExecutionHandlerInput,
} from "../types/call.types";
import { DynamicVariableAssignment } from "../types/common.types";
import { CallService } from "./call.service";
import { EngineExecutionOptions } from "../types/config.types";

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
  private globalVariables: GlobalVariablesService;
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
  private stepCallStack: string[] = [];

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
    globalVariables: GlobalVariablesService,
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

    // Initialize certificate service if certificates are configured
    if (
      config.globals?.certificates &&
      config.globals.certificates.length > 0
    ) {
      this.certificateService = new CertificateService(
        config.globals.certificates
      );
      this.logger.info(
        "Certificate service initialized with global certificates"
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

    this.performanceData = {
      requests: [],
      start_time: Date.now(),
    };
  }

  private buildDynamicContext(
    suite: TestSuite,
    step: TestStep,
    variables: Record<string, any>,
    contextData?: {
      captured?: Record<string, any>;
      response?: StepExecutionResult["response_details"];
      request?: StepExecutionResult["request_details"];
      extras?: Record<string, any>;
    }
  ) {
    return {
      variables,
      stepName: step.name,
      suiteNodeId: suite.node_id,
      suiteName: suite.suite_name,
      timestamp: new Date().toISOString(),
      captured: contextData?.captured,
      response: contextData?.response,
      request: contextData?.request,
      extras: contextData?.extras,
    };
  }

  private applyDynamicAssignments(
    assignments: DynamicVariableAssignment[],
    suite: TestSuite
  ): Record<string, any> {
    const applied: Record<string, any> = {};

    for (const assignment of assignments) {
      this.globalVariables.setVariable(
        assignment.name,
        assignment.value,
        assignment.scope
      );

      if (assignment.persist || assignment.scope === "global") {
        this.globalRegistry.setExportedVariable(
          suite.node_id,
          assignment.name,
          assignment.value
        );
      }

      applied[assignment.name] = assignment.value;
    }

    return applied;
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

        // Executes the test
        const result = await this.executeSingleTest(test);
        results.push(result);

        // Captures exported variables and registers in Global Registry
        if (
          test.exports &&
          test.exports.length > 0 &&
          result.status === "success"
        ) {
          this.captureAndRegisterExports(test, result);
        }

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
            this.globalVariables.getAllVariables()
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
            available_variables: this.filterAvailableVariables({
              ...this.globalVariables.getAllVariables(),
              ...this.globalVariables.getVariablesByScope("runtime"),
            }),
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
        this.httpService = new HttpService(
          interpolatedBaseUrl,
          this.configManager.getConfig().execution?.timeout || 60000
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
              this.globalVariables.getAllVariables()
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

      const result: SuiteExecutionResult = {
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
        variables_captured: this.getExportedVariables(discoveredTest),
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
        suite_yaml_content: suiteYamlContent,
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
          this.globalVariables.getAllVariables()
        ),
        suite_yaml_content: suiteYamlContent,
      };

      return errorResult;
    }
  }

  /**
   * Filters out environment variables and shows only relevant variables
   */
  private filterAvailableVariables(
    variables: Record<string, any>
  ): Record<string, any> {
    const filtered: Record<string, any> = {};

    // Get environment variables to exclude
    const envVarsToExclude = this.getEnvironmentVariablesToExclude();

    // Patterns for relevant variables (captured, config, and test-related)
    const relevantPatterns = [
      /^captured_/, // Captured variables from current flow
      /^config_/, // Configuration variables
      /^test_/, // Test-specific variables
      /^auth_/, // Authentication variables
      /^api_/, // API-related variables
      /^flow_/, // Flow-specific variables
      /^suite_/, // Suite-level variables
      /^base_/, // Base configuration (like base_url)
      /^current_/, // Current context variables
      /^result_/, // Result variables
      /^scenario_/, // Scenario variables
    ];

    // Get all exported variables (these are always relevant)
    const exportedVariables = this.globalRegistry.getAllExportedVariables();
    const exportedVariableNames = new Set(Object.keys(exportedVariables));

    for (const [key, value] of Object.entries(variables)) {
      // Skip if it's an environment variable
      if (envVarsToExclude.has(key)) {
        continue;
      }

      // Always include exported variables (they have namespaces like "nodeId.variable")
      if (exportedVariableNames.has(key)) {
        filtered[key] = value;
        continue;
      }

      // Include if it matches relevant patterns
      const isRelevant = relevantPatterns.some((pattern) => pattern.test(key));
      if (isRelevant) {
        // Check if this variable has a namespaced exported version
        // If it does, skip the non-namespaced version to avoid duplicates
        let hasNamespacedVersion = false;
        for (const exportedVarName of exportedVariableNames) {
          if (exportedVarName.endsWith(`.${key}`)) {
            hasNamespacedVersion = true;
            break;
          }
        }

        if (!hasNamespacedVersion) {
          filtered[key] = value;
        }
      }
    }

    return filtered;
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
   * Executes a step that has scenarios (conditional execution)
   */
  private async executeScenarioStep(
    step: any,
    suite: TestSuite,
    _stepIndex: number,
    stepStartTime: number,
    context: any,
    identifiers: StepIdentifiers
  ): Promise<StepExecutionResult> {
    try {
      // First, try to find a scenario that matches the current conditions
      let executedScenario = false;
      const evaluations: any[] = [];
      let httpResult: any = null;
      let assertionResults: any[] = [];
      let capturedVariables: Record<string, any> = {};

      for (let i = 0; i < step.scenarios.length; i++) {
        const scenario = step.scenarios[i];
        try {
          // Evaluate the condition using current variables
          const conditionMet = this.evaluateScenarioCondition(
            scenario.condition
          );

          if (conditionMet && scenario.then) {
            this.logger.info(`Executing scenario: ${scenario.condition}`);

            // Execute the scenario's request if it exists
            if (scenario.then.request) {
              const rawScenarioUrl = scenario.then.request?.url;
              const interpolatedRequest = this.globalVariables.interpolate(
                scenario.then.request
              );
              httpResult = await this.httpService.executeRequest(
                step.name,
                interpolatedRequest
              );
              this.attachRawUrlToResult(httpResult, rawScenarioUrl);
              this.recordPerformanceData(interpolatedRequest, httpResult);
            }

            // Execute assertions from scenario
            if (scenario.then.assert && httpResult?.response_details) {
              const interpolatedAssertions = this.globalVariables.interpolate(
                scenario.then.assert
              );
              assertionResults = this.assertionService.validateAssertions(
                interpolatedAssertions,
                httpResult
              );
              httpResult.assertions_results = assertionResults;

              const failedAssertions = assertionResults.filter(
                (a) => !a.passed
              );
              if (failedAssertions.length > 0) {
                httpResult.status = "failure";
                httpResult.error_message = `${failedAssertions.length} assertion(s) failed`;
              }
            }

            // Execute captures from scenario
            if (scenario.then.capture && httpResult?.response_details) {
              const currentVariables = this.globalVariables.getAllVariables();
              capturedVariables = this.captureService.captureVariables(
                scenario.then.capture,
                httpResult,
                currentVariables
              );
              httpResult.captured_variables = capturedVariables;

              if (Object.keys(capturedVariables).length > 0) {
                this.globalVariables.setRuntimeVariables(
                  this.processCapturedVariables(capturedVariables, suite)
                );
              }
            }

            executedScenario = true;

            evaluations.push({
              index: i + 1,
              condition: scenario.condition,
              matched: true,
              executed: true,
              branch: "then",
              assertions_added: assertionResults.length,
              captures_added: Object.keys(capturedVariables || {}).length,
            });

            break;
          }

          // Not matched (or no 'then') -> record evaluation row
          evaluations.push({
            index: i + 1,
            condition: scenario.condition,
            matched: conditionMet,
            executed: false,
            branch: "none",
            assertions_added: 0,
            captures_added: 0,
          });
        } catch (error) {
          this.logger.warn(
            `Error evaluating scenario condition: ${scenario.condition}`,
            { error: error as Error }
          );
        }
      }

      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      if (!executedScenario) {
        // No scenario matched - this is OK, just skip execution
        this.logger.info(`No scenarios matched for step: ${step.name}`);
        const skippedResult: StepExecutionResult = {
          step_id: identifiers.stepId,
          qualified_step_id: identifiers.qualifiedStepId,
          step_name: step.name,
          status: "skipped",
          duration_ms: stepDuration,
          captured_variables: {},
          available_variables: this.filterAvailableVariables(
            this.globalVariables.getAllVariables()
          ),
          error_message: "No matching scenario conditions",
          scenarios_meta: {
            has_scenarios: true,
            executed_count: 0,
            evaluations,
          } as any,
        };

        await this.hooks.onStepEnd?.(step, skippedResult, context);
        return skippedResult;
      }

      const stepResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: httpResult?.status || "success",
        duration_ms: stepDuration,
        request_details: httpResult?.request_details,
        response_details: httpResult?.response_details,
        assertions_results: assertionResults,
        captured_variables: capturedVariables,
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
        scenarios_meta: {
          has_scenarios: true,
          executed_count: 1,
          evaluations,
        } as any,
        error_message: httpResult?.error_message,
      };

      await this.hooks.onStepEnd?.(step, stepResult, context);
      return stepResult;
    } catch (error) {
      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      const errorResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "failure",
        duration_ms: stepDuration,
        error_message: `Scenario execution error: ${error}`,
        captured_variables: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
      };

      await this.hooks.onStepEnd?.(step, errorResult, context);
      return errorResult;
    }
  }

  /**
   * Evaluates a scenario condition using current variables
   */
  private evaluateScenarioCondition(condition: string): boolean {
    try {
      // Get current variables for evaluation context
      const allVars = this.globalVariables.getAllVariables();
      const context = {
        ...allVars,
        variables: allVars,
      };

      // Simple evaluation for now - we can improve this later
      // Handle common patterns like "payment_approved == 'true'"
      const interpolatedCondition = this.globalVariables.interpolate(condition);

      // If condition contains JavaScript-like operators, try to evaluate
      if (
        interpolatedCondition.includes("==") ||
        interpolatedCondition.includes("!=") ||
        interpolatedCondition.includes("&&") ||
        interpolatedCondition.includes("||")
      ) {
        // Simple string-based evaluation for now
        // This is a basic implementation - could be enhanced with proper JS evaluation
        if (interpolatedCondition.includes("== 'true'")) {
          const varName = interpolatedCondition.split("== 'true'")[0].trim();
          return allVars[varName] === "true" || allVars[varName] === true;
        }

        if (interpolatedCondition.includes("== true")) {
          const varName = interpolatedCondition.split("== true")[0].trim();
          return allVars[varName] === true || allVars[varName] === "true";
        }

        return false;
      }

      // For simple variable checks
      return Boolean(allVars[condition]);
    } catch (error) {
      this.logger.warn(`Error evaluating condition: ${condition}`, {
        error: error as Error,
      });
      return false;
    }
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

    if (!shouldExecute) {
      const skippedResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "skipped",
        duration_ms: 0,
        captured_variables: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
      };

      this.logger.info(
        `Skipping step '${step.name}' (${identifiers.stepId}) due to step filter`
      );

      await this.hooks.onStepEnd?.(step, skippedResult, context);
      return skippedResult;
    }

    try {
      if (step.call) {
        const callStepResult = await this.executeCallStep(
          step,
          suite,
          stepIndex,
          identifiers,
          context,
          discoveredTest
        );

        await this.hooks.onStepEnd?.(step, callStepResult, context);
        return callStepResult;
      }

      // Initialize captured variables and assertion results for all steps
      let capturedVariables: Record<string, any> = {};
      let assertionResults: any[] = [];

      // Check if step has iteration configuration - if so, execute multiple times
      if (step.iterate) {
        return await this.executeIteratedStep(
          step,
          suite,
          stepIndex,
          stepStartTime,
          context,
          identifiers,
          discoveredTest
        );
      }

      // Check if step has scenarios WITHOUT request - if so, use scenario-based execution
      if (step.scenarios && Array.isArray(step.scenarios) && !step.request) {
        return await this.executeScenarioStep(
          step,
          suite,
          stepIndex,
          stepStartTime,
          context,
          identifiers
        );
      }

      // Validate that step has either request or input
      if (!step.request && !step.input) {
        throw new Error(
          `Step '${step.name}' must have either 'request' or 'input' configuration`
        );
      }

      let httpResult: any = null;

      // 1. Execute HTTP request if present
      if (step.request) {
        // Interpolates variables in request
        const rawRequestUrl = step.request?.url;
        const interpolatedRequest = this.globalVariables.interpolate(
          step.request
        );

        // 2. Executes HTTP request
        httpResult = await this.httpService.executeRequest(
          step.name,
          interpolatedRequest
        );

        this.attachRawUrlToResult(httpResult, rawRequestUrl);

        // Records performance data
        this.recordPerformanceData(interpolatedRequest, httpResult);

        // 3. Process scenarios if they exist
        if (
          step.scenarios &&
          Array.isArray(step.scenarios) &&
          httpResult.response_details
        ) {
          // Interpolate variables in scenarios before processing
          const interpolatedScenarios = this.globalVariables.interpolate(
            step.scenarios
          );

          this.scenarioService.processScenarios(
            interpolatedScenarios,
            httpResult,
            "verbose"
          );
        }

        // 4. Executes assertions
        if (step.assert && httpResult.response_details) {
          // Interpolate assertion values before validation
          const interpolatedAssertions = this.globalVariables.interpolate(
            step.assert
          );

          assertionResults = this.assertionService.validateAssertions(
            interpolatedAssertions,
            httpResult
          );
          httpResult.assertions_results = assertionResults;

          const failedAssertions = assertionResults.filter((a) => !a.passed);
          if (failedAssertions.length > 0) {
            httpResult.status = "failure";
            httpResult.error_message = `${failedAssertions.length} assertion(s) failed`;
          }
        }

        // 5. Captures variables
        // First, include any variables captured by scenarios
        if (httpResult.captured_variables) {
          capturedVariables = { ...httpResult.captured_variables };

          // Make sure scenario-captured variables are also available globally
          if (Object.keys(capturedVariables).length > 0) {
            this.globalVariables.setRuntimeVariables(
              this.processCapturedVariables(capturedVariables, suite)
            );
          }
        }

        if (step.capture && httpResult.response_details) {
          // Get current variables for capture context
          const currentVariables = this.globalVariables.getAllVariables();

          const stepCapturedVariables = this.captureService.captureVariables(
            step.capture,
            httpResult,
            currentVariables
          );

          // Merge step captures with scenario captures
          capturedVariables = {
            ...capturedVariables,
            ...stepCapturedVariables,
          };
          httpResult.captured_variables = capturedVariables;

          // Immediately update runtime variables so they're available for next steps
          if (Object.keys(stepCapturedVariables).length > 0) {
            this.globalVariables.setRuntimeVariables(
              this.processCapturedVariables(stepCapturedVariables, suite)
            );
          }
        }
      } else {
        // For steps without request, create a mock result
        httpResult = {
          status: "success",
          status_code: 200,
          response_time: 0,
          captured_variables: {},
        };
      }

      // Use captured variables from HTTP execution if available
      if (step.request && httpResult.captured_variables) {
        capturedVariables = { ...httpResult.captured_variables };
      }

      let inputResultsForStep: InputResult[] | undefined;
      const stepDynamicAssignments: DynamicVariableAssignment[] = [];

      // 6. Process interactive input(s) if configured
      if (step.input) {
        try {
          // Set execution context for interactive inputs
          const executionContext: InputExecutionContext = {
            suite_name: suite.suite_name,
            suite_path: discoveredTest?.file_path,
            step_name: step.name,
            step_id: step.step_id,
            step_index: stepIndex,
            cache_key: `${suite.node_id || suite.suite_name}::${step.name}`,
          };
          this.inputService.setExecutionContext(executionContext);

          const currentVariables = this.globalVariables.getAllVariables();
          const inputResult = await this.inputService.promptUser(
            step.input,
            currentVariables
          );

          // Handle single or multiple input results
          const inputResults = Array.isArray(inputResult)
            ? inputResult
            : [inputResult];
          inputResultsForStep = inputResults;
          const inputConfigs = Array.isArray(step.input)
            ? step.input
            : [step.input];

          if (!httpResult.captured_variables) {
            httpResult.captured_variables = {};
          }

          const createDynamicContext = () =>
            this.buildDynamicContext(
              suite,
              step,
              this.globalVariables.getAllVariables(),
              {
                captured: {
                  ...(httpResult.captured_variables ?? {}),
                },
                response: httpResult.response_details,
                request: httpResult.request_details,
              }
            );

          let inputProcessedSuccessfully = true;
          const triggeredVariables = new Set<string>();
          let lastSuccessfulInput: InputResult | undefined;

          inputResults.forEach((result, index) => {
            const config =
              inputConfigs[Math.min(index, inputConfigs.length - 1)];
            if (Array.isArray(step.input)) {
              this.logger.info(`📝 Processing input: ${result.variable}`);
            } else {
              this.logger.info(`📝 Prompting for input: ${result.variable}`);
            }

            if (result.validation_passed) {
              // Store input result as a variable
              this.globalVariables.setRuntimeVariable(
                result.variable,
                result.value
              );
              triggeredVariables.add(result.variable);
              lastSuccessfulInput = result;

              this.logger.info(
                `✅ Input captured: ${result.variable} = ${
                  result.used_default ? "(default)" : "(user input)"
                }`
              );

              // Add input result to captured variables for this step
              httpResult.captured_variables[result.variable] = result.value;
              capturedVariables[result.variable] = result.value;

              const dynamicContext = createDynamicContext();

              const dynamicOutcome =
                this.dynamicExpressionService.processInputDynamics(
                  result,
                  config.dynamic,
                  dynamicContext
                );

              if (dynamicOutcome.assignments.length > 0) {
                const applied = this.applyDynamicAssignments(
                  dynamicOutcome.assignments,
                  suite
                );
                stepDynamicAssignments.push(...dynamicOutcome.assignments);
                result.derived_assignments = dynamicOutcome.assignments;
                Object.assign(httpResult.captured_variables, applied);
                Object.assign(capturedVariables, applied);
                dynamicOutcome.assignments.forEach((assignment) => {
                  triggeredVariables.add(assignment.name);
                });
              }

              if (dynamicOutcome.registeredDefinitions.length > 0) {
                this.dynamicExpressionService.registerDefinitions(
                  dynamicOutcome.registeredDefinitions
                );
              }
            } else {
              this.logger.error(
                `❌ Input validation failed for ${result.variable}: ${result.validation_error}`
              );
              inputProcessedSuccessfully = false;
              // Continue processing other inputs but mark as partially failed
            }
          });

          if (triggeredVariables.size > 0) {
            const reevaluatedAssignments =
              this.dynamicExpressionService.reevaluate(
                Array.from(triggeredVariables),
                lastSuccessfulInput,
                createDynamicContext()
              );

            if (reevaluatedAssignments.length > 0) {
              const applied = this.applyDynamicAssignments(
                reevaluatedAssignments,
                suite
              );
              stepDynamicAssignments.push(...reevaluatedAssignments);
              if (lastSuccessfulInput) {
                lastSuccessfulInput.derived_assignments = [
                  ...(lastSuccessfulInput.derived_assignments ?? []),
                  ...reevaluatedAssignments,
                ];
              }
              Object.assign(httpResult.captured_variables, applied);
              Object.assign(capturedVariables, applied);
            }
          }

          // Update the final captured variables reference
          if (
            httpResult.captured_variables &&
            Object.keys(httpResult.captured_variables).length > 0
          ) {
            capturedVariables = {
              ...capturedVariables,
              ...httpResult.captured_variables,
            };
          }

          // If this was an input-only step and inputs failed, mark the step as failed
          if (!step.request && !inputProcessedSuccessfully) {
            httpResult.status = "failure";
            httpResult.error_message = "One or more input validations failed";
          }
        } catch (error) {
          this.logger.error(`❌ Input processing error: ${error}`);
          // If this was an input-only step and input failed, mark the step as failed
          if (!step.request) {
            httpResult.status = "failure";
            httpResult.error_message = `Input processing error: ${error}`;
          }
        }
      }

      // 7. Process step.capture after input (similar to request capture)
      // This allows capturing/transforming input values, just like we do with request responses
      if (step.input && step.capture) {
        try {
          const currentVariables = this.globalVariables.getAllVariables();

          // Use captureFromObject which supports both JMESPath and JavaScript expressions
          // Context includes all current variables (including the input that was just captured)
          const stepCapturedVariables = this.captureService.captureFromObject(
            step.capture,
            currentVariables, // source object for JMESPath
            currentVariables // variable context for {{js:...}} and {{...}}
          );

          // Merge with existing captured variables
          capturedVariables = {
            ...capturedVariables,
            ...stepCapturedVariables,
          };

          // Update runtime variables immediately so they're available for next steps
          if (Object.keys(stepCapturedVariables).length > 0) {
            this.globalVariables.setRuntimeVariables(
              this.processCapturedVariables(stepCapturedVariables, suite)
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ Error processing step.capture after input: ${error}`
          );
          // Don't fail the step, just log the error
        }
      }

      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      const stepResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: httpResult.status,
        duration_ms: stepDuration,
        request_details: httpResult.request_details,
        response_details: httpResult.response_details,
        assertions_results: assertionResults,
        captured_variables: capturedVariables,
        ...(inputResultsForStep ? { input_results: inputResultsForStep } : {}),
        ...(stepDynamicAssignments.length > 0
          ? { dynamic_assignments: stepDynamicAssignments }
          : {}),
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
        scenarios_meta: (httpResult as any).scenarios_meta,
        error_message: httpResult.error_message,
      };

      // Fires step end hook
      await this.hooks.onStepEnd?.(step, stepResult, context);

      return stepResult;
    } catch (error) {
      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      const errorResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "failure",
        duration_ms: stepDuration,
        error_message: `Step execution error: ${error}`,
        captured_variables: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
      };

      if (step.request?.url) {
        errorResult.request_details = {
          method: step.request?.method || "GET",
          url: step.request?.url,
          raw_url: step.request?.url,
          base_url: this.httpService.getBaseUrl(),
        };

        this.attachRawUrlToResult(errorResult, step.request?.url);
      }

      // Fires step end hook even with error
      await this.hooks.onStepEnd?.(step, errorResult, context);

      return errorResult;
    }
  }

  private async executeCallStep(
    step: TestStep,
    suite: TestSuite,
    stepIndex: number,
    identifiers: StepIdentifiers,
    _context: Record<string, any>,
    discoveredTest?: DiscoveredTest
  ): Promise<StepExecutionResult> {
    if (!step.call) {
      throw new Error("Step call configuration not found");
    }

    const incompatibleFields: string[] = [];
    if (step.request) incompatibleFields.push("request");
    if (step.iterate) incompatibleFields.push("iterate");
    if (step.input) incompatibleFields.push("input");
    if (step.scenarios && step.scenarios.length > 0)
      incompatibleFields.push("scenarios");

    if (incompatibleFields.length > 0) {
      throw new Error(
        `Step '${
          step.name
        }' cannot define 'call' alongside [${incompatibleFields.join(", ")}]`
      );
    }

    const callerSuitePath = discoveredTest?.file_path;
    if (!callerSuitePath) {
      throw new Error(
        `Cannot execute step call from suite '${suite.suite_name}' without a caller suite path`
      );
    }

    const callConfig = step.call;
    const callStartTime = Date.now();

    if (
      callConfig.variables &&
      (typeof callConfig.variables !== "object" ||
        Array.isArray(callConfig.variables))
    ) {
      throw new Error(
        `Call variables for step '${step.name}' must be an object with key/value pairs`
      );
    }

    if (
      callConfig.on_error &&
      !["fail", "continue", "warn"].includes(callConfig.on_error)
    ) {
      throw new Error(
        `Invalid call error strategy '${callConfig.on_error}' in step '${step.name}'. Allowed values: fail, continue, warn`
      );
    }

    if (typeof callConfig.test !== "string") {
      throw new Error(
        `Call configuration for step '${step.name}' must define 'test' as string`
      );
    }

    if (typeof callConfig.step !== "string") {
      throw new Error(
        `Call configuration for step '${step.name}' must define 'step' as string`
      );
    }

    const resolvedTestPath = this.globalVariables
      .interpolateString(callConfig.test)
      .trim();
    const resolvedStepKey = this.globalVariables
      .interpolateString(callConfig.step)
      .trim();

    if (!resolvedTestPath || !resolvedStepKey) {
      throw new Error(
        `Invalid call configuration for step '${step.name}': both 'test' and 'step' are required`
      );
    }

    const interpolatedVariables = this.interpolateCallVariables(
      callConfig.variables
    );
    const isolateContext = callConfig.isolate_context ?? true;

    const allowedRoot = path.resolve(
      this.configManager.getConfig().test_directory
    );

    const callRequest: StepCallRequest = {
      test: resolvedTestPath,
      step: resolvedStepKey,
      variables: interpolatedVariables,
      isolate_context: isolateContext,
      timeout: callConfig.timeout,
      retry: callConfig.retry,
      on_error: callConfig.on_error,
    };

    const callOptions: StepCallExecutionOptions = {
      callerSuitePath,
      callerNodeId: suite.node_id,
      callerSuiteName: suite.suite_name,
      allowedRoot,
      callStack: this.stepCallStack,
    };

    const callLabel = `${resolvedTestPath}::${resolvedStepKey}`;

    this.logger.info(
      `📞 Calling step '${callLabel}' (isolate=${isolateContext})`,
      {
        stepName: step.name,
        metadata: {
          type: "step_call",
          internal: true,
          suite: suite.suite_name,
        },
      }
    );

    const callResult = await this.callService.executeStepCall(
      callRequest,
      callOptions
    );

    const duration = Date.now() - callStartTime;
    const status =
      callResult.status ?? (callResult.success ? "success" : "failure");

    if (callResult.success) {
      this.logger.info(
        `✅ Step call '${callLabel}' completed in ${duration}ms`,
        {
          stepName: step.name,
          metadata: {
            type: "step_call",
            internal: true,
            suite: suite.suite_name,
          },
        }
      );
    } else {
      this.logger.warn(
        `⚠️ Step call '${callLabel}' finished with status '${status}'`,
        {
          stepName: step.name,
          metadata: {
            type: "step_call",
            internal: true,
            suite: suite.suite_name,
          },
        }
      );
    }

    const propagatedVariables = callResult.propagated_variables;
    if (callResult.success && propagatedVariables) {
      this.globalVariables.setRuntimeVariables(propagatedVariables);
    }

    const availableVariables = this.filterAvailableVariables(
      this.globalVariables.getAllVariables()
    );

    const requestHeaders: Record<string, string> = {
      "x-step-call-target": resolvedStepKey,
      "x-step-call-isolation": isolateContext ? "true" : "false",
    };

    const stepResult: StepExecutionResult = {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status,
      duration_ms: duration,
      request_details: {
        method: "CALL",
        url: resolvedTestPath,
        raw_url: callConfig.test,
        headers: requestHeaders,
        body: interpolatedVariables,
        base_url: suite.base_url,
      },
      ...(propagatedVariables && Object.keys(propagatedVariables).length > 0
        ? { captured_variables: propagatedVariables }
        : {}),
      available_variables: availableVariables,
      error_message: callResult.error,
    };

    return stepResult;
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
        this.globalVariables.clearAllNonGlobalVariables();
      }

      if (request.variables && Object.keys(request.variables).length > 0) {
        this.globalVariables.setRuntimeVariables(request.variables);
      }

      if (resolved.suite.variables) {
        if (shouldIsolate) {
          this.globalVariables.setSuiteVariables(resolved.suite.variables);
        } else {
          const interpolatedSuiteVars = this.globalVariables.interpolate(
            this.cloneData(resolved.suite.variables)
          );
          this.globalVariables.setRuntimeVariables(interpolatedSuiteVars);
        }
      }

      const baseUrl = resolved.suite.base_url
        ? this.globalVariables.interpolateString(resolved.suite.base_url)
        : previousHttpService.getBaseUrl();
      const timeout =
        request.timeout ??
        this.configManager.getConfig().execution?.timeout ??
        60000;

      this.httpService = new HttpService(baseUrl, timeout);

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
    const runtimeVars = this.globalVariables.getVariablesByScope("runtime");
    const allCapturedVars = this.getAllCapturedVariables(result);

    // Merge all sources (runtime takes precedence)
    const allAvailableVars = { ...allCapturedVars, ...runtimeVars };

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
   * Executes a step with iteration configuration multiple times
   */
  private async executeIteratedStep(
    step: any,
    suite: TestSuite,
    stepIndex: number,
    stepStartTime: number,
    context: any,
    identifiers: StepIdentifiers,
    discoveredTest?: DiscoveredTest
  ): Promise<StepExecutionResult> {
    try {
      // Validate iteration configuration
      const validationErrors = this.iterationService.validateIteration(
        step.iterate
      );
      if (validationErrors.length > 0) {
        throw new Error(
          `Invalid iteration configuration: ${validationErrors.join(", ")}`
        );
      }

      // Expand iteration into contexts
      const variableContext = this.globalVariables.getAllVariables();
      const iterationContexts = this.iterationService.expandIteration(
        step.iterate,
        variableContext
      );

      if (iterationContexts.length === 0) {
        this.logger.warn(`No iterations to execute for step "${step.name}"`);
        return {
          step_id: identifiers.stepId,
          qualified_step_id: identifiers.qualifiedStepId,
          step_name: step.name,
          status: "success",
          duration_ms: Date.now() - stepStartTime,
          request_details: undefined,
          response_details: undefined,
          assertions_results: [],
          captured_variables: {},
          available_variables: variableContext,
        };
      }

      // Execute each iteration
      const iterationResults: StepExecutionResult[] = [];
      let allIterationsSuccessful = true;

      for (let i = 0; i < iterationContexts.length; i++) {
        const iterationContext = iterationContexts[i];

        // Create a snapshot of current variables to restore later
        const variableSnapshot = this.globalVariables.createSnapshot();

        try {
          // Set iteration variable in context
          this.globalVariables.setRuntimeVariable(
            iterationContext.variableName,
            iterationContext.value
          );

          // Create iteration-specific step name
          const iterationStepName = `${step.name} [${i + 1}/${
            iterationContexts.length
          }]`;
          const iterationStep = {
            ...step,
            name: iterationStepName,
            iterate: undefined, // Remove iterate to prevent infinite recursion
          };

          const iterationIdentifiers: StepIdentifiers = {
            stepId: `${identifiers.stepId}-iter-${i + 1}`,
            qualifiedStepId: `${suite.node_id}::${identifiers.stepId}-iter-${
              i + 1
            }`,
            normalizedQualifiedStepId: `${this.normalizeSuiteId(
              suite.node_id
            )}::${identifiers.stepId}-iter-${i + 1}`,
          };

          iterationStep.step_id = iterationIdentifiers.stepId;

          this.logger.info(
            `[${iterationStepName}] Starting iteration ${i + 1} of ${
              iterationContexts.length
            }`
          );

          // Execute the step for this iteration
          const iterationResult = await this.executeStep(
            iterationStep,
            suite,
            stepIndex,
            iterationIdentifiers,
            true,
            discoveredTest
          );
          iterationResults.push(iterationResult);

          if (iterationResult.status !== "success") {
            allIterationsSuccessful = false;

            // Check if should stop on first failure
            if (!step.continue_on_failure) {
              this.logger.warn(
                `[${iterationStepName}] Stopping iterations due to failure`
              );
              break;
            }
          }
        } finally {
          // Restore variable state (removing iteration variable)
          variableSnapshot();
        }
      }

      // Combine results from all iterations
      const totalDuration = Date.now() - stepStartTime;
      const combinedCapturedVariables: Record<string, any> = {};
      const combinedAssertions: any[] = [];

      // Merge captured variables and assertions from all iterations
      iterationResults.forEach((result, index) => {
        if (result.captured_variables) {
          Object.entries(result.captured_variables).forEach(([key, value]) => {
            // Prefix with iteration index to avoid conflicts
            combinedCapturedVariables[`${key}_iteration_${index}`] = value;
          });
        }
        if (result.assertions_results) {
          combinedAssertions.push(...result.assertions_results);
        }
      });

      return {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: allIterationsSuccessful ? "success" : "failure",
        duration_ms: totalDuration,
        request_details: iterationResults[0]?.request_details || undefined,
        response_details:
          iterationResults[iterationResults.length - 1]?.response_details ||
          undefined,
        assertions_results: combinedAssertions,
        captured_variables: combinedCapturedVariables,
        available_variables: this.globalVariables.getAllVariables(),
        iteration_results: iterationResults, // Include individual iteration results
      };
    } catch (error: any) {
      this.logger.error(
        `Error executing iterated step "${step.name}": ${error.message}`
      );

      return {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "failure",
        duration_ms: Date.now() - stepStartTime,
        request_details: undefined,
        response_details: undefined,
        assertions_results: [],
        captured_variables: {},
        available_variables: this.globalVariables.getAllVariables(),
        error_message: error.message,
      };
    }
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
