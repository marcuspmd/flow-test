import * as jmespath from "jmespath";
import {
  ConditionalScenario,
  Assertions,
} from "../types/engine.types";
import {
  StepExecutionResult,
  AssertionResult,
} from "../types/config.types";
import { AssertionService } from "./assertion.service";
import { CaptureService } from "./capture.service";
import { getLogger } from "./logger.service";

export class ScenarioService {
  private readonly assertionService: AssertionService;
  private readonly captureService: CaptureService;
  private readonly logger = getLogger();

  constructor() {
    this.assertionService = new AssertionService();
    this.captureService = new CaptureService();
  }

  /**
   * Processes conditional scenarios and executes the appropriate scenario.
   */
  processScenarios(
    scenarios: ConditionalScenario[],
    result: StepExecutionResult,
    verbosity: string,
    variableContext?: Record<string, any>
  ): void {
    for (const scenario of scenarios) {
      try {
        const conditionMet = this.evaluateCondition(scenario.condition, result);

        if (verbosity === "detailed" || verbosity === "verbose") {
          this.logger.info(
            `Condição "${scenario.condition}": ${
              conditionMet ? "TRUE" : "FALSE"
            }`
          );
        }

        const scenarioBlock = conditionMet ? scenario.then : scenario.else;

        if (scenarioBlock) {
          this.executeScenarioBlock(
            scenarioBlock,
            result,
            verbosity,
            variableContext
          );
        }
      } catch (error) {
        this.logger.error(`Error evaluating scenario`, {
          error: error as Error,
        });
        result.error_message = `Scenario error: ${error}`;
        result.status = "failure";
      }
    }
  }

  /**
   * Evaluates a JMESPath condition against the HTTP response.
   */
  private evaluateCondition(
    condition: string,
    result: StepExecutionResult
  ): boolean {
    if (!result.response_details) {
      throw new Error("Response not available for condition evaluation");
    }

    // Builds the complete context for evaluation
    const context = this.buildEvaluationContext(result);

    try {
      const conditionResult = jmespath.search(context, condition);

      // Converts the result to boolean
      if (typeof conditionResult === "boolean") {
        return conditionResult;
      }

      // Handles truthy/falsy values
      return Boolean(conditionResult);
    } catch (error) {
      throw new Error(`Invalid JMESPath condition '${condition}': ${error}`);
    }
  }

  /**
   * Builds the context for condition evaluation.
   */
  private buildEvaluationContext(result: StepExecutionResult): any {
    const response = result.response_details!;

    return {
      status_code: response.status_code,
      headers: response.headers,
      body: response.body,
      duration_ms: result.duration_ms,
      size_bytes: response.size_bytes,
      step_status: result.status,
    };
  }

  /**
   * Executes a scenario block (then or else).
   */
  private executeScenarioBlock(
    block: { assert?: Assertions; capture?: Record<string, string> },
    result: StepExecutionResult,
    verbosity: string,
    variableContext?: Record<string, any>
  ): void {
    // Executes scenario assertions
    if (block.assert) {
      const scenarioAssertions = this.assertionService.validateAssertions(
        block.assert,
        result
      );

      // Adds scenario assertions to existing results
      if (!result.assertions_results) {
        result.assertions_results = [];
      }
      result.assertions_results.push(...scenarioAssertions);

      // Checks if any assertion failed
      const failedAssertions = scenarioAssertions.filter((a) => !a.passed);
      if (failedAssertions.length > 0) {
        result.status = "failure";
        result.error_message = `${failedAssertions.length} scenario assertion(s) failed`;

        if (
          verbosity === "simple" ||
          verbosity === "detailed" ||
          verbosity === "verbose"
        ) {
          this.logger.error("Scenario assertions failed");
          failedAssertions.forEach((assertion) => {
            this.logger.error(`- ${assertion.field}: ${assertion.message}`);
          });
        }
      } else if (verbosity === "detailed" || verbosity === "verbose") {
        this.logger.info(
          `All ${scenarioAssertions.length} scenario assertion(s) passed`
        );
      }
    }

    // Executes scenario capture
    if (block.capture) {
      const capturedVariables = this.captureService.captureVariables(
        block.capture,
        result,
        variableContext
      );

      // Adds captured variables to existing results
      if (!result.captured_variables) {
        result.captured_variables = {};
      }
      Object.assign(result.captured_variables, capturedVariables);
    }
  }

  /**
   * Validates that all scenario conditions are valid JMESPath expressions.
   */
  validateScenarios(scenarios: ConditionalScenario[]): string[] {
    const errors: string[] = [];

    scenarios.forEach((scenario, index) => {
      try {
        // Tries to compile/validate the condition
        const testContext = {
          status_code: 200,
          headers: {},
          body: {},
          duration_ms: 100,
          size_bytes: 0,
        };

        jmespath.search(testContext, scenario.condition);
      } catch (error) {
        errors.push(
          `Scenario ${index + 1}: invalid condition '${
            scenario.condition
          }' - ${error}`
        );
      }
    });

    return errors;
  }

  /**
   * Generates suggestions for common conditions based on the response.
   */
  suggestConditions(result: StepExecutionResult): string[] {
    const suggestions: string[] = [];

    if (!result.response_details) {
      return suggestions;
    }

    const response = result.response_details;

    // Basic conditions
    suggestions.push(
      `status_code == \`${response.status_code}\``,
      `status_code != \`${response.status_code}\``,
      `status_code >= \`200\``,
      `status_code < \`400\``,
      `duration_ms < \`1000\``,
      `size_bytes > \`100\``
    );

    // Conditions based on body (if it's an object)
    if (response.body && typeof response.body === "object") {
      // Suggests some common checks
      const bodyKeys = Object.keys(response.body);
      if (bodyKeys.length > 0) {
        suggestions.push(
          `body && body.error`,
          `body && !body.error`,
          `body.status == 'success'`,
          `body.data && length(body.data) > \`0\``
        );

        // Adds suggestions for specific keys
        bodyKeys.slice(0, 3).forEach((key) => {
          suggestions.push(`body.${key}`);
        });
      }
    }

    // Conditions based on common headers
    const commonHeaders = ["content-type", "authorization", "x-api-version"];
    commonHeaders.forEach((header) => {
      if (response.headers[header] || response.headers[header.toLowerCase()]) {
        suggestions.push(`headers."${header}"`);
      }
    });

    return suggestions;
  }
}
