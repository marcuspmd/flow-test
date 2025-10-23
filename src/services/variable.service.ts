/**
 * @fileoverview Variable scope management and resolution service.
 *
 * @remarks
 * This module provides the VariableService class which handles hierarchical variable
 * scope management (runtime > suite > imported > global). Interpolation is delegated
 * to the InterpolationService for consistency across the application.
 *
 * @packageDocumentation
 */

import { injectable, inject } from "inversify";
import { GlobalVariableContext } from "../types/config.types";
import { GlobalRegistryService } from "./global-registry.service";
import { JavaScriptExecutionContext } from "./javascript.service";
import { getLogger } from "./logger.service";
import {
  interpolationService,
  InterpolationContext,
} from "./interpolation.service";
import { ConfigManager } from "../core/config";
import { TYPES } from "../di/identifiers";
import { ILogger } from "../interfaces/services/ILogger";
import { IGlobalRegistryService } from "../interfaces/services/IGlobalRegistryService";
import { IConfigManager } from "../interfaces/services/IConfigManager";
import { IVariableService } from "../interfaces/services/IVariableService";

/**
 * Service responsible for variable interpolation and resolution
 *
 * Manages the hierarchical context of variables and provides functionality
 * for interpolation using the {{variable_name}} syntax. Supports multiple
 * scopes: runtime > suite > imported > global.
 *
 * @example
 * ```typescript
 * const variableService = new VariableService({
 *   global: { api_url: 'https://api.example.com' },
 *   suite: { user_id: 123 },
 *   runtime: { auth_token: 'abc123' },
 *   imported: { auth: { token: 'xyz789' } }
 * });
 *
 * const url = variableService.interpolate('{{api_url}}/users/{{user_id}}');
 * // Results in: 'https://api.example.com/users/123'
 *
 * const authToken = variableService.interpolate('{{auth.token}}');
 * // Results in: 'xyz789' (imported variable)
 * ```
 */
@injectable()
export class VariableService implements IVariableService {
  /** Hierarchical context of variables with different scopes */
  private context: GlobalVariableContext;

  /** Global registry service for exported variables */
  private globalRegistry?: IGlobalRegistryService;

  /** Current execution context for JavaScript expressions */
  private currentExecutionContext: JavaScriptExecutionContext = {};

  /** Logger service */
  private logger: ILogger;

  /** Interpolation cache for performance optimization */
  private interpolationCache: Map<string, any> = new Map();

  /** Cache enabled flag */
  private cacheEnabled: boolean = true;

  /** Dependencies (node_ids of dependent flows) */
  private dependencies: string[] = [];

  /** Optional ConfigManager for loading global variables */
  private configManager?: IConfigManager;

  /**
   * VariableService constructor with Dependency Injection
   *
   * @param logger - Logger service instance
   * @param configManager - Optional config manager for loading global variables
   * @param globalRegistry - Optional global registry for exported variables
   */
  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigManager) configManager?: IConfigManager,
    @inject(TYPES.IGlobalRegistryService)
    globalRegistry?: IGlobalRegistryService
  ) {
    this.logger = logger;
    this.configManager = configManager;
    this.globalRegistry = globalRegistry;
    this.context = this.initializeContext();
  }

  /**
   * Legacy constructor support for backward compatibility
   * Use setContext() after instantiation when using legacy approach
   */
  setContext(
    contextOrConfigManager: GlobalVariableContext | ConfigManager,
    globalRegistry?: GlobalRegistryService
  ): void {
    // Check if it's a ConfigManager instance
    if (contextOrConfigManager instanceof ConfigManager) {
      this.configManager = contextOrConfigManager as any;
      if (globalRegistry) {
        this.globalRegistry = globalRegistry as any;
      }
      this.context = this.initializeContext();
    } else {
      // Legacy: direct context initialization
      this.context = contextOrConfigManager;
      // Ensure environment is set if not provided
      if (!this.context.environment) {
        this.context.environment = this.loadEnvironmentVariables();
      }
      if (globalRegistry) {
        this.globalRegistry = globalRegistry as any;
      }
    }
  }

  /**
   * Initializes the variable context from ConfigManager
   */
  private initializeContext(): GlobalVariableContext {
    return {
      environment: this.loadEnvironmentVariables(),
      global: this.configManager?.getGlobalVariables() || {},
      suite: {},
      runtime: {},
      imported: {},
    };
  }

  /**
   * Loads all environment variables from process.env
   */
  private loadEnvironmentVariables(): Record<string, any> {
    const envVars: Record<string, any> = {};
    Object.keys(process.env).forEach((key) => {
      envVars[key] = process.env[key];
    });
    return envVars;
  }

  /**
   * Interpolates variables in a string or complex structure
   *
   * Replaces {{variable_name}} placeholders with corresponding values
   * following the scope hierarchy: runtime > suite > imported > global.
   * Supports interpolation in strings, arrays and objects recursively.
   *
   * @remarks
   * This method now delegates to InterpolationService for consistency.
   * It provides a variableResolver function that looks up variables
   * in the hierarchical context. Includes caching for performance.
   *
   * @param template - String, array or object containing variable placeholders
   * @param suppressWarnings - If true, suppresses warnings for missing variables (useful for cleanup testing)
   * @param visitedObjects - Internal set for circular reference detection (deprecated, handled by InterpolationService)
   * @returns Value with all variables interpolated
   *
   * @example
   * ```typescript
   * // Simple string
   * interpolate('Hello {{username}}!') // → 'Hello john!'
   *
   * // Complex object
   * interpolate({
   *   url: '{{api_url}}/users/{{user_id}}',
   *   headers: { 'Authorization': 'Bearer {{token}}' }
   * })
   * // → { url: 'https://api.com/users/123', headers: { 'Authorization': 'Bearer abc123' } }
   *
   * // Array
   * interpolate(['{{env}}', '{{version}}']) // → ['production', '1.0.0']
   * ```
   */
  interpolate(template: string | any, suppressWarnings: boolean = false): any {
    // Check cache for string templates
    if (
      typeof template === "string" &&
      this.cacheEnabled &&
      this.interpolationCache.has(template)
    ) {
      return this.interpolationCache.get(template);
    }

    // Create interpolation context
    const context: InterpolationContext = {
      variableResolver: (path: string) => this.resolveVariable(path),
      javascriptContext: this.currentExecutionContext,
      suppressWarnings,
    };

    // Delegate to InterpolationService
    const result = interpolationService.interpolate(template, context);

    // Cache string results
    if (typeof template === "string" && this.cacheEnabled) {
      this.interpolationCache.set(template, result);
    }

    return result;
  }

  /**
   * Resolves a variable following the scope hierarchy
   *
   * Searches for a variable in precedence order: runtime > suite > imported > global > globalRegistry.
   * Supports dot notation for nested access and exported variables (ex: auth.token).
   *
   * @remarks
   * This method is now focused solely on variable lookup in the hierarchical context.
   * Special interpolations ($faker, $js, $env) are handled by InterpolationService strategies.
   *
   * @param variablePath - Variable path (can use dot notation)
   * @returns Variable value or undefined if not found
   * @private
   *
   * @example
   * ```typescript
   * resolveVariable('username') // Searches in all scopes
   * resolveVariable('auth.token') // Searches specifically for exported variable from nodeId 'auth'
   * resolveVariable('user.profile.name') // Nested access with dot notation
   * ```
   */
  private resolveVariable(variablePath: string): any {
    // NOTE: $env, $faker, and $js are now handled by InterpolationService strategies
    // This method only resolves variables from the hierarchical context

    // First, check in runtime if the exact variable exists (including dots)
    if (this.context.runtime[variablePath] !== undefined) {
      return this.context.runtime[variablePath];
    }

    // Handle path navigation for local variables
    if (variablePath.includes(".")) {
      const parts = variablePath.split(".");
      const baseName = parts[0];

      // Check in hierarchy for base variable
      const baseValue =
        this.context.runtime[baseName] ??
        this.context.suite[baseName] ??
        this.findInImported(baseName) ??
        this.context.global[baseName];

      // If base variable found, navigate through the path
      if (baseValue !== undefined) {
        const pathResult = this.getNestedValue(
          baseValue,
          parts.slice(1).join(".")
        );
        if (pathResult !== undefined) {
          return pathResult;
        }
      }

      // If local path navigation failed, try global exported variable (ex: auth.token)
      if (this.globalRegistry) {
        const globalValue =
          this.globalRegistry.getExportedVariable(variablePath);
        if (globalValue !== undefined) {
          return globalValue;
        }
      }

      // Try imported flow variable (legacy support)
      const flowVariables = this.context.imported[baseName];
      if (flowVariables) {
        return this.getNestedValue(flowVariables, parts.slice(1).join("."));
      }

      return undefined;
    }

    // Resolution hierarchy for simple variables: runtime > suite > imported > global
    const value =
      this.context.suite[variablePath] ??
      this.findInImported(variablePath) ??
      this.context.global[variablePath];

    return value;
  }

  /**
   * Searches for a variable in all imported flows.
   */
  private findInImported(variableName: string): any {
    for (const flowVariables of Object.values(this.context.imported)) {
      if (variableName in flowVariables) {
        return flowVariables[variableName];
      }
    }
    return undefined;
  }

  /**
   * Gets a nested value using dot notation.
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Sets a variable in the runtime context.
   */
  setVariable(name: string, value: any): void {
    this.context.runtime[name] = value;
    this.invalidateCacheForVariable(name);
  }

  /**
   * Sets multiple variables in the runtime context.
   */
  setVariables(variables: Record<string, any>): void {
    Object.assign(this.context.runtime, variables);
    this.clearCache();
  }

  /**
   * Adds variables from an imported flow.
   */
  addImportedFlow(flowName: string, variables: Record<string, any>): void {
    this.context.imported[flowName] = { ...variables };
  }

  /**
   * Gets the current state of all variables.
   */
  getAllVariables(): Record<string, any> {
    return {
      ...this.context.global,
      ...this.findAllImported(),
      ...this.context.suite,
      ...this.context.runtime,
    };
  }

  /**
   * Collects all variables from imported flows.
   */
  private findAllImported(): Record<string, any> {
    const allImported: Record<string, any> = {};
    for (const [flowName, variables] of Object.entries(this.context.imported)) {
      for (const [key, value] of Object.entries(variables)) {
        // Always use namespaced format for imported variables
        allImported[`${flowName}.${key}`] = value;
      }
    }
    return allImported;
  }

  /**
   * Exports variables from runtime to global registry
   * Only variables listed in exports will be made available globally
   *
   * @param nodeId - Unique node identifier
   * @param suiteName - Descriptive suite name
   * @param exports - Array of variable names to export
   * @param capturedVariables - Variables captured during execution
   */
  exportVariables(
    nodeId: string,
    suiteName: string,
    exports: string[],
    capturedVariables: Record<string, any>
  ): void {
    if (!this.globalRegistry) {
      this.logger.warn(
        `Cannot export variables: Global registry not available for node '${nodeId}'`
      );
      return;
    }

    // Register node with its exports
    this.globalRegistry.registerNode(nodeId, suiteName, exports, "");

    // Export only the variables that are in the exports list
    for (const variableName of exports) {
      if (variableName in capturedVariables) {
        this.globalRegistry.setExportedVariable(
          nodeId,
          variableName,
          capturedVariables[variableName]
        );
      } else if (variableName in this.context.runtime) {
        this.globalRegistry.setExportedVariable(
          nodeId,
          variableName,
          this.context.runtime[variableName]
        );
      } else {
        this.logger.warn(
          `Export '${variableName}' not found in captured variables for suite '${suiteName}'`
        );
      }
    }
  }

  /**
   * Gets all available global exported variables
   */
  getGlobalExportedVariables(): Record<string, any> {
    if (!this.globalRegistry) {
      return {};
    }
    return this.globalRegistry.getAllExportedVariables();
  }

  /**
   * Checks if a variable is available (including global exports)
   */
  hasVariable(variablePath: string): boolean {
    return this.resolveVariable(variablePath) !== undefined;
  }

  /**
   * Gets all available variables including global exports
   */
  getAllAvailableVariables(): Record<string, any> {
    const localVariables = this.getAllVariables();
    const globalVariables = this.getGlobalExportedVariables();

    return {
      ...localVariables,
      ...globalVariables,
    };
  }

  /**
   * Updates the current execution context for JavaScript expressions
   */
  setExecutionContext(context: Partial<JavaScriptExecutionContext>): void {
    this.currentExecutionContext = {
      ...this.currentExecutionContext,
      ...context,
      // Always provide current variables
      variables: this.getAllVariables(),
    };
  }

  /**
   * Sets the global registry service
   */
  setGlobalRegistry(globalRegistry: GlobalRegistryService): void {
    this.globalRegistry = globalRegistry;
    this.clearCache();
  }

  /**
   * Sets the dependencies for this flow (node_ids of dependent flows)
   */
  setDependencies(dependencies: string[]): void {
    this.dependencies = dependencies;
    this.clearCache();
  }

  /**
   * Clears the interpolation cache
   */
  clearCache(): void {
    this.interpolationCache.clear();
  }

  /**
   * Invalidates cache entries that use a specific variable
   */
  private invalidateCacheForVariable(variableName: string): void {
    const pattern = new RegExp(`\\{\\{[^}]*${variableName}[^}]*\\}\\}`);

    for (const [template] of this.interpolationCache) {
      if (typeof template === "string" && pattern.test(template)) {
        this.interpolationCache.delete(template);
      }
    }
  }

  /**
   * Enables/disables interpolation cache
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Sets variables in runtime scope
   */
  setRuntimeVariables(variables: Record<string, any>): void {
    Object.assign(this.context.runtime, variables);
    this.clearCache();
  }

  /**
   * Sets a single variable in runtime scope
   */
  setRuntimeVariable(name: string, value: any): void {
    this.context.runtime[name] = value;
    this.invalidateCacheForVariable(name);
  }

  /**
   * Sets variables in suite scope (with interpolation)
   */
  setSuiteVariables(variables: Record<string, any>): void {
    // Interpolate variables when setting them to resolve expressions like {{$js.return ...}}
    const interpolatedVariables: Record<string, any> = {};
    for (const [key, value] of Object.entries(variables)) {
      interpolatedVariables[key] = this.interpolate(value);
    }
    Object.assign(this.context.suite, interpolatedVariables);
    this.clearCache();
  }

  /**
   * Gets a specific variable following the hierarchy
   */
  getVariable(name: string): any {
    // First check in context hierarchy
    const hierarchyValue =
      this.context.runtime[name] ??
      this.context.suite[name] ??
      this.findInImported(name) ??
      this.context.global[name] ??
      (this.context.environment ? this.context.environment[name] : undefined);

    if (hierarchyValue !== undefined) {
      return hierarchyValue;
    }

    // Check for dependency variables if registry is available
    if (
      this.globalRegistry &&
      this.dependencies.length > 0 &&
      !name.includes(".")
    ) {
      // Check if the variable name is a dependency node_id itself
      if (this.dependencies.includes(name)) {
        const nodeVariables = this.globalRegistry.getNodeVariables(name);
        if (Object.keys(nodeVariables).length > 0) {
          return nodeVariables;
        }
      }

      // Check for exported variables from dependencies
      for (const dependencyNodeId of this.dependencies) {
        const exportedValue = this.globalRegistry.getExportedVariable(
          `${dependencyNodeId}.${name}`
        );
        if (exportedValue !== undefined) {
          return exportedValue;
        }
      }
    }

    // Provide default fallback for execution_mode
    if (name === "execution_mode") {
      return "sequential";
    }

    return undefined;
  }

  /**
   * Gets statistics of the variable system
   */
  getStats(): {
    environment_vars: number;
    global_vars: number;
    suite_vars: number;
    runtime_vars: number;
    imported_vars: number;
    cache_size: number;
    cache_enabled: boolean;
  } {
    return {
      environment_vars: this.context.environment
        ? Object.keys(this.context.environment).length
        : 0,
      global_vars: Object.keys(this.context.global).length,
      suite_vars: Object.keys(this.context.suite).length,
      runtime_vars: Object.keys(this.context.runtime).length,
      imported_vars: Object.keys(this.context.imported).length,
      cache_size: this.interpolationCache.size,
      cache_enabled: this.cacheEnabled,
    };
  }

  /**
   * Gets variables from a specific scope
   */
  getVariablesByScope(scope: keyof GlobalVariableContext): Record<string, any> {
    // For environment variables, return current process.env instead of cached version
    if (scope === "environment") {
      return { ...process.env };
    }
    return { ...this.context[scope] };
  }

  /**
   * Lists names of all available variables
   */
  getAvailableVariableNames(): string[] {
    const allVars = this.getAllVariables();
    return Object.keys(allVars).sort();
  }

  /**
   * Interpolates a string replacing {{variable}} with values
   *
   * @param template - String template with variable placeholders
   * @returns Interpolated string
   */
  interpolateString(template: string): string {
    if (!template || typeof template !== "string") {
      return template ? String(template) : "";
    }

    const result = this.interpolate(template);
    return typeof result === "string" ? result : String(result);
  }

  /**
   * Creates a snapshot of the current variable state
   * Returns a function that when called, restores the state
   */
  createSnapshot(): () => void {
    const snapshot = JSON.parse(JSON.stringify(this.context));

    return () => {
      this.context = snapshot;
      this.clearCache();
    };
  }

  /**
   * Clears all runtime variables (used when switching between nodes)
   * Preserves global, suite, and imported variables
   */
  clearRuntimeVariables(): void {
    this.context.runtime = {};
    this.clearCache();
    this.logger.info("Runtime variables cleared for node transition");
  }

  /**
   * Clears suite-specific variables (used when switching between test suites)
   * Preserves global and imported variables, clears runtime variables
   */
  clearSuiteVariables(): void {
    this.context.suite = {};
    this.context.runtime = {};
    this.clearCache();
    this.logger.info(
      "Suite and runtime variables cleared for suite transition"
    );
  }

  /**
   * Clears all non-global variables (used for complete cleanup)
   * Only preserves global variables
   */
  clearAllNonGlobalVariables(): void {
    this.context.suite = {};
    this.context.runtime = {};
    this.context.imported = {};
    this.clearCache();
    this.logger.info("All non-global variables cleared");
  }

  /**
   * Gets count of variables in each scope for debugging
   */
  getVariableCounts(): {
    global: number;
    suite: number;
    imported: number;
    runtime: number;
  } {
    return {
      global: Object.keys(this.context.global).length,
      suite: Object.keys(this.context.suite).length,
      imported: Object.keys(this.context.imported).length,
      runtime: Object.keys(this.context.runtime).length,
    };
  }
}
