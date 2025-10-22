/**
 * @fileoverview Input Type Strategy Registry
 *
 * Central registry for managing input type strategies.
 * Provides strategy registration, lookup, and default strategies.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";
import type { InputTypeStrategy } from "./input-type.interface";
import { TextInputStrategy } from "./text-input.strategy";
import { PasswordInputStrategy } from "./password-input.strategy";
import { SelectInputStrategy } from "./select-input.strategy";
import { ConfirmInputStrategy } from "./confirm-input.strategy";
import { NumberInputStrategy } from "./number-input.strategy";
import { MultilineInputStrategy } from "./multiline-input.strategy";

/**
 * Registry for input type strategies.
 *
 * Manages a collection of input type strategies and provides
 * lookup by input type. Supports dynamic registration and
 * comes with default strategies pre-registered.
 *
 * @example Basic usage
 * ```typescript
 * const registry = getDefaultInputTypeRegistry();
 * const strategy = registry.find("password");
 * const value = await strategy.prompt(config);
 * ```
 *
 * @example Custom strategy
 * ```typescript
 * const registry = new InputTypeRegistry();
 * registry.register(new CustomInputStrategy());
 * const strategy = registry.find("custom");
 * ```
 */
export class InputTypeRegistry {
  private strategies: Map<string, InputTypeStrategy> = new Map();

  /**
   * Registers an input type strategy.
   *
   * Strategies are indexed by their name for fast lookup.
   *
   * @param strategy - Strategy to register
   */
  register(strategy: InputTypeStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Finds a strategy that can handle the given input type.
   *
   * Searches through registered strategies using their canHandle() method.
   * Returns the first matching strategy.
   *
   * @param type - Input type to find strategy for
   * @returns Matching strategy or undefined if none found
   *
   * @example
   * ```typescript
   * const strategy = registry.find("password");
   * if (strategy) {
   *   const value = await strategy.prompt(config);
   * }
   * ```
   */
  find(type: string): InputTypeStrategy | undefined {
    for (const strategy of this.strategies.values()) {
      if (strategy.canHandle(type)) {
        return strategy;
      }
    }
    return undefined;
  }

  /**
   * Gets all registered strategies.
   *
   * @returns Array of all strategies
   */
  getAllStrategies(): InputTypeStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Removes all registered strategies.
   */
  clear(): void {
    this.strategies.clear();
  }

  /**
   * Returns the number of registered strategies.
   *
   * @returns Count of strategies
   */
  count(): number {
    return this.strategies.size;
  }

  /**
   * Prompts for input using the appropriate strategy.
   *
   * Convenience method that finds and executes strategy in one call.
   *
   * @param config - Input configuration
   * @returns Promise resolving to input value
   * @throws Error if no strategy found for input type
   */
  async prompt(config: InputConfig): Promise<any> {
    const strategy = this.find(config.type || "text");
    if (!strategy) {
      throw new Error(
        `No input strategy found for type: ${config.type || "text"}`
      );
    }
    return strategy.prompt(config);
  }
}

/**
 * Creates and returns a registry with all default input type strategies registered.
 *
 * Default strategies:
 * - TextInputStrategy (text, email, url)
 * - PasswordInputStrategy (password)
 * - SelectInputStrategy (select)
 * - ConfirmInputStrategy (confirm)
 * - NumberInputStrategy (number)
 * - MultilineInputStrategy (multiline)
 *
 * @returns Registry with default strategies
 *
 * @example
 * ```typescript
 * const registry = getDefaultInputTypeRegistry();
 * const textStrategy = registry.find("text");
 * const passwordStrategy = registry.find("password");
 * ```
 */
export function getDefaultInputTypeRegistry(): InputTypeRegistry {
  const registry = new InputTypeRegistry();

  // Register all default strategies
  registry.register(new TextInputStrategy());
  registry.register(new PasswordInputStrategy());
  registry.register(new SelectInputStrategy());
  registry.register(new ConfirmInputStrategy());
  registry.register(new NumberInputStrategy());
  registry.register(new MultilineInputStrategy());

  return registry;
}
