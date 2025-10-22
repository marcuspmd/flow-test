/**
 * @fileoverview Strategy for handling iterated steps (loops).
 * This is a wrapper strategy that executes the underlying step multiple times.
 */

import type {
  StepExecutionStrategy,
  StepExecutionContext,
} from "./step-execution.strategy";
import type { TestStep } from "../../../types/engine.types";
import type { StepExecutionResult } from "../../../types/config.types";
import type { StepStrategyFactory } from "./step-strategy.factory";

/**
 * Strategy for steps with iterate configuration.
 * This is a wrapper that delegates to another strategy but executes it in a loop.
 */
export class IteratedStepStrategy implements StepExecutionStrategy {
  private factory?: StepStrategyFactory;

  /**
   * Sets the factory for delegating to other strategies.
   * This is necessary to avoid circular dependencies.
   */
  setFactory(factory: StepStrategyFactory): void {
    this.factory = factory;
  }

  /**
   * Checks if this strategy can handle the given step.
   * Returns true only if step has iterate configuration.
   */
  canHandle(step: TestStep): boolean {
    return !!step.iterate;
  }

  /**
   * Executes the iterated step by running the underlying step multiple times.
   */
  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    const stepStartTime = Date.now();
    const {
      step,
      suite,
      identifiers,
      logger,
      iterationService,
      globalVariables,
    } = context;

    try {
      // Validate iteration configuration
      if (!step.iterate) {
        throw new Error(
          `Step '${step.name}' (${identifiers.stepId}) must have 'iterate' configuration`
        );
      }

      const validationErrors = iterationService.validateIteration(step.iterate);
      if (validationErrors.length > 0) {
        throw new Error(
          `Invalid iteration configuration: ${validationErrors.join(", ")}`
        );
      }

      // Expand iteration into contexts
      const variableContext = globalVariables.getAllVariables();
      const iterationContexts = iterationService.expandIteration(
        step.iterate,
        variableContext
      );

      logger.debug(
        `🔄 Expanded iteration for step '${step.name}': ${iterationContexts.length} iteration(s)`
      );

      // Handle empty iterations
      if (iterationContexts.length === 0) {
        logger.warn(`⚠️ No iterations to execute for step '${step.name}'`);
        return this.buildEmptyIterationResult(
          identifiers,
          step,
          stepStartTime,
          variableContext
        );
      }

      // Execute each iteration
      const iterationResults: StepExecutionResult[] = [];
      let allIterationsSuccessful = true;

      for (let i = 0; i < iterationContexts.length; i++) {
        const iterationContext = iterationContexts[i];

        // Create a snapshot of current variables to restore later
        const variableSnapshot = globalVariables.createSnapshot();

        try {
          // Set iteration variable in context
          globalVariables.setRuntimeVariable(
            iterationContext.variableName,
            iterationContext.value
          );

          // Set iteration metadata
          globalVariables.setRuntimeVariable("_iteration", {
            index: i,
            total: iterationContexts.length,
            isFirst: i === 0,
            isLast: i === iterationContexts.length - 1,
            value: iterationContext.value,
          });

          // Create iteration-specific step
          const iterationStepName = `${step.name} [${i + 1}/${
            iterationContexts.length
          }]`;

          const iterationStep: TestStep = {
            ...step,
            name: iterationStepName,
            iterate: undefined, // Remove iterate to prevent infinite recursion
          };

          const iterationIdentifiers = {
            stepId: `${identifiers.stepId}-iter-${i + 1}`,
            qualifiedStepId: `${identifiers.qualifiedStepId}-iter-${i + 1}`,
            normalizedQualifiedStepId: `${
              identifiers.normalizedQualifiedStepId
            }-iter-${i + 1}`,
          };

          logger.info(
            `🔄 [${iterationStepName}] Starting iteration ${i + 1} of ${
              iterationContexts.length
            }`
          );

          // Execute the step for this iteration by delegating to appropriate strategy
          const iterationResult = await this.executeIterationStep(
            iterationStep,
            {
              ...context,
              step: iterationStep,
              identifiers: iterationIdentifiers,
            }
          );

          iterationResults.push(iterationResult);

          if (iterationResult.status !== "success") {
            allIterationsSuccessful = false;

            logger.warn(
              `⚠️ [${iterationStepName}] Iteration ${i + 1} failed: ${
                iterationResult.error_message || "Unknown error"
              }`
            );

            // Check if should stop on first failure
            if (!step.continue_on_failure) {
              logger.warn(
                `🛑 [${iterationStepName}] Stopping iterations due to failure`
              );
              break;
            }

            logger.info(
              `➡️ [${iterationStepName}] Continuing to next iteration (continue_on_failure=true)`
            );
          } else {
            logger.info(
              `✅ [${iterationStepName}] Iteration ${
                i + 1
              } completed successfully`
            );
          }
        } finally {
          // Restore variable state (removing iteration variable and metadata)
          variableSnapshot();
        }
      }

      // Combine results from all iterations
      return this.buildCombinedResult(
        identifiers,
        step,
        iterationResults,
        allIterationsSuccessful,
        stepStartTime,
        globalVariables.getAllVariables()
      );
    } catch (error: any) {
      logger.error(
        `❌ Error executing iterated step '${step.name}': ${error.message}`
      );

      return this.buildFailureResult(
        identifiers,
        step,
        error,
        stepStartTime,
        globalVariables.getAllVariables()
      );
    }
  }

  /**
   * Executes a single iteration step by delegating to the appropriate strategy.
   */
  private async executeIterationStep(
    step: TestStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    if (!this.factory) {
      throw new Error(
        "Factory not set on IteratedStepStrategy. Call setFactory() first."
      );
    }

    // Get the appropriate strategy for this step (without iterate)
    const strategy = this.factory.getStrategy(step);

    // Execute with the selected strategy
    return strategy.execute(context);
  }

  /**
   * Builds result for empty iterations.
   */
  private buildEmptyIterationResult(
    identifiers: any,
    step: TestStep,
    stepStartTime: number,
    availableVariables: Record<string, any>
  ): StepExecutionResult {
    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: "success",
      duration_ms: Date.now() - stepStartTime,
      request_details: undefined,
      response_details: undefined,
      assertions_results: [],
      captured_variables: {},
      available_variables: this.filterAvailableVariables(availableVariables),
    };
  }

  /**
   * Builds combined result from all iterations.
   */
  private buildCombinedResult(
    identifiers: any,
    step: TestStep,
    iterationResults: StepExecutionResult[],
    allIterationsSuccessful: boolean,
    stepStartTime: number,
    availableVariables: Record<string, any>
  ): StepExecutionResult {
    const totalDuration = Date.now() - stepStartTime;
    const combinedCapturedVariables: Record<string, any> = {};
    const combinedAssertions: any[] = [];

    // Merge captured variables and assertions from all iterations
    iterationResults.forEach((result, index) => {
      if (result.captured_variables) {
        Object.entries(result.captured_variables).forEach(([key, value]) => {
          // Prefix with iteration index to avoid conflicts
          combinedCapturedVariables[`${key}_iteration_${index}`] = value;
        });
      }
      if (result.assertions_results) {
        combinedAssertions.push(...result.assertions_results);
      }
    });

    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: allIterationsSuccessful ? "success" : "failure",
      duration_ms: totalDuration,
      request_details: iterationResults[0]?.request_details || undefined,
      response_details:
        iterationResults[iterationResults.length - 1]?.response_details ||
        undefined,
      assertions_results: combinedAssertions,
      captured_variables: combinedCapturedVariables,
      available_variables: this.filterAvailableVariables(availableVariables),
      iteration_results: iterationResults, // Include individual iteration results
    };
  }

  /**
   * Builds failure result when iteration encounters an error.
   */
  private buildFailureResult(
    identifiers: any,
    step: TestStep,
    error: Error,
    stepStartTime: number,
    availableVariables: Record<string, any>
  ): StepExecutionResult {
    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: "failure",
      duration_ms: Date.now() - stepStartTime,
      request_details: undefined,
      response_details: undefined,
      assertions_results: [],
      captured_variables: {},
      available_variables: this.filterAvailableVariables(availableVariables),
      error_message: error.message,
    };
  }

  /**
   * Filters internal variables from available variables.
   */
  private filterAvailableVariables(
    variables: Record<string, any>
  ): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (!key.startsWith("_")) {
        filtered[key] = value;
      }
    }
    return filtered;
  }
}
