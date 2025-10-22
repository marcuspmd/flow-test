/**
 * @fileoverview CallStepStrategy - Handles test steps that call other steps cross-suite.
 *
 * This strategy processes steps with `call` configuration that invoke steps from
 * other test suites. It handles:
 * - Path resolution (relative/absolute)
 * - Variable passing and isolation
 * - Error handling strategies
 * - Variable propagation
 * - Call stack management
 *
 * @author Flow Test Engine
 * @since 1.2.0 (ADR-001 Phase 3)
 */

import type {
  StepExecutionStrategy,
  StepExecutionContext,
} from "./step-execution.strategy";
import type { StepExecutionResult } from "../types/config.types";
import type { TestStep } from "../types/engine.types";
import type {
  StepCallRequest,
  StepCallExecutionOptions,
  StepCallResult,
} from "../types/call.types";
import * as path from "path";

/**
 * Strategy for executing test steps with cross-suite call configuration.
 *
 * **Selection Criteria:**
 * - Step must have `call` property
 * - Step must NOT have `request`, `iterate`, `input`, or `scenarios`
 *
 * **Execution Flow:**
 * 1. Validate step configuration
 * 2. Validate call compatibility (no incompatible fields)
 * 3. Interpolate call parameters
 * 4. Resolve target suite and step
 * 5. Execute remote step via CallService
 * 6. Handle error strategies (fail/continue/warn)
 * 7. Propagate variables if successful
 * 8. Build and return result
 *
 * @implements {StepExecutionStrategy}
 */
export class CallStepStrategy implements StepExecutionStrategy {
  /**
   * Determines if this strategy can handle the given step.
   *
   * @param step - Test step to evaluate
   * @returns True if step has call and no other conflicting properties
   */
  canHandle(step: TestStep): boolean {
    return !!step.call && !step.request && !step.iterate;
  }

  /**
   * Executes a cross-suite call step.
   *
   * @param context - Execution context with services and step data
   * @returns Step execution result with propagated variables
   */
  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const {
      step,
      suite,
      identifiers,
      globalVariables,
      logger,
      discoveredTest,
      callService,
    } = context;

    try {
      // **1. Validate step configuration**
      if (!step.call) {
        throw new Error(
          `Step '${step.name}' must have 'call' configuration for CallStepStrategy`
        );
      }

      // **2. Validate call compatibility**
      this.validateCallCompatibility(step);

      // **3. Validate caller suite path**
      const callerSuitePath = discoveredTest?.file_path;
      if (!callerSuitePath) {
        throw new Error(
          `Cannot execute step call from suite '${suite.suite_name}' without a caller suite path`
        );
      }

      const callConfig = step.call;

      // **4. Validate call configuration**
      this.validateCallConfig(callConfig, step.name);

      // **5. Interpolate call parameters**
      const resolvedTestPath = globalVariables
        .interpolateString(callConfig.test)
        .trim();
      const resolvedStepKey = globalVariables
        .interpolateString(callConfig.step)
        .trim();

      if (!resolvedTestPath || !resolvedStepKey) {
        throw new Error(
          `Invalid call configuration for step '${step.name}': both 'test' and 'step' are required`
        );
      }

      const interpolatedVariables = this.interpolateCallVariables(
        callConfig.variables,
        globalVariables
      );
      const isolateContext = callConfig.isolate_context ?? true;

      // **6. Build call request and options**
      const callRequest: StepCallRequest = {
        test: resolvedTestPath,
        path_type: callConfig.path_type,
        step: resolvedStepKey,
        variables: interpolatedVariables,
        isolate_context: isolateContext,
        timeout: callConfig.timeout,
        retry: callConfig.retry,
        on_error: callConfig.on_error,
      };

      const allowedRoot = path.resolve(
        context.configManager?.getConfig().test_directory || "./tests"
      );

      const callOptions: StepCallExecutionOptions = {
        callerSuitePath,
        callerNodeId: suite.node_id,
        callerSuiteName: suite.suite_name,
        allowedRoot,
        callStack: context.stepCallStack || [],
      };

      const callLabel = `${resolvedTestPath}::${resolvedStepKey}`;

      logger.info(
        `📞 Calling step '${callLabel}' (isolate=${isolateContext})`,
        {
          stepName: step.name,
          metadata: {
            type: "step_call",
            internal: true,
            suite: suite.suite_name,
          },
        }
      );

      // **7. Execute the call**
      const callResult = await callService.executeStepCall(
        callRequest,
        callOptions
      );

      const duration = Date.now() - startTime;
      const status = this.determineStatus(callResult);

      // **8. Log result**
      if (callResult.success) {
        logger.info(`✅ Step call '${callLabel}' completed in ${duration}ms`, {
          stepName: step.name,
          metadata: {
            type: "step_call",
            internal: true,
            suite: suite.suite_name,
          },
        });
      } else {
        logger.warn(
          `⚠️ Step call '${callLabel}' finished with status '${status}'`,
          {
            stepName: step.name,
            metadata: {
              type: "step_call",
              internal: true,
              suite: suite.suite_name,
            },
          }
        );
      }

      // **9. Propagate variables if successful**
      const propagatedVariables = callResult.propagated_variables;
      if (callResult.success && propagatedVariables) {
        globalVariables.setRuntimeVariables(propagatedVariables);
      }

      // **10. Build success result**
      const result: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status,
        duration_ms: duration,
        ...(propagatedVariables && Object.keys(propagatedVariables).length > 0
          ? { captured_variables: propagatedVariables }
          : {}),
        available_variables: this.filterAvailableVariables(
          globalVariables.getAllVariables()
        ),
        error_message: callResult.error,
        assertions_results: [],
      };

      return result;
    } catch (error) {
      return this.buildFailureResult(context, error, Date.now() - startTime);
    }
  }

  /**
   * Validates that call is compatible with other step properties.
   *
   * @param step - Test step to validate
   * @throws Error if incompatible fields are present
   * @private
   */
  private validateCallCompatibility(step: TestStep): void {
    const incompatibleFields: string[] = [];
    if (step.request) incompatibleFields.push("request");
    if (step.iterate) incompatibleFields.push("iterate");
    if (step.input) incompatibleFields.push("input");
    if (step.scenarios && step.scenarios.length > 0) {
      incompatibleFields.push("scenarios");
    }

    if (incompatibleFields.length > 0) {
      throw new Error(
        `Step '${
          step.name
        }' cannot define 'call' alongside [${incompatibleFields.join(", ")}]`
      );
    }
  }

  /**
   * Validates call configuration structure.
   *
   * @param callConfig - Call configuration object
   * @param stepName - Name of the step (for error messages)
   * @throws Error if configuration is invalid
   * @private
   */
  private validateCallConfig(callConfig: any, stepName: string): void {
    if (
      callConfig.variables &&
      (typeof callConfig.variables !== "object" ||
        Array.isArray(callConfig.variables))
    ) {
      throw new Error(
        `Call variables for step '${stepName}' must be an object with key/value pairs`
      );
    }

    if (
      callConfig.on_error &&
      !["fail", "continue", "warn"].includes(callConfig.on_error)
    ) {
      throw new Error(
        `Invalid call error strategy '${callConfig.on_error}' in step '${stepName}'. Allowed values: fail, continue, warn`
      );
    }

    if (typeof callConfig.test !== "string") {
      throw new Error(
        `Call configuration for step '${stepName}' must define 'test' as string`
      );
    }

    if (typeof callConfig.step !== "string") {
      throw new Error(
        `Call configuration for step '${stepName}' must define 'step' as string`
      );
    }
  }

  /**
   * Interpolates variables in call configuration.
   *
   * @param variables - Variables object to interpolate
   * @param globalVariables - Global variables service
   * @returns Interpolated variables object
   * @private
   */
  private interpolateCallVariables(
    variables: Record<string, any> | undefined,
    globalVariables: any
  ): Record<string, any> | undefined {
    if (!variables) {
      return undefined;
    }

    return globalVariables.interpolate(variables);
  }

  /**
   * Determines final status from call result.
   *
   * @param callResult - Call result object
   * @returns Status string
   * @private
   */
  private determineStatus(
    callResult: StepCallResult
  ): "success" | "failure" | "skipped" {
    return callResult.status ?? (callResult.success ? "success" : "failure");
  }

  /**
   * Filters out internal variables (starting with _).
   *
   * @param variables - All variables
   * @returns Filtered variables without internal ones
   * @private
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
