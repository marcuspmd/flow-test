/**
 * @fileoverview Boxed Prompt Style Strategy
 *
 * Displays prompts in a decorative box with Unicode characters.
 * Creates visual emphasis with borders and structured layout.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";
import type { PromptStyleStrategy } from "./prompt-style.interface";

/**
 * Strategy for boxed prompt display.
 *
 * Creates a cyan-colored box around the prompt with:
 * - Top and bottom borders (┌─┐ and └─┘)
 * - Side borders (│)
 * - Minimum width of 40 characters
 * - Automatic width adjustment based on content
 */
export class BoxedPromptStyle implements PromptStyleStrategy {
  readonly name = "boxed";

  /**
   * Determines if this strategy can handle the given style.
   *
   * Handles: "boxed"
   */
  canHandle(style?: string): boolean {
    return style === "boxed";
  }

  /**
   * Displays prompt in boxed format.
   *
   * Format:
   * ┌────────────────────────┐
   * │ Prompt                 │
   * │ Description (gray)     │
   * └────────────────────────┘
   * Default: value (gray)
   * Example: placeholder (gray)
   */
  display(config: InputConfig): void {
    const chalk = require("chalk");

    console.log(); // Empty line

    // Calculate box width considering both prompt and description
    let boxWidth = Math.max(config.prompt.length + 4, 40);
    if (config.description) {
      boxWidth = Math.max(boxWidth, config.description.length + 4);
    }

    // Top border
    console.log(chalk.cyan("┌" + "─".repeat(boxWidth - 2) + "┐"));

    // Prompt line
    const promptPadding = Math.max(0, boxWidth - config.prompt.length - 3);
    console.log(
      chalk.cyan("│ ") +
        chalk.bold(config.prompt) +
        " ".repeat(promptPadding) +
        chalk.cyan("│")
    );

    // Description line (if provided)
    if (config.description) {
      const descPadding = Math.max(0, boxWidth - config.description.length - 3);
      console.log(
        chalk.cyan("│ ") +
          chalk.gray(config.description) +
          " ".repeat(descPadding) +
          chalk.cyan("│")
      );
    }

    // Bottom border
    console.log(chalk.cyan("└" + "─".repeat(boxWidth - 2) + "┘"));

    // Show default value hint (outside box)
    if (config.default !== undefined) {
      console.log(chalk.gray(`   Default: ${config.default}`));
    }

    // Show placeholder hint (outside box)
    if (config.placeholder) {
      console.log(chalk.gray(`   Example: ${config.placeholder}`));
    }
  }
}
