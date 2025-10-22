/**
 * @fileoverview Not equals assertion strategy.
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
 * Strategy for inequality assertions.
 *
 * @remarks
 * Validates that actual value does NOT equal expected value.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     status: { not_equals: "error" }
 *     deleted_at: { not_equals: null }
 * ```
 *
 * @public
 */
export class NotEqualsStrategy implements AssertionStrategy {
  readonly name = "not_equals";

  canHandle(checks: any): boolean {
    return checks.not_equals !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed = !deepEqual(context.actualValue, context.expectedValue);

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: `not ${context.expectedValue}`,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Value should not equal: ${context.expectedValue}`,
    };
  }
}
