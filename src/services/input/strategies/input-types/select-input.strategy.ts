/**
 * @fileoverview Select Input Strategy
 *
 * Handles single-selection input from a list of options.
 * Displays numbered options and prompts user to select by number.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as readline from "readline";
import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";

/**
 * Strategy for select (single-choice) input prompts.
 *
 * Displays a numbered list of options and accepts numeric selection.
 * Validates selection is within range, retries on invalid input.
 */
export class SelectInputStrategy implements InputTypeStrategy {
  readonly name = "select";

  /**
   * Determines if this strategy can handle the given input type.
   *
   * Handles: select
   */
  canHandle(type: string): boolean {
    return type === "select";
  }

  /**
   * Prompts user to select from a list of options.
   *
   * Displays options with numbers (1-based).
   * Returns the `value` of the selected option.
   * Retries recursively on invalid selection.
   *
   * @throws Error if options array is empty or invalid
   */
  async prompt(config: InputConfig): Promise<any> {
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
          resolve(this.prompt(config));
        }
      });
    });
  }
}
