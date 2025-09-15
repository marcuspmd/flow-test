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
import { AssertionService } from "./assertion.service";
import { CaptureService } from "./capture.service";
import { ScenarioService } from "./scenario.service";
import { IterationService } from "./iteration.service";
import { getLogger } from "./logger.service";
import {
  DiscoveredTest,
  TestSuite,
  SuiteExecutionResult,
  StepExecutionResult,
  ExecutionStats,
  EngineHooks,
  PerformanceSummary,
  DependencyResult,
} from "../types/engine.types";

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

  // Serviços reutilizados da versão anterior
  private httpService: HttpService;
  private assertionService: AssertionService;
  private captureService: CaptureService;
  private scenarioService: ScenarioService;
  private iterationService: IterationService;

  // Estatísticas de performance
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
    hooks: EngineHooks = {}
  ) {
    this.configManager = configManager;
    this.globalVariables = globalVariables;
    this.priorityService = priorityService;
    this.dependencyService = dependencyService;
    this.globalRegistry = globalRegistry;
    this.hooks = hooks;

    const config = configManager.getConfig();

    // Initializes HTTP services with global configuration
    this.httpService = new HttpService(
      config.globals?.base_url,
      config.execution?.timeout || config.globals?.timeouts?.default || 60000
    );
    this.assertionService = new AssertionService();
    this.captureService = new CaptureService();
    this.iterationService = new IterationService();
    this.scenarioService = new ScenarioService();

    this.performanceData = {
      requests: [],
      start_time: Date.now(),
    };
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

    // 1. Builds dependency graph
    this.dependencyService.buildDependencyGraph(tests);

    // 2. Registers suites with exports in global registry
    this.registerSuitesWithExports(tests);

    // 3. Resolves execution order considering dependencies
    const orderedTests = this.dependencyService.resolveExecutionOrder(tests);

    this.logger.info(
      `Dependency-aware execution order resolved for ${orderedTests.length} test(s)`
    );
    if (config.execution!.mode === "parallel") {
      this.logger.warn(
        "Parallel execution with dependencies may be limited by dependency chains"
      );
    }

    // 4. Executes tests in resolved order
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

      // LIMPEZA DE VARIÁVEIS: Limpa variáveis não-globais antes de iniciar novo node
      // Isso garante que variáveis de runtime, suite e imported do node anterior não vazem para este node
      this.globalVariables.clearAllNonGlobalVariables();

      this.logger.info(
        `Starting fresh variable context for node '${discoveredTest.node_id}'`
      );

      // Configures suite variables
      if (suite.variables) {
        this.globalVariables.setSuiteVariables(suite.variables);
      }

      // Configures dependencies for variable resolution
      if (discoveredTest.depends && discoveredTest.depends.length > 0) {
        const dependencyNodeIds = discoveredTest.depends
          .map((dep) => (typeof dep === "string" ? dep : dep.node_id))
          .filter((nodeId): nodeId is string => nodeId !== undefined);
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

      // Executes all steps
      const stepResults: StepExecutionResult[] = [];
      let successfulSteps = 0;
      let failedSteps = 0;

      for (let i = 0; i < suite.steps.length; i++) {
        const step = suite.steps[i];

        try {
          const stepResult = await this.executeStep(step, suite, i);
          stepResults.push(stepResult);

          if (stepResult.status === "success") {
            successfulSteps++;
          } else if (stepResult.status === "failure") {
            failedSteps++;

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

          const errorStepResult: StepExecutionResult = {
            step_name: step.name,
            status: "failure",
            duration_ms: 0,
            error_message: `Step execution error: ${error}`,
            captured_variables: {},
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
      const totalSteps = suite.steps.length; // Use the intended number of steps, not just executed ones
      const successRate =
        totalSteps > 0 ? (successfulSteps / totalSteps) * 100 : 0;

      const result: SuiteExecutionResult = {
        node_id: suite.node_id,
        suite_name: suite.suite_name,
        file_path: discoveredTest.file_path,
        priority: discoveredTest.priority,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: duration,
        status: failedSteps === 0 ? "success" : "failure",
        steps_executed: totalSteps,
        steps_successful: successfulSteps,
        steps_failed: failedSteps,
        success_rate: Math.round(successRate * 100) / 100,
        steps_results: stepResults,
        variables_captured: this.getExportedVariables(discoveredTest),
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
      };

      // Fires suite end hook
      await this.hooks.onSuiteEnd?.(suite, result);

      return result;
    } catch (error) {
      const endTime = new Date();

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
    stepIndex: number,
    stepStartTime: number,
    context: any
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
              const interpolatedRequest = this.globalVariables.interpolate(
                scenario.then.request
              );
              httpResult = await this.httpService.executeRequest(
                step.name,
                interpolatedRequest
              );
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
        return {
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
      }

      const stepResult: StepExecutionResult = {
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
    step: any,
    suite: TestSuite,
    stepIndex: number
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
    };

    await this.hooks.onStepStart?.(step, context);

    try {
      // Check if step has iteration configuration - if so, execute multiple times
      if (step.iterate) {
        return await this.executeIteratedStep(
          step,
          suite,
          stepIndex,
          stepStartTime,
          context
        );
      }

      // Check if step has scenarios WITHOUT request - if so, use scenario-based execution
      if (step.scenarios && Array.isArray(step.scenarios) && !step.request) {
        return await this.executeScenarioStep(
          step,
          suite,
          stepIndex,
          stepStartTime,
          context
        );
      }

      // 1. Interpolates variables in request
      const interpolatedRequest = this.globalVariables.interpolate(
        step.request
      );

      // 2. Executes HTTP request
      const httpResult = await this.httpService.executeRequest(
        step.name,
        interpolatedRequest
      );

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
      let assertionResults: any[] = [];
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

      // 4. Captures variables
      let capturedVariables: Record<string, any> = {};
      if (step.capture && httpResult.response_details) {
        // Get current variables for capture context
        const currentVariables = this.globalVariables.getAllVariables();

        capturedVariables = this.captureService.captureVariables(
          step.capture,
          httpResult,
          currentVariables
        );
        httpResult.captured_variables = capturedVariables;

        // Immediately update runtime variables so they're available for next steps
        if (Object.keys(capturedVariables).length > 0) {
          this.globalVariables.setRuntimeVariables(
            this.processCapturedVariables(capturedVariables, suite)
          );
        }
      }

      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      const stepResult: StepExecutionResult = {
        step_name: step.name,
        status: httpResult.status,
        duration_ms: stepDuration,
        request_details: httpResult.request_details,
        response_details: httpResult.response_details,
        assertions_results: assertionResults,
        captured_variables: capturedVariables,
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
        step_name: step.name,
        status: "failure",
        duration_ms: stepDuration,
        error_message: `Step execution error: ${error}`,
        captured_variables: {},
        available_variables: this.filterAvailableVariables(
          this.globalVariables.getAllVariables()
        ),
      };

      // Fires step end hook even with error
      await this.hooks.onStepEnd?.(step, errorResult, context);

      return errorResult;
    }
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
    if (!test.exports || test.exports.length === 0) return;

    const runtimeVars = this.globalVariables.getVariablesByScope("runtime");

    for (const exportName of test.exports) {
      // Look for the variable in runtime (it should be there if it was captured)
      const value = runtimeVars[exportName];

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
    context: any
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

          this.logger.info(
            `[${iterationStepName}] Starting iteration ${i + 1} of ${
              iterationContexts.length
            }`
          );

          // Execute the step for this iteration
          const iterationResult = await this.executeStep(
            iterationStep,
            suite,
            stepIndex
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
}
