/**
 * Interface for Iteration Service
 *
 * Handles array and range iteration logic for test steps.
 * Provides utilities to expand iteration configurations into multiple execution contexts.
 *
 * @since 2.0.0
 */

import type {
  IterationConfig,
  IterationContext,
} from "../../types/engine.types";

export interface IIterationService {
  /**
   * Expands an iteration configuration into multiple iteration contexts
   *
   * @param config - The iteration configuration (array or range)
   * @param variableContext - The variable context for resolving array expressions
   * @returns Array of iteration contexts
   * @throws Error if configuration is invalid or array cannot be resolved
   */
  expandIteration(
    config: IterationConfig,
    variableContext: Record<string, any>
  ): IterationContext[];

  /**
   * Validates an iteration configuration
   *
   * @param config - The iteration configuration to validate
   * @returns Array of validation error messages (empty if valid)
   */
  validateIteration(config: IterationConfig): string[];
}
