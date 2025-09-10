import path from "path";
import {
  DiscoveredTest,
  FlowDependency,
  DependencyResult,
} from "../types/engine.types";

/**
 * Node of the dependency graph
 */
interface DependencyNode {
  test: DiscoveredTest;
  dependencies: Set<string>; // suite_names das dependências
  dependents: Set<string>; // suite_names que dependem deste
  resolved: boolean;
  executing: boolean;
}

/**
 * Service for managing dependencies
 */
export class DependencyService {
  private graph: Map<string, DependencyNode> = new Map();
  private cache: Map<string, DependencyResult> = new Map();
  private cacheEnabled: boolean = true;

  constructor() {
    this.graph = new Map();
    this.cache = new Map();
  }

  /**
   * Builds the dependency graph from discovered tests
   */
  buildDependencyGraph(tests: DiscoveredTest[]): void {
    this.graph.clear();

    // First pass: create nodes
    for (const test of tests) {
      this.graph.set(test.suite_name, {
        test,
        dependencies: new Set(),
        dependents: new Set(),
        resolved: false,
        executing: false,
      });
    }

    // Second pass: connect dependencies
    for (const test of tests) {
      const node = this.graph.get(test.suite_name)!;

      // Process new format dependencies
      if (test.depends) {
        for (const dependency of test.depends) {
          const dependencySuiteName = this.extractSuiteNameFromPath(
            dependency.path
          );
          if (dependencySuiteName && this.graph.has(dependencySuiteName)) {
            node.dependencies.add(dependencySuiteName);
            this.graph
              .get(dependencySuiteName)!
              .dependents.add(test.suite_name);
          } else {
            console.warn(
              `⚠️  Dependency '${dependency.path}' not found for test '${test.suite_name}'`
            );
          }
        }
      }

      // Process legacy format dependencies
      if (test.dependencies) {
        for (const dep of test.dependencies) {
          if (this.graph.has(dep)) {
            node.dependencies.add(dep);
            this.graph.get(dep)!.dependents.add(test.suite_name);
          } else {
            console.warn(
              `⚠️  Legacy dependency '${dep}' not found for test '${test.suite_name}'`
            );
          }
        }
      }
    }
  }

  /**
   * Extracts the suite_name from the dependency file path
   */
  private extractSuiteNameFromPath(dependencyPath: string): string | null {
    if (!dependencyPath || typeof dependencyPath !== "string") {
      return null;
    }

    // Simplified implementation: search for suite_name in map
    // In a more robust implementation, could parse the file
    for (const [suiteName, node] of this.graph) {
      if (
        node &&
        node.test &&
        node.test.file_path &&
        (node.test.file_path.includes(dependencyPath) ||
          dependencyPath.includes(suiteName))
      ) {
        return suiteName;
      }
    }

    // Fallback: extract filename
    const filename = path.basename(
      dependencyPath,
      path.extname(dependencyPath)
    );
    const possibleSuiteName = filename.replace(/-flow$/, "").replace(/-/g, "");

    if (this.graph.has(possibleSuiteName)) {
      return possibleSuiteName;
    }

    return null;
  }

  /**
   * Detects circular dependencies using DFS
   */
  detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const dfs = (suiteName: string, path: string[]): boolean => {
      if (recursionStack.has(suiteName)) {
        // Found cycle
        const cycleStart = path.indexOf(suiteName);
        const cycle = [...path.slice(cycleStart), suiteName].join(" → ");
        cycles.push(cycle);
        return true;
      }

      if (visited.has(suiteName)) {
        return false;
      }

      visited.add(suiteName);
      recursionStack.add(suiteName);

      const node = this.graph.get(suiteName);
      if (node) {
        for (const dependency of node.dependencies) {
          if (dfs(dependency, [...path, suiteName])) {
            return true;
          }
        }
      }

      recursionStack.delete(suiteName);
      return false;
    };

    for (const suiteName of this.graph.keys()) {
      if (!visited.has(suiteName)) {
        dfs(suiteName, []);
      }
    }

    return cycles;
  }

  /**
   * Resolves execution order using topological sorting
   */
  resolveExecutionOrder(tests: DiscoveredTest[]): DiscoveredTest[] {
    // First detects cycles
    const cycles = this.detectCircularDependencies();
    if (cycles.length > 0) {
      throw new Error(`Circular dependencies detected:\n${cycles.join("\n")}`);
    }

    const result: DiscoveredTest[] = [];
    const resolved = new Set<string>();
    const tempMarked = new Set<string>();

    const visit = (suiteName: string): void => {
      if (tempMarked.has(suiteName)) {
        throw new Error(`Circular dependency detected involving: ${suiteName}`);
      }

      if (resolved.has(suiteName)) {
        return;
      }

      tempMarked.add(suiteName);

      const node = this.graph.get(suiteName);
      if (node) {
        // Visits all dependencies first
        for (const dependency of node.dependencies) {
          visit(dependency);
        }

        // Adds the current node after its dependencies
        result.push(node.test);
        resolved.add(suiteName);
      }

      tempMarked.delete(suiteName);
    };

    // Visits all nodes
    for (const test of tests) {
      if (!resolved.has(test.suite_name)) {
        visit(test.suite_name);
      }
    }

    return result;
  }

  /**
   * Gets direct dependencies of a test
   */
  getDirectDependencies(suiteName: string): DiscoveredTest[] {
    const node = this.graph.get(suiteName);
    if (!node) return [];

    const dependencies: DiscoveredTest[] = [];
    for (const depSuiteName of node.dependencies) {
      const depNode = this.graph.get(depSuiteName);
      if (depNode) {
        dependencies.push(depNode.test);
      }
    }

    return dependencies;
  }

  /**
   * Gets all transitive dependencies of a test
   */
  getTransitiveDependencies(suiteName: string): DiscoveredTest[] {
    const visited = new Set<string>();
    const result: DiscoveredTest[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      const node = this.graph.get(name);
      if (!node) return;

      for (const depName of node.dependencies) {
        visit(depName);
        const depNode = this.graph.get(depName);
        if (depNode && !result.some((t) => t.suite_name === depName)) {
          result.push(depNode.test);
        }
      }
    };

    visit(suiteName);
    return result;
  }

  /**
   * Checks if a test can be executed (all its dependencies have been resolved)
   */
  canExecute(suiteName: string): boolean {
    const node = this.graph.get(suiteName);
    if (!node) return true;

    for (const depName of node.dependencies) {
      const depNode = this.graph.get(depName);
      if (!depNode || !depNode.resolved) {
        return false;
      }
    }

    return true;
  }

  /**
   * Marks a test as resolved and stores its result
   */
  markResolved(suiteName: string, result: DependencyResult): void {
    const node = this.graph.get(suiteName);
    if (node) {
      node.resolved = true;
      node.executing = false;
    }

    // Stores in cache if enabled
    if (this.cacheEnabled && result.success) {
      this.cache.set(suiteName, {
        ...result,
        cached: true,
      });
    }
  }

  /**
   * Marks a test as executing
   */
  markExecuting(suiteName: string): void {
    const node = this.graph.get(suiteName);
    if (node) {
      node.executing = true;
    }
  }

  /**
   * Checks if there is a cached result for a test
   */
  getCachedResult(suiteName: string): DependencyResult | null {
    if (!this.cacheEnabled) return null;
    return this.cache.get(suiteName) || null;
  }

  /**
   * Gets statistics of the dependency graph
   */
  getDependencyStats(): {
    total_tests: number;
    tests_with_dependencies: number;
    tests_with_dependents: number;
    max_dependency_depth: number;
    total_dependency_edges: number;
  } {
    let testsWithDependencies = 0;
    let testsWithDependents = 0;
    let totalEdges = 0;
    let maxDepth = 0;

    for (const [suiteName, node] of this.graph) {
      if (node.dependencies.size > 0) {
        testsWithDependencies++;
        totalEdges += node.dependencies.size;
      }

      if (node.dependents.size > 0) {
        testsWithDependents++;
      }

      // Calculates maximum dependency depth
      const depth = this.calculateDependencyDepth(suiteName);
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      total_tests: this.graph.size,
      tests_with_dependencies: testsWithDependencies,
      tests_with_dependents: testsWithDependents,
      max_dependency_depth: maxDepth,
      total_dependency_edges: totalEdges,
    };
  }

  /**
   * Calculates the maximum depth of dependencies of a test
   */
  private calculateDependencyDepth(
    suiteName: string,
    visited = new Set<string>()
  ): number {
    if (visited.has(suiteName)) return 0; // Avoids infinite loops
    visited.add(suiteName);

    const node = this.graph.get(suiteName);
    if (!node || node.dependencies.size === 0) return 0;

    let maxDepth = 0;
    for (const depName of node.dependencies) {
      const depth =
        1 + this.calculateDependencyDepth(depName, new Set(visited));
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Clears the dependency cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Enables/disables the cache
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Gets visual representation of the graph (useful for debugging)
   */
  getGraphVisualization(): string {
    const lines: string[] = [];
    lines.push("Dependency Graph:");
    lines.push("================");

    for (const [suiteName, node] of this.graph) {
      const status = node.resolved ? "✅" : node.executing ? "⏳" : "⏸️";
      lines.push(`${status} ${suiteName}`);

      if (node.dependencies.size > 0) {
        lines.push(
          `   Dependencies: ${Array.from(node.dependencies).join(", ")}`
        );
      }

      if (node.dependents.size > 0) {
        lines.push(`   Dependents: ${Array.from(node.dependents).join(", ")}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Reset of the graph state (useful for new execution)
   */
  reset(): void {
    for (const node of this.graph.values()) {
      node.resolved = false;
      node.executing = false;
    }
  }
}
