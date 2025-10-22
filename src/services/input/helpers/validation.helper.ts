/**
 * @fileoverview Input validation helper functions
 *
 * Pure utility functions for validating user input values.
 * Supports various validation rules including:
 * - Required field validation
 * - String length validation (min/max)
 * - Pattern/regex validation
 * - Email and URL format validation
 * - Number range validation (min/max)
 * - Custom validation expressions
 * - Dynamic validation with JMESPath and JavaScript
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as jmespath from "jmespath";
import type { InputConfig } from "../../../types/engine.types";
import { javascriptService } from "../../javascript.service";

/**
 * Validation result containing validation status and messages
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Warning messages (non-blocking) */
  warnings?: string[];
}

/**
 * Validates input value against configuration rules.
 *
 * Performs comprehensive validation including:
 * - Required field check
 * - Type-specific validation (string length, email, URL, number ranges)
 * - Pattern/regex validation
 * - Custom validation expressions
 * - Dynamic validation rules
 *
 * @param value - Input value to validate
 * @param config - Input configuration with validation rules
 * @param variables - Context variables for dynamic validation
 * @returns Validation result with status and messages
 *
 * @example
 * ```typescript
 * const result = validateInput("john@example.com", {
 *   type: "email",
 *   required: true,
 *   variable: "email"
 * }, {});
 * // → { valid: true }
 * ```
 *
 * @example With validation error
 * ```typescript
 * const result = validateInput("abc", {
 *   type: "number",
 *   required: true,
 *   variable: "age",
 *   validation: { min: 18 }
 * }, {});
 * // → { valid: false, error: "Value must be at least 18" }
 * ```
 */
export function validateInput(
  value: any,
  config: InputConfig,
  variables: Record<string, any>
): ValidationResult {
  const validation = config.validation;
  const warnings: string[] = [];

  // Required check (always performed, regardless of validation config)
  if (
    config.required &&
    (value === undefined || value === null || value === "")
  ) {
    return { valid: false, error: "This field is required" };
  }

  // Type-specific validation (always performed for email and url types)
  if (typeof value === "string") {
    // Email validation
    if (config.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: "Invalid email format" };
      }
    }

    // URL validation
    if (config.type === "url") {
      try {
        new URL(value);
      } catch {
        return { valid: false, error: "Invalid URL format" };
      }
    }
  }

  // Return early if no additional validation config
  if (!validation) return { valid: true };

  // Type-specific validation with config
  if (typeof value === "string") {
    // Length validation
    if (validation.min_length && value.length < validation.min_length) {
      return {
        valid: false,
        error: `Minimum length is ${validation.min_length}`,
      };
    }
    if (validation.max_length && value.length > validation.max_length) {
      return {
        valid: false,
        error: `Maximum length is ${validation.max_length}`,
      };
    }

    // Pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          error: "Value does not match required pattern",
        };
      }
    }
  }

  // Number validation
  if (typeof value === "number") {
    const min =
      typeof validation.min === "string"
        ? parseFloat(validation.min)
        : validation.min;
    const max =
      typeof validation.max === "string"
        ? parseFloat(validation.max)
        : validation.max;

    if (min !== undefined && value < min) {
      return { valid: false, error: `Value must be at least ${min}` };
    }
    if (max !== undefined && value > max) {
      return { valid: false, error: `Value must be at most ${max}` };
    }
  }

  // Custom validation
  if (validation.custom_validation) {
    try {
      // Simple evaluation - could be enhanced with safer evaluation
      const evalFunction = new Function(
        "value",
        "variables",
        `return ${validation.custom_validation}`
      );
      const result = evalFunction(value, variables);
      if (!result) {
        return { valid: false, error: "Custom validation failed" };
      }
    } catch (error) {
      return { valid: false, error: "Custom validation error" };
    }
  }

  // Dynamic validation expressions
  if (validation.expressions && validation.expressions.length > 0) {
    for (const rule of validation.expressions) {
      const passed = evaluateValidationExpression(
        rule,
        value,
        config,
        variables
      );

      if (!passed) {
        const severity = rule.severity ?? "error";
        const message = rule.message || "Dynamic validation failed";

        if (severity === "warning") {
          warnings.push(message);
        } else {
          return { valid: false, error: message };
        }
      }
    }
  }

  return warnings.length > 0 ? { valid: true, warnings } : { valid: true };
}

/**
 * Evaluates a single validation expression rule.
 *
 * Supports two expression languages:
 * - **JMESPath**: Query-based validation over structured context
 * - **JavaScript**: Direct JavaScript expression evaluation
 *
 * @param rule - Validation expression rule
 * @param value - Input value to validate
 * @param config - Input configuration
 * @param variables - Context variables
 * @returns True if validation passes, false otherwise
 *
 * @example JMESPath validation
 * ```typescript
 * const passed = evaluateValidationExpression(
 *   {
 *     name: "Age check",
 *     expression: "value >= `18`",
 *     language: "jmespath"
 *   },
 *   25,
 *   config,
 *   {}
 * );
 * // → true
 * ```
 *
 * @example JavaScript validation
 * ```typescript
 * const passed = evaluateValidationExpression(
 *   {
 *     name: "Email domain check",
 *     expression: "__input_value.endsWith('@company.com')",
 *     language: "javascript"
 *   },
 *   "user@company.com",
 *   config,
 *   {}
 * );
 * // → true
 * ```
 */
export function evaluateValidationExpression(
  rule: any,
  value: any,
  config: InputConfig,
  variables: Record<string, any>
): boolean {
  const language = (rule.language || "javascript").toLowerCase();

  try {
    if (language === "jmespath") {
      const context = {
        value,
        input: {
          variable: config.variable,
          prompt: config.prompt,
          type: config.type,
        },
        variables,
      };
      return Boolean(jmespath.search(context, rule.expression));
    }

    // JavaScript evaluation
    const jsVariables = {
      ...variables,
      __input_value: value,
      __input_variable: config.variable,
      __input_prompt: config.prompt,
      __input_type: config.type,
    };

    const evaluation = javascriptService.executeExpression(
      rule.expression,
      {
        variables: jsVariables,
      },
      false
    );

    return Boolean(evaluation);
  } catch (error) {
    // On error, validation fails
    return false;
  }
}
