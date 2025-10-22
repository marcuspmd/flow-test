/**
 * @fileoverview Validation result types and helpers.
 *
 * @remarks
 * Defines standardized result structures for validation operations,
 * supporting both single and composite validation results with
 * detailed error reporting and severity levels.
 *
 * @packageDocumentation
 */

/**
 * Severity level for validation messages.
 *
 * @remarks
 * - **error**: Validation failed, blocks execution
 * - **warning**: Validation concern, execution continues
 * - **info**: Informational message, no impact
 *
 * @public
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Result of a single validation operation.
 *
 * @remarks
 * Provides comprehensive information about validation outcome including
 * success status, error messages, severity, and metadata for debugging.
 *
 * @example Validation success
 * ```typescript
 * const result: ValidationResult = {
 *   valid: true,
 *   field: "email",
 *   validatorName: "pattern",
 *   value: "user@example.com"
 * };
 * ```
 *
 * @example Validation failure
 * ```typescript
 * const result: ValidationResult = {
 *   valid: false,
 *   field: "password",
 *   validatorName: "min_length",
 *   value: "123",
 *   message: "Password must be at least 8 characters",
 *   severity: "error",
 *   expected: 8,
 *   actual: 3
 * };
 * ```
 *
 * @public
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Name of the field being validated */
  field: string;

  /** Name of the validator that produced this result */
  validatorName: string;

  /** The value that was validated */
  value: any;

  /** Human-readable error/warning message (when valid is false) */
  message?: string;

  /** Severity of the validation issue */
  severity?: ValidationSeverity;

  /** Expected value or constraint */
  expected?: any;

  /** Actual value that was validated */
  actual?: any;

  /** Additional metadata about the validation */
  metadata?: Record<string, any>;
}

/**
 * Aggregated results from multiple validations.
 *
 * @remarks
 * Used when multiple validators are applied to a single value or when
 * validating multiple fields. Provides aggregate status and individual results.
 *
 * @example Multiple validations
 * ```typescript
 * const results: ValidationResultSet = {
 *   valid: false,
 *   field: "email",
 *   results: [
 *     { valid: true, field: "email", validatorName: "required", value: "test" },
 *     { valid: false, field: "email", validatorName: "pattern", value: "test",
 *       message: "Invalid email format" }
 *   ],
 *   errors: ["Invalid email format"],
 *   warnings: []
 * };
 * ```
 *
 * @public
 */
export interface ValidationResultSet {
  /** Overall validation status (false if any validation failed) */
  valid: boolean;

  /** Field name (for single-field validation) */
  field?: string;

  /** Individual validation results */
  results: ValidationResult[];

  /** All error messages from failed validations */
  errors: string[];

  /** All warning messages from validations */
  warnings: string[];

  /** Additional context about the validation set */
  metadata?: Record<string, any>;
}

/**
 * Helper functions for working with validation results.
 *
 * @public
 */
export class ValidationResultHelper {
  /**
   * Creates a successful validation result.
   *
   * @param field - Field name
   * @param validatorName - Validator identifier
   * @param value - Validated value
   * @returns Validation result indicating success
   */
  static success(
    field: string,
    validatorName: string,
    value: any
  ): ValidationResult {
    return {
      valid: true,
      field,
      validatorName,
      value,
    };
  }

  /**
   * Creates a failed validation result.
   *
   * @param field - Field name
   * @param validatorName - Validator identifier
   * @param value - Value that failed validation
   * @param message - Error message
   * @param severity - Severity level (defaults to "error")
   * @param expected - Expected value/constraint
   * @param actual - Actual value
   * @returns Validation result indicating failure
   */
  static failure(
    field: string,
    validatorName: string,
    value: any,
    message: string,
    severity: ValidationSeverity = "error",
    expected?: any,
    actual?: any
  ): ValidationResult {
    return {
      valid: false,
      field,
      validatorName,
      value,
      message,
      severity,
      expected,
      actual,
    };
  }

  /**
   * Aggregates multiple validation results into a result set.
   *
   * @param field - Field name
   * @param results - Individual validation results
   * @returns Aggregated validation result set
   *
   * @example
   * ```typescript
   * const results = [
   *   ValidationResultHelper.success("email", "required", "test@example.com"),
   *   ValidationResultHelper.failure("email", "pattern", "test@example.com",
   *     "Invalid domain")
   * ];
   *
   * const resultSet = ValidationResultHelper.aggregate("email", results);
   * console.log(resultSet.valid); // false
   * console.log(resultSet.errors); // ["Invalid domain"]
   * ```
   */
  static aggregate(
    field: string,
    results: ValidationResult[]
  ): ValidationResultSet {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const result of results) {
      if (!result.valid && result.message) {
        if (result.severity === "warning") {
          warnings.push(result.message);
        } else {
          errors.push(result.message);
        }
      }
    }

    return {
      valid: results.every((r) => r.valid || r.severity === "warning"),
      field,
      results,
      errors,
      warnings,
    };
  }

  /**
   * Checks if any validation in the set has errors (not warnings).
   *
   * @param resultSet - Validation result set
   * @returns True if there are error-level failures
   */
  static hasErrors(resultSet: ValidationResultSet): boolean {
    return resultSet.errors.length > 0;
  }

  /**
   * Checks if any validation in the set has warnings.
   *
   * @param resultSet - Validation result set
   * @returns True if there are warnings
   */
  static hasWarnings(resultSet: ValidationResultSet): boolean {
    return resultSet.warnings.length > 0;
  }

  /**
   * Filters validation results by severity.
   *
   * @param results - Validation results to filter
   * @param severity - Severity level to filter by
   * @returns Filtered validation results
   */
  static filterBySeverity(
    results: ValidationResult[],
    severity: ValidationSeverity
  ): ValidationResult[] {
    return results.filter((r) => r.severity === severity);
  }

  /**
   * Gets all failed validations (valid: false).
   *
   * @param results - Validation results
   * @returns Failed validation results
   */
  static getFailures(results: ValidationResult[]): ValidationResult[] {
    return results.filter((r) => !r.valid);
  }

  /**
   * Formats a validation result as a human-readable string.
   *
   * @param result - Validation result to format
   * @returns Formatted string representation
   */
  static format(result: ValidationResult): string {
    if (result.valid) {
      return `✅ ${result.field}: ${result.validatorName} passed`;
    }

    const severityIcon = result.severity === "warning" ? "⚠️" : "❌";
    return `${severityIcon} ${result.field}: ${
      result.message || "Validation failed"
    }`;
  }

  /**
   * Formats a validation result set as a human-readable string.
   *
   * @param resultSet - Validation result set to format
   * @returns Formatted string representation
   */
  static formatSet(resultSet: ValidationResultSet): string {
    const lines: string[] = [];

    if (resultSet.valid) {
      lines.push(`✅ All validations passed for ${resultSet.field || "field"}`);
    } else {
      lines.push(`❌ Validation failed for ${resultSet.field || "field"}`);
    }

    if (resultSet.errors.length > 0) {
      lines.push("  Errors:");
      resultSet.errors.forEach((err) => lines.push(`    - ${err}`));
    }

    if (resultSet.warnings.length > 0) {
      lines.push("  Warnings:");
      resultSet.warnings.forEach((warn) => lines.push(`    - ${warn}`));
    }

    return lines.join("\n");
  }
}
