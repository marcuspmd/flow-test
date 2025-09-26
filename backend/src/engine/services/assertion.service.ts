import { Injectable } from '@nestjs/common';
import * as jmespath from 'jmespath';
import {
  Assertions,
  AssertionChecks,
  AssertionResult,
  StepExecutionResult,
} from '../types/engine.types';
import { LoggerService } from './logger.service';

@Injectable()
export class AssertionService {
  constructor(private readonly logger: LoggerService) {}

  validateAssertions(
    assertions: Assertions,
    result: StepExecutionResult,
  ): AssertionResult[] {
    const assertionResults: AssertionResult[] = [];

    if (!assertions || !result.response_details) {
      return assertionResults;
    }

    const responseData = {
      status_code: result.response_details.status_code,
      headers: result.response_details.headers,
      body: result.response_details.body,
      response_time: result.duration_ms,
    };

    try {
      for (const [field, expected] of Object.entries(assertions)) {
        if (field === 'status_code') {
          const statusResult = this.validateStatusCode(
            expected,
            responseData.status_code,
          );
          assertionResults.push(...statusResult);
        } else if (field === 'response_time') {
          const timeResult = this.validateResponseTime(
            expected,
            responseData.response_time,
          );
          assertionResults.push(...timeResult);
        } else if (field === 'headers') {
          const headerResults = this.validateHeaders(
            expected,
            responseData.headers,
          );
          assertionResults.push(...headerResults);
        } else if (field === 'body') {
          const bodyResults = this.validateBody(expected, responseData.body);
          assertionResults.push(...bodyResults);
        } else {
          // Handle JMESPath expressions and nested field access
          const fieldResult = this.validateField(field, expected, responseData);
          assertionResults.push(...fieldResult);
        }
      }
    } catch (error) {
      this.logger.error(`Assertion validation error: ${error.message}`, {
        error: error as Error,
      });
      assertionResults.push({
        assertion: 'validation_error',
        expected: 'successful validation',
        actual: error.message,
        passed: false,
        message: `Assertion validation failed: ${error.message}`,
      });
    }

    return assertionResults;
  }

  private validateStatusCode(expected: any, actual: number): AssertionResult[] {
    if (typeof expected === 'number') {
      return [
        {
          assertion: 'status_code',
          expected,
          actual,
          passed: actual === expected,
          message:
            actual === expected
              ? `Status code matches expected value: ${expected}`
              : `Expected status code ${expected}, but got ${actual}`,
        },
      ];
    }

    if (typeof expected === 'object' && expected !== null) {
      return this.validateWithChecks(
        'status_code',
        expected as AssertionChecks,
        actual,
      );
    }

    return [
      {
        assertion: 'status_code',
        expected,
        actual,
        passed: false,
        message: `Invalid status code assertion format: ${JSON.stringify(expected)}`,
      },
    ];
  }

  private validateResponseTime(
    expected: any,
    actual: number,
  ): AssertionResult[] {
    if (typeof expected === 'object' && expected !== null) {
      return this.validateWithChecks(
        'response_time',
        expected as AssertionChecks,
        actual,
      );
    }

    return [
      {
        assertion: 'response_time',
        expected,
        actual,
        passed: false,
        message: `Invalid response time assertion format: ${JSON.stringify(expected)}`,
      },
    ];
  }

  private validateHeaders(
    expected: any,
    actual: Record<string, string>,
  ): AssertionResult[] {
    const results: AssertionResult[] = [];

    if (typeof expected === 'object' && expected !== null) {
      for (const [headerName, headerExpected] of Object.entries(expected)) {
        const headerValue = this.getHeaderValue(actual, headerName);

        if (typeof headerExpected === 'object' && headerExpected !== null) {
          const headerResults = this.validateWithChecks(
            `headers.${headerName}`,
            headerExpected as AssertionChecks,
            headerValue,
          );
          results.push(...headerResults);
        } else {
          results.push({
            assertion: `headers.${headerName}`,
            expected: headerExpected,
            actual: headerValue,
            passed: headerValue === headerExpected,
            message:
              headerValue === headerExpected
                ? `Header ${headerName} matches expected value`
                : `Expected header ${headerName} to be "${headerExpected}", but got "${headerValue}"`,
          });
        }
      }
    }

    return results;
  }

  private validateBody(expected: any, actual: any): AssertionResult[] {
    const results: AssertionResult[] = [];

    if (
      typeof expected === 'object' &&
      expected !== null &&
      !Array.isArray(expected)
    ) {
      for (const [path, pathExpected] of Object.entries(expected)) {
        const pathResults = this.validateBodyPath(
          `body.${path}`,
          pathExpected,
          actual,
        );
        results.push(...pathResults);
      }
    } else {
      results.push({
        assertion: 'body',
        expected,
        actual,
        passed: JSON.stringify(actual) === JSON.stringify(expected),
        message:
          JSON.stringify(actual) === JSON.stringify(expected)
            ? 'Response body matches expected value'
            : `Expected body to match but got differences`,
      });
    }

    return results;
  }

  private validateBodyPath(
    path: string,
    expected: any,
    responseBody: any,
  ): AssertionResult[] {
    try {
      const actualValue = this.extractValueFromPath(
        path.replace('body.', ''),
        responseBody,
      );

      if (
        typeof expected === 'object' &&
        expected !== null &&
        !Array.isArray(expected)
      ) {
        return this.validateWithChecks(
          path,
          expected as AssertionChecks,
          actualValue,
        );
      } else {
        return [
          {
            assertion: path,
            expected,
            actual: actualValue,
            passed: JSON.stringify(actualValue) === JSON.stringify(expected),
            message:
              JSON.stringify(actualValue) === JSON.stringify(expected)
                ? `Path ${path} matches expected value`
                : `Expected ${path} to be ${JSON.stringify(expected)}, but got ${JSON.stringify(actualValue)}`,
          },
        ];
      }
    } catch (error) {
      return [
        {
          assertion: path,
          expected,
          actual: undefined,
          passed: false,
          message: `Failed to extract value from path ${path}: ${error.message}`,
        },
      ];
    }
  }

  private validateField(
    field: string,
    expected: any,
    responseData: any,
  ): AssertionResult[] {
    try {
      const actualValue = this.extractValueFromPath(field, responseData);

      if (
        typeof expected === 'object' &&
        expected !== null &&
        !Array.isArray(expected)
      ) {
        return this.validateWithChecks(
          field,
          expected as AssertionChecks,
          actualValue,
        );
      } else {
        return [
          {
            assertion: field,
            expected,
            actual: actualValue,
            passed: JSON.stringify(actualValue) === JSON.stringify(expected),
            message:
              JSON.stringify(actualValue) === JSON.stringify(expected)
                ? `Field ${field} matches expected value`
                : `Expected ${field} to be ${JSON.stringify(expected)}, but got ${JSON.stringify(actualValue)}`,
          },
        ];
      }
    } catch (error) {
      return [
        {
          assertion: field,
          expected,
          actual: undefined,
          passed: false,
          message: `Failed to extract value from field ${field}: ${error.message}`,
        },
      ];
    }
  }

  private validateWithChecks(
    field: string,
    checks: AssertionChecks,
    actual: any,
  ): AssertionResult[] {
    const results: AssertionResult[] = [];

    for (const [operator, expected] of Object.entries(checks)) {
      const result = this.validateWithOperator(
        field,
        operator,
        expected,
        actual,
      );
      results.push(result);
    }

    return results;
  }

  private validateWithOperator(
    field: string,
    operator: string,
    expected: any,
    actual: any,
  ): AssertionResult {
    const assertion = `${field}.${operator}`;

    switch (operator) {
      case 'equals':
        const equalsResult =
          JSON.stringify(actual) === JSON.stringify(expected);
        return {
          assertion,
          expected,
          actual,
          passed: equalsResult,
          message: equalsResult
            ? `${field} equals expected value`
            : `Expected ${field} to equal ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`,
        };

      case 'not_equals':
        const notEqualsResult =
          JSON.stringify(actual) !== JSON.stringify(expected);
        return {
          assertion,
          expected,
          actual,
          passed: notEqualsResult,
          message: notEqualsResult
            ? `${field} does not equal the value (as expected)`
            : `Expected ${field} to not equal ${JSON.stringify(expected)}, but it does`,
        };

      case 'contains':
        const containsResult = this.checkContains(actual, expected);
        return {
          assertion,
          expected,
          actual,
          passed: containsResult,
          message: containsResult
            ? `${field} contains expected value`
            : `Expected ${field} to contain ${JSON.stringify(expected)}, but it doesn't`,
        };

      case 'greater_than':
        const greaterResult =
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual > expected;
        return {
          assertion,
          expected,
          actual,
          passed: greaterResult,
          message: greaterResult
            ? `${field} is greater than expected value`
            : `Expected ${field} (${actual}) to be greater than ${expected}`,
        };

      case 'less_than':
        const lessResult =
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual < expected;
        return {
          assertion,
          expected,
          actual,
          passed: lessResult,
          message: lessResult
            ? `${field} is less than expected value`
            : `Expected ${field} (${actual}) to be less than ${expected}`,
        };

      case 'regex':
        const regexResult = this.checkRegex(actual, expected);
        return {
          assertion,
          expected,
          actual,
          passed: regexResult,
          message: regexResult
            ? `${field} matches regex pattern`
            : `Expected ${field} to match regex /${expected}/, but "${actual}" doesn't match`,
        };

      case 'not_null':
        const notNullResult = expected
          ? actual !== null && actual !== undefined
          : actual === null || actual === undefined;
        return {
          assertion,
          expected,
          actual,
          passed: notNullResult,
          message: notNullResult
            ? expected
              ? `${field} is not null`
              : `${field} is null`
            : expected
              ? `Expected ${field} to not be null, but it is`
              : `Expected ${field} to be null, but got ${JSON.stringify(actual)}`,
        };

      case 'type':
        const typeResult = this.checkType(actual, expected);
        return {
          assertion,
          expected,
          actual: typeof actual,
          passed: typeResult,
          message: typeResult
            ? `${field} has expected type`
            : `Expected ${field} to be of type ${expected}, but got ${typeof actual}`,
        };

      case 'length':
        const lengthResult = this.validateLength(
          field,
          expected as AssertionChecks,
          actual,
        );
        return lengthResult[0]; // length returns array, but we need single result

      default:
        return {
          assertion,
          expected,
          actual,
          passed: false,
          message: `Unknown assertion operator: ${operator}`,
        };
    }
  }

  private validateLength(
    field: string,
    checks: AssertionChecks,
    actual: any,
  ): AssertionResult[] {
    let length = 0;

    if (Array.isArray(actual)) {
      length = actual.length;
    } else if (typeof actual === 'string') {
      length = actual.length;
    } else if (actual && typeof actual === 'object') {
      length = Object.keys(actual).length;
    }

    return this.validateWithChecks(`${field}.length`, checks, length);
  }

  private extractValueFromPath(path: string, data: any): any {
    try {
      // Try JMESPath first for complex expressions
      if (path.includes('[') || path.includes('?') || path.includes('|')) {
        return jmespath.search(data, path);
      }

      // Simple dot notation
      return path.split('.').reduce((obj, key) => obj?.[key], data);
    } catch (error) {
      this.logger.debug(
        `JMESPath extraction failed for ${path}, trying simple path`,
        { error: error as Error },
      );
      return path.split('.').reduce((obj, key) => obj?.[key], data);
    }
  }

  private getHeaderValue(
    headers: Record<string, string>,
    headerName: string,
  ): string | undefined {
    const lowerHeaderName = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerHeaderName) {
        return value;
      }
    }
    return undefined;
  }

  private checkContains(actual: any, expected: any): boolean {
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.includes(expected);
    }

    if (Array.isArray(actual)) {
      return actual.includes(expected);
    }

    if (actual && typeof actual === 'object' && typeof expected === 'string') {
      return JSON.stringify(actual).includes(expected);
    }

    return false;
  }

  private checkRegex(actual: any, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(String(actual));
    } catch {
      return false;
    }
  }

  private checkType(actual: any, expectedType: string): boolean {
    const actualType = Array.isArray(actual) ? 'array' : typeof actual;
    return actualType === expectedType.toLowerCase();
  }
}
