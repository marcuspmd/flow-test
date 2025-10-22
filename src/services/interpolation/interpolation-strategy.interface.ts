/**
 * @fileoverview Strategy pattern interfaces for variable interpolation.
 *
 * @remarks
 * Defines the contract for different interpolation strategies (Environment, Faker, JavaScript, etc.)
 * allowing extensibility and clean separation of concerns.
 *
 * @packageDocumentation
 */

import { JavaScriptExecutionContext } from "../javascript.service";

/**
 * Context provided to interpolation strategies
 *
 * @public
 */
export interface InterpolationStrategyContext {
  /** Function to resolve scoped variables */
  variableResolver: (path: string) => any;

  /** JavaScript execution context */
  javascriptContext?: JavaScriptExecutionContext;

  /** Whether to suppress warnings */
  suppressWarnings?: boolean;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result of an interpolation strategy evaluation
 *
 * @public
 */
export interface InterpolationResult {
  /** Whether this strategy can handle the expression */
  canHandle: boolean;

  /** Resolved value (undefined if cannot handle or error) */
  value?: any;

  /** Whether resolution was successful */
  success: boolean;

  /** Error message if resolution failed */
  error?: string;
}

/**
 * Base interface for interpolation strategies
 *
 * @remarks
 * Each strategy implements a specific type of interpolation:
 * - EnvironmentVariableStrategy: {{$env.VAR}}
 * - FakerStrategy: {{$faker.category.method}}
 * - JavaScriptStrategy: {{$js:expression}}
 * - VariableStrategy: {{variable}} or {{object.path}}
 *
 * Strategies are registered in order of priority and evaluated sequentially.
 *
 * @public
 */
export interface InterpolationStrategy {
  /**
   * Name of the strategy for debugging
   */
  readonly name: string;

  /**
   * Priority order (lower number = higher priority)
   * Default priorities:
   * - EnvVar: 10
   * - Faker: 20
   * - JavaScript: 30
   * - Variable: 100 (fallback)
   */
  readonly priority: number;

  /**
   * Checks if this strategy can handle the given expression
   *
   * @param expression - Expression to check (without {{ }})
   * @returns True if this strategy should handle the expression
   */
  canHandle(expression: string): boolean;

  /**
   * Resolves the expression to a value
   *
   * @param expression - Expression to resolve (without {{ }})
   * @param context - Context with resolvers and configuration
   * @returns Resolution result
   */
  resolve(
    expression: string,
    context: InterpolationStrategyContext
  ): InterpolationResult | Promise<InterpolationResult>;
}

/**
 * Strategy that preprocesses expressions before main resolution
 *
 * @remarks
 * Useful for nested interpolation within JavaScript expressions.
 * Example: {{$js:Buffer.from('{{user}}:{{pass}}')}}
 * The preprocessor resolves {{user}} and {{pass}} before JS execution.
 *
 * @public
 */
export interface PreprocessStrategy {
  /**
   * Preprocesses an expression, resolving nested variables
   *
   * @param expression - Expression to preprocess
   * @param context - Context with resolvers
   * @returns Preprocessed expression
   */
  preprocess(
    expression: string,
    context: InterpolationStrategyContext
  ): string | Promise<string>;
}
