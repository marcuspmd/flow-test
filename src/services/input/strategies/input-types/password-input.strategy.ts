/**
 * @fileoverview Password Input Strategy
 *
 * Handles password input with masked (hidden) characters.
 * Uses readline with custom _writeToOutput to display asterisks (*) instead of actual characters.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as readline from "readline";
import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";

/**
 * Strategy for password input with character masking.
 *
 * Displays asterisks (*) instead of actual characters for security.
 * Supports default values (shown as "***" in prompt).
 */
export class PasswordInputStrategy implements InputTypeStrategy {
  readonly name = "password";

  /**
   * Determines if this strategy can handle the given input type.
   *
   * Handles: password
   */
  canHandle(type: string): boolean {
    return type === "password";
  }

  /**
   * Prompts user for password input with character masking.
   *
   * Overrides readline's _writeToOutput to display asterisks.
   * Handles backspace to remove characters.
   */
  async prompt(config: InputConfig): Promise<string> {
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
        const defaultValue = config.default ? String(config.default) : "";
        resolve(answer || defaultValue);
      });
    });
  }
}
