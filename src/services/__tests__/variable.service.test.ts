/**
 * Testes unitários para VariableService
 * Cobertura abrangente da interface pública
 */

// Mock do logger - DEVE vir antes de qualquer import
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock("../logger.service", () => ({
  getLogger: () => mockLogger,
}));

import { VariableService } from "../variable.service";
import { GlobalVariableContext } from "../../types/config.types";

// Helper function to create VariableService with context
function createVariableServiceWithContext(
  context: GlobalVariableContext,
  globalRegistry?: any
): VariableService {
  const mockConfigManager = {
    getGlobalVariables: () => context.global || {},
  };
  const service = new VariableService(
    mockLogger as any,
    mockConfigManager as any,
    globalRegistry
  );
  // Set suite and runtime variables after construction
  if (context.suite) {
    service.setSuiteVariables(context.suite);
  }
  if (context.runtime) {
    service.setRuntimeVariables(context.runtime);
  }
  if (context.imported) {
    for (const [flowName, variables] of Object.entries(context.imported)) {
      service.addImportedFlow(flowName, variables);
    }
  }
  return service;
}

describe("VariableService", () => {
  let service: VariableService;
  let baseContext: GlobalVariableContext;
  let mockGlobalRegistry: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.TEST_VAR;
    delete process.env.API_KEY;

    mockGlobalRegistry = {
      getExportedVariable: jest.fn(),
      setExportedVariable: jest.fn(),
      getAllExportedVariables: jest.fn(() => ({})),
      registerNode: jest.fn(),
      clear: jest.fn(),
    };

    baseContext = {
      global: { api_url: "https://api.example.com", timeout: 5000 },
      suite: { user_id: 123, test_name: "integration" },
      runtime: { auth_token: "abc123", session_id: "sess_001" },
      imported: { auth: { token: "xyz789" } },
      environment: {},
    };

    service = createVariableServiceWithContext(baseContext, mockGlobalRegistry);
  });

  describe("constructor", () => {
    it("should create an instance with provided context", () => {
      expect(service).toBeDefined();
    });

    it("should create without global registry", () => {
      const serviceWithoutRegistry = createVariableServiceWithContext(baseContext);
      expect(serviceWithoutRegistry).toBeDefined();
    });
  });

  describe("interpolate", () => {
    it("should interpolate runtime variable", () => {
      const result = service.interpolate("Token: {{auth_token}}");
      expect(result).toBe("Token: abc123");
    });

    it("should interpolate suite variable", () => {
      const result = service.interpolate("User ID: {{user_id}}");
      expect(result).toBe("User ID: 123");
    });

    it("should interpolate global variable", () => {
      const result = service.interpolate("API: {{api_url}}");
      expect(result).toBe("API: https://api.example.com");
    });

    it("should interpolate imported variable with dot notation", () => {
      const result = service.interpolate("Auth: {{auth.token}}");
      expect(result).toBe("Auth: xyz789");
    });

    it("should interpolate multiple variables", () => {
      const result = service.interpolate("{{api_url}}/users/{{user_id}}");
      expect(result).toBe("https://api.example.com/users/123");
    });

    it("should interpolate environment variables", () => {
      process.env.TEST_VAR = "env_value";
      const result = service.interpolate("Env: {{$env.TEST_VAR}}");
      expect(result).toBe("Env: env_value");
    });

    it("should return null for non-existent environment variable", () => {
      const result = service.interpolate("Env: {{$env.NONEXISTENT}}");
      expect(result).toBe("Env: null");
    });

    it("should interpolate faker expressions", () => {
      const result = service.interpolate("Email: {{faker.internet.email}}");
      // Faker agora retorna valores reais (não mockados), então verificamos apenas o formato
      expect(result).toMatch(/Email: .+@.+\..+/);
    });

    it("should interpolate $faker expressions", () => {
      const result = service.interpolate("Name: {{$faker.person.firstName}}");
      // Faker agora retorna valores reais (não mockados), então verificamos que não é placeholder
      expect(result).toMatch(/Name: [A-Z][a-z]+/); // Nome começa com maiúscula
      expect(result).not.toBe("Name: {{$faker.person.firstName}}");
    });

    it("should interpolate complex objects", () => {
      const obj = {
        url: "{{api_url}}/users/{{user_id}}",
        headers: { Authorization: "Bearer {{auth_token}}" },
        nested: { timeout: "{{timeout}}" },
      };

      const result = service.interpolate(obj);
      expect(result).toEqual({
        url: "https://api.example.com/users/123",
        headers: { Authorization: "Bearer abc123" },
        nested: { timeout: 5000 },
      });
    });

    it("should interpolate arrays", () => {
      const arr = ["{{user_id}}", "{{test_name}}", "{{api_url}}"];
      const result = service.interpolate(arr);
      expect(result).toEqual([123, "integration", "https://api.example.com"]);
    });

    it("should keep placeholders for non-existent variables", () => {
      const result = service.interpolate("Hello {{unknown_var}}");
      expect(result).toBe("Hello {{unknown_var}}");
    });

    it("should preserve non-string types", () => {
      const obj = { number: 42, boolean: true, null_val: null };
      const result = service.interpolate(obj);
      expect(result).toEqual(obj);
    });

    it("should return raw value when template is a single variable", () => {
      expect(service.interpolate("{{user_id}}")).toBe(123);
      expect(service.interpolate("{{auth_token}}")).toBe("abc123");
    });

    it("should interpolate with suppressWarnings enabled", () => {
      const result = service.interpolate("Hello {{unknown}}", true);
      expect(result).toBe("Hello {{unknown}}");
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should log warning for non-existent variables when suppressWarnings is false", () => {
      service.interpolate("Hello {{unknown_variable}}", false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Variable 'unknown_variable' not found during interpolation"
      );
    });
  });

  describe("JavaScript expressions", () => {
    // Testes de JavaScript foram movidos para interpolation.service.test.ts
    // VariableService agora delega toda a lógica de interpolação para InterpolationService
    // Mantemos apenas testes de integração básicos

    it("should process js: expressions via InterpolationService", () => {
      const result = service.interpolate("Result: {{$js:Math.max(1,2)}}");
      expect(result).toBe("Result: 2");
    });

    it("should handle error in JavaScript expression", () => {
      const result = service.interpolate("Result: {{$js:invalid syntax}}");
      // InterpolationService retorna o placeholder em caso de erro
      expect(result).toBe("Result: {{$js:invalid syntax}}");
    });
  });

  describe("Faker expressions", () => {
    // Testes de Faker foram movidos para interpolation.service.test.ts
    // Mantemos apenas teste de integração básico

    it("should process faker expressions via InterpolationService", () => {
      const result = service.interpolate("Email: {{$faker.internet.email}}");
      // Verifica apenas que retorna um email válido (formato)
      expect(result).toMatch(/Email: .+@.+\..+/);
    });
  });

  describe("Global Registry integration", () => {
    it("should fetch exported variable from global registry", () => {
      mockGlobalRegistry.getExportedVariable.mockReturnValue("exported_value");

      const result = service.interpolate("Value: {{global.exported}}");
      expect(result).toBe("Value: exported_value");
      expect(mockGlobalRegistry.getExportedVariable).toHaveBeenCalledWith(
        "global.exported"
      );
    });

    it("should work without global registry", () => {
      const serviceWithoutRegistry =
        createVariableServiceWithContext(baseContext);
      const result = serviceWithoutRegistry.interpolate(
        "Value: {{global.var}}"
      );
      expect(result).toBe("Value: {{global.var}}");
    });
  });

  describe("Variable hierarchy", () => {
    it("should prioritize runtime over suite", () => {
      const contextWithConflict = {
        runtime: { shared_var: "runtime_value" },
        suite: { shared_var: "suite_value" },
        environment: {},
        global: {},
        imported: {},
      };
      const serviceWithConflict =
        createVariableServiceWithContext(contextWithConflict);
      const result = serviceWithConflict.interpolate("{{shared_var}}");
      expect(result).toBe("runtime_value");
    });

    it("should prioritize suite over imported", () => {
      const contextWithConflict = {
        ...baseContext,
        suite: { test_var: "suite_value" },
        imported: { flow: { test_var: "imported_value" } },
      };

      const serviceWithConflict =
        createVariableServiceWithContext(contextWithConflict);
      const result = serviceWithConflict.interpolate("{{test_var}}");
      expect(result).toBe("suite_value");
    });

    it("should prioritize imported over global", () => {
      const contextWithConflict = {
        ...baseContext,
        global: { test_var: "global_value" },
        imported: { flow: { test_var: "imported_value" } },
      };

      const serviceWithConflict =
        createVariableServiceWithContext(contextWithConflict);
      const result = serviceWithConflict.interpolate("{{flow.test_var}}");
      expect(result).toBe("imported_value");
    });
  });

  describe("Special cases", () => {
    it("should interpolate falsy values correctly", () => {
      const contextWithFalsy = {
        ...baseContext,
        runtime: { zero: 0, false_val: false, empty_string: "" },
      };

      const serviceWithFalsy =
        createVariableServiceWithContext(contextWithFalsy);

      expect(serviceWithFalsy.interpolate("{{zero}}")).toBe(0);
      expect(serviceWithFalsy.interpolate("{{false_val}}")).toBe(false);
      expect(serviceWithFalsy.interpolate("{{empty_string}}")).toBe("");
    });

    it("should handle special characters in variables", () => {
      const contextWithSpecial = {
        ...baseContext,
        runtime: {
          "var-with-dashes": "dash_value",
          var_with_underscores: "underscore_value",
        },
      };

      const serviceWithSpecial =
        createVariableServiceWithContext(contextWithSpecial);

      expect(serviceWithSpecial.interpolate("{{var-with-dashes}}")).toBe(
        "dash_value"
      );
      expect(serviceWithSpecial.interpolate("{{var_with_underscores}}")).toBe(
        "underscore_value"
      );
    });

    it("should interpolate multiple occurrences of the same variable", () => {
      const result = service.interpolate("{{user_id}} and {{user_id}} again");
      expect(result).toBe("123 and 123 again");
    });

    it("should preserve whitespace", () => {
      const contextWithSpaces = {
        ...baseContext,
        runtime: { spaced_var: "  spaced value  " },
      };

      const serviceWithSpaces =
        createVariableServiceWithContext(contextWithSpaces);
      const result = serviceWithSpaces.interpolate("Value: '{{spaced_var}}'");
      expect(result).toBe("Value: '  spaced value  '");
    });
  });

  describe("Error handling", () => {
    it("should handle circular objects without hanging", () => {
      const circular: any = { name: "test" };
      circular.self = circular;

      const contextWithCircular = {
        ...baseContext,
        runtime: { circular_ref: circular },
      };

      const serviceWithCircular =
        createVariableServiceWithContext(contextWithCircular);

      expect(() => {
        serviceWithCircular.interpolate("{{circular_ref}}");
      }).not.toThrow();
    });

    it("should process deeply nested arrays", () => {
      const deepArray = [["{{user_id}}", "{{test_name}}"], [["{{api_url}}"]]];

      const result = service.interpolate(deepArray);
      expect(result).toEqual([
        [123, "integration"],
        [["https://api.example.com"]],
      ]);
    });

    it("should process deeply nested objects", () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              value: "{{auth_token}}",
            },
          },
        },
      };

      const result = service.interpolate(deepObject);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              value: "abc123",
            },
          },
        },
      });
    });
  });

  describe("Public API methods", () => {
    it("should set variable via setVariable", () => {
      service.setVariable("test_var", "test_value");
      const result = service.interpolate("{{test_var}}");
      expect(result).toBe("test_value");
    });

    it("should set multiple variables via setVariables", () => {
      service.setVariables({ var1: "value1", var2: "value2" });

      const result1 = service.interpolate("{{var1}}");
      const result2 = service.interpolate("{{var2}}");

      expect(result1).toBe("value1");
      expect(result2).toBe("value2");
    });

    it("should add imported flow", () => {
      service.addImportedFlow("newFlow", { flowVar: "flowValue" });

      const result = service.interpolate("{{newFlow.flowVar}}");
      expect(result).toBe("flowValue");
    });

    it("should return all variables", () => {
      service.setVariable("runtime_var", "runtime_value");

      const allVars = service.getAllVariables();

      expect(allVars).toEqual(
        expect.objectContaining({
          api_url: "https://api.example.com",
          user_id: 123,
          runtime_var: "runtime_value",
          auth_token: "abc123",
        })
      );
    });

    it("should export variable to global registry", () => {
      service.setVariable("export_var", "export_value");
      service.exportVariables("test-suite", "test-node", ["export_var"], {});

      expect(mockGlobalRegistry.setExportedVariable).toHaveBeenCalled();
    });

    it("should clear runtime context", () => {
      service.setVariable("temp_var", "temp_value");
      expect(service.interpolate("{{temp_var}}")).toBe("temp_value");

      service.clearRuntimeVariables();
      expect(service.interpolate("{{temp_var}}")).toBe("{{temp_var}}");
    });

    it("should update JavaScript execution context", () => {
      const newContext = { variables: { customVar: "customValue" } };
      service.setExecutionContext(newContext);

      // Verificar se o contexto foi atualizado via getAllAvailableVariables
      const allVars = service.getAllVariables();
      expect(allVars).toBeDefined();
    });

    it("should check if has variable", () => {
      service.setVariable("test_var", "test_value");

      expect(service.hasVariable("test_var")).toBe(true);
      expect(service.hasVariable("nonexistent")).toBe(false);
    });

    it("should get exported global variables", () => {
      mockGlobalRegistry.getAllExportedVariables.mockReturnValue({
        global_export: "exported_value",
      });

      const globalVars = service.getGlobalExportedVariables();
      expect(globalVars).toEqual({ global_export: "exported_value" });
    });

    it("should get all available variables including globals", () => {
      service.setVariable("runtime_var", "runtime_value");
      mockGlobalRegistry.getAllExportedVariables.mockReturnValue({
        global_export: "exported_value",
      });

      const allAvailable = service.getAllAvailableVariables();
      expect(allAvailable).toEqual(
        expect.objectContaining({
          runtime_var: "runtime_value",
          global_export: "exported_value",
        })
      );
    });

    it("should set global registry", () => {
      const newRegistry = {} as any;
      service.setGlobalRegistry(newRegistry);

      // A função não tem retorno, mas verificamos que não gera erro
      expect(service).toBeDefined();
    });

    it("should clear suite variables", () => {
      service.setVariable("runtime_var", "runtime_value");

      service.clearSuiteVariables();

      expect(service.interpolate("{{runtime_var}}")).toBe("{{runtime_var}}");
      expect(service.interpolate("{{user_id}}")).toBe("{{user_id}}"); // suite var também limpa
    });

    it("should clear all non-global variables", () => {
      service.setVariable("runtime_var", "runtime_value");

      service.clearAllNonGlobalVariables();

      expect(service.interpolate("{{runtime_var}}")).toBe("{{runtime_var}}");
      expect(service.interpolate("{{user_id}}")).toBe("{{user_id}}");
      expect(service.interpolate("{{auth.token}}")).toBe("{{auth.token}}"); // imported também limpa
      expect(service.interpolate("{{api_url}}")).toBe(
        "https://api.example.com"
      ); // global preserva
    });
  });

  describe("Advanced interpolation scenarios", () => {
    it("should interpolate with variables in imported flows using findInImported", () => {
      const contextWithMultipleImports = {
        ...baseContext,
        imported: {
          flow1: { shared_name: "from_flow1" },
          flow2: { shared_name: "from_flow2", unique_var: "unique_value" },
        },
      };

      const serviceWithImports = createVariableServiceWithContext(
        contextWithMultipleImports
      );

      // Should find the first occurrence
      const result1 = serviceWithImports.interpolate("{{shared_name}}");
      expect(result1).toBe("from_flow1");

      const result2 = serviceWithImports.interpolate("{{unique_var}}");
      expect(result2).toBe("unique_value");
    });

    it("should use getNestedValue for dot notation", () => {
      const contextWithNested = {
        ...baseContext,
        imported: {
          complex: {
            nested: {
              deep: {
                value: "deep_value",
              },
            },
          },
        },
      };

      const serviceWithNested =
        createVariableServiceWithContext(contextWithNested);
      const result = serviceWithNested.interpolate(
        "{{complex.nested.deep.value}}"
      );
      expect(result).toBe("deep_value");
    });

    it("should handle getNestedValue on undefined objects", () => {
      const result = service.interpolate("{{nonexistent.deep.path}}");
      expect(result).toBe("{{nonexistent.deep.path}}");
    });

    it("should check if is runtime variable with isLikelyRuntimeVariable", () => {
      // Testar cenário onde uma variável não é encontrada mas é identificada como runtime
      const result = service.interpolate("{{session_token}}", false);
      expect(result).toBe("{{session_token}}");
    });

    it("should export variables with different scenarios", () => {
      // Cenário: variável em capturedVariables
      service.setVariable("captured_var", "captured_value");
      const capturedVars = { captured_var: "captured_value" };

      service.exportVariables(
        "test-suite",
        "test-node",
        ["captured_var"],
        capturedVars
      );
      expect(mockGlobalRegistry.setExportedVariable).toHaveBeenCalledWith(
        "test-suite",
        "captured_var",
        "captured_value"
      );
    });

    it("should export runtime variable when not in captured", () => {
      service.setVariable("runtime_var", "runtime_value");

      service.exportVariables("test-suite", "test-node", ["runtime_var"], {});
      expect(mockGlobalRegistry.setExportedVariable).toHaveBeenCalledWith(
        "test-suite",
        "runtime_var",
        "runtime_value"
      );
    });

    it("should log warning when export variable is not found", () => {
      service.exportVariables(
        "test-suite",
        "test-node",
        ["nonexistent_var"],
        {}
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Export 'nonexistent_var' not found in captured variables for suite 'test-node'"
      );
    });

    it("should return empty object when no global registry", () => {
      const serviceWithoutRegistry =
        createVariableServiceWithContext(baseContext);
      const result = serviceWithoutRegistry.getGlobalExportedVariables();
      expect(result).toEqual({});
    });

    it("should return context statistics", () => {
      service.setVariable("runtime1", "value1");
      service.setVariable("runtime2", "value2");

      const stats = service.getVariableCounts();
      expect(stats).toEqual({
        global: 2, // api_url, timeout
        suite: 2, // user_id, test_name
        imported: 1, // auth
        runtime: 4, // auth_token, session_id, runtime1, runtime2
      });
    });
  });
});
