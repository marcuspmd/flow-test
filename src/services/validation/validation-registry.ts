/**
 * @fileoverview Registry for managing validation strategies.
 *
 * @remarks
 * Central registry that maintains all available validation strategies and
 * provides strategy selection logic based on validation rules. Follows the
 * Strategy Pattern with automatic strategy selection.
 *
 * @packageDocumentation
 */

import type { ValidationStrategy } from "./strategies/validation-strategy.interface";
import type { ValidationContext } from "./validation-context";
import type {
  ValidationResult,
  ValidationResultSet,
} from "./validation-result";
import { ValidationResultHelper } from "./validation-result";
import { LoggerService } from "../logger.service";

/**
 * Module-level logger instance for validation registry
 */
const logger = new LoggerService();

/**
 * Registry for managing and selecting validation strategies.
 *
 * @remarks
 * The ValidationRegistry maintains a collection of validation strategies and
 * provides methods to:
 * - Register new validation strategies
 * - Select appropriate strategies based on validation rules
 * - Execute single or multiple validations
 * - Validate complex rule sets with composition (AND/OR logic)
 *
 * **Design Principles:**
 * - **Single Responsibility**: Only manages strategy registration and selection
 * - **Open/Closed**: New strategies can be added without modifying registry
 * - **Dependency Inversion**: Depends on abstractions (ValidationStrategy interface)
 *
 * @example Basic usage
 * ```typescript
 * const registry = new ValidationRegistry();
 *
 * // Register strategies
 * registry.register(new MinLengthStrategy());
 * registry.register(new PatternStrategy());
 *
 * // Execute validation
 * const context = {
 *   field: "password",
 *   value: "abc",
 *   rule: { min_length: 8 }
 * };
 *
 * const result = registry.validate(context);
 * console.log(result.valid); // false
 * console.log(result.message); // "Must be at least 8 characters"
 * ```
 *
 * @public
 */
export class ValidationRegistry {
  private strategies: ValidationStrategy[] = [];
  private logger = logger; // Use module-level logger

  /**
   * Registers a new validation strategy.
   *
   * @param strategy - Strategy to register
   *
   * @remarks
   * Strategies are stored in priority order (highest priority first).
   * If a strategy with the same name already exists, it will be replaced.
   *
   * @example
   * ```typescript
   * registry.register(new MinLengthStrategy());
   * registry.register(new CustomStrategy(), 100); // High priority
   * ```
   */
  register(strategy: ValidationStrategy): void {
    // Remove existing strategy with same name
    this.strategies = this.strategies.filter((s) => s.name !== strategy.name);

    // Add strategy
    this.strategies.push(strategy);

    // Sort by priority (highest first)
    this.strategies.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    logger.debug(
      `Registered validation strategy: ${strategy.name} (priority: ${
        strategy.priority ?? 0
      })`
    );
  }

  /**
   * Registers multiple strategies at once.
   *
   * @param strategies - Array of strategies to register
   *
   * @example
   * ```typescript
   * registry.registerMany([
   *   new MinLengthStrategy(),
   *   new MaxLengthStrategy(),
   *   new PatternStrategy()
   * ]);
   * ```
   */
  registerMany(strategies: ValidationStrategy[]): void {
    for (const strategy of strategies) {
      this.register(strategy);
    }
  }

  /**
   * Finds a strategy that can handle the given rule.
   *
   * @param rule - Validation rule to match
   * @returns Matching strategy or undefined if none found
   *
   * @remarks
   * Strategies are checked in priority order. The first matching strategy is returned.
   *
   * @example
   * ```typescript
   * const strategy = registry.findStrategy({ min_length: 5 });
   * // Returns MinLengthStrategy
   * ```
   */
  findStrategy(rule: any): ValidationStrategy | undefined {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(rule)) {
        return strategy;
      }
    }

    return undefined;
  }

  /**
   * Finds all strategies that can handle the given rule.
   *
   * @param rule - Validation rule to match
   * @returns Array of matching strategies (in priority order)
   *
   * @remarks
   * Useful when multiple validators need to run for a single rule
   * (e.g., type checking + format validation).
   *
   * @example
   * ```typescript
   * const strategies = registry.findAllStrategies({
   *   required: true,
   *   min_length: 5,
   *   pattern: "^[a-z]+$"
   * });
   * // Returns [RequiredStrategy, MinLengthStrategy, PatternStrategy]
   * ```
   */
  findAllStrategies(rule: any): ValidationStrategy[] {
    return this.strategies.filter((strategy) => strategy.canHandle(rule));
  }

  /**
   * Validates a value using a single strategy.
   *
   * @param context - Validation context
   * @returns Validation result
   *
   * @remarks
   * Automatically selects the appropriate strategy based on context.rule.
   * If no matching strategy is found, returns a failure result.
   *
   * @example
   * ```typescript
   * const result = registry.validate({
   *   field: "email",
   *   value: "user@example.com",
   *   rule: { pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
   * });
   * ```
   */
  validate(context: ValidationContext): ValidationResult {
    const strategy = this.findStrategy(context.rule);

    if (!strategy) {
      this.logger.warn(
        `No validation strategy found for rule: ${JSON.stringify(context.rule)}`
      );
      return ValidationResultHelper.failure(
        context.field,
        "unknown",
        context.value,
        "No validator found for this rule",
        "warning"
      );
    }

    try {
      return strategy.validate(context);
    } catch (error: any) {
      this.logger.error(
        `Validation strategy ${strategy.name} threw error: ${error.message}`
      );
      return ValidationResultHelper.failure(
        context.field,
        strategy.name,
        context.value,
        `Validation error: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Validates a value using all applicable strategies.
   *
   * @param context - Validation context
   * @returns Aggregated validation result set
   *
   * @remarks
   * Runs all strategies that can handle the rule and aggregates results.
   * Useful when multiple validation checks need to be performed.
   *
   * @example
   * ```typescript
   * const resultSet = registry.validateAll({
   *   field: "password",
   *   value: "Pass123",
   *   rule: {
   *     required: true,
   *     min_length: 8,
   *     pattern: "^(?=.*[A-Z])(?=.*[0-9]).+$"
   *   }
   * });
   *
   * console.log(resultSet.valid); // false (too short)
   * console.log(resultSet.errors); // ["Must be at least 8 characters"]
   * ```
   */
  validateAll(context: ValidationContext): ValidationResultSet {
    const strategies = this.findAllStrategies(context.rule);

    if (strategies.length === 0) {
      this.logger.warn(
        `No validation strategies found for rule: ${JSON.stringify(
          context.rule
        )}`
      );
      return {
        valid: true,
        field: context.field,
        results: [],
        errors: [],
        warnings: ["No validators found for this rule"],
      };
    }

    const results: ValidationResult[] = [];

    for (const strategy of strategies) {
      try {
        const result = strategy.validate(context);
        results.push(result);
      } catch (error: any) {
        this.logger.error(
          `Validation strategy ${strategy.name} threw error: ${error.message}`
        );
        results.push(
          ValidationResultHelper.failure(
            context.field,
            strategy.name,
            context.value,
            `Validation error: ${error.message}`,
            "error"
          )
        );
      }
    }

    return ValidationResultHelper.aggregate(context.field, results);
  }

  /**
   * Validates multiple fields with their respective rules.
   *
   * @param validations - Map of field names to validation contexts
   * @returns Map of field names to validation results
   *
   * @remarks
   * Convenient method for validating multiple fields at once.
   *
   * @example
   * ```typescript
   * const results = registry.validateMany({
   *   email: {
   *     field: "email",
   *     value: "user@example.com",
   *     rule: { pattern: "^[\\w-\\.]+@" }
   *   },
   *   password: {
   *     field: "password",
   *     value: "Pass123",
   *     rule: { min_length: 8 }
   *   }
   * });
   *
   * console.log(results.email.valid); // true
   * console.log(results.password.valid); // false
   * ```
   */
  validateMany(
    validations: Record<string, ValidationContext>
  ): Record<string, ValidationResultSet> {
    const results: Record<string, ValidationResultSet> = {};

    for (const [field, context] of Object.entries(validations)) {
      results[field] = this.validateAll(context);
    }

    return results;
  }

  /**
   * Gets all registered strategy names.
   *
   * @returns Array of strategy names
   *
   * @example
   * ```typescript
   * const names = registry.getStrategyNames();
   * console.log(names); // ["required", "min_length", "pattern", ...]
   * ```
   */
  getStrategyNames(): string[] {
    return this.strategies.map((s) => s.name);
  }

  /**
   * Gets a strategy by name.
   *
   * @param name - Strategy name
   * @returns Strategy instance or undefined if not found
   *
   * @example
   * ```typescript
   * const strategy = registry.getStrategy("min_length");
   * ```
   */
  getStrategy(name: string): ValidationStrategy | undefined {
    return this.strategies.find((s) => s.name === name);
  }

  /**
   * Checks if a strategy is registered.
   *
   * @param name - Strategy name
   * @returns True if strategy is registered
   *
   * @example
   * ```typescript
   * if (registry.hasStrategy("custom_validator")) {
   *   // Use custom validator
   * }
   * ```
   */
  hasStrategy(name: string): boolean {
    return this.strategies.some((s) => s.name === name);
  }

  /**
   * Clears all registered strategies.
   *
   * @remarks
   * Primarily useful for testing. Use with caution in production.
   */
  clear(): void {
    this.strategies = [];
    this.logger.debug("Cleared all validation strategies");
  }

  /**
   * Gets the number of registered strategies.
   *
   * @returns Strategy count
   */
  count(): number {
    return this.strategies.length;
  }
}
