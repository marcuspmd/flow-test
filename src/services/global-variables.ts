import { ConfigManager } from "../core/config";
import { GlobalVariableContext } from "../types/engine.types";
import { GlobalRegistryService } from "./global-registry.service";
import { fakerService } from "./faker.service";
import { javascriptService, JavaScriptExecutionContext } from "./javascript.service";

/**
 * Service for managing global variables with hierarchy and cache
 */
export class GlobalVariablesService {
  private context: GlobalVariableContext;
  private configManager: ConfigManager;
  private globalRegistry: GlobalRegistryService | null = null;
  private interpolationCache: Map<string, string> = new Map();
  private cacheEnabled: boolean = true;
  private dependencies: string[] = []; // node_ids dos flows dependentes
  private currentExecutionContext: JavaScriptExecutionContext = {};

  constructor(
    configManager: ConfigManager,
    globalRegistry?: GlobalRegistryService
  ) {
    this.configManager = configManager;
    this.globalRegistry = globalRegistry || null;
    this.context = this.initializeContext();
  }

  /**
   * Sets the Global Registry for resolution of exported variables
   */
  setGlobalRegistry(globalRegistry: GlobalRegistryService): void {
    this.globalRegistry = globalRegistry;
    this.clearCache(); // Clears cache as new variables may be available
  }

  /**
   * Sets the dependencies for this flow (node_ids of dependent flows)
   */
  setDependencies(dependencies: string[]): void {
    this.dependencies = dependencies;
    this.clearCache(); // Clears cache as dependency resolution may change
  }

  /**
   * Updates the current execution context for JavaScript expressions
   */
  setExecutionContext(context: Partial<JavaScriptExecutionContext>): void {
    this.currentExecutionContext = { 
      ...this.currentExecutionContext, 
      ...context,
      // Always provide current variables
      variables: this.getAllVariables()
    };
    this.clearCache(); // Clear cache when context changes
  }

  /**
   * Initializes the variable context
   */
  private initializeContext(): GlobalVariableContext {
    return {
      environment: this.loadEnvironmentVariables(),
      global: this.configManager.getGlobalVariables(),
      suite: {},
      runtime: {},
    };
  }

  /**
   * Loads relevant environment variables
   */
  private loadEnvironmentVariables(): Record<string, any> {
    const envVars: Record<string, any> = {};

    // All environment variables from the process
    Object.keys(process.env).forEach((key) => {
      envVars[key] = process.env[key];
    });

    return envVars;
  }

  /**
   * Sets variables in runtime scope
   */
  setRuntimeVariables(variables: Record<string, any>): void {
    this.context.runtime = { ...this.context.runtime, ...variables };
    this.clearCache(); // Clears cache when variables change
  }

  /**
   * Sets variables in suite scope
   */
  setSuiteVariables(variables: Record<string, any>): void {
    this.context.suite = { ...this.context.suite, ...variables };
    this.clearCache();
  }

  /**
   * Sets a specific variable in runtime
   */
  setVariable(
    name: string,
    value: any,
    scope: keyof GlobalVariableContext = "runtime"
  ): void {
    this.context[scope][name] = value;

    // Removes cache entries that may be affected
    this.invalidateCacheForVariable(name);
  }

  /**
   * Gets a specific variable following the hierarchy
   */
  getVariable(name: string): any {
    // Hierarchy: runtime > suite > global > environment
    if (this.context.runtime.hasOwnProperty(name)) {
      return this.context.runtime[name];
    }

    if (this.context.suite.hasOwnProperty(name)) {
      return this.context.suite[name];
    }

    if (this.context.global.hasOwnProperty(name)) {
      return this.context.global[name];
    }

    if (this.context.environment.hasOwnProperty(name)) {
      return this.context.environment[name];
    }

    return undefined;
  }

  /**
   * Gets all variables merged by hierarchy
   */
  getAllVariables(): Record<string, any> {
    const baseVariables = {
      ...this.context.environment,
      ...this.context.global,
      ...this.context.suite,
      ...this.context.runtime,
    };

    // Adds exported variables if registry is available
    if (this.globalRegistry) {
      const exportedVariables = this.globalRegistry.getAllExportedVariables();
      return {
        ...baseVariables,
        ...exportedVariables,
      };
    }

    return baseVariables;
  }

  /**
   * Interpolates a string replacing {{variable}} with values
   */
  interpolateString(template: string): string {
    if (!template || typeof template !== "string") {
      return template;
    }

    // Checks cache first
    if (this.cacheEnabled && this.interpolationCache.has(template)) {
      return this.interpolationCache.get(template)!;
    }

    let result = template;
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      const fullMatch = match[0]; // {{variable_name}}
      const variableName = match[1].trim(); // variable_name

      const value = this.resolveVariableExpression(variableName);

      if (value !== undefined) {
        result = result.replace(fullMatch, this.convertValueToString(value));
      } else {
        console.warn(
          `⚠️  Warning: Variable '${variableName}' not found during interpolation`
        );
        // Keeps original expression if variable not found
      }
    }

    // Stores in cache
    if (this.cacheEnabled) {
      this.interpolationCache.set(template, result);
    }

    return result;
  }

  /**
   * Interpolates any object (strings, objects, arrays)
   */
  interpolate<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.interpolateString(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolate(item)) as unknown as T;
    }

    if (typeof obj === "object") {
      const result: any = {};
      Object.keys(obj).forEach((key) => {
        result[key] = this.interpolate((obj as any)[key]);
      });
      return result as T;
    }

    return obj; // Numbers, booleans, etc.
  }

  /**
   * Resolves variable expressions with support for paths and exported variables
   */
  private resolveVariableExpression(expression: string): any {
    // Check if it's a JavaScript expression (starts with 'js:')
    if (expression.startsWith('js:')) {
      try {
        const jsExpression = javascriptService.parseJavaScriptExpression(expression);
        if (jsExpression) {
          // Update execution context with current variables
          const context: JavaScriptExecutionContext = {
            ...this.currentExecutionContext,
            variables: this.getAllVariables()
          };
          return javascriptService.executeExpression(jsExpression, context);
        }
        return undefined;
      } catch (error) {
        console.warn(`Error resolving JavaScript expression '${expression}': ${error}`);
        return undefined;
      }
    }

    // Check if it's a Faker expression (starts with 'faker.')
    if (expression.startsWith('faker.')) {
      try {
        return fakerService.parseFakerExpression(expression);
      } catch (error) {
        console.warn(`Error resolving Faker expression '${expression}': ${error}`);
        return undefined;
      }
    }

    // First, tries to resolve as exported variable (suite.variable)
    if (expression.includes(".") && this.globalRegistry) {
      const exportedValue = this.globalRegistry.getExportedVariable(expression);
      if (exportedValue !== undefined) {
        return exportedValue;
      }
    }

    // Support for paths like: user.name, config.timeout
    const parts = expression.split(".");
    const baseName = parts[0];

    let value = this.getVariable(baseName);

    // If not found in regular scopes, try to resolve from dependent flows' exports
    if (
      value === undefined &&
      this.globalRegistry &&
      this.dependencies.length > 0
    ) {
      for (const dependencyNodeId of this.dependencies) {
        const exportedValue = this.globalRegistry.getExportedVariable(
          `${dependencyNodeId}.${baseName}`
        );
        if (exportedValue !== undefined) {
          value = exportedValue;
          break;
        }
      }
    }

    // Navigates through path if it exists
    for (let i = 1; i < parts.length && value !== undefined; i++) {
      if (typeof value === "object" && value !== null) {
        value = value[parts[i]];
      } else {
        value = undefined;
        break;
      }
    }

    return value;
  }

  /**
   * Converts any value to string for interpolation
   */
  private convertValueToString(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Gets complete variable context
   */
  getContext(): GlobalVariableContext {
    return { ...this.context };
  }

  /**
   * Gets variables from a specific scope
   */
  getVariablesByScope(scope: keyof GlobalVariableContext): Record<string, any> {
    return { ...this.context[scope] };
  }

  /**
   * Checks if a variable exists
   */
  hasVariable(name: string): boolean {
    return this.getVariable(name) !== undefined;
  }

  /**
   * Lists names of all available variables
   */
  getAvailableVariableNames(): string[] {
    const allVars = this.getAllVariables();
    return Object.keys(allVars).sort();
  }

  /**
   * Gets statistics of the variable system
   */
  getStats() {
    return {
      environment_vars: Object.keys(this.context.environment).length,
      global_vars: Object.keys(this.context.global).length,
      suite_vars: Object.keys(this.context.suite).length,
      runtime_vars: Object.keys(this.context.runtime).length,
      cache_size: this.interpolationCache.size,
      cache_enabled: this.cacheEnabled,
    };
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
      if (pattern.test(template)) {
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
   * Exports current variable state for debug
   */
  exportState(): string {
    return JSON.stringify(
      {
        context: this.context,
        cache_stats: {
          size: this.interpolationCache.size,
          enabled: this.cacheEnabled,
        },
        available_variables: this.getAvailableVariableNames(),
      },
      null,
      2
    );
  }

  /**
   * Restores context from an exported state
   */
  importState(state: string): void {
    try {
      const parsed = JSON.parse(state);
      if (parsed.context) {
        this.context = parsed.context;
        this.clearCache(); // Limpa cache após importar
      }
    } catch (error) {
      throw new Error(`Failed to import variable state: ${error}`);
    }
  }

  /**
   * Creates a snapshot of the current variable state
   */
  createSnapshot(): () => void {
    const snapshot = JSON.parse(JSON.stringify(this.context));

    return () => {
      this.context = snapshot;
      this.clearCache();
    };
  }

  /**
   * Merges variables from another context
   */
  mergeContext(otherContext: Partial<GlobalVariableContext>): void {
    if (otherContext.environment) {
      this.context.environment = {
        ...this.context.environment,
        ...otherContext.environment,
      };
    }
    if (otherContext.global) {
      this.context.global = { ...this.context.global, ...otherContext.global };
    }
    if (otherContext.suite) {
      this.context.suite = { ...this.context.suite, ...otherContext.suite };
    }
    if (otherContext.runtime) {
      this.context.runtime = {
        ...this.context.runtime,
        ...otherContext.runtime,
      };
    }

    this.clearCache();
  }
}
