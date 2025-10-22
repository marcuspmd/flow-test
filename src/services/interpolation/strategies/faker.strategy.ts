/**
 * @fileoverview Faker.js interpolation strategy.
 *
 * @remarks
 * Handles {{$faker.category.method}} and {{faker.category.method}} expressions
 *
 * @packageDocumentation
 */

import {
  InterpolationStrategy,
  InterpolationStrategyContext,
  InterpolationResult,
} from "../interpolation-strategy.interface";
import { fakerService } from "../../faker.service";

/**
 * Strategy for resolving Faker.js expressions
 *
 * @remarks
 * Handles expressions like {{$faker.person.firstName}} or {{faker.internet.email}}
 * Priority: 20 (high - should override variables but not env)
 *
 * @example
 * ```typescript
 * const strategy = new FakerStrategy();
 * const result = strategy.resolve('$faker.person.firstName', context);
 * // Returns generated fake first name
 * ```
 *
 * @public
 */
export class FakerStrategy implements InterpolationStrategy {
  readonly name = "Faker";
  readonly priority = 20;

  canHandle(expression: string): boolean {
    return expression.startsWith("$faker.") || expression.startsWith("faker.");
  }

  resolve(
    expression: string,
    context: InterpolationStrategyContext
  ): InterpolationResult {
    if (!this.canHandle(expression)) {
      return { canHandle: false, success: false };
    }

    try {
      // Normalize: remove "$" prefix if present
      const fakerExpr = expression.startsWith("$faker.")
        ? expression.substring(1)
        : expression;

      const value = fakerService.parseFakerExpression(fakerExpr);

      if (context.debug) {
        console.debug(`[${this.name}] Generated ${fakerExpr} = ${value}`);
      }

      return {
        canHandle: true,
        success: true,
        value,
      };
    } catch (error) {
      return {
        canHandle: true,
        success: false,
        error: `Failed to resolve Faker expression: ${error}`,
      };
    }
  }
}
