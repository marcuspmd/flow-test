/**
 * @fileoverview Additional tests for JavaScriptStrategy
 */

import { JavaScriptStrategy } from "../javascript.strategy";
import type { InterpolationStrategyContext } from "../../interpolation-strategy.interface";

describe("JavaScriptStrategy - Additional Coverage", () => {
  let strategy: JavaScriptStrategy;
  let mockContext: InterpolationStrategyContext;

  beforeEach(() => {
    strategy = new JavaScriptStrategy();
    mockContext = {
      variableResolver: jest.fn((key) => {
        const vars: Record<string, any> = {
          status: 200,
          count: 5,
          name: "test",
        };
        return vars[key];
      }),
      debug: false,
    };
  });

  describe("canHandle", () => {
    it("should handle $js: expressions", () => {
      expect(strategy.canHandle("$js:Date.now()")).toBe(true);
      expect(strategy.canHandle("$js:Math.random()")).toBe(true);
    });

    it("should handle js: expressions without $", () => {
      expect(strategy.canHandle("js:1 + 1")).toBe(true);
    });

    it("should handle logical operators", () => {
      expect(strategy.canHandle("status > 200")).toBe(true);
      expect(strategy.canHandle("count && name")).toBe(true);
      expect(strategy.canHandle("value || default")).toBe(true);
      expect(strategy.canHandle("x >= 5")).toBe(true);
      expect(strategy.canHandle("x <= 10")).toBe(true);
      expect(strategy.canHandle("x == y")).toBe(true);
      expect(strategy.canHandle("x != y")).toBe(true);
    });

    it("should handle ternary operator", () => {
      expect(strategy.canHandle("status ? 'ok' : 'error'")).toBe(true);
    });

    it("should not handle simple variables", () => {
      expect(strategy.canHandle("username")).toBe(false);
      expect(strategy.canHandle("user.name")).toBe(false);
    });
  });

  describe("resolve", () => {
    it("should resolve $js: prefix expressions", () => {
      const result = strategy.resolve("$js:1 + 1", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it("should resolve js: prefix expressions", () => {
      const result = strategy.resolve("js:10 * 5", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe(50);
    });

    it("should resolve Math operations", () => {
      const result = strategy.resolve("$js:Math.max(1, 2, 3)", mockContext);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it("should resolve Date operations", () => {
      const result = strategy.resolve("$js:typeof Date.now()", mockContext);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe("number");
    });

    it("should not handle non-js expressions", () => {
      const result = strategy.resolve("simple_variable", mockContext);
      
      expect(result.canHandle).toBe(false);
      expect(result.success).toBe(false);
    });
  });

  describe("preprocess", () => {
    it("should preprocess nested variable interpolation", () => {
      const input = "$js:Buffer.from('{{user}}:{{pass}}').toString('base64')";
      const preprocessed = strategy.preprocess(input, mockContext);
      
      expect(preprocessed).toBeDefined();
      expect(typeof preprocessed).toBe("string");
    });

    it("should handle expressions without nested variables", () => {
      const input = "$js:Math.random()";
      const preprocessed = strategy.preprocess(input, mockContext);
      
      expect(preprocessed).toBe(input);
    });
  });

  describe("priority", () => {
    it("should have priority 30", () => {
      expect(strategy.priority).toBe(30);
    });
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("JavaScript");
    });
  });
});
