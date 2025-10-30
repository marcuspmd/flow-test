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

import { BaseStepStrategy } from "./base-step.strategy";
import type { StepExecutionContext } from "./step-execution.strategy";
import type { StepExecutionResult } from "../../../types/config.types";
import type { TestStep } from "../../../types/engine.types";
import type {
  StepCallRequest,
  StepCallExecutionOptions,
  StepCallResult,
} from "../../../types/call.types";
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
 * @extends {BaseStepStrategy}
 */
export class CallStepStrategy extends BaseStepStrategy {
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
      const alias = callConfig.alias
        ? globalVariables.interpolateString(callConfig.alias).trim()
        : undefined;

      // **6. Build call request and options**
      const callRequest: StepCallRequest = {
        test: resolvedTestPath,
        path_type: callConfig.path_type,
        step: resolvedStepKey,
        variables: interpolatedVariables,
        alias: alias, // Pass alias to CallService for variable prefixing
        isolate_context: isolateContext,
        timeout: callConfig.timeout,
        retry: callConfig.retry,
        on_error: callConfig.on_error,
      };

      const allowedRoot = path.resolve(
        context.configManager?.getConfig().test_directory || "./tests"
      );

      // **6.5. Get step execution handler from ExecutionService**
      const stepExecutionHandler =
        context.executionService?.getStepExecutionHandler();

      const callOptions: StepCallExecutionOptions = {
        callerSuitePath,
        callerNodeId: suite.node_id,
        callerSuiteName: suite.suite_name,
        allowedRoot,
        callStack: context.stepCallStack || [],
        stepExecutionHandler,
      };

      const callLabel = `${resolvedTestPath}::${resolvedStepKey}`;
      const aliasLabel = alias ? ` [alias: ${alias}]` : "";

      logger.info(
        `📞 Calling step '${callLabel}'${aliasLabel} (isolate=${isolateContext})`,
        {
          stepName: step.name,
          metadata: {
            type: "step_call",
            internal: true,
            suite: suite.suite_name,
            alias: alias || "",
          },
        }
      );

      // **6.8. Execute pre-call hooks**
      await this.executeHooks(context, step.hooks_pre_call, "pre_call");

      // **7. Execute the call**
      const callResult = await callService.executeStepCall(
        callRequest,
        callOptions
      );

      // **7.5. Propagate variables BEFORE hooks_post_call**
      //       This ensures hooks can access captured variables via {{alias.variable}}
      const propagatedVariables = callResult.propagated_variables;
      if (propagatedVariables && Object.keys(propagatedVariables).length > 0) {
        logger.debug(
          `Propagating ${
            Object.keys(propagatedVariables).length
          } variables from call (alias=${alias}, isolate=${isolateContext})`,
          {
            stepName: step.name,
            metadata: {
              type: "step_call_propagate",
              internal: true,
              variables: Object.keys(propagatedVariables),
            },
          }
        );

        // Set runtime variables immediately so hooks can access them
        globalVariables.setRuntimeVariables(propagatedVariables);

        if (alias && isolateContext) {
          const aliasPrefix = `${alias}.`;
          const variablesToExport: string[] = [];
          const unprefixedVariables: Record<string, any> = {};

          for (const [key, value] of Object.entries(propagatedVariables)) {
            // Variables already come with alias prefix from processCapturedVariables
            if (key.startsWith(aliasPrefix)) {
              // Remove the alias prefix to get the original variable name
              const unprefixedKey = key.substring(aliasPrefix.length);
              variablesToExport.push(unprefixedKey);
              unprefixedVariables[unprefixedKey] = value;
            } else {
              // Fallback: if for some reason the variable doesn't have the prefix
              // (shouldn't happen with isolate_context: true), export it as-is
              logger.debug(
                `Variable '${key}' does not have expected alias prefix '${aliasPrefix}'`,
                {
                  stepName: step.name,
                  metadata: { type: "step_call", internal: true, alias: alias },
                }
              );
              variablesToExport.push(key);
              unprefixedVariables[key] = value;
            }
          }

          if (variablesToExport.length > 0) {
            globalVariables.exportVariables(
              alias,
              callResult.suite_name || suite.suite_name,
              variablesToExport,
              unprefixedVariables
            );

            logger.debug(
              `Registered ${
                variablesToExport.length
              } variable(s) under alias '${alias}' BEFORE hooks_post_call: ${variablesToExport.join(
                ", "
              )}`,
              {
                stepName: step.name,
                metadata: {
                  type: "step_call",
                  internal: true,
                  alias: alias,
                  variables: variablesToExport,
                },
              }
            );
          }
        }
      }

      // **7.6. Execute post-call hooks with call result context**
      await this.executeHooks(context, step.hooks_post_call, "post_call", {
        call_result: callResult,
        propagated_variables: propagatedVariables,
        success: callResult.success,
        status: this.determineStatus(callResult),
      });

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

      // **9. Variables already propagated in step 7.5 (before hooks_post_call)**
      //     This section was moved earlier to ensure hooks have access to captured variables

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
          globalVariables.getAllVariables(),
          { stepType: "call", stepName: step.name }
        ),
        error_message: callResult.error,
        // Include request/response details from nested call execution
        request_details: callResult.request_details,
        response_details: callResult.response_details,
        // Include assertions executed in the nested call
        assertions_results: callResult.assertions_results || [],
        // Include nested steps if present (for recursive calls or scenarios)
        ...(callResult.nested_steps && callResult.nested_steps.length > 0
          ? { scenarios_results: callResult.nested_steps }
          : {}),
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
   * Executes lifecycle hooks at specified hook points.
   *
   * @param context - Step execution context
   * @param hooks - Array of hooks to execute
   * @param hookPoint - Name of the hook point (e.g., "pre_call", "post_call")
   * @param additionalContext - Additional context data to pass to hooks
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

  // filterAvailableVariables and buildFailureResult methods moved to BaseStepStrategy
  // to eliminate code duplication across all strategies
}
