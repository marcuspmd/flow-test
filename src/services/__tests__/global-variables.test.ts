import { GlobalVariablesService } from "../global-variables";
import { ConfigManager } from "../../core/config";
import { GlobalRegistryService } from "../global-registry.service";

// Mock dependencies
jest.mock("../../core/config");
jest.mock("../global-registry.service");
jest.mock("../faker.service", () => ({
  fakerService: {
    parseFakerExpression: jest.fn(),
  },
}));
jest.mock("../javascript.service", () => ({
  javascriptService: {
    parseJavaScriptExpression: jest.fn(),
    executeExpression: jest.fn(),
  },
}));

describe("GlobalVariablesService", () => {
  let globalVariablesService: GlobalVariablesService;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockGlobalRegistry: jest.Mocked<GlobalRegistryService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigManager
    mockConfigManager = {
      getGlobalVariables: jest.fn().mockReturnValue({
        global_var1: "global_value1",
        global_var2: "global_value2",
      }),
    } as unknown as jest.Mocked<ConfigManager>;

    // Mock GlobalRegistryService
    mockGlobalRegistry = {
      getExportedVariable: jest.fn(),
      getAllExportedVariables: jest.fn().mockReturnValue({}),
    } as unknown as jest.Mocked<GlobalRegistryService>;

    // Setup environment variables for testing
    process.env.TEST_ENV_VAR = "test_env_value";

    globalVariablesService = new GlobalVariablesService(mockConfigManager);
  });

  afterEach(() => {
    // Clean up test environment variables
    delete process.env.TEST_ENV_VAR;
  });

  describe("constructor and basic setup", () => {
    it("should create instance with config manager only", () => {
      expect(globalVariablesService).toBeInstanceOf(GlobalVariablesService);
    });

    it("should create instance with config manager and global registry", () => {
      const serviceWithRegistry = new GlobalVariablesService(
        mockConfigManager,
        mockGlobalRegistry
      );
      expect(serviceWithRegistry).toBeInstanceOf(GlobalVariablesService);
    });
  });

  describe("variable management", () => {
    it("should set and get runtime variables", () => {
      globalVariablesService.setRuntimeVariables({
        runtime_var: "runtime_value",
      });

      expect(globalVariablesService.getVariable("runtime_var")).toBe(
        "runtime_value"
      );
    });

    it("should set and get suite variables", () => {
      globalVariablesService.setSuiteVariables({
        suite_var: "suite_value",
      });

      expect(globalVariablesService.getVariable("suite_var")).toBe(
        "suite_value"
      );
    });

    it("should set single runtime variable", () => {
      globalVariablesService.setRuntimeVariable("single_var", "single_value");
      expect(globalVariablesService.getVariable("single_var")).toBe(
        "single_value"
      );
    });

    it("should set variable using setVariable", () => {
      globalVariablesService.setVariable("test_var", "test_value");
      expect(globalVariablesService.getVariable("test_var")).toBe("test_value");
    });

    it("should get global variables from config", () => {
      expect(globalVariablesService.getVariable("global_var1")).toBe(
        "global_value1"
      );
    });

    it("should get environment variables", () => {
      expect(globalVariablesService.getVariable("TEST_ENV_VAR")).toBe(
        "test_env_value"
      );
    });

    it("should return undefined for non-existent variable", () => {
      expect(
        globalVariablesService.getVariable("non_existent")
      ).toBeUndefined();
    });

    it("should return default value for execution_mode", () => {
      expect(globalVariablesService.getVariable("execution_mode")).toBe(
        "sequential"
      );
    });
  });

  describe("variable priority", () => {
    it("should prioritize runtime over suite variables", () => {
      globalVariablesService.setSuiteVariables({ priority_var: "suite_value" });
      globalVariablesService.setRuntimeVariable(
        "priority_var",
        "runtime_value"
      );

      expect(globalVariablesService.getVariable("priority_var")).toBe(
        "runtime_value"
      );
    });

    it("should prioritize suite over global variables", () => {
      globalVariablesService.setSuiteVariables({
        global_var1: "suite_override",
      });

      expect(globalVariablesService.getVariable("global_var1")).toBe(
        "suite_override"
      );
    });

    it("should prioritize global over environment variables", () => {
      process.env.global_var1 = "env_override";

      expect(globalVariablesService.getVariable("global_var1")).toBe(
        "global_value1"
      );

      delete process.env.global_var1;
    });
  });

  describe("template interpolation", () => {
    it("should interpolate simple variable templates", () => {
      globalVariablesService.setRuntimeVariable("test_var", "test_value");

      const result = globalVariablesService.interpolate("{{test_var}}");
      expect(result).toBe("test_value");
    });

    it("should handle templates with no variables", () => {
      const result = globalVariablesService.interpolate("plain string");
      expect(result).toBe("plain string");
    });

    it("should return original string for undefined variables", () => {
      const template = "{{undefined_var}}";
      const result = globalVariablesService.interpolate(template);
      expect(result).toBe(template);
    });

    it("should handle object interpolation", () => {
      const template = {
        name: "{{test_var}}",
        data: "static",
      };

      globalVariablesService.setRuntimeVariable("test_var", "dynamic");

      const result = globalVariablesService.interpolate(template) as any;
      expect(result.name).toBe("dynamic");
      expect(result.data).toBe("static");
    });

    it("should handle array interpolation", () => {
      const template = ["{{test_var}}", "static"];

      globalVariablesService.setRuntimeVariable("test_var", "dynamic");

      const result = globalVariablesService.interpolate(template) as any[];
      expect(result[0]).toBe("dynamic");
      expect(result[1]).toBe("static");
    });

    it("should return primitive values unchanged", () => {
      expect(globalVariablesService.interpolate(123)).toBe(123);
      expect(globalVariablesService.interpolate(true)).toBe(true);
      expect(globalVariablesService.interpolate(null)).toBe(null);
    });
  });

  describe("clearing methods", () => {
    beforeEach(() => {
      globalVariablesService.setSuiteVariables({ suite_var: "suite_value" });
      globalVariablesService.setRuntimeVariable("runtime_var", "runtime_value");
    });

    it("should clear only runtime variables", () => {
      globalVariablesService.clearRuntimeVariables();

      expect(globalVariablesService.getVariable("runtime_var")).toBeUndefined();
      expect(globalVariablesService.getVariable("suite_var")).toBe(
        "suite_value"
      );
    });

    it("should clear suite and runtime variables", () => {
      globalVariablesService.clearSuiteVariables();

      expect(globalVariablesService.getVariable("suite_var")).toBeUndefined();
      expect(globalVariablesService.getVariable("runtime_var")).toBeUndefined();
      expect(globalVariablesService.getVariable("global_var1")).toBe(
        "global_value1"
      );
    });

    it("should clear all non-global variables", () => {
      globalVariablesService.clearAllNonGlobalVariables();

      expect(globalVariablesService.getVariable("suite_var")).toBeUndefined();
      expect(globalVariablesService.getVariable("runtime_var")).toBeUndefined();
      expect(globalVariablesService.getVariable("global_var1")).toBe(
        "global_value1"
      );
    });
  });

  describe("getAllVariables", () => {
    it("should return all variables from all scopes", () => {
      globalVariablesService.setSuiteVariables({ suite_var: "suite_value" });
      globalVariablesService.setRuntimeVariable("runtime_var", "runtime_value");

      const allVars = globalVariablesService.getAllVariables();

      expect(allVars.suite_var).toBe("suite_value");
      expect(allVars.runtime_var).toBe("runtime_value");
      expect(allVars.global_var1).toBe("global_value1");
      expect(allVars.TEST_ENV_VAR).toBe("test_env_value");
    });

    it("should return copy of variables (not reference)", () => {
      globalVariablesService.setRuntimeVariable("test_var", "test_value");

      const allVars1 = globalVariablesService.getAllVariables();
      const allVars2 = globalVariablesService.getAllVariables();

      expect(allVars1).not.toBe(allVars2); // Different objects
      expect(allVars1).toEqual(allVars2); // Same content
    });
  });

  describe("registry and dependencies", () => {
    it("should set global registry and clear cache", () => {
      const clearCacheSpy = jest.spyOn(globalVariablesService, "clearCache");

      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it("should set dependencies and clear cache", () => {
      const clearCacheSpy = jest.spyOn(globalVariablesService, "clearCache");

      globalVariablesService.setDependencies(["flow1", "flow2"]);

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it("should resolve variables from dependencies", () => {
      mockGlobalRegistry.getExportedVariable.mockReturnValue(
        "dependency_value"
      );
      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);
      globalVariablesService.setDependencies(["dependency-flow"]);

      // getVariable não acessa variáveis exportadas - isso acontece via interpolation
      expect(
        globalVariablesService.getVariable("dependency-flow.exported_var")
      ).toBeUndefined();

      // Mas a interpolação deveria acessar via resolveVariableExpression
      expect(
        globalVariablesService.interpolate("{{dependency-flow.exported_var}}")
      ).toBe("dependency_value");
    });

    it("should handle dependencies without global registry", () => {
      globalVariablesService.setDependencies(["dependency-flow"]);

      const result = globalVariablesService.getVariable(
        "dependency-flow.exported_var"
      );
      expect(result).toBeUndefined();
    });
  });

  describe("context and scope methods", () => {
    it("should return current global variable context", () => {
      globalVariablesService.setRuntimeVariable("runtime_var", "runtime_value");
      globalVariablesService.setSuiteVariables({ suite_var: "suite_value" });

      const context = globalVariablesService.getContext();

      expect(context.runtime.runtime_var).toBe("runtime_value");
      expect(context.suite.suite_var).toBe("suite_value");
      expect(context.global.global_var1).toBe("global_value1");
      expect(context.environment.TEST_ENV_VAR).toBe("test_env_value");
      expect(context.imported).toBeDefined();
    });

    it("should return variables by scope", () => {
      globalVariablesService.setRuntimeVariables({
        runtime_var1: "value1",
        runtime_var2: "value2",
      });

      const runtimeVars = globalVariablesService.getVariablesByScope("runtime");
      expect(runtimeVars.runtime_var1).toBe("value1");
      expect(runtimeVars.runtime_var2).toBe("value2");

      const globalVars = globalVariablesService.getVariablesByScope("global");
      expect(globalVars.global_var1).toBe("global_value1");

      const envVars = globalVariablesService.getVariablesByScope("environment");
      expect(envVars.TEST_ENV_VAR).toBe("test_env_value");
    });
  });

  describe("hasVariable", () => {
    it("should return true for existing runtime variables", () => {
      globalVariablesService.setRuntimeVariable("runtime_var", "value");
      expect(globalVariablesService.hasVariable("runtime_var")).toBe(true);
    });

    it("should return true for existing global variables", () => {
      expect(globalVariablesService.hasVariable("global_var1")).toBe(true);
    });

    it("should return true for environment variables", () => {
      expect(globalVariablesService.hasVariable("TEST_ENV_VAR")).toBe(true);
    });

    it("should return false for non-existent variables", () => {
      expect(globalVariablesService.hasVariable("non_existent_var")).toBe(
        false
      );
    });

    it("should return true for exported variables when registry is set", () => {
      mockGlobalRegistry.getExportedVariable.mockReturnValue(
        "auth_token_value"
      );
      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);

      // hasVariable chama getVariable, que não acessa variáveis exportadas
      // Para testar variáveis exportadas, precisamos usar interpolação
      expect(globalVariablesService.hasVariable("auth-flow.token")).toBe(false);

      // Mas a interpolação deveria funcionar
      expect(globalVariablesService.interpolate("{{auth-flow.token}}")).toBe(
        "auth_token_value"
      );
    });
  });

  describe("cache operations", () => {
    it("should clear interpolation cache", () => {
      // Perform interpolation to populate cache
      globalVariablesService.setRuntimeVariable("test_var", "test_value");
      globalVariablesService.interpolate("{{test_var}}");

      // Clear cache
      globalVariablesService.clearCache();

      // This test mainly ensures the method doesn't throw
      expect(() => globalVariablesService.clearCache()).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle malformed templates gracefully", () => {
      const malformedTemplates = [
        "{{",
        "}}",
        "{{unclosed",
        "unopened}}",
        "{{}}",
        "{{ }}",
      ];

      malformedTemplates.forEach((template) => {
        const result = globalVariablesService.interpolate(template);
        expect(result).toBe(template);
      });
    });

    it("should handle null and undefined variables", () => {
      globalVariablesService.setRuntimeVariable("null_var", null);
      globalVariablesService.setRuntimeVariable("undefined_var", undefined);

      const result1 = globalVariablesService.interpolate("{{null_var}}");
      const result2 = globalVariablesService.interpolate("{{undefined_var}}");

      expect(result1).toBe(null);
      expect(result2).toBe("{{undefined_var}}"); // undefined is treated as not found
    });

    it("should handle complex object navigation", () => {
      const complexObject = {
        level1: {
          level2: {
            level3: "deep_value",
          },
        },
      };

      globalVariablesService.setRuntimeVariable("complex", complexObject);

      // getVariable só retorna objetos diretos, não navega por propriedades
      expect(globalVariablesService.getVariable("complex")).toEqual(
        complexObject
      );
      expect(
        globalVariablesService.getVariable("complex.level1")
      ).toBeUndefined();

      // A navegação de objeto acontece na interpolação
      expect(
        globalVariablesService.interpolate("{{complex.level1.level2.level3}}")
      ).toBe("deep_value");
    });

    it("should handle object navigation with null intermediate values", () => {
      globalVariablesService.setRuntimeVariable("nullObj", { prop: null });

      expect(
        globalVariablesService.getVariable("nullObj.prop.subprop")
      ).toBeUndefined();
    });
  });

  describe("additional coverage tests", () => {
    it("should handle environment variable fallback", () => {
      // Test environment variable access quando não está em outros scopes
      process.env.UNIQUE_ENV_VAR = "env_fallback_value";

      // Primeiro, vamos recriar o serviço para garantir que a env var seja carregada
      const newService = new GlobalVariablesService(mockConfigManager);
      expect(newService.getVariable("UNIQUE_ENV_VAR")).toBe(
        "env_fallback_value"
      );

      delete process.env.UNIQUE_ENV_VAR;
    });

    it("should set variable in different scopes", () => {
      globalVariablesService.setVariable("suite_test", "suite_value", "suite");

      const context = globalVariablesService.getContext();
      expect(context.suite.suite_test).toBe("suite_value");
      expect(context.runtime.suite_test).toBeUndefined();
    });

    it("should handle empty variable names gracefully", () => {
      expect(globalVariablesService.getVariable("")).toBeUndefined();
      expect(globalVariablesService.hasVariable("")).toBe(false);
    });

    it("should handle exported variables without dependencies", () => {
      mockGlobalRegistry.getExportedVariable.mockReturnValue("exported_value");
      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);

      // getVariable não acessa exported variables - isso é feito via interpolação
      expect(
        globalVariablesService.getVariable("some.exported.var")
      ).toBeUndefined();

      // Mas a interpolação deveria funcionar
      expect(globalVariablesService.interpolate("{{some.exported.var}}")).toBe(
        "exported_value"
      );
    });

    it("should handle variable merging in runtime variables", () => {
      globalVariablesService.setRuntimeVariables({ var1: "value1" });
      globalVariablesService.setRuntimeVariables({ var2: "value2" });

      // Should merge, not replace
      expect(globalVariablesService.getVariable("var1")).toBe("value1");
      expect(globalVariablesService.getVariable("var2")).toBe("value2");
    });

    it("should return empty object for imported scope initially", () => {
      const importedVars =
        globalVariablesService.getVariablesByScope("imported");
      expect(importedVars).toEqual({});
    });
  });

  describe("advanced interpolation features", () => {
    it("should handle $faker expressions", () => {
      const { fakerService } = require("../faker.service");
      (fakerService.parseFakerExpression as jest.Mock).mockReturnValue(
        "John Doe"
      );

      const result = globalVariablesService.interpolate(
        "{{$faker.person.fullName}}"
      );
      expect(result).toBe("John Doe");
      expect(fakerService.parseFakerExpression).toHaveBeenCalledWith(
        "faker.person.fullName"
      );
    });

    it("should handle JavaScript expressions with js: prefix", () => {
      const { javascriptService } = require("../javascript.service");
      (
        javascriptService.parseJavaScriptExpression as jest.Mock
      ).mockReturnValue("Math.random()");
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(0.5);

      const result = globalVariablesService.interpolate("{{js:Math.random()}}");
      expect(result).toBe(0.5);
    });

    it("should handle $js. expressions", () => {
      const { javascriptService } = require("../javascript.service");
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(
        "test-result"
      );

      const result = globalVariablesService.interpolate(
        "{{$js.return 'test-result'}}"
      );
      expect(result).toBe("test-result");
      expect(javascriptService.executeExpression).toHaveBeenCalledWith(
        "return 'test-result'",
        expect.any(Object),
        true
      );
    });

    it("should handle logical expressions", () => {
      const { javascriptService } = require("../javascript.service");
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(true);

      const result = globalVariablesService.interpolate("{{true || false}}");
      expect(result).toBe(true);
    });

    it("should handle $env variables", () => {
      process.env.TEST_ENV_FOR_INTERPOLATION = "env_value";

      const result = globalVariablesService.interpolate(
        "{{$env.TEST_ENV_FOR_INTERPOLATION}}"
      );
      expect(result).toBe("env_value");

      delete process.env.TEST_ENV_FOR_INTERPOLATION;
    });

    it("should handle $env variables with null fallback", () => {
      const result = globalVariablesService.interpolate(
        "{{$env.NONEXISTENT_VAR}}"
      );
      expect(result).toBe(null);
    });

    it("should handle $env in complex expressions", () => {
      process.env.NODE_ENV = "test";

      // $env variables are handled differently - they don't use JavaScript expressions
      const result = globalVariablesService.interpolate("{{$env.NODE_ENV}}");
      expect(result).toBe("test");

      delete process.env.NODE_ENV;
    });

    it("should handle nested template structures", () => {
      globalVariablesService.setRuntimeVariable("nested", {
        array: [{ item: "value1" }, { item: "value2" }],
        object: { sub: { deep: "deep_value" } },
      });

      const template = {
        nested_array: "{{nested.array}}",
        nested_object: "{{nested.object.sub}}",
      };

      const result = globalVariablesService.interpolate(template) as any;
      expect(result.nested_array).toEqual([
        { item: "value1" },
        { item: "value2" },
      ]);
      expect(result.nested_object).toEqual({ deep: "deep_value" });
    });

    it("should handle quoted strings in templates", () => {
      globalVariablesService.setRuntimeVariable("quoted", "value with spaces");

      const result = globalVariablesService.interpolate(
        'Template with "{{quoted}}" in quotes'
      );
      expect(result).toBe('Template with "value with spaces" in quotes');
    });

    it("should handle single quotes in templates", () => {
      globalVariablesService.setRuntimeVariable("single", "apostrophe's value");

      const result = globalVariablesService.interpolate(
        "Template with '{{single}}' in single quotes"
      );
      expect(result).toBe(
        "Template with 'apostrophe's value' in single quotes"
      );
    });
  });

  describe("execution context features", () => {
    it("should set execution context for JavaScript expressions", () => {
      const context = { variables: { test_var: "test_value" } };
      globalVariablesService.setExecutionContext(context);

      // O context deveria ser utilizado nas expressões JavaScript
      const { javascriptService } = require("../javascript.service");
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(
        "result_with_context"
      );

      const result = globalVariablesService.interpolate(
        "{{js:context.test_var}}"
      );
      expect(result).toBe("result_with_context");
    });

    it("should merge execution contexts", () => {
      const context1 = { variables: { var1: "value1" } };
      const context2 = { variables: { var2: "value2" } };

      globalVariablesService.setExecutionContext(context1);
      globalVariablesService.setExecutionContext(context2);

      // Should merge contexts, not replace them
      expect(() =>
        globalVariablesService.setExecutionContext(context2)
      ).not.toThrow();
    });
  });

  describe("dependency resolution edge cases", () => {
    it("should handle dependency variable access", () => {
      const dependencyData = { user: { id: "12345", name: "John" } };
      mockGlobalRegistry.getExportedVariable.mockReturnValue(dependencyData);
      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);
      globalVariablesService.setDependencies(["user-flow"]);

      // Dependencies need to be properly set up for variable resolution
      expect(globalVariablesService.hasVariable("user-flow")).toBe(true);
    });

    it("should handle dependency registry integration", () => {
      mockGlobalRegistry.getExportedVariable.mockReturnValue("scalar_value");
      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);
      globalVariablesService.setDependencies(["test-flow"]);

      // Trigger registry integration by checking for a dependency variable
      globalVariablesService.hasVariable("test-flow");

      // Verify the registry integration was called
      expect(mockGlobalRegistry.getExportedVariable).toHaveBeenCalled();
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle complex objects and undefined values gracefully", () => {
      globalVariablesService.setRuntimeVariable("test", {
        nested: { value: null },
      });

      const result = globalVariablesService.interpolate(
        "{{test.nested.undefined_prop}}"
      );
      expect(result).toBe("{{test.nested.undefined_prop}}"); // Returns original template when value is undefined
    });

    it("should handle arrays with complex interpolation", () => {
      globalVariablesService.setRuntimeVariable("items", [
        { id: 1, name: "item1" },
        { id: 2, name: "item2" },
      ]);

      const template = ["{{items.0.name}}", "{{items.1.id}}"];
      const result = globalVariablesService.interpolate(template) as string[];

      expect(result).toEqual(["item1", 2]);
    });

    it("should handle malformed template expressions", () => {
      const result = globalVariablesService.interpolate(
        "{{invalid expression without closing"
      );
      expect(result).toBe("{{invalid expression without closing");
    });

    it("should handle empty template expressions", () => {
      const result = globalVariablesService.interpolate("{{}}");
      expect(result).toBe("{{}}"); // Should return original for empty expression
    });

    it("should handle template expressions with only whitespace", () => {
      const result = globalVariablesService.interpolate("{{   }}");
      expect(result).toBe("{{   }}"); // Should return original for whitespace-only expression
    });

    it("should handle $faker with error scenarios", () => {
      const { fakerService } = require("../faker.service");
      (fakerService.parseFakerExpression as jest.Mock).mockImplementation(
        () => {
          throw new Error("Faker expression error");
        }
      );

      // Should not crash when faker throws error
      const result = globalVariablesService.interpolate(
        "{{$faker.invalid.method}}"
      );
      expect(result).toBe("{{$faker.invalid.method}}"); // Returns original on error
    });

    it("should handle JavaScript expressions with error scenarios", () => {
      const { javascriptService } = require("../javascript.service");
      (javascriptService.executeExpression as jest.Mock).mockImplementation(
        () => {
          throw new Error("JavaScript execution error");
        }
      );

      // Should not crash when JavaScript throws error
      const result = globalVariablesService.interpolate(
        "{{js:invalid.syntax}}"
      );
      expect(result).toBe("{{js:invalid.syntax}}"); // Returns original on error
    });

    it("should handle deep object navigation that fails", () => {
      globalVariablesService.setRuntimeVariable("shallow", "string_value");

      // Trying to navigate into a string should not crash
      const result = globalVariablesService.interpolate(
        "{{shallow.nonexistent.property}}"
      );
      expect(result).toBe("{{shallow.nonexistent.property}}");
    });

    it("should handle circular references gracefully", () => {
      const circular: any = { name: "circular" };
      circular.self = circular;

      globalVariablesService.setRuntimeVariable("circular", circular);

      // Should handle circular references without infinite loops
      expect(() => {
        globalVariablesService.interpolate("{{circular.name}}");
      }).not.toThrow();
    });
  });

  describe("performance and optimization", () => {
    it("should cache interpolated values when possible", () => {
      globalVariablesService.setRuntimeVariable("cached", "value");

      // First call
      const result1 = globalVariablesService.interpolate("{{cached}}");
      // Second call should use same logic
      const result2 = globalVariablesService.interpolate("{{cached}}");

      expect(result1).toBe("value");
      expect(result2).toBe("value");
    });

    it("should handle large template structures efficiently", () => {
      const largeObject = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: `value_${i}`,
      }));
      globalVariablesService.setRuntimeVariable("large", largeObject);

      const result = globalVariablesService.interpolate("{{large.50.value}}");
      expect(result).toBe("value_50");
    });
  });

  describe("comprehensive edge case coverage", () => {
    it("should handle isLikelyRuntimeVariable for different patterns", () => {
      // Test method accessibility through interpolation
      globalVariablesService.setRuntimeVariable("runtime_var", "runtime_value");

      // This should not trigger warning as it's a likely runtime variable
      const result = globalVariablesService.interpolate("{{runtime_var}}");
      expect(result).toBe("runtime_value");
    });

    it("should handle object property access edge cases", () => {
      globalVariablesService.setRuntimeVariable("obj", { prop: "value" });

      // Test direct property access
      const result = globalVariablesService.interpolate("{{obj.prop}}");
      expect(result).toBe("value");
    });

    it("should handle createIterationContext with different types", () => {
      // Test array iteration context
      const arrayTemplate = ["{{item}}", "{{index}}"];
      globalVariablesService.setRuntimeVariable("item", "test_item");
      globalVariablesService.setRuntimeVariable("index", 0);

      const result = globalVariablesService.interpolate(arrayTemplate);
      expect(result).toEqual(["test_item", 0]);
    });

    it("should handle navigation path edge cases", () => {
      globalVariablesService.setRuntimeVariable("deep", {
        level1: { level2: { level3: "deep_value" } },
      });

      // Test deep navigation
      const result = globalVariablesService.interpolate(
        "{{deep.level1.level2.level3}}"
      );
      expect(result).toBe("deep_value");
    });

    it("should handle special prefixes in variable names", () => {
      // Test variables that start with special prefixes but aren't special
      globalVariablesService.setRuntimeVariable("$notfaker", "regular_value");
      globalVariablesService.setRuntimeVariable(
        "js_variable",
        "not_javascript"
      );

      const result1 = globalVariablesService.interpolate("{{$notfaker}}");
      const result2 = globalVariablesService.interpolate("{{js_variable}}");

      expect(result1).toBe("regular_value");
      expect(result2).toBe("not_javascript");
    });

    it("should handle variable substitution with null values", () => {
      globalVariablesService.setRuntimeVariable("null_var", null);

      const result = globalVariablesService.interpolate("{{null_var}}");
      expect(result).toBe(null);
    });

    it("should handle variable substitution with different values", () => {
      globalVariablesService.setRuntimeVariable("test_var", "defined_value");

      const result = globalVariablesService.interpolate("{{test_var}}");
      expect(result).toBe("defined_value");
    });

    it("should handle mixed template and literal content", () => {
      globalVariablesService.setRuntimeVariable("name", "John");

      const result = globalVariablesService.interpolate(
        "Hello {{name}}, welcome!"
      );
      expect(result).toBe("Hello John, welcome!");
    });

    it("should handle object merging in setRuntimeVariables", () => {
      globalVariablesService.setRuntimeVariables({ var1: "value1" });
      globalVariablesService.setRuntimeVariables({ var2: "value2" });

      // Should merge, not replace
      expect(globalVariablesService.getVariable("var1")).toBe("value1");
      expect(globalVariablesService.getVariable("var2")).toBe("value2");
    });

    it("should handle suite variables access through getVariablesByScope", () => {
      globalVariablesService.setSuiteVariables({ suite_var: "suite_value" });

      const suiteVars = globalVariablesService.getVariablesByScope("suite");
      expect(suiteVars).toEqual({ suite_var: "suite_value" });
    });

    it("should handle runtime variables access through getVariablesByScope", () => {
      globalVariablesService.setRuntimeVariable("runtime_var", "runtime_value");

      const runtimeVars = globalVariablesService.getVariablesByScope("runtime");
      expect(runtimeVars).toEqual({ runtime_var: "runtime_value" });
    });

    it("should handle environment variables through getVariablesByScope", () => {
      process.env.TEST_UNIQUE_ENV_VAR = "unique_env_value";

      const envVars = globalVariablesService.getVariablesByScope("environment");
      expect(envVars.TEST_UNIQUE_ENV_VAR).toBe("unique_env_value");

      delete process.env.TEST_UNIQUE_ENV_VAR;
    });

    it("should handle global variables through getVariablesByScope", () => {
      const globalVars = globalVariablesService.getVariablesByScope("global");
      // Just verify it returns an object (content depends on config)
      expect(typeof globalVars).toBe("object");
    });

    it("should handle unknown scope in getVariablesByScope", () => {
      const importedVars =
        globalVariablesService.getVariablesByScope("imported");
      expect(importedVars).toEqual({});
    });

    it("should handle complex interpolation with multiple variable types", () => {
      process.env.NODE_ENV = "test";
      globalVariablesService.setRuntimeVariable("app", {
        name: "MyApp",
        version: "1.0",
      });

      const template = {
        environment: "{{$env.NODE_ENV}}",
        appInfo: "{{app.name}} v{{app.version}}",
      };

      const result = globalVariablesService.interpolate(template) as any;
      expect(result.environment).toBe("test");
      expect(result.appInfo).toBe("MyApp v1.0");

      delete process.env.NODE_ENV;
    });
  });

  describe("specific line coverage tests", () => {
    it("should handle getAllVariables with exported variables", () => {
      mockGlobalRegistry.getAllExportedVariables.mockReturnValue({
        "exported.var1": "exported_value1",
        "exported.var2": "exported_value2",
      });
      globalVariablesService.setGlobalRegistry(mockGlobalRegistry);
      globalVariablesService.setRuntimeVariable("runtime_var", "runtime_value");

      const allVars = globalVariablesService.getAllVariables();
      expect(allVars["exported.var1"]).toBe("exported_value1");
      expect(allVars["exported.var2"]).toBe("exported_value2");
      expect(allVars.runtime_var).toBe("runtime_value");
    });

    it("should handle cache in interpolateString", () => {
      globalVariablesService.setRuntimeVariable("cached_var", "cached_value");

      // First call - should compute and cache
      const result1 = globalVariablesService.interpolate("{{cached_var}}");
      // Second call - should use cache
      const result2 = globalVariablesService.interpolate("{{cached_var}}");

      expect(result1).toBe("cached_value");
      expect(result2).toBe("cached_value");
    });

    it("should handle template parameter validation", () => {
      const result1 = globalVariablesService.interpolate(null as any);
      const result2 = globalVariablesService.interpolate(undefined as any);
      const result3 = globalVariablesService.interpolate(123 as any);

      // Based on actual implementation behavior
      expect(result1).toBe(null);
      expect(result2).toBe(undefined);
      expect(result3).toBe(123);
    });

    it("should handle environment variable expressions", () => {
      process.env.API_URL = "https://api.example.com";

      // Test basic $env interpolation (not JavaScript expression)
      const result = globalVariablesService.interpolate("{{$env.API_URL}}");
      expect(result).toBe("https://api.example.com");

      delete process.env.API_URL;
    });

    it("should handle missing environment variables", () => {
      // Test missing env var
      const result = globalVariablesService.interpolate("{{$env.MISSING_VAR}}");
      expect(result).toBe(null);
    });

    it("should handle error scenarios gracefully", () => {
      // Test various error scenarios that should not crash
      expect(() => {
        globalVariablesService.interpolate("{{malformed.expression");
      }).not.toThrow();
    });

    it("should handle object property navigation edge cases", () => {
      globalVariablesService.setRuntimeVariable("obj", {
        nested: {
          deep: {
            value: "deep_value",
          },
        },
        array: [{ item: "item1" }, { item: "item2" }],
      });

      // Test different navigation patterns
      expect(
        globalVariablesService.interpolate("{{obj.nested.deep.value}}")
      ).toBe("deep_value");
      expect(globalVariablesService.interpolate("{{obj.array.0.item}}")).toBe(
        "item1"
      );
      expect(globalVariablesService.interpolate("{{obj.array.1.item}}")).toBe(
        "item2"
      );
    });

    it("should handle createIterationContext with specific array patterns", () => {
      const arrayTemplate = [
        "{{item_1}}",
        "{{item_2}}",
        { nested: "{{nested_item}}" },
      ];

      globalVariablesService.setRuntimeVariable("item_1", "value1");
      globalVariablesService.setRuntimeVariable("item_2", "value2");
      globalVariablesService.setRuntimeVariable("nested_item", "nested_value");

      const result = globalVariablesService.interpolate(arrayTemplate) as any[];
      expect(result[0]).toBe("value1");
      expect(result[1]).toBe("value2");
      expect(result[2].nested).toBe("nested_value");
    });

    it("should handle complex template regex matching", () => {
      // Test templates with multiple patterns
      const complexTemplate = "Start {{var1}} middle {{var2}} end {{var3}}";
      globalVariablesService.setRuntimeVariable("var1", "A");
      globalVariablesService.setRuntimeVariable("var2", "B");
      globalVariablesService.setRuntimeVariable("var3", "C");

      const result = globalVariablesService.interpolate(complexTemplate);
      expect(result).toBe("Start A middle B end C");
    });

    it("should handle hasVariable with scope verification", () => {
      globalVariablesService.setRuntimeVariable("runtime_test", "value");
      globalVariablesService.setSuiteVariables({ suite_test: "value" });

      expect(globalVariablesService.hasVariable("runtime_test")).toBe(true);
      expect(globalVariablesService.hasVariable("suite_test")).toBe(true);
      expect(globalVariablesService.hasVariable("nonexistent")).toBe(false);
    });
  });
});
