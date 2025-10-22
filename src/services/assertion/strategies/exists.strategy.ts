/**
 * @fileoverview Exists assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for existence/presence validation.
 *
 * @remarks
 * Validates whether a field exists (not null/undefined) or doesn't exist.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     token: { exists: true }
 *     deleted_at: { exists: false }
 * ```
 *
 * @public
 */
export class ExistsStrategy implements AssertionStrategy {
  readonly name = "exists";

  canHandle(checks: any): boolean {
    return checks.exists !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const exists =
      context.actualValue !== undefined && context.actualValue !== null;
    const passed = exists === context.expectedValue;

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: context.expectedValue,
      actual: exists,
      passed,
      message: passed
        ? "OK"
        : context.expectedValue
        ? "Field does not exist"
        : "Field should not exist",
    };
  }
}
