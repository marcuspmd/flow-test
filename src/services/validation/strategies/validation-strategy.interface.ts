/**
 * @fileoverview Strategy pattern interface for validation operations.
 *
 * @remarks
 * Defines the contract for all validation strategies, enabling the Open/Closed
 * Principle - new validation types can be added without modifying existing code.
 *
 * Each validation strategy implements a specific validation rule (min_length,
 * pattern, required, etc.) following the Strategy Pattern.
 *
 * @packageDocumentation
 */

import type { ValidationContext } from "../validation-context";
import type { ValidationResult } from "../validation-result";

/**
 * Strategy interface for validation operations.
 *
 * @remarks
 * Each strategy implements a specific validation rule following the Strategy Pattern.
 * This enables:
 * - **Easy testing**: Each strategy can be tested in isolation
 * - **Easy extension**: New validation rules can be added as new strategies
 * - **Single Responsibility**: Each strategy focuses on one validation type
 * - **Reusability**: Strategies can be composed and reused across different contexts
 *
 * **Implementation Guidelines:**
 * 1. Each strategy should be stateless and pure (same input → same output)
 * 2. Strategies should not throw exceptions - return ValidationResult with valid: false
 * 3. Provide clear, user-friendly error messages
 * 4. Handle edge cases gracefully (null, undefined, wrong types)
 * 5. Use context.variables for dynamic constraint resolution
 *
 * @example Implementing a custom strategy
 * ```typescript
 * export class CustomLengthStrategy implements ValidationStrategy {
 *   readonly name = "custom_length";
 *
 *   canHandle(rule: any): boolean {
 *     return rule.custom_length !== undefined;
 *   }
 *
 *   validate(context: ValidationContext): ValidationResult {
 *     const { field, value, rule } = context;
 *     const expectedLength = rule.custom_length;
 *
 *     if (typeof value !== 'string') {
 *       return ValidationResultHelper.failure(
 *         field, this.name, value,
 *         "Value must be a string"
 *       );
 *     }
 *
 *     const actualLength = value.length;
 *     const valid = actualLength === expectedLength;
 *
 *     return valid
 *       ? ValidationResultHelper.success(field, this.name, value)
 *       : ValidationResultHelper.failure(
 *           field, this.name, value,
 *           `Length must be exactly ${expectedLength}`,
 *           "error",
 *           expectedLength,
 *           actualLength
 *         );
 *   }
 * }
 * ```
 *
 * @public
 */
export interface ValidationStrategy {
  /**
   * Unique identifier for the strategy.
   *
   * @remarks
   * Should match the validation rule name (e.g., "min_length", "pattern", "required").
   * Used for logging, debugging, and result tracking.
   *
   * @example
   * ```typescript
   * readonly name = "min_length";
   * readonly name = "email_format";
   * readonly name = "custom_expression";
   * ```
   */
  readonly name: string;

  /**
   * Priority level for strategy selection when multiple strategies match.
   *
   * @remarks
   * Higher priority strategies are tried first. Default is 0.
   * Use negative values for low priority, positive for high priority.
   *
   * **Priority Guidelines:**
   * - **100+**: Critical validators (required, type checking)
   * - **50-99**: High priority (format validators, pattern matching)
   * - **0-49**: Normal priority (most validators)
   * - **Negative**: Low priority (fallback validators)
   *
   * @default 0
   */
  readonly priority?: number;

  /**
   * Determines if this strategy can handle the given validation rule.
   *
   * @param rule - The validation rule object from context
   * @returns True if this strategy can validate the rule
   *
   * @remarks
   * This method should be fast and simple - just check if the rule object
   * contains the expected property. No actual validation should happen here.
   *
   * @example
   * ```typescript
   * // For MinLengthStrategy
   * canHandle(rule) {
   *   return rule.min_length !== undefined || rule.minLength !== undefined;
   * }
   *
   * // For PatternStrategy
   * canHandle(rule) {
   *   return rule.pattern !== undefined || rule.regex !== undefined;
   * }
   *
   * // For RequiredStrategy
   * canHandle(rule) {
   *   return rule.required === true;
   * }
   * ```
   */
  canHandle(rule: any): boolean;

  /**
   * Validates the value according to the strategy's rule.
   *
   * @param context - Validation context containing value, rule, and metadata
   * @returns Validation result with success status and details
   *
   * @remarks
   * This method performs the actual validation logic. It should:
   * 1. Extract the value and rule from context
   * 2. Perform validation checks
   * 3. Return a ValidationResult (success or failure)
   * 4. Never throw exceptions - catch and return as failed validation
   * 5. Provide clear error messages for users
   *
   * **Error Message Best Practices:**
   * - Be specific: "Password must be at least 8 characters" (not "Invalid")
   * - Include expected value: "Expected: min 8, Got: 3"
   * - Be user-friendly: Avoid technical jargon
   * - Support i18n if needed (use message keys)
   *
   * @example Basic validation
   * ```typescript
   * validate(context: ValidationContext): ValidationResult {
   *   const { field, value, rule } = context;
   *   const minLength = rule.min_length || rule.minLength;
   *
   *   // Type check
   *   if (typeof value !== 'string' && !Array.isArray(value)) {
   *     return ValidationResultHelper.failure(
   *       field, this.name, value,
   *       "Value must be string or array"
   *     );
   *   }
   *
   *   // Validation logic
   *   const length = value.length;
   *   const valid = length >= minLength;
   *
   *   return valid
   *     ? ValidationResultHelper.success(field, this.name, value)
   *     : ValidationResultHelper.failure(
   *         field, this.name, value,
   *         `Must be at least ${minLength} characters`,
   *         "error",
   *         minLength,
   *         length
   *       );
   * }
   * ```
   *
   * @example Validation with variables
   * ```typescript
   * validate(context: ValidationContext): ValidationResult {
   *   const { field, value, rule, variables } = context;
   *   let expectedValue = rule.equals;
   *
   *   // Resolve variable references
   *   if (typeof expectedValue === 'string' && expectedValue.startsWith('{{')) {
   *     const varName = expectedValue.slice(2, -2);
   *     expectedValue = variables?.[varName];
   *   }
   *
   *   const valid = value === expectedValue;
   *
   *   return valid
   *     ? ValidationResultHelper.success(field, this.name, value)
   *     : ValidationResultHelper.failure(
   *         field, this.name, value,
   *         `Value must equal ${expectedValue}`,
   *         "error",
   *         expectedValue,
   *         value
   *       );
   * }
   * ```
   */
  validate(context: ValidationContext): ValidationResult;

  /**
   * Optional method to provide suggestions when validation fails.
   *
   * @param context - Validation context
   * @returns Array of suggestion messages
   *
   * @remarks
   * Helps users fix validation errors by providing actionable suggestions.
   * This is particularly useful for complex validations like regex patterns.
   *
   * @example
   * ```typescript
   * suggest(context: ValidationContext): string[] {
   *   const { value } = context;
   *
   *   if (typeof value !== 'string') {
   *     return ["Convert value to string"];
   *   }
   *
   *   if (value.length === 0) {
   *     return ["Provide a non-empty value"];
   *   }
   *
   *   return [
   *     "Check that value matches the required format",
   *     "Example: user@example.com"
   *   ];
   * }
   * ```
   */
  suggest?(context: ValidationContext): string[];
}

/**
 * Base abstract class for validation strategies.
 *
 * @remarks
 * Provides common functionality for validation strategies, reducing boilerplate
 * and ensuring consistent behavior across all validators.
 *
 * @public
 */
export abstract class BaseValidationStrategy implements ValidationStrategy {
  abstract readonly name: string;
  readonly priority: number = 0;

  abstract canHandle(rule: any): boolean;
  abstract validate(context: ValidationContext): ValidationResult;

  /**
   * Helper method to check if a value is null or undefined.
   */
  protected isNullOrUndefined(value: any): boolean {
    return value === null || value === undefined;
  }

  /**
   * Helper method to check if a value is empty.
   *
   * @remarks
   * Considers null, undefined, empty string, empty array, and empty object as empty.
   */
  protected isEmpty(value: any): boolean {
    if (this.isNullOrUndefined(value)) {
      return true;
    }

    if (typeof value === "string" || Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === "object") {
      return Object.keys(value).length === 0;
    }

    return false;
  }

  /**
   * Helper method to get the length of a value.
   *
   * @remarks
   * Handles strings, arrays, and objects. Returns 0 for other types.
   */
  protected getLength(value: any): number {
    if (typeof value === "string" || Array.isArray(value)) {
      return value.length;
    }

    if (typeof value === "object" && value !== null) {
      return Object.keys(value).length;
    }

    return 0;
  }

  /**
   * Helper method to resolve variable references in constraints.
   *
   * @remarks
   * Resolves `{{variable_name}}` patterns using context.variables.
   */
  protected resolveVariable(
    constraint: any,
    variables?: Record<string, any>
  ): any {
    if (typeof constraint === "string" && constraint.match(/^\{\{.*\}\}$/)) {
      const varName = constraint.slice(2, -2).trim();
      return variables?.[varName];
    }

    return constraint;
  }
}
