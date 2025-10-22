/**
 * @fileoverview Strategy for handling scenario-only steps.
 * These are steps that have scenarios but no request, input, call, or iterate.
 */

import * as jmespath from "jmespath";
import type {
  StepExecutionStrategy,
  StepExecutionContext,
} from "./step-execution.strategy";
import type { TestStep } from "../../../types/engine.types";
import type { StepExecutionResult } from "../../../types/config.types";

/**
 * Represents evaluation metadata for a single scenario.
 */
interface ScenarioEvaluation {
  index: number;
  condition: string;
  matched: boolean;
  executed: boolean;
  branch: "then" | "else" | "none";
  assertions_added: number;
  captures_added: number;
}

/**
 * Strategy for steps with scenarios only (no request, input, call, or iterate).
 */
export class ScenarioStepStrategy implements StepExecutionStrategy {
  /**
   * Checks if this strategy can handle the given step.
   * Returns true only if step has scenarios but no request, input, call, or iterate.
   */
  canHandle(step: TestStep): boolean {
    return (
      !!step.scenarios &&
      Array.isArray(step.scenarios) &&
      step.scenarios.length > 0 && // Must have at least one scenario
      !step.request &&
      !step.input &&
      !step.call &&
      !step.iterate
    );
  }

  /**
   * Executes the scenario-only step by evaluating conditions and executing matching scenarios.
   */
  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    const stepStartTime = Date.now();
    const {
      step,
      suite,
      identifiers,
      logger,
      globalVariables,
      httpService,
      assertionService,
      captureService,
      scenarioService,
    } = context;

    try {
      // Validate step has scenarios
      if (!step.scenarios || !Array.isArray(step.scenarios)) {
        throw new Error(
          `Step '${step.name}' (${identifiers.stepId}) must have 'scenarios' array`
        );
      }

      if (step.scenarios.length === 0) {
        logger.warn(`⚠️ Step '${step.name}' has empty scenarios array`);
        return this.buildEmptyResult(
          identifiers,
          step,
          stepStartTime,
          globalVariables.getAllVariables()
        );
      }

      // Execute scenarios
      let executedScenario = false;
      const evaluations: ScenarioEvaluation[] = [];
      let httpResult: any = null;
      let assertionResults: any[] = [];
      let capturedVariables: Record<string, any> = {};

      for (let i = 0; i < step.scenarios.length; i++) {
        const scenario = step.scenarios[i];

        // Evaluate the condition using context
        const evalContext = {
          status: httpResult?.response_details?.status || 0,
          status_code: httpResult?.response_details?.status || 0,
          headers: httpResult?.response_details?.headers || {},
          body: httpResult?.response_details?.body || null,
          ...globalVariables.getAllVariables(),
        };

        // Use ScenarioService's processScenarios helper method
        // For now, evaluate condition directly with JMESPath-like logic
        let conditionMet = false;
        try {
          conditionMet = this.evaluateCondition(
            scenario.condition,
            evalContext
          );
        } catch (error: any) {
          logger.warn(
            `⚠️ Error evaluating scenario condition: ${scenario.condition}`,
            { error }
          );

          // Record evaluation and continue to next scenario
          evaluations.push({
            index: i + 1,
            condition: scenario.condition,
            matched: false,
            executed: false,
            branch: "none",
            assertions_added: 0,
            captures_added: 0,
          });
          continue;
        }

        logger.debug(
          `🔍 Scenario ${i + 1}/${step.scenarios.length}: "${
            scenario.condition
          }" → ${conditionMet ? "MATCHED" : "NOT MATCHED"}`
        );

        if (conditionMet && scenario.then) {
          logger.info(`✅ Executing scenario ${i + 1}: ${scenario.condition}`);

          // Execute the scenario's request if it exists
          // Note: TypeScript types don't include 'request' but runtime code does
          const scenarioThen = scenario.then as any;
          if (scenarioThen.request) {
            const interpolatedRequest = globalVariables.interpolate(
              scenarioThen.request
            );

            // Apply suite-level certificate if no request-specific certificate
            if (!interpolatedRequest.certificate && suite.certificate) {
              const interpolatedCertificate = globalVariables.interpolate(
                suite.certificate
              );
              interpolatedRequest.certificate = interpolatedCertificate;
            }

            httpResult = await httpService.executeRequest(
              step.name,
              interpolatedRequest
            );

            logger.debug(
              `📡 Request executed: ${httpResult.request_details?.method} ${httpResult.request_details?.url}`
            );
          }

          // Execute assertions from scenario
          if (scenario.then.assert && httpResult?.response_details) {
            const interpolatedAssertions = globalVariables.interpolate(
              scenario.then.assert
            );

            assertionResults = assertionService.validateAssertions(
              interpolatedAssertions,
              httpResult.response_details
            );

            httpResult.assertions_results = assertionResults;

            const failedAssertions = assertionResults.filter(
              (a: any) => !a.passed
            );

            if (failedAssertions.length > 0) {
              httpResult.status = "failure";
              httpResult.error_message = `${failedAssertions.length} assertion(s) failed`;

              logger.warn(
                `⚠️ ${failedAssertions.length} assertion(s) failed in scenario`
              );
            } else {
              logger.debug(
                `✅ All ${assertionResults.length} assertion(s) passed`
              );
            }
          }

          // Execute captures from scenario
          if (scenario.then.capture && httpResult?.response_details) {
            const currentVariables = globalVariables.getAllVariables();

            capturedVariables = captureService.captureVariables(
              scenario.then.capture,
              httpResult.response_details,
              currentVariables
            );

            httpResult.captured_variables = capturedVariables;

            if (Object.keys(capturedVariables).length > 0) {
              globalVariables.setRuntimeVariables(capturedVariables);

              logger.info(
                `📥 Captured ${
                  Object.keys(capturedVariables).length
                } variable(s): ${Object.keys(capturedVariables).join(", ")}`
              );
            }
          }

          // Execute static variables from scenario
          if (scenario.then.variables) {
            const interpolatedVars = globalVariables.interpolate(
              scenario.then.variables
            );
            globalVariables.setRuntimeVariables(interpolatedVars);

            logger.debug(
              `📝 Set ${
                Object.keys(interpolatedVars).length
              } static variable(s)`
            );
          }

          executedScenario = true;

          evaluations.push({
            index: i + 1,
            condition: scenario.condition,
            matched: true,
            executed: true,
            branch: "then",
            assertions_added: assertionResults.length,
            captures_added: Object.keys(capturedVariables || {}).length,
          });

          break; // Stop after first matching scenario
        }

        // Execute else block if condition not met and else exists
        if (!conditionMet && scenario.else) {
          logger.info(
            `⚠️ Executing else block for scenario ${i + 1}: ${
              scenario.condition
            }`
          );

          // Execute assertions from else block
          if (scenario.else.assert && httpResult?.response_details) {
            const interpolatedAssertions = globalVariables.interpolate(
              scenario.else.assert
            );

            assertionResults = assertionService.validateAssertions(
              interpolatedAssertions,
              httpResult.response_details
            );

            const failedAssertions = assertionResults.filter(
              (a: any) => !a.passed
            );

            if (failedAssertions.length > 0) {
              logger.warn(
                `⚠️ ${failedAssertions.length} assertion(s) failed in else block`
              );
            }
          }

          // Execute captures from else block
          if (scenario.else.capture && httpResult?.response_details) {
            const currentVariables = globalVariables.getAllVariables();

            capturedVariables = captureService.captureVariables(
              scenario.else.capture,
              httpResult.response_details,
              currentVariables
            );

            if (Object.keys(capturedVariables).length > 0) {
              globalVariables.setRuntimeVariables(capturedVariables);

              logger.info(
                `📥 Captured ${
                  Object.keys(capturedVariables).length
                } variable(s) from else block`
              );
            }
          }

          // Execute static variables from else block
          if (scenario.else.variables) {
            const interpolatedVars = globalVariables.interpolate(
              scenario.else.variables
            );
            globalVariables.setRuntimeVariables(interpolatedVars);

            logger.debug(
              `📝 Set ${
                Object.keys(interpolatedVars).length
              } static variable(s) from else block`
            );
          }

          executedScenario = true;

          evaluations.push({
            index: i + 1,
            condition: scenario.condition,
            matched: false,
            executed: true,
            branch: "else",
            assertions_added: assertionResults.length,
            captures_added: Object.keys(capturedVariables || {}).length,
          });

          break; // Stop after executing else block
        }

        // Not matched and no else block
        evaluations.push({
          index: i + 1,
          condition: scenario.condition,
          matched: conditionMet,
          executed: false,
          branch: "none",
          assertions_added: 0,
          captures_added: 0,
        });
      }

      const stepDuration = Date.now() - stepStartTime;

      // No scenario matched
      if (!executedScenario) {
        logger.info(`⏭️ No scenarios matched for step: ${step.name}`);

        return this.buildSkippedResult(
          identifiers,
          step,
          stepDuration,
          globalVariables.getAllVariables(),
          evaluations
        );
      }

      // Build success result
      return this.buildSuccessResult(
        identifiers,
        step,
        stepDuration,
        httpResult,
        assertionResults,
        capturedVariables,
        globalVariables.getAllVariables(),
        evaluations
      );
    } catch (error: any) {
      logger.error(
        `❌ Error executing scenario step '${step.name}': ${error.message}`
      );

      return this.buildFailureResult(
        identifiers,
        step,
        error,
        Date.now() - stepStartTime,
        globalVariables.getAllVariables()
      );
    }
  }

  /**
   * Evaluates a JMESPath condition against the context.
   */
  private evaluateCondition(
    condition: string,
    context: Record<string, any>
  ): boolean {
    try {
      // Pre-process condition to fix common JMESPath issues
      const processedCondition = this.preprocessJMESPathCondition(condition);

      const conditionResult = jmespath.search(context, processedCondition);

      // Converts the result to boolean
      if (typeof conditionResult === "boolean") {
        return conditionResult;
      }

      // Handles truthy/falsy values
      return Boolean(conditionResult);
    } catch (error: any) {
      throw new Error(
        `Invalid JMESPath condition '${condition}': ${error.message}`
      );
    }
  }

  /**
   * Preprocesses JMESPath condition to fix common syntax issues.
   */
  private preprocessJMESPathCondition(condition: string): string {
    // Handle $env variables - these should be interpolated before JMESPath
    if (condition.includes("$env.")) {
      // For now, replace $env variables with null if they contain invalid JMESPath chars
      condition = condition.replace(/\$env\.[A-Z_][A-Z0-9_]*/g, "`null`");
    }

    // Fix numbers without backticks: "status_code == 200" -> "status_code == `200`"
    let processed = condition.replace(
      /(==|!=|>=|<=|>|<)\s*(\d+)(?![`])/g,
      "$1 `$2`"
    );

    // Fix boolean values without backticks: "enabled == true" -> "enabled == `true`"
    processed = processed.replace(/(==|!=)\s*(true|false)(?![`])/g, "$1 `$2`");

    // Fix header array syntax: "headers['key']" -> "headers.\"key\""
    processed = processed.replace(/headers\['([^']+)'\]/g, 'headers."$1"');

    // Fix null comparisons: "!= null" -> "!= `null`"
    processed = processed.replace(/(==|!=)\s*null(?![`])/g, "$1 `null`");

    return processed;
  }

  /**
   * Builds result for empty scenarios array.
   */
  private buildEmptyResult(
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
      captured_variables: {},
      available_variables: this.filterAvailableVariables(availableVariables),
      scenarios_meta: {
        has_scenarios: true,
        executed_count: 0,
        evaluations: [],
      } as any,
    };
  }

  /**
   * Builds skipped result when no scenarios matched.
   */
  private buildSkippedResult(
    identifiers: any,
    step: TestStep,
    duration: number,
    availableVariables: Record<string, any>,
    evaluations: ScenarioEvaluation[]
  ): StepExecutionResult {
    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: "skipped",
      duration_ms: duration,
      captured_variables: {},
      available_variables: this.filterAvailableVariables(availableVariables),
      error_message: "No matching scenario conditions",
      scenarios_meta: {
        has_scenarios: true,
        executed_count: 0,
        evaluations,
      } as any,
    };
  }

  /**
   * Builds success result after scenario execution.
   */
  private buildSuccessResult(
    identifiers: any,
    step: TestStep,
    duration: number,
    httpResult: any,
    assertionResults: any[],
    capturedVariables: Record<string, any>,
    availableVariables: Record<string, any>,
    evaluations: ScenarioEvaluation[]
  ): StepExecutionResult {
    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: httpResult?.status || "success",
      duration_ms: duration,
      request_details: httpResult?.request_details,
      response_details: httpResult?.response_details,
      assertions_results: assertionResults,
      captured_variables: capturedVariables,
      available_variables: this.filterAvailableVariables(availableVariables),
      scenarios_meta: {
        has_scenarios: true,
        executed_count: 1,
        evaluations,
      } as any,
      error_message: httpResult?.error_message,
    };
  }

  /**
   * Builds failure result when scenario encounters an error.
   */
  private buildFailureResult(
    identifiers: any,
    step: TestStep,
    error: Error,
    duration: number,
    availableVariables: Record<string, any>
  ): StepExecutionResult {
    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: step.name,
      status: "failure",
      duration_ms: duration,
      error_message: `Scenario execution error: ${error.message}`,
      captured_variables: {},
      available_variables: this.filterAvailableVariables(availableVariables),
    };
  }

  /**
   * Intelligently filters and masks available variables for scenario step context
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
        key.includes("_condition") ||
        key.includes("_scenario")
      ) {
        recentCaptures.add(key);
      }
    }

    return smartFilterAndMask(
      variables,
      {
        stepType: "scenario",
        recentCaptures,
        isFirstStep: false,
      },
      {
        alwaysInclude: ["condition", "scenario_name", "branch"],
        alwaysExclude: ["PATH", "HOME", "USER", "SHELL", "PWD", "LANG"],
        maxPerCategory: 4,
      },
      {
        maxDepth: 1,
        maxObjectSize: 8,
        maxArrayLength: 2,
        maxStringLength: 80,
      }
    );
  }
}
