/**
 * @fileoverview Tests for interpolation strategies
 */

import { EnvironmentVariableStrategy } from "../environment-variable.strategy";
import { FakerStrategy } from "../faker.strategy";
import { VariableStrategy } from "../variable.strategy";
import type { InterpolationStrategyContext } from "../../interpolation-strategy.interface";

describe("EnvironmentVariableStrategy", () => {
  let strategy: EnvironmentVariableStrategy;
  let mockContext: InterpolationStrategyContext;

  beforeEach(() => {
    strategy = new EnvironmentVariableStrategy();
    mockContext = {
      variableResolver: jest.fn(),
      debug: false,
    };
  });

  describe("canHandle", () => {
    it("should handle $env. expressions", () => {
      expect(strategy.canHandle("$env.API_KEY")).toBe(true);
      expect(strategy.canHandle("$env.DATABASE_URL")).toBe(true);
    });

    it("should not handle other expressions", () => {
      expect(strategy.canHandle("API_KEY")).toBe(false);
      expect(strategy.canHandle("$faker.name")).toBe(false);
      expect(strategy.canHandle("variable")).toBe(false);
    });
  });

  describe("resolve", () => {
    it("should resolve existing environment variable", () => {
      process.env.TEST_VAR = "test-value";
      
      const result = strategy.resolve("$env.TEST_VAR", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe("test-value");
      
      delete process.env.TEST_VAR;
    });

    it("should return null for missing environment variable", () => {
      const result = strategy.resolve("$env.MISSING_VAR", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe(null);
    });

    it("should not handle non-env expressions", () => {
      const result = strategy.resolve("regular_var", mockContext);
      
      expect(result.canHandle).toBe(false);
      expect(result.success).toBe(false);
    });

    it("should log in debug mode", () => {
      process.env.DEBUG_VAR = "debug-value";
      mockContext.debug = true;
      const loggerSpy = jest.spyOn(console, "debug").mockImplementation();
      
      strategy.resolve("$env.DEBUG_VAR", mockContext);
      
      delete process.env.DEBUG_VAR;
      loggerSpy.mockRestore();
    });

    it("should extract variable name correctly", () => {
      process.env.MY_API_KEY = "secret";
      
      const result = strategy.resolve("$env.MY_API_KEY", mockContext);
      
      expect(result.value).toBe("secret");
      delete process.env.MY_API_KEY;
    });
  });

  describe("priority", () => {
    it("should have priority 10", () => {
      expect(strategy.priority).toBe(10);
    });
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("EnvironmentVariable");
    });
  });
});

describe("FakerStrategy", () => {
  let strategy: FakerStrategy;
  let mockContext: InterpolationStrategyContext;

  beforeEach(() => {
    strategy = new FakerStrategy();
    mockContext = {
      variableResolver: jest.fn(),
      debug: false,
    };
  });

  describe("canHandle", () => {
    it("should handle $faker. expressions", () => {
      expect(strategy.canHandle("$faker.person.firstName")).toBe(true);
      expect(strategy.canHandle("$faker.internet.email")).toBe(true);
    });

    it("should handle faker. expressions without $", () => {
      expect(strategy.canHandle("faker.person.firstName")).toBe(true);
      expect(strategy.canHandle("faker.internet.email")).toBe(true);
    });

    it("should not handle other expressions", () => {
      expect(strategy.canHandle("$env.VAR")).toBe(false);
      expect(strategy.canHandle("variable")).toBe(false);
    });
  });

  describe("resolve", () => {
    it("should resolve faker expressions with $ prefix", () => {
      const result = strategy.resolve("$faker.string.uuid", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe("string");
    });

    it("should resolve faker expressions without $ prefix", () => {
      const result = strategy.resolve("faker.string.uuid", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
    });

    it("should return error for invalid faker expression", () => {
      const result = strategy.resolve("$faker.invalid.method", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to resolve Faker expression");
    });

    it("should not handle non-faker expressions", () => {
      const result = strategy.resolve("regular_var", mockContext);
      
      expect(result.canHandle).toBe(false);
      expect(result.success).toBe(false);
    });

    it("should generate different values on multiple calls", () => {
      const result1 = strategy.resolve("$faker.string.uuid", mockContext);
      const result2 = strategy.resolve("$faker.string.uuid", mockContext);
      
      expect(result1.value).not.toBe(result2.value);
    });

    it("should log in debug mode", () => {
      mockContext.debug = true;
      const result = strategy.resolve("$faker.string.uuid", mockContext);
      
      expect(result.success).toBe(true);
      mockContext.debug = false;
    });

    it("should normalize expressions by removing $ prefix", () => {
      const result1 = strategy.resolve("$faker.person.firstName", mockContext);
      const result2 = strategy.resolve("faker.person.firstName", mockContext);
      
      expect(result1.canHandle).toBe(true);
      expect(result2.canHandle).toBe(true);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe("priority", () => {
    it("should have priority 20", () => {
      expect(strategy.priority).toBe(20);
    });
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("Faker");
    });
  });
});

describe("JavaScriptStrategy", () => {
  let strategy: any;
  let mockContext: InterpolationStrategyContext;

  beforeEach(() => {
    const { JavaScriptStrategy } = require("../javascript.strategy");
    strategy = new JavaScriptStrategy();
    mockContext = {
      variableResolver: jest.fn(),
      debug: false,
    };
  });

  describe("canHandle", () => {
    it("should handle $js: expressions", () => {
      expect(strategy.canHandle("$js:Date.now()")).toBe(true);
    });

    it("should handle js: expressions", () => {
      expect(strategy.canHandle("js:Math.random()")).toBe(true);
    });

    it("should handle $js. expressions", () => {
      expect(strategy.canHandle("$js.return 42")).toBe(true);
    });

    it("should handle logical operators", () => {
      expect(strategy.canHandle("status > 200 && status < 300")).toBe(true);
      expect(strategy.canHandle("x || y")).toBe(true);
      expect(strategy.canHandle("a === b")).toBe(true);
      expect(strategy.canHandle("condition ? true : false")).toBe(true);
    });

    it("should not handle non-JS expressions", () => {
      expect(strategy.canHandle("regular_variable")).toBe(false);
      expect(strategy.canHandle("$env.VAR")).toBe(false);
      expect(strategy.canHandle("$faker.name")).toBe(false);
    });
  });

  describe("resolve", () => {
    it("should resolve $js: expressions", () => {
      const result = strategy.resolve("$js:1 + 1", mockContext);
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it("should resolve js: expressions without $", () => {
      const result = strategy.resolve("js:2 * 3", mockContext);
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe(6);
    });

    it("should resolve $js. code blocks", () => {
      const result = strategy.resolve("$js.return [1,2,3].length", mockContext);
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it("should handle errors gracefully", () => {
      const result = strategy.resolve("$js:throw new Error('test')", mockContext);
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to execute JavaScript");
    });

    it("should preprocess nested variables", () => {
      (mockContext.variableResolver as jest.Mock).mockImplementation((path: string) => {
        if (path === "user") return "admin";
        if (path === "pass") return "secret";
      });

      const result = strategy.resolve(
        "$js:Buffer.from('{{user}}:{{pass}}').toString('base64')",
        mockContext
      );
      expect(result.success).toBe(true);
      expect(result.value).toBe(Buffer.from("admin:secret").toString("base64"));
    });

    it("should skip nested Faker expressions in preprocessing", () => {
      const result = strategy.resolve(
        "$js:someFunc('{{$faker.name}}')",
        mockContext
      );
      // Should not resolve nested $faker
      expect(result.canHandle).toBe(true);
    });

    it("should skip nested JS expressions in preprocessing", () => {
      const result = strategy.resolve(
        "$js:someFunc('{{$js:42}}')",
        mockContext
      );
      // Should not resolve nested $js
      expect(result.canHandle).toBe(true);
    });

    it("should handle $env in preprocessing", () => {
      process.env.TEST_ENV = "test-value";
      const result = strategy.resolve(
        "$js:'Value: ' + '{{$env.TEST_ENV}}'",
        mockContext
      );
      expect(result.success).toBe(true);
      expect(result.value).toContain("test-value");
      delete process.env.TEST_ENV;
    });

    it("should log debug messages when debug is enabled", () => {
      mockContext.debug = true;
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();

      strategy.resolve("$js:1 + 1", mockContext);

      consoleSpy.mockRestore();
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

describe("VariableStrategy", () => {
  let strategy: VariableStrategy;
  let mockContext: InterpolationStrategyContext;

  beforeEach(() => {
    strategy = new VariableStrategy();
    mockContext = {
      variableResolver: jest.fn(),
      debug: false,
    };
  });

  describe("canHandle", () => {
    it("should handle any expression", () => {
      expect(strategy.canHandle("username")).toBe(true);
      expect(strategy.canHandle("user.profile.name")).toBe(true);
      expect(strategy.canHandle("auth-flow.token")).toBe(true);
      expect(strategy.canHandle("$env.VAR")).toBe(true);
      expect(strategy.canHandle("anything")).toBe(true);
    });
  });

  describe("resolve", () => {
    it("should resolve variables using context resolver", () => {
      (mockContext.variableResolver as jest.Mock).mockReturnValue("resolved-value");
      
      const result = strategy.resolve("username", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe("resolved-value");
      expect(mockContext.variableResolver).toHaveBeenCalledWith("username");
    });

    it("should return unsuccessful for undefined variables", () => {
      (mockContext.variableResolver as jest.Mock).mockReturnValue(undefined);
      
      const result = strategy.resolve("missing", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it("should handle resolver errors", () => {
      (mockContext.variableResolver as jest.Mock).mockImplementation(() => {
        throw new Error("Resolver error");
      });
      
      const result = strategy.resolve("variable", mockContext);
      
      expect(result.canHandle).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to resolve variable");
    });

    it("should resolve nested paths", () => {
      (mockContext.variableResolver as jest.Mock).mockReturnValue("nested-value");
      
      const result = strategy.resolve("user.profile.name", mockContext);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe("nested-value");
    });

    it("should resolve global exported variables", () => {
      (mockContext.variableResolver as jest.Mock).mockReturnValue("global-token");
      
      const result = strategy.resolve("auth-flow.token", mockContext);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe("global-token");
    });

    it("should not log when debug is false", () => {
      mockContext.debug = false;
      (mockContext.variableResolver as jest.Mock).mockReturnValue("value");
      
      const loggerSpy = jest.spyOn(console, "debug").mockImplementation();
      strategy.resolve("variable", mockContext);
      
      loggerSpy.mockRestore();
    });

    it("should log when debug is enabled and value is defined", () => {
      mockContext.debug = true;
      (mockContext.variableResolver as jest.Mock).mockReturnValue("debug-value");
      
      const result = strategy.resolve("variable", mockContext);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe("debug-value");
      mockContext.debug = false;
    });

    it("should not log when value is undefined even in debug mode", () => {
      mockContext.debug = true;
      (mockContext.variableResolver as jest.Mock).mockReturnValue(undefined);
      
      const result = strategy.resolve("variable", mockContext);
      
      expect(result.success).toBe(false);
      mockContext.debug = false;
    });
  });

  describe("priority", () => {
    it("should have priority 100 (lowest/fallback)", () => {
      expect(strategy.priority).toBe(100);
    });
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("Variable");
    });
  });
});
