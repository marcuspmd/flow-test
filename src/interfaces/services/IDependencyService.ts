/**
 * @fileoverview Interface for dependency management service.
 *
 * @remarks
 * This interface defines the contract for the DependencyService which handles
 * dependency resolution, execution ordering, and circular dependency detection
 * for test suite execution.
 *
 * @packageDocumentation
 */

import type {
  DiscoveredTest,
  DependencyResult,
} from "../../types/engine.types";

/**
 * Interface for the dependency management service
 *
 * @remarks
 * The DependencyService manages dependency resolution and execution ordering
 * for test suites. It builds dependency graphs, detects circular dependencies,
 * and determines optimal execution order.
 *
 * @public
 */
export interface IDependencyService {
  /**
   * Build the dependency graph from discovered tests
   *
   * @param tests - Array of discovered tests
   *
   * @example
   * ```typescript
   * dependencyService.buildDependencyGraph(discoveredTests);
   * ```
   */
  buildDependencyGraph(tests: DiscoveredTest[]): void;

  /**
   * Resolve execution order based on dependencies
   *
   * @param tests - Array of discovered tests
   * @returns Array of tests in execution order
   *
   * @example
   * ```typescript
   * const orderedTests = dependencyService.resolveExecutionOrder(tests);
   * console.log('Execution order:', orderedTests.map(t => t.node_id));
   * ```
   */
  resolveExecutionOrder(tests: DiscoveredTest[]): DiscoveredTest[];

  /**
   * Detect circular dependencies in the graph
   *
   * @returns Array of error messages describing circular dependencies
   *
   * @example
   * ```typescript
   * const cycles = dependencyService.detectCircularDependencies();
   * if (cycles.length > 0) {
   *   console.error('Circular dependencies:', cycles);
   * }
   * ```
   */
  detectCircularDependencies(): string[];

  /**
   * Clear the dependency graph and cache
   *
   * @example
   * ```typescript
   * dependencyService.clearGraph();
   * ```
   */
  clearGraph(): void;

  /**
   * Mark a node as resolved with its execution result
   *
   * @param nodeId - Node identifier
   * @param result - Dependency execution result
   *
   * @example
   * ```typescript
   * dependencyService.markResolved('test-suite-1', result);
   * ```
   */
  markResolved(nodeId: string, result: DependencyResult): void;

  /**
   * Mark a node as currently executing
   *
   * @param nodeId - Node identifier
   *
   * @example
   * ```typescript
   * dependencyService.markExecuting('test-suite-1');
   * ```
   */
  markExecuting(nodeId: string): void;

  /**
   * Get cached execution result for a node
   *
   * @param nodeId - Node identifier
   * @returns Cached result or null if not found
   *
   * @example
   * ```typescript
   * const cached = dependencyService.getCachedResult('test-suite-1');
   * if (cached) {
   *   console.log('Using cached result from', cached.flowPath);
   * }
   * ```
   */
  getCachedResult(nodeId: string): DependencyResult | null;

  /**
   * Enable or disable caching
   *
   * @param enabled - Whether caching should be enabled
   *
   * @example
   * ```typescript
   * dependencyService.setCacheEnabled(true);
   * ```
   */
  setCacheEnabled(enabled: boolean): void;

  /**
   * Clear the dependency resolution cache
   *
   * @example
   * ```typescript
   * dependencyService.clearCache();
   * ```
   */
  clearCache(): void;
}
