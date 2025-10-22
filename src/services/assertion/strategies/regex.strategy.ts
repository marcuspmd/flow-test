/**
 * @fileoverview Regex assertion strategy.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";
import { matchesRegex } from "../helpers/comparison.helper";
import {
  AssertionStrategy,
  AssertionContext,
} from "./assertion-strategy.interface";

/**
 * Extended context for regex strategy to track which property was used.
 */
interface RegexContext extends AssertionContext {
  propertyName?: "regex" | "pattern";
}

/**
 * Strategy for regular expression pattern matching.
 *
 * @remarks
 * Validates that a string value matches a regex pattern.
 * Supports both `regex` and `pattern` property names.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     email: { regex: "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" }
 *     token: { pattern: "^[A-Za-z0-9-_]+$" }
 * ```
 *
 * @public
 */
export class RegexStrategy implements AssertionStrategy {
  readonly name = "regex";
  private lastPropertyName: "regex" | "pattern" = "regex";

  canHandle(checks: any): boolean {
    if (checks.regex !== undefined) {
      this.lastPropertyName = "regex";
      return true;
    }
    if (checks.pattern !== undefined) {
      this.lastPropertyName = "pattern";
      return true;
    }
    return false;
  }

  validate(context: RegexContext): AssertionResult {
    const passed = matchesRegex(context.actualValue, context.expectedValue);
    const propertyName = context.propertyName || this.lastPropertyName;

    return {
      field: `${context.fieldName}.${propertyName}`,
      expected: context.expectedValue,
      actual: context.actualValue,
      passed,
      message: passed
        ? "OK"
        : `Value does not match pattern: ${context.expectedValue}`,
    };
  }
}
