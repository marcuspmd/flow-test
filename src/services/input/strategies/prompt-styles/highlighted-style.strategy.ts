/**
 * @fileoverview Highlighted Prompt Style Strategy
 *
 * Displays prompts with high visual emphasis using background colors.
 * Creates attention-grabbing prompts with blue background.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";
import type { PromptStyleStrategy } from "./prompt-style.interface";

/**
 * Strategy for highlighted prompt display.
 *
 * Uses bold white text on blue background for prompt.
 * Shows description with lightbulb icon in blue.
 * Maximum visual emphasis for important inputs.
 */
export class HighlightedPromptStyle implements PromptStyleStrategy {
  readonly name = "highlighted";

  /**
   * Determines if this strategy can handle the given style.
   *
   * Handles: "highlighted"
   */
  canHandle(style?: string): boolean {
    return style === "highlighted";
  }

  /**
   * Displays prompt in highlighted format.
   *
   * Format:
   * ━━━━━━━━━━━━━━━━━━━━━━
   *  Prompt  (white on blue bg, bold)
   * ━━━━━━━━━━━━━━━━━━━━━━
   * 💡 Description (blue)
   * Default: value (gray)
   * Example: placeholder (gray)
   */
  display(config: InputConfig): void {
    const chalk = require("chalk");

    console.log(); // Empty line

    // Highlighted prompt with background
    console.log(chalk.bgBlue.white.bold(` ${config.prompt} `));

    // Description with lightbulb icon
    if (config.description) {
      console.log(chalk.blue(`💡 ${config.description}`));
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
