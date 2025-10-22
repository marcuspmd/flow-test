/**
 * @fileoverview Number Input Strategy
 *
 * Handles numeric input prompts.
 * Parses string input as float and validates numeric format.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as readline from "readline";
import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";

/**
 * Strategy for numeric input prompts.
 *
 * Prompts for text input and parses as number.
 * Validates input is a valid number (not NaN).
 * Falls back to default value on invalid input.
 */
export class NumberInputStrategy implements InputTypeStrategy {
  readonly name = "number";

  /**
   * Determines if this strategy can handle the given input type.
   *
   * Handles: number
   */
  canHandle(type: string): boolean {
    return type === "number";
  }

  /**
   * Prompts user for numeric input.
   *
   * Accepts any text but parses as float.
   * Returns default value if parsing fails and default exists.
   *
   * @throws Error if input is not a valid number and no default provided
   */
  async prompt(config: InputConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = config.required
        ? "> "
        : `> (${config.default || "empty"}): `;

      rl.question(prompt, (answer) => {
        rl.close();

        const result = answer || config.default;
        const num = parseFloat(String(result));

        if (isNaN(num)) {
          if (config.default !== undefined) {
            resolve(Number(config.default));
          } else {
            reject(new Error("Invalid number input"));
          }
        } else {
          resolve(num);
        }
      });
    });
  }
}
