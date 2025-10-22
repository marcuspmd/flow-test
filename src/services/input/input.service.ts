/**
 * @fileoverview Interactive input service for user prompts during test execution.
 *
 * @remarks
 * This module provides the InputService class which handles interactive user input
 * during test execution, including various input types, validation, styling, and
 * integration with the variable system.
 *
 * @packageDocumentation
 */

import * as readline from "readline";
import * as jmespath from "jmespath";
import {
  InputConfig,
  InputResult,
  InputExecutionContext,
  InteractiveInputRequest,
  RunnerInputEvent,
} from "../../types/engine.types";
import { InputValidationExpression } from "../../types/common.types";
import { getLogger } from "../logger.service";
import { VariableService } from "../variable.service";
import { javascriptService } from "../javascript.service";
import {
  InputTypeRegistry,
  getDefaultInputTypeRegistry,
} from "./strategies/input-types";
import {
  PromptStyleRegistry,
  getDefaultPromptStyleRegistry,
} from "./strategies/prompt-styles";
import { validateInput } from "./helpers/validation.helper";
import { convertValue } from "./helpers/conversion.helper";

/**
 * Service responsible for handling interactive user input during test execution.
 *
 * @remarks
 * The InputService provides comprehensive input capabilities including different
 * input types (text, password, select, etc.), validation, styling, and timeout
 * support. It integrates with the variable system to provide dynamic prompts
 * and capture user input as variables.
 *
 * **Key Features:**
 * - **Multiple Input Types**: text, password, number, email, select, confirm
 * - **Dynamic Prompts**: Variable interpolation in prompts and options
 * - **Validation**: Built-in and custom validation with error handling
 * - **Styling**: Different visual presentations (simple, boxed, highlighted)
 * - **Timeout Support**: Automatic fallback to default values
 * - **CI Support**: Non-interactive mode for CI/CD environments
 *
 * @example Basic usage
 * ```typescript
 * const inputService = new InputService();
 * const variableService = new VariableService();
 *
 * const result = await inputService.promptUser({
 *   prompt: "Enter your API key:",
 *   variable: "api_key",
 *   type: "password",
 *   required: true
 * }, variableService.getAllVariables());
 *
 * console.log(`User entered: ${result.value}`);
 * ```
 *
 * @public
 */
export class InputService {
  private logger = getLogger();
  private isCI: boolean;
  private runnerInteractiveMode: boolean;
  private executionContext?: InputExecutionContext;
  private inputTypeRegistry: InputTypeRegistry;
  private promptStyleRegistry: PromptStyleRegistry;

  constructor(
    runnerInteractiveMode = false,
    inputTypeRegistry?: InputTypeRegistry,
    promptStyleRegistry?: PromptStyleRegistry
  ) {
    // Detect CI environment
    const autoInputEnv = process.env.FLOW_TEST_AUTO_INPUT;
    const autoInputEnabled =
      typeof autoInputEnv === "string" &&
      ["true", "1", "yes", "on"].includes(autoInputEnv.toLowerCase());

    this.isCI = !!(
      autoInputEnabled ||
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.JENKINS_URL ||
      process.env.JEST_WORKER_ID ||
      process.env.NODE_ENV === "test"
    );
    this.runnerInteractiveMode = runnerInteractiveMode;

    // Initialize registries with defaults if not provided
    this.inputTypeRegistry = inputTypeRegistry || getDefaultInputTypeRegistry();
    this.promptStyleRegistry =
      promptStyleRegistry || getDefaultPromptStyleRegistry();
  }

  /**
   * Sets the execution context for interactive inputs
   *
   * @param context - Execution context with suite and step information
   */
  setExecutionContext(context: InputExecutionContext): void {
    this.executionContext = context;
  }

  /**
   * Prompts user for input based on configuration
   *
   * @param config - Input configuration (single or array)
   * @param variables - Current variable context for interpolation
   * @returns Promise resolving to input result(s)
   */
  async promptUser(
    config: InputConfig | InputConfig[],
    variables: Record<string, any>
  ): Promise<InputResult | InputResult[]> {
    // Handle array of inputs
    if (Array.isArray(config)) {
      return this.promptMultipleInputs(config, variables);
    }

    // Handle single input (existing logic)
    return this.promptSingleInput(config, variables);
  }

  /**
   * Prompts user for multiple inputs sequentially
   *
   * @param configs - Array of input configurations
   * @param variables - Current variable context for interpolation
   * @returns Promise resolving to array of input results
   */
  async promptMultipleInputs(
    configs: InputConfig[],
    variables: Record<string, any>
  ): Promise<InputResult[]> {
    const results: InputResult[] = [];
    let updatedVariables = { ...variables };

    for (const config of configs) {
      try {
        const result = await this.promptSingleInput(config, updatedVariables);
        results.push(result);

        // Update variables with the captured input for subsequent inputs
        if (result.validation_passed && result.value !== undefined) {
          updatedVariables[result.variable] = result.value;
        }
      } catch (error) {
        this.logger.error(
          `❌ Error processing input ${config.variable}: ${error}`
        );

        // Add failed result
        results.push({
          variable: config.variable,
          value: config.default || null,
          input_time_ms: 0,
          validation_passed: false,
          used_default: true,
          timed_out: false,
          validation_error:
            error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Prompts user for single input based on configuration
   *
   * @param config - Input configuration
   * @param variables - Current variable context for interpolation
   * @returns Promise resolving to input result
   */
  private async promptSingleInput(
    config: InputConfig,
    variables: Record<string, any>
  ): Promise<InputResult> {
    const startTime = Date.now();

    try {
      // Interpolate dynamic values in config
      const interpolatedConfig = this.interpolateConfig(config, variables);

      // Check condition if specified
      if (interpolatedConfig.condition) {
        const conditionResult = this.evaluateCondition(
          interpolatedConfig.condition,
          variables
        );
        if (!conditionResult) {
          this.logger.debug(
            `⏭️ Input skipped - condition not met: ${interpolatedConfig.condition}`
          );
          return {
            variable: config.variable,
            value: interpolatedConfig.default || null,
            input_time_ms: Date.now() - startTime,
            validation_passed: true,
            used_default: true,
            timed_out: false,
          };
        }
      }

      // Handle CI environment
      if (this.isCI) {
        return this.handleCIInput(interpolatedConfig, startTime, variables);
      }

      // Handle runner interactive mode
      if (this.runnerInteractiveMode) {
        return this.handleRunnerInteractiveInput(
          interpolatedConfig,
          startTime,
          variables
        );
      }

      // Display styled prompt
      this.promptStyleRegistry.display(interpolatedConfig);

      // Get user input based on type using registry
      const value = await this.inputTypeRegistry.prompt(interpolatedConfig);

      // Validate input using helper
      const validation = validateInput(value, interpolatedConfig, variables);
      if (!validation.valid) {
        this.logger.error(`❌ Validation failed: ${validation.error}`);
        // Recursive retry on validation failure
        return this.promptSingleInput(config, variables);
      }

      // Convert type if needed using helper
      const convertedValue = convertValue(value, interpolatedConfig.type);

      return {
        variable: config.variable,
        value: convertedValue,
        input_time_ms: Date.now() - startTime,
        validation_passed: true,
        used_default: false,
        timed_out: false,
        ...(validation.warnings
          ? { validation_warnings: validation.warnings }
          : {}),
      };
    } catch (error) {
      this.logger.error(`❌ Input error: ${error}`);

      // Fallback to default on error
      return {
        variable: config.variable,
        value: config.default || null,
        input_time_ms: Date.now() - startTime,
        validation_passed: false,
        used_default: true,
        timed_out: false,
        validation_error:
          error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Interpolates variables in config strings
   */
  private interpolateConfig(
    config: InputConfig,
    variables: Record<string, any>
  ): InputConfig {
    const variableService = new VariableService({
      environment: {},
      global: {},
      suite: {},
      runtime: variables,
      imported: {},
    });

    const toDisplayString = (value: any): string | undefined => {
      if (value === undefined || value === null) {
        return value;
      }
      if (typeof value === "string") {
        return value;
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    return {
      ...config,
      prompt:
        toDisplayString(variableService.interpolate(config.prompt)) ??
        config.prompt,
      description: config.description
        ? toDisplayString(variableService.interpolate(config.description))
        : undefined,
      placeholder: config.placeholder
        ? toDisplayString(variableService.interpolate(config.placeholder))
        : undefined,
      // Handle default value interpolation with support for Faker, JMESPath, etc.
      default:
        config.default !== undefined
          ? this.interpolateValue(config.default, variables, variableService)
          : undefined,
      // Handle options interpolation
      options: config.options
        ? this.interpolateOptions(config.options, variables, variableService)
        : undefined,
      // Interpolate validation rules
      validation: config.validation
        ? {
            ...config.validation,
            min:
              typeof config.validation.min === "string"
                ? variableService.interpolate(config.validation.min)
                : config.validation.min,
            max:
              typeof config.validation.max === "string"
                ? variableService.interpolate(config.validation.max)
                : config.validation.max,
          }
        : undefined,
    };
  }

  /**
   * Interpolates options for select inputs
   */
  private interpolateOptions(
    options: Array<{ value: any; label: string }> | string,
    variables: Record<string, any>,
    variableService: VariableService
  ): Array<{ value: any; label: string }> {
    if (typeof options === "string") {
      // Allow template interpolation ({{ }}, {{$js }}, etc.) before evaluating expression
      const resolvedOptions = variableService.interpolate(options);

      // If interpolation produced an options array directly, return it
      if (Array.isArray(resolvedOptions)) {
        return resolvedOptions;
      }

      const expression =
        typeof resolvedOptions === "string" ? resolvedOptions : options;

      // JMESPath expression - evaluate it
      try {
        const jmespath = require("jmespath");
        const result = jmespath.search(variables, expression);

        if (Array.isArray(result)) {
          return result;
        }

        return result ? [result] : [];
      } catch (error) {
        this.logger.warn(
          `⚠️ Failed to evaluate options expression: ${expression}`
        );
        return [];
      }
    }

    // Array of options - interpolate labels
    return options.map((option) => ({
      value: option.value,
      label: variableService.interpolate(option.label),
    }));
  }

  /**
   * Interpolates a single value with support for variables, Faker, JavaScript, and JMESPath
   */
  private interpolateValue(
    value: any,
    variables: Record<string, any>,
    variableService: VariableService
  ): any {
    if (typeof value !== "string") {
      return value; // Return non-string values unchanged
    }

    // Try interpolation first ({{var}}, {{$faker.*}}, {{$js:...}}, etc.)
    const resolvedValue = variableService.interpolate(value);

    // If interpolation returned something other than string, use it directly
    if (typeof resolvedValue !== "string") {
      return resolvedValue;
    }

    // If the value contains template syntax ({{}}), interpolation already attempted
    // Don't try JMESPath on template values that failed to resolve
    if (value.includes("{{") && value.includes("}}")) {
      return resolvedValue;
    }

    // If still a string and doesn't contain templates, try as JMESPath expression
    try {
      const jmespath = require("jmespath");
      const result = jmespath.search(variables, resolvedValue);
      return result !== null ? result : resolvedValue;
    } catch (error) {
      // If JMESPath fails, return the interpolated value
      return resolvedValue;
    }
  }

  /**
   * Evaluates condition expression
   */
  private evaluateCondition(
    condition: string,
    variables: Record<string, any>
  ): boolean {
    try {
      const jmespath = require("jmespath");
      return !!jmespath.search(variables, condition);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to evaluate condition: ${condition}`);
      return false;
    }
  }

  /**
   * Handles input in CI environment
   */
  private handleCIInput(
    config: InputConfig,
    startTime: number,
    variables: Record<string, any>
  ): InputResult {
    const value = config.ci_default ?? config.default;

    if (
      config.required &&
      (value === undefined || value === null || value === "")
    ) {
      throw new Error(
        `Required input '${config.variable}' has no ci_default or default value in CI environment`
      );
    }

    this.logger.info(
      `🤖 CI Mode: Using ${
        config.ci_default !== undefined ? "ci_default" : "default"
      } value for '${config.variable}': ${value}`
    );
    const validation = validateInput(value, config, variables);

    if (!validation.valid) {
      throw new Error(
        `CI Mode validation failed for '${config.variable}': ${validation.error}`
      );
    }

    const convertedValue = convertValue(value, config.type);

    return {
      variable: config.variable,
      value: convertedValue,
      input_time_ms: Date.now() - startTime,
      validation_passed: true,
      used_default: true,
      timed_out: false,
      ...(validation.warnings
        ? { validation_warnings: validation.warnings }
        : {}),
    };
  }

  /**
   * Handles input in runner interactive mode
   */
  private async handleRunnerInteractiveInput(
    config: InputConfig,
    startTime: number,
    variables: Record<string, any>
  ): Promise<InputResult> {
    // Build the interactive input request
    const request: InteractiveInputRequest = {
      variable: config.variable,
      prompt: config.prompt,
      required: !!config.required,
      masked: config.type === "password",
      input_type: config.type || "text",
      default: config.default,
      options: Array.isArray(config.options) ? config.options : undefined,
      ...(this.executionContext && {
        suite_name: this.executionContext.suite_name,
        suite_path: this.executionContext.suite_path,
        step_name: this.executionContext.step_name,
        step_id: this.executionContext.step_id,
        step_index: this.executionContext.step_index,
        cache_key:
          this.executionContext.cache_key ||
          `${this.executionContext.suite_name}::${config.variable}`,
      }),
    };

    // Emit the interactive input event
    const event: RunnerInputEvent = {
      type: "request",
      request,
    };

    console.log(`@@FLOW_INPUT@@${JSON.stringify(event)}`);

    // Wait for input from stdin
    const userInput = await this.waitForStdinInput();

    // Process the input
    let value: any = userInput;
    if (!value && config.default !== undefined) {
      value = config.default;
    }

    // Validate input
    const validation = validateInput(value, config, variables);
    if (!validation.valid) {
      // For interactive mode, we could retry or throw
      this.logger.error(`❌ Validation failed: ${validation.error}`);
      // For now, we'll return a failed result instead of retrying
      return {
        variable: config.variable,
        value: config.default || null,
        input_time_ms: Date.now() - startTime,
        validation_passed: false,
        used_default: true,
        timed_out: false,
        validation_error: validation.error,
      };
    }

    // Convert type if needed
    const convertedValue = convertValue(value, config.type);

    return {
      variable: config.variable,
      value: convertedValue,
      input_time_ms: Date.now() - startTime,
      validation_passed: true,
      used_default: !userInput,
      timed_out: false,
      ...(validation.warnings
        ? { validation_warnings: validation.warnings }
        : {}),
    };
  }

  /**
   * Waits for input from stdin
   */
  private async waitForStdinInput(): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Read a single line from stdin
      rl.question("", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}
