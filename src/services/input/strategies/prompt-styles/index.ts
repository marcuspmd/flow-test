/**
 * @fileoverview Prompt Style Strategy Registry
 *
 * Central registry for managing prompt style strategies.
 * Provides strategy registration, lookup, and default strategies.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import type { InputConfig } from "../../../../types/engine.types";
import type { PromptStyleStrategy } from "./prompt-style.interface";
import { SimplePromptStyle } from "./simple-style.strategy";
import { BoxedPromptStyle } from "./boxed-style.strategy";
import { HighlightedPromptStyle } from "./highlighted-style.strategy";

/**
 * Registry for prompt style strategies.
 *
 * Manages a collection of prompt style strategies and provides
 * lookup by style name. Supports dynamic registration and
 * comes with default strategies pre-registered.
 *
 * @example Basic usage
 * ```typescript
 * const registry = getDefaultPromptStyleRegistry();
 * const strategy = registry.find("boxed");
 * strategy.display(config);
 * ```
 *
 * @example Custom strategy
 * ```typescript
 * const registry = new PromptStyleRegistry();
 * registry.register(new CustomPromptStyle());
 * const strategy = registry.find("custom");
 * ```
 */
export class PromptStyleRegistry {
  private strategies: Map<string, PromptStyleStrategy> = new Map();

  /**
   * Registers a prompt style strategy.
   *
   * Strategies are indexed by their name for fast lookup.
   *
   * @param strategy - Strategy to register
   */
  register(strategy: PromptStyleStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Finds a strategy that can handle the given style.
   *
   * Searches through registered strategies using their canHandle() method.
   * Returns the first matching strategy.
   * Falls back to "simple" style if no match found.
   *
   * @param style - Style name to find strategy for (undefined defaults to "simple")
   * @returns Matching strategy or simple style as fallback
   *
   * @example
   * ```typescript
   * const strategy = registry.find("boxed");
   * strategy.display(config);
   *
   * const defaultStrategy = registry.find(); // Returns simple style
   * ```
   */
  find(style?: string): PromptStyleStrategy {
    for (const strategy of this.strategies.values()) {
      if (strategy.canHandle(style)) {
        return strategy;
      }
    }

    // Fallback to simple style
    const simpleStrategy = this.strategies.get("simple");
    if (simpleStrategy) {
      return simpleStrategy;
    }

    // Last resort: create new simple strategy
    return new SimplePromptStyle();
  }

  /**
   * Gets all registered strategies.
   *
   * @returns Array of all strategies
   */
  getAllStrategies(): PromptStyleStrategy[] {
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
   * Displays prompt using the appropriate style strategy.
   *
   * Convenience method that finds and executes strategy in one call.
   *
   * @param config - Input configuration with optional style property
   */
  display(config: InputConfig): void {
    const strategy = this.find(config.style);
    strategy.display(config);
  }
}

/**
 * Creates and returns a registry with all default prompt style strategies registered.
 *
 * Default strategies:
 * - SimplePromptStyle (simple or undefined)
 * - BoxedPromptStyle (boxed)
 * - HighlightedPromptStyle (highlighted)
 *
 * @returns Registry with default strategies
 *
 * @example
 * ```typescript
 * const registry = getDefaultPromptStyleRegistry();
 * const simpleStyle = registry.find("simple");
 * const boxedStyle = registry.find("boxed");
 * const highlightedStyle = registry.find("highlighted");
 * ```
 */
export function getDefaultPromptStyleRegistry(): PromptStyleRegistry {
  const registry = new PromptStyleRegistry();

  // Register all default strategies
  registry.register(new SimplePromptStyle());
  registry.register(new BoxedPromptStyle());
  registry.register(new HighlightedPromptStyle());

  return registry;
}
