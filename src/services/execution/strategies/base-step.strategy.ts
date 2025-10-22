/**
 * @fileoverview Base abstract class for step execution strategies.
 *
 * @remarks
 * This abstract class provides common functionality shared across all step execution
 * strategies, reducing code duplication and ensuring consistent behavior.
 *
 * **Shared Responsibilities:**
 * - Variable filtering and masking
 * - Failure result building
 * - Common validation logic
 * - Standard error handling patterns
 *
 * @packageDocumentation
 */

import type {
  StepExecutionStrategy,
  StepExecutionContext,
} from "./step-execution.strategy";
import type { StepExecutionResult } from "../../../types/config.types";
import type { TestStep } from "../../../types/engine.types";

/**
 * Abstract base class for all step execution strategies.
 *
 * @remarks
 * Provides common methods that all strategies need, eliminating code duplication
 * and ensuring consistent behavior across different step types.
 *
 * **Common Methods:**
 * - `filterAvailableVariables`: Smart variable filtering and masking
 * - `buildFailureResult`: Standardized failure result construction
 * - `buildBaseResult`: Base result structure
 *
 * **Usage:**
 * ```typescript
 * export class MyCustomStrategy extends BaseStepStrategy {
 *   canHandle(step: TestStep): boolean {
 *     return !!step.myCustomField;
 *   }
 *
 *   async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
 *     const startTime = Date.now();
 *
 *     try {
 *       // Custom execution logic
 *       const data = await this.executeCustomLogic(context);
 *
 *       // Use base methods
 *       return {
 *         ...this.buildBaseResult(context),
 *         status: 'success',
 *         duration_ms: Date.now() - startTime,
 *         captured_variables: data,
 *         available_variables: this.filterAvailableVariables(
 *           context.globalVariables.getAllVariables()
 *         ),
 *       };
 *     } catch (error) {
 *       return this.buildFailureResult(context, error, Date.now() - startTime);
 *     }
 *   }
 * }
 * ```
 *
 * @abstract
 */
export abstract class BaseStepStrategy implements StepExecutionStrategy {
  /**
   * Determines if this strategy can handle the given step.
   * Must be implemented by concrete strategy classes.
   *
   * @param step - Test step to evaluate
   * @returns True if this strategy should execute the step
   * @abstract
   */
  abstract canHandle(step: TestStep): boolean;

  /**
   * Executes the test step and returns the result.
   * Must be implemented by concrete strategy classes.
   *
   * @param context - Execution context with all dependencies
   * @returns Promise resolving to the step execution result
   * @abstract
   */
  abstract execute(context: StepExecutionContext): Promise<StepExecutionResult>;

  /**
   * Intelligently filters and masks available variables for step context.
   *
   * @param variables - All variables to filter
   * @param options - Optional filtering configuration
   * @returns Filtered, masked, and summarized variables
   *
   * @remarks
   * This method uses smart filtering and masking utilities to:
   * - Remove sensitive data (passwords, tokens, etc.)
   * - Limit object/array depth to prevent bloat
   * - Show only relevant variables for the current step
   * - Apply consistent formatting
   *
   * @protected
   */
  protected filterAvailableVariables(
    variables: Record<string, any>,
    options: {
      stepType?: "request" | "input" | "call" | "scenario" | "iteration";
      stepName?: string;
      isFirstStep?: boolean;
      recentCaptures?: Set<string>;
    } = {}
  ): Record<string, any> {
    const {
      smartFilterAndMask,
    } = require("../../../utils/variable-masking.utils");

    // Extract recently captured variables from current context
    const recentCaptures = options.recentCaptures || new Set<string>();
    if (!options.recentCaptures) {
      for (const key of Object.keys(variables)) {
        if (
          key.startsWith("captured_") ||
          key.includes("_result") ||
          key.includes("_response") ||
          key.includes("_call")
        ) {
          recentCaptures.add(key);
        }
      }
    }

    return smartFilterAndMask(
      variables,
      {
        stepType: options.stepType,
        stepName: options.stepName,
        recentCaptures,
        isFirstStep: options.isFirstStep,
      },
      {
        alwaysInclude: ["suite_name", "step_id", "node_id"],
        alwaysExclude: ["PATH", "HOME", "USER", "SHELL", "PWD", "LANG"],
        maxPerCategory: 8,
      },
      {
        maxDepth: 2,
        maxObjectSize: 20,
        maxArrayLength: 5,
        maxStringLength: 200,
      }
    );
  }

  /**
   * Builds a standardized failure result for step execution errors.
   *
   * @param context - Execution context
   * @param error - Error that occurred
   * @param duration - Execution duration in milliseconds
   * @returns Failure step execution result
   *
   * @remarks
   * Creates a consistent failure result structure with:
   * - Error message extraction
   * - Available variables filtering
   * - Standard failure status
   * - Execution timing
   *
   * @protected
   */
  protected buildFailureResult(
    context: StepExecutionContext,
    error: any,
    duration: number
  ): StepExecutionResult {
    const { step, identifiers, globalVariables } = context;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: "failure",
      duration_ms: duration,
      error_message: errorMessage,
      captured_variables: {},
      available_variables: this.filterAvailableVariables(
        globalVariables.getAllVariables(),
        { stepName: step.name }
      ),
      assertions_results: [],
    };
  }

  /**
   * Builds base result structure common to all step results.
   *
   * @param context - Execution context
   * @returns Partial step result with common fields
   *
   * @remarks
   * Provides the basic structure that all results should have,
   * reducing duplication in concrete strategy implementations.
   *
   * @protected
   */
  protected buildBaseResult(
    context: StepExecutionContext
  ): Partial<StepExecutionResult> {
    const { step, identifiers } = context;

    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
    };
  }

  /**
   * Validates that a step has required configuration fields.
   *
   * @param step - Test step to validate
   * @param requiredFields - Array of required field names
   * @throws Error if any required field is missing
   *
   * @example
   * ```typescript
   * this.validateStepConfig(step, ['request']);
   * // Throws if step.request is undefined
   * ```
   *
   * @protected
   */
  protected validateStepConfig(
    step: TestStep,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(
      (field) => !(field in step) || (step as any)[field] === undefined
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Step '${step.name}' is missing required fields: ${missingFields.join(", ")}`
      );
    }
  }

  /**
   * Validates that a step does not have conflicting configuration fields.
   *
   * @param step - Test step to validate
   * @param conflictingFields - Array of field names that should not coexist
   * @throws Error if multiple conflicting fields are present
   *
   * @example
   * ```typescript
   * this.validateNoConflicts(step, ['request', 'call', 'input']);
   * // Throws if step has both 'request' and 'call'
   * ```
   *
   * @protected
   */
  protected validateNoConflicts(
    step: TestStep,
    conflictingFields: string[]
  ): void {
    const presentFields = conflictingFields.filter(
      (field) => field in step && (step as any)[field] !== undefined
    );

    if (presentFields.length > 1) {
      throw new Error(
        `Step '${step.name}' has conflicting fields: ${presentFields.join(", ")}. Only one is allowed.`
      );
    }
  }

}
