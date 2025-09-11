import { getLogger } from "./logger.service";

/**
 * Entry in the global variable registry
 *
 * Represents a variable exported by a node with metadata
 * for tracking and debugging.
 */
interface GlobalVariableEntry {
  /** Node ID that exported the variable */
  nodeId: string;

  /** Name of the suite (for display) */
  suiteName: string;

  /** Name of the exported variable */
  variableName: string;

  /** Current value of the variable */
  value: any;

  /** Timestamp of the last update */
  timestamp: number;

  /** Path of the suite file */
  filePath: string;
}

/**
 * Namespace of variables exported by a node
 *
 * Groups all variables exported by a specific node
 * with control metadata.
 */
interface NodeNamespace {
  /** Node ID of the owning node */
  nodeId: string;

  /** Name of the suite (for display) */
  suiteName: string;

  /** Map of variables exported by this node */
  variables: Map<string, GlobalVariableEntry>;

  /** List of variable names that should be exported */
  exports: string[];

  /** Path of the suite file */
  filePath: string;

  /** Timestamp of the last namespace update */
  lastUpdated: number;
}

/**
 * Global registry service for variables exported between flows
 *
 * Manages variable sharing between different test nodes,
 * allowing one node to export variables that can be consumed
 * by other nodes using the notation `nodeId.variable_name`.
 *
 * @example
 * ```typescript
 * const registry = new GlobalRegistryService();
 *
 * // Register node that exports variables
 * registry.registerNode('auth', 'Authentication Flow', ['user_token', 'user_id'], './auth.yaml');
 *
 * // Set values of exported variables
 * registry.setExportedVariable('auth', 'user_token', 'abc123');
 * registry.setExportedVariable('auth', 'user_id', 'user-456');
 *
 * // Consume variables in other nodes
 * const token = registry.getExportedVariable('auth.user_token');
 * const userId = registry.getExportedVariable('auth.user_id');
 * ```
 */
export class GlobalRegistryService {
  /** Main registry mapping node ID to its namespace */
  private registry: Map<string, NodeNamespace> = new Map();

  /** Fast search index mapping full name (nodeId.variable) to node ID */
  private variableIndex: Map<string, string> = new Map();

  private logger = getLogger();

  /**
   * GlobalRegistryService constructor
   *
   * Initializes internal data structures for the registry.
   */
  constructor() {
    this.registry = new Map();
    this.variableIndex = new Map();
  }

  /**
   * Registers a node and its exported variables
   *
   * Creates a namespace for the node in the global registry and configures
   * which variables this node intends to export to others.
   *
   * @param nodeId - Unique node identifier
   * @param suiteName - Descriptive name of the suite (for display)
   * @param exports - Array with names of variables to be exported
   * @param filePath - Path of the suite file for reference
   *
   * @example
   * ```typescript
   * // Register node that exports token and user_id
   * registry.registerNode('auth', 'Authentication Flow', ['token', 'user_id'], './flows/auth.yaml');
   * ```
   */
  registerNode(
    nodeId: string,
    suiteName: string,
    exports: string[],
    filePath: string
  ): void {
    if (!this.registry.has(nodeId)) {
      this.registry.set(nodeId, {
        nodeId,
        suiteName,
        variables: new Map(),
        exports: [],
        filePath,
        lastUpdated: Date.now(),
      });
    }

    const namespace = this.registry.get(nodeId)!;
    namespace.exports = exports;
    namespace.suiteName = suiteName;
    namespace.filePath = filePath;
    namespace.lastUpdated = Date.now();

    // Updates variable index
    for (const variableName of exports) {
      const fullName = `${nodeId}.${variableName}`;
      this.variableIndex.set(fullName, nodeId);
    }

    this.logger.info(
      `Registered node '${nodeId}' (${suiteName}) with exports: [${exports.join(
        ", "
      )}]`
    );
  }

  /**
   * Sets an exported variable for a node
   */
  setExportedVariable(nodeId: string, variableName: string, value: any): void {
    let namespace = this.registry.get(nodeId);

    if (!namespace) {
      // Creates namespace if it doesn't exist
      namespace = {
        nodeId,
        suiteName: nodeId, // fallback to nodeId as suite name
        variables: new Map(),
        exports: [variableName],
        filePath: "",
        lastUpdated: Date.now(),
      };
      this.registry.set(nodeId, namespace);
    }

    // Verifica se a variável está na lista de exports
    if (!namespace.exports.includes(variableName)) {
      console.warn(
        `⚠️  Variable '${variableName}' is not in exports list for node '${nodeId}'`
      );
    }

    const entry: GlobalVariableEntry = {
      nodeId,
      suiteName: namespace.suiteName,
      variableName,
      value,
      timestamp: Date.now(),
      filePath: namespace.filePath,
    };

    namespace.variables.set(variableName, entry);
    namespace.lastUpdated = Date.now();

    // Updates index
    const fullName = `${nodeId}.${variableName}`;
    this.variableIndex.set(fullName, nodeId);

    this.logger.info(`Exported: ${fullName} = ${this.formatValue(value)}`);
  }

  /**
   * Gets an exported variable using the nodeId.variable pattern
   */
  getExportedVariable(fullName: string): any {
    const [nodeId, variableName] = fullName.split(".", 2);

    if (!nodeId || !variableName) {
      this.logger.warn(
        `Invalid variable name format: '${fullName}'. Expected: 'nodeId.variable'`
      );
      return undefined;
    }

    const namespace = this.registry.get(nodeId);
    if (!namespace) {
      this.logger.warn(`Node '${nodeId}' not found in global registry`);
      return undefined;
    }

    const entry = namespace.variables.get(variableName);
    if (!entry) {
      // Verifica se é uma variável runtime típica que foi limpa intencionalmente
      const isLikelyRuntimeVariable =
        this.isLikelyRuntimeVariable(variableName);
      if (isLikelyRuntimeVariable) {
        this.logger.debug(
          `Runtime variable '${variableName}' not found in node '${nodeId}' (expected after cleanup)`
        );
      } else {
        this.logger.warn(
          `Variable '${variableName}' not found in node '${nodeId}'`
        );
      }
      return undefined;
    }

    return entry.value;
  }

  /**
   * Checks if an exported variable exists
   */
  hasExportedVariable(fullName: string): boolean {
    return this.variableIndex.has(fullName);
  }

  /**
   * Gets all exported variables from a node
   */
  getNodeVariables(nodeId: string): Record<string, any> {
    const namespace = this.registry.get(nodeId);
    if (!namespace) {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [variableName, entry] of namespace.variables) {
      result[variableName] = entry.value;
    }

    return result;
  }

  /**
   * Gets all exported variables with full namespace
   */
  getAllExportedVariables(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [nodeId, namespace] of this.registry) {
      for (const [variableName, entry] of namespace.variables) {
        const fullName = `${nodeId}.${variableName}`;

        // Always include namespaced variables - they should be distinct from runtime variables
        result[fullName] = entry.value;
      }
    }

    return result;
  }

  /**
   * Lists all available variable names
   */
  getAvailableVariableNames(): string[] {
    return Array.from(this.variableIndex.keys()).sort();
  }

  /**
   * Lists all registered nodes
   */
  getRegisteredNodes(): string[] {
    return Array.from(this.registry.keys()).sort();
  }

  /**
   * Gets detailed information of a node
   */
  getNodeInfo(nodeId: string): {
    nodeId: string;
    suiteName: string;
    exports: string[];
    filePath: string;
    variableCount: number;
    lastUpdated: Date;
  } | null {
    const namespace = this.registry.get(nodeId);
    if (!namespace) {
      return null;
    }

    return {
      nodeId: namespace.nodeId,
      suiteName: namespace.suiteName,
      exports: namespace.exports,
      filePath: namespace.filePath,
      variableCount: namespace.variables.size,
      lastUpdated: new Date(namespace.lastUpdated),
    };
  }

  /**
   * Removes a node from the registry
   */
  unregisterNode(nodeId: string): void {
    const namespace = this.registry.get(nodeId);
    if (!namespace) {
      return;
    }

    // Removes from variable index
    for (const variableName of namespace.variables.keys()) {
      const fullName = `${nodeId}.${variableName}`;
      this.variableIndex.delete(fullName);
    }

    // Removes namespace
    this.registry.delete(nodeId);

    this.logger.info(`Unregistered node '${nodeId}' (${namespace.suiteName})`);
  }

  /**
   * Clears all exported variables from a node
   */
  clearNodeVariables(nodeId: string): void {
    const namespace = this.registry.get(nodeId);
    if (!namespace) {
      return;
    }

    // Removes variables from index
    for (const variableName of namespace.variables.keys()) {
      const fullName = `${nodeId}.${variableName}`;
      this.variableIndex.delete(fullName);
    }

    // Clears variables
    namespace.variables.clear();
    namespace.lastUpdated = Date.now();

    this.logger.info(
      `Cleared variables for node '${nodeId}' (${namespace.suiteName})`
    );
  }

  /**
   * Clears the entire registry
   */
  clearAll(): void {
    this.registry.clear();
    this.variableIndex.clear();
    this.logger.info("Cleared all exported variables");
  }

  /**
   * Gets registry statistics
   */
  getStats(): {
    total_nodes: number;
    total_exported_variables: number;
    nodes_with_variables: number;
    average_variables_per_node: number;
    most_recent_update: Date | null;
  } {
    const totalNodes = this.registry.size;
    let totalVariables = 0;
    let nodesWithVariables = 0;
    let mostRecentUpdate = 0;

    for (const namespace of this.registry.values()) {
      const variableCount = namespace.variables.size;
      totalVariables += variableCount;

      if (variableCount > 0) {
        nodesWithVariables++;
      }

      mostRecentUpdate = Math.max(mostRecentUpdate, namespace.lastUpdated);
    }

    return {
      total_nodes: totalNodes,
      total_exported_variables: totalVariables,
      nodes_with_variables: nodesWithVariables,
      average_variables_per_node:
        totalNodes > 0 ? totalVariables / totalNodes : 0,
      most_recent_update:
        mostRecentUpdate > 0 ? new Date(mostRecentUpdate) : null,
    };
  }

  /**
   * Exports registry state for debugging
   */
  exportState(): string {
    const state = {
      registry: Array.from(this.registry.entries()).map(
        ([nodeId, namespace]) => ({
          nodeId,
          suiteName: namespace.suiteName,
          exports: namespace.exports,
          filePath: namespace.filePath,
          variables: Array.from(namespace.variables.entries()).map(
            ([name, entry]) => ({
              name,
              value: entry.value,
              timestamp: entry.timestamp,
            })
          ),
          lastUpdated: namespace.lastUpdated,
        })
      ),
      stats: this.getStats(),
      variableIndex: Array.from(this.variableIndex.entries()),
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Creates snapshot of current state
   */
  createSnapshot(): () => void {
    const registrySnapshot = new Map(this.registry);
    const indexSnapshot = new Map(this.variableIndex);

    // Deep clone of namespaces
    const deepClonedRegistry = new Map();
    for (const [key, namespace] of registrySnapshot) {
      deepClonedRegistry.set(key, {
        ...namespace,
        variables: new Map(namespace.variables),
      });
    }

    return () => {
      this.registry = deepClonedRegistry;
      this.variableIndex = new Map(indexSnapshot);
    };
  }

  /**
   * Validates registry integrity
   */
  validateIntegrity(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Checks if index is synchronized with registry
    for (const [fullName, nodeId] of this.variableIndex) {
      const [expectedNodeId, variableName] = fullName.split(".", 2);

      if (expectedNodeId !== nodeId) {
        errors.push(
          `Index mismatch: ${fullName} points to ${nodeId} but should point to ${expectedNodeId}`
        );
      }

      const namespace = this.registry.get(nodeId);
      if (!namespace) {
        errors.push(`Index references non-existent node: ${nodeId}`);
        continue;
      }

      if (!namespace.variables.has(variableName)) {
        warnings.push(`Index references non-existent variable: ${fullName}`);
      }
    }

    // Checks if all variables are in the index
    for (const [nodeId, namespace] of this.registry) {
      for (const variableName of namespace.variables.keys()) {
        const fullName = `${nodeId}.${variableName}`;
        if (!this.variableIndex.has(fullName)) {
          errors.push(`Variable ${fullName} exists but is not in index`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Determines if a variable name is likely a runtime variable that gets cleaned between nodes
   * Used to reduce warning noise for expected cleanup behavior
   */
  private isLikelyRuntimeVariable(variableName: string): boolean {
    // Common runtime variable patterns that are expected to be cleaned
    const runtimeVariablePatterns = [
      /^user_id$/,
      /^user_name$/,
      /^user_email$/,
      /^company_data$/,
      /^auth_token$/,
      /^login_success$/,
      /^error_handled$/,
      /^response_type$/,
      /^performance$/,
      /^test_user_id$/,
      /^test_user_email$/,
      /^crud_success$/,
      /^crud_performance$/,
      /^performance_rating$/,
      /^performance_score$/,
      /^init_success$/,
      /.*_data$/,
      /.*_result$/,
      /.*_status$/,
    ];

    return runtimeVariablePatterns.some((pattern) =>
      pattern.test(variableName)
    );
  }

  /**
   * Formats a value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (typeof value === "string") {
      return value.length > 50
        ? `"${value.substring(0, 47)}..."`
        : `"${value}"`;
    }

    if (typeof value === "object") {
      return JSON.stringify(value).length > 50
        ? "{...}"
        : JSON.stringify(value);
    }

    return String(value);
  }
}
