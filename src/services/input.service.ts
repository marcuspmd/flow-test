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
  RunnerInputEvent
} from "../types/engine.types";
import { InputValidationExpression } from "../types/common.types";
import { getLogger } from "./logger.service";
import { VariableService } from "./variable.service";
import { javascriptService } from "./javascript.service";

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

  constructor(runnerInteractiveMode = false) {
    // Detect CI environment
    this.isCI = !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.JENKINS_URL
    );
    this.runnerInteractiveMode = runnerInteractiveMode;
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
        return this.handleRunnerInteractiveInput(interpolatedConfig, startTime, variables);
      }

      // Display styled prompt
      this.displayPrompt(interpolatedConfig);

      // Get user input based on type
      let value: any;
      switch (interpolatedConfig.type) {
        case "password":
          value = await this.promptPassword(interpolatedConfig);
          break;
        case "select":
          value = await this.promptSelect(interpolatedConfig);
          break;
        case "confirm":
          value = await this.promptConfirm(interpolatedConfig);
          break;
        case "number":
          value = await this.promptNumber(interpolatedConfig);
          break;
        case "multiline":
          value = await this.promptMultiline(interpolatedConfig);
          break;
        case "email":
        case "url":
        case "text":
        default:
          value = await this.promptText(interpolatedConfig);
          break;
      }

      // Validate input
      const validation = this.validateInput(
        value,
        interpolatedConfig,
        variables
      );
      if (!validation.valid) {
        this.logger.error(`❌ Validation failed: ${validation.error}`);
        // Recursive retry on validation failure
        return this.promptSingleInput(config, variables);
      }

      // Convert type if needed
      const convertedValue = this.convertValue(value, interpolatedConfig.type);

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
      prompt: toDisplayString(variableService.interpolate(config.prompt)) ??
        config.prompt,
      description: config.description
        ? toDisplayString(variableService.interpolate(config.description))
        : undefined,
      placeholder: config.placeholder
        ? toDisplayString(variableService.interpolate(config.placeholder))
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
    const validation = this.validateInput(value, config, variables);

    if (!validation.valid) {
      throw new Error(
        `CI Mode validation failed for '${config.variable}': ${validation.error}`
      );
    }

    const convertedValue = this.convertValue(value, config.type);

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
        cache_key: this.executionContext.cache_key ||
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
    const validation = this.validateInput(value, config, variables);
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
    const convertedValue = this.convertValue(value, config.type);

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

  /**
   * Displays styled prompt to user
   */
  private displayPrompt(config: InputConfig): void {
    const chalk = require("chalk");

    console.log(); // Empty line

    switch (config.style) {
      case "boxed":
        const boxWidth = Math.max(config.prompt.length + 4, 40);
        console.log(chalk.cyan("┌" + "─".repeat(boxWidth - 2) + "┐"));
        console.log(
          chalk.cyan("│ ") +
            chalk.bold(config.prompt) +
            " ".repeat(boxWidth - config.prompt.length - 3) +
            chalk.cyan("│")
        );
        if (config.description) {
          console.log(
            chalk.cyan("│ ") +
              chalk.gray(config.description) +
              " ".repeat(boxWidth - config.description.length - 3) +
              chalk.cyan("│")
          );
        }
        console.log(chalk.cyan("└" + "─".repeat(boxWidth - 2) + "┘"));
        break;

      case "highlighted":
        console.log(chalk.bgBlue.white.bold(` ${config.prompt} `));
        if (config.description) {
          console.log(chalk.blue(`💡 ${config.description}`));
        }
        break;

      case "simple":
      default:
        console.log(chalk.bold.cyan(`❓ ${config.prompt}`));
        if (config.description) {
          console.log(chalk.gray(`   ${config.description}`));
        }
        break;
    }

    // Show default value hint
    if (config.default !== undefined) {
      console.log(chalk.gray(`   Default: ${config.default}`));
    }

    // Show placeholder hint
    if (config.placeholder) {
      console.log(chalk.gray(`   Example: ${config.placeholder}`));
    }
  }

  /**
   * Prompts for text input
   */
  private async promptText(config: InputConfig): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = config.required
        ? "> "
        : `> (${config.default || "empty"}): `;

      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer || config.default || "");
      });
    });
  }

  /**
   * Prompts for password input (masked)
   */
  private async promptPassword(config: InputConfig): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = config.required
        ? "> "
        : `> (${config.default ? "***" : "empty"}): `;

      // Hide input by overriding _writeToOutput
      (rl as any)._writeToOutput = function (stringToWrite: string) {
        if (stringToWrite.charCodeAt(0) === 13) {
          // Enter key
          (rl as any).output.write("\n");
        } else if (stringToWrite.charCodeAt(0) === 8) {
          // Backspace
          (rl as any).output.write("\b \b");
        } else {
          (rl as any).output.write("*");
        }
      };

      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer || config.default || "");
      });
    });
  }

  /**
   * Prompts for selection from options
   */
  private async promptSelect(config: InputConfig): Promise<any> {
    const chalk = require("chalk");
    const options = config.options || [];

    if (!Array.isArray(options) || options.length === 0) {
      throw new Error("Select input requires options array");
    }

    console.log(chalk.gray("   Options:"));
    options.forEach((option, index) => {
      console.log(chalk.gray(`   ${index + 1}. ${option.label}`));
    });

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("> Select (1-" + options.length + "): ", (answer) => {
        rl.close();

        const index = parseInt(answer) - 1;
        if (index >= 0 && index < options.length) {
          resolve(options[index].value);
        } else if (config.default !== undefined) {
          resolve(config.default);
        } else {
          console.log(chalk.red("❌ Invalid selection. Please try again."));
          resolve(this.promptSelect(config));
        }
      });
    });
  }

  /**
   * Prompts for confirmation (y/N)
   */
  private async promptConfirm(config: InputConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const defaultHint =
        config.default !== undefined
          ? config.default
            ? " (Y/n)"
            : " (y/N)"
          : " (y/N)";

      rl.question(`> ${defaultHint}: `, (answer) => {
        rl.close();

        if (!answer && config.default !== undefined) {
          resolve(!!config.default);
        } else {
          resolve(/^y(es)?$/i.test(answer));
        }
      });
    });
  }

  /**
   * Prompts for number input
   */
  private async promptNumber(config: InputConfig): Promise<number> {
    const result = await this.promptText(config);
    const num = parseFloat(result);

    if (isNaN(num)) {
      if (config.default !== undefined) {
        return Number(config.default);
      }
      throw new Error("Invalid number input");
    }

    return num;
  }

  /**
   * Prompts for multiline input
   */
  private async promptMultiline(config: InputConfig): Promise<string> {
    const chalk = require("chalk");
    console.log(
      chalk.gray(
        '   Enter multiline text (type "END" on a new line to finish):'
      )
    );

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const lines: string[] = [];

      const promptLine = () => {
        rl.question("> ", (line) => {
          if (line.trim() === "END") {
            rl.close();
            resolve(lines.join("\n"));
          } else {
            lines.push(line);
            promptLine();
          }
        });
      };

      promptLine();
    });
  }

  /**
   * Validates input value
   */
  private validateInput(
    value: any,
    config: InputConfig,
    variables: Record<string, any>
  ): { valid: boolean; error?: string; warnings?: string[] } {
    const validation = config.validation;
    if (!validation) return { valid: true };

    const warnings: string[] = [];

    // Required check
    if (
      config.required &&
      (value === undefined || value === null || value === "")
    ) {
      return { valid: false, error: "This field is required" };
    }

    // Type-specific validation
    if (typeof value === "string") {
      // Length validation
      if (validation.min_length && value.length < validation.min_length) {
        return {
          valid: false,
          error: `Minimum length is ${validation.min_length}`,
        };
      }
      if (validation.max_length && value.length > validation.max_length) {
        return {
          valid: false,
          error: `Maximum length is ${validation.max_length}`,
        };
      }

      // Pattern validation
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return {
            valid: false,
            error: "Value does not match required pattern",
          };
        }
      }

      // Email validation
      if (config.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: "Invalid email format" };
        }
      }

      // URL validation
      if (config.type === "url") {
        try {
          new URL(value);
        } catch {
          return { valid: false, error: "Invalid URL format" };
        }
      }
    }

    // Number validation
    if (typeof value === "number") {
      const min =
        typeof validation.min === "string"
          ? parseFloat(validation.min)
          : validation.min;
      const max =
        typeof validation.max === "string"
          ? parseFloat(validation.max)
          : validation.max;

      if (min !== undefined && value < min) {
        return { valid: false, error: `Value must be at least ${min}` };
      }
      if (max !== undefined && value > max) {
        return { valid: false, error: `Value must be at most ${max}` };
      }
    }

    // Custom validation
    if (validation.custom_validation) {
      try {
        // Simple evaluation - could be enhanced with safer evaluation
        const evalFunction = new Function(
          "value",
          "variables",
          `return ${validation.custom_validation}`
        );
        const result = evalFunction(value, variables);
        if (!result) {
          return { valid: false, error: "Custom validation failed" };
        }
      } catch (error) {
        return { valid: false, error: "Custom validation error" };
      }
    }

    if (validation.expressions && validation.expressions.length > 0) {
      for (const rule of validation.expressions) {
        const passed = this.evaluateValidationExpression(
          rule,
          value,
          config,
          variables
        );

        if (!passed) {
          const severity = rule.severity ?? "error";
          const message = rule.message || "Dynamic validation failed";

          if (severity === "warning") {
            warnings.push(message);
            this.logger.warn(
              `⚠️ Validation warning for ${config.variable}: ${message}`
            );
          } else {
            return { valid: false, error: message };
          }
        }
      }
    }

    return warnings.length > 0 ? { valid: true, warnings } : { valid: true };
  }

  private evaluateValidationExpression(
    rule: InputValidationExpression,
    value: any,
    config: InputConfig,
    variables: Record<string, any>
  ): boolean {
    const language = (rule.language || "javascript").toLowerCase();
    try {
      if (language === "jmespath") {
        const context = {
          value,
          input: {
            variable: config.variable,
            prompt: config.prompt,
            type: config.type,
          },
          variables,
        };
        return Boolean(jmespath.search(context, rule.expression));
      }

      const jsVariables = {
        ...variables,
        __input_value: value,
        __input_variable: config.variable,
        __input_prompt: config.prompt,
        __input_type: config.type,
      };

      const evaluation = javascriptService.executeExpression(
        rule.expression,
        {
          variables: jsVariables,
        },
        false
      );

      return Boolean(evaluation);
    } catch (error) {
      this.logger.error(
        `Dynamic validation expression error for ${config.variable}: ${error}`
      );
      return false;
    }
  }

  /**
   * Converts value to appropriate type
   */
  private convertValue(value: any, type: string): any {
    switch (type) {
      case "number":
        return Number(value);
      case "confirm":
        return Boolean(value);
      default:
        return value;
    }
  }
}
