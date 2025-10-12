/**
 * Testes unitários para CaptureService
 * Cobertura: 100% das funções, branches e statements
 */

import { CaptureService } from "../capture.service";
import { StepExecutionResult } from "../../types/config.types";

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

// Mock do jmespath
jest.mock("jmespath", () => ({
  search: jest.fn(),
}));

import * as jmespath from "jmespath";
const mockJmespath = jmespath as jest.Mocked<typeof jmespath>;

describe("CaptureService", () => {
  let captureService: CaptureService;
  let mockResult: StepExecutionResult;

  beforeEach(() => {
    jest.clearAllMocks();

    captureService = new CaptureService();

    mockResult = {
      step_name: "Test Step",
      status: "success",
      duration_ms: 500,
      request_details: {
        method: "GET",
        url: "/api/test",
        full_url: "https://api.example.com/api/test",
      },
      response_details: {
        status_code: 200,
        headers: {
          "x-token": "abc123",
          "content-type": "application/json",
        },
        body: {
          id: 123,
          name: "Test User",
          token: "user_token_456",
          data: {
            score: 95,
            metadata: { tag: "premium" },
          },
        },
        size_bytes: 150,
      },
      captured_variables: {},
      assertions_results: [],
    };
  });

  describe("Constructor", () => {
    test("deve criar instância do CaptureService", () => {
      expect(captureService).toBeInstanceOf(CaptureService);
    });
  });

  describe("captureVariables", () => {
    test("deve capturar variáveis simples do body", () => {
      const captures = {
        user_id: "body.id",
        user_name: "body.name",
        auth_token: "body.token",
      };

      mockJmespath.search
        .mockReturnValueOnce(123)
        .mockReturnValueOnce("Test User")
        .mockReturnValueOnce("user_token_456");

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        user_id: 123,
        user_name: "Test User",
        auth_token: "user_token_456",
      });

      expect(mockJmespath.search).toHaveBeenCalledTimes(3);
    });

    test("deve capturar variáveis aninhadas", () => {
      const captures = {
        score: "body.data.score",
        tag: "body.data.metadata.tag",
      };

      mockJmespath.search
        .mockReturnValueOnce(95)
        .mockReturnValueOnce("premium");

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        score: 95,
        tag: "premium",
      });
    });

    test("deve capturar headers", () => {
      const captures = {
        token_header: "headers.x-token",
        content_type: "headers.content-type",
      };

      mockJmespath.search
        .mockReturnValueOnce("abc123")
        .mockReturnValueOnce("application/json");

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        token_header: "abc123",
        content_type: "application/json",
      });
    });

    test("deve capturar status code", () => {
      const captures = {
        response_status: "status",
      };

      mockJmespath.search.mockReturnValueOnce(200);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        response_status: 200,
      });
    });

    test("deve tratar valores não encontrados", () => {
      const captures = {
        missing_field: "body.missing",
      };

      mockJmespath.search.mockReturnValueOnce(undefined);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({});

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Could not capture: missing_field (path: body.missing)"
      );
    });

    test("deve tratar erro JMESPath", () => {
      const captures = {
        invalid_path: "body.invalid..path",
      };

      mockJmespath.search.mockImplementationOnce(() => {
        throw new Error("Invalid JMESPath");
      });

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({});

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error capturing invalid_path",
        {
          error: expect.any(Error),
        }
      );
    });

    test("deve retornar objeto vazio se sem captures", () => {
      const result = captureService.captureVariables({}, mockResult);
      expect(result).toEqual({});
    });

    test("deve tratar response_details ausente", () => {
      const mockResultWithoutResponse: StepExecutionResult = {
        ...mockResult,
        response_details: undefined,
      };

      const captures = {
        test_var: "body.id",
      };

      const result = captureService.captureVariables(
        captures,
        mockResultWithoutResponse
      );

      expect(result).toEqual({});

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Could not capture variables: response not available"
      );
    });
  });

  describe("Edge Cases", () => {
    test("deve capturar arrays", () => {
      const captures = {
        tags: "body.tags",
      };

      const mockTags = ["tag1", "tag2", "tag3"];
      mockJmespath.search.mockReturnValueOnce(mockTags);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        tags: mockTags,
      });
    });

    test("deve capturar objetos complexos", () => {
      const captures = {
        full_data: "body.data",
      };

      const mockData = {
        score: 95,
        metadata: { tag: "premium" },
      };
      mockJmespath.search.mockReturnValueOnce(mockData);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        full_data: mockData,
      });
    });

    test("deve capturar valores null", () => {
      const captures = {
        null_field: "body.null_field",
      };

      mockJmespath.search.mockReturnValueOnce(null);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        null_field: null,
      });
    });

    test("deve capturar valores boolean", () => {
      const captures = {
        is_active: "body.active",
      };

      mockJmespath.search.mockReturnValueOnce(true);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        is_active: true,
      });
    });

    test("deve capturar valores zero", () => {
      const captures = {
        count: "body.count",
      };

      mockJmespath.search.mockReturnValueOnce(0);

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        count: 0,
      });
    });
  });

  describe("Performance", () => {
    test("deve processar muitas capturas rapidamente", () => {
      const largeCaptures: Record<string, string> = {};

      // Criar 100 capturas
      for (let i = 0; i < 100; i++) {
        largeCaptures[`var_${i}`] = `body.field_${i}`;
      }

      // Mock JMESPath para retornar valores
      for (let i = 0; i < 100; i++) {
        mockJmespath.search.mockReturnValueOnce(`value_${i}`);
      }

      const startTime = Date.now();
      const result = captureService.captureVariables(largeCaptures, mockResult);
      const endTime = Date.now();

      expect(Object.keys(result)).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Timeout flexível para CI

      // Verificar alguns valores
      expect(result.var_0).toBe("value_0");
      expect(result.var_99).toBe("value_99");
    });
  });

  describe("validateCapturePaths", () => {
    test("deve validar paths corretos", () => {
      const capturePaths = {
        user_id: "body.user.id",
        status: "status_code",
      };

      mockJmespath.search.mockReturnValue(undefined); // Não lança erro

      const errors = captureService.validateCapturePaths(capturePaths);

      expect(errors).toEqual([]);
      expect(mockJmespath.search).toHaveBeenCalledTimes(2);
      expect(mockJmespath.search).toHaveBeenCalledWith({}, "body.user.id");
      expect(mockJmespath.search).toHaveBeenCalledWith({}, "status_code");
    });

    test("deve detectar paths inválidos", () => {
      const capturePaths = {
        valid: "body.user.id",
        invalid1: "body..invalid",
        invalid2: "body[missing",
      };

      mockJmespath.search
        .mockReturnValueOnce(undefined) // valid path
        .mockImplementationOnce(() => {
          throw new Error("Syntax error 1");
        }) // invalid1
        .mockImplementationOnce(() => {
          throw new Error("Syntax error 2");
        }); // invalid2

      const errors = captureService.validateCapturePaths(capturePaths);

      expect(errors).toEqual([
        "Variable 'invalid1': Error: Syntax error 1",
        "Variable 'invalid2': Error: Syntax error 2",
      ]);
      expect(mockJmespath.search).toHaveBeenCalledTimes(3);
    });

    test("deve retornar array vazio para paths vazios", () => {
      const errors = captureService.validateCapturePaths({});

      expect(errors).toEqual([]);
      expect(mockJmespath.search).not.toHaveBeenCalled();
    });
  });

  describe("listAvailablePaths", () => {
    test("deve listar paths de objeto simples", () => {
      const obj = {
        name: "João",
        age: 30,
        active: true,
      };

      const paths = captureService.listAvailablePaths(obj);

      expect(paths).toEqual(["name", "age", "active"]);
    });

    test("deve listar paths aninhados com prefixo", () => {
      const obj = {
        user: {
          id: 123,
          profile: {
            name: "João",
            email: "joao@example.com",
          },
        },
        status: "active",
      };

      const paths = captureService.listAvailablePaths(obj, "body");

      expect(paths).toContain("body.user");
      expect(paths).toContain("body.user.id");
      expect(paths).toContain("body.user.profile");
      expect(paths).toContain("body.user.profile.name");
      expect(paths).toContain("body.user.profile.email");
      expect(paths).toContain("body.status");
    });

    test("deve respeitar limite de profundidade", () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: "deep",
            },
          },
        },
      };

      const paths = captureService.listAvailablePaths(obj, "", 2);

      expect(paths).toContain("level1");
      expect(paths).toContain("level1.level2");
      expect(paths).not.toContain("level1.level2.level3");
      expect(paths).not.toContain("level1.level2.level3.level4");
    });

    test("deve tratar valores null e primitivos", () => {
      const obj = {
        nullValue: null,
        stringValue: "texto",
        numberValue: 42,
        arrayValue: [1, 2, 3],
      };

      const paths = captureService.listAvailablePaths(obj);

      expect(paths).toEqual([
        "nullValue",
        "stringValue",
        "numberValue",
        "arrayValue",
      ]);
    });

    test("deve tratar objeto vazio", () => {
      const paths = captureService.listAvailablePaths({});

      expect(paths).toEqual([]);
    });

    test("deve tratar valores primitivos como raiz", () => {
      expect(captureService.listAvailablePaths("string")).toEqual([]);
      expect(captureService.listAvailablePaths(123)).toEqual([]);
      expect(captureService.listAvailablePaths(null)).toEqual([]);
    });
  });

  describe("suggestCapturePaths", () => {
    test("deve sugerir paths básicos sempre disponíveis", () => {
      const suggestions = captureService.suggestCapturePaths(mockResult);

      expect(suggestions).toContain("status_code");
      expect(suggestions).toContain("duration_ms");
      expect(suggestions).toContain("size_bytes");
    });

    test("deve sugerir headers comuns quando disponíveis", () => {
      const suggestions = captureService.suggestCapturePaths(mockResult);

      expect(suggestions).toContain('headers."content-type"');
      // authorization header não está presente no mock
    });

    test("deve sugerir paths do body", () => {
      // Mock do listAvailablePaths
      jest
        .spyOn(captureService, "listAvailablePaths")
        .mockReturnValue([
          "body.id",
          "body.name",
          "body.token",
          "body.data",
          "body.data.score",
        ]);

      const suggestions = captureService.suggestCapturePaths(mockResult);

      expect(suggestions).toContain("body.id");
      expect(suggestions).toContain("body.name");
      expect(suggestions).toContain("body.token");
      expect(suggestions).toContain("body.data");
      expect(suggestions).toContain("body.data.score");
    });

    test("deve tratar response_details ausente", () => {
      const mockResultNoResponse: StepExecutionResult = {
        ...mockResult,
        response_details: undefined,
      };

      const suggestions =
        captureService.suggestCapturePaths(mockResultNoResponse);

      expect(suggestions).toEqual([]);
    });

    test("deve tratar headers ausentes", () => {
      const mockResultNoHeaders: StepExecutionResult = {
        ...mockResult,
        response_details: {
          ...mockResult.response_details!,
          headers: {},
        },
      };

      const suggestions =
        captureService.suggestCapturePaths(mockResultNoHeaders);

      expect(suggestions).toContain("status_code");
      expect(suggestions).toContain("duration_ms");
      expect(suggestions).toContain("size_bytes");
      expect(suggestions).not.toContain('headers."content-type"');
    });

    test("deve tratar body não-objeto", () => {
      const mockResultStringBody: StepExecutionResult = {
        ...mockResult,
        response_details: {
          ...mockResult.response_details!,
          body: "plain text response",
        },
      };

      const suggestions =
        captureService.suggestCapturePaths(mockResultStringBody);

      expect(suggestions).toContain("status_code");
      expect(suggestions).toContain("duration_ms");
      expect(suggestions).toContain("size_bytes");
      // Não deve sugerir paths do body para texto plano
    });

    test("deve detectar headers case-insensitive", () => {
      const mockResultMixedHeaders: StepExecutionResult = {
        ...mockResult,
        response_details: {
          ...mockResult.response_details!,
          headers: {
            "content-type": "application/json", // lowercase
            authorization: "Bearer token", // lowercase
            location: "/api/redirect", // lowercase
            "set-cookie": "session=abc123", // lowercase
          },
        },
      };

      const suggestions = captureService.suggestCapturePaths(
        mockResultMixedHeaders
      );

      expect(suggestions).toContain('headers."content-type"');
      expect(suggestions).toContain('headers."authorization"');
      expect(suggestions).toContain('headers."location"');
      expect(suggestions).toContain('headers."set-cookie"');
    });

    test("deve verificar todas as linhas da funcao suggestCapturePaths", () => {
      // Teste simples para garantir cobertura das linhas restantes
      const mockResultWithUpperHeaders: StepExecutionResult = {
        ...mockResult,
        response_details: {
          ...mockResult.response_details!,
          headers: {
            "Content-Type": "application/json",
          },
        },
      };

      const suggestions = captureService.suggestCapturePaths(
        mockResultWithUpperHeaders
      );

      // Verificar que básicos estão sempre presentes
      expect(suggestions).toContain("status_code");
      expect(suggestions).toContain("duration_ms");
      expect(suggestions).toContain("size_bytes");
    });
  });

  describe("extractValue method coverage", () => {
    test("deve processar strings literais com aspas", () => {
      const captures = {
        literal: '"hello world"',
      };

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        literal: "hello world",
      });
    });

    test("deve processar expressões JavaScript {{js:...}}", () => {
      const captures = {
        calculated: "{{js: status_code * 2}}",
        conditional: '{{js: body.id > 100 ? "high" : "low"}}',
        string_concat: '{{js: "User: " + body.name}}',
      };

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        calculated: 400, // 200 * 2
        conditional: "high", // 123 > 100
        string_concat: "User: Test User",
      });
    });

    test("deve processar expressões JavaScript {{$js:...}}", () => {
      const captures = {
        calculated: "{{$js: status_code + 1}}",
      };

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        calculated: 201,
      });
    });

    test("deve processar expressões JavaScript com variáveis", () => {
      const captures = {
        with_vars: '{{js: variables.base_url + "/users/" + body.id}}',
      };

      const variableContext = {
        base_url: "https://api.example.com",
      };

      const result = captureService.captureVariables(
        captures,
        mockResult,
        variableContext
      );

      expect(result).toEqual({
        with_vars: "https://api.example.com/users/123",
      });
    });

    test("deve tratar erro em expressão JavaScript", () => {
      const captures = {
        invalid_js: "{{js: nonExistent.property.access}}",
      };

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({});
    });

    test("deve retornar referências de variáveis como-está", () => {
      const captures = {
        var_ref: "{{user_id}}",
        another_ref: "{{token}}",
      };

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        var_ref: "{{user_id}}",
        another_ref: "{{token}}",
      });
    });

    test("deve processar valores literais boolean/null/number", () => {
      const captures = {
        bool_true: "true",
        bool_false: "false",
        null_val: "null",
        number_val: "42",
        float_val: "3.14",
      };

      // Mock jmespath para falhar e usar fallback
      mockJmespath.search.mockImplementation(() => {
        throw new Error("Invalid JMESPath");
      });

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        bool_true: true,
        bool_false: false,
        null_val: null,
        number_val: 42,
        float_val: 3.14,
      });
    });

    test("deve tratar URLs/paths como strings literais", () => {
      const captures = {
        url: "https://example.com/api",
        path: "/api/users",
        protocol: "ftp://server.com",
      };

      // Mock jmespath para falhar e usar fallback
      mockJmespath.search.mockImplementation(() => {
        throw new Error("Invalid JMESPath");
      });

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        url: "https://example.com/api",
        path: "/api/users",
        protocol: "ftp://server.com",
      });
    });

    test("deve processar valores não-string diretamente", () => {
      const captures = {
        number: 123,
        boolean: true,
        object: { key: "value" },
      } as any;

      const result = captureService.captureVariables(captures, mockResult);

      expect(result).toEqual({
        number: 123,
        boolean: true,
        object: { key: "value" },
      });
    });
  });

  describe("formatValue method coverage", () => {
    test("deve formatar string longa truncada", () => {
      const longString = "a".repeat(150);
      const captures = {
        long_text: "body.long_field",
      };

      mockJmespath.search.mockReturnValueOnce(longString);

      captureService.captureVariables(captures, mockResult);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `    [📥] Captured: long_text = "${longString.substring(0, 100)}..."`,
        { metadata: { type: "variable_capture", internal: true } }
      );
    });

    test("deve formatar objeto grande truncado", () => {
      const largeObj = { data: "x".repeat(150) };
      const captures = {
        large_obj: "body.large_field",
      };

      mockJmespath.search.mockReturnValueOnce(largeObj);

      captureService.captureVariables(captures, mockResult);

      const objStr = JSON.stringify(largeObj);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `    [📥] Captured: large_obj = ${objStr.substring(0, 100)}...`,
        { metadata: { type: "variable_capture", internal: true } }
      );
    });

    test("deve formatar valores undefined/null", () => {
      const captures = {
        undef_val: "body.undefined_field",
        null_val: "body.null_field",
      };

      mockJmespath.search
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(null);

      captureService.captureVariables(captures, mockResult);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "    [📥] Captured: null_val = null",
        { metadata: { type: "variable_capture", internal: true } }
      );
    });

    test("deve formatar string curta sem truncar", () => {
      const shortString = "small text";
      const captures = {
        short_text: "body.short_field",
      };

      mockJmespath.search.mockReturnValueOnce(shortString);

      captureService.captureVariables(captures, mockResult);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `    [📥] Captured: short_text = "${shortString}"`,
        { metadata: { type: "variable_capture", internal: true } }
      );
    });

    test("deve formatar objeto pequeno sem truncar", () => {
      const smallObj = { id: 123, name: "João" };
      const captures = {
        small_obj: "body.small_field",
      };

      mockJmespath.search.mockReturnValueOnce(smallObj);

      captureService.captureVariables(captures, mockResult);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `    [📥] Captured: small_obj = ${JSON.stringify(smallObj)}`,
        { metadata: { type: "variable_capture", internal: true } }
      );
    });

    test("deve formatar valores primitivos", () => {
      const captures = {
        number_val: "body.number",
        boolean_val: "body.boolean",
      };

      mockJmespath.search.mockReturnValueOnce(42).mockReturnValueOnce(true);

      captureService.captureVariables(captures, mockResult);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "    [📥] Captured: number_val = 42",
        { metadata: { type: "variable_capture", internal: true } }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "    [📥] Captured: boolean_val = true",
        { metadata: { type: "variable_capture", internal: true } }
      );
    });
  });
});
