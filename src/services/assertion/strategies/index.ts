/**
 * @fileoverview Central export point for all assertion strategies.
 *
 * @remarks
 * This module provides a registry of all available assertion strategies
 * and utility functions to manage them.
 *
 * @packageDocumentation
 */

import { AssertionStrategy } from "./assertion-strategy.interface";
import { EqualsStrategy } from "./equals.strategy";
import { NotEqualsStrategy } from "./not-equals.strategy";
import { ContainsStrategy } from "./contains.strategy";
import { RegexStrategy } from "./regex.strategy";
import { TypeStrategy } from "./type.strategy";
import { ExistsStrategy } from "./exists.strategy";
import {
  GreaterThanStrategy,
  LessThanStrategy,
  GreaterThanOrEqualStrategy,
  LessThanOrEqualStrategy,
} from "./comparison.strategy";
import { LengthStrategy, MinLengthStrategy } from "./length.strategy";
import { NotEmptyStrategy } from "./not-empty.strategy";

// Export all strategies
export * from "./assertion-strategy.interface";
export * from "./equals.strategy";
export * from "./not-equals.strategy";
export * from "./contains.strategy";
export * from "./regex.strategy";
export * from "./type.strategy";
export * from "./exists.strategy";
export * from "./comparison.strategy";
export * from "./length.strategy";
export * from "./not-empty.strategy";

/**
 * Creates and returns the default set of assertion strategies.
 *
 * @remarks
 * The order matters: strategies are checked in sequence and the first
 * matching strategy is used. More specific strategies should come first.
 *
 * @returns Array of all available assertion strategies
 *
 * @example
 * ```typescript
 * const strategies = getDefaultStrategies();
 * const strategy = strategies.find(s => s.canHandle({ equals: 200 }));
 * ```
 *
 * @public
 */
export function getDefaultStrategies(): AssertionStrategy[] {
  return [
    new EqualsStrategy(),
    new NotEqualsStrategy(),
    new ContainsStrategy(),
    new RegexStrategy(),
    new TypeStrategy(),
    new ExistsStrategy(),
    new GreaterThanStrategy(),
    new LessThanStrategy(),
    new GreaterThanOrEqualStrategy(),
    new LessThanOrEqualStrategy(),
    new LengthStrategy(),
    new MinLengthStrategy(),
    new NotEmptyStrategy(),
  ];
}

/**
 * Registry for managing assertion strategies with dynamic registration.
 *
 * @remarks
 * Allows runtime registration of custom strategies following the Open/Closed Principle.
 *
 * @example
 * ```typescript
 * const registry = new StrategyRegistry();
 * registry.register(new CustomStrategy());
 *
 * const strategy = registry.findStrategy({ custom_check: true });
 * ```
 *
 * @public
 */
export class StrategyRegistry {
  private strategies: AssertionStrategy[] = [];

  /**
   * Creates a new registry with optional initial strategies.
   *
   * @param initialStrategies - Optional array of strategies to register initially
   */
  constructor(initialStrategies: AssertionStrategy[] = getDefaultStrategies()) {
    this.strategies = [...initialStrategies];
  }

  /**
   * Registers a new assertion strategy.
   *
   * @param strategy - The strategy to register
   * @returns The registry instance for chaining
   */
  register(strategy: AssertionStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  /**
   * Finds the first strategy that can handle the given checks.
   *
   * @param checks - The assertion checks to match
   * @returns The matching strategy or undefined
   */
  findStrategy(checks: any): AssertionStrategy | undefined {
    return this.strategies.find((strategy) => strategy.canHandle(checks));
  }

  /**
   * Finds all strategies that can handle the given checks.
   *
   * @param checks - The assertion checks to match
   * @returns Array of matching strategies
   */
  findAllStrategies(checks: any): AssertionStrategy[] {
    return this.strategies.filter((strategy) => strategy.canHandle(checks));
  }

  /**
   * Gets all registered strategies.
   *
   * @returns Array of all strategies
   */
  getAllStrategies(): AssertionStrategy[] {
    return [...this.strategies];
  }

  /**
   * Removes all registered strategies.
   */
  clear(): void {
    this.strategies = [];
  }
}
