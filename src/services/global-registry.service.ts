/**
 * Entry in the global variable registry
 *
 * Represents a variable exported by a suite with metadata
 * for tracking and debugging.
 */
interface GlobalVariableEntry {
  /** Name of the suite that exported the variable */
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
 * Namespace of variables exported by a suite
 *
 * Groups all variables exported by a specific suite
 * with control metadata.
 */
interface SuiteNamespace {
  /** Name of the owning suite */
  suiteName: string;

  /** Map of variables exported by this suite */
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
 * Manages variable sharing between different test suites,
 * allowing one suite to export variables that can be consumed
 * by other suites using the notation `suite_name.variable_name`.
 *
 * @example
 * ```typescript
 * const registry = new GlobalRegistryService();
 *
 * // Register suite that exports variables
 * registry.registerSuite('auth-suite', ['user_token', 'user_id'], './auth.yaml');
 *
 * // Set values of exported variables
 * registry.setExportedVariable('auth-suite', 'user_token', 'abc123');
 * registry.setExportedVariable('auth-suite', 'user_id', 'user-456');
 *
 * // Consume variables in other suites
 * const token = registry.getExportedVariable('auth-suite.user_token');
 * const userId = registry.getExportedVariable('auth-suite.user_id');
 * ```
 */
export class GlobalRegistryService {
  /** Main registry mapping suite name to its namespace */
  private registry: Map<string, SuiteNamespace> = new Map();

  /** Fast search index mapping full name (suite.variable) to suite name */
  private variableIndex: Map<string, string> = new Map();

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
   * Registers a suite and its exported variables
   *
   * Creates a namespace for the suite in the global registry and configures
   * which variables this suite intends to export to others.
   *
   * @param suiteName - Unique name of the suite
   * @param exports - Array with names of variables to be exported
   * @param filePath - Path of the suite file for reference
   *
   * @example
   * ```typescript
   * // Register suite that exports token and user_id
   * registry.registerSuite('auth-flow', ['token', 'user_id'], './flows/auth.yaml');
   * ```
   */
  registerSuite(suiteName: string, exports: string[], filePath: string): void {
    if (!this.registry.has(suiteName)) {
      this.registry.set(suiteName, {
        suiteName,
        variables: new Map(),
        exports: [],
        filePath,
        lastUpdated: Date.now(),
      });
    }

    const namespace = this.registry.get(suiteName)!;
    namespace.exports = exports;
    namespace.filePath = filePath;
    namespace.lastUpdated = Date.now();

    // Updates variable index
    for (const variableName of exports) {
      const fullName = `${suiteName}.${variableName}`;
      this.variableIndex.set(fullName, suiteName);
    }

    console.log(
      `📝 Registered suite '${suiteName}' with exports: [${exports.join(", ")}]`
    );
  }

  /**
   * Sets an exported variable for a suite
   */
  setExportedVariable(
    suiteName: string,
    variableName: string,
    value: any
  ): void {
    let namespace = this.registry.get(suiteName);

    if (!namespace) {
      // Creates namespace if it doesn't exist
      namespace = {
        suiteName,
        variables: new Map(),
        exports: [variableName],
        filePath: "",
        lastUpdated: Date.now(),
      };
      this.registry.set(suiteName, namespace);
    }

    // Verifica se a variável está na lista de exports
    if (!namespace.exports.includes(variableName)) {
      console.warn(
        `⚠️  Variable '${variableName}' is not in exports list for suite '${suiteName}'`
      );
    }

    const entry: GlobalVariableEntry = {
      suiteName,
      variableName,
      value,
      timestamp: Date.now(),
      filePath: namespace.filePath,
    };

    namespace.variables.set(variableName, entry);
    namespace.lastUpdated = Date.now();

    // Updates index
    const fullName = `${suiteName}.${variableName}`;
    this.variableIndex.set(fullName, suiteName);

    console.log(`📥 Exported: ${fullName} = ${this.formatValue(value)}`);
  }

  /**
   * Gets an exported variable using the suite.variable pattern
   */
  getExportedVariable(fullName: string): any {
    const [suiteName, variableName] = fullName.split(".", 2);

    if (!suiteName || !variableName) {
      console.warn(
        `⚠️  Invalid variable name format: '${fullName}'. Expected: 'suite.variable'`
      );
      return undefined;
    }

    const namespace = this.registry.get(suiteName);
    if (!namespace) {
      console.warn(`⚠️  Suite '${suiteName}' not found in global registry`);
      return undefined;
    }

    const entry = namespace.variables.get(variableName);
    if (!entry) {
      console.warn(
        `⚠️  Variable '${variableName}' not found in suite '${suiteName}'`
      );
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
   * Gets all exported variables from a suite
   */
  getSuiteVariables(suiteName: string): Record<string, any> {
    const namespace = this.registry.get(suiteName);
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

    for (const [suiteName, namespace] of this.registry) {
      for (const [variableName, entry] of namespace.variables) {
        const fullName = `${suiteName}.${variableName}`;
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
   * Lists all registered suites
   */
  getRegisteredSuites(): string[] {
    return Array.from(this.registry.keys()).sort();
  }

  /**
   * Gets detailed information of a suite
   */
  getSuiteInfo(suiteName: string): {
    suiteName: string;
    exports: string[];
    filePath: string;
    variableCount: number;
    lastUpdated: Date;
  } | null {
    const namespace = this.registry.get(suiteName);
    if (!namespace) {
      return null;
    }

    return {
      suiteName: namespace.suiteName,
      exports: namespace.exports,
      filePath: namespace.filePath,
      variableCount: namespace.variables.size,
      lastUpdated: new Date(namespace.lastUpdated),
    };
  }

  /**
   * Removes a suite from the registry
   */
  unregisterSuite(suiteName: string): void {
    const namespace = this.registry.get(suiteName);
    if (!namespace) {
      return;
    }

    // Removes from variable index
    for (const variableName of namespace.variables.keys()) {
      const fullName = `${suiteName}.${variableName}`;
      this.variableIndex.delete(fullName);
    }

    // Removes namespace
    this.registry.delete(suiteName);

    console.log(`🗑️  Unregistered suite '${suiteName}'`);
  }

  /**
   * Clears all exported variables from a suite
   */
  clearSuiteVariables(suiteName: string): void {
    const namespace = this.registry.get(suiteName);
    if (!namespace) {
      return;
    }

    // Removes variables from index
    for (const variableName of namespace.variables.keys()) {
      const fullName = `${suiteName}.${variableName}`;
      this.variableIndex.delete(fullName);
    }

    // Clears variables
    namespace.variables.clear();
    namespace.lastUpdated = Date.now();

    console.log(`🧹 Cleared variables for suite '${suiteName}'`);
  }

  /**
   * Clears the entire registry
   */
  clearAll(): void {
    this.registry.clear();
    this.variableIndex.clear();
    console.log("🧹 Cleared all exported variables");
  }

  /**
   * Gets registry statistics
   */
  getStats(): {
    total_suites: number;
    total_exported_variables: number;
    suites_with_variables: number;
    average_variables_per_suite: number;
    most_recent_update: Date | null;
  } {
    const totalSuites = this.registry.size;
    let totalVariables = 0;
    let suitesWithVariables = 0;
    let mostRecentUpdate = 0;

    for (const namespace of this.registry.values()) {
      const variableCount = namespace.variables.size;
      totalVariables += variableCount;

      if (variableCount > 0) {
        suitesWithVariables++;
      }

      mostRecentUpdate = Math.max(mostRecentUpdate, namespace.lastUpdated);
    }

    return {
      total_suites: totalSuites,
      total_exported_variables: totalVariables,
      suites_with_variables: suitesWithVariables,
      average_variables_per_suite:
        totalSuites > 0 ? totalVariables / totalSuites : 0,
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
        ([suiteName, namespace]) => ({
          suiteName,
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
    for (const [fullName, suiteName] of this.variableIndex) {
      const [expectedSuiteName, variableName] = fullName.split(".", 2);

      if (expectedSuiteName !== suiteName) {
        errors.push(
          `Index mismatch: ${fullName} points to ${suiteName} but should point to ${expectedSuiteName}`
        );
      }

      const namespace = this.registry.get(suiteName);
      if (!namespace) {
        errors.push(`Index references non-existent suite: ${suiteName}`);
        continue;
      }

      if (!namespace.variables.has(variableName)) {
        warnings.push(`Index references non-existent variable: ${fullName}`);
      }
    }

    // Checks if all variables are in the index
    for (const [suiteName, namespace] of this.registry) {
      for (const variableName of namespace.variables.keys()) {
        const fullName = `${suiteName}.${variableName}`;
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
