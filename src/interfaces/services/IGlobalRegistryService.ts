/**
 * @fileoverview Global registry service interface for dependency injection.
 *
 * @remarks
 * Defines the contract for the global variable registry that manages
 * exported variables between test suites.
 *
 * @packageDocumentation
 */

/**
 * Global variable registry interface
 *
 * @remarks
 * Manages exported variables from test suites, enabling cross-suite
 * variable sharing and dependency management.
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.IGlobalRegistryService) private registry: IGlobalRegistryService) {}
 *
 *   afterSuiteExecution(suite: TestSuite): void {
 *     // Register suite and its exports
 *     this.registry.registerNode(suite.node_id, suite.exports || []);
 *
 *     // Set exported variables
 *     this.registry.setExportedVariable(suite.node_id, 'auth_token', token);
 *   }
 * }
 * ```
 */
export interface IGlobalRegistryService {
  /**
   * Register a node (test suite) with its export declarations
   *
   * @param nodeId - Unique identifier of the node
   * @param suiteName - Display name of the suite
   * @param exports - Array of variable names this node exports
   * @param filePath - Path to the test file
   */
  registerNode(
    nodeId: string,
    suiteName: string,
    exports: string[],
    filePath: string
  ): void;

  /**
   * Set an exported variable value for a node
   *
   * @param nodeId - Node identifier that owns the variable
   * @param variableName - Name of the variable to export
   * @param value - Value to store
   */
  setExportedVariable(nodeId: string, variableName: string, value: any): void;

  /**
   * Get an exported variable by its full qualified name
   *
   * @param fullName - Full variable name in format 'node-id.variable-name'
   * @returns The variable value or undefined if not found
   */
  getExportedVariable(fullName: string): any;

  /**
   * Check if an exported variable exists
   *
   * @param fullName - Full variable name in format 'node-id.variable-name'
   * @returns True if the variable exists
   */
  hasExportedVariable(fullName: string): boolean;

  /**
   * Get all exported variables from a specific node
   *
   * @param nodeId - Node identifier
   * @returns Record of variable names to values
   */
  getNodeVariables(nodeId: string): Record<string, any>;

  /**
   * Get all exported variables from all nodes
   *
   * @returns Record of full variable names to values
   */
  getAllExportedVariables(): Record<string, any>;

  /**
   * Get list of all available exported variable names
   *
   * @returns Array of full variable names
   */
  getAvailableVariableNames(): string[];

  /**
   * Get list of all registered node IDs
   *
   * @returns Array of node identifiers
   */
  getRegisteredNodes(): string[];

  /**
   * Get information about a registered node
   *
   * @param nodeId - Node identifier
   * @returns Node information including exports, suite name, file path
   */
  getNodeInfo(nodeId: string): {
    nodeId: string;
    suiteName: string;
    exports: string[];
    filePath: string;
    variableCount: number;
    lastUpdated: Date;
  } | null;

  /**
   * Unregister a node and its variables
   *
   * @param nodeId - Node identifier to unregister
   */
  unregisterNode(nodeId: string): void;

  /**
   * Clear all variables for a specific node
   *
   * @param nodeId - Node identifier
   */
  clearNodeVariables(nodeId: string): void;

  /**
   * Clear all registered nodes and variables
   */
  clearAll(): void;

  /**
   * Get registry statistics
   *
   * @returns Statistics object with counts and metadata
   */
  getStats(): {
    total_nodes: number;
    total_exported_variables: number;
    nodes_with_variables: number;
    average_variables_per_node: number;
    most_recent_update: Date | null;
  };

  /**
   * Export current registry state as JSON string
   *
   * @returns JSON representation of registry state
   */
  exportState(): string;

  /**
   * Create a snapshot of the current registry state
   *
   * @returns Function that when called restores the snapshot
   */
  createSnapshot(): () => void;

  /**
   * Validate registry integrity
   *
   * @returns Validation result with any warnings or errors
   */
  validateIntegrity(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}
