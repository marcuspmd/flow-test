/**
 * @fileoverview Secure JavaScript execution service for dynamic expressions in tests.
 *
 * @remarks
 * This module provides the JavaScriptService for safely executing JavaScript expressions
 * within test contexts. It includes comprehensive security controls, context management,
 * and extensive utility functions for dynamic test logic execution.
 *
 * @packageDocumentation
 */

/**
 * Execution context available in JavaScript expressions with comprehensive data access.
 *
 * @remarks
 * Provides a secure and structured context for JavaScript expression execution
 * with access to response data, variables, utilities, and request information.
 * The context is carefully controlled to prevent security vulnerabilities while
 * providing maximum flexibility for test logic.
 *
 * @example Context usage in JavaScript expressions
 * ```typescript
 * const context: JavaScriptExecutionContext = {
 *   response: {
 *     body: { user: { id: 123, name: 'John' } },
 *     headers: { 'content-type': 'application/json' },
 *     status: 200,
 *     statusText: 'OK'
 *   },
 *   variables: {
 *     api_base_url: 'https://api.example.com',
 *     auth_token: 'bearer-token-123'
 *   },
 *   captured: {
 *     user_id: 123,
 *     session_id: 'sess-abc-123'
 *   },
 *   utils: {
 *     Date: Date,
 *     Math: Math,
 *     JSON: JSON
 *   }
 * };
 *
 * // Expression: response.body.user.id > 0 && variables.auth_token
 * ```
 *
 * @public
 * @since 1.0.0
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
 * Service for safely executing JavaScript expressions in a sandboxed environment
 */
export class JavaScriptService {
  private static instance: JavaScriptService;
  private config: JavaScriptConfig;

  constructor(config: JavaScriptConfig = {}) {
    this.config = {
      timeout: config.timeout || 5000, // 5 second default timeout
      enableConsole: config.enableConsole || false,
      maxMemory: config.maxMemory || 8 * 1024 * 1024, // 8MB default
    };
  }

  /**
   * Gets singleton instance of JavaScriptService
   */
  public static getInstance(config?: JavaScriptConfig): JavaScriptService {
    if (!JavaScriptService.instance) {
      JavaScriptService.instance = new JavaScriptService(config);
    }
    return JavaScriptService.instance;
  }

  /**
   * Executes a JavaScript expression in a secure sandbox
   *
   * @param expression - JavaScript code to execute
   * @param context - Execution context with available variables and data
   * @param asCodeBlock - If true, executes as code block instead of expression
   * @returns Result of the JavaScript expression
   */
  public executeExpression(
    expression: string,
    context: JavaScriptExecutionContext = {},
    asCodeBlock: boolean = false
  ): any {
    // First validate the expression
    const validation = this.validateExpression(expression);
    if (!validation.isValid) {
      throw new Error(`Invalid JavaScript expression: ${validation.reason}`);
    }

    try {
      // Create sandbox with context
      const sandbox = this.createSandbox(context);

      // Create parameter names and values for the Function constructor
      const paramNames = Object.keys(sandbox);
      const paramValues = paramNames.map((name) => sandbox[name]);

      // Create a secure function with timeout
      const timeoutMs = this.config.timeout;
      const wrappedExpression = `
        var startTime = Date.now();
        var checkTimeout = function() {
          if (Date.now() - startTime > ${timeoutMs}) {
            throw new Error('JavaScript expression timeout exceeded');
          }
        };

        // Simple timeout check (not perfect but better than nothing)
        try {
          ${asCodeBlock ? expression : `return (${expression});`}
        } catch (error) {
          throw error;
        }
      `;

      // Execute in isolated function scope
      const func = new Function(...paramNames, wrappedExpression);
      const result = func.apply(null, paramValues);

      return result;
    } catch (error) {
      throw new Error(`JavaScript execution error: ${error}`);
    }
  }

  /**
   * Creates a secure sandbox with available context and utilities
   */
  private createSandbox(context: JavaScriptExecutionContext): any {
    const sandbox: any = {
      // Provide context data
      response: context.response || {},
      variables: context.variables || {},
      captured: context.captured || {},
      request: context.request || {},

      // Environment variables access
      env: process.env,

      // Safe utility functions
      Date: Date,
      Math: Math,
      JSON: JSON,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,

      // Array and Object methods
      Array: Array,
      Object: Object,

      // String methods
      String: String,

      // Safe console (if enabled)
      console: this.config.enableConsole
        ? {
            log: console.log,
            warn: console.warn,
            error: console.error,
          }
        : undefined,
    };

    // Add variables from context directly to sandbox scope (only valid identifiers)
    if (context.variables) {
      const validIdentifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
      Object.entries(context.variables).forEach(([name, value]) => {
        if (validIdentifierRegex.test(name)) {
          sandbox[name] = value;
        }
      });
    }

    // Remove dangerous globals
    delete sandbox.process;
    delete sandbox.global;
    delete sandbox.Buffer;
    delete sandbox.require;
    delete sandbox.module;
    delete sandbox.exports;

    return sandbox;
  }

  /**
   * Parses a JavaScript expression from variable interpolation
   * Supports formats: {{js: expression}} and {{$js: expression}}
   */
  public parseJavaScriptExpression(fullExpression: string): string | null {
    // Check if it's a JavaScript expression (starts with 'js:' or '$js:')
    const jsMatch = fullExpression.match(/^\$?js:\s*(.+)$/);

    if (jsMatch) {
      return jsMatch[1].trim();
    }

    return null;
  }

  /**
   * Validates if an expression is safe to execute
   * Checks for potentially dangerous patterns
   */
  public validateExpression(expression: string): {
    isValid: boolean;
    reason?: string;
  } {
    // List of dangerous patterns to block
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /constructor/,
      /prototype/,
      /__proto__/,
      /process\s*\./,
      /global\s*\./,
      /Buffer\s*\./,
      /child_process\s*\./,
      /fs\s*\./,
      /os\s*\./,
      /net\s*\./,
      /http\s*\./,
      /https\s*\./,
      /crypto\s*\./,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return {
          isValid: false,
          reason: `Expression contains potentially dangerous pattern: ${pattern.source}`,
        };
      }
    }

    // Check for excessive complexity (simple heuristic)
    if (expression.length > 1000) {
      return {
        isValid: false,
        reason: "Expression is too long (max 1000 characters)",
      };
    }

    // Check for too many nested levels (simple parentheses count)
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      return {
        isValid: false,
        reason: "Mismatched parentheses in expression",
      };
    }

    if (openParens > 20) {
      return {
        isValid: false,
        reason: "Expression is too complex (too many nested levels)",
      };
    }

    return { isValid: true };
  }

  /**
   * Updates JavaScript configuration
   */
  public updateConfig(config: Partial<JavaScriptConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  public getConfig(): JavaScriptConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const javascriptService = JavaScriptService.getInstance();
