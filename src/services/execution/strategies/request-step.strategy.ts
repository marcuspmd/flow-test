/**
 * @fileoverview Strategy for executing HTTP request steps.
 *
 * @remarks
 * Handles the complete execution flow for test steps that make HTTP requests,
 * including pre/post-request scripts, assertions, variable capture, and scenario processing.
 *
 * **Execution Flow:**
 * 1. Execute pre-request script (if configured)
 * 2. Interpolate variables in request
 * 3. Apply certificate configuration (step-level or suite-level)
 * 4. Execute HTTP request
 * 5. Execute post-request script (if configured)
 * 6. Process conditional scenarios
 * 7. Execute assertions
 * 8. Capture variables with JMESPath
 * 9. Build result object
 *
 * @packageDocumentation
 */

import { BaseStepStrategy } from "./base-step.strategy";
import type { StepExecutionContext } from "./step-execution.strategy";
import type {
  TestStep,
  StepExecutionResult,
  InputExecutionContext,
} from "../../../types/engine.types";
import type { DynamicVariableAssignment } from "../../../types/common.types";

/**
 * Strategy for executing HTTP request-based test steps.
 *
 * @remarks
 * This strategy handles the most common test step type: HTTP requests with
 * optional pre/post-processing, assertions, and variable capture.
 *
 * **Responsibilities:**
 * - Pre-request script execution
 * - HTTP request execution with proper certificate handling
 * - Post-request script execution
 * - Conditional scenario processing
 * - Assertion validation
 * - Variable capture from responses
 * - Performance metrics recording
 *
 * **Design Goals:**
 * - Single Responsibility: Handles only HTTP request steps
 * - Testability: All logic in private methods with clear inputs/outputs
 * - Error Handling: Comprehensive error handling with detailed messages
 * - Performance: Efficient variable interpolation and capture
 *
 * @example Basic HTTP request step
 * ```typescript
 * const step: TestStep = {
 *   name: "Get user data",
 *   request: {
 *     method: "GET",
 *     url: "/users/{{user_id}}"
 *   },
 *   assert: {
 *     status_code: 200,
 *     body: {
 *       id: { exists: true }
 *     }
 *   },
 *   capture: {
 *     user_name: "body.name"
 *   }
 * };
 *
 * const strategy = new RequestStepStrategy();
 * const result = await strategy.execute(context);
 * ```
 *
 * @example With pre/post-request scripts
 * ```typescript
 * const step: TestStep = {
 *   name: "Create user",
 *   pre_request: {
 *     script: "variables.timestamp = Date.now();"
 *   },
 *   request: {
 *     method: "POST",
 *     url: "/users",
 *     body: {
 *       name: "John",
 *       created_at: "{{timestamp}}"
 *     }
 *   },
 *   post_request: {
 *     script: "variables.user_created = response.status === 201;"
 *   }
 * };
 * ```
 *
 * @public
 */
export class RequestStepStrategy extends BaseStepStrategy {
  /**
   * Determines if this strategy can handle the given step.
   *
   * @param step - Test step to evaluate
   * @returns `true` if step has request and no wrapping features (iterate/call)
   *
   * @remarks
   * Request strategy handles steps that:
   * - Have a `request` configuration
   * - Do NOT have `iterate` (handled by IteratedStepStrategy)
   * - Do NOT have `call` (handled by CallStepStrategy)
   *
   * This is typically the fallback strategy for most test steps.
   */
  canHandle(step: TestStep): boolean {
    return !!step.request && !step.iterate && !step.call;
  }

  /**
   * Executes the HTTP request step and returns the result.
   *
   * @param context - Execution context with all dependencies
   * @returns Promise resolving to step execution result
   *
   * @remarks
   * **Execution Order:**
   * 1. Pre-request script (optional)
   * 2. Variable interpolation
   * 3. Certificate configuration
   * 4. HTTP request execution
   * 5. Post-request script (optional)
   * 6. Scenario processing (optional)
   * 7. Assertions (optional)
   * 8. Variable capture (optional)
   * 9. Input processing (optional - for hybrid steps)
   *
   * **Error Handling:**
   * - Pre/post-request script errors: Continue if `continue_on_error` is true
   * - HTTP errors: Return failure result with error message
   * - Assertion failures: Return failure result with failed assertions
   * - Capture errors: Log warning but don't fail step
   */
  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const { step, suite, identifiers, globalVariables, logger } = context;

    try {
      // Validate step configuration
      if (!step.request) {
        throw new Error(
          `Step '${step.name}' must have 'request' configuration for RequestStepStrategy`
        );
      }

      let capturedVariables: Record<string, any> = {};
      let assertionResults: any[] = [];

      // **1. Execute pre-request hooks**
      await this.executeHooks(context, step.hooks_pre_request, "pre_request");

      // **2. Execute pre-request script**
      await this.executePreRequestScript(context);

      // **3. Interpolate variables and apply certificate**
      const rawRequestUrl = step.request.url;
      const interpolatedRequest = globalVariables.interpolate(step.request);

      // Apply suite-level certificate if no request-specific certificate
      if (!interpolatedRequest.certificate && suite.certificate) {
        const interpolatedCertificate = globalVariables.interpolate(
          suite.certificate
        );
        interpolatedRequest.certificate = interpolatedCertificate;
        logger.debug(
          `Applied suite-level certificate to request: ${step.name}`
        );
      } else if (interpolatedRequest.certificate) {
        logger.debug(`Using step-level certificate for request: ${step.name}`);
      }

      // **4. Execute HTTP request**
      const httpResult = await context.httpService.executeRequest(
        step.name,
        interpolatedRequest
      );

      // Attach raw URL for debugging
      this.attachRawUrl(httpResult, rawRequestUrl);

      // **5. Execute post-request hooks**
      await this.executeHooks(
        context,
        step.hooks_post_request,
        "post_request",
        {
          response: {
            status: httpResult.response_details?.status_code,
            status_code: httpResult.response_details?.status_code,
            headers: httpResult.response_details?.headers || {},
            body: httpResult.response_details?.body,
            data: httpResult.response_details?.body,
            response_time_ms: httpResult.duration_ms || 0,
          },
        }
      );

      // **6. Execute post-request script**
      await this.executePostRequestScript(
        context,
        httpResult,
        interpolatedRequest
      );

      // **7. Process conditional scenarios**
      await this.processScenarios(context, httpResult);

      // **8. Execute pre-assertion hooks**
      await this.executeHooks(
        context,
        step.hooks_pre_assertion,
        "pre_assertion",
        {
          response: {
            status: httpResult.response_details?.status_code,
            status_code: httpResult.response_details?.status_code,
            headers: httpResult.response_details?.headers || {},
            body: httpResult.response_details?.body,
            data: httpResult.response_details?.body,
            response_time_ms: httpResult.duration_ms || 0,
          },
        }
      );

      // **9. Execute assertions**
      assertionResults = await this.executeAssertions(context, httpResult);
      httpResult.assertions_results = assertionResults;

      // Check for assertion failures
      const failedAssertions = assertionResults.filter((a) => !a.passed);
      if (failedAssertions.length > 0) {
        httpResult.status = "failure";
        httpResult.error_message = `${failedAssertions.length} assertion(s) failed`;
      }

      // **10. Execute post-assertion hooks**
      await this.executeHooks(
        context,
        step.hooks_post_assertion,
        "post_assertion",
        {
          response: {
            status: httpResult.response_details?.status_code,
            status_code: httpResult.response_details?.status_code,
            headers: httpResult.response_details?.headers || {},
            body: httpResult.response_details?.body,
            data: httpResult.response_details?.body,
            response_time_ms: httpResult.duration_ms || 0,
          },
          assertions: assertionResults,
        }
      );

      // **11. Execute pre-capture hooks**
      await this.executeHooks(context, step.hooks_pre_capture, "pre_capture", {
        response: {
          status: httpResult.response_details?.status_code,
          status_code: httpResult.response_details?.status_code,
          headers: httpResult.response_details?.headers || {},
          body: httpResult.response_details?.body,
          data: httpResult.response_details?.body,
          response_time_ms: httpResult.duration_ms || 0,
        },
      });

      // **12. Capture variables**
      capturedVariables = await this.captureVariables(context, httpResult);

      // **13. Execute post-capture hooks**
      await this.executeHooks(
        context,
        step.hooks_post_capture,
        "post_capture",
        {
          captured: capturedVariables,
        }
      );

      // **8. Process input if present (hybrid request+input step)**
      let inputResults: any[] | undefined;
      let dynamicAssignments: DynamicVariableAssignment[] = [];

      if (step.input) {
        const inputProcessingResult = await this.processInputIfPresent(context);
        inputResults = inputProcessingResult.inputResults;
        dynamicAssignments = inputProcessingResult.dynamicAssignments;

        // Merge input captures with request captures
        if (inputProcessingResult.capturedVariables) {
          capturedVariables = {
            ...capturedVariables,
            ...inputProcessingResult.capturedVariables,
          };
        }
      }

      // **9. Build success result**
      const duration = Date.now() - startTime;

      const result: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: httpResult.status || "success",
        duration_ms: duration,
        request_details: httpResult.request_details,
        response_details: httpResult.response_details,
        assertions_results: assertionResults,
        captured_variables: capturedVariables,
        ...(inputResults ? { input_results: inputResults } : {}),
        ...(dynamicAssignments.length > 0
          ? { dynamic_assignments: dynamicAssignments }
          : {}),
        available_variables: this.filterAvailableVariables(
          globalVariables.getAllVariables()
        ),
        scenarios_meta: (httpResult as any).scenarios_meta,
        error_message: httpResult.error_message,
      };

      return result;
    } catch (error) {
      // **10. Build failure result**
      return this.buildFailureResult(context, error, startTime);
    }
  }

  /**
   * Executes pre-request script if configured.
   *
   * @param context - Execution context
   * @private
   */
  private async executePreRequestScript(
    context: StepExecutionContext
  ): Promise<void> {
    const {
      step,
      globalVariables,
      scriptExecutorService,
      logger,
      discoveredTest,
    } = context;

    if (!step.pre_request) {
      return;
    }

    try {
      logger.debug(`Executing pre-request script for step '${step.name}'`);

      const currentVariables = globalVariables.getAllVariables();
      const requestCopy = JSON.parse(JSON.stringify(step.request));

      // Ensure headers is always an object
      if (!requestCopy.headers) {
        requestCopy.headers = {};
      }

      const scriptResult = await scriptExecutorService.executePreRequestScript(
        step.pre_request,
        currentVariables,
        requestCopy,
        discoveredTest?.file_path
      );

      // Apply variables set by the script
      if (Object.keys(scriptResult.variables).length > 0) {
        globalVariables.setRuntimeVariables(scriptResult.variables);
        logger.debug(
          `Pre-request script set ${
            Object.keys(scriptResult.variables).length
          } variable(s)`
        );
      }

      // Apply modified request if script changed it
      if (scriptResult.modified_request && step.request) {
        Object.assign(step.request, scriptResult.modified_request);
        logger.debug("Request modified by pre-request script");
      }

      // Log console output if any
      if (
        scriptResult.console_output &&
        scriptResult.console_output.length > 0
      ) {
        scriptResult.console_output.forEach((log) => logger.debug(log));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Pre-request script failed: ${errorMessage}`);

      if (!step.pre_request.continue_on_error) {
        throw error;
      }
    }
  }

  /**
   * Executes post-request script if configured.
   *
   * @param context - Execution context
   * @param httpResult - HTTP execution result
   * @param interpolatedRequest - Interpolated request details
   * @private
   */
  private async executePostRequestScript(
    context: StepExecutionContext,
    httpResult: any,
    interpolatedRequest: any
  ): Promise<void> {
    const {
      step,
      globalVariables,
      scriptExecutorService,
      logger,
      discoveredTest,
    } = context;

    if (!step.post_request || !httpResult.response_details) {
      return;
    }

    try {
      logger.debug(`Executing post-request script for step '${step.name}'`);

      const currentVariables = globalVariables.getAllVariables();

      const scriptResult = await scriptExecutorService.executePostRequestScript(
        step.post_request,
        currentVariables,
        {
          method: interpolatedRequest.method,
          url: httpResult.request_details?.url || interpolatedRequest.url,
          headers: interpolatedRequest.headers || {},
          body: interpolatedRequest.body,
          params: interpolatedRequest.params,
        },
        {
          status: httpResult.response_details.status,
          status_code: httpResult.response_details.status,
          headers: httpResult.response_details.headers || {},
          body: httpResult.response_details.body,
          data: httpResult.response_details.body,
          response_time_ms: httpResult.response_time || 0,
        },
        discoveredTest?.file_path
      );

      // Apply variables set by the script
      if (Object.keys(scriptResult.variables).length > 0) {
        globalVariables.setRuntimeVariables(scriptResult.variables);
        logger.debug(
          `Post-request script set ${
            Object.keys(scriptResult.variables).length
          } variable(s)`
        );

        // Also add to captured variables for this step
        if (!httpResult.captured_variables) {
          httpResult.captured_variables = {};
        }
        Object.assign(httpResult.captured_variables, scriptResult.variables);
      }

      // Log console output if any
      if (
        scriptResult.console_output &&
        scriptResult.console_output.length > 0
      ) {
        scriptResult.console_output.forEach((log) => logger.debug(log));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Post-request script failed: ${errorMessage}`);

      if (!step.post_request.continue_on_error) {
        throw error;
      }
    }
  }

  /**
   * Processes conditional scenarios if configured.
   *
   * @param context - Execution context
   * @param httpResult - HTTP execution result
   * @private
   */
  private async processScenarios(
    context: StepExecutionContext,
    httpResult: any
  ): Promise<void> {
    const { step, globalVariables, scenarioService } = context;

    if (
      !step.scenarios ||
      !Array.isArray(step.scenarios) ||
      !httpResult.response_details
    ) {
      return;
    }

    // Interpolate variables in scenarios before processing
    const interpolatedScenarios = globalVariables.interpolate(step.scenarios);

    scenarioService.processScenarios(
      interpolatedScenarios,
      httpResult,
      "verbose"
    );
  }

  /**
   * Executes assertions if configured.
   *
   * @param context - Execution context
   * @param httpResult - HTTP execution result
   * @returns Array of assertion results
   * @private
   */
  private async executeAssertions(
    context: StepExecutionContext,
    httpResult: any
  ): Promise<any[]> {
    const { step, globalVariables, assertionService } = context;

    if (!step.assert || !httpResult.response_details) {
      return [];
    }

    // Interpolate assertion values before validation
    const interpolatedAssertions = globalVariables.interpolate(step.assert);

    return assertionService.validateAssertions(
      interpolatedAssertions,
      httpResult
    );
  }

  /**
   * Captures variables from HTTP response.
   *
   * @param context - Execution context
   * @param httpResult - HTTP execution result
   * @returns Captured variables object
   * @private
   */
  private async captureVariables(
    context: StepExecutionContext,
    httpResult: any
  ): Promise<Record<string, any>> {
    const { step, suite, globalVariables, captureService } = context;

    let capturedVariables: Record<string, any> = {};

    // First, include any variables captured by scenarios
    if (httpResult.captured_variables) {
      capturedVariables = { ...httpResult.captured_variables };

      // Make sure scenario-captured variables are also available globally
      if (Object.keys(capturedVariables).length > 0) {
        globalVariables.setRuntimeVariables(
          this.processCapturedVariables(capturedVariables, suite)
        );
      }
    }

    // Then, capture variables from step.capture configuration
    if (step.capture && httpResult.response_details) {
      const currentVariables = globalVariables.getAllVariables();

      const stepCapturedVariables = captureService.captureVariables(
        step.capture,
        httpResult,
        currentVariables
      );

      // Merge step captures with scenario captures
      capturedVariables = {
        ...capturedVariables,
        ...stepCapturedVariables,
      };
      httpResult.captured_variables = capturedVariables;

      // Immediately update runtime variables so they're available for next steps
      if (Object.keys(stepCapturedVariables).length > 0) {
        globalVariables.setRuntimeVariables(
          this.processCapturedVariables(stepCapturedVariables, suite)
        );
      }
    }

    return capturedVariables;
  }

  /**
   * Processes input configuration if present (hybrid request+input steps).
   *
   * @param context - Execution context
   * @returns Input processing result with captures and assignments
   * @private
   *
   * @remarks
   * This handles the less common case of steps that have both request and input.
   * Most input-only steps are handled by InputStepStrategy.
   */
  private async processInputIfPresent(context: StepExecutionContext): Promise<{
    inputResults?: any[];
    dynamicAssignments: DynamicVariableAssignment[];
    capturedVariables?: Record<string, any>;
  }> {
    const {
      step,
      suite,
      stepIndex,
      globalVariables,
      inputService,
      captureService,
      discoveredTest,
      logger,
    } = context;

    if (!step.input) {
      return { dynamicAssignments: [] };
    }

    try {
      // Set execution context for interactive inputs
      const executionContext: InputExecutionContext = {
        suite_name: suite.suite_name,
        suite_path: discoveredTest?.file_path,
        step_name: step.name,
        step_id: step.step_id,
        step_index: stepIndex,
        cache_key: `${suite.node_id || suite.suite_name}::${step.name}`,
      };

      // Process inputs
      const inputConfigs = Array.isArray(step.input)
        ? step.input
        : [step.input];
      const currentVariables = globalVariables.getAllVariables();
      const inputResults = await inputService.promptMultipleInputs(
        inputConfigs,
        currentVariables
      );

      const dynamicAssignments: DynamicVariableAssignment[] = [];
      let additionalCaptures: Record<string, any> = {};

      // CRITICAL: Register input variables in runtime (so they can be exported)
      inputResults.forEach((inputResult: any) => {
        if (inputResult.validation_passed) {
          // Store input value as runtime variable
          globalVariables.setRuntimeVariable(
            inputResult.variable,
            inputResult.value
          );

          // Add to captures so it appears in step result
          additionalCaptures[inputResult.variable] = inputResult.value;

          logger.info(
            `✅ Input captured: ${inputResult.variable} = ${
              inputResult.used_default ? "(default)" : "(user input)"
            }`
          );
        }

        // Process dynamic assignments from inputs
        if (inputResult.derived_assignments) {
          dynamicAssignments.push(...inputResult.derived_assignments);
        }
      });

      // Process step.capture after input (allows capturing/transforming input values)
      if (step.capture) {
        try {
          const currentVariables = globalVariables.getAllVariables();

          const stepCapturedVariables = captureService.captureFromObject(
            step.capture,
            currentVariables,
            currentVariables
          );

          additionalCaptures = stepCapturedVariables;

          // Update runtime variables immediately
          if (Object.keys(stepCapturedVariables).length > 0) {
            globalVariables.setRuntimeVariables(
              this.processCapturedVariables(stepCapturedVariables, suite)
            );
          }
        } catch (error) {
          logger.error(
            `❌ Error processing step.capture after input: ${error}`
          );
        }
      }

      return {
        inputResults,
        dynamicAssignments,
        capturedVariables: additionalCaptures,
      };
    } catch (error) {
      logger.error(`❌ Input processing error: ${error}`);
      return { dynamicAssignments: [] };
    }
  }

  /**
   * Attaches raw URL to result for debugging.
   *
   * @param result - HTTP result object
   * @param rawUrl - Raw URL before interpolation
   * @private
   */
  private attachRawUrl(result: any, rawUrl: string): void {
    if (result.request_details) {
      result.request_details.raw_url = rawUrl;
    }
  }

  /**
   * Processes captured variables for global registry.
   *
   * @param variables - Captured variables
   * @param suite - Test suite
   * @returns Processed variables
   * @private
   *
   * @remarks
   * This method is currently a pass-through but exists for consistency
   * with the original ExecutionService implementation and future enhancements.
   */
  private processCapturedVariables(
    variables: Record<string, any>,
    suite: any
  ): Record<string, any> {
    // Currently just returns variables as-is
    // Future: could add suite-specific processing, validation, etc.
    return variables;
  }

  /**
   * Intelligently filters and masks available variables for request step context
   *
   * @param variables - All variables
   * @returns Filtered, masked, and summarized variables
   * @private
   *
   * @remarks
   * Uses smart filtering to show only relevant variables for HTTP request context.
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
        key.includes("_response") ||
        key.includes("_result")
      ) {
        recentCaptures.add(key);
      }
    }

    return smartFilterAndMask(
      variables,
      {
        stepType: "request",
        recentCaptures,
        isFirstStep: false,
      },
      {
        alwaysInclude: ["base_url", "auth_token", "api_key"],
        alwaysExclude: ["PATH", "HOME", "USER", "SHELL", "PWD", "LANG"],
        maxPerCategory: 6,
      },
      {
        maxDepth: 2,
        maxObjectSize: 15,
        maxArrayLength: 3,
        maxStringLength: 150,
      }
    );
  }

  /**
   * Builds failure result when step execution fails.
   *
   * @param context - Execution context
   * @param error - Error that caused failure
   * @param startTime - Step start timestamp
   * @returns Failure result
   * @private
   */
  private buildFailureResult(
    context: StepExecutionContext,
    error: any,
    startTime: number
  ): StepExecutionResult {
    const { step, identifiers, globalVariables, httpService } = context;
    const duration = Date.now() - startTime;

    const errorResult: StepExecutionResult = {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: "failure",
      duration_ms: duration,
      error_message: `Step execution error: ${error}`,
      captured_variables: {},
      available_variables: this.filterAvailableVariables(
        globalVariables.getAllVariables()
      ),
    };

    // Add request details if available
    if (step.request?.url) {
      errorResult.request_details = {
        method: step.request.method || "GET",
        url: step.request.url,
        raw_url: step.request.url,
        base_url: httpService.getBaseUrl(),
      };
    }

    return errorResult;
  }

  /**
   * Executes lifecycle hooks at the appropriate point
   *
   * @param context - Execution context
   * @param hooks - Array of hook actions to execute
   * @param hookPoint - Name of the hook point (for logging)
   * @param additionalContext - Additional context data (e.g., response, captured vars)
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
