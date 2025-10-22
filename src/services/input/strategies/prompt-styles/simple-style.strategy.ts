/**
 * @fileoverview Simple Prompt Style Strategy
 *
 * Displays prompts in a simple, clean format with minimal decoration.
 * Uses colored text and basic icons.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";
import type { PromptStyleStrategy } from "./prompt-style.interface";

/**
 * Strategy for simple prompt display.
 *
 * Default style when no style is specified.
 * Uses question mark icon and cyan color for prompt.
 * Shows description, default value, and placeholder hints in gray.
 */
export class SimplePromptStyle implements PromptStyleStrategy {
  readonly name = "simple";

  /**
   * Determines if this strategy can handle the given style.
   *
   * Handles: "simple" or undefined (default)
   */
  canHandle(style?: string): boolean {
    return !style || style === "simple";
  }

  /**
   * Displays prompt in simple format.
   *
   * Format:
   * - ❓ Prompt (bold cyan)
   * - Description (gray, indented)
   * - Default: value (gray, indented)
   * - Example: placeholder (gray, indented)
   */
  display(config: InputConfig): void {
    const chalk = require("chalk");

    console.log(); // Empty line

    console.log(chalk.bold.cyan(`❓ ${config.prompt}`));

    if (config.description) {
      console.log(chalk.gray(`   ${config.description}`));
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
}
