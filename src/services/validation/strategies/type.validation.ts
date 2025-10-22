/**
 * @fileoverview Type validation strategy.
 *
 * @remarks
 * Validates that a value matches the expected JavaScript type.
 * Supports all primitive types plus arrays and objects.
 *
 * @packageDocumentation
 */

import { ValidationResult } from "../validation-result";
import { ValidationResultHelper } from "../validation-result";
import { ValidationContext } from "../validation-context";
import { BaseValidationStrategy } from "./validation-strategy.interface";

/**
 * Supported type names for validation.
 *
 * @public
 */
export type ValidationType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "undefined"
  | "function";

/**
 * Strategy for type validation.
 *
 * @remarks
 * Validates that values match the expected JavaScript type.
 * This is useful for ensuring data integrity and preventing type-related errors.
 *
 * **Supported Rule Properties:**
 * - `type`: Expected type name (string, number, boolean, object, array, null, undefined, function)
 *
 * **Type Checking Rules:**
 * - `string`: Uses `typeof value === 'string'`
 * - `number`: Uses `typeof value === 'number'` (excludes NaN)
 * - `boolean`: Uses `typeof value === 'boolean'`
 * - `object`: Non-array, non-null object
 * - `array`: Uses `Array.isArray(value)`
 * - `null`: Strict equality `value === null`
 * - `undefined`: Strict equality `value === undefined`
 * - `function`: Uses `typeof value === 'function'`
 *
 * @example YAML configuration
 * ```yaml
 * input:
 *   variable: "age"
 *   validation:
 *     type: number
 *
 * input:
 *   variable: "tags"
 *   validation:
 *     type: array
 * ```
 *
 * @example TypeScript usage
 * ```typescript
 * const strategy = new TypeValidationStrategy();
 * const result = strategy.validate({
 *   field: "age",
 *   value: "25",
 *   rule: { type: "number" }
 * });
 * // result.valid = false
 * // result.message = "Expected type 'number', got 'string'"
 * ```
 *
 * @public
 */
export class TypeValidationStrategy extends BaseValidationStrategy {
  readonly name = "type";
  readonly priority = 90; // High priority - check type before other validations

  private readonly validTypes: ValidationType[] = [
    "string",
    "number",
    "boolean",
    "object",
    "array",
    "null",
    "undefined",
    "function",
  ];

  /**
   * Checks if this strategy can handle the given rule.
   *
   * @param rule - Validation rule object
   * @returns True if rule contains type property
   */
  canHandle(rule: any): boolean {
    return rule.type !== undefined;
  }

  /**
   * Validates type constraint.
   *
   * @param context - Validation context with value and rule
   * @returns Validation result with success status and details
   */
  validate(context: ValidationContext): ValidationResult {
    const { field, value, rule } = context;
    const expectedType = rule.type as ValidationType;

    // Validate expected type is valid
    if (!this.validTypes.includes(expectedType)) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Invalid type specification: '${expectedType}'. Must be one of: ${this.validTypes.join(
          ", "
        )}`,
        "error",
        this.validTypes.join(" | "),
        expectedType
      );
    }

    // Get actual type
    const actualType = this.getValueType(value);

    // Check type match
    const valid = actualType === expectedType;

    return valid
      ? ValidationResultHelper.success(field, this.name, value)
      : ValidationResultHelper.failure(
          field,
          this.name,
          value,
          `Expected type '${expectedType}', got '${actualType}'`,
          "error",
          expectedType,
          actualType
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
    const expectedType = rule.type as ValidationType;
    const actualType = this.getValueType(value);
    const suggestions: string[] = [];

    // Type conversion suggestions
    if (expectedType === "number" && actualType === "string") {
      suggestions.push("Convert string to number using Number() or parseInt()");
      if (value && !isNaN(Number(value))) {
        suggestions.push(
          `Suggested conversion: Number("${value}") = ${Number(value)}`
        );
      }
    } else if (expectedType === "string" && actualType !== "string") {
      suggestions.push("Convert value to string using String() or .toString()");
    } else if (expectedType === "boolean") {
      suggestions.push("Convert to boolean using Boolean() or !! operator");
      suggestions.push(`Note: Boolean("${value}") = ${Boolean(value)}`);
    } else if (expectedType === "array" && actualType === "object") {
      suggestions.push("Wrap object in array: [value]");
    } else if (expectedType === "object" && actualType === "array") {
      suggestions.push("Arrays are not plain objects in this context");
      suggestions.push("Use a plain object instead: { key: value }");
    }

    suggestions.push(`Current type: ${actualType}`);
    suggestions.push(`Expected type: ${expectedType}`);

    return suggestions;
  }

  /**
   * Gets the type of a value using enhanced type detection.
   *
   * @param value - Value to check
   * @returns Type name
   *
   * @private
   */
  private getValueType(value: any): ValidationType {
    // Check for null first (typeof null === "object")
    if (value === null) {
      return "null";
    }

    // Check for undefined
    if (value === undefined) {
      return "undefined";
    }

    // Check for array (before generic object check)
    if (Array.isArray(value)) {
      return "array";
    }

    // Get basic type
    const basicType = typeof value;

    // Check for NaN (typeof NaN === "number")
    if (basicType === "number" && isNaN(value)) {
      return "number"; // Still return number, but could be flagged separately
    }

    // Return basic type for primitives and functions
    if (
      basicType === "string" ||
      basicType === "number" ||
      basicType === "boolean" ||
      basicType === "function"
    ) {
      return basicType as ValidationType;
    }

    // Everything else is a plain object
    return "object";
  }

  /**
   * Helper method to check if a value can be converted to the expected type.
   *
   * @param value - Value to check
   * @param expectedType - Expected type
   * @returns True if conversion is possible
   *
   * @public
   */
  static canConvert(value: any, expectedType: ValidationType): boolean {
    if (expectedType === "string") {
      return true; // Everything can be converted to string
    }

    if (expectedType === "number") {
      return !isNaN(Number(value));
    }

    if (expectedType === "boolean") {
      return true; // Everything has a boolean representation
    }

    // Other types cannot be easily converted
    return false;
  }
}
