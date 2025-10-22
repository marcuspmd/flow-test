/**
 * @fileoverview JavaScript expression interpolation strategy.
 *
 * @remarks
 * Handles {{$js:expression}}, {{js:expression}}, and logical operators
 * Supports nested interpolation via preprocessing
 *
 * @packageDocumentation
 */

import {
  InterpolationStrategy,
  InterpolationStrategyContext,
  InterpolationResult,
  PreprocessStrategy,
} from "../interpolation-strategy.interface";
import {
  javascriptService,
  JavaScriptExecutionContext,
} from "../../javascript.service";

/**
 * Strategy for resolving JavaScript expressions
 *
 * @remarks
 * Handles expressions like:
 * - {{$js:Date.now()}}
 * - {{js:Math.random()}}
 * - {{$js.return someCode}}
 * - {{status > 200 && status < 300}} (logical operators)
 *
 * Supports nested variable interpolation:
 * - {{$js:Buffer.from('{{user}}:{{pass}}').toString('base64')}}
 *
 * Priority: 30 (medium - after env and faker, before regular variables)
 *
 * @example
 * ```typescript
 * const strategy = new JavaScriptStrategy();
 * const result = strategy.resolve('$js:Date.now()', context);
 * // Returns current timestamp
 * ```
 *
 * @public
 */
export class JavaScriptStrategy
  implements InterpolationStrategy, PreprocessStrategy
{
  readonly name = "JavaScript";
  readonly priority = 30;

  private readonly logicalOperatorPattern = /\|\||&&|[><=!]=?|\?|:/;

  canHandle(expression: string): boolean {
    return (
      expression.startsWith("$js:") ||
      expression.startsWith("js:") ||
      expression.startsWith("$js.") ||
      this.logicalOperatorPattern.test(expression)
    );
  }

  /**
   * Preprocesses JS expression to resolve nested {{variables}}
   *
   * @remarks
   * Only resolves regular variables and $env, NOT $faker or $js
   * to prevent infinite recursion.
   */
  preprocess(
    jsExpression: string,
    context: InterpolationStrategyContext
  ): string {
    return jsExpression.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
      const trimmedExpr = expr.trim();

      // Skip recursive Faker/JS to prevent infinite loops
      if (
        trimmedExpr.startsWith("$js:") ||
        trimmedExpr.startsWith("js:") ||
        trimmedExpr.startsWith("$js.") ||
        trimmedExpr.startsWith("$faker.") ||
        trimmedExpr.startsWith("faker.")
      ) {
        if (context.debug) {
          console.debug(
            `[${this.name}] Skipping nested Faker/JS: ${trimmedExpr}`
          );
        }
        return match; // Keep original
      }

      // Resolve env vars or regular variables
      let value: any;
      if (trimmedExpr.startsWith("$env.")) {
        const envVarName = trimmedExpr.substring(5);
        value = process.env[envVarName];
      } else {
        value = context.variableResolver(trimmedExpr);
      }

      if (value === undefined) {
        if (!context.suppressWarnings) {
          console.warn(
            `[${this.name}] Nested variable '${trimmedExpr}' not found`
          );
        }
        return match; // Keep original
      }

      return String(value);
    });
  }

  resolve(
    expression: string,
    context: InterpolationStrategyContext
  ): InterpolationResult {
    if (!this.canHandle(expression)) {
      return { canHandle: false, success: false };
    }

    try {
      let jsExpression: string;

      // Extract JS code
      if (expression.startsWith("$js:") || expression.startsWith("js:")) {
        jsExpression = expression.replace(/^\$?js:/, "").trim();
      } else if (expression.startsWith("$js.")) {
        jsExpression = expression.substring(4); // Remove "$js."
      } else {
        // Logical operators case
        jsExpression = expression;
      }

      // Preprocess: resolve nested {{variables}}
      if (context.debug) {
        console.debug(`[${this.name}] Before preprocess: ${jsExpression}`);
      }

      const preprocessed = this.preprocess(jsExpression, context);

      if (context.debug) {
        console.debug(`[${this.name}] After preprocess: ${preprocessed}`);
      }

      // Execute JavaScript
      const jsContext: JavaScriptExecutionContext = {
        ...context.javascriptContext,
        variables: context.javascriptContext?.variables ?? {},
      };

      const useCodeBlock = expression.startsWith("$js.");
      const value = javascriptService.executeExpression(
        preprocessed,
        jsContext,
        useCodeBlock
      );

      if (context.debug) {
        console.debug(`[${this.name}] Result: ${value}`);
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
        error: `Failed to execute JavaScript: ${error}`,
      };
    }
  }
}
