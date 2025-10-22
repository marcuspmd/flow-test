/**
 * @fileoverview Contains assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import { contains } from "../helpers/comparison.helper";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for containment assertions.
 *
 * @remarks
 * Validates that a value contains another value.
 * Supports strings (substring), arrays (element), and objects (value).
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     message: { contains: "success" }
 *     tags: { contains: "important" }
 * ```
 *
 * @public
 */
export class ContainsStrategy implements AssertionStrategy {
  readonly name = "contains";

  canHandle(checks: any): boolean {
    return checks.contains !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const passed = contains(context.actualValue, context.expectedValue);

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: context.expectedValue,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Value does not contain: ${context.expectedValue}`,
    };
  }
}
