/**
 * @fileoverview Numeric range validation strategy.
 *
 * @remarks
 * Validates that a numeric value falls within a specified range (min/max).
 * Supports both `min`/`max` and variable references for dynamic constraints.
 *
 * @packageDocumentation
 */

import { ValidationResult } from "../validation-result";
import { ValidationResultHelper } from "../validation-result";
import { ValidationContext } from "../validation-context";
import { BaseValidationStrategy } from "./validation-strategy.interface";

/**
 * Strategy for numeric range validation.
 *
 * @remarks
 * Validates that numeric values fall within specified minimum and maximum bounds.
 * This is commonly used for age validation, quantity limits, price ranges,
 * and any numeric constraint validation.
 *
 * **Supported Rule Properties:**
 * - `min`: Minimum value (inclusive)
 * - `max`: Maximum value (inclusive)
 * - Can specify both, or just one
 *
 * **Supported Value Types:**
 * - `number`: Direct validation
 * - `string`: Parsed to number if possible
 * - `null/undefined`: Fails validation
 * - Other types: Fails validation
 *
 * **Variable References:**
 * - Supports `{{variable}}` syntax in min/max values
 * - Variables resolved from context.variables
 *
 * @example YAML configuration
 * ```yaml
 * input:
 *   variable: "age"
 *   validation:
 *     min: 18
 *     max: 120
 *
 * input:
 *   variable: "quantity"
 *   validation:
 *     min: 1
 *     max: "{{max_order_quantity}}"  # Dynamic from variable
 * ```
 *
 * @example TypeScript usage
 * ```typescript
 * const strategy = new RangeValidationStrategy();
 * const result = strategy.validate({
 *   field: "age",
 *   value: 25,
 *   rule: { min: 18, max: 65 }
 * });
 * // result.valid = true
 * ```
 *
 * @public
 */
export class RangeValidationStrategy extends BaseValidationStrategy {
  readonly name = "range";
  readonly priority = 55; // Medium-high priority

  /**
   * Checks if this strategy can handle the given rule.
   *
   * @param rule - Validation rule object
   * @returns True if rule contains min or max
   */
  canHandle(rule: any): boolean {
    return rule.min !== undefined || rule.max !== undefined;
  }

  /**
   * Validates numeric range requirement.
   *
   * @param context - Validation context with value and rule
   * @returns Validation result with success status and details
   */
  validate(context: ValidationContext): ValidationResult {
    const { field, value, rule, variables } = context;

    // Resolve min/max values (support variable references)
    const minValue = this.resolveVariable(rule.min, variables);
    const maxValue = this.resolveVariable(rule.max, variables);

    // Handle null/undefined value
    if (this.isNullOrUndefined(value)) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        "Value is required for range validation",
        "error",
        `min: ${minValue}, max: ${maxValue}`,
        value
      );
    }

    // Convert to number
    const numericValue = this.toNumber(value);

    // Validate conversion succeeded
    if (numericValue === null) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Value must be a number (received: ${typeof value})`,
        "error",
        "number",
        typeof value
      );
    }

    // Validate min constraint
    if (minValue !== undefined && minValue !== null) {
      const minNum = this.toNumber(minValue);

      if (minNum === null) {
        return ValidationResultHelper.failure(
          field,
          this.name,
          value,
          "Invalid min configuration: must be a number",
          "error",
          minValue,
          typeof minValue
        );
      }

      if (numericValue < minNum) {
        return ValidationResultHelper.failure(
          field,
          this.name,
          value,
          `Value must be at least ${minNum} (current: ${numericValue})`,
          "error",
          `>= ${minNum}`,
          numericValue
        );
      }
    }

    // Validate max constraint
    if (maxValue !== undefined && maxValue !== null) {
      const maxNum = this.toNumber(maxValue);

      if (maxNum === null) {
        return ValidationResultHelper.failure(
          field,
          this.name,
          value,
          "Invalid max configuration: must be a number",
          "error",
          maxValue,
          typeof maxValue
        );
      }

      if (numericValue > maxNum) {
        return ValidationResultHelper.failure(
          field,
          this.name,
          value,
          `Value must be at most ${maxNum} (current: ${numericValue})`,
          "error",
          `<= ${maxNum}`,
          numericValue
        );
      }
    }

    // All validations passed
    return ValidationResultHelper.success(field, this.name, value);
  }

  /**
   * Provides helpful suggestions when validation fails.
   *
   * @param context - Validation context
   * @returns Array of suggestion messages
   */
  suggest(context: ValidationContext): string[] {
    const { value, rule, variables } = context;
    const suggestions: string[] = [];

    if (this.isNullOrUndefined(value)) {
      suggestions.push("Provide a numeric value");
      return suggestions;
    }

    const numericValue = this.toNumber(value);

    if (numericValue === null) {
      suggestions.push("Ensure value is a valid number");
      suggestions.push(`Current type: ${typeof value}`);
      return suggestions;
    }

    const minValue = this.resolveVariable(rule.min, variables);
    const maxValue = this.resolveVariable(rule.max, variables);
    const minNum = minValue !== undefined ? this.toNumber(minValue) : null;
    const maxNum = maxValue !== undefined ? this.toNumber(maxValue) : null;

    // Min violation
    if (minNum !== null && numericValue < minNum) {
      const deficit = minNum - numericValue;
      suggestions.push(`Increase value by at least ${deficit}`);
      suggestions.push(`Minimum allowed: ${minNum}`);
    }

    // Max violation
    if (maxNum !== null && numericValue > maxNum) {
      const excess = numericValue - maxNum;
      suggestions.push(`Decrease value by at least ${excess}`);
      suggestions.push(`Maximum allowed: ${maxNum}`);
    }

    // Range suggestion
    if (minNum !== null && maxNum !== null) {
      suggestions.push(`Valid range: ${minNum} to ${maxNum}`);
    }

    return suggestions;
  }

  /**
   * Helper method to convert value to number.
   *
   * @param value - Value to convert
   * @returns Numeric value or null if conversion fails
   *
   * @private
   */
  private toNumber(value: any): number | null {
    if (typeof value === "number") {
      return isNaN(value) ? null : value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }
}
