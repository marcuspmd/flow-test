/**
 * @fileoverview Confirm Input Strategy
 *
 * Handles yes/no confirmation prompts.
 * Accepts variations of yes/no answers and returns boolean.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as readline from "readline";
import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";

/**
 * Strategy for confirmation (yes/no) input prompts.
 *
 * Displays (y/N) or (Y/n) based on default value.
 * Accepts: y, yes, Y, YES (case-insensitive) as true.
 * Returns boolean value.
 */
export class ConfirmInputStrategy implements InputTypeStrategy {
  readonly name = "confirm";

  /**
   * Determines if this strategy can handle the given input type.
   *
   * Handles: confirm
   */
  canHandle(type: string): boolean {
    return type === "confirm";
  }

  /**
   * Prompts user for yes/no confirmation.
   *
   * Shows appropriate hint based on default value.
   * Returns true for "y" or "yes" (case-insensitive).
   * Returns default value if user provides empty input.
   */
  async prompt(config: InputConfig): Promise<boolean> {
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
}
