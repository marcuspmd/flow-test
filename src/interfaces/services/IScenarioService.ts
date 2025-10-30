/**
 * @fileoverview Scenario service interface for conditional execution.
 *
 * @remarks
 * This interface defines the contract for conditional scenario processing,
 * allowing test steps to have different execution paths based on response conditions.
 *
 * @packageDocumentation
 */

import { ConditionalScenario } from "../../types/engine.types";
import { StepExecutionResult } from "../../types/config.types";
import type { TestStep, TestSuite } from "../../types/engine.types";

/**
 * Interface for scenario-based conditional execution service.
 *
 * @remarks
 * Provides methods for processing conditional scenarios in test steps,
 * evaluating conditions using JMESPath expressions, and executing appropriate
 * scenario blocks (then/else).
 *
 * @public
 * @since 2.0.0
 */
export interface IScenarioService {
  /**
   * Processes conditional scenarios and executes appropriate blocks.
   *
   * @param scenarios - Array of conditional scenarios to evaluate
   * @param result - Step execution result containing response data
   * @param verbosity - Verbosity level for logging
   * @param variableContext - Optional variable context for scenario execution
   *
   * @example
   * ```typescript
   * scenarioService.processScenarios(
   *   step.scenarios,
   *   stepResult,
   *   'detailed',
   *   variables
   * );
   * ```
   */
  processScenarios(
    scenarios: ConditionalScenario[],
    result: StepExecutionResult,
    verbosity: string,
    variableContext?: Record<string, any>
  ): void;

  /**
   * Validates scenario definitions for syntax and structure.
   *
   * @param scenarios - Array of scenarios to validate
   * @returns Array of validation error messages (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = scenarioService.validateScenarios(scenarios);
   * if (errors.length > 0) {
   *   console.error('Invalid scenarios:', errors);
   * }
   * ```
   */
  validateScenarios(scenarios: ConditionalScenario[]): string[];

  /**
   * Suggests possible condition expressions based on response.
   *
   * @param result - Step execution result to analyze
   * @returns Array of suggested condition expressions
   *
   * @example
   * ```typescript
   * const suggestions = scenarioService.suggestConditions(result);
   * console.log('Suggested conditions:', suggestions);
   * // ["status_code == `200`", "body.success == true", ...]
   * ```
   */
  suggestConditions(result: StepExecutionResult): string[];

  /**
   * Executes nested steps within a scenario with depth tracking.
   *
   * @param steps - Array of test steps to execute
   * @param suite - Parent test suite context
   * @param currentDepth - Current nesting depth (0 for top-level)
   * @param maxDepth - Maximum allowed nesting depth
   * @param scenarioPath - Human-readable path for error messages
   * @returns Array of step execution results
   * @throws Error if maximum depth is exceeded
   *
   * @example
   * ```typescript
   * const results = await scenarioService.executeNestedSteps(
   *   scenario.then.steps,
   *   suite,
   *   1, // current depth
   *   5, // max depth
   *   "scenario[0].then.steps"
   * );
   * ```
   */
  executeNestedSteps(
    steps: TestStep[],
    suite: TestSuite,
    currentDepth: number,
    maxDepth: number,
    scenarioPath: string
  ): Promise<StepExecutionResult[]>;
}
