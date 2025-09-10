import { VariableContext } from "../types/common.types";

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
  private context: VariableContext;

  /**
   * VariableService constructor
   *
   * @param context - Hierarchical context of variables organized by scope
   */
  constructor(context: VariableContext) {
    this.context = context;
  }

  /**
   * Interpolates variables in a string or complex structure
   *
   * Replaces {{variable_name}} placeholders with corresponding values
   * following the scope hierarchy: runtime > suite > imported > global.
   * Supports interpolation in strings, arrays and objects recursively.
   *
   * @param template - String, array or object containing variable placeholders
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
  interpolate(template: string | any): any {
    if (typeof template === "string") {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
        const value = this.resolveVariable(variablePath.trim());
        return value !== undefined ? String(value) : match;
      });
    }

    if (Array.isArray(template)) {
      return template.map((item) => this.interpolate(item));
    }

    if (template && typeof template === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolate(value);
      }
      return result;
    }

    return template;
  }

  /**
   * Resolves a variable following the scope hierarchy
   *
   * Searches for a variable in precedence order: runtime > suite > imported > global.
   * Supports dot notation for imported variables (ex: auth.token).
   *
   * @param variablePath - Variable path (can use dot notation)
   * @returns Variable value or undefined if not found
   * @private
   *
   * @example
   * ```typescript
   * resolveVariable('username') // Searches in all scopes
   * resolveVariable('auth.token') // Searches specifically in imported.auth.token
   * ```
   */
  private resolveVariable(variablePath: string): any {
    // First, checks in runtime if the exact variable exists (including dots)
    if (this.context.runtime[variablePath] !== undefined) {
      return this.context.runtime[variablePath];
    }

    // Checks if it's an imported flow variable (ex: auth.token)
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
        // Adds with flow prefix and without prefix (for compatibility)
        allImported[`${flowName}.${key}`] = value;
        if (!(key in allImported)) {
          allImported[key] = value;
        }
      }
    }
    return allImported;
  }
}
