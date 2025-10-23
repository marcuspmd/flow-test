/**
 * @fileoverview Priority management service interface for test execution ordering and filtering.
 *
 * @remarks
 * This interface defines the contract for priority-based test management operations,
 * including ordering, filtering, grouping, and execution planning based on priority levels.
 *
 * @packageDocumentation
 */

import { DiscoveredTest } from "../../types/engine.types";

/**
 * Interface for priority management operations.
 *
 * @remarks
 * Provides methods for managing test execution priorities, including ordering,
 * filtering, grouping, and analyzing test suites based on their priority levels.
 *
 * Priority levels (standard):
 * - critical: Mission-critical tests that must pass
 * - high: Important tests for core functionality
 * - medium: Standard tests for general features
 * - low: Nice-to-have tests for edge cases
 *
 * @public
 * @since 2.0.0
 */
export interface IPriorityService {
  /**
   * Orders tests by priority and resolves dependencies.
   *
   * @param tests - Array of discovered tests to order
   * @returns Ordered array of tests (highest priority first, respecting dependencies)
   *
   * @example
   * ```typescript
   * const orderedTests = priorityService.orderTests(allTests);
   * console.log('Execution order:', orderedTests.map(t => t.suite.node_id));
   * ```
   */
  orderTests(tests: DiscoveredTest[]): DiscoveredTest[];

  /**
   * Checks if a test is considered required based on priority.
   *
   * @param test - Test to check
   * @returns True if test is critical or high priority
   *
   * @example
   * ```typescript
   * if (priorityService.isRequiredTest(test)) {
   *   console.log('This test is required and must pass');
   * }
   * ```
   */
  isRequiredTest(test: DiscoveredTest): boolean;

  /**
   * Filters tests to only return required ones (critical/high priority).
   *
   * @param tests - Array of tests to filter
   * @returns Array containing only required tests
   *
   * @example
   * ```typescript
   * const requiredTests = priorityService.getRequiredTests(allTests);
   * await runWithFailFast(requiredTests);
   * ```
   */
  getRequiredTests(tests: DiscoveredTest[]): DiscoveredTest[];

  /**
   * Filters tests by one or more priority levels.
   *
   * @param tests - Array of tests to filter
   * @param priorities - Priority levels to include
   * @returns Tests matching the specified priorities
   *
   * @example
   * ```typescript
   * // Get only critical tests
   * const critical = priorityService.filterByPriority(tests, ['critical']);
   *
   * // Get critical and high priority tests
   * const important = priorityService.filterByPriority(tests, ['critical', 'high']);
   * ```
   */
  filterByPriority(
    tests: DiscoveredTest[],
    priorities: string[]
  ): DiscoveredTest[];

  /**
   * Groups tests by their priority level.
   *
   * @param tests - Array of tests to group
   * @returns Map with priority levels as keys and test arrays as values
   *
   * @example
   * ```typescript
   * const grouped = priorityService.groupByPriority(tests);
   * console.log(`Critical tests: ${grouped.get('critical')?.length || 0}`);
   * console.log(`High priority: ${grouped.get('high')?.length || 0}`);
   * ```
   */
  groupByPriority(tests: DiscoveredTest[]): Map<string, DiscoveredTest[]>;

  /**
   * Gets priority distribution statistics.
   *
   * @param tests - Array of tests to analyze
   * @returns Object with total counts, required tests, and per-priority statistics
   *
   * @example
   * ```typescript
   * const stats = priorityService.getPriorityStats(tests);
   * console.log(`Total tests: ${stats.total_tests}`);
   * console.log(`Required tests: ${stats.required_tests}`);
   * console.log(`Critical: ${stats.by_priority['critical'].count}`);
   * console.log(`Total duration: ${stats.total_estimated_duration}ms`);
   * ```
   */
  getPriorityStats(tests: DiscoveredTest[]): {
    total_tests: number;
    required_tests: number;
    by_priority: Record<
      string,
      { count: number; percentage: number; estimated_duration: number }
    >;
    total_estimated_duration: number;
    required_estimated_duration: number;
  };

  /**
   * Suggests optimizations based on priority distribution.
   *
   * @param tests - Array of tests to analyze
   * @returns Array of optimization suggestions
   *
   * @example
   * ```typescript
   * const suggestions = priorityService.suggestOptimizations(tests);
   * suggestions.forEach(suggestion => console.log(`💡 ${suggestion}`));
   * ```
   */
  suggestOptimizations(tests: DiscoveredTest[]): string[];

  /**
   * Creates an execution plan with priority-based phases.
   *
   * @param tests - Array of tests to plan
   * @returns Execution plan with ordered phases and metadata
   *
   * @example
   * ```typescript
   * const plan = priorityService.createExecutionPlan(tests);
   * console.log(`Total phases: ${plan.phases.length}`);
   * console.log(`Total duration: ${plan.total_duration}ms`);
   * console.log(`Critical path: ${plan.critical_path.join(' -> ')}`);
   * ```
   */
  createExecutionPlan(tests: DiscoveredTest[]): {
    phases: Array<{
      name: string;
      tests: DiscoveredTest[];
      estimated_duration: number;
      is_required: boolean;
    }>;
    total_duration: number;
    critical_path: string[];
  };
}
