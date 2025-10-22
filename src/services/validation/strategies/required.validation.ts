/**
 * @fileoverview Required field validation strategy.
 *
 * @remarks
 * Validates that a field is not null, undefined, empty string, empty array, or empty object.
 * This is one of the most common validation rules and should be checked first.
 *
 * @packageDocumentation
 */

import { ValidationResult } from "../validation-result";
import { ValidationResultHelper } from "../validation-result";
import { ValidationContext } from "../validation-context";
import { BaseValidationStrategy } from "./validation-strategy.interface";

/**
 * Strategy for required field validation.
 *
 * @remarks
 * Validates that a field has a meaningful value. This strategy checks for:
 * - `null` or `undefined` values
 * - Empty strings (`""`)
 * - Empty arrays (`[]`)
 * - Empty objects (`{}`)
 * - Boolean `false` (optionally allowed)
 * - Number `0` (optionally allowed)
 *
 * **Supported Rule Properties:**
 * - `required`: `true` to enforce the field
 * - `allow_false`: Allow boolean `false` as valid (default: true)
 * - `allow_zero`: Allow number `0` as valid (default: true)
 *
 * @example YAML configuration
 * ```yaml
 * input:
 *   variable: "email"
 *   validation:
 *     required: true
 *
 * input:
 *   variable: "accepted_terms"
 *   validation:
 *     required: true
 *     allow_false: false  # Must be explicitly true
 * ```
 *
 * @example TypeScript usage
 * ```typescript
 * const strategy = new RequiredValidationStrategy();
 * const result = strategy.validate({
 *   field: "email",
 *   value: "",
 *   rule: { required: true }
 * });
 * // result.valid = false
 * // result.message = "Field 'email' is required"
 * ```
 *
 * @public
 */
export class RequiredValidationStrategy extends BaseValidationStrategy {
  readonly name = "required";
  readonly priority = 100; // Highest priority - check first

  /**
   * Checks if this strategy can handle the given rule.
   *
   * @param rule - Validation rule object
   * @returns True if rule contains required: true
   */
  canHandle(rule: any): boolean {
    return rule.required === true;
  }

  /**
   * Validates required field constraint.
   *
   * @param context - Validation context with value and rule
   * @returns Validation result with success status and details
   */
  validate(context: ValidationContext): ValidationResult {
    const { field, value, rule } = context;

    // Extract configuration
    const allowFalse = rule.allow_false !== false; // Default: true
    const allowZero = rule.allow_zero !== false; // Default: true

    // Check for null/undefined
    if (this.isNullOrUndefined(value)) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Field '${field}' is required`,
        "error",
        "non-null value",
        value === null ? "null" : "undefined"
      );
    }

    // Check for empty string
    if (value === "") {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Field '${field}' cannot be empty`,
        "error",
        "non-empty value",
        "empty string"
      );
    }

    // Check for empty array
    if (Array.isArray(value) && value.length === 0) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Field '${field}' cannot be an empty array`,
        "error",
        "non-empty array",
        "empty array"
      );
    }

    // Check for empty object
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Field '${field}' cannot be an empty object`,
        "error",
        "non-empty object",
        "empty object"
      );
    }

    // Check for false (if not allowed)
    if (value === false && !allowFalse) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Field '${field}' must be true`,
        "error",
        true,
        false
      );
    }

    // Check for zero (if not allowed)
    if (value === 0 && !allowZero) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Field '${field}' cannot be zero`,
        "error",
        "non-zero number",
        0
      );
    }

    // All checks passed
    return ValidationResultHelper.success(field, this.name, value);
  }

  /**
   * Provides helpful suggestions when validation fails.
   *
   * @param context - Validation context
   * @returns Array of suggestion messages
   */
  suggest(context: ValidationContext): string[] {
    const { value, field } = context;
    const suggestions: string[] = [];

    if (this.isNullOrUndefined(value)) {
      suggestions.push(`Provide a value for '${field}'`);
      suggestions.push("Ensure the field is set before validation");
    } else if (value === "") {
      suggestions.push("Enter a non-empty value");
      suggestions.push("Remove whitespace-only values");
    } else if (Array.isArray(value) && value.length === 0) {
      suggestions.push("Add at least one item to the array");
    } else if (typeof value === "object" && Object.keys(value).length === 0) {
      suggestions.push("Add at least one property to the object");
    }

    return suggestions;
  }
}
