/**
 * @fileoverview Type assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import { getValueType } from "../helpers/comparison.helper";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for runtime type checking.
 *
 * @remarks
 * Validates that a value has the expected runtime type.
 * Distinguishes between "array", "object", and "null" (unlike typeof).
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     id: { type: "number" }
 *     name: { type: "string" }
 *     items: { type: "array" }
 *     metadata: { type: "object" }
 * ```
 *
 * @public
 */
export class TypeStrategy implements AssertionStrategy {
  readonly name = "type";

  canHandle(checks: any): boolean {
    return checks.type !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const actualType = getValueType(context.actualValue);
    const passed = actualType === context.expectedValue;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: context.expectedValue,
      actual: actualType,
      passed,
      message: passed
        ? "OK"
        : `Expected type: ${context.expectedValue}, Received: ${actualType}`,
    };
  }
}
