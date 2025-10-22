/**
 * @fileoverview Length assertion strategy with nested operators.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import { getValueLength } from "../helpers/comparison.helper";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for length validation with nested comparison operators.
 *
 * @remarks
 * Validates the length of strings or arrays using nested operators
 * like equals, greater_than, less_than, etc.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     items:
 *       length:
 *         equals: 10
 *         greater_than: 0
 *     name:
 *       length:
 *         greater_than: 3
 *         less_than: 50
 * ```
 *
 * @public
 */
export class LengthStrategy implements AssertionStrategy {
  readonly name = "length";

  canHandle(checks: any): boolean {
    return checks.length !== undefined;
  }

  validate(context: AssertionContext): AssertionResult[] {
    const results: AssertionResult[] = [];
    const length = getValueLength(context.actualValue);

    if (length === -1) {
      return [
        {
          field: `${context.fieldName}.${this.name}`,
          expected: "valid array or string",
          actual: context.actualValue,
          passed: false,
          message: "Value must be an array or string to check length",
        },
      ];
    }

    const lengthChecks = context.expectedValue;

    if (lengthChecks.equals !== undefined) {
      const passed = length === lengthChecks.equals;
      results.push({
        field: `${context.fieldName}.${this.name}.equals`,
        expected: lengthChecks.equals,
        actual: length,
        passed,
        message: passed
          ? "OK"
          : `Expected length: ${lengthChecks.equals}, got: ${length}`,
      });
    }

    if (lengthChecks.greater_than !== undefined) {
      const passed = length > lengthChecks.greater_than;
      results.push({
        field: `${context.fieldName}.${this.name}.greater_than`,
        expected: `> ${lengthChecks.greater_than}`,
        actual: length,
        passed,
        message: passed
          ? "OK"
          : `Expected length > ${lengthChecks.greater_than}, got: ${length}`,
      });
    }

    if (lengthChecks.less_than !== undefined) {
      const passed = length < lengthChecks.less_than;
      results.push({
        field: `${context.fieldName}.${this.name}.less_than`,
        expected: `< ${lengthChecks.less_than}`,
        actual: length,
        passed,
        message: passed
          ? "OK"
          : `Expected length < ${lengthChecks.less_than}, got: ${length}`,
      });
    }

    if (lengthChecks.greater_than_or_equal !== undefined) {
      const passed = length >= lengthChecks.greater_than_or_equal;
      results.push({
        field: `${context.fieldName}.${this.name}.greater_than_or_equal`,
        expected: `>= ${lengthChecks.greater_than_or_equal}`,
        actual: length,
        passed,
        message: passed
          ? "OK"
          : `Expected length >= ${lengthChecks.greater_than_or_equal}, got: ${length}`,
      });
    }

    if (lengthChecks.less_than_or_equal !== undefined) {
      const passed = length <= lengthChecks.less_than_or_equal;
      results.push({
        field: `${context.fieldName}.${this.name}.less_than_or_equal`,
        expected: `<= ${lengthChecks.less_than_or_equal}`,
        actual: length,
        passed,
        message: passed
          ? "OK"
          : `Expected length <= ${lengthChecks.less_than_or_equal}, got: ${length}`,
      });
    }

    return results;
  }
}

/**
 * Strategy for minimum length validation (shorthand).
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     password: { minLength: 8 }
 * ```
 *
 * @public
 */
export class MinLengthStrategy implements AssertionStrategy {
  readonly name = "minLength";

  canHandle(checks: any): boolean {
    return checks.minLength !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const length = getValueLength(context.actualValue);

    if (length === -1) {
      return {
        field: `${context.fieldName}.${this.name}`,
        expected: "valid array or string",
        actual: context.actualValue,
        passed: false,
        message: "Value must be an array or string to check minLength",
      };
    }

    const passed = length >= context.expectedValue;
    return {
      field: `${context.fieldName}.${this.name}`,
      expected: `>= ${context.expectedValue}`,
      actual: length,
      passed,
      message: passed
        ? "OK"
        : `Length ${length} is less than minimum ${context.expectedValue}`,
    };
  }
}
