import { GlobalVariableContext } from "../types/config.types";
import { GlobalRegistryService } from "./global-registry.service";
import { fakerService } from "./faker.service";
import {
  javascriptService,
  JavaScriptExecutionContext,
} from "./javascript.service";
import { getLogger } from "./logger.service";

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
export class VariableService {
  /** Hierarchical context of variables with different scopes */
  private context: GlobalVariableContext;

  /** Global registry service for exported variables */
  private globalRegistry?: GlobalRegistryService;

  /** Current execution context for JavaScript expressions */
  private currentExecutionContext: JavaScriptExecutionContext = {};

  /** Logger service */
  private logger = getLogger();

  /**
   * VariableService constructor
   *
   * @param context - Hierarchical context of variables organized by scope
   * @param globalRegistry - Optional global registry for exported variables
   */
  constructor(
    context: GlobalVariableContext,
    globalRegistry?: GlobalRegistryService
  ) {
    this.context = context;
    this.globalRegistry = globalRegistry;
  }

  /**
   * Interpolates variables in a string or complex structure
   *
   * Replaces {{variable_name}} placeholders with corresponding values
   * following the scope hierarchy: runtime > suite > imported > global.
   * Supports interpolation in strings, arrays and objects recursively.
   *
   * @param template - String, array or object containing variable placeholders
   * @param suppressWarnings - If true, suppresses warnings for missing variables (useful for cleanup testing)
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
    if (typeof template === "string") {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
        const value = this.resolveVariable(variablePath.trim());
        if (value === undefined) {
          if (!suppressWarnings) {
            // Verifica se é uma variável que foi intencionalmente limpa (comum após limpeza de runtime)
            const isRuntimeVariable = this.isLikelyRuntimeVariable(
              variablePath.trim()
            );
            if (isRuntimeVariable) {
              // Log em nível debug em vez de warning para variáveis de runtime limpas
              this.logger.debug(
                `Runtime variable '${variablePath.trim()}' not found (expected after cleanup)`
              );
            } else {
              this.logger.warn(
                `Variable '${variablePath.trim()}' not found during interpolation`
              );
            }
          }
          return match; // Keep the original placeholder
        }
        return String(value);
      });
    }

    if (Array.isArray(template)) {
      return template.map((item) => this.interpolate(item, suppressWarnings));
    }

    if (template && typeof template === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolate(value, suppressWarnings);
      }
      return result;
    }

    return template;
  }

  /**
   * Resolves a variable following the scope hierarchy
   *
   * Searches for a variable in precedence order: Faker > runtime > suite > imported > global > globalRegistry.
   * Supports dot notation for exported variables (ex: auth.token) and Faker expressions (ex: faker.person.firstName).
   *
   * @param variablePath - Variable path (can use dot notation or Faker syntax)
   * @returns Variable value or undefined if not found
   * @private
   *
   * @example
   * ```typescript
   * resolveVariable('username') // Searches in all scopes
   * resolveVariable('auth.token') // Searches specifically for exported variable from nodeId 'auth'
   * resolveVariable('faker.person.firstName') // Generates fake first name
   * resolveVariable('faker.helpers.arrayElement') // Generates random array element
   * ```
   */
  private resolveVariable(variablePath: string): any {
    // Check if it's a JavaScript expression (starts with 'js:', '$js.', or contains logical operators)
    const hasLogicalOperators = /\|\||&&|[><=!]==?|\?|:/.test(variablePath);
    if (variablePath.startsWith("js:") || variablePath.startsWith("$js.") || hasLogicalOperators) {
      try {
        let jsExpression: string | null = null;
        
        if (variablePath.startsWith("js:")) {
          jsExpression = javascriptService.parseJavaScriptExpression(variablePath);
        } else if (variablePath.startsWith("$js.")) {
          // Handle $js.return and $js.expression formats
          jsExpression = variablePath.substring(4); // Remove "$js."
        } else if (hasLogicalOperators) {
          // Handle logical expressions like "jwt_login_success || false"
          jsExpression = variablePath;
        }
        
        if (jsExpression) {
          // Update execution context with current variables
          const context: JavaScriptExecutionContext = {
            ...this.currentExecutionContext,
            variables: this.getAllAvailableVariables(),
          };
          // Use code block mode only for $js expressions, not for logical operators
          const useCodeBlock = variablePath.startsWith("$js.");
          const result = javascriptService.executeExpression(jsExpression, context, useCodeBlock);
          return result;
        }
        return undefined;
      } catch (error) {
        this.logger.warn(
          `Error resolving JavaScript expression '${variablePath}': ${error}`
        );
        return undefined;
      }
    }

    // Check if it's a Faker expression (starts with 'faker.' or '$faker.')
    if (variablePath.startsWith("faker.") || variablePath.startsWith("$faker.")) {
      try {
        let fakerExpression = variablePath;
        if (variablePath.startsWith("$faker.")) {
          // Handle $faker.person.name format
          fakerExpression = variablePath.substring(1); // Remove "$" to get "faker.person.name"
        }
        const result = fakerService.parseFakerExpression(fakerExpression);
        return result;
      } catch (error) {
        this.logger.warn(
          `Error resolving Faker expression '${variablePath}': ${error}`
        );
        return undefined;
      }
    }

    // First, checks in runtime if the exact variable exists (including dots)
    if (this.context.runtime[variablePath] !== undefined) {
      return this.context.runtime[variablePath];
    }

    // Checks if it's a global exported variable (ex: auth.token)
    if (variablePath.includes(".") && this.globalRegistry) {
      const globalValue = this.globalRegistry.getExportedVariable(variablePath);
      if (globalValue !== undefined) {
        return globalValue;
      }
    }

    // Checks if it's an imported flow variable (legacy support)
    if (variablePath.includes(".")) {
      const [flowName, ...pathParts] = variablePath.split(".");
      const flowVariables = this.context.imported[flowName];
      if (flowVariables) {
        return this.getNestedValue(flowVariables, pathParts.join("."));
      }
    }

    // Resolution hierarchy: runtime > suite > imported > global
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
  }

  /**
   * Sets multiple variables in the runtime context.
   */
  setVariables(variables: Record<string, any>): void {
    Object.assign(this.context.runtime, variables);
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
  }

  /**
   * Clears all runtime variables (used when switching between nodes)
   * Preserves global, suite, and imported variables
   */
  clearRuntimeVariables(): void {
    this.context.runtime = {};
    this.logger.info("Runtime variables cleared for node transition");
  }

  /**
   * Clears suite-specific variables (used when switching between test suites)
   * Preserves global and imported variables, clears runtime variables
   */
  clearSuiteVariables(): void {
    this.context.suite = {};
    this.context.runtime = {};
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
    this.logger.info("All non-global variables cleared");
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
