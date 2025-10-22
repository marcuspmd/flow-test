/**
 * @fileoverview InputStepStrategy - Handles test steps with only input configuration.
 *
 * This strategy processes steps that contain input prompts without HTTP requests.
 * It handles:
 * - Interactive user input collection
 * - Input validation
 * - Dynamic variable assignments
 * - Variable capturing and registration
 *
 * @author Flow Test Engine
 * @since 1.2.0 (ADR-001 Phase 3)
 */

import { BaseStepStrategy } from "./base-step.strategy";
import type { StepExecutionContext } from "./step-execution.strategy";
import type { StepExecutionResult } from "../../../types/config.types";
import type {
  TestStep,
  InputResult,
  InputExecutionContext,
} from "../../../types/engine.types";

/**
 * Strategy for executing test steps that only have input configuration.
 *
 * **Selection Criteria:**
 * - Step must have `input` property
 * - Step must NOT have `request` property
 * - Step must NOT have `call` property
 * - Step must NOT have `iterate` property
 *
 * **Execution Flow:**
 * 1. Validate step configuration
 * 2. Set input execution context
 * 3. Process interactive inputs
 * 4. Validate input results
 * 5. Capture variables from inputs
 * 6. Process dynamic expressions
 * 7. Reevaluate dependent variables
 * 8. Build and return result
 *
 * @extends {BaseStepStrategy}
 */
export class InputStepStrategy extends BaseStepStrategy {
  /**
   * Determines if this strategy can handle the given step.
   *
   * @param step - Test step to evaluate
   * @returns True if step has input but no request/call/iterate
   */
  canHandle(step: TestStep): boolean {
    return !!step.input && !step.request && !step.call && !step.iterate;
  }

  /**
   * Executes an input-only test step.
   *
   * @param context - Execution context with services and step data
   * @returns Step execution result with input results and captured variables
   */
  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const {
      step,
      suite,
      stepIndex,
      identifiers,
      globalVariables,
      logger,
      discoveredTest,
    } = context;

    try {
      // Validate step configuration
      if (!step.input) {
        throw new Error(
          `Step '${step.name}' must have 'input' configuration for InputStepStrategy`
        );
      }

      // **1. Execute pre-input hooks**
      await this.executeHooks(context, step.hooks_pre_input, "pre_input");

      // **2. Set execution context for interactive inputs**
      const executionContext: InputExecutionContext = {
        suite_name: suite.suite_name,
        suite_path: discoveredTest?.file_path,
        step_name: step.name,
        step_id: step.step_id,
        step_index: stepIndex,
        cache_key: `${suite.node_id || suite.suite_name}::${step.name}`,
      };
      context.inputService.setExecutionContext(executionContext);

      // **3. Process interactive inputs**
      const { inputResults, capturedVariables } = await this.processInputs(
        context
      );

      // **4. Execute post-input hooks**
      await this.executeHooks(context, step.hooks_post_input, "post_input", {
        inputs: inputResults,
        captured: capturedVariables,
      });

      // **5. Build success result**
      const duration = Date.now() - startTime;

      const result: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "success",
        duration_ms: duration,
        input_results: inputResults,
        captured_variables: capturedVariables,
        available_variables: this.filterAvailableVariables(
          globalVariables.getAllVariables(),
          { stepType: "input", stepName: step.name }
        ),
        assertions_results: [],
      };

      return result;
    } catch (error) {
      return this.buildFailureResult(context, error, Date.now() - startTime);
    }
  }

  /**
   * Processes interactive inputs and handles dynamic expressions.
   *
   * @param context - Execution context
   * @returns Input results, captured variables, and dynamic assignments
   * @private
   */
  private async processInputs(context: StepExecutionContext): Promise<{
    inputResults: InputResult[];
    capturedVariables: Record<string, any>;
  }> {
    const { step, globalVariables, inputService, logger } = context;

    const currentVariables = globalVariables.getAllVariables();
    const inputResult = await inputService.promptUser(
      step.input!,
      currentVariables
    );

    // Handle single or multiple input results
    const inputResults = Array.isArray(inputResult)
      ? inputResult
      : [inputResult];
    const inputConfigs = Array.isArray(step.input) ? step.input : [step.input!];

    const capturedVariables: Record<string, any> = {};

    // **Process each input result**
    for (let index = 0; index < inputResults.length; index++) {
      const result = inputResults[index];
      const config = inputConfigs[Math.min(index, inputConfigs.length - 1)];

      if (Array.isArray(step.input)) {
        logger.info(`📝 Processing input: ${result.variable}`);
      } else {
        logger.info(`📝 Prompting for input: ${result.variable}`);
      }

      if (result.validation_passed) {
        // Store input result as a variable
        globalVariables.setRuntimeVariable(result.variable, result.value);

        logger.info(
          `✅ Input captured: ${result.variable} = ${
            result.used_default ? "(default)" : "(user input)"
          }`
        );

        // Add to captured variables
        capturedVariables[result.variable] = result.value;
      } else {
        logger.error(
          `❌ Input validation failed for ${result.variable}: ${result.validation_error}`
        );
        // Continue processing other inputs but mark validation failure
      }
    }

    return { inputResults, capturedVariables };
  }

  // filterAvailableVariables and buildFailureResult methods moved to BaseStepStrategy
  // to eliminate code duplication across all strategies

  /**
   * Executes lifecycle hooks at the appropriate point
   *
   * @param context - Execution context
   * @param hooks - Array of hook actions to execute
   * @param hookPoint - Name of the hook point (for logging)
   * @param additionalContext - Additional context data (e.g., inputs, captured vars)
   * @private
   */
  private async executeHooks(
    context: StepExecutionContext,
    hooks: import("../../../types/hook.types").HookAction[] | undefined,
    hookPoint: string,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    if (!hooks || hooks.length === 0) {
      return;
    }

    const { hookExecutorService, step, globalVariables, logger } = context;

    try {
      logger.debug(
        `[Hook] Executing ${hooks.length} hook(s) at ${hookPoint} for step '${step.name}'`
      );

      const hookContext: import("../../../types/hook.types").HookExecutionContext =
        {
          stepName: step.name,
          stepIndex: context.stepIndex,
          variables: globalVariables.getAllVariables(),
          ...additionalContext,
        };

      const result = await hookExecutorService.executeHooks(hooks, hookContext);

      if (!result.success) {
        logger.warn(
          `[Hook] Hook execution at ${hookPoint} encountered issues: ${result.error}`
        );
      } else {
        logger.debug(
          `[Hook] Successfully executed hooks at ${hookPoint} in ${result.duration_ms}ms`
        );
      }
    } catch (error) {
      logger.error(
        `[Hook] Failed to execute hooks at ${hookPoint}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Don't throw - hooks should not break test execution
    }
  }
}
