/**
 * @fileoverview In assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Strategy for 'in' assertions - checks if value is in a list.
 *
 * @remarks
 * Validates that a value is present in a specified array of allowed values.
 * Useful for validating enums, status codes, or any field with multiple valid values.
 *
 * @example
 * ```yaml
 * assert:
 *   status_code:
 *     in: [200, 201, 202]
 *   body:
 *     status: { in: ["active", "pending", "processing"] }
 * ```
 *
 * @public
 */
export class InStrategy implements AssertionStrategy {
  readonly name = "in";

  canHandle(checks: any): boolean {
    return checks.in !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const allowedValues = context.expectedValue;

    // Validate that expectedValue is an array
    if (!Array.isArray(allowedValues)) {
      return {
        field: `${context.fieldName}.${this.name}`,
        expected: allowedValues,
        actual: context.actualValue,
        passed: false,
        message: `'in' operator requires an array, got ${typeof allowedValues}`,
      };
    }

    const passed = allowedValues.includes(context.actualValue);

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: allowedValues,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Value '${
            context.actualValue
          }' is not in allowed list: [${allowedValues.join(", ")}]`,
    };
  }
}

/**
 * Strategy for 'not_in' assertions - checks if value is NOT in a list.
 *
 * @remarks
 * Validates that a value is NOT present in a specified array of forbidden values.
 * Useful for validating exclusions, blacklists, or invalid states.
 *
 * @example
 * ```yaml
 * assert:
 *   status_code:
 *     not_in: [400, 500, 503]
 *   body:
 *     status: { not_in: ["deleted", "banned", "suspended"] }
 * ```
 *
 * @public
 */
export class NotInStrategy implements AssertionStrategy {
  readonly name = "not_in";

  canHandle(checks: any): boolean {
    return checks.not_in !== undefined;
  }

  validate(context: AssertionContext): AssertionResult {
    const forbiddenValues = context.expectedValue;

    // Validate that expectedValue is an array
    if (!Array.isArray(forbiddenValues)) {
      return {
        field: `${context.fieldName}.${this.name}`,
        expected: forbiddenValues,
        actual: context.actualValue,
        passed: false,
        message: `'not_in' operator requires an array, got ${typeof forbiddenValues}`,
      };
    }

    const passed = !forbiddenValues.includes(context.actualValue);

    return {
      field: `${context.fieldName}.${this.name}`,
      expected: forbiddenValues,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Value '${
            context.actualValue
          }' is in forbidden list: [${forbiddenValues.join(", ")}]`,
    };
  }
}
