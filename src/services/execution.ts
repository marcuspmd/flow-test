import fs from "fs";
import yaml from "js-yaml";
import { ConfigManager } from "../core/config";
import { GlobalVariablesService } from "./global-variables";
import { PriorityService } from "./priority";
import { DependencyService } from "./dependency.service";
import { GlobalRegistryService } from "./global-registry.service";
import { HttpService } from "./http.service";
import { AssertionService } from "./assertion.service";
import { CaptureService } from "./capture.service";
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
 * Test execution service
 */
export class ExecutionService {
  private configManager: ConfigManager;
  private globalVariables: GlobalVariablesService;
  private priorityService: PriorityService;
  private dependencyService: DependencyService;
  private globalRegistry: GlobalRegistryService;
  private hooks: EngineHooks;

  // Serviços reutilizados da versão anterior
  private httpService: HttpService;
  private assertionService: AssertionService;
  private captureService: CaptureService;

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
      config.execution?.timeout || config.globals?.timeouts?.default || 30000
    );
    this.assertionService = new AssertionService();
    this.captureService = new CaptureService();

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

    console.log(
      `📊 Dependency-aware execution order resolved for ${orderedTests.length} test(s)`
    );
    if (config.execution!.mode === "parallel") {
      console.log(
        `⚠️  Note: Parallel execution with dependencies may be limited by dependency chains`
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
        this.globalRegistry.registerSuite(
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
          console.log(`💨 Using cached result for '${test.suite_name}'`);

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
            console.log(
              `🛑 Stopping execution due to failure in required test: ${test.suite_name}`
            );
            break;
          }
        } else {
          stats.tests_skipped++;
        }

        onStatsUpdate?.(stats);
      } catch (error) {
        console.error(
          `💥 Unexpected error executing ${test.suite_name}: ${error}`
        );

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
            console.log(
              `🛑 Stopping execution due to failure in required test: ${test.suite_name}`
            );
            break;
          }
        } else {
          stats.tests_skipped++;
        }

        onStatsUpdate?.(stats);
      } catch (error) {
        console.error(
          `💥 Unexpected error executing ${test.suite_name}: ${error}`
        );

        const errorResult: SuiteExecutionResult = {
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
          variables_captured: {},
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
            variables_captured: {},
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

      // Configures suite variables
      if (suite.variables) {
        this.globalVariables.setSuiteVariables(suite.variables);
      }

      // Interpolates and configures suite base_url if specified
      if (suite.base_url) {
        const interpolatedBaseUrl = this.globalVariables.interpolateString(
          suite.base_url
        );
        this.httpService = new HttpService(
          interpolatedBaseUrl,
          this.configManager.getConfig().execution?.timeout || 30000
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

          // Updates captured variables globally
          if (stepResult.captured_variables) {
            this.globalVariables.setRuntimeVariables(
              stepResult.captured_variables
            );
          }
        } catch (error) {
          console.error(`💥 Error in step '${step.name}': ${error}`);

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
      const totalSteps = stepResults.length;
      const successRate =
        totalSteps > 0 ? (successfulSteps / totalSteps) * 100 : 0;

      const result: SuiteExecutionResult = {
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
        variables_captured: this.globalVariables.getVariablesByScope("runtime"),
      };

      // Fires suite end hook
      await this.hooks.onSuiteEnd?.(suite, result);

      return result;
    } catch (error) {
      const endTime = new Date();

      const errorResult: SuiteExecutionResult = {
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
      };

      return errorResult;
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

      // 3. Executes assertions
      let assertionResults: any[] = [];
      if (step.assert && httpResult.response_details) {
        assertionResults = this.assertionService.validateAssertions(
          step.assert,
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
        capturedVariables = this.captureService.captureVariables(
          step.capture,
          httpResult
        );
        httpResult.captured_variables = capturedVariables;
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

    for (const exportName of test.exports) {
      const value = result.variables_captured[exportName];
      if (value !== undefined) {
        this.globalRegistry.setExportedVariable(
          test.suite_name,
          exportName,
          value
        );
      } else {
        console.warn(
          `⚠️  Export '${exportName}' not found in captured variables for suite '${test.suite_name}'`
        );
      }
    }
  }

  /**
   * Restores exported variables from cache
   */
  private restoreExportedVariables(cachedResult: DependencyResult): void {
    for (const [variableName, value] of Object.entries(
      cachedResult.exportedVariables
    )) {
      this.globalRegistry.setExportedVariable(
        cachedResult.suiteName,
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
      variables_captured: {},
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
}
