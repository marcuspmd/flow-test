/**
 * @fileoverview Interface for test execution service.
 *
 * @remarks
 * This interface defines the contract for the ExecutionService which orchestrates
 * the complete test execution lifecycle including dependency resolution, scenario
 * processing, HTTP request execution, assertion validation, and result aggregation.
 *
 * @packageDocumentation
 */

import type {
  DiscoveredTest,
  SuiteExecutionResult,
  ExecutionStats,
} from "../../types/engine.types";

/**
 * Interface for the test execution service
 *
 * @remarks
 * The ExecutionService is the core orchestrator for test execution, managing the
 * complete lifecycle from dependency resolution through result aggregation.
 *
 * @public
 */
export interface IExecutionService {
  /**
   * Execute a single test suite
   *
   * @param test - The discovered test to execute
   * @param options - Optional execution options
   * @returns Promise resolving to the suite execution result
   *
   * @example
   * ```typescript
   * const result = await executionService.executeSuite(discoveredTest);
   * console.log(`Suite: ${result.suite_name}, Success: ${result.success}`);
   * ```
   */
  executeSuite(
    test: DiscoveredTest,
    options?: {
      stepIds?: string[];
      skipDependencies?: boolean;
    }
  ): Promise<SuiteExecutionResult>;

  /**
   * Execute multiple test suites
   *
   * @param tests - Array of discovered tests to execute
   * @param executionMode - Execution mode: 'sequential' or 'parallel'
   * @returns Promise resolving to array of suite execution results
   *
   * @example
   * ```typescript
   * const results = await executionService.executeSuites(tests, 'sequential');
   * console.log(`Executed ${results.length} suites`);
   * ```
   */
  executeSuites(
    tests: DiscoveredTest[],
    executionMode?: "sequential" | "parallel"
  ): Promise<SuiteExecutionResult[]>;

  /**
   * Aggregate execution statistics from multiple suite results
   *
   * @param results - Array of suite execution results to aggregate
   * @returns Aggregated execution statistics
   *
   * @example
   * ```typescript
   * const stats = executionService.aggregateStats(results);
   * console.log(`Overall success rate: ${stats.success_rate}%`);
   * ```
   */
  aggregateStats(results: SuiteExecutionResult[]): ExecutionStats;

  /**
   * Execute multiple tests with dependency resolution and stats callback
   *
   * @param tests - Array of discovered tests to execute
   * @param onStatsUpdate - Optional callback for stats updates
   * @returns Promise resolving to array of suite execution results
   *
   * @example
   * ```typescript
   * const results = await executionService.executeTests(
   *   tests,
   *   (stats) => console.log(`Progress: ${stats.tests_completed}/${stats.tests_discovered}`)
   * );
   * ```
   */
  executeTests(
    tests: DiscoveredTest[],
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]>;

  /**
   * Get performance summary of executed requests
   *
   * @returns Performance summary with metrics, or undefined if no requests executed
   *
   * @example
   * ```typescript
   * const summary = executionService.getPerformanceSummary();
   * if (summary) {
   *   console.log(`Average response time: ${summary.avg_response_time_ms}ms`);
   * }
   * ```
   */
  getPerformanceSummary():
    | import("../../types/engine.types").PerformanceSummary
    | undefined;

  /**
   * Returns the step execution handler bound to this ExecutionService instance.
   * Used by CallService to execute resolved steps.
   *
   * @returns Bound step execution handler function
   *
   * @example
   * ```typescript
   * const handler = executionService.getStepExecutionHandler();
   * const result = await handler({ resolved, request, options });
   * ```
   */
  getStepExecutionHandler(): import("../../types/call.types").StepExecutionHandler;
}
