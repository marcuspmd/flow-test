/**
 * @fileoverview Unit tests for StepStrategyFactory.
 */

import { StepStrategyFactory } from "../step-strategy.factory";
import type { StepExecutionStrategy, StepExecutionContext } from "../step-execution.strategy";
import type { TestStep, StepExecutionResult } from "../../../../types/engine.types";

// Mock strategy for testing
class MockStrategy implements StepExecutionStrategy {
  constructor(
    private readonly handleCondition: (step: TestStep) => boolean,
    public readonly name: string = "MockStrategy"
  ) {}

  canHandle(step: TestStep): boolean {
    return this.handleCondition(step);
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    return {
      step_name: context.step.name,
      status: "success",
      duration_ms: 0,
      assertions_results: [],
      captured_variables: {},
    };
  }
}

describe("StepStrategyFactory", () => {
  describe("constructor", () => {
    it("should create factory with empty strategies array", () => {
      const factory = new StepStrategyFactory();
      expect(factory.getRegisteredStrategies()).toHaveLength(0);
    });
  });

  describe("registerStrategy", () => {
    it("should register strategy at end by default", () => {
      const factory = new StepStrategyFactory();
      const strategy1 = new MockStrategy(() => true, "Strategy1");
      const strategy2 = new MockStrategy(() => true, "Strategy2");

      factory.registerStrategy(strategy1);
      factory.registerStrategy(strategy2);

      const strategies = factory.getRegisteredStrategies();
      expect(strategies).toHaveLength(2);
      expect((strategies[0] as MockStrategy).name).toBe("Strategy1");
      expect((strategies[1] as MockStrategy).name).toBe("Strategy2");
    });

    it("should register strategy at specific priority position", () => {
      const factory = new StepStrategyFactory();
      const strategy1 = new MockStrategy(() => true, "Strategy1");
      const strategy2 = new MockStrategy(() => true, "Strategy2");
      const strategy3 = new MockStrategy(() => true, "Strategy3");

      factory.registerStrategy(strategy1);
      factory.registerStrategy(strategy2);
      factory.registerStrategy(strategy3, 0); // Insert at beginning

      const strategies = factory.getRegisteredStrategies();
      expect((strategies[0] as MockStrategy).name).toBe("Strategy3"); // High priority
      expect((strategies[1] as MockStrategy).name).toBe("Strategy1");
      expect((strategies[2] as MockStrategy).name).toBe("Strategy2");
    });

    it("should register strategy at middle priority position", () => {
      const factory = new StepStrategyFactory();
      const strategy1 = new MockStrategy(() => true, "Strategy1");
      const strategy2 = new MockStrategy(() => true, "Strategy2");
      const strategy3 = new MockStrategy(() => true, "Strategy3");

      factory.registerStrategy(strategy1);
      factory.registerStrategy(strategy2);
      factory.registerStrategy(strategy3, 1); // Insert at middle

      const strategies = factory.getRegisteredStrategies();
      expect((strategies[0] as MockStrategy).name).toBe("Strategy1");
      expect((strategies[1] as MockStrategy).name).toBe("Strategy3"); // Middle
      expect((strategies[2] as MockStrategy).name).toBe("Strategy2");
    });
  });

  describe("getStrategy", () => {
    it("should return first matching strategy", () => {
      const factory = new StepStrategyFactory();
      const strategy1 = new MockStrategy((step) => !!step.request, "RequestStrategy");
      const strategy2 = new MockStrategy((step) => !!step.input, "InputStrategy");

      factory.registerStrategy(strategy1);
      factory.registerStrategy(strategy2);

      const requestStep: TestStep = {
        name: "Test Request",
        request: { method: "GET", url: "/api/test" },
      };

      const strategy = factory.getStrategy(requestStep);
      expect((strategy as MockStrategy).name).toBe("RequestStrategy");
    });

    it("should evaluate strategies in priority order", () => {
      const factory = new StepStrategyFactory();
      
      // Both strategies can handle steps with 'request'
      const genericStrategy = new MockStrategy((step) => !!step.request, "GenericStrategy");
      const specificStrategy = new MockStrategy((step) => !!step.request, "SpecificStrategy");

      // Register generic first, then specific with high priority
      factory.registerStrategy(genericStrategy);
      factory.registerStrategy(specificStrategy, 0);

      const step: TestStep = {
        name: "Test",
        request: { method: "GET", url: "/api" },
      };

      const strategy = factory.getStrategy(step);
      // Should return specific strategy (registered with priority 0)
      expect((strategy as MockStrategy).name).toBe("SpecificStrategy");
    });

    it("should throw error if no strategy can handle step", () => {
      const factory = new StepStrategyFactory();
      const strategy = new MockStrategy(() => false, "NeverMatchStrategy");
      factory.registerStrategy(strategy);

      const step: TestStep = {
        name: "Unhandled Step",
      };

      expect(() => factory.getStrategy(step)).toThrow(
        "No strategy found for step: Unhandled Step"
      );
    });

    it("should throw error with helpful message when no strategies registered", () => {
      const factory = new StepStrategyFactory();

      const step: TestStep = {
        name: "Test Step",
        request: { method: "GET", url: "/api" },
      };

      expect(() => factory.getStrategy(step)).toThrow(
        /No strategy found for step: Test Step.*Available strategies: 0/
      );
    });

    it("should handle step with multiple properties (iterate takes priority)", () => {
      const factory = new StepStrategyFactory();
      
      const iterateStrategy = new MockStrategy((step) => !!step.iterate, "IterateStrategy");
      const requestStrategy = new MockStrategy((step) => !!step.request, "RequestStrategy");

      // Register iterate with high priority
      factory.registerStrategy(iterateStrategy, 0);
      factory.registerStrategy(requestStrategy);

      const step: TestStep = {
        name: "Iterated Request",
        iterate: { over: "{{items}}", as: "item" },
        request: { method: "GET", url: "/api/{{item}}" },
      };

      const strategy = factory.getStrategy(step);
      expect((strategy as MockStrategy).name).toBe("IterateStrategy");
    });
  });

  describe("getRegisteredStrategies", () => {
    it("should return readonly array of strategies", () => {
      const factory = new StepStrategyFactory();
      const strategy1 = new MockStrategy(() => true, "Strategy1");
      const strategy2 = new MockStrategy(() => true, "Strategy2");

      factory.registerStrategy(strategy1);
      factory.registerStrategy(strategy2);

      const strategies = factory.getRegisteredStrategies();
      
      expect(strategies).toHaveLength(2);
      expect(Object.isFrozen(strategies)).toBe(true);
    });

    it("should return copy of strategies array (not original)", () => {
      const factory = new StepStrategyFactory();
      const strategy = new MockStrategy(() => true, "Strategy");

      factory.registerStrategy(strategy);

      const strategies1 = factory.getRegisteredStrategies();
      const strategies2 = factory.getRegisteredStrategies();

      expect(strategies1).not.toBe(strategies2); // Different array instances
      expect(strategies1[0]).toBe(strategies2[0]); // Same strategy instance
    });
  });

  describe("edge cases", () => {
    it("should handle priority out of bounds (negative)", () => {
      const factory = new StepStrategyFactory();
      const strategy = new MockStrategy(() => true, "Strategy");

      const initialCount = factory.getRegisteredStrategies().length;
      factory.registerStrategy(strategy, -1); // Invalid priority

      const strategies = factory.getRegisteredStrategies();
      expect(strategies).toHaveLength(initialCount + 1); // Should append to end
    });

    it("should handle priority out of bounds (too large)", () => {
      const factory = new StepStrategyFactory();
      const strategy1 = new MockStrategy(() => true, "Strategy1");
      const strategy2 = new MockStrategy(() => true, "Strategy2");

      const initialCount = factory.getRegisteredStrategies().length;
      factory.registerStrategy(strategy1);
      factory.registerStrategy(strategy2, 999); // Priority > length

      const strategies = factory.getRegisteredStrategies();
      expect(strategies).toHaveLength(initialCount + 2);
      // Strategy2 should be at the end
      const lastStrategy = strategies[strategies.length - 1] as MockStrategy;
      expect(lastStrategy.name).toBe("Strategy2");
    });

    it("should handle step with no properties", () => {
      const factory = new StepStrategyFactory();
      const fallbackStrategy = new MockStrategy(() => true, "FallbackStrategy");
      factory.registerStrategy(fallbackStrategy);

      const emptyStep: TestStep = {
        name: "Empty Step",
      };

      const strategy = factory.getStrategy(emptyStep);
      expect((strategy as MockStrategy).name).toBe("FallbackStrategy");
    });
  });
});
