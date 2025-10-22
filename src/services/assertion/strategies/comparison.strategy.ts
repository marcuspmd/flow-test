/**
 * @fileoverview Numeric comparison assertion strategies.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for "greater than" numeric comparison.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     age: { greater_than: 18 }
 *     price: { greater_than: 0 }
 * ```
 *
 * @public
 */
export class GreaterThanStrategy implements AssertionStrategy {
  readonly name = "greater_than";

  canHandle(checks: any): boolean {
    return checks.greater_than !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed =
      typeof context.actualValue === "number" &&
      context.actualValue > context.expectedValue;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: `> ${context.expectedValue}`,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Expected value > ${context.expectedValue}, got: ${context.actualValue}`,
    };
  }
}

/**
 * Strategy for "less than" numeric comparison.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     age: { less_than: 100 }
 *     response_time_ms: { less_than: 2000 }
 * ```
 *
 * @public
 */
export class LessThanStrategy implements AssertionStrategy {
  readonly name = "less_than";

  canHandle(checks: any): boolean {
    return checks.less_than !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed =
      typeof context.actualValue === "number" &&
      context.actualValue < context.expectedValue;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: `< ${context.expectedValue}`,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Expected value < ${context.expectedValue}, got: ${context.actualValue}`,
    };
  }
}

/**
 * Strategy for "greater than or equal" numeric comparison.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     count: { greater_than_or_equal: 1 }
 * ```
 *
 * @public
 */
export class GreaterThanOrEqualStrategy implements AssertionStrategy {
  readonly name = "greater_than_or_equal";

  canHandle(checks: any): boolean {
    return checks.greater_than_or_equal !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed =
      typeof context.actualValue === "number" &&
      context.actualValue >= context.expectedValue;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: `>= ${context.expectedValue}`,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Expected value >= ${context.expectedValue}, got: ${context.actualValue}`,
    };
  }
}

/**
 * Strategy for "less than or equal" numeric comparison.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     items: { less_than_or_equal: 100 }
 * ```
 *
 * @public
 */
export class LessThanOrEqualStrategy implements AssertionStrategy {
  readonly name = "less_than_or_equal";

  canHandle(checks: any): boolean {
    return checks.less_than_or_equal !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed =
      typeof context.actualValue === "number" &&
      context.actualValue <= context.expectedValue;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: `<= ${context.expectedValue}`,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Expected value <= ${context.expectedValue}, got: ${context.actualValue}`,
    };
  }
}
