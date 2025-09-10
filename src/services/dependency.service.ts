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
  dependencies: Set<string>; // nodeIds das dependências
  dependents: Set<string>; // nodeIds que dependem deste
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

    // First pass: create nodes using nodeId as key
    for (const test of tests) {
      this.graph.set(test.node_id, {
        test,
        dependencies: new Set(),
        dependents: new Set(),
        resolved: false,
        executing: false,
      });
    }

    // Second pass: connect dependencies
    for (const test of tests) {
      const node = this.graph.get(test.node_id)!;

      // Process new format dependencies
      if (test.depends) {
        for (const dependency of test.depends) {
          let dependencyNodeId: string | null = null;

          // Handle different dependency formats
          if (typeof dependency === "string") {
            // Simple string format: "auth"
            dependencyNodeId = dependency;
          } else if (typeof dependency === "object" && dependency.node_id) {
            // Object format with node_id: { node_id: "auth" }
            dependencyNodeId = dependency.node_id;
          } else if (typeof dependency === "object" && dependency.path) {
            // Legacy path format: { path: "./auth-flow.yaml" }
            dependencyNodeId = this.extractNodeIdFromPath(dependency.path);
          }

          if (dependencyNodeId && this.graph.has(dependencyNodeId)) {
            node.dependencies.add(dependencyNodeId);
            this.graph.get(dependencyNodeId)!.dependents.add(test.node_id);
          } else {
            console.warn(
              `⚠️  Dependency '${JSON.stringify(
                dependency
              )}' not found for test '${test.node_id}' (${test.suite_name})`
            );
          }
        }
      }

      // Process legacy format dependencies (now expecting nodeIds)
      if (test.dependencies) {
        for (const depNodeId of test.dependencies) {
          if (this.graph.has(depNodeId)) {
            node.dependencies.add(depNodeId);
            this.graph.get(depNodeId)!.dependents.add(test.node_id);
          } else {
            console.warn(
              `⚠️  Legacy dependency '${depNodeId}' not found for test '${test.node_id}' (${test.suite_name})`
            );
          }
        }
      }
    }
  }

  /**
   * Extracts the nodeId from the dependency file path
   */
  private extractNodeIdFromPath(dependencyPath: string): string | null {
    if (!dependencyPath || typeof dependencyPath !== "string") {
      return null;
    }

    // Search for nodeId in map by matching file path
    for (const [nodeId, node] of this.graph) {
      if (
        node &&
        node.test &&
        node.test.file_path &&
        (node.test.file_path.includes(dependencyPath) ||
          dependencyPath.includes(node.test.file_path))
      ) {
        return nodeId;
      }
    }

    // Fallback: try to extract nodeId from filename
    // This is a heuristic - in real usage, the YAML file should specify the nodeId
    const filename = path.basename(
      dependencyPath,
      path.extname(dependencyPath)
    );
    const possibleNodeId = filename.replace(/-flow$/, "").replace(/-/g, "-");

    if (this.graph.has(possibleNodeId)) {
      return possibleNodeId;
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

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = [...path.slice(cycleStart), nodeId].join(" → ");
        cycles.push(cycle);
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.graph.get(nodeId);
      if (node) {
        for (const dependency of node.dependencies) {
          if (dfs(dependency, [...path, nodeId])) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.graph.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
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

    const visit = (nodeId: string): void => {
      if (tempMarked.has(nodeId)) {
        throw new Error(`Circular dependency detected involving: ${nodeId}`);
      }

      if (resolved.has(nodeId)) {
        return;
      }

      tempMarked.add(nodeId);

      const node = this.graph.get(nodeId);
      if (node) {
        // Visits all dependencies first
        for (const dependency of node.dependencies) {
          visit(dependency);
        }

        // Adds the current node after its dependencies
        result.push(node.test);
        resolved.add(nodeId);
      }

      tempMarked.delete(nodeId);
    };

    // Visits all nodes
    for (const test of tests) {
      if (!resolved.has(test.node_id)) {
        visit(test.node_id);
      }
    }

    return result;
  }

  /**
   * Gets direct dependencies of a test
   */
  getDirectDependencies(nodeId: string): DiscoveredTest[] {
    const node = this.graph.get(nodeId);
    if (!node) return [];

    const dependencies: DiscoveredTest[] = [];
    for (const depNodeId of node.dependencies) {
      const depNode = this.graph.get(depNodeId);
      if (depNode) {
        dependencies.push(depNode.test);
      }
    }

    return dependencies;
  }

  /**
   * Gets all transitive dependencies of a test
   */
  getTransitiveDependencies(nodeId: string): DiscoveredTest[] {
    const visited = new Set<string>();
    const result: DiscoveredTest[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.graph.get(id);
      if (!node) return;

      for (const depName of node.dependencies) {
        visit(depName);
        const depNode = this.graph.get(depName);
        if (depNode && !result.some((t) => t.node_id === depName)) {
          result.push(depNode.test);
        }
      }
    };

    visit(nodeId);
    return result;
  }

  /**
   * Checks if a test can be executed (all its dependencies have been resolved)
   */
  canExecute(nodeId: string): boolean {
    const node = this.graph.get(nodeId);
    if (!node) return true;

    for (const depId of node.dependencies) {
      const depNode = this.graph.get(depId);
      if (!depNode || !depNode.resolved) {
        return false;
      }
    }

    return true;
  }

  /**
   * Marks a test as resolved and stores its result
   */
  markResolved(nodeId: string, result: DependencyResult): void {
    const node = this.graph.get(nodeId);
    if (node) {
      node.resolved = true;
      node.executing = false;
    }

    // Stores in cache if enabled
    if (this.cacheEnabled && result.success) {
      this.cache.set(nodeId, {
        ...result,
        cached: true,
      });
    }
  }

  /**
   * Marks a test as executing
   */
  markExecuting(nodeId: string): void {
    const node = this.graph.get(nodeId);
    if (node) {
      node.executing = true;
    }
  }

  /**
   * Checks if there is a cached result for a test
   */
  getCachedResult(nodeId: string): DependencyResult | null {
    if (!this.cacheEnabled) return null;
    return this.cache.get(nodeId) || null;
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

    for (const [nodeId, node] of this.graph) {
      if (node.dependencies.size > 0) {
        testsWithDependencies++;
        totalEdges += node.dependencies.size;
      }

      if (node.dependents.size > 0) {
        testsWithDependents++;
      }

      // Calculates maximum dependency depth
      const depth = this.calculateDependencyDepth(nodeId);
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
    nodeId: string,
    visited = new Set<string>()
  ): number {
    if (visited.has(nodeId)) return 0; // Avoids infinite loops
    visited.add(nodeId);

    const node = this.graph.get(nodeId);
    if (!node || node.dependencies.size === 0) return 0;

    let maxDepth = 0;
    for (const depId of node.dependencies) {
      const depth = 1 + this.calculateDependencyDepth(depId, new Set(visited));
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

    for (const [nodeId, node] of this.graph) {
      const status = node.resolved ? "✅" : node.executing ? "⏳" : "⏸️";
      lines.push(`${status} ${nodeId} (${node.test.suite_name})`);

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
