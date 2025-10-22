/**
 * @fileoverview Pattern (regex) validation strategy.
 *
 * @remarks
 * Validates that a string value matches a specified regular expression pattern.
 * Supports both `pattern` and `regex` property names for flexibility.
 *
 * @packageDocumentation
 */

import { ValidationResult } from "../validation-result";
import { ValidationResultHelper } from "../validation-result";
import { ValidationContext } from "../validation-context";
import { BaseValidationStrategy } from "./validation-strategy.interface";

/**
 * Strategy for pattern (regular expression) validation.
 *
 * @remarks
 * Validates that string values match a specified regular expression pattern.
 * This is commonly used for email validation, phone numbers, postal codes,
 * and any format-specific validation requirements.
 *
 * **Supported Rule Properties:**
 * - `pattern`: Regular expression string
 * - `regex`: Alternative property name
 *
 * **Supported Value Types:**
 * - `string`: Pattern matching applied
 * - `null/undefined`: Fails validation
 * - Other types: Converted to string before validation
 *
 * **Pattern Flags:**
 * - Default flags: None
 * - To use flags, provide pattern as `/pattern/flags` format
 *
 * @example YAML configuration
 * ```yaml
 * input:
 *   variable: "email"
 *   validation:
 *     pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
 *
 * input:
 *   variable: "phone"
 *   validation:
 *     regex: "^\\+?[1-9]\\d{1,14}$"  # E.164 format
 * ```
 *
 * @example TypeScript usage
 * ```typescript
 * const strategy = new PatternValidationStrategy();
 * const result = strategy.validate({
 *   field: "email",
 *   value: "user@example.com",
 *   rule: { pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
 * });
 * // result.valid = true
 * ```
 *
 * @public
 */
export class PatternValidationStrategy extends BaseValidationStrategy {
  readonly name = "pattern";
  readonly priority = 60; // High priority (format validation)

  /**
   * Checks if this strategy can handle the given rule.
   *
   * @param rule - Validation rule object
   * @returns True if rule contains pattern or regex
   */
  canHandle(rule: any): boolean {
    return rule.pattern !== undefined || rule.regex !== undefined;
  }

  /**
   * Validates pattern matching requirement.
   *
   * @param context - Validation context with value and rule
   * @returns Validation result with success status and details
   */
  validate(context: ValidationContext): ValidationResult {
    const { field, value, rule } = context;

    // Extract pattern (support both naming conventions)
    const patternStr = rule.pattern ?? rule.regex;

    // Validate pattern is a string
    if (typeof patternStr !== "string" || patternStr.length === 0) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        "Invalid pattern configuration: must be a non-empty string",
        "error",
        patternStr,
        typeof patternStr
      );
    }

    // Handle null/undefined
    if (this.isNullOrUndefined(value)) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        "Value is required for pattern validation",
        "error",
        patternStr,
        value
      );
    }

    // Convert value to string if needed
    const stringValue = typeof value === "string" ? value : String(value);

    // Parse and compile regex
    let regex: RegExp;
    try {
      // Check if pattern includes flags (format: /pattern/flags)
      const regexMatch = patternStr.match(/^\/(.+)\/([gimsuvy]*)$/);

      if (regexMatch) {
        // Extract pattern and flags
        const [, pattern, flags] = regexMatch;
        regex = new RegExp(pattern, flags);
      } else {
        // Use pattern as-is without flags
        regex = new RegExp(patternStr);
      }
    } catch (error: any) {
      return ValidationResultHelper.failure(
        field,
        this.name,
        value,
        `Invalid regular expression: ${error.message}`,
        "error",
        patternStr,
        "compilation error"
      );
    }

    // Test pattern
    const valid = regex.test(stringValue);

    return valid
      ? ValidationResultHelper.success(field, this.name, value)
      : ValidationResultHelper.failure(
          field,
          this.name,
          value,
          `Value does not match required pattern: ${patternStr}`,
          "error",
          patternStr,
          stringValue
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
    const patternStr = rule.pattern ?? rule.regex;
    const suggestions: string[] = [];

    if (this.isNullOrUndefined(value)) {
      suggestions.push("Provide a non-null value");
      return suggestions;
    }

    // Provide contextual suggestions based on common patterns
    if (patternStr.includes("@")) {
      suggestions.push("Ensure value is a valid email address");
      suggestions.push("Example: user@example.com");
    } else if (patternStr.includes("^\\+") || patternStr.includes("\\d")) {
      suggestions.push("Ensure value matches the phone number format");
      suggestions.push("Example: +1234567890");
    } else if (patternStr.includes("^[a-z") || patternStr.includes("^[A-Z")) {
      suggestions.push("Ensure value contains only allowed characters");
    } else if (patternStr.includes("\\d{")) {
      suggestions.push("Ensure value has the correct number of digits");
    } else {
      suggestions.push(`Check that value matches pattern: ${patternStr}`);
    }

    // General suggestion
    if (typeof value === "string") {
      suggestions.push(`Current value: "${value}"`);
    }

    return suggestions;
  }

  /**
   * Helper method to validate a pattern string without executing it.
   *
   * @param patternStr - Pattern string to validate
   * @returns True if pattern is valid regex
   *
   * @public
   */
  static isValidPattern(patternStr: string): boolean {
    try {
      // Check if pattern includes flags
      const regexMatch = patternStr.match(/^\/(.+)\/([gimsuvy]*)$/);

      if (regexMatch) {
        const [, pattern, flags] = regexMatch;
        new RegExp(pattern, flags);
      } else {
        new RegExp(patternStr);
      }

      return true;
    } catch {
      return false;
    }
  }
}
