/**
 * @fileoverview Strategy pattern interface for assertion validation.
 *
 * @remarks
 * Defines the contract for all assertion validation strategies, enabling
 * the Open/Closed Principle - new assertion operators can be added without
 * modifying existing code.
 *
 * @packageDocumentation
 */

import { AssertionResult } from "../../../types/config.types";

/**
 * Context information for assertion validation.
 *
 * @remarks
 * Provides all necessary data for strategies to perform validation
 * without direct coupling to the response structure.
 *
 * @public
 */
export interface AssertionContext {
  /** The field being validated (e.g., "body.user.id") */
  fieldName: string;

  /** The actual value from the response */
  actualValue: any;

  /** The expected value or configuration from the assertion */
  expectedValue: any;
}

/**
 * Strategy interface for assertion validation.
 *
 * @remarks
 * Each strategy implements a specific assertion operator (equals, contains, regex, etc.)
 * following the Strategy Pattern. This enables:
 * - **Easy testing**: Each strategy can be tested in isolation
 * - **Easy extension**: New operators can be added as new strategies
 * - **Single Responsibility**: Each strategy focuses on one validation type
 * - **Reusability**: Strategies can be composed and reused
 *
 * @example Implementing a custom strategy
 * ```typescript
 * export class CustomStrategy implements AssertionStrategy {
 *   readonly name = "custom_check";
 *
 *   canHandle(checks: any): boolean {
 *     return checks.custom_check !== undefined;
 *   }
 *
 *   validate(context: AssertionContext): AssertionResult {
 *     // Implementation
 *     return {
 *       field: context.fieldName,
 *       expected: context.expectedValue,
 *       actual: context.actualValue,
 *       passed: true,
 *       message: "OK"
 *     };
 *   }
 * }
 * ```
 *
 * @public
 */
export interface AssertionStrategy {
  /**
   * Unique identifier for the strategy.
   * Should match the assertion operator name (e.g., "equals", "contains").
   */
  readonly name: string;

  /**
   * Determines if this strategy can handle the given assertion checks.
   *
   * @param checks - The assertion checks object from YAML
   * @returns True if this strategy can handle these checks
   *
   * @example
   * ```typescript
   * // For EqualsStrategy
   * canHandle({ equals: 200 }); // true
   * canHandle({ contains: "text" }); // false
   * ```
   */
  canHandle(checks: any): boolean;

  /**
   * Validates the assertion and returns the result(s).
   *
   * @param context - Validation context containing field name, actual and expected values
   * @returns Assertion result(s) with pass/fail status and details. Can return array for nested validations.
   *
   * @example
   * ```typescript
   * const result = strategy.validate({
   *   fieldName: "status_code",
   *   actualValue: 200,
   *   expectedValue: 200
   * });
   * // { field: "status_code", expected: 200, actual: 200, passed: true, message: "OK" }
   * ```
   */
  validate(context: AssertionContext): AssertionResult | AssertionResult[];
}
