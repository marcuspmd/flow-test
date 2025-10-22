/**
 * @fileoverview Equals assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import { deepEqual } from "../helpers/comparison.helper";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for equality assertions with type-tolerant comparison.
 *
 * @remarks
 * Validates that actual value equals expected value using deep comparison
 * with automatic type coercion for common scenarios.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     status: { equals: "success" }
 *     code: { equals: 200 }
 * ```
 *
 * @public
 */
export class EqualsStrategy implements AssertionStrategy {
  readonly name = "equals";

  canHandle(checks: any): boolean {
    return checks.equals !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed = deepEqual(context.actualValue, context.expectedValue);

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: context.expectedValue,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Expected: ${context.expectedValue}, Received: ${context.actualValue}`,
    };
  }
}
