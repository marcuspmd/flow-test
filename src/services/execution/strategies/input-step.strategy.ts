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

import type {
  StepExecutionStrategy,
  StepExecutionContext,
} from "./step-execution.strategy";
import type { StepExecutionResult } from "../../../types/config.types";
import type {
  TestStep,
  InputResult,
  InputExecutionContext,
} from "../../../types/engine.types";
import type { DynamicVariableAssignment } from "../../../types/common.types";

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
 * @implements {StepExecutionStrategy}
 */
export class InputStepStrategy implements StepExecutionStrategy {
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

      // **1. Set execution context for interactive inputs**
      const executionContext: InputExecutionContext = {
        suite_name: suite.suite_name,
        suite_path: discoveredTest?.file_path,
        step_name: step.name,
        step_id: step.step_id,
        step_index: stepIndex,
        cache_key: `${suite.node_id || suite.suite_name}::${step.name}`,
      };
      context.inputService.setExecutionContext(executionContext);

      // **2. Process interactive inputs**
      const { inputResults, capturedVariables, dynamicAssignments } =
        await this.processInputs(context);

      // **3. Build success result**
      const duration = Date.now() - startTime;

      const result: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "success",
        duration_ms: duration,
        input_results: inputResults,
        captured_variables: capturedVariables,
        ...(dynamicAssignments.length > 0
          ? { dynamic_assignments: dynamicAssignments }
          : {}),
        available_variables: this.filterAvailableVariables(
          globalVariables.getAllVariables()
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
    dynamicAssignments: DynamicVariableAssignment[];
  }> {
    const {
      step,
      suite,
      globalVariables,
      inputService,
      dynamicExpressionService,
      logger,
    } = context;

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
    const dynamicAssignments: DynamicVariableAssignment[] = [];
    const triggeredVariables = new Set<string>();
    let lastSuccessfulInput: InputResult | undefined;

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
        triggeredVariables.add(result.variable);
        lastSuccessfulInput = result;

        logger.info(
          `✅ Input captured: ${result.variable} = ${
            result.used_default ? "(default)" : "(user input)"
          }`
        );

        // Add to captured variables
        capturedVariables[result.variable] = result.value;

        // **Process dynamic expressions if configured**
        if (config.dynamic) {
          const dynamicContext = this.buildDynamicContext(
            suite,
            step,
            globalVariables.getAllVariables(),
            capturedVariables
          );

          const dynamicOutcome = dynamicExpressionService.processInputDynamics(
            result,
            config.dynamic,
            dynamicContext
          );

          if (dynamicOutcome.assignments.length > 0) {
            const applied = this.applyDynamicAssignments(
              dynamicOutcome.assignments,
              suite,
              globalVariables
            );
            dynamicAssignments.push(...dynamicOutcome.assignments);
            result.derived_assignments = dynamicOutcome.assignments;
            Object.assign(capturedVariables, applied);

            dynamicOutcome.assignments.forEach((assignment) => {
              triggeredVariables.add(assignment.name);
            });
          }

          if (dynamicOutcome.registeredDefinitions.length > 0) {
            dynamicExpressionService.registerDefinitions(
              dynamicOutcome.registeredDefinitions
            );
          }
        }
      } else {
        logger.error(
          `❌ Input validation failed for ${result.variable}: ${result.validation_error}`
        );
        // Continue processing other inputs but mark validation failure
      }
    }

    // **Reevaluate dependent variables**
    if (triggeredVariables.size > 0 && lastSuccessfulInput) {
      const dynamicContext = this.buildDynamicContext(
        suite,
        step,
        globalVariables.getAllVariables(),
        capturedVariables
      );

      const reevaluatedAssignments = dynamicExpressionService.reevaluate(
        Array.from(triggeredVariables),
        lastSuccessfulInput,
        dynamicContext
      );

      if (reevaluatedAssignments.length > 0) {
        const applied = this.applyDynamicAssignments(
          reevaluatedAssignments,
          suite,
          globalVariables
        );
        dynamicAssignments.push(...reevaluatedAssignments);

        if (lastSuccessfulInput) {
          lastSuccessfulInput.derived_assignments = [
            ...(lastSuccessfulInput.derived_assignments ?? []),
            ...reevaluatedAssignments,
          ];
        }
        Object.assign(capturedVariables, applied);
      }
    }

    return { inputResults, capturedVariables, dynamicAssignments };
  }

  /**
   * Builds dynamic context for expression evaluation.
   *
   * @param suite - Test suite
   * @param step - Test step
   * @param allVariables - All available variables
   * @param captured - Captured variables
   * @returns Dynamic context object
   * @private
   */
  private buildDynamicContext(
    suite: any,
    step: TestStep,
    allVariables: Record<string, any>,
    captured: Record<string, any>
  ): any {
    return {
      suite: {
        node_id: suite.node_id,
        suite_name: suite.suite_name,
      },
      step: {
        name: step.name,
        step_id: step.step_id,
      },
      variables: allVariables,
      captured,
      // For input-only steps, response/request are undefined
      response: undefined,
      request: undefined,
    };
  }

  /**
   * Applies dynamic assignments to variables.
   *
   * @param assignments - Dynamic assignments to apply
   * @param suite - Test suite
   * @param globalVariables - Global variables service
   * @returns Applied variables object
   * @private
   */
  private applyDynamicAssignments(
    assignments: DynamicVariableAssignment[],
    suite: any,
    globalVariables: any
  ): Record<string, any> {
    const applied: Record<string, any> = {};

    for (const assignment of assignments) {
      // Apply to the specified scope
      switch (assignment.scope) {
        case "runtime":
          globalVariables.setRuntimeVariable(assignment.name, assignment.value);
          applied[assignment.name] = assignment.value;
          break;

        case "suite":
          if (!suite.variables) {
            suite.variables = {};
          }
          suite.variables[assignment.name] = assignment.value;
          applied[assignment.name] = assignment.value;
          break;

        case "global":
          globalVariables.setVariable(
            `${suite.node_id || suite.suite_name}.${assignment.name}`,
            assignment.value
          );
          applied[assignment.name] = assignment.value;
          break;

        default:
          // Default to runtime scope
          globalVariables.setRuntimeVariable(assignment.name, assignment.value);
          applied[assignment.name] = assignment.value;
      }

      // Additionally persist to runtime scope if persist flag is set
      // This makes the variable available immediately without namespace prefix (e.g., {{selected_bn}})
      if (assignment.persist && assignment.scope !== "runtime") {
        globalVariables.setRuntimeVariable(assignment.name, assignment.value);
      }
    }

    return applied;
  }

  /**
   * Intelligently filters and masks available variables for input step context
   *
   * @param variables - All variables
   * @returns Filtered, masked, and summarized variables
   * @private
   */
  private filterAvailableVariables(
    variables: Record<string, any>
  ): Record<string, any> {
    const {
      smartFilterAndMask,
    } = require("../../../utils/variable-masking.utils");

    // Extract recently captured variables from current context
    const recentCaptures = new Set<string>();
    for (const key of Object.keys(variables)) {
      if (
        key.startsWith("captured_") ||
        key.includes("_input") ||
        key.includes("_user")
      ) {
        recentCaptures.add(key);
      }
    }

    return smartFilterAndMask(
      variables,
      {
        stepType: "input",
        recentCaptures,
        isFirstStep: false,
      },
      {
        alwaysInclude: ["username", "email", "default_value"],
        alwaysExclude: ["PATH", "HOME", "USER", "SHELL", "PWD", "LANG"],
        maxPerCategory: 5,
      },
      {
        maxDepth: 1,
        maxObjectSize: 10,
        maxArrayLength: 3,
        maxStringLength: 100,
      }
    );
  }

  /**
   * Builds a failure result when execution errors occur.
   *
   * @param context - Execution context
   * @param error - Error that occurred
   * @param duration - Execution duration in ms
   * @returns Failure step execution result
   * @private
   */
  private buildFailureResult(
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
        globalVariables.getAllVariables()
      ),
      assertions_results: [],
    };
  }
}
