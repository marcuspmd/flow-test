/**
 * @fileoverview Service responsible for evaluating computed expressions tied to
 * interactive inputs and runtime variable reevaluation.
 */

import { getLogger } from "./logger.service";
import {
  javascriptService,
  JavaScriptExecutionContext,
} from "./javascript.service";

/**
 * Execution context supplied to {@link ComputedService} evaluators.
 *
 * @remarks
 * Callers populate the context with runtime variables, captured values, and
 * optional metadata so that computed expressions can behave deterministically.
 *
 * @public
 */
export interface ComputedEvaluationContext {
  /** Current variable snapshot available for evaluation */
  variables: Record<string, any>;
  /** Optional captured variables from the current step */
  captured?: Record<string, any>;
  /** Optional request metadata */
  request?: JavaScriptExecutionContext["request"];
  /** Optional response metadata */
  response?: JavaScriptExecutionContext["response"];
  /** Input metadata when evaluation is triggered by interactive input */
  input?: {
    variable: string;
    value: any;
    used_default?: boolean;
    validation_passed?: boolean;
  };
  /** Additional contextual data injected by callers */
  extras?: Record<string, any>;
}

/**
 * Utility responsible for evaluating JavaScript-based computed expressions.
 *
 * @remarks
 * The service wraps the shared {@link javascriptService} to provide a typed
 * API focused on interactive inputs and dynamic variables.
 *
 * @example Evaluate an expression with request metadata
 * ```typescript
 * const computed = new ComputedService();
 * const value = computed.evaluateExpression("variables.count + 1", {
 *   variables: { count: 2 },
 * });
 * // value === 3
 * ```
 *
 * @public
 */
export class ComputedService {
  private logger = getLogger();

  /**
   * Creates a new {@link ComputedService} instance.
   */
  constructor() {}

  /**
   * Evaluates a single JavaScript expression.
   *
   * @param expression - JavaScript expression to evaluate.
   * @param context - Execution context injected into the evaluation scope.
   * @returns The computed value, or `undefined` when the expression is empty.
   * @throws Error if expression evaluation fails.
   */
  evaluateExpression(
    expression: string,
    context: ComputedEvaluationContext
  ): any {
    if (!expression || typeof expression !== "string") {
      return undefined;
    }

    const jsContext: JavaScriptExecutionContext = {
      variables: this.buildVariablesContext(context),
      captured: context.captured,
      request: context.request,
      response: context.response,
      utils: {
        Date,
        Math,
        JSON,
      },
    };

    try {
      const result = javascriptService.executeExpression(
        expression,
        jsContext,
        false
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Computed expression evaluation failed: ${expression} -> ${error}`
      );
      throw error;
    }
  }

  /**
   * Evaluates multiple expressions in batch using the same context.
   *
   * @param expressions - Map of variable names to JavaScript expressions.
   * @param context - Context shared across all evaluations.
   * @returns Object containing the evaluated results keyed by expression name.
   */
  evaluateExpressions(
    expressions: Record<string, string>,
    context: ComputedEvaluationContext
  ): Record<string, any> {
    const results: Record<string, any> = {};
    for (const [name, expression] of Object.entries(expressions)) {
      results[name] = this.evaluateExpression(expression, context);
    }
    return results;
  }

  private buildVariablesContext(
    context: ComputedEvaluationContext
  ): Record<string, any> {
    const variables: Record<string, any> = {
      ...(context.variables || {}),
    };

    if (context.input) {
      variables.__input = context.input;
      variables.__input_value = context.input.value;
      variables.__input_variable = context.input.variable;
    }

    if (context.extras) {
      Object.assign(variables, context.extras);
    }

    return variables;
  }
}
