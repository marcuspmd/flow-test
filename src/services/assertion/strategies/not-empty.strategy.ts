/**
 * @fileoverview Not empty assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import { isEmpty } from "../helpers/comparison.helper";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for emptiness validation.
 *
 * @remarks
 * Validates that a value is not empty (or is empty if expected value is false).
 * Considers null, undefined, "", [], and {} as empty.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     items: { notEmpty: true }
 *     description: { notEmpty: true }
 * ```
 *
 * @public
 */
export class NotEmptyStrategy implements AssertionStrategy {
  readonly name = "notEmpty";

  canHandle(checks: any): boolean {
    return checks.notEmpty !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const isValueEmpty = isEmpty(context.actualValue);
    const passed = context.expectedValue ? !isValueEmpty : isValueEmpty;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: context.expectedValue,
      actual: !isValueEmpty,
      passed,
      message: passed
        ? "OK"
        : `Value ${context.expectedValue ? "is empty" : "is not empty"}`,
    };
  }
}
