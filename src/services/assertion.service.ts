import * as jmespath from "jmespath";
import {
  Assertions,
  AssertionResult,
  AssertionChecks,
  ExecutionResult,
} from "../types/common.types";
import { getLogger } from "./logger.service";

/**
 * Service responsible for validating assertions in HTTP responses
 *
 * This service processes and validates all assertions defined in tests,
 * including status code, headers, body and response time validations.
 * Supports flat syntax (body.status) and structured syntax (body: {status}).
 *
 * @example
 * ```typescript
 * const assertionService = new AssertionService();
 * const results = assertionService.validateAssertions({
 *   status_code: 200,
 *   'body.message': { equals: 'success' }
 * }, executionResult);
 *
 * results.forEach(result => {
 *   console.log(`${result.field}: ${result.passed ? 'PASS' : 'FAIL'}`);
 * });
 * ```
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
    result: ExecutionResult
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
      assertionResults.push(
        this.validateStatusCode(processedAssertions.status_code, result)
      );
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
    result: ExecutionResult
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
    result: ExecutionResult
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
    result: ExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualBody = result.response_details!.body;

    for (const [fieldPath, checks] of Object.entries(expectedBody)) {
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
   * Validates the response time.
   */
  private validateResponseTime(
    timeChecks: { less_than?: number; greater_than?: number },
    result: ExecutionResult
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
}
