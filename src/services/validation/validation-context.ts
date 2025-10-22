/**
 * @fileoverview Validation context for providing runtime information to validators.
 *
 * @remarks
 * The validation context provides all necessary information for validators to
 * perform their validation logic, including the value to validate, constraints,
 * and optional runtime context like variables and environment.
 *
 * @packageDocumentation
 */

/**
 * Context information for validation operations.
 *
 * @remarks
 * Provides validators with all necessary information to perform validation,
 * including the value to validate, validation rules, and optional runtime context.
 *
 * This context allows validators to be pure functions that depend only on their
 * input parameters, making them highly testable and composable.
 *
 * @example Basic validation context
 * ```typescript
 * const context: ValidationContext = {
 *   field: "email",
 *   value: "user@example.com",
 *   rule: {
 *     pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
 *   }
 * };
 * ```
 *
 * @example Context with variables
 * ```typescript
 * const context: ValidationContext = {
 *   field: "password_confirm",
 *   value: "MyPassword123",
 *   rule: {
 *     equals: "{{password}}"
 *   },
 *   variables: {
 *     password: "MyPassword123"
 *   }
 * };
 * ```
 *
 * @public
 */
export interface ValidationContext {
  /**
   * Name of the field being validated.
   *
   * @remarks
   * Used for error messages and result tracking.
   */
  field: string;

  /**
   * The value to be validated.
   *
   * @remarks
   * Can be any type - string, number, boolean, object, array, null, undefined.
   * Validators should handle type checking appropriately.
   */
  value: any;

  /**
   * Validation rule configuration.
   *
   * @remarks
   * Contains the constraints and parameters for validation.
   * Structure depends on the validator type.
   *
   * @example
   * ```typescript
   * // For pattern validator
   * rule: { pattern: "^[0-9]+$" }
   *
   * // For range validator
   * rule: { min: 1, max: 100 }
   *
   * // For custom validator
   * rule: { expression: "value.length > 5 && value.includes('@')" }
   * ```
   */
  rule: any;

  /**
   * Optional runtime variables for interpolation.
   *
   * @remarks
   * Used when validation rules reference variables (e.g., `{{variable_name}}`).
   * Validators can use these to resolve dynamic constraints.
   */
  variables?: Record<string, any>;

  /**
   * Optional parent object for nested field validation.
   *
   * @remarks
   * When validating a nested field (e.g., `user.email`), this contains
   * the parent object for context-aware validation.
   */
  parent?: any;

  /**
   * Optional metadata for validator-specific context.
   *
   * @remarks
   * Allows passing additional context information that specific validators
   * might need (e.g., current step index, suite name, etc.).
   */
  metadata?: Record<string, any>;

  /**
   * Optional original input configuration (for input validation).
   *
   * @remarks
   * Useful when validators need access to the full input configuration,
   * not just the validation rule.
   */
  inputConfig?: any;
}

/**
 * Builder for creating validation contexts with fluent API.
 *
 * @remarks
 * Provides a convenient way to construct validation contexts with optional
 * parameters using a builder pattern.
 *
 * @example
 * ```typescript
 * const context = ValidationContextBuilder
 *   .create("email", "user@example.com")
 *   .withRule({ pattern: "^[\\w-\\.]+@" })
 *   .withVariables({ domain: "example.com" })
 *   .build();
 * ```
 *
 * @public
 */
export class ValidationContextBuilder {
  private context: Partial<ValidationContext>;

  private constructor(field: string, value: any) {
    this.context = { field, value };
  }

  /**
   * Creates a new builder instance.
   *
   * @param field - Field name
   * @param value - Value to validate
   * @returns Builder instance
   */
  static create(field: string, value: any): ValidationContextBuilder {
    return new ValidationContextBuilder(field, value);
  }

  /**
   * Sets the validation rule.
   *
   * @param rule - Validation rule configuration
   * @returns Builder instance for chaining
   */
  withRule(rule: any): this {
    this.context.rule = rule;
    return this;
  }

  /**
   * Sets runtime variables.
   *
   * @param variables - Variable map
   * @returns Builder instance for chaining
   */
  withVariables(variables: Record<string, any>): this {
    this.context.variables = variables;
    return this;
  }

  /**
   * Sets parent object for nested validation.
   *
   * @param parent - Parent object
   * @returns Builder instance for chaining
   */
  withParent(parent: any): this {
    this.context.parent = parent;
    return this;
  }

  /**
   * Sets metadata.
   *
   * @param metadata - Metadata map
   * @returns Builder instance for chaining
   */
  withMetadata(metadata: Record<string, any>): this {
    this.context.metadata = metadata;
    return this;
  }

  /**
   * Sets input configuration.
   *
   * @param inputConfig - Input configuration object
   * @returns Builder instance for chaining
   */
  withInputConfig(inputConfig: any): this {
    this.context.inputConfig = inputConfig;
    return this;
  }

  /**
   * Builds and returns the validation context.
   *
   * @returns Complete validation context
   * @throws Error if required fields are missing
   */
  build(): ValidationContext {
    if (!this.context.rule) {
      throw new Error(
        `Validation rule is required for field: ${this.context.field}`
      );
    }

    return this.context as ValidationContext;
  }
}
