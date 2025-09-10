import * as jmespath from "jmespath";
import { ExecutionResult } from "../types/common.types";

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
  /**
   * Captures variables from HTTP response using JMESPath expressions
   *
   * Processes a map of captures where the key is the variable name
   * to be created and the value is the JMESPath expression to extract the data.
   *
   * @param captureConfig - Map of variable_name -> jmespath_expression
   * @param result - HTTP execution result containing the response
   * @returns Object with captured variables
   *
   * @example
   * ```typescript
   * const captured = captureService.captureVariables({
   *   user_id: 'body.user.id',
   *   auth_token: 'body.token',
   *   response_time: 'duration_ms'
   * }, executionResult);
   * ```
   */
  captureVariables(
    captureConfig: Record<string, string>,
    result: ExecutionResult
  ): Record<string, any> {
    const capturedVariables: Record<string, any> = {};

    if (!result.response_details) {
      console.log(
        "    [⚠] Could not capture variables: response not available"
      );
      return capturedVariables;
    }

    for (const [variableName, jmesPath] of Object.entries(captureConfig)) {
      try {
        const value = this.extractValue(jmesPath, result);

        if (value !== undefined) {
          capturedVariables[variableName] = value;
          console.log(
            `    [📥] Captured: ${variableName} = ${this.formatValue(value)}`
          );
        } else {
          console.log(
            `    [⚠] Could not capture: ${variableName} (path: ${jmesPath})`
          );
        }
      } catch (error) {
        console.log(`    [✗] Error capturing ${variableName}: ${error}`);
      }
    }

    return capturedVariables;
  }

  /**
   * Extracts a value from the response using JMESPath expression
   *
   * Applies a JMESPath expression to the response context to
   * extract a specific value.
   *
   * @param jmesPath - JMESPath expression for extraction
   * @param result - HTTP execution result
   * @returns Extracted value or undefined if not found
   * @throws Error if JMESPath expression is invalid
   * @private
   */
  private extractValue(jmesPath: string, result: ExecutionResult): any {
    // Prepares the complete context for JMESPath
    const context = this.buildContext(result);

    try {
      return jmespath.search(context, jmesPath);
    } catch (error) {
      throw new Error(`Invalid JMESPath '${jmesPath}': ${error}`);
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
  private buildContext(result: ExecutionResult): any {
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
  suggestCapturePaths(result: ExecutionResult): string[] {
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
