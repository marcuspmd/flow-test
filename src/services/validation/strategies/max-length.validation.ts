/**
 * @fileoverview Maximum length validation strategy.
 *
 * @remarks
 * Validates that a string or array does not exceed the specified maximum length.
 * Supports both `max_length` and `maxLength` property names for flexibility.
 *
 * @packageDocumentation
 */

import { ValidationResult } from "../validation-result";
import { ValidationResultHelper } from "../validation-result";
import { ValidationContext } from "../validation-context";
import { BaseValidationStrategy } from "./validation-strategy.interface";

/**
 * Strategy for maximum length validation.
 *
 * @remarks
 * Validates that strings or arrays do not exceed a maximum length requirement.
 * This is commonly used for input size limits, database column constraints,
 * and preventing excessively long inputs.
 *
 * **Supported Rule Properties:**
 * - `max_length`: Maximum length value
 * - `maxLength`: Alternative property name (camelCase)
 *
 * **Supported Value Types:**
 * - `string`: Character count
 * - `Array`: Element count
 * - `null/undefined`: Treated as length 0 (always valid)
 *
 * @example YAML configuration
 * ```yaml
 * input:
 *   variable: "username"
 *   validation:
 *     max_length: 50  # Username cannot exceed 50 characters
 * ```
 *
 * @example TypeScript usage
 * ```typescript
 * const strategy = new MaxLengthValidationStrategy();
 * const result = strategy.validate({
 *   field: "bio",
 *   value: "A".repeat(500),
 *   rule: { max_length: 200 }
 * });
 * // result.valid = false
 * // result.message = "Must be at most 200 characters (current: 500)"
 * ```
 *
 * @public
 */
export class MaxLengthValidationStrategy extends BaseValidationStrategy {
  readonly name = "max_length";
  readonly priority = 50; // Medium priority

  /**
   * Checks if this strategy can handle the given rule.
   *
   * @param rule - Validation rule object
   * @returns True if rule contains max_length or maxLength
   */
  canHandle(rule: any): boolean {
    return rule.max_length !== undefined || rule.maxLength !== undefined;
  }

  /**
   * Validates maximum length requirement.
   *
   * @param context - Validation context with value and rule
   * @returns Validation result with success status and details
   */
  validate(context: ValidationContext): ValidationResult {
    const { field, value, rule } = context;

    // Extract max length value (support both naming conventions)
    const maxLength = rule.max_length ?? rule.maxLength;

    // Validate max length is a positive number
    if (typeof maxLength !== "number" || maxLength < 0) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        "Invalid max_length configuration: must be a positive number",
        "error",
        maxLength,
        typeof maxLength
      );
    }

    // Handle null/undefined as valid (length 0)
    if (this.isNullOrUndefined(value)) {
      return ValidationResultHelper.success(field, this.name, value);
    }

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

    // Get actual length
    const actualLength = this.getLength(value);

    // Check length
    const valid = actualLength <= maxLength;

    return valid
      ? ValidationResultHelper.success(field, this.name, value)
      : ValidationResultHelper.failure(
          field,
          this.name,
          value,
          `Must be at most ${maxLength} ${
            typeof value === "string" ? "character" : "element"
          }${maxLength !== 1 ? "s" : ""} (current: ${actualLength})`,
          "error",
          maxLength,
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
    const maxLength = rule.max_length ?? rule.maxLength;
    const suggestions: string[] = [];

    if (this.isNullOrUndefined(value)) {
      return suggestions; // No suggestions needed for valid null/undefined
    }

    if (typeof value !== "string" && !Array.isArray(value)) {
      suggestions.push("Ensure value is a string or array");
      return suggestions;
    }

    const actualLength = this.getLength(value);
    const excess = actualLength - maxLength;

    if (excess > 0) {
      if (typeof value === "string") {
        suggestions.push(
          `Remove at least ${excess} character${excess !== 1 ? "s" : ""}`
        );
        suggestions.push(`Shorten text to ${maxLength} characters or less`);
      } else {
        suggestions.push(
          `Remove at least ${excess} element${excess !== 1 ? "s" : ""}`
        );
        suggestions.push(`Reduce array to ${maxLength} elements or fewer`);
      }
    }

    return suggestions;
  }
}
