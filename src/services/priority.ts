/**
 * @fileoverview Priority management service for test execution ordering and filtering.
 *
 * @remarks
 * This module provides the PriorityService class which handles priority-based test
 * ordering, filtering, and execution planning. It supports configurable priority
 * levels with weighted sorting and comprehensive priority-based operations.
 *
 * @packageDocumentation
 */

import { ConfigManager } from "../core/config";
import { DiscoveredTest } from "../types/engine.types";

/**
 * Comprehensive priority management service for test execution ordering and filtering.
 *
 * @remarks
 * The PriorityService manages priority-based test operations including ordering,
 * filtering, and execution planning. It supports configurable priority levels
 * with weighted calculations, enabling sophisticated test execution strategies
 * based on business requirements and quality gates.
 *
 * **Priority Features:**
 * - **Configurable Levels**: Support for custom priority hierarchies
 * - **Weighted Sorting**: Numerical weight assignment for precise ordering
 * - **Filter Operations**: Advanced filtering by single or multiple priorities
 * - **Execution Planning**: Priority-based execution order optimization
 * - **Fail-Fast Support**: Early termination on high-priority failures
 * - **Statistics & Analytics**: Priority distribution analysis and reporting
 *
 * **Standard Priority Levels:**
 * - **Critical**: Mission-critical tests that must pass
 * - **High**: Important tests for core functionality
 * - **Medium**: Standard tests for general features
 * - **Low**: Nice-to-have tests for edge cases
 *
 * **Advanced Operations:**
 * - Priority weight calculation and normalization
 * - Multi-criteria sorting with priority as primary factor
 * - Execution time estimation based on priority distribution
 * - Risk assessment using priority and historical data
 *
 * @example Basic priority operations
 * ```typescript
 * const configManager = new ConfigManager();
 * const priorityService = new PriorityService(configManager);
 *
 * // Filter tests by priority
 * const criticalTests = priorityService.filterByPriority(allTests, ['critical']);
 * const highPriorityTests = priorityService.filterByPriority(allTests, ['critical', 'high']);
 *
 * // Order tests by priority
 * const orderedTests = priorityService.orderByPriority(allTests);
 * console.log('Execution order:', orderedTests.map(t => `${t.suite.node_id} (${t.priority})`));
 * ```
 *
 * @example Advanced priority analysis
 * ```typescript
 * const priorityService = new PriorityService(configManager);
 *
 * // Get priority distribution
 * const distribution = priorityService.getPriorityDistribution(tests);
 * console.log(`Critical: ${distribution.critical}, High: ${distribution.high}`);
 *
 * // Calculate execution time by priority
 * const timeEstimate = priorityService.estimateExecutionTime(tests, {
 *   priorityFilter: ['critical', 'high'],
 *   averageStepTime: 500 // ms
 * });
 *
 * console.log(`Estimated time for high-priority tests: ${timeEstimate}ms`);
 * ```
 *
 * @example Fail-fast execution strategy
 * ```typescript
 * const priorityService = new PriorityService(configManager);
 *
 * // Configure fail-fast behavior
 * const criticalTests = priorityService.filterByPriority(tests, ['critical']);
 * const execution = await executeWithFailFast(criticalTests, {
 *   stopOnFirstFailure: true,
 *   notifyOnFailure: true,
 *   escalationLevel: 'immediate'
 * });
 *
 * if (execution.hasFailures) {
 *   console.error('Critical test failure detected - stopping execution');
 *   process.exit(1);
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class PriorityService {
  private configManager: ConfigManager;
  private priorityWeights: Map<string, number> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.initializePriorityWeights();
  }

  /**
   * Inicializa os pesos de prioridade baseado na configuração
   */
  private initializePriorityWeights(): void {
    const config = this.configManager.getConfig();
    const levels = config.priorities!.levels;

    // Atribui pesos: maior prioridade = maior peso
    levels.forEach((level, index) => {
      const weight = levels.length - index; // critical=4, high=3, medium=2, low=1
      this.priorityWeights.set(level, weight);
    });
  }

  private getDependencyNodeIds(test: DiscoveredTest): string[] {
    if (!test.depends) {
      return [];
    }

    return test.depends
      .map((dependency) => dependency.node_id)
      .filter((nodeId): nodeId is string => Boolean(nodeId));
  }

  /**
   * Orders tests by priority and dependencies
   */
  orderTests(tests: DiscoveredTest[]): DiscoveredTest[] {
    // 1. First, sort by priority
    const sortedByPriority = this.sortByPriority(tests);

    // 2. Then, reorder considering dependencies
    const orderedWithDependencies =
      this.resolveExecutionOrder(sortedByPriority);

    return orderedWithDependencies;
  }

  /**
   * Orders tests only by priority
   */
  private sortByPriority(tests: DiscoveredTest[]): DiscoveredTest[] {
    return tests.slice().sort((a, b) => {
      const priorityA = a.priority || "medium";
      const priorityB = b.priority || "medium";

      const weightA = this.priorityWeights.get(priorityA) || 0;
      const weightB = this.priorityWeights.get(priorityB) || 0;

      // Sorts by weight descending (higher priority first)
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // If priorities equal, sort by estimated duration (faster first)
      const durationA = a.estimated_duration || 0;
      const durationB = b.estimated_duration || 0;

      if (durationA !== durationB) {
        return durationA - durationB;
      }

      // If all equal, sort alphabetically
      return a.suite_name.localeCompare(b.suite_name);
    });
  }

  /**
   * Resolves execution order considering dependencies
   */
  private resolveExecutionOrder(tests: DiscoveredTest[]): DiscoveredTest[] {
    const result: DiscoveredTest[] = [];
    const remaining = new Set(tests);
    const completed = new Set<string>();

    // Creates map for fast lookup
    const testMap = new Map<string, DiscoveredTest>();
    tests.forEach((test) => {
      testMap.set(test.suite_name, test);
    });

    // Topological sorting algorithm with respect to priority
    while (remaining.size > 0) {
      const readyTests = Array.from(remaining).filter((test) => {
        // Test is ready if all its dependencies have been completed
        const dependencyNodeIds = this.getDependencyNodeIds(test);
        return dependencyNodeIds.every(
          (dep) => completed.has(dep) || !testMap.has(dep)
        );
      });

      if (readyTests.length === 0) {
        // Detects circular dependency or dependency not found
        const stuck = Array.from(remaining)[0];
        console.warn(
          `⚠️  Warning: Possible circular dependency detected. Forcing execution of '${stuck.suite_name}'`
        );
        readyTests.push(stuck);
      }

      // Dos testes prontos, pega o de maior prioridade
      const nextTest = this.selectHighestPriority(readyTests);

      result.push(nextTest);
      remaining.delete(nextTest);
      completed.add(nextTest.suite_name);
    }

    return result;
  }

  /**
   * Seleciona o teste de maior prioridade de uma lista
   */
  private selectHighestPriority(tests: DiscoveredTest[]): DiscoveredTest {
    if (tests.length === 1) {
      return tests[0];
    }

    return tests.reduce((highest, current) => {
      const highestWeight = this.getPriorityWeight(highest.priority);
      const currentWeight = this.getPriorityWeight(current.priority);

      if (currentWeight > highestWeight) {
        return current;
      }

      if (currentWeight === highestWeight) {
        // Se prioridades iguais, prefere o mais rápido
        const highestDuration = highest.estimated_duration || 0;
        const currentDuration = current.estimated_duration || 0;

        return currentDuration < highestDuration ? current : highest;
      }

      return highest;
    });
  }

  /**
   * Obtém o peso de uma prioridade
   */
  private getPriorityWeight(priority?: string): number {
    return this.priorityWeights.get(priority || "medium") || 0;
  }

  /**
   * Checks if a test is considered required
   */
  isRequiredTest(test: DiscoveredTest): boolean {
    const config = this.configManager.getConfig();
    const requiredPriorities = config.priorities!.required || [];

    return requiredPriorities.includes(test.priority || "medium");
  }

  /**
   * Filtra apenas testes obrigatórios
   */
  getRequiredTests(tests: DiscoveredTest[]): DiscoveredTest[] {
    return tests.filter((test) => this.isRequiredTest(test));
  }

  /**
   * Filtra testes por nível de prioridade
   */
  filterByPriority(
    tests: DiscoveredTest[],
    priorities: string[]
  ): DiscoveredTest[] {
    return tests.filter((test) => {
      const testPriority = test.priority || "medium";
      return priorities.includes(testPriority);
    });
  }

  /**
   * Groups tests by priority
   */
  groupByPriority(tests: DiscoveredTest[]): Map<string, DiscoveredTest[]> {
    const groups = new Map<string, DiscoveredTest[]>();

    tests.forEach((test) => {
      const priority = test.priority || "medium";

      if (!groups.has(priority)) {
        groups.set(priority, []);
      }

      groups.get(priority)!.push(test);
    });

    return groups;
  }

  /**
   * Calculates priority statistics
   */
  getPriorityStats(tests: DiscoveredTest[]) {
    const groups = this.groupByPriority(tests);
    const config = this.configManager.getConfig();

    const stats = {
      total_tests: tests.length,
      required_tests: this.getRequiredTests(tests).length,
      by_priority: {} as Record<
        string,
        { count: number; percentage: number; estimated_duration: number }
      >,
      total_estimated_duration: 0,
      required_estimated_duration: 0,
    };

    // Calculates statistics by priority
    config.priorities!.levels.forEach((priority) => {
      const testsInPriority = groups.get(priority) || [];
      const count = testsInPriority.length;
      const percentage = tests.length > 0 ? (count / tests.length) * 100 : 0;
      const estimatedDuration = testsInPriority.reduce(
        (sum, test) => sum + (test.estimated_duration || 0),
        0
      );

      stats.by_priority[priority] = {
        count,
        percentage: Math.round(percentage * 100) / 100,
        estimated_duration: estimatedDuration,
      };

      stats.total_estimated_duration += estimatedDuration;

      if (this.isRequiredPriority(priority)) {
        stats.required_estimated_duration += estimatedDuration;
      }
    });

    return stats;
  }

  /**
   * Checks if a priority is required
   */
  private isRequiredPriority(priority: string): boolean {
    const config = this.configManager.getConfig();
    return config.priorities!.required!.includes(priority);
  }

  /**
   * Suggests optimizations in priority distribution
   */
  suggestOptimizations(tests: DiscoveredTest[]): string[] {
    const suggestions: string[] = [];
    const stats = this.getPriorityStats(tests);
    const config = this.configManager.getConfig();

    // Checks if there are many critical tests
    const criticalStats = stats.by_priority["critical"];
    if (criticalStats && criticalStats.percentage > 30) {
      suggestions.push(
        `Consider reducing critical tests: ${criticalStats.count} tests (${criticalStats.percentage}%) marked as critical. This may slow down feedback loops.`
      );
    }

    // Checks if there are tests without defined priority
    const unclassified = tests.filter((test) => !test.priority);
    if (unclassified.length > 0) {
      suggestions.push(
        `${unclassified.length} tests have no explicit priority. Consider adding priority metadata.`
      );
    }

    // Checks if there are high-priority orphan tests
    const highPriorityOrphans = tests.filter((test) => {
      const isHighPriority = this.getPriorityWeight(test.priority) >= 3;
      const hasNoDependencies = this.getDependencyNodeIds(test).length === 0;
      return isHighPriority && hasNoDependencies;
    });

    if (highPriorityOrphans.length > 5) {
      suggestions.push(
        `Many high-priority tests (${highPriorityOrphans.length}) have no dependencies. Consider if some could be grouped or have dependencies.`
      );
    }

    // Checks estimated duration of required tests
    if (stats.required_estimated_duration > 300000) {
      // 5 minutos
      suggestions.push(
        `Required tests estimated duration is ${Math.round(
          stats.required_estimated_duration / 1000
        )}s. Consider optimizing for faster feedback.`
      );
    }

    return suggestions;
  }

  /**
   * Creates a detailed execution plan
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
  } {
    const orderedTests = this.orderTests(tests);
    const config = this.configManager.getConfig();

    // Groups by priority maintaining order
    const phases: any[] = [];
    let currentPriority: string | null = null;
    let currentPhase: any = null;

    orderedTests.forEach((test) => {
      const testPriority = test.priority || "medium";

      if (testPriority !== currentPriority) {
        if (currentPhase) {
          phases.push(currentPhase);
        }

        currentPhase = {
          name: `${
            testPriority.charAt(0).toUpperCase() + testPriority.slice(1)
          } Priority Tests`,
          tests: [],
          estimated_duration: 0,
          is_required: this.isRequiredPriority(testPriority),
        };
        currentPriority = testPriority;
      }

      currentPhase.tests.push(test);
      currentPhase.estimated_duration += test.estimated_duration || 0;
    });

    if (currentPhase) {
      phases.push(currentPhase);
    }

    const totalDuration = phases.reduce(
      (sum, phase) => sum + phase.estimated_duration,
      0
    );

    // Identifies critical path (tests that others depend on)
    const criticalPath = this.identifyCriticalPath(orderedTests);

    return {
      phases,
      total_duration: totalDuration,
      critical_path: criticalPath,
    };
  }

  /**
   * Identifies the critical path of dependencies
   */
  private identifyCriticalPath(tests: DiscoveredTest[]): string[] {
    const dependencyCount = new Map<string, number>();

    // Counts how many times each test is a dependency
    tests.forEach((test) => {
      const dependencyNodeIds = this.getDependencyNodeIds(test);
      dependencyNodeIds.forEach((dep) => {
        dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
      });
    });

    // Sorts by number of dependents (descending)
    const criticalTests = Array.from(dependencyCount.entries())
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([testName]) => testName);

    return criticalTests.slice(0, 5); // Top 5 most critical tests
  }
}
