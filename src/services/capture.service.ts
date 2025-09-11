import * as jmespath from "jmespath";
import { StepExecutionResult } from "../types/config.types";
import { getLogger } from "./logger.service";

/**
 * Service responsible for capturing variables from HTTP responses
 *
 * Uses JMESPath expressions to extract specific values from HTTP responses
 * and store them as variables for use in subsequent steps.
 *
 * @example
 * ```typescript
 * const captureService = new CaptureService();
 *
 * const captured = captureService.captureVariables({
 *   user_id: 'body.data.user.id',
 *   token: 'body.access_token',
 *   status: 'status_code'
 * }, executionResult);
 *
 * console.log(captured.user_id); // Value extracted from body.data.user.id
 * ```
 */
export class CaptureService {
  private logger = getLogger();

  /**
   * Captures variables from HTTP response using JMESPath expressions
   *
   * Processes a map of captures where the key is the variable name
   * to be created and the value is the JMESPath expression to extract the data.
   *
   * @param captureConfig - Map of variable_name -> jmespath_expression
   * @param result - HTTP execution result containing the response
   * @param variableContext - Current variable context for JavaScript expressions
   * @returns Object with captured variables
   *
   * @example
   * ```typescript
   * const captured = captureService.captureVariables({
   *   user_id: 'body.user.id',
   *   auth_token: 'body.token',
   *   response_time: 'duration_ms'
   * }, executionResult, currentVariables);
   * ```
   */
  captureVariables(
    captureConfig: Record<string, string>,
    result: StepExecutionResult,
    variableContext?: Record<string, any>
  ): Record<string, any> {
    const capturedVariables: Record<string, any> = {};

    if (!result.response_details) {
      this.logger.warn("Could not capture variables: response not available");
      return capturedVariables;
    }

    for (const [variableName, jmesPath] of Object.entries(captureConfig)) {
      try {
        const value = this.extractValue(jmesPath, result, variableContext);

        if (value !== undefined) {
          capturedVariables[variableName] = value;
          console.log(
            `    [📥] Captured: ${variableName} = ${this.formatValue(value)}`
          );
        } else {
          this.logger.warn(
            `Could not capture: ${variableName} (path: ${jmesPath})`
          );
        }
      } catch (error) {
        this.logger.error(`Error capturing ${variableName}`, {
          error: error as Error,
        });
      }
    }

    return capturedVariables;
  }

  /**
   * Extracts a value from the response using JMESPath or evaluates expressions
   *
   * @param expression - JMESPath expression, JavaScript expression, or direct value
   * @param result - Execution result
   * @param variableContext - Current variable context for JavaScript expressions
   * @returns Extracted value
   * @throws Error if expression is invalid
   * @private
   */
  private extractValue(
    expression: string,
    result: StepExecutionResult,
    variableContext?: Record<string, any>
  ): any {
    // Handle different types of expressions

    // Check if expression is a string
    if (typeof expression !== "string") {
      return expression; // Return as-is if not a string
    }

    // 1. Check for literal string values (quoted strings)
    if (expression.startsWith('"') && expression.endsWith('"')) {
      // Return the string without quotes as a literal value
      return expression.slice(1, -1);
    }

    // 2. Check if it's wrapped in {{...}} (interpolation syntax)
    if (expression.startsWith("{{") && expression.endsWith("}}")) {
      const innerExpression = expression.slice(2, -2).trim();

      // Check if it's a JavaScript expression
      if (innerExpression.startsWith("js:")) {
        const jsExpression = innerExpression.slice(3).trim();
        try {
          // Create a safe evaluation context with response data and variables
          const context = this.buildContext(result);
          const variables = variableContext || {};

          // Use Function constructor for safer evaluation
          const evalFunction = new Function(
            "status_code",
            "headers",
            "body",
            "duration_ms",
            "variables",
            `return ${jsExpression};`
          );
          return evalFunction(
            context.status_code,
            context.headers,
            context.body,
            context.duration_ms,
            variables
          );
        } catch (error) {
          throw new Error(
            `Invalid JavaScript expression '${jsExpression}': ${error}`
          );
        }
      } else {
        // It's a variable reference, should not be processed here
        // Return the expression as-is for later interpolation
        return expression;
      }
    }

    // 3. Try as direct JMESPath expression
    const context = this.buildContext(result);
    try {
      return jmespath.search(context, expression);
    } catch (error) {
      // If JMESPath fails, try to return as literal value or expression
      // This handles cases where the expression might be a plain string or number
      if (expression === "true") return true;
      if (expression === "false") return false;
      if (expression === "null") return null;
      if (!isNaN(Number(expression))) return Number(expression);

      // Check if it looks like a URL or other string that shouldn't be treated as JMESPath
      if (expression.includes("://") || expression.includes("/")) {
        return expression; // Return as literal string
      }

      throw new Error(`Invalid JMESPath '${expression}': ${error}`);
    }
  }
  /**
   * Builds the complete context for data extraction via JMESPath
   *
   * Creates an object containing all available data from the HTTP response
   * that can be accessed via JMESPath expressions.
   *
   * @param result - HTTP execution result
   * @returns Structured context for JMESPath
   * @private
   *
   * @example
   * ```typescript
   * // Returned context:
   * {
   *   status_code: 200,
   *   headers: { 'content-type': 'application/json' },
   *   body: { user: { id: 123 } },
   *   duration_ms: 250,
   *   size_bytes: 1024
   * }
   * ```
   */
  private buildContext(result: StepExecutionResult): any {
    const response = result.response_details!;

    return {
      status_code: response.status_code,
      headers: response.headers,
      body: response.body,
      duration_ms: result.duration_ms,
      size_bytes: response.size_bytes,
    };
  }

  /**
   * Formats a value for readable console display
   *
   * Truncates long strings and objects to avoid visual clutter
   * in variable capture logs.
   *
   * @param value - Value to be formatted
   * @returns Formatted string for display
   * @private
   */
  private formatValue(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
      return value.length > 100
        ? `"${value.substring(0, 100)}..."`
        : `"${value}"`;
    }
    if (typeof value === "object") {
      const str = JSON.stringify(value);
      return str.length > 100 ? `${str.substring(0, 100)}...` : str;
    }
    return String(value);
  }

  /**
   * Validates if a set of JMESPath are valid.
   */
  validateCapturePaths(capturePaths: Record<string, string>): string[] {
    const errors: string[] = [];

    for (const [variableName, path] of Object.entries(capturePaths)) {
      try {
        // Tries to evaluate the JMESPath with a test object
        jmespath.search({}, path);
      } catch (error) {
        errors.push(`Variable '${variableName}': ${error}`);
      }
    }

    return errors;
  }

  /**
   * Lists all available paths in an object for debugging.
   */
  listAvailablePaths(obj: any, prefix = "", maxDepth = 3): string[] {
    if (maxDepth <= 0 || obj === null || typeof obj !== "object") {
      return [];
    }

    const paths: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      paths.push(currentPath);

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        paths.push(
          ...this.listAvailablePaths(value, currentPath, maxDepth - 1)
        );
      }
    }

    return paths;
  }

  /**
   * Suggests possible JMESPath based on response content.
   */
  suggestCapturePaths(result: StepExecutionResult): string[] {
    if (!result.response_details) {
      return [];
    }

    const context = this.buildContext(result);
    const suggestions: string[] = [];

    // Basic paths always available
    suggestions.push("status_code", "duration_ms", "size_bytes");

    // Common headers
    if (context.headers) {
      const commonHeaders = [
        "content-type",
        "authorization",
        "location",
        "set-cookie",
      ];
      for (const header of commonHeaders) {
        if (context.headers[header] || context.headers[header.toLowerCase()]) {
          suggestions.push(`headers."${header}"`);
        }
      }
    }

    // Body paths (limited to 2 levels)
    if (context.body && typeof context.body === "object") {
      const bodyPaths = this.listAvailablePaths(context.body, "body", 2);
      suggestions.push(...bodyPaths);
    }

    return suggestions;
  }
}
