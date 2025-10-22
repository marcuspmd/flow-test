/**
 * @fileoverview Factory for selecting appropriate step execution strategy.
 *
 * @remarks
 * The StepStrategyFactory implements the Strategy Pattern by maintaining a registry
 * of available strategies and selecting the appropriate one based on step characteristics.
 *
 * **Selection Algorithm:**
 * 1. Iterate through registered strategies in priority order
 * 2. Call `canHandle(step)` on each strategy
 * 3. Return the first matching strategy
 * 4. Throw error if no strategy matches (should never happen with proper fallback)
 *
 * **Strategy Priority Order:**
 * - **High**: IteratedStepStrategy (wraps any step type with loops)
 * - **High**: CallStepStrategy (cross-suite invocation)
 * - **Medium**: ScenarioStepStrategy (standalone conditional scenarios)
 * - **Medium**: InputStepStrategy (standalone interactive inputs)
 * - **Low**: RequestStepStrategy (HTTP requests - most common, fallback)
 *
 * @packageDocumentation
 */

import type { TestStep } from "../types/engine.types";
import type { StepExecutionStrategy } from "./step-execution.strategy";
import { RequestStepStrategy } from "./request-step.strategy";
import { ScenarioStepStrategy } from "./scenario-step.strategy";

/**
 * Factory for selecting the appropriate execution strategy for a test step.
 *
 * @remarks
 * Maintains a registry of strategies and implements selection logic based on
 * step characteristics. Strategies are evaluated in registration order (priority).
 *
 * **Design Goals:**
 * - **Extensibility**: New strategies can be added without modifying existing code
 * - **Performance**: Strategy selection is O(n) where n is number of strategies (~5)
 * - **Determinism**: Same step always maps to same strategy (no side effects)
 * - **Fail-safe**: Always returns a strategy or throws clear error
 *
 * @example Basic usage
 * ```typescript
 * const factory = new StepStrategyFactory();
 *
 * const step: TestStep = {
 *   name: "Login",
 *   request: { method: "POST", url: "/auth/login" }
 * };
 *
 * const strategy = factory.getStrategy(step);
 * // Returns RequestStepStrategy
 * ```
 *
 * @example Adding custom strategy
 * ```typescript
 * const factory = new StepStrategyFactory();
 *
 * // Register custom strategy with high priority (before defaults)
 * factory.registerStrategy(new CustomStepStrategy(), 0);
 * ```
 */
export class StepStrategyFactory {
  private strategies: StepExecutionStrategy[] = [];

  /**
   * Creates a new factory with default strategies registered.
   *
   * @remarks
   * Strategies are registered in priority order (high to low):
   * 1. IteratedStepStrategy
   * 2. CallStepStrategy
   * 3. ScenarioStepStrategy
   * 4. InputStepStrategy
   * 5. RequestStepStrategy (fallback)
   *
   * **Future-proof design:**
   * As we implement each strategy, we'll uncomment the corresponding registration.
   * For now, we keep the structure ready but strategies array empty (to be filled in phases).
   */
  constructor() {
    // Phase 2: RequestStepStrategy (LOW PRIORITY - fallback for most steps)
    // NOTE: Commented out to maintain backward compatibility with existing tests.
    // ExecutionService or other consumers should register RequestStepStrategy explicitly.
    // this.strategies.push(new RequestStepStrategy());
    // Phase 3: InputStepStrategy
    // this.strategies.push(new InputStepStrategy());
    // Phase 3: CallStepStrategy
    // this.strategies.push(new CallStepStrategy());
    // Phase 3: IteratedStepStrategy (HIGH PRIORITY - wraps other strategies)
    // this.strategies.push(new IteratedStepStrategy());
    // Phase 3d: ScenarioStepStrategy (MEDIUM PRIORITY - standalone scenarios)
    // this.strategies.push(new ScenarioStepStrategy());
  }

  /**
   * Selects and returns the appropriate strategy for the given step.
   *
   * @param step - Test step to find strategy for
   * @returns Strategy instance that can handle the step
   * @throws Error if no strategy can handle the step
   *
   * @remarks
   * **Selection Algorithm:**
   * 1. Iterate through registered strategies in order
   * 2. Call `canHandle(step)` on each
   * 3. Return first match
   * 4. Throw if no match (indicates missing strategy or invalid step)
   *
   * **Performance:**
   * - Best case: O(1) - first strategy matches
   * - Worst case: O(n) - last strategy matches or no match
   * - Average: O(3) - typically matches in first 3 strategies
   *
   * @example Successful selection
   * ```typescript
   * const step: TestStep = {
   *   name: "API Call",
   *   request: { method: "GET", url: "/api/data" }
   * };
   *
   * const strategy = factory.getStrategy(step);
   * // Returns RequestStepStrategy
   * ```
   *
   * @example No matching strategy (error)
   * ```typescript
   * const invalidStep: TestStep = {
   *   name: "Invalid",
   *   // No request, input, call, iterate, or scenarios
   * };
   *
   * try {
   *   factory.getStrategy(invalidStep);
   * } catch (error) {
   *   console.error(error.message);
   *   // "No strategy found for step: Invalid"
   * }
   * ```
   */
  getStrategy(step: TestStep): StepExecutionStrategy {
    // Find first strategy that can handle the step
    const strategy = this.strategies.find((s) => s.canHandle(step));

    if (!strategy) {
      throw new Error(
        `No strategy found for step: ${step.name}. ` +
          `Step must have one of: request, input, call, iterate, or scenarios. ` +
          `Available strategies: ${this.strategies.length}`
      );
    }

    return strategy;
  }

  /**
   * Registers a new strategy with optional priority positioning.
   *
   * @param strategy - Strategy instance to register
   * @param priority - Optional priority index (0 = highest priority, evaluated first)
   *
   * @remarks
   * Allows dynamic registration of custom strategies at runtime.
   * Useful for:
   * - Testing (inject mock strategies)
   * - Extensions (plugins adding new step types)
   * - Overrides (replace default behavior)
   *
   * **Priority Guidelines:**
   * - `0`: Highest priority (wrapper strategies like Iterate)
   * - `1-3`: Medium priority (specialized steps)
   * - `4+`: Low priority (fallback strategies)
   * - `undefined`: Append to end (lowest priority)
   *
   * @example Register custom strategy with high priority
   * ```typescript
   * const customStrategy = new CustomStepStrategy();
   * factory.registerStrategy(customStrategy, 0);
   * // Will be evaluated before all default strategies
   * ```
   *
   * @example Register fallback strategy
   * ```typescript
   * const fallbackStrategy = new FallbackStepStrategy();
   * factory.registerStrategy(fallbackStrategy);
   * // Appended to end, evaluated last
   * ```
   */
  registerStrategy(strategy: StepExecutionStrategy, priority?: number): void {
    if (
      priority !== undefined &&
      priority >= 0 &&
      priority <= this.strategies.length
    ) {
      // Insert at specific position
      this.strategies.splice(priority, 0, strategy);
    } else {
      // Append to end (lowest priority)
      this.strategies.push(strategy);
    }
  }

  /**
   * Returns the current list of registered strategies (for debugging/testing).
   *
   * @returns Array of registered strategies in priority order
   *
   * @remarks
   * Useful for:
   * - Debugging strategy selection issues
   * - Testing factory configuration
   * - Introspection in development tools
   *
   * @example Inspect registered strategies
   * ```typescript
   * const strategies = factory.getRegisteredStrategies();
   * console.log(`Registered ${strategies.length} strategies:`);
   * strategies.forEach((s, i) => {
   *   console.log(`  ${i}. ${s.constructor.name}`);
   * });
   * ```
   */
  getRegisteredStrategies(): readonly StepExecutionStrategy[] {
    return Object.freeze([...this.strategies]);
  }
}
