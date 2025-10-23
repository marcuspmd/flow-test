/**
 * Interface for Input Service
 *
 * Handles interactive user input during test execution, including various
 * input types, validation, styling, and integration with the variable system.
 *
 * @since 2.0.0
 */

import type {
  InputConfig,
  InputResult,
  InputExecutionContext,
} from "../../types/engine.types";

export interface IInputService {
  /**
   * Sets the execution context for interactive inputs
   *
   * @param context - Execution context with suite and step information
   */
  setExecutionContext(context: InputExecutionContext): void;

  /**
   * Sets runner interactive mode for input prompts
   *
   * @param enabled - Whether runner interactive mode is enabled
   */
  setRunnerInteractiveMode(enabled: boolean): void;

  /**
   * Prompts user for input based on configuration
   *
   * @param config - Input configuration (single or array)
   * @param variables - Current variable context for interpolation
   * @returns Promise resolving to input result(s)
   */
  promptUser(
    config: InputConfig | InputConfig[],
    variables: Record<string, any>
  ): Promise<InputResult | InputResult[]>;

  /**
   * Prompts user for multiple inputs sequentially
   *
   * @param configs - Array of input configurations
   * @param variables - Current variable context for interpolation
   * @returns Promise resolving to array of input results
   */
  promptMultipleInputs(
    configs: InputConfig[],
    variables: Record<string, any>
  ): Promise<InputResult[]>;
}
