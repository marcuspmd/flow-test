/**
 * Testes unitários para VariableService
 * Cobertura abrangente da interface pública
 */

import { VariableService } from "../variable.service";
import { GlobalVariableContext } from "../../types/config.types";

// Mock do logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock("../logger.service", () => ({
  getLogger: () => mockLogger,
}));

// Mock do faker service
jest.mock("../faker.service", () => ({
  fakerService: {
    parseFakerExpression: jest.fn((expression: string) => {
      if (expression === "faker.internet.email") return "test@example.com";
      if (expression === "faker.person.firstName") return "John";
      if (expression === "faker.datatype.number") return 42;
      return `mocked_${expression}`;
    }),
  },
}));

// Mock do javascript service
jest.mock("../javascript.service", () => ({
  javascriptService: {
    parseJavaScriptExpression: jest.fn(),
    executeExpression: jest.fn(),
  },
}));

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

    service = new VariableService(baseContext, mockGlobalRegistry);
  });

  describe("constructor", () => {
    it("deve criar uma instância com contexto fornecido", () => {
      expect(service).toBeDefined();
    });

    it("deve criar sem registry global", () => {
      const serviceWithoutRegistry = new VariableService(baseContext);
      expect(serviceWithoutRegistry).toBeDefined();
    });
  });

  describe("interpolate", () => {
    it("deve interpolar variável de runtime", () => {
      const result = service.interpolate("Token: {{auth_token}}");
      expect(result).toBe("Token: abc123");
    });

    it("deve interpolar variável de suite", () => {
      const result = service.interpolate("User ID: {{user_id}}");
      expect(result).toBe("User ID: 123");
    });

    it("deve interpolar variável global", () => {
      const result = service.interpolate("API: {{api_url}}");
      expect(result).toBe("API: https://api.example.com");
    });

    it("deve interpolar variável importada com dot notation", () => {
      const result = service.interpolate("Auth: {{auth.token}}");
      expect(result).toBe("Auth: xyz789");
    });

    it("deve interpolar múltiplas variáveis", () => {
      const result = service.interpolate("{{api_url}}/users/{{user_id}}");
      expect(result).toBe("https://api.example.com/users/123");
    });

    it("deve interpolar variáveis de ambiente", () => {
      process.env.TEST_VAR = "env_value";
      const result = service.interpolate("Env: {{$env.TEST_VAR}}");
      expect(result).toBe("Env: env_value");
    });

    it("deve retornar null para variável de ambiente inexistente", () => {
      const result = service.interpolate("Env: {{$env.NONEXISTENT}}");
      expect(result).toBe("Env: null");
    });

    it("deve interpolar expressões faker", () => {
      const result = service.interpolate("Email: {{faker.internet.email}}");
      expect(result).toBe("Email: test@example.com");
    });

    it("deve interpolar expressões $faker", () => {
      const result = service.interpolate("Name: {{$faker.person.firstName}}");
      expect(result).toBe("Name: John");
    });

    it("deve interpolar objetos complexos", () => {
      const obj = {
        url: "{{api_url}}/users/{{user_id}}",
        headers: { Authorization: "Bearer {{auth_token}}" },
        nested: { timeout: "{{timeout}}" },
      };

      const result = service.interpolate(obj);
      expect(result).toEqual({
        url: "https://api.example.com/users/123",
        headers: { Authorization: "Bearer abc123" },
        nested: { timeout: "5000" },
      });
    });

    it("deve interpolar arrays", () => {
      const arr = ["{{user_id}}", "{{test_name}}", "{{api_url}}"];
      const result = service.interpolate(arr);
      expect(result).toEqual(["123", "integration", "https://api.example.com"]);
    });

    it("deve manter placeholders para variáveis inexistentes", () => {
      const result = service.interpolate("Hello {{unknown_var}}");
      expect(result).toBe("Hello {{unknown_var}}");
    });

    it("deve preservar tipos não-string", () => {
      const obj = { number: 42, boolean: true, null_val: null };
      const result = service.interpolate(obj);
      expect(result).toEqual(obj);
    });

    it("deve interpolar com suppressWarnings ativo", () => {
      const result = service.interpolate("Hello {{unknown}}", true);
      expect(result).toBe("Hello {{unknown}}");
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("deve log warning para variáveis inexistentes quando suppressWarnings é false", () => {
      service.interpolate("Hello {{unknown_variable}}", false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Variable 'unknown_variable' not found during interpolation"
      );
    });
  });

  describe("JavaScript expressions", () => {
    let mockJavaScriptService: any;

    beforeEach(() => {
      mockJavaScriptService =
        require("../javascript.service").javascriptService;
      mockJavaScriptService.parseJavaScriptExpression.mockClear();
      mockJavaScriptService.executeExpression.mockClear();
    });

    it("deve processar expressões js:", () => {
      mockJavaScriptService.parseJavaScriptExpression.mockReturnValue(
        "Math.max(1,2)"
      );
      mockJavaScriptService.executeExpression.mockReturnValue(2);

      const result = service.interpolate("Result: {{js:Math.max(1,2)}}");
      expect(result).toBe("Result: 2");
      expect(
        mockJavaScriptService.parseJavaScriptExpression
      ).toHaveBeenCalledWith("js:Math.max(1,2)");
    });

    it("deve processar expressões $js.", () => {
      mockJavaScriptService.executeExpression.mockReturnValue(true);

      const result = service.interpolate("Status: {{$js.return true}}");
      expect(result).toBe("Status: true");
      expect(mockJavaScriptService.executeExpression).toHaveBeenCalledWith(
        "return true",
        expect.objectContaining({ variables: expect.any(Object) }),
        true
      );
    });

    it("deve processar expressões com operadores lógicos", () => {
      mockJavaScriptService.executeExpression.mockReturnValue(false);

      const result = service.interpolate("Valid: {{false || false}}");
      expect(result).toBe("Valid: false");
      expect(mockJavaScriptService.executeExpression).toHaveBeenCalledWith(
        "false || false",
        expect.objectContaining({ variables: expect.any(Object) }),
        false
      );
    });

    it("deve lidar com erro em expressão JavaScript", () => {
      mockJavaScriptService.executeExpression.mockImplementation(() => {
        throw new Error("Syntax error");
      });

      const result = service.interpolate("Result: {{js:invalid syntax}}");
      expect(result).toBe("Result: {{js:invalid syntax}}");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Error resolving JavaScript expression")
      );
    });
  });

  describe("Faker expressions", () => {
    it("deve processar expressões faker com erro", () => {
      const { fakerService } = require("../faker.service");
      fakerService.parseFakerExpression.mockImplementation(() => {
        throw new Error("Faker error");
      });

      const result = service.interpolate("Value: {{faker.invalid.expression}}");
      expect(result).toBe("Value: {{faker.invalid.expression}}");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Error resolving Faker expression")
      );
    });
  });

  describe("Global Registry integration", () => {
    it("deve buscar variável exportada do registry global", () => {
      mockGlobalRegistry.getExportedVariable.mockReturnValue("exported_value");

      const result = service.interpolate("Value: {{global.exported}}");
      expect(result).toBe("Value: exported_value");
      expect(mockGlobalRegistry.getExportedVariable).toHaveBeenCalledWith(
        "global.exported"
      );
    });

    it("deve funcionar sem registry global", () => {
      const serviceWithoutRegistry = new VariableService(baseContext);
      const result = serviceWithoutRegistry.interpolate(
        "Value: {{global.var}}"
      );
      expect(result).toBe("Value: {{global.var}}");
    });
  });

  describe("Variable hierarchy", () => {
    it("deve priorizar runtime sobre suite", () => {
      // Ambos têm a mesma variável, runtime deve ter prioridade
      const contextWithConflict = {
        ...baseContext,
        runtime: { shared_var: "runtime_value" },
        suite: { shared_var: "suite_value" },
      };

      const serviceWithConflict = new VariableService(contextWithConflict);
      const result = serviceWithConflict.interpolate("{{shared_var}}");
      expect(result).toBe("runtime_value");
    });

    it("deve priorizar suite sobre imported", () => {
      const contextWithConflict = {
        ...baseContext,
        suite: { test_var: "suite_value" },
        imported: { flow: { test_var: "imported_value" } },
      };

      const serviceWithConflict = new VariableService(contextWithConflict);
      const result = serviceWithConflict.interpolate("{{test_var}}");
      expect(result).toBe("suite_value");
    });

    it("deve priorizar imported sobre global", () => {
      const contextWithConflict = {
        ...baseContext,
        global: { test_var: "global_value" },
        imported: { flow: { test_var: "imported_value" } },
      };

      const serviceWithConflict = new VariableService(contextWithConflict);
      const result = serviceWithConflict.interpolate("{{flow.test_var}}");
      expect(result).toBe("imported_value");
    });
  });

  describe("Special cases", () => {
    it("deve interpolar valores falsy corretamente", () => {
      const contextWithFalsy = {
        ...baseContext,
        runtime: { zero: 0, false_val: false, empty_string: "" },
      };

      const serviceWithFalsy = new VariableService(contextWithFalsy);

      expect(serviceWithFalsy.interpolate("{{zero}}")).toBe("0");
      expect(serviceWithFalsy.interpolate("{{false_val}}")).toBe("false");
      expect(serviceWithFalsy.interpolate("{{empty_string}}")).toBe("");
    });

    it("deve lidar com caracteres especiais em variáveis", () => {
      const contextWithSpecial = {
        ...baseContext,
        runtime: {
          "var-with-dashes": "dash_value",
          var_with_underscores: "underscore_value",
        },
      };

      const serviceWithSpecial = new VariableService(contextWithSpecial);

      expect(serviceWithSpecial.interpolate("{{var-with-dashes}}")).toBe(
        "dash_value"
      );
      expect(serviceWithSpecial.interpolate("{{var_with_underscores}}")).toBe(
        "underscore_value"
      );
    });

    it("deve interpolar múltiplas ocorrências da mesma variável", () => {
      const result = service.interpolate("{{user_id}} and {{user_id}} again");
      expect(result).toBe("123 and 123 again");
    });

    it("deve preservar espaços em branco", () => {
      const contextWithSpaces = {
        ...baseContext,
        runtime: { spaced_var: "  spaced value  " },
      };

      const serviceWithSpaces = new VariableService(contextWithSpaces);
      const result = serviceWithSpaces.interpolate("Value: '{{spaced_var}}'");
      expect(result).toBe("Value: '  spaced value  '");
    });
  });

  describe("Error handling", () => {
    it("deve lidar com objetos circulares sem travamento", () => {
      const circular: any = { name: "test" };
      circular.self = circular;

      const contextWithCircular = {
        ...baseContext,
        runtime: { circular_ref: circular },
      };

      const serviceWithCircular = new VariableService(contextWithCircular);

      expect(() => {
        serviceWithCircular.interpolate("{{circular_ref}}");
      }).not.toThrow();
    });

    it("deve processar arrays aninhados profundos", () => {
      const deepArray = [["{{user_id}}", "{{test_name}}"], [["{{api_url}}"]]];

      const result = service.interpolate(deepArray);
      expect(result).toEqual([
        ["123", "integration"],
        [["https://api.example.com"]],
      ]);
    });

    it("deve processar objetos aninhados profundos", () => {
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
    it("deve definir variável via setVariable", () => {
      service.setVariable("test_var", "test_value");
      const result = service.interpolate("{{test_var}}");
      expect(result).toBe("test_value");
    });

    it("deve definir múltiplas variáveis via setVariables", () => {
      service.setVariables({ var1: "value1", var2: "value2" });

      const result1 = service.interpolate("{{var1}}");
      const result2 = service.interpolate("{{var2}}");

      expect(result1).toBe("value1");
      expect(result2).toBe("value2");
    });

    it("deve adicionar flow importado", () => {
      service.addImportedFlow("newFlow", { flowVar: "flowValue" });

      const result = service.interpolate("{{newFlow.flowVar}}");
      expect(result).toBe("flowValue");
    });

    it("deve retornar todas as variáveis", () => {
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

    it("deve exportar variável para registry global", () => {
      service.setVariable("export_var", "export_value");
      service.exportVariables("test-suite", "test-node", ["export_var"], {});

      expect(mockGlobalRegistry.setExportedVariable).toHaveBeenCalled();
    });

    it("deve limpar contexto de runtime", () => {
      service.setVariable("temp_var", "temp_value");
      expect(service.interpolate("{{temp_var}}")).toBe("temp_value");

      service.clearRuntimeVariables();
      expect(service.interpolate("{{temp_var}}")).toBe("{{temp_var}}");
    });

    it("deve atualizar contexto de execução JavaScript", () => {
      const newContext = { variables: { customVar: "customValue" } };
      service.setExecutionContext(newContext);

      // Verificar se o contexto foi atualizado via getAllAvailableVariables
      const allVars = service.getAllVariables();
      expect(allVars).toBeDefined();
    });

    it("deve verificar se tem variável", () => {
      service.setVariable("test_var", "test_value");

      expect(service.hasVariable("test_var")).toBe(true);
      expect(service.hasVariable("nonexistent")).toBe(false);
    });

    it("deve obter variáveis exportadas globais", () => {
      mockGlobalRegistry.getAllExportedVariables.mockReturnValue({
        global_export: "exported_value",
      });

      const globalVars = service.getGlobalExportedVariables();
      expect(globalVars).toEqual({ global_export: "exported_value" });
    });

    it("deve obter todas as variáveis disponíveis incluindo globais", () => {
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

    it("deve definir global registry", () => {
      const newRegistry = {} as any;
      service.setGlobalRegistry(newRegistry);

      // A função não tem retorno, mas verificamos que não gera erro
      expect(service).toBeDefined();
    });

    it("deve limpar variáveis de suite", () => {
      service.setVariable("runtime_var", "runtime_value");

      service.clearSuiteVariables();

      expect(service.interpolate("{{runtime_var}}")).toBe("{{runtime_var}}");
      expect(service.interpolate("{{user_id}}")).toBe("{{user_id}}"); // suite var também limpa
    });

    it("deve limpar todas as variáveis não-globais", () => {
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
    it("deve interpolar com variáveis em imported flows usando findInImported", () => {
      const contextWithMultipleImports = {
        ...baseContext,
        imported: {
          flow1: { shared_name: "from_flow1" },
          flow2: { shared_name: "from_flow2", unique_var: "unique_value" },
        },
      };

      const serviceWithImports = new VariableService(
        contextWithMultipleImports
      );

      // Deve encontrar a primeira ocorrência
      const result1 = serviceWithImports.interpolate("{{shared_name}}");
      expect(result1).toBe("from_flow1");

      const result2 = serviceWithImports.interpolate("{{unique_var}}");
      expect(result2).toBe("unique_value");
    });

    it("deve usar getNestedValue para dot notation", () => {
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

      const serviceWithNested = new VariableService(contextWithNested);
      const result = serviceWithNested.interpolate(
        "{{complex.nested.deep.value}}"
      );
      expect(result).toBe("deep_value");
    });

    it("deve lidar com getNestedValue em objetos indefinidos", () => {
      const result = service.interpolate("{{nonexistent.deep.path}}");
      expect(result).toBe("{{nonexistent.deep.path}}");
    });

    it("deve verificar se é variável de runtime com isLikelyRuntimeVariable", () => {
      // Testar cenário onde uma variável não é encontrada mas é identificada como runtime
      const result = service.interpolate("{{session_token}}", false);
      expect(result).toBe("{{session_token}}");
    });

    it("deve exportar variáveis com diferentes cenários", () => {
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

    it("deve exportar variável do runtime quando não está em captured", () => {
      service.setVariable("runtime_var", "runtime_value");

      service.exportVariables("test-suite", "test-node", ["runtime_var"], {});
      expect(mockGlobalRegistry.setExportedVariable).toHaveBeenCalledWith(
        "test-suite",
        "runtime_var",
        "runtime_value"
      );
    });

    it("deve logar warning quando variável de export não é encontrada", () => {
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

    it("deve retornar objeto vazio quando não há global registry", () => {
      const serviceWithoutRegistry = new VariableService(baseContext);
      const result = serviceWithoutRegistry.getGlobalExportedVariables();
      expect(result).toEqual({});
    });

    it("deve retornar estatísticas de contexto", () => {
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
