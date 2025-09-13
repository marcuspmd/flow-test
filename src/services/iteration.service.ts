/**
 * Iteration Service for Flow Test Engine
 *
 * Handles array and range iteration logic for test steps.
 * Provides utilities to expand iteration configurations into multiple execution contexts.
 *
 * @since 1.0.0
 */

import {
  IterationConfig,
  ArrayIterationConfig,
  RangeIterationConfig,
  IterationContext
} from '../types/engine.types';

export class IterationService {
  /**
   * Determines if an iteration configuration is for array iteration
   */
  private isArrayIteration(config: IterationConfig): config is ArrayIterationConfig {
    return 'over' in config;
  }

  /**
   * Determines if an iteration configuration is for range iteration
   */
  private isRangeIteration(config: IterationConfig): config is RangeIterationConfig {
    return 'range' in config;
  }

  /**
   * Parses a range string like "1..5" into start and end numbers
   */
  private parseRange(rangeString: string): { start: number; end: number } {
    const match = rangeString.match(/^(\d+)\.\.(\d+)$/);
    if (!match) {
      throw new Error(`Invalid range format: ${rangeString}. Expected format: "start..end" (e.g., "1..5")`);
    }

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (start > end) {
      throw new Error(`Invalid range: start (${start}) cannot be greater than end (${end})`);
    }

    return { start, end };
  }

  /**
   * Resolves an array from a variable expression
   */
  private resolveArray(arrayExpression: string, variableContext: Record<string, any>): any[] {
    // Remove {{ }} if present
    const cleanExpression = arrayExpression.replace(/^\{\{|\}\}$/g, '').trim();

    // Handle simple variable reference like "test_cases"
    if (cleanExpression in variableContext) {
      const value = variableContext[cleanExpression];
      if (!Array.isArray(value)) {
        throw new Error(`Variable "${cleanExpression}" is not an array. Got: ${typeof value}`);
      }
      return value;
    }

    // Handle dot notation like "data.test_cases"
    const parts = cleanExpression.split('.');
    let current = variableContext;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Variable path "${cleanExpression}" not found in context`);
      }
    }

    if (!Array.isArray(current)) {
      throw new Error(`Variable "${cleanExpression}" resolved to non-array value. Got: ${typeof current}`);
    }

    return current;
  }

  /**
   * Expands an iteration configuration into multiple iteration contexts
   */
  public expandIteration(
    config: IterationConfig,
    variableContext: Record<string, any>
  ): IterationContext[] {
    if (this.isArrayIteration(config)) {
      return this.expandArrayIteration(config, variableContext);
    } else if (this.isRangeIteration(config)) {
      return this.expandRangeIteration(config);
    } else {
      throw new Error('Invalid iteration configuration');
    }
  }

  /**
   * Expands array iteration configuration
   */
  private expandArrayIteration(
    config: ArrayIterationConfig,
    variableContext: Record<string, any>
  ): IterationContext[] {
    const array = this.resolveArray(config.over, variableContext);

    return array.map((item, index) => ({
      index,
      value: item,
      variableName: config.as,
      isFirst: index === 0,
      isLast: index === array.length - 1
    }));
  }

  /**
   * Expands range iteration configuration
   */
  private expandRangeIteration(config: RangeIterationConfig): IterationContext[] {
    const { start, end } = this.parseRange(config.range);
    const contexts: IterationContext[] = [];

    for (let i = start; i <= end; i++) {
      contexts.push({
        index: i - start, // 0-based index
        value: i, // actual number value
        variableName: config.as,
        isFirst: i === start,
        isLast: i === end
      });
    }

    return contexts;
  }

  /**
   * Validates an iteration configuration
   */
  public validateIteration(config: IterationConfig): string[] {
    const errors: string[] = [];

    if (this.isArrayIteration(config)) {
      if (!config.over) {
        errors.push('Array iteration requires "over" property');
      }
      if (!config.as) {
        errors.push('Array iteration requires "as" property to name the iteration variable');
      }
    } else if (this.isRangeIteration(config)) {
      if (!config.range) {
        errors.push('Range iteration requires "range" property');
      } else {
        try {
          this.parseRange(config.range);
        } catch (error: any) {
          errors.push(`Invalid range: ${error.message}`);
        }
      }
      if (!config.as) {
        errors.push('Range iteration requires "as" property to name the iteration variable');
      }
    } else {
      errors.push('Iteration configuration must be either array iteration or range iteration');
    }

    return errors;
  }
}