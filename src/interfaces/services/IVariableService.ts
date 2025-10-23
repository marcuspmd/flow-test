/**
 * @fileoverview Variable service interface for dependency injection.
 *
 * @remarks
 * Defines the contract for variable interpolation and scope management services.
 *
 * @packageDocumentation
 */

import { GlobalVariableContext } from "../../types/config.types";

/**
 * Variable service interface
 *
 * @remarks
 * Manages hierarchical variable scopes (runtime > suite > imported > global)
 * and provides interpolation using {{variable}} syntax.
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.IVariableService) private variableService: IVariableService) {}
 *
 *   processTemplate(template: string): string {
 *     // Interpolate variables in template
 *     return this.variableService.interpolate(template);
 *   }
 *
 *   addRuntimeVariable(name: string, value: any): void {
 *     this.variableService.setRuntimeVariable(name, value);
 *   }
 * }
 * ```
 */
export interface IVariableService {
  /**
   * Interpolates variables in a string or complex structure
   * @param template - String, array or object containing variable placeholders
   * @param suppressWarnings - If true, suppresses warnings for missing variables
   * @returns Value with all variables interpolated
   */
  interpolate(template: string | any, suppressWarnings?: boolean): any;

  /**
   * Sets multiple variables in runtime scope
   * @param variables - Object with variable names and values
   */
  setVariables(variables: Record<string, any>): void;

  /**
   * Sets a single variable in runtime scope
   * @param name - Variable name
   * @param value - Variable value
   */
  setRuntimeVariable(name: string, value: any): void;

  /**
   * Sets multiple variables in runtime scope (alias for setVariables)
   * @param variables - Object with variable names and values
   */
  setRuntimeVariables(variables: Record<string, any>): void;

  /**
   * Sets variables in suite scope with interpolation
   * @param variables - Object with variable names and values
   */
  setSuiteVariables(variables: Record<string, any>): void;

  /**
   * Gets a specific variable following the hierarchy
   * @param name - Variable name
   * @returns Variable value or undefined if not found
   */
  getVariable(name: string): any;

  /**
   * Gets all variables from all scopes merged
   * @returns Object with all variables
   */
  getAllVariables(): Record<string, any>;

  /**
   * Gets all available variables including global exports
   * @returns Object with all variables including global exports
   */
  getAllAvailableVariables(): Record<string, any>;

  /**
   * Checks if a variable is available in any scope
   * @param variablePath - Variable path (supports dot notation)
   * @returns true if variable exists
   */
  hasVariable(variablePath: string): boolean;

  /**
   * Adds variables from an imported flow
   * @param flowName - Name/ID of the imported flow
   * @param variables - Variables to import
   */
  addImportedFlow(flowName: string, variables: Record<string, any>): void;

  /**
   * Exports variables to global registry
   * @param nodeId - Node identifier
   * @param suiteName - Suite name
   * @param exports - Array of variable names to export
   * @param capturedVariables - Variables captured during execution
   */
  exportVariables(
    nodeId: string,
    suiteName: string,
    exports: string[],
    capturedVariables: Record<string, any>
  ): void;

  /**
   * Gets all global exported variables from registry
   * @returns Object with all global exported variables
   */
  getGlobalExportedVariables(): Record<string, any>;

  /**
   * Updates the execution context for JavaScript expressions
   * @param context - Partial execution context to merge
   */
  setExecutionContext(context: Partial<any>): void;

  /**
   * Sets the dependencies for this flow
   * @param dependencies - Array of node_ids of dependent flows
   */
  setDependencies(dependencies: string[]): void;

  /**
   * Clears the interpolation cache
   */
  clearCache(): void;

  /**
   * Enables/disables interpolation cache
   * @param enabled - true to enable cache, false to disable
   */
  setCacheEnabled(enabled: boolean): void;

  /**
   * Clears all runtime variables
   */
  clearRuntimeVariables(): void;

  /**
   * Clears suite and runtime variables
   */
  clearSuiteVariables(): void;

  /**
   * Clears all non-global variables
   */
  clearAllNonGlobalVariables(): void;

  /**
   * Interpolates a string template
   * @param template - String template with {{variable}} placeholders
   * @returns Interpolated string
   */
  interpolateString(template: string): string;

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
  };

  /**
   * Gets variables from a specific scope
   * @param scope - Scope name (environment, global, suite, runtime, imported)
   */
  getVariablesByScope(scope: keyof GlobalVariableContext): Record<string, any>;

  /**
   * Lists names of all available variables
   * @returns Sorted array of variable names
   */
  getAvailableVariableNames(): string[];

  /**
   * Gets count of variables in each scope
   */
  getVariableCounts(): {
    global: number;
    suite: number;
    imported: number;
    runtime: number;
  };

  /**
   * Creates a snapshot of current variable state
   * @returns Function that when called, restores the state
   */
  createSnapshot(): () => void;
}
