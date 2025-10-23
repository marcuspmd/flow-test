/**
 * Execution context available in JavaScript expressions with comprehensive data access.
 */
export interface JavaScriptExecutionContext {
  // Response data
  response?: {
    body?: any;
    headers?: Record<string, string>;
    status?: number;
    statusText?: string;
  };

  // Current variables from all scopes
  variables?: Record<string, any>;

  // Captured variables from current step
  captured?: Record<string, any>;

  // Request data for the current step
  request?: {
    body?: any;
    headers?: Record<string, string>;
    method?: string;
    url?: string;
  };

  // Utility functions
  utils?: {
    Date: DateConstructor;
    Math: Math;
    JSON: JSON;
  };
}

/**
 * Configuration for JavaScript service
 */
export interface JavaScriptConfig {
  timeout?: number; // Execution timeout in ms
  enableConsole?: boolean; // Allow console.log
  maxMemory?: number; // Memory limit in bytes
}

/**
 * Interface for the JavaScriptService which safely executes JavaScript expressions.
 *
 * @remarks
 * The JavaScriptService is responsible for:
 * - Executing JavaScript expressions in a sandboxed environment
 * - Providing secure access to test context
 * - Validating expressions for security
 * - Managing execution timeouts and memory limits
 */
export interface IJavaScriptService {
  /**
   * Executes a JavaScript expression in a secure sandbox.
   *
   * @param expression - JavaScript code to execute
   * @param context - Execution context with available variables and data
   * @param asCodeBlock - If true, executes as code block instead of expression
   * @returns Result of the JavaScript expression
   * @throws Error if expression is invalid or execution fails
   *
   * @example
   * ```typescript
   * // Execute simple expression
   * const result = javascriptService.executeExpression(
   *   "response.body.user.id > 0",
   *   { response: { body: { user: { id: 123 } } } }
   * );
   *
   * // Execute code block
   * const computed = javascriptService.executeExpression(
   *   "const total = items.reduce((sum, item) => sum + item.price, 0); return total;",
   *   { variables: { items: [...] } },
   *   true
   * );
   * ```
   */
  executeExpression(
    expression: string,
    context?: JavaScriptExecutionContext,
    asCodeBlock?: boolean
  ): any;

  /**
   * Validates a JavaScript expression for security and syntax.
   *
   * @param expression - JavaScript expression to validate
   * @returns Validation result with isValid flag and reason if invalid
   *
   * @example
   * ```typescript
   * const validation = javascriptService.validateExpression("Math.random()");
   * if (!validation.isValid) {
   *   console.error(validation.reason);
   * }
   * ```
   */
  validateExpression(expression: string): {
    isValid: boolean;
    reason?: string;
  };
}
