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
import type { ILogger } from "../../../interfaces/services/ILogger";

/**
 * No-op logger for strategies (avoids test pollution)
 */
const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
const noopLogger: ILogger = {
  debug: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.debug(msg, ...args);
  },
  info: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.log(msg, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.warn(msg, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.error(msg, ...args);
  },
  setLogLevel: () => {},
  getLogLevel: () => "info",
};

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

  constructor(private logger: ILogger = noopLogger) {}

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
        this.logger.debug(`[${this.name}] Generated ${fakerExpr} = ${value}`);
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
