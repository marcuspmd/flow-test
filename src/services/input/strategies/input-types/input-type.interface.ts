/**
 * @fileoverview Input Type Strategy Interface
 *
 * Defines the contract for input type strategies that handle different
 * types of user input prompts (text, password, select, confirm, etc.).
 *
 * Each strategy is responsible for:
 * - Determining if it can handle a specific input type
 * - Prompting the user for input using appropriate methods
 * - Returning the raw user input value
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";

/**
 * Strategy interface for handling different input types.
 *
 * Implements the Strategy Pattern for input collection, allowing
 * different prompt mechanisms for each input type.
 *
 * **Responsibilities:**
 * - Type detection via `canHandle()`
 * - User prompt implementation via `prompt()`
 * - Type-specific input collection (readline, hidden input, etc.)
 *
 * @example Text Input Strategy
 * ```typescript
 * class TextInputStrategy implements InputTypeStrategy {
 *   readonly name = "text";
 *
 *   canHandle(type: string): boolean {
 *     return type === "text" || type === "email" || type === "url";
 *   }
 *
 *   async prompt(config: InputConfig): Promise<string> {
 *     const rl = readline.createInterface({ input, output });
 *     return new Promise(resolve => {
 *       rl.question("> ", answer => {
 *         rl.close();
 *         resolve(answer || config.default || "");
 *       });
 *     });
 *   }
 * }
 * ```
 */
export interface InputTypeStrategy {
  /**
   * Strategy name for identification and debugging.
   * Should match the input type it handles.
   *
   * @example "text", "password", "select", "confirm", "number", "multiline"
   */
  readonly name: string;

  /**
   * Determines if this strategy can handle the given input type.
   *
   * @param type - Input type from configuration (text, password, select, etc.)
   * @returns True if strategy can handle this type, false otherwise
   *
   * @example
   * ```typescript
   * strategy.canHandle("password"); // → true for PasswordInputStrategy
   * strategy.canHandle("text");     // → false for PasswordInputStrategy
   * ```
   */
  canHandle(type: string): boolean;

  /**
   * Prompts the user for input using the appropriate method for this type.
   *
   * Implementations should:
   * - Use readline for interactive console input
   * - Handle default values when user provides no input
   * - Return the raw input value (validation happens separately)
   * - Properly close readline interfaces
   *
   * @param config - Input configuration with prompt, default, options, etc.
   * @returns Promise resolving to the user's input value
   *
   * @throws Error if prompting fails or is cancelled
   *
   * @example
   * ```typescript
   * const value = await strategy.prompt({
   *   prompt: "Enter your name:",
   *   variable: "name",
   *   type: "text",
   *   default: "Anonymous",
   *   required: false
   * });
   * ```
   */
  prompt(config: InputConfig): Promise<any>;
}
