/**
 * @fileoverview Comprehensive assertion validation service for HTTP response testing.
 *
 * @remarks
 * This module provides the AssertionService class which handles all response validation logic
 * for the Flow Test Engine. It supports multiple assertion types, operators, and syntaxes
 * with JMESPath integration for complex data extraction and validation.
 *
 * @packageDocumentation
 */

import * as jmespath from "jmespath";
import { Assertions, AssertionChecks } from "../types/engine.types";
import { AssertionResult, StepExecutionResult } from "../types/config.types";
import { getLogger } from "./logger.service";

/**
 * Comprehensive assertion validation service for HTTP response testing.
 *
 * @remarks
 * The AssertionService provides robust validation capabilities for HTTP responses including
 * status codes, headers, response bodies, timing validations, and custom assertions.
 * It supports multiple assertion syntaxes, JMESPath expressions for complex data extraction,
 * and comprehensive error reporting with detailed failure messages.
 *
 * **Supported Assertion Types:**
 * - **Status Code Validation**: Direct value comparison or complex validation rules
 * - **Header Validation**: Key-value validation with multiple comparison operators
 * - **Response Body Validation**: Deep object validation using JMESPath expressions
 * - **Response Time Validation**: Performance constraint validation
 * - **Custom Assertions**: Extensible validation system for specialized requirements
 *
 * **Available Assertion Operators:**
 * - `equals`: Exact value equality comparison
 * - `not_equals`: Value inequality verification
 * - `contains`: String/array containment validation
 * - `greater_than`: Numeric greater than comparison (>)
 * - `less_than`: Numeric less than comparison (<)
 * - `regex`: Regular expression pattern matching
 * - `not_null`: Null/undefined existence validation
 * - `type`: Data type validation (string, number, boolean, object, array)
 * - `length`: Array/string length validation with nested operators
 *
 * **Supported Assertion Syntaxes:**
 * - **Flat Syntax**: `'body.user.id': { not_null: true, type: 'number' }`
 * - **Structured Syntax**: `body: { user: { id: { not_null: true, type: 'number' } } }`
 * - **Direct Value**: `status_code: 200`
 * - **JMESPath Expressions**: `'body.items[0].name': { equals: 'Product 1' }`
 *
 * @example Basic response validation
 * ```typescript
 * import { AssertionService } from 'flow-test-engine';
 *
 * const assertionService = new AssertionService();
 * const responseData = {
 *   status: 200,
 *   headers: { 'content-type': 'application/json' },
 *   body: { user: { id: 123, name: 'John Doe' } }
 * };
 *
 * const results = assertionService.validateAssertions({
 *   status_code: 200,
 *   'headers.content-type': { contains: 'application/json' },
 *   'body.user.id': { type: 'number', greater_than: 0 },
 *   'body.user.name': { not_null: true, type: 'string' }
 * }, responseData);
 *
 * console.log(`Assertions passed: ${results.filter(r => r.passed).length}`);
 * ```
 *
 * @example Complex validation with JMESPath
 * ```typescript
 * const results = assertionService.validateAssertions({
 *   'body.items[0].price': { greater_than: 0, less_than: 1000 },
 *   'body.items[?category==`electronics`].length(@)': { greater_than: 0 },
 *   'body.pagination.total': { type: 'number' }
 * }, responseData);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class AssertionService {
  private logger = getLogger();

  /**
   * Validates all assertions of an HTTP response
   *
   * Main method that processes all configured assertions
   * and returns an array with the results of each validation.
   *
   * @param assertions - Object with assertions to be validated
   * @param result - HTTP execution result containing response
   * @returns Array of validation results
   *
   * @example
   * ```typescript
   * const results = assertionService.validateAssertions({
   *   status_code: 200,
   *   'body.data.id': { not_null: true },
   *   'headers.content-type': { contains: 'application/json' }
   * }, executionResult);
   * ```
   */
  validateAssertions(
    assertions: Assertions,
    result: StepExecutionResult
  ): AssertionResult[] {
    const assertionResults: AssertionResult[] = [];

    if (!result.response_details) {
      return [
        this.createAssertionResult(
          "response",
          "exists",
          null,
          false,
          "Response not available"
        ),
      ];
    }

    // Processa assertions flat (como body.status) e estruturadas
    const processedAssertions = this.preprocessAssertions(assertions);

    // Valida status code
    if (processedAssertions.status_code !== undefined) {
      if (typeof processedAssertions.status_code === "number") {
        assertionResults.push(
          this.validateStatusCode(processedAssertions.status_code, result)
        );
      } else {
        // Handle AssertionChecks for status_code
        assertionResults.push(
          ...this.validateFieldChecks(
            "status_code",
            processedAssertions.status_code,
            result.response_details!.status_code
          )
        );
      }
    }

    // Valida headers
    if (processedAssertions.headers) {
      assertionResults.push(
        ...this.validateHeaders(processedAssertions.headers, result)
      );
    }

    // Valida body
    if (processedAssertions.body) {
      assertionResults.push(
        ...this.validateBody(processedAssertions.body, result)
      );
    }

    // Valida tempo de resposta
    if (processedAssertions.response_time_ms) {
      assertionResults.push(
        ...this.validateResponseTime(
          processedAssertions.response_time_ms,
          result
        )
      );
    }

    // Valida custom assertions
    if (processedAssertions.custom) {
      assertionResults.push(
        ...this.validateCustomAssertions(processedAssertions.custom, result)
      );
    }

    return assertionResults;
  }

  /**
   * Pre-processes assertions to support flat and structured syntax
   *
   * Converts flat assertions (like 'body.status') into hierarchical structure
   * for uniform processing. Also processes 'headers.header-name'.
   *
   * @param assertions - Object with assertions in mixed format
   * @returns Normalized object with hierarchical structure
   * @private
   *
   * @example
   * ```typescript
   * // Input: { 'body.status': 'success', 'headers.auth': 'Bearer xyz' }
   * // Output: {
   * //   body: { status: 'success' },
   * //   headers: { auth: 'Bearer xyz' }
   * // }
   * ```
   */
  private preprocessAssertions(assertions: any): Assertions {
    const processed: any = { ...assertions };

    // Process flat properties that start with "body."
    const bodyFlat: Record<string, any> = {};
    const headersFlat: Record<string, any> = {};

    for (const [key, value] of Object.entries(assertions)) {
      if (key.startsWith("body.")) {
        // Extract the field path (ex: "body.status" -> "status")
        const fieldPath = key.substring(5); // Remove "body."
        bodyFlat[fieldPath] = { equals: value }; // Convert to AssertionChecks
        delete processed[key]; // Remove the flat property
      } else if (key.startsWith("headers.")) {
        // Extract the header name (ex: "headers.content-type" -> "content-type")
        const headerName = key.substring(8); // Remove "headers."
        headersFlat[headerName] = { equals: value }; // Convert to AssertionChecks
        delete processed[key]; // Remove the flat property
      }
    }

    // Combine flat body with existing structured body
    if (Object.keys(bodyFlat).length > 0) {
      processed.body = {
        ...processed.body,
        ...bodyFlat,
      };
    }

    // Combine flat headers with existing structured headers
    if (Object.keys(headersFlat).length > 0) {
      processed.headers = {
        ...processed.headers,
        ...headersFlat,
      };
    }

    return processed as Assertions;
  }

  /**
   * Validates the response status code.
   */
  private validateStatusCode(
    expected: number,
    result: StepExecutionResult
  ): AssertionResult {
    const actual = result.response_details!.status_code;
    const passed = actual === expected;

    return this.createAssertionResult(
      "status_code",
      expected,
      actual,
      passed,
      passed ? undefined : `Expected: ${expected}, Received: ${actual}`
    );
  }

  /**
   * Validates the response headers.
   */
  private validateHeaders(
    expectedHeaders: Record<string, AssertionChecks>,
    result: StepExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualHeaders = result.response_details!.headers;

    for (const [headerName, checks] of Object.entries(expectedHeaders)) {
      const actualValue =
        actualHeaders[headerName] || actualHeaders[headerName.toLowerCase()];
      results.push(
        ...this.validateFieldChecks(
          `headers.${headerName}`,
          checks,
          actualValue
        )
      );
    }

    return results;
  }

  /**
   * Validates the response body using JMESPath.
   */
  private validateBody(
    expectedBody: Record<string, AssertionChecks>,
    result: StepExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualBody = result.response_details!.body;

    // Flatten nested body assertions into JMESPath expressions
    const flattenedAssertions = this.flattenBodyAssertions(expectedBody);

    for (const [fieldPath, checks] of Object.entries(flattenedAssertions)) {
      let actualValue: any;

      try {
        actualValue = jmespath.search(actualBody, fieldPath);
      } catch (error) {
        results.push(
          this.createAssertionResult(
            `body.${fieldPath}`,
            checks,
            undefined,
            false,
            `Error evaluating JMESPath: ${error}`
          )
        );
        continue;
      }

      results.push(
        ...this.validateFieldChecks(`body.${fieldPath}`, checks, actualValue)
      );
    }

    return results;
  }

  /**
   * Flattens nested body assertions into JMESPath expressions
   *
   * @param bodyAssertions - Nested body assertions from YAML
   * @param prefix - Current path prefix for recursion
   * @returns Flattened assertions with JMESPath expressions as keys
   *
   * @example
   * Input: { json: { token: { type: "string", pattern: "^[A-Za-z0-9-_.]+$" } } }
   * Output: { "json.token": { type: "string", pattern: "^[A-Za-z0-9-_.]+$" } }
   */
  private flattenBodyAssertions(
    bodyAssertions: any,
    prefix: string = ""
  ): Record<string, AssertionChecks> {
    const flattened: Record<string, AssertionChecks> = {};

    for (const [key, value] of Object.entries(bodyAssertions)) {
      const escapedKey = this.escapeJMESPathKey(key);
      const currentPath = prefix ? `${prefix}.${escapedKey}` : escapedKey;

      // Check if this is an AssertionChecks object (has assertion operators)
      if (this.isAssertionChecks(value)) {
        flattened[currentPath] = value as AssertionChecks;
      } else if (typeof value === "object" && value !== null) {
        // Recursively flatten nested objects
        const nestedFlattened = this.flattenBodyAssertions(value, currentPath);
        Object.assign(flattened, nestedFlattened);
      } else {
        // Direct value assertion - convert to equals check
        flattened[currentPath] = { equals: value };
      }
    }

    return flattened;
  }

  /**
   * Escapes JMESPath keys that contain special characters
   */
  private escapeJMESPathKey(key: string): string {
    // If key already contains explicit JMESPath notation (arrays, filters, etc.), return as-is
    if (/[?\[\]\*@]/.test(key)) {
      return key;
    }

    // If key contains special characters (hyphens, spaces, etc.) but not dots (which are valid JMESPath), quote it
    if (/[^a-zA-Z0-9_.]/.test(key)) {
      const escaped = key.replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    return key;
  }

  /**
   * Checks if an object is an AssertionChecks object (has assertion operators)
   */
  private isAssertionChecks(obj: any): boolean {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }

    const assertionKeys = [
      "equals",
      "not_equals",
      "contains",
      "greater_than",
      "less_than",
      "regex",
      "exists",
      "type",
      "length",
      "pattern",
      "minLength",
      "notEmpty",
    ];

    return assertionKeys.some((key) => obj.hasOwnProperty(key));
  }

  /**
   * Validates the response time.
   */
  private validateResponseTime(
    timeChecks: { less_than?: number; greater_than?: number },
    result: StepExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualTime = result.duration_ms;

    if (timeChecks.less_than !== undefined) {
      const passed = actualTime < timeChecks.less_than;
      results.push(
        this.createAssertionResult(
          "response_time_ms.less_than",
          timeChecks.less_than,
          actualTime,
          passed,
          passed
            ? undefined
            : `Response time ${actualTime}ms exceeds limit of ${timeChecks.less_than}ms`
        )
      );
    }

    if (timeChecks.greater_than !== undefined) {
      const passed = actualTime > timeChecks.greater_than;
      results.push(
        this.createAssertionResult(
          "response_time_ms.greater_than",
          timeChecks.greater_than,
          actualTime,
          passed,
          passed
            ? undefined
            : `Response time ${actualTime}ms is less than minimum of ${timeChecks.greater_than}ms`
        )
      );
    }

    return results;
  }

  /**
   * Validates custom JavaScript-based assertions.
   */
  private validateCustomAssertions(
    customAssertions: Array<{
      name: string;
      condition: string;
      message?: string;
    }>,
    result: StepExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];

    for (const customAssertion of customAssertions) {
      try {
        // Create a safe context for evaluation
        const context = {
          status_code: result.response_details?.status_code,
          headers: result.response_details?.headers || {},
          body: result.response_details?.body || {},
          response_time: result.duration_ms,
        };

        // Handle js: prefix if present
        let condition = customAssertion.condition;
        if (condition.startsWith("js:")) {
          condition = condition.slice(3).trim();
        }

        // Evaluate the condition using Function constructor for safety
        const evaluationFunction = new Function(
          "status_code",
          "headers",
          "body",
          "response_time",
          `return ${condition}`
        );

        const conditionResult = evaluationFunction(
          context.status_code,
          context.headers,
          context.body,
          context.response_time
        );

        const passed = Boolean(conditionResult);

        results.push(
          this.createAssertionResult(
            `custom.${customAssertion.name}`,
            true,
            passed,
            passed,
            customAssertion.message ||
              (passed ? "OK" : `Condition failed: ${customAssertion.condition}`)
          )
        );
      } catch (error) {
        results.push(
          this.createAssertionResult(
            `custom.${customAssertion.name}`,
            true,
            false,
            false,
            `Error evaluating condition: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
    }

    return results;
  }

  /**
   * Validates a set of checks for a specific field.
   */
  private validateFieldChecks(
    fieldName: string,
    checks: AssertionChecks,
    actualValue: any
  ): AssertionResult[] {
    const results: AssertionResult[] = [];

    if (checks.equals !== undefined) {
      const passed = this.deepEqual(actualValue, checks.equals);
      results.push(
        this.createAssertionResult(
          `${fieldName}.equals`,
          checks.equals,
          actualValue,
          passed
        )
      );
    }

    if (checks.not_equals !== undefined) {
      const passed = !this.deepEqual(actualValue, checks.not_equals);
      results.push(
        this.createAssertionResult(
          `${fieldName}.not_equals`,
          `not ${checks.not_equals}`,
          actualValue,
          passed
        )
      );
    }

    if (checks.contains !== undefined) {
      const passed = this.contains(actualValue, checks.contains);
      results.push(
        this.createAssertionResult(
          `${fieldName}.contains`,
          checks.contains,
          actualValue,
          passed,
          passed ? undefined : `Value does not contain: ${checks.contains}`
        )
      );
    }

    if (checks.greater_than !== undefined) {
      const passed =
        typeof actualValue === "number" && actualValue > checks.greater_than;
      results.push(
        this.createAssertionResult(
          `${fieldName}.greater_than`,
          `> ${checks.greater_than}`,
          actualValue,
          passed
        )
      );
    }

    if (checks.less_than !== undefined) {
      const passed =
        typeof actualValue === "number" && actualValue < checks.less_than;
      results.push(
        this.createAssertionResult(
          `${fieldName}.less_than`,
          `< ${checks.less_than}`,
          actualValue,
          passed
        )
      );
    }

    if (checks.regex !== undefined) {
      const passed = this.matchesRegex(actualValue, checks.regex);
      results.push(
        this.createAssertionResult(
          `${fieldName}.regex`,
          checks.regex,
          actualValue,
          passed,
          passed ? undefined : `Value does not match pattern: ${checks.regex}`
        )
      );
    }

    if (checks.type !== undefined) {
      const actualType = this.getValueType(actualValue);
      const passed = actualType === checks.type;
      results.push(
        this.createAssertionResult(
          `${fieldName}.type`,
          checks.type,
          actualType,
          passed
        )
      );
    }

    if (checks.exists !== undefined) {
      const exists = actualValue !== undefined && actualValue !== null;
      const passed = exists === checks.exists;
      results.push(
        this.createAssertionResult(
          `${fieldName}.exists`,
          checks.exists,
          exists,
          passed
        )
      );
    }

    if (checks.length !== undefined) {
      const length = this.getValueLength(actualValue);
      if (length === -1) {
        results.push(
          this.createAssertionResult(
            `${fieldName}.length`,
            "valid array or string",
            actualValue,
            false,
            "Value must be an array or string to check length"
          )
        );
      } else {
        if (checks.length.equals !== undefined) {
          const passed = length === checks.length.equals;
          results.push(
            this.createAssertionResult(
              `${fieldName}.length.equals`,
              checks.length.equals,
              length,
              passed
            )
          );
        }

        if (checks.length.greater_than !== undefined) {
          const passed = length > checks.length.greater_than;
          results.push(
            this.createAssertionResult(
              `${fieldName}.length.greater_than`,
              `> ${checks.length.greater_than}`,
              length,
              passed
            )
          );
        }

        if (checks.length.less_than !== undefined) {
          const passed = length < checks.length.less_than;
          results.push(
            this.createAssertionResult(
              `${fieldName}.length.less_than`,
              `< ${checks.length.less_than}`,
              length,
              passed
            )
          );
        }
      }
    }

    // Additional validation checks to support YAML test syntax
    if ((checks as any).pattern !== undefined) {
      const passed = this.matchesRegex(actualValue, (checks as any).pattern);
      results.push(
        this.createAssertionResult(
          `${fieldName}.pattern`,
          (checks as any).pattern,
          actualValue,
          passed,
          passed
            ? undefined
            : `Value does not match pattern: ${(checks as any).pattern}`
        )
      );
    }

    if ((checks as any).minLength !== undefined) {
      const length = this.getValueLength(actualValue);
      if (length === -1) {
        results.push(
          this.createAssertionResult(
            `${fieldName}.minLength`,
            "valid array or string",
            actualValue,
            false,
            "Value must be an array or string to check minLength"
          )
        );
      } else {
        const passed = length >= (checks as any).minLength;
        results.push(
          this.createAssertionResult(
            `${fieldName}.minLength`,
            `>= ${(checks as any).minLength}`,
            length,
            passed,
            passed
              ? undefined
              : `Length ${length} is less than minimum ${
                  (checks as any).minLength
                }`
          )
        );
      }
    }

    if ((checks as any).notEmpty !== undefined) {
      const isEmpty =
        actualValue === null ||
        actualValue === undefined ||
        actualValue === "" ||
        (Array.isArray(actualValue) && actualValue.length === 0) ||
        (typeof actualValue === "object" &&
          Object.keys(actualValue).length === 0);

      const passed = (checks as any).notEmpty ? !isEmpty : isEmpty;
      results.push(
        this.createAssertionResult(
          `${fieldName}.notEmpty`,
          (checks as any).notEmpty,
          !isEmpty,
          passed,
          passed
            ? undefined
            : `Value ${(checks as any).notEmpty ? "is empty" : "is not empty"}`
        )
      );
    }

    return results;
  }

  /**
   * Checks if two values are deeply equal with type-tolerant comparison.
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Type-tolerant comparison for numbers and strings
    if (typeof a !== typeof b) {
      // Try to compare number and string representations
      if (
        (typeof a === "number" && typeof b === "string") ||
        (typeof a === "string" && typeof b === "number")
      ) {
        // Convert both to strings for comparison
        return String(a) === String(b);
      }
      // Try boolean to string comparison
      if (
        (typeof a === "boolean" && typeof b === "string") ||
        (typeof a === "string" && typeof b === "boolean")
      ) {
        return String(a) === String(b);
      }
      return false;
    }

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Checks if a value contains another (for strings, arrays, or objects).
   */
  private contains(haystack: any, needle: any): boolean {
    if (typeof haystack === "string" && typeof needle === "string") {
      return haystack.includes(needle);
    }

    if (Array.isArray(haystack)) {
      return haystack.some((item) => this.deepEqual(item, needle));
    }

    if (typeof haystack === "object" && haystack !== null) {
      return Object.values(haystack).some((value) =>
        this.deepEqual(value, needle)
      );
    }

    return false;
  }

  /**
   * Checks if a value matches a regular expression.
   */
  private matchesRegex(value: any, pattern: string): boolean {
    if (typeof value !== "string") return false;

    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch {
      return false;
    }
  }

  /**
   * Creates a standardized assertion result.
   */
  private createAssertionResult(
    field: string,
    expected: any,
    actual: any,
    passed: boolean,
    message?: string
  ): AssertionResult {
    return {
      field,
      expected,
      actual,
      passed,
      message:
        message ||
        (passed ? "OK" : `Expected: ${expected}, Received: ${actual}`),
    };
  }

  /**
   * Gets the type of a value for type assertions.
   */
  private getValueType(value: any): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  /**
   * Gets the length of a value for length assertions.
   * Returns -1 if the value doesn't have a length property.
   */
  private getValueLength(value: any): number {
    if (typeof value === "string" || Array.isArray(value)) {
      return value.length;
    }
    return -1;
  }
}
