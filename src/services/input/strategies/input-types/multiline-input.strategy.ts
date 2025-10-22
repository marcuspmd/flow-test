/**
 * @fileoverview Multiline Input Strategy
 *
 * Handles multiline text input prompts.
 * Collects multiple lines until user types "END" on a new line.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as readline from "readline";
import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";

/**
 * Strategy for multiline text input prompts.
 *
 * Prompts for multiple lines of text.
 * User types "END" on a new line to finish.
 * Returns lines joined with newline character.
 */
export class MultilineInputStrategy implements InputTypeStrategy {
  readonly name = "multiline";

  /**
   * Determines if this strategy can handle the given input type.
   *
   * Handles: multiline
   */
  canHandle(type: string): boolean {
    return type === "multiline";
  }

  /**
   * Prompts user for multiline text input.
   *
   * Collects lines until "END" is entered.
   * Each line is stored and joined with \n.
   * Returns complete multiline string.
   */
  async prompt(config: InputConfig): Promise<string> {
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
}
