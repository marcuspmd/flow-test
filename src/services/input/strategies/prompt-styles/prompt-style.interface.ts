/**
 * @fileoverview Prompt Style Strategy Interface
 *
 * Defines the contract for prompt style strategies that handle different
 * visual presentations of input prompts (simple, boxed, highlighted).
 *
 * Each strategy is responsible for:
 * - Determining if it can handle a specific style
 * - Displaying the prompt with appropriate formatting
 * - Using chalk for colors and styling
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";

/**
 * Strategy interface for handling different prompt styles.
 *
 * Implements the Strategy Pattern for prompt display, allowing
 * different visual presentations for each style.
 *
 * **Responsibilities:**
 * - Style detection via `canHandle()`
 * - Prompt display implementation via `display()`
 * - Visual formatting with chalk
 *
 * @example Simple Style Strategy
 * ```typescript
 * class SimplePromptStyle implements PromptStyleStrategy {
 *   readonly name = "simple";
 *
 *   canHandle(style?: string): boolean {
 *     return !style || style === "simple";
 *   }
 *
 *   display(config: InputConfig): void {
 *     console.log(chalk.bold.cyan(`❓ ${config.prompt}`));
 *     if (config.description) {
 *       console.log(chalk.gray(`   ${config.description}`));
 *     }
 *   }
 * }
 * ```
 */
export interface PromptStyleStrategy {
  /**
   * Strategy name for identification and debugging.
   * Should match the style it handles.
   *
   * @example "simple", "boxed", "highlighted"
   */
  readonly name: string;

  /**
   * Determines if this strategy can handle the given style.
   *
   * @param style - Style from configuration (simple, boxed, highlighted) or undefined
   * @returns True if strategy can handle this style, false otherwise
   *
   * @example
   * ```typescript
   * strategy.canHandle("boxed");     // → true for BoxedPromptStyle
   * strategy.canHandle("simple");    // → false for BoxedPromptStyle
   * strategy.canHandle(undefined);   // → true for SimplePromptStyle (default)
   * ```
   */
  canHandle(style?: string): boolean;

  /**
   * Displays the prompt with appropriate styling.
   *
   * Implementations should:
   * - Use chalk for colors and formatting
   * - Display prompt text prominently
   * - Show description if provided
   * - Show default value hint if provided
   * - Show placeholder hint if provided
   * - Add empty line before prompt for spacing
   *
   * @param config - Input configuration with prompt, description, default, placeholder
   *
   * @example
   * ```typescript
   * strategy.display({
   *   prompt: "Enter your email:",
   *   description: "Used for notifications",
   *   default: "user@example.com",
   *   placeholder: "email@domain.com",
   *   variable: "email",
   *   type: "email"
   * });
   * ```
   */
  display(config: InputConfig): void;
}
