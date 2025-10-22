/**
 * @fileoverview Variable capture service for extracting data from HTTP responses.
 *
 * @remarks
 * This module provides the CaptureService class which handles extraction of data
 * from HTTP responses using JMESPath expressions. It enables dynamic variable
 * capture for use in subsequent test steps with comprehensive error handling.
 *
 * @packageDocumentation
 */

import * as jmespath from "jmespath";
import { StepExecutionResult } from "../types/config.types";
import { getLogger } from "./logger.service";
import { InterpolationService } from "./interpolation.service";
import { ResponseContextBuilder, ErrorHandler } from "../utils";

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
  private interpolationService: InterpolationService;

  constructor() {
    this.interpolationService = new InterpolationService();
  }

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
      const value = ErrorHandler.handle(
        () => this.extractValue(jmesPath, result, variableContext),
        {
          logger: this.logger,
          message: `Error capturing ${variableName}`,
          context: { variableName, jmesPath },
          defaultValue: undefined,
        }
      );

      if (value !== undefined) {
        capturedVariables[variableName] = value;
        this.logger.info(
          `    [📥] Captured: ${variableName} = ${this.formatValue(value)}`,
          { metadata: { type: "variable_capture", internal: true } }
        );
      } else {
        this.logger.warn(
          `Could not capture: ${variableName} (path: ${jmesPath})`
        );
      }
    }

    return capturedVariables;
  }

  captureFromObject(
    captureConfig: Record<string, string>,
    source: any,
    variableContext?: Record<string, any>
  ): Record<string, any> {
    const capturedVariables: Record<string, any> = {};

    const context = this.buildGenericContext(source, variableContext);

    for (const [variableName, expression] of Object.entries(captureConfig)) {
      const value = ErrorHandler.handle(
        () =>
          this.extractValue(expression, undefined, variableContext, context),
        {
          logger: this.logger,
          message: `Error capturing ${variableName}`,
          context: { variableName, expression },
          defaultValue: undefined,
        }
      );

      if (value !== undefined) {
        capturedVariables[variableName] = value;
        this.logger.info(
          `    [📥] Captured: ${variableName} = ${this.formatValue(value)}`,
          { metadata: { type: "variable_capture", internal: true } }
        );
      } else {
        this.logger.warn(
          `Could not capture: ${variableName} (path: ${expression})`
        );
      }
    }

    return capturedVariables;
  }

  /**
   * Extracts a value from the response using JMESPath or evaluates expressions
   *
   * @remarks
   * This method now delegates variable interpolation to InterpolationService,
   * ensuring consistent handling of {{variable}}, {{$env.VAR}}, {{$faker.xxx}},
   * and {{$js:expr}} across the entire system.
   *
   * @param expression - JMESPath expression, interpolated expression, or direct value
   * @param result - Execution result
   * @param variableContext - Current variable context for interpolation
   * @param customContext - Custom context for JMESPath evaluation
   * @returns Extracted value
   * @throws Error if expression is invalid
   * @private
   */
  private extractValue(
    expression: string,
    result?: StepExecutionResult,
    variableContext?: Record<string, any>,
    customContext?: any
  ): any {
    // Handle non-string expressions
    if (typeof expression !== "string") {
      return expression; // Return as-is if not a string
    }

    // 1. Check for literal string values (quoted strings)
    if (expression.startsWith('"') && expression.endsWith('"')) {
      // Return the string without quotes as a literal value
      return expression.slice(1, -1);
    }

    // 2. Interpolate variables using InterpolationService if expression contains {{...}}
    if (expression.includes("{{")) {
      const interpolationContext = {
        runtime: variableContext || {},
        suite: {},
        imported: {},
        global: {},
        variableResolver: (varName: string) => variableContext?.[varName],
      };

      try {
        expression = this.interpolationService.interpolate(
          expression,
          interpolationContext
        );
      } catch (error) {
        this.logger.warn(
          `Failed to interpolate expression '${expression}': ${error}`
        );
        // Continue with original expression - may still be valid JMESPath
      }
    }

    // 3. Evaluate as JMESPath expression
    const evaluationContext =
      customContext ?? (result ? this.buildContext(result) : undefined);

    if (!evaluationContext) {
      throw new Error("Capture context is not available for evaluation");
    }

    try {
      return jmespath.search(evaluationContext, expression);
    } catch (error) {
      // If JMESPath fails, try to return as literal value
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
    return ResponseContextBuilder.build(result);
  }

  private buildGenericContext(
    source: any,
    variables?: Record<string, any>
  ): any {
    const baseContext =
      source && typeof source === "object" ? { ...source } : { value: source };

    return {
      ...baseContext,
      value: baseContext.value !== undefined ? baseContext.value : source,
      input: baseContext.input ?? baseContext,
      variables: variables || baseContext.variables || {},
      context: baseContext,
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
