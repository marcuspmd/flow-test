/**
 * @fileoverview Centralized interpolation service for variable resolution using Strategy Pattern.
 *
 * @remarks
 * This module provides the InterpolationService class which handles ALL variable
 * interpolation logic in a single, consistent place using pluggable strategies.
 * It resolves {{variable}} syntax including environment variables, Faker.js expressions,
 * JavaScript expressions, and regular variables from different scopes.
 *
 * **Key Features:**
 * - Strategy Pattern for extensible interpolation types
 * - Single source of truth for interpolation logic
 * - Pluggable strategies with priority-based resolution
 * - Support for nested interpolation (e.g., {{$js:Buffer.from('{{user}}:{{pass}}')}})
 * - Protection against circular references and infinite loops
 * - Comprehensive logging for debugging
 *
 * **Default Strategies (by priority):**
 * 1. EnvironmentVariableStrategy (10): `{{$env.VAR_NAME}}`
 * 2. FakerStrategy (20): `{{$faker.category.method}}`
 * 3. JavaScriptStrategy (30): `{{$js:expression}}`
 * 4. VariableStrategy (100): `{{variable}}` or `{{object.path}}` (fallback)
 *
 * @packageDocumentation
 */

import { JavaScriptExecutionContext } from "./javascript.service";
import { getLogger } from "./logger.service";
import {
  InterpolationStrategy,
  InterpolationStrategyContext,
} from "./interpolation/interpolation-strategy.interface";
import {
  EnvironmentVariableStrategy,
  FakerStrategy,
  JavaScriptStrategy,
  VariableStrategy,
} from "./interpolation/strategies";

/**
 * Context for interpolation with access to different variable scopes
 *
 * @remarks
 * Provides the necessary context for resolving variables during interpolation.
 * The variable resolver function allows delegation to existing variable management
 * systems (like VariableService) for scope-aware variable resolution.
 *
 * @public
 */
export interface InterpolationContext {
  /** Function to resolve variables from scoped storage (runtime, suite, global, etc.) */
  variableResolver: (path: string) => any;

  /** Optional JavaScript execution context for JS expressions */
  javascriptContext?: JavaScriptExecutionContext;

  /** Whether to suppress warnings for missing variables */
  suppressWarnings?: boolean;

  /** Current call depth for circular reference detection */
  depth?: number;

  /** Maximum allowed interpolation depth */
  maxDepth?: number;
}

/**
 * Configuration options for InterpolationService
 *
 * @public
 */
export interface InterpolationConfig {
  /** Maximum depth for nested interpolation (default: 10) */
  maxDepth?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Cache resolved expressions (default: true) */
  enableCache?: boolean;
}

/**
 * Centralized service for all variable interpolation
 *
 * @remarks
 * The InterpolationService provides a single, consistent implementation of variable
 * interpolation used across all parts of the Flow Test Engine. It eliminates
 * duplicated interpolation logic and ensures consistent behavior.
 *
 * **Features:**
 * - Handles all {{variable}} syntax parsing and resolution
 * - Supports nested interpolation with circular reference protection
 * - Integrates with FakerService, JavaScriptService, and variable scopes
 * - Provides comprehensive error handling and logging
 * - Optional caching for performance optimization
 *
 * **Usage in other services:**
 * - VariableService: Delegates interpolation to this service
 * - CaptureService: Uses for pre-processing expressions before JMESPath
 * - AssertionService: Uses for value interpolation before assertions
 * - All strategies: Consistent interpolation behavior
 *
 * @example Basic usage
 * ```typescript
 * const interpolationService = new InterpolationService({
 *   maxDepth: 10,
 *   debug: true
 * });
 *
 * const context: InterpolationContext = {
 *   variableResolver: (path) => variables[path],
 *   suppressWarnings: false
 * };
 *
 * const result = interpolationService.interpolate(
 *   'Hello {{$faker.person.firstName}}!',
 *   context
 * );
 * ```
 *
 * @example Nested interpolation
 * ```typescript
 * // Resolves inner {{user}} and {{pass}} before executing JS
 * const auth = interpolationService.interpolate(
 *   '{{$js:Buffer.from("{{user}}:{{pass}}").toString("base64")}}',
 *   context
 * );
 * ```
 *
 * @public
 * @since 2.0.0
 */
export class InterpolationService {
  private logger = getLogger();
  private config: Required<InterpolationConfig>;
  private expressionCache: Map<string, any> = new Map();
  private strategies: Map<string, InterpolationStrategy> = new Map();

  constructor(config: InterpolationConfig = {}) {
    this.config = {
      maxDepth: config.maxDepth ?? 10,
      debug: config.debug ?? false,
      enableCache: config.enableCache ?? true,
    };

    // Register default strategies
    this.registerDefaultStrategies();
  }

  /**
   * Registers default interpolation strategies
   * @private
   */
  private registerDefaultStrategies(): void {
    this.registerStrategy(new EnvironmentVariableStrategy());
    this.registerStrategy(new FakerStrategy());
    this.registerStrategy(new JavaScriptStrategy());
    this.registerStrategy(new VariableStrategy());
  }

  /**
   * Registers a custom interpolation strategy
   *
   * @param strategy - Strategy to register
   * @public
   */
  registerStrategy(strategy: InterpolationStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.debug(
      `[InterpolationService] Registered strategy: ${strategy.name} (priority: ${strategy.priority})`
    );
  }

  /**
   * Unregisters an interpolation strategy
   *
   * @param name - Name of the strategy to unregister
   * @public
   */
  unregisterStrategy(name: string): void {
    this.strategies.delete(name);
    this.logger.debug(`[InterpolationService] Unregistered strategy: ${name}`);
  }

  /**
   * Gets all registered strategies sorted by priority
   *
   * @returns Array of strategies ordered by priority
   * @private
   */
  private getSortedStrategies(): InterpolationStrategy[] {
    return Array.from(this.strategies.values()).sort(
      (a, b) => a.priority - b.priority
    );
  }

  /**
   * Interpolates variables in a template (string, object, or array)
   *
   * @remarks
   * Main entry point for interpolation. Processes the template recursively,
   * replacing all {{variable}} placeholders with their resolved values.
   * Handles strings, objects, and arrays uniformly.
   *
   * @param template - Template to interpolate (string, object, or array)
   * @param context - Interpolation context with variable resolvers
   * @param visitedObjects - Internal set for circular reference detection
   * @returns Interpolated value
   *
   * @example String interpolation
   * ```typescript
   * interpolate('User: {{username}}', context) // → 'User: john'
   * ```
   *
   * @example Object interpolation
   * ```typescript
   * interpolate({
   *   url: '{{api_url}}/users/{{user_id}}',
   *   headers: { 'Authorization': 'Bearer {{token}}' }
   * }, context)
   * ```
   *
   * @public
   */
  interpolate(
    template: any,
    context: InterpolationContext,
    visitedObjects: Set<any> = new Set()
  ): any {
    const currentDepth = context.depth ?? 0;

    // Check max depth
    if (currentDepth >= (context.maxDepth ?? this.config.maxDepth)) {
      this.logger.warn(
        `Maximum interpolation depth reached (${
          context.maxDepth ?? this.config.maxDepth
        })`
      );
      return template;
    }

    // Update context depth
    const nextContext: InterpolationContext = {
      ...context,
      depth: currentDepth + 1,
    };

    // Handle strings
    if (typeof template === "string") {
      return this.interpolateString(template, nextContext);
    }

    // Handle arrays
    if (Array.isArray(template)) {
      if (visitedObjects.has(template)) {
        this.logger.warn("Circular reference detected in array interpolation");
        return "[Circular Reference]";
      }
      visitedObjects.add(template);
      const result = template.map((item) =>
        this.interpolate(item, nextContext, visitedObjects)
      );
      visitedObjects.delete(template);
      return result;
    }

    // Handle objects
    if (template && typeof template === "object") {
      if (visitedObjects.has(template)) {
        this.logger.warn("Circular reference detected in object interpolation");
        return "[Circular Reference]";
      }
      visitedObjects.add(template);
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolate(value, nextContext, visitedObjects);
      }
      visitedObjects.delete(template);
      return result;
    }

    // Return primitive values as-is
    return template;
  }

  /**
   * Interpolates variables within a string template
   *
   * @remarks
   * Handles both single-variable templates (e.g., "{{user}}") and
   * multi-variable templates (e.g., "Hello {{user}}, you have {{count}} messages").
   * For single variables that resolve to objects, returns the object directly.
   *
   * @param template - String template with {{variable}} placeholders
   * @param context - Interpolation context
   * @returns Interpolated result (string or original type if single variable)
   * @private
   */
  private interpolateString(
    template: string,
    context: InterpolationContext
  ): any {
    // Check if entire string is a single variable
    const singleVarMatch = this.extractSingleVariable(template);
    if (singleVarMatch) {
      const value = this.resolveExpression(singleVarMatch, context);
      if (value === undefined) {
        this.logMissingVariable(singleVarMatch, context);
        return template; // Keep original placeholder
      }
      // For objects, recursively interpolate their contents
      if (value !== null && typeof value === "object") {
        return this.interpolate(value, context);
      }
      return value;
    }

    // Handle multiple variables in string
    let result = template;
    let hasChanges = true;
    let iterations = 0;

    while (hasChanges && iterations < this.config.maxDepth) {
      hasChanges = false;
      iterations++;

      const originalResult = result;

      // Use a more sophisticated approach to find {{ }} patterns
      // Process from left to right, finding matching pairs
      const processedIndices = new Set<number>();

      for (let i = 0; i < result.length - 1; i++) {
        if (
          result[i] === "{" &&
          result[i + 1] === "{" &&
          !processedIndices.has(i)
        ) {
          // Find matching }}
          let depth = 1;
          let j = i + 2;
          let expression = "";

          while (j < result.length - 1 && depth > 0) {
            if (result[j] === "{" && result[j + 1] === "{") {
              depth++;
              expression += result[j];
              j++;
            } else if (result[j] === "}" && result[j + 1] === "}") {
              depth--;
              if (depth === 0) {
                break;
              }
              expression += result[j];
              j++;
            } else {
              expression += result[j];
              j++;
            }
          }

          if (depth === 0 && j < result.length - 1) {
            // Found a complete {{ }} pair
            const trimmedExpr = expression.trim();
            const fullMatch = result.substring(i, j + 2);

            // Check if this is a JS expression with nested variables
            const isJsExpression =
              trimmedExpr.startsWith("$js:") ||
              trimmedExpr.startsWith("js:") ||
              trimmedExpr.startsWith("$js.");

            // Skip if contains nested {{ or }} UNLESS it's a JS expression
            if (
              !isJsExpression &&
              (trimmedExpr.includes("{{") || trimmedExpr.includes("}}"))
            ) {
              i = j + 1;
              continue;
            }

            const value = this.resolveExpression(trimmedExpr, context);
            if (value !== undefined) {
              result =
                result.substring(0, i) +
                String(value) +
                result.substring(j + 2);
              hasChanges = true;
              // Mark this range as processed
              for (let k = i; k <= j + 1; k++) {
                processedIndices.add(k);
              }
              // Restart from beginning after replacement
              break;
            } else {
              this.logMissingVariable(trimmedExpr, context);
              i = j + 1;
            }
          }
        }
      }

      // No changes means we're done or stuck
      if (result === originalResult) {
        break;
      }
    }

    return result;
  }

  /**
   * Resolves a single expression using registered strategies
   *
   * @remarks
   * Iterates through strategies in priority order, using the first one
   * that can handle the expression. This ensures predictable and
   * extensible resolution behavior.
   *
   * Resolution order (default):
   * 1. EnvironmentVariableStrategy (10): `$env.X`
   * 2. FakerStrategy (20): `$faker.X.Y` or `faker.X.Y`
   * 3. JavaScriptStrategy (30): `$js:expr` or `js:expr`
   * 4. VariableStrategy (100): `variable` or `object.path` (fallback)
   *
   * @param expression - Expression to resolve (without {{ }})
   * @param context - Interpolation context
   * @returns Resolved value or undefined
   * @private
   */
  private resolveExpression(
    expression: string,
    context: InterpolationContext
  ): any {
    if (this.config.debug) {
      this.logger.debug(`[Interpolation] Resolving: ${expression}`);
    }

    // Create strategy context
    const strategyContext: InterpolationStrategyContext = {
      variableResolver: context.variableResolver,
      javascriptContext: context.javascriptContext,
      suppressWarnings: context.suppressWarnings ?? false,
      debug: this.config.debug,
    };

    // Try each strategy in priority order
    const sortedStrategies = this.getSortedStrategies();

    for (const strategy of sortedStrategies) {
      if (strategy.canHandle(expression)) {
        if (this.config.debug) {
          this.logger.debug(`[Interpolation] Using strategy: ${strategy.name}`);
        }

        // Strategies return InterpolationResult (sync for now)
        const result = strategy.resolve(expression, strategyContext) as any;

        if (result.success) {
          return result.value;
        }

        if (result.error) {
          this.logger.warn(
            `[Interpolation] Strategy ${strategy.name} failed: ${result.error}`
          );
        }

        // If strategy can handle but failed, continue to next strategy
        // (allows fallback if one strategy errors)
        if (!result.success && !result.canHandle) {
          continue;
        }
      }
    }

    // No strategy could resolve the expression
    return undefined;
  }

  /**
   * Extracts a single variable from a template if it's just {{var}}
   *
   * @param template - String template
   * @returns Variable expression without {{ }} or null if not a single variable
   * @private
   */
  private extractSingleVariable(template: string): string | null {
    if (!template.startsWith("{{") || !template.endsWith("}}")) {
      return null;
    }

    const content = template.slice(2, -2);

    // Check for nested {{ or }}
    if (content.includes("{{") || content.includes("}}")) {
      return null;
    }

    return content;
  }

  /**
   * Logs a missing variable warning
   *
   * @param variablePath - Path of the missing variable
   * @param context - Interpolation context
   * @private
   */
  private logMissingVariable(
    variablePath: string,
    context: InterpolationContext
  ): void {
    if (!context.suppressWarnings) {
      this.logger.warn(
        `Variable '${variablePath}' not found during interpolation`
      );
    }
  }

  /**
   * Clears the expression cache
   *
   * @public
   */
  clearCache(): void {
    this.expressionCache.clear();
  }
}

/**
 * Singleton instance of InterpolationService
 * @public
 */
export const interpolationService = new InterpolationService({
  maxDepth: 10,
  debug: false,
  enableCache: true,
});
