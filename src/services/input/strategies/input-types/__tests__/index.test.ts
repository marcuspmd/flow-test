/**
 * @fileoverview Unit tests for InputTypeRegistry
 *
 * Tests registry management, strategy lookup, and default strategies.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import { InputTypeRegistry, getDefaultInputTypeRegistry } from "../index";
import type { InputTypeStrategy } from "../input-type.interface";
import type { InputConfig } from "../../../../../types/engine.types";

// Mock strategy for testing
class MockStrategy implements InputTypeStrategy {
  readonly name = "mock";

  canHandle(type: string): boolean {
    return type === "mock";
  }

  async prompt(config: InputConfig): Promise<any> {
    return "mock_value";
  }
}

class AnotherMockStrategy implements InputTypeStrategy {
  readonly name = "another";

  canHandle(type: string): boolean {
    return type === "another" || type === "alias";
  }

  async prompt(config: InputConfig): Promise<any> {
    return "another_value";
  }
}

describe("InputTypeRegistry", () => {
  let registry: InputTypeRegistry;

  beforeEach(() => {
    registry = new InputTypeRegistry();
  });

  describe("register", () => {
    it("should register a strategy", () => {
      const strategy = new MockStrategy();
      registry.register(strategy);

      expect(registry.count()).toBe(1);
    });

    it("should register multiple strategies", () => {
      registry.register(new MockStrategy());
      registry.register(new AnotherMockStrategy());

      expect(registry.count()).toBe(2);
    });

    it("should allow registering multiple strategies with different names", () => {
      const strategy1 = new MockStrategy();
      const strategy2 = new AnotherMockStrategy();

      registry.register(strategy1);
      registry.register(strategy2);

      expect(registry.count()).toBe(2);
      expect(registry.find("mock")).toBe(strategy1);
      expect(registry.find("another")).toBe(strategy2);
    });

    it("should overwrite existing strategy with same name", () => {
      const strategy1 = new MockStrategy();
      const strategy2 = new MockStrategy(); // Same name

      registry.register(strategy1);
      registry.register(strategy2);

      expect(registry.count()).toBe(1);
      expect(registry.find("mock")).toBe(strategy2);
    });
  });

  describe("find", () => {
    beforeEach(() => {
      registry.register(new MockStrategy());
      registry.register(new AnotherMockStrategy());
    });

    it("should find strategy by type it can handle", () => {
      const strategy = registry.find("mock");
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe("mock");
    });

    it("should find strategy that handles alias type", () => {
      const strategy = registry.find("alias");
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe("another");
    });

    it("should return undefined for unhandled type", () => {
      const strategy = registry.find("nonexistent");
      expect(strategy).toBeUndefined();
    });

    it("should return first matching strategy if multiple can handle type", () => {
      class FirstStrategy implements InputTypeStrategy {
        readonly name = "first";
        canHandle(type: string): boolean {
          return type === "shared";
        }
        async prompt(config: InputConfig): Promise<any> {
          return "first";
        }
      }

      class SecondStrategy implements InputTypeStrategy {
        readonly name = "second";
        canHandle(type: string): boolean {
          return type === "shared";
        }
        async prompt(config: InputConfig): Promise<any> {
          return "second";
        }
      }

      const first = new FirstStrategy();
      const second = new SecondStrategy();

      registry.register(first);
      registry.register(second);

      const found = registry.find("shared");
      // Should return first registered strategy that can handle it
      expect(found).toBeDefined();
      expect(found?.name).toBe("first");
    });

    it("should work with empty registry", () => {
      const emptyRegistry = new InputTypeRegistry();
      const strategy = emptyRegistry.find("anything");
      expect(strategy).toBeUndefined();
    });
  });

  describe("getAllStrategies", () => {
    it("should return empty array for empty registry", () => {
      const strategies = registry.getAllStrategies();
      expect(strategies).toEqual([]);
    });

    it("should return all registered strategies", () => {
      const mock = new MockStrategy();
      const another = new AnotherMockStrategy();

      registry.register(mock);
      registry.register(another);

      const strategies = registry.getAllStrategies();
      expect(strategies).toHaveLength(2);
      expect(strategies).toContain(mock);
      expect(strategies).toContain(another);
    });

    it("should return new array instance", () => {
      registry.register(new MockStrategy());

      const strategies1 = registry.getAllStrategies();
      const strategies2 = registry.getAllStrategies();

      expect(strategies1).not.toBe(strategies2);
      expect(strategies1).toEqual(strategies2);
    });
  });

  describe("clear", () => {
    it("should remove all strategies", () => {
      registry.register(new MockStrategy());
      registry.register(new AnotherMockStrategy());
      expect(registry.count()).toBe(2);

      registry.clear();
      expect(registry.count()).toBe(0);
    });

    it("should work on empty registry", () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.count()).toBe(0);
    });

    it("should allow registering after clear", () => {
      registry.register(new MockStrategy());
      registry.clear();
      registry.register(new AnotherMockStrategy());

      expect(registry.count()).toBe(1);
      expect(registry.find("another")).toBeDefined();
    });
  });

  describe("count", () => {
    it("should return 0 for empty registry", () => {
      expect(registry.count()).toBe(0);
    });

    it("should return correct count after registrations", () => {
      expect(registry.count()).toBe(0);

      registry.register(new MockStrategy());
      expect(registry.count()).toBe(1);

      registry.register(new AnotherMockStrategy());
      expect(registry.count()).toBe(2);
    });

    it("should return correct count after clear", () => {
      registry.register(new MockStrategy());
      registry.register(new AnotherMockStrategy());
      expect(registry.count()).toBe(2);

      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe("prompt", () => {
    beforeEach(() => {
      registry.register(new MockStrategy());
      registry.register(new AnotherMockStrategy());
    });

    it("should find and execute strategy for given type", async () => {
      const config: InputConfig = {
        prompt: "Enter mock:",
        variable: "mock_var",
        type: "mock" as any,
      };

      const result = await registry.prompt(config);
      expect(result).toBe("mock_value");
    });

    it("should default to text type when type not specified", async () => {
      const textStrategy = {
        name: "text",
        canHandle: (type: string) => type === "text",
        prompt: async () => "text_value",
      };

      registry.register(textStrategy as any);

      const config: Partial<InputConfig> = {
        prompt: "Enter something:",
        variable: "var",
        // type omitted
      };

      const result = await registry.prompt(config as InputConfig);
      expect(result).toBe("text_value");
    });

    it("should throw error when no strategy found", async () => {
      const config: InputConfig = {
        prompt: "Enter something:",
        variable: "var",
        type: "nonexistent" as any,
      };

      await expect(registry.prompt(config)).rejects.toThrow(
        "No input strategy found for type: nonexistent"
      );
    });

    it("should throw error when type not found and no text fallback", async () => {
      const emptyRegistry = new InputTypeRegistry();

      const config: Partial<InputConfig> = {
        prompt: "Enter:",
        variable: "var",
        // type omitted (defaults to text)
      };

      await expect(emptyRegistry.prompt(config as InputConfig)).rejects.toThrow(
        "No input strategy found for type: text"
      );
    });

    it("should work with alias types", async () => {
      const config: InputConfig = {
        prompt: "Enter alias:",
        variable: "alias_var",
        type: "alias" as any,
      };

      const result = await registry.prompt(config);
      expect(result).toBe("another_value");
    });
  });
});

describe("getDefaultInputTypeRegistry", () => {
  it("should return registry with all default strategies", () => {
    const registry = getDefaultInputTypeRegistry();

    expect(registry.count()).toBe(6);
  });

  it("should have text strategy registered", () => {
    const registry = getDefaultInputTypeRegistry();
    const strategy = registry.find("text");

    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe("text");
  });

  it("should have password strategy registered", () => {
    const registry = getDefaultInputTypeRegistry();
    const strategy = registry.find("password");

    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe("password");
  });

  it("should have select strategy registered", () => {
    const registry = getDefaultInputTypeRegistry();
    const strategy = registry.find("select");

    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe("select");
  });

  it("should have confirm strategy registered", () => {
    const registry = getDefaultInputTypeRegistry();
    const strategy = registry.find("confirm");

    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe("confirm");
  });

  it("should have number strategy registered", () => {
    const registry = getDefaultInputTypeRegistry();
    const strategy = registry.find("number");

    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe("number");
  });

  it("should have multiline strategy registered", () => {
    const registry = getDefaultInputTypeRegistry();
    const strategy = registry.find("multiline");

    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe("multiline");
  });

  it("should handle text type variations", () => {
    const registry = getDefaultInputTypeRegistry();

    expect(registry.find("text")).toBeDefined();
    expect(registry.find("email")).toBeDefined();
    expect(registry.find("url")).toBeDefined();
  });

  it("should return different instances on each call", () => {
    const registry1 = getDefaultInputTypeRegistry();
    const registry2 = getDefaultInputTypeRegistry();

    expect(registry1).not.toBe(registry2);
  });

  it("should return fresh registries that can be modified independently", () => {
    const registry1 = getDefaultInputTypeRegistry();
    const registry2 = getDefaultInputTypeRegistry();

    expect(registry1.count()).toBe(6);
    expect(registry2.count()).toBe(6);

    registry1.clear();

    expect(registry1.count()).toBe(0);
    expect(registry2.count()).toBe(6);
  });

  it("should allow adding custom strategies to default registry", () => {
    const registry = getDefaultInputTypeRegistry();
    const initialCount = registry.count();

    class CustomStrategy implements InputTypeStrategy {
      readonly name = "custom";
      canHandle(type: string): boolean {
        return type === "custom";
      }
      async prompt(config: InputConfig): Promise<any> {
        return "custom_value";
      }
    }

    registry.register(new CustomStrategy());

    expect(registry.count()).toBe(initialCount + 1);
    expect(registry.find("custom")).toBeDefined();
  });

  it("should integrate with all strategy types", async () => {
    const registry = getDefaultInputTypeRegistry();

    // All strategies should be found
    expect(registry.find("text")).toBeDefined();
    expect(registry.find("password")).toBeDefined();
    expect(registry.find("number")).toBeDefined();
    expect(registry.find("select")).toBeDefined();
    expect(registry.find("confirm")).toBeDefined();
    expect(registry.find("multiline")).toBeDefined();
    expect(registry.find("email")).toBeDefined(); // text strategy handles email
    expect(registry.find("url")).toBeDefined(); // text strategy handles url
  });
});
