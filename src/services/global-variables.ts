import { ConfigManager } from "../core/config";
import { GlobalVariableContext } from "../types/engine.types";
import { GlobalRegistryService } from "./global-registry.service";
import { fakerService } from "./faker.service";
import {
  javascriptService,
  JavaScriptExecutionContext,
} from "./javascript.service";

/**
 * Service for managing global variables with hierarchical scoping and intelligent caching
 *
 * The GlobalVariablesService provides a sophisticated variable management system that supports
 * multi-level variable scoping, template interpolation, dependency resolution, and performance
 * optimization through caching. It integrates with Faker.js for test data generation and
 * JavaScript expressions for dynamic value computation.
 *
 * **Variable Hierarchy (highest to lowest priority):**
 * 1. **Runtime Variables**: Set during test execution (highest priority)
 * 2. **Imported Variables**: Variables imported from dependent flows
 * 3. **Suite Variables**: Variables defined at the test suite level
 * 4. **Global Variables**: Variables from configuration files
 * 5. **Environment Variables**: System environment variables (lowest priority)
 *
 * **Supported Variable Sources:**
 * - Configuration file global variables
 * - System environment variables (all process.env)
 * - Test suite-specific variables
 * - Runtime-computed variables
 * - Variables imported from dependent test flows
 * - Faker.js generated test data ({{faker.name.firstName}})
 * - JavaScript expressions ({{js:new Date().toISOString()}})
 *
 * @example Basic variable management
 * ```typescript
 * import { GlobalVariablesService, ConfigManager } from 'flow-test-engine';
 *
 * const configManager = new ConfigManager();
 * const variableService = new GlobalVariablesService(configManager);
 *
 * // Set suite-level variables
 * variableService.setSuiteVariables({
 *   api_base: 'https://api.example.com',
 *   version: 'v1'
 * });
 *
 * // Set runtime variables (highest priority)
 * variableService.setVariable('user_id', '12345');
 * variableService.setVariable('session_token', 'abc123xyz');
 *
 * // Interpolate template strings
 * const url = variableService.interpolate('{{api_base}}/{{version}}/users/{{user_id}}');
 * // Result: 'https://api.example.com/v1/users/12345'
 * ```
 *
 * @example Advanced template interpolation with Faker and JavaScript
 * ```typescript
 * const variableService = new GlobalVariablesService(configManager);
 *
 * // Templates with Faker.js integration
 * const email = variableService.interpolate('{{faker.internet.email}}');
 * const userName = variableService.interpolate('{{faker.person.firstName}}');
 *
 * // JavaScript expression evaluation
 * const timestamp = variableService.interpolate('{{js:Date.now()}}');
 * const uuid = variableService.interpolate('{{js:require("crypto").randomUUID()}}');
 *
 * // Complex template combining multiple sources
 * const complexTemplate = variableService.interpolate(`
 *   {
 *     "user": {
 *       "name": "{{faker.person.fullName}}",
 *       "email": "{{faker.internet.email}}",
 *       "created_at": "{{js:new Date().toISOString()}}",
 *       "api_key": "{{api_key_prefix}}-{{js:Math.random().toString(36).substr(2, 9)}}"
 *     }
 *   }
 * `);
 * ```
 *
 * @example Dependency management and variable importing
 * ```typescript
 * const variableService = new GlobalVariablesService(configManager, globalRegistry);
 *
 * // Set flow dependencies
 * variableService.setDependencies(['auth-flow', 'setup-flow']);
 *
 * // Variables from dependent flows are automatically available
 * const template = variableService.interpolate('Authorization: Bearer {{auth_token}}');
 * // auth_token was exported by the 'auth-flow' dependency
 *
 * // Check variable availability
 * const allVars = variableService.getAllVariables();
 * console.log('Available variables:', Object.keys(allVars));
 * ```
 *
 * @example Performance optimization with caching
 * ```typescript
 * const variableService = new GlobalVariablesService(configManager);
 *
 * // Enable/disable caching (enabled by default)
 * variableService.enableCache();
 *
 * // First interpolation - computed and cached
 * const result1 = variableService.interpolate('{{complex_template_with_js}}');
 *
 * // Second interpolation - served from cache (much faster)
 * const result2 = variableService.interpolate('{{complex_template_with_js}}');
 *
 * // Clear cache when variables change
 * variableService.setVariable('base_url', 'https://new-api.com');
 * // Cache is automatically cleared
 *
 * // Force cache clear
 * variableService.clearCache();
 * ```
 *
 * @public
 * @since 1.0.0
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
      variables: this.getAllVariables(),
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
      imported: {},
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
   * Sets a single variable in runtime scope
   */
  setRuntimeVariable(name: string, value: any): void {
    this.context.runtime[name] = value;
    this.clearCache();
  }

  /**
   * Sets variables in suite scope
   */
  setSuiteVariables(variables: Record<string, any>): void {
    // Interpolate variables when setting them to resolve expressions like {{$js.return ...}}
    const interpolatedVariables: Record<string, any> = {};
    for (const [key, value] of Object.entries(variables)) {
      interpolatedVariables[key] = this.interpolate(value);
    }
    this.context.suite = { ...this.context.suite, ...interpolatedVariables };
    this.clearCache();
  }

  /**
   * Clears runtime variables (used when switching between nodes)
   * Preserves environment, global, and suite variables
   */
  clearRuntimeVariables(): void {
    this.context.runtime = {};
    this.clearCache();
  }

  /**
   * Clears suite-specific variables (used when switching between test suites)
   * Preserves environment and global variables, clears runtime variables
   */
  clearSuiteVariables(): void {
    this.context.suite = {};
    this.context.runtime = {};
    this.clearCache();
  }

  /**
   * Clears all non-global variables (used when starting a new test suite)
   * Preserves only environment and global variables
   */
  clearAllNonGlobalVariables(): void {
    this.context.suite = {};
    this.context.runtime = {};
    this.context.imported = {};
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
      return template ? String(template) : "";
    }

    // Checks cache first
    if (this.cacheEnabled && this.interpolationCache.has(template)) {
      return this.interpolationCache.get(template)!;
    }

    let result = template;

    // Use a more sophisticated approach to find variable expressions
    const matches = this.findAllVariableExpressions(template);

    // Process matches in reverse order to avoid position shifts
    for (let i = matches.length - 1; i >= 0; i--) {
      const { fullMatch, variableName, start, end } = matches[i];

      const value = this.resolveVariableExpression(variableName);

      if (value !== undefined) {
        const before = result.substring(0, start);
        const after = result.substring(end);
        result = before + this.convertValueToString(value) + after;
      } else {
        // Verifica se é uma variável runtime que foi intencionalmente limpa
        const isLikelyRuntimeVariable =
          this.isLikelyRuntimeVariable(variableName);
        if (!isLikelyRuntimeVariable) {
          console.warn(
            `⚠️  Warning: Variable '${variableName}' not found during interpolation`
          );
        }
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
   * Extracts a single variable from a template string if it's just one variable
   * Handles nested braces properly (e.g., {{$js.return Object.keys({a:1, b:2}).length}})
   */
  private extractSingleVariable(template: string): string | null {
    if (!template.startsWith("{{") || !template.endsWith("}}")) {
      return null;
    }

    // Remove outer braces
    const content = template.slice(2, -2);

    // Use a more sophisticated approach to handle nested braces
    // Count opening and closing braces to ensure we're dealing with a single expression
    let braceCount = 0;
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      // Handle quote strings
      if ((char === '"' || char === "'") && content[i - 1] !== "\\") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = "";
        }
        continue;
      }

      // Skip characters inside quotes
      if (inQuotes) {
        continue;
      }

      // Count braces
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
      }

      // Check for nested variable expressions ({{ or }})
      if (
        (char === "{" && nextChar === "{") ||
        (char === "}" && nextChar === "}")
      ) {
        return null; // Contains nested variable expression
      }
    }

    // If we have unmatched braces at the end, it's still a single expression
    // (e.g., Object.keys({a:1, b:2}) has unmatched braces but is valid)
    return content;
  }

  /**
   * Interpolates any object (strings, objects, arrays)
   */
  interpolate<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      // Check if the string is a single variable expression
      const singleVariable = this.extractSingleVariable(obj);
      if (singleVariable) {
        const value = this.resolveVariableExpression(singleVariable);
        if (value !== undefined) {
          // Return the value directly without string conversion
          // This preserves types (numbers, objects, arrays, etc.)
          return value as unknown as T;
        }
      }
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
   * Finds all variable expressions in a template string, handling nested braces
   */
  private findAllVariableExpressions(template: string): Array<{
    fullMatch: string;
    variableName: string;
    start: number;
    end: number;
  }> {
    const results: Array<{
      fullMatch: string;
      variableName: string;
      start: number;
      end: number;
    }> = [];

    let i = 0;
    while (i < template.length - 1) {
      // Look for opening {{
      if (template[i] === "{" && template[i + 1] === "{") {
        const start = i;
        i += 2; // Skip {{

        let braceCount = 1;
        let inQuotes = false;
        let quoteChar = "";
        let end = -1;

        // Find the matching }}
        while (i < template.length - 1) {
          const char = template[i];
          const nextChar = template[i + 1];

          // Handle quotes
          if ((char === '"' || char === "'") && template[i - 1] !== "\\") {
            if (!inQuotes) {
              inQuotes = true;
              quoteChar = char;
            } else if (char === quoteChar) {
              inQuotes = false;
              quoteChar = "";
            }
          }

          // Skip characters inside quotes
          if (inQuotes) {
            i++;
            continue;
          }

          // Look for }} to close the expression
          if (char === "}" && nextChar === "}") {
            braceCount--;
            if (braceCount === 0) {
              end = i + 2;
              break;
            }
          }
          // Look for {{ to open nested (which we don't support in interpolation)
          else if (char === "{" && nextChar === "{") {
            braceCount++;
            i++; // Skip the next {
          }

          i++;
        }

        if (end > 0) {
          const fullMatch = template.substring(start, end);
          const variableName = template.substring(start + 2, end - 2).trim();
          results.push({ fullMatch, variableName, start, end });
          i = end;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    return results;
  }

  /**
   * Resolves variable expressions with support for paths and exported variables
   */
  private resolveVariableExpression(expression: string): any {
    // Check if it's a Faker expression (starts with 'faker.' or '$faker.') - PRIORITY OVER JS
    if (expression.startsWith("faker.") || expression.startsWith("$faker.")) {
      try {
        let fakerExpression = expression;
        if (expression.startsWith("$faker.")) {
          // Handle $faker.person.name format
          fakerExpression = expression.substring(1); // Remove "$" to get "faker.person.name"
        }
        const result = fakerService.parseFakerExpression(fakerExpression);
        return result;
      } catch (error) {
        console.warn(
          `Error resolving Faker expression '${expression}': ${error}`
        );
        return undefined;
      }
    }

    // Check if it's a JavaScript expression, but NOT if it's a Faker expression
    if (!expression.startsWith("faker.") && !expression.startsWith("$faker.")) {
      const hasLogicalOperators = /\|\||&&|[><=!]==?|\?|:/.test(expression);

      if (
        expression.startsWith("js:") ||
        expression.startsWith("$js.") ||
        hasLogicalOperators
      ) {
        try {
          let jsExpression: string | null = null;

          if (expression.startsWith("js:")) {
            jsExpression =
              javascriptService.parseJavaScriptExpression(expression);
          } else if (expression.startsWith("$js.")) {
            // Handle $js.return and $js.expression formats
            jsExpression = expression.substring(4); // Remove "$js."
          } else if (hasLogicalOperators) {
            // Handle logical expressions like "jwt_login_success || false"
            jsExpression = expression;
          }

          if (jsExpression) {
            // Update execution context with current variables
            const allVars = this.getAllVariables();
            const context: JavaScriptExecutionContext = {
              ...this.currentExecutionContext,
              variables: allVars,
            };
            // Use code block mode only for $js expressions, not for logical operators
            const useCodeBlock = expression.startsWith("$js.");
            const result = javascriptService.executeExpression(
              jsExpression,
              context,
              useCodeBlock
            );
            return result;
          }
          return undefined;
        } catch (error) {
          console.warn(
            `Error resolving JavaScript expression '${expression}': ${error}`
          );
          return undefined;
        }
      }
    }

    // Check if it's an environment variable (starts with '$env.')
    if (expression.startsWith("$env.")) {
      const envVarName = expression.substring(5); // Remove "$env." to get variable name
      const envValue = process.env[envVarName];
      return envValue || null;
    }

    // Support for paths like: user.name, config.timeout
    const parts = expression.split(".");
    const baseName = parts[0];

    let value = this.getVariable(baseName);

    // If not found in local scopes, try to resolve as exported variable (suite.variable)
    if (
      value === undefined &&
      expression.includes(".") &&
      this.globalRegistry
    ) {
      const exportedValue = this.globalRegistry.getExportedVariable(expression);
      if (exportedValue !== undefined) {
        return exportedValue;
      }
    }

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
}
