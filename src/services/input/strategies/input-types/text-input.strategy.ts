/**
 * @fileoverview Text Input Strategy
 *
 * Handles text-based input types including:
 * - text (general text input)
 * - email (email format)
 * - url (URL format)
 *
 * Uses readline for interactive console input with default value support.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import * as readline from "readline";
import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";

/**
 * Strategy for text-based input prompts.
 *
 * Handles general text input, email, and URL types using readline.
 * Supports default values and optional/required fields.
 */
export class TextInputStrategy implements InputTypeStrategy {
  readonly name = "text";

  /**
   * Determines if this strategy can handle the given input type.
   *
   * Handles: text, email, url
   */
  canHandle(type: string): boolean {
    return type === "text" || type === "email" || type === "url";
  }

  /**
   * Prompts user for text input using readline.
   *
   * Shows default value hint if provided.
   * Returns default value if user provides empty input.
   */
  async prompt(config: InputConfig): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = config.required
        ? "> "
        : `> (${config.default || "empty"}): `;

      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer || config.default || "");
      });
    });
  }
}
