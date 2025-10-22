/**
 * @fileoverview Variable interpolation strategy (fallback).
 *
 * @remarks
 * Handles regular {{variable}} or {{object.path}} expressions
 * by delegating to the variable resolver from context
 *
 * @packageDocumentation
 */

import {
  InterpolationStrategy,
  InterpolationStrategyContext,
  InterpolationResult,
} from "../interpolation-strategy.interface";

/**
 * Strategy for resolving regular scoped variables
 *
 * @remarks
 * Fallback strategy that handles any expression not matched by other strategies.
 * Delegates resolution to the variableResolver from context.
 *
 * Examples:
 * - {{username}}
 * - {{user.profile.name}}
 * - {{auth-flow.token}} (exported global variable)
 *
 * Priority: 100 (lowest - fallback for anything not handled by specific strategies)
 *
 * @example
 * ```typescript
 * const strategy = new VariableStrategy();
 * const result = strategy.resolve('username', context);
 * // Returns value from context.variableResolver('username')
 * ```
 *
 * @public
 */
export class VariableStrategy implements InterpolationStrategy {
  readonly name = "Variable";
  readonly priority = 100;

  canHandle(expression: string): boolean {
    // Always return true as this is the fallback strategy
    return true;
  }

  resolve(
    expression: string,
    context: InterpolationStrategyContext
  ): InterpolationResult {
    try {
      const value = context.variableResolver(expression);

      if (context.debug && value !== undefined) {
        console.debug(`[${this.name}] Resolved ${expression} = ${value}`);
      }

      return {
        canHandle: true,
        success: value !== undefined,
        value,
      };
    } catch (error) {
      return {
        canHandle: true,
        success: false,
        error: `Failed to resolve variable: ${error}`,
      };
    }
  }
}
