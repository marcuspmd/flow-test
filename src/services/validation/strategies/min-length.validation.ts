/**
 * @fileoverview Minimum length validation strategy.
 *
 * @remarks
 * Validates that a string or array has at least the specified minimum length.
 * Supports both `min_length` and `minLength` property names for flexibility.
 *
 * @packageDocumentation
 */

import { ValidationResult } from "../validation-result";
import { ValidationResultHelper } from "../validation-result";
import { ValidationContext } from "../validation-context";
import { BaseValidationStrategy } from "./validation-strategy.interface";

/**
 * Strategy for minimum length validation.
 *
 * @remarks
 * Validates that strings or arrays meet a minimum length requirement.
 * This is commonly used for password requirements, input validation,
 * and ensuring data completeness.
 *
 * **Supported Rule Properties:**
 * - `min_length`: Minimum length value
 * - `minLength`: Alternative property name (camelCase)
 *
 * **Supported Value Types:**
 * - `string`: Character count
 * - `Array`: Element count
 * - `null/undefined`: Treated as length 0
 *
 * @example YAML configuration
 * ```yaml
 * input:
 *   variable: "password"
 *   validation:
 *     min_length: 8  # Password must be at least 8 characters
 * ```
 *
 * @example TypeScript usage
 * ```typescript
 * const strategy = new MinLengthValidationStrategy();
 * const result = strategy.validate({
 *   field: "password",
 *   value: "Pass123",
 *   rule: { min_length: 8 }
 * });
 * // result.valid = false
 * // result.message = "Must be at least 8 characters (current: 7)"
 * ```
 *
 * @public
 */
export class MinLengthValidationStrategy extends BaseValidationStrategy {
  readonly name = "min_length";
  readonly priority = 50; // Medium priority

  /**
   * Checks if this strategy can handle the given rule.
   *
   * @param rule - Validation rule object
   * @returns True if rule contains min_length or minLength
   */
  canHandle(rule: any): boolean {
    return rule.min_length !== undefined || rule.minLength !== undefined;
  }

  /**
   * Validates minimum length requirement.
   *
   * @param context - Validation context with value and rule
   * @returns Validation result with success status and details
   */
  validate(context: ValidationContext): ValidationResult {
    const { field, value, rule } = context;

    // Extract min length value (support both naming conventions)
    const minLength = rule.min_length ?? rule.minLength;

    // Validate min length is a positive number
    if (typeof minLength !== "number" || minLength < 0) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        "Invalid min_length configuration: must be a positive number",
        "error",
        minLength,
        typeof minLength
      );
    }

    // Handle null/undefined as empty
    if (this.isNullOrUndefined(value)) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Must be at least ${minLength} characters (current: 0)`,
        "error",
        minLength,
        0
      );
    }

    // Get actual length
    const actualLength = this.getLength(value);

    // Validate type (must be string or array)
    if (typeof value !== "string" && !Array.isArray(value)) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        "Value must be a string or array for length validation",
        "error",
        "string | array",
        typeof value
      );
    }

    // Check length
    const valid = actualLength >= minLength;

    return valid
      ? ValidationResultHelper.success(field, this.name, value)
      : ValidationResultHelper.failure(
          field,
          this.name,
          value,
          `Must be at least ${minLength} ${
            typeof value === "string" ? "character" : "element"
          }${minLength !== 1 ? "s" : ""} (current: ${actualLength})`,
          "error",
          minLength,
          actualLength
        );
  }

  /**
   * Provides helpful suggestions when validation fails.
   *
   * @param context - Validation context
   * @returns Array of suggestion messages
   */
  suggest(context: ValidationContext): string[] {
    const { value, rule } = context;
    const minLength = rule.min_length ?? rule.minLength;
    const suggestions: string[] = [];

    if (this.isNullOrUndefined(value)) {
      suggestions.push("Provide a non-empty value");
      return suggestions;
    }

    if (typeof value !== "string" && !Array.isArray(value)) {
      suggestions.push("Ensure value is a string or array");
      return suggestions;
    }

    const actualLength = this.getLength(value);
    const deficit = minLength - actualLength;

    if (deficit > 0) {
      if (typeof value === "string") {
        suggestions.push(
          `Add at least ${deficit} more character${deficit !== 1 ? "s" : ""}`
        );
      } else {
        suggestions.push(
          `Add at least ${deficit} more element${deficit !== 1 ? "s" : ""}`
        );
      }
    }

    return suggestions;
  }
}
