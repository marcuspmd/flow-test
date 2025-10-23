/**
 * @fileoverview Comprehensive unit tests for AssertionService
 * Validates HTTP response assertions with status codes, headers, and body validation using JMESPath
 */

import { AssertionService } from "../assertion";
import { StepExecutionResult } from "../../types/config.types";
import * as jmespath from "jmespath";

// Mock jmespath
jest.mock("jmespath");
const mockJmespathSearch = jmespath.search as jest.MockedFunction<
  typeof jmespath.search
>;

describe("AssertionService", () => {
  let assertionService: AssertionService;
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    startGroup: jest.fn(),
    endGroup: jest.fn(),
  };

  beforeEach(() => {
    assertionService = new AssertionService(mockLogger as any);
    jest.clearAllMocks();
  });

  // Helper function to create a mock result
  const createMockResult = (
    status: number,
    headers: Record<string, string> = {},
    body: any = {}
  ): StepExecutionResult => ({
    step_name: "test-step",
    status: "success" as const,
    duration_ms: 100,
    response_details: {
      status_code: status,
      headers,
      body,
      size_bytes: 100,
    },
  });

  describe("validateAssertions", () => {
    it("should validate successful status code assertion", () => {
      const result = createMockResult(200);
      const assertions = {
        status_code: 200,
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "status_code",
        expected: 200,
        actual: 200,
        passed: true,
        message: "OK",
      });
    });

    it("should validate failed status code assertion", () => {
      const result = createMockResult(404);
      const assertions = {
        status_code: 200,
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "status_code",
        expected: 200,
        actual: 404,
        passed: false,
        message: "Expected: 200, Received: 404",
      });
    });

    it("should validate headers assertion", () => {
      const result = createMockResult(200, {
        "content-type": "application/json",
        "x-api-version": "1.0",
      });

      const assertions = {
        headers: {
          "content-type": { equals: "application/json" },
          "x-api-version": { equals: "1.0" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        field: "headers.content-type.equals",
        expected: "application/json",
        actual: "application/json",
        passed: true,
        message: "OK",
      });
      expect(results[1]).toEqual({
        field: "headers.x-api-version.equals",
        expected: "1.0",
        actual: "1.0",
        passed: true,
        message: "OK",
      });
    });

    it("should validate failed headers assertion", () => {
      const result = createMockResult(200, {
        "content-type": "text/html",
      });

      const assertions = {
        headers: {
          "content-type": { equals: "application/json" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "headers.content-type.equals",
        expected: "application/json",
        actual: "text/html",
        passed: false,
        message: "Expected: application/json, Received: text/html",
      });
    });

    it("should validate missing header assertion", () => {
      const result = createMockResult(200, {});

      const assertions = {
        headers: {
          authorization: { equals: "Bearer token" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "headers.authorization.equals",
        expected: "Bearer token",
        actual: undefined,
        passed: false,
        message: "Expected: Bearer token, Received: undefined",
      });
    });

    it("should validate body assertion with simple equality", () => {
      mockJmespathSearch.mockReturnValue("success");

      const result = createMockResult(200, {}, { message: "success" });

      const assertions = {
        body: {
          message: { equals: "success" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.message.equals",
        expected: "success",
        actual: "success",
        passed: true,
        message: "OK",
      });
      expect(mockJmespathSearch).toHaveBeenCalledWith(
        result.response_details!.body,
        "message"
      );
    });

    it("should validate failed body assertion", () => {
      mockJmespathSearch.mockReturnValue("error");

      const result = createMockResult(200, {}, { message: "error" });

      const assertions = {
        body: {
          message: { equals: "success" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.message.equals",
        expected: "success",
        actual: "error",
        passed: false,
        message: "Expected: success, Received: error",
      });
    });

    it("should validate body assertion with contains check", () => {
      mockJmespathSearch.mockReturnValue(["item1", "item2", "item3"]);

      const result = createMockResult(
        200,
        {},
        { items: ["item1", "item2", "item3"] }
      );

      const assertions = {
        body: {
          items: { contains: "item2" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.items.contains",
        expected: "item2",
        actual: ["item1", "item2", "item3"],
        passed: true,
        message: "OK",
      });
    });

    it("should validate failed body assertion with contains check", () => {
      mockJmespathSearch.mockReturnValue(["item1", "item3"]);

      const result = createMockResult(200, {}, { items: ["item1", "item3"] });

      const assertions = {
        body: {
          items: { contains: "item2" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.items.contains",
        expected: "item2",
        actual: ["item1", "item3"],
        passed: false,
        message: "Value does not contain: item2",
      });
    });

    it("should validate body assertion with regex pattern", () => {
      mockJmespathSearch.mockReturnValue("test@example.com");

      const result = createMockResult(200, {}, { email: "test@example.com" });

      const assertions = {
        body: {
          email: { regex: "^[^@]+@[^@]+\\.[^@]+$" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.email.regex",
        expected: "^[^@]+@[^@]+\\.[^@]+$",
        actual: "test@example.com",
        passed: true,
        message: "OK",
      });
    });

    it("should validate failed body assertion with regex pattern", () => {
      mockJmespathSearch.mockReturnValue("invalid-email");

      const result = createMockResult(200, {}, { email: "invalid-email" });

      const assertions = {
        body: {
          email: { regex: "^[^@]+@[^@]+\\.[^@]+$" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.email.regex",
        expected: "^[^@]+@[^@]+\\.[^@]+$",
        actual: "invalid-email",
        passed: false,
        message: "Value does not match pattern: ^[^@]+@[^@]+\\.[^@]+$",
      });
    });

    it("should handle complex nested body assertions", () => {
      mockJmespathSearch.mockReturnValue("John Doe");

      const result = createMockResult(
        200,
        {},
        {
          user: {
            name: "John Doe",
            age: 30,
          },
        }
      );

      const assertions = {
        body: {
          "user.name": { equals: "John Doe" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "body.user.name.equals",
        expected: "John Doe",
        actual: "John Doe",
        passed: true,
        message: "OK",
      });
    });

    it("should handle mixed assertion types", () => {
      mockJmespathSearch.mockReturnValue("OK");

      const result = createMockResult(
        200,
        {
          "content-type": "application/json",
        },
        {
          status: "OK",
        }
      );

      const assertions = {
        status_code: 200,
        headers: {
          "content-type": { equals: "application/json" },
        },
        body: {
          status: { equals: "OK" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
      expect(results[2].passed).toBe(true);
    });

    it("should handle empty assertions gracefully", () => {
      const result = createMockResult(200);
      const assertions = {};

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(0);
    });

    it("should handle missing response details", () => {
      const result: StepExecutionResult = {
        step_name: "test-step",
        status: "failure",
        duration_ms: 100,
        response_details: undefined,
      };

      const assertions = {
        status_code: 200,
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: "response",
        expected: "exists",
        actual: null,
        passed: false,
        message: "Response not available",
      });
    });

    it("should handle jmespath errors gracefully", () => {
      mockJmespathSearch.mockImplementation(() => {
        throw new Error("Invalid JMESPath expression");
      });

      const result = createMockResult(200, {}, { field: "value" });

      const assertions = {
        body: {
          "invalid[path": { equals: "value" },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        field: 'body."invalid[path"',
        expected: { equals: "value" },
        actual: undefined,
        passed: false,
        message:
          "Error evaluating JMESPath: Error: Invalid JMESPath expression",
      });
    });
  });

  describe("Preprocessamento de Asserções", () => {
    test("deve processar propriedades body.* flatten", () => {
      const assertions = {
        "body.status": "success",
        "body.user.name": "John",
        status_code: 200,
      };

      mockJmespathSearch
        .mockReturnValueOnce("success") // body.status
        .mockReturnValueOnce("John"); // body.user.name

      const result = createMockResult(
        200,
        {},
        { status: "success", user: { name: "John" } }
      );
      const results = assertionService.validateAssertions(
        assertions as any,
        result
      );

      // Deve ter convertido body.status para body: { status: { equals: "success" }}
      expect(results.some((r) => r.field.includes("body.status"))).toBe(true);
      expect(results.some((r) => r.field.includes("body.user.name"))).toBe(
        true
      );
    });

    test("deve processar propriedades headers.* flatten", () => {
      const assertions = {
        "headers.content-type": "application/json",
        "headers.authorization": "Bearer token",
      };

      const result = createMockResult(
        200,
        {
          "content-type": "application/json",
          authorization: "Bearer token",
        },
        {}
      );
      const results = assertionService.validateAssertions(
        assertions as any,
        result
      );

      expect(
        results.some((r) => r.field.includes("headers.content-type"))
      ).toBe(true);
      expect(
        results.some((r) => r.field.includes("headers.authorization"))
      ).toBe(true);
    });
  });

  describe("Funções Utilitárias", () => {
    test("contains deve funcionar com strings", () => {
      // Configure JMESPath mock to return actual value
      mockJmespathSearch.mockImplementation((data, path) => {
        if (path === "message") {
          return "operation was successful";
        }
        return undefined;
      });

      const assertions = {
        body: {
          message: { contains: "successful" },
        },
      };

      const result = createMockResult(
        200,
        {},
        { message: "operation was successful" }
      );

      const results = assertionService.validateAssertions(assertions, result);

      const containsResult = results.find(
        (r) => r.field === "body.message.contains"
      );
      expect(containsResult).toBeDefined();
      expect(containsResult?.passed).toBe(true);
    });

    test("contains deve funcionar com arrays", () => {
      // Configure JMESPath mock to return array
      mockJmespathSearch.mockImplementation((data, path) => {
        if (path === "items") {
          return ["apple", "banana", "orange"];
        }
        return undefined;
      });

      const assertions = {
        body: {
          items: { contains: "apple" },
        },
      };

      const result = createMockResult(
        200,
        {},
        { items: ["apple", "banana", "orange"] }
      );
      const results = assertionService.validateAssertions(assertions, result);

      const containsResult = results.find(
        (r) => r.field === "body.items.contains"
      );
      expect(containsResult?.passed).toBe(true);
    });

    test("contains deve funcionar com objetos", () => {
      // Configure JMESPath mock to return object
      mockJmespathSearch.mockImplementation((data, path) => {
        if (path === "data") {
          return { key1: "test_value", key2: "other" };
        }
        return undefined;
      });

      const assertions = {
        body: {
          data: { contains: "test_value" },
        },
      };

      const result = createMockResult(
        200,
        {},
        { data: { key1: "test_value", key2: "other" } }
      );
      const results = assertionService.validateAssertions(assertions, result);

      const containsResult = results.find(
        (r) => r.field === "body.data.contains"
      );
      expect(containsResult?.passed).toBe(true);
    });

    test("regex deve validar corretamente", () => {
      // Configure JMESPath mock to return string
      mockJmespathSearch.mockImplementation((data, path) => {
        if (path === "id") {
          return "12345";
        }
        return undefined;
      });

      const assertions = {
        body: {
          id: { regex: "^[0-9]+$" },
        },
      };

      const result = createMockResult(200, {}, { id: "12345" });
      const results = assertionService.validateAssertions(assertions, result);

      const regexResult = results.find((r) => r.field === "body.id.regex");
      expect(regexResult?.passed).toBe(true);
    });

    test("regex deve falhar com padrão inválido", () => {
      const assertions = {
        body: {
          id: { regex: "[invalid-regex" },
        },
      };

      const result = createMockResult(200, {}, { id: "12345" });
      const results = assertionService.validateAssertions(assertions, result);

      expect(results[0].passed).toBe(false);
    });

    test("regex deve falhar com valor não-string", () => {
      // Configure JMESPath mock to return number (non-string)
      mockJmespathSearch.mockImplementation((data, path) => {
        if (path === "id") {
          return 12345; // Number, not string
        }
        return undefined;
      });

      const assertions = {
        body: {
          id: { regex: "^[0-9]+$" },
        },
      };

      const result = createMockResult(200, {}, { id: 12345 });
      const results = assertionService.validateAssertions(assertions, result);

      expect(results[0].passed).toBe(false);
    });
  });

  describe("Advanced Assertion Types", () => {
    describe("Type Assertions", () => {
      it("should validate string type assertion", () => {
        mockJmespathSearch.mockReturnValue("hello");
        const assertions = {
          body: {
            message: { type: "string" as const },
          },
        };

        const result = createMockResult(200, {}, { message: "hello" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "body.message.type",
          expected: "string",
          actual: "string",
          passed: true,
          message: "OK",
        });
      });

      it("should validate failed type assertion", () => {
        mockJmespathSearch.mockReturnValue(123);
        const assertions = {
          body: {
            id: { type: "string" as const },
          },
        };

        const result = createMockResult(200, {}, { id: 123 });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
        expect(results[0].actual).toBe("number");
      });

      it("should validate array type assertion", () => {
        mockJmespathSearch.mockReturnValue([1, 2, 3]);
        const assertions = {
          body: {
            items: { type: "array" as const },
          },
        };

        const result = createMockResult(200, {}, { items: [1, 2, 3] });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(true);
        expect(results[0].actual).toBe("array");
      });
    });

    describe("Greater Than / Less Than Assertions", () => {
      it("should validate greater_than assertion", () => {
        mockJmespathSearch.mockReturnValue(50);
        const assertions = {
          body: {
            score: { greater_than: 30 },
          },
        };

        const result = createMockResult(200, {}, { score: 50 });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "body.score.greater_than",
          expected: "> 30",
          actual: 50,
          passed: true,
          message: "OK",
        });
      });

      it("should validate failed greater_than assertion", () => {
        mockJmespathSearch.mockReturnValue(20);
        const assertions = {
          body: {
            score: { greater_than: 30 },
          },
        };

        const result = createMockResult(200, {}, { score: 20 });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });

      it("should validate less_than assertion", () => {
        mockJmespathSearch.mockReturnValue(20);
        const assertions = {
          body: {
            score: { less_than: 30 },
          },
        };

        const result = createMockResult(200, {}, { score: 20 });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(true);
      });

      it("should handle non-numeric values in greater_than/less_than", () => {
        mockJmespathSearch.mockReturnValue("not a number");
        const assertions = {
          body: {
            value: { greater_than: 10 },
          },
        };

        const result = createMockResult(200, {}, { value: "not a number" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });
    });

    describe("Length Assertions", () => {
      it("should validate length equals assertion", () => {
        mockJmespathSearch.mockReturnValue("hello");
        const assertions = {
          body: {
            message: { length: { equals: 5 } },
          },
        };

        const result = createMockResult(200, {}, { message: "hello" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "body.message.length.equals",
          expected: 5,
          actual: 5,
          passed: true,
          message: "OK",
        });
      });

      it("should validate length greater_than assertion", () => {
        mockJmespathSearch.mockReturnValue([1, 2, 3, 4, 5]);
        const assertions = {
          body: {
            items: { length: { greater_than: 3 } },
          },
        };

        const result = createMockResult(200, {}, { items: [1, 2, 3, 4, 5] });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(true);
      });

      it("should validate length less_than assertion", () => {
        mockJmespathSearch.mockReturnValue([1, 2]);
        const assertions = {
          body: {
            items: { length: { less_than: 5 } },
          },
        };

        const result = createMockResult(200, {}, { items: [1, 2] });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(true);
      });

      it("should handle invalid length assertion on non-array/string", () => {
        mockJmespathSearch.mockReturnValue(123);
        const assertions = {
          body: {
            number: { length: { equals: 3 } },
          },
        };

        const result = createMockResult(200, {}, { number: 123 });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });
    });

    describe("Not Equals Assertions", () => {
      it("should validate not_equals assertion", () => {
        mockJmespathSearch.mockReturnValue("active");
        const assertions = {
          body: {
            status: { not_equals: "inactive" },
          },
        };

        const result = createMockResult(200, {}, { status: "active" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "body.status.not_equals",
          expected: "not inactive",
          actual: "active",
          passed: true,
          message: "OK",
        });
      });

      it("should validate failed not_equals assertion", () => {
        mockJmespathSearch.mockReturnValue("inactive");
        const assertions = {
          body: {
            status: { not_equals: "inactive" },
          },
        };

        const result = createMockResult(200, {}, { status: "inactive" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });
    });

    describe("Exists Assertions", () => {
      it("should validate exists true assertion", () => {
        mockJmespathSearch.mockReturnValue("some value");
        const assertions = {
          body: {
            field: { exists: true },
          },
        };

        const result = createMockResult(200, {}, { field: "some value" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "body.field.exists",
          expected: true,
          actual: true,
          passed: true,
          message: "OK",
        });
      });

      it("should validate exists false assertion", () => {
        mockJmespathSearch.mockReturnValue(undefined);
        const assertions = {
          body: {
            missing_field: { exists: false },
          },
        };

        const result = createMockResult(200, {}, {});
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "body.missing_field.exists",
          expected: false,
          actual: false,
          passed: true,
          message: "OK",
        });
      });

      it("should validate failed exists assertion", () => {
        mockJmespathSearch.mockReturnValue(undefined);
        const assertions = {
          body: {
            required_field: { exists: true },
          },
        };

        const result = createMockResult(200, {}, {});
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });
    });

    describe("Response Time Assertions", () => {
      it("should validate response_time_ms less_than assertion", () => {
        const result = createMockResult(200);
        result.duration_ms = 100;

        const assertions = {
          response_time_ms: { less_than: 200 },
        };

        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "response_time_ms.less_than",
          expected: 200,
          actual: 100,
          passed: true,
          message: "OK",
        });
      });

      it("should validate failed response_time_ms less_than assertion", () => {
        const result = createMockResult(200);
        result.duration_ms = 300;

        const assertions = {
          response_time_ms: { less_than: 200 },
        };

        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });

      it("should validate response_time_ms greater_than assertion", () => {
        const result = createMockResult(200);
        result.duration_ms = 150;

        const assertions = {
          response_time_ms: { greater_than: 100 },
        };

        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(true);
      });
    });

    describe("Custom Assertions", () => {
      it("should validate custom assertion with JavaScript expression", () => {
        // Setup mock data
        const assertions = {
          custom: [
            {
              name: "age_check",
              condition: "body.age > 18",
              message: "Age must be greater than 18",
            },
          ],
        };

        const result = createMockResult(200, {}, { age: 25, name: "John" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "custom.age_check",
          expected: true,
          actual: true,
          passed: true,
          message: "Age must be greater than 18",
        });
      });

      it("should validate custom assertion with $js: prefix", () => {
        const assertions = {
          custom: [
            {
              name: "age_check",
              condition: "$js: body.age > 18",
              message: "Age must be greater than 18",
            },
          ],
        };

        const result = createMockResult(200, {}, { age: 25, name: "John" });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0]).toEqual({
          field: "custom.age_check",
          expected: true,
          actual: true,
          passed: true,
          message: "Age must be greater than 18",
        });
      });

      it("should validate failed custom assertion", () => {
        const assertions = {
          custom: [
            {
              name: "age_check",
              condition: "body.age >= 18",
            },
          ],
        };

        const result = createMockResult(200, {}, { age: 16 });
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
      });

      it("should handle custom assertion with invalid JavaScript", () => {
        const assertions = {
          custom: [
            {
              name: "invalid_js",
              condition: "invalid javascript syntax +++",
            },
          ],
        };

        const result = createMockResult(200, {}, {});
        const results = assertionService.validateAssertions(assertions, result);

        expect(results[0].passed).toBe(false);
        expect(results[0].message).toContain("Error evaluating");
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle status_code as AssertionChecks object", () => {
      const result = createMockResult(200);
      const assertions = {
        status_code: { equals: 200 },
      };

      const results = assertionService.validateAssertions(assertions, result);

      expect(results[0]).toEqual({
        field: "status_code.equals",
        expected: 200,
        actual: 200,
        passed: true,
        message: "OK",
      });
    });

    it("should handle missing response_details.body", () => {
      const result = createMockResult(200);
      delete result.response_details!.body;

      const assertions = {
        body: {
          field: { exists: true },
        },
      };

      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(false);
    });

    it("should handle complex nested object equality", () => {
      mockJmespathSearch.mockReturnValue({
        user: { id: 1, profile: { name: "John", age: 30 } },
      });

      const assertions = {
        body: {
          data: {
            equals: { user: { id: 1, profile: { name: "John", age: 30 } } },
          },
        },
      };

      const result = createMockResult(
        200,
        {},
        {
          data: { user: { id: 1, profile: { name: "John", age: 30 } } },
        }
      );

      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(true);
    });

    it("should handle array equality with different types", () => {
      mockJmespathSearch.mockReturnValue([1, "2", true]);

      const assertions = {
        body: {
          mixed_array: { equals: [1, "2", true] },
        },
      };

      const result = createMockResult(
        200,
        {},
        {
          mixed_array: [1, "2", true],
        }
      );

      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(true);
    });

    it("should handle boolean to string conversion in deepEqual", () => {
      mockJmespathSearch.mockReturnValue(true);

      const assertions = {
        body: {
          flag: { equals: "true" },
        },
      };

      const result = createMockResult(200, {}, { flag: true });
      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(true);
    });

    it("should handle number to string conversion in deepEqual", () => {
      mockJmespathSearch.mockReturnValue(123);

      const assertions = {
        body: {
          id: { equals: "123" },
        },
      };

      const result = createMockResult(200, {}, { id: 123 });
      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(true);
    });

    it("should handle contains check with array haystack", () => {
      mockJmespathSearch.mockReturnValue([
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ]);

      const assertions = {
        body: {
          users: { contains: { id: 1, name: "John" } },
        },
      };

      const result = createMockResult(
        200,
        {},
        {
          users: [
            { id: 1, name: "John" },
            { id: 2, name: "Jane" },
          ],
        }
      );

      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(true);
    });

    it("should handle contains check with object haystack", () => {
      mockJmespathSearch.mockReturnValue({
        user1: { name: "John" },
        user2: { name: "Jane" },
      });

      const assertions = {
        body: {
          users: { contains: { name: "John" } },
        },
      };

      const result = createMockResult(
        200,
        {},
        {
          users: { user1: { name: "John" }, user2: { name: "Jane" } },
        }
      );

      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(true);
    });

    it("should handle different array lengths in deepEqual", () => {
      mockJmespathSearch.mockReturnValue([1, 2]);

      const assertions = {
        body: {
          numbers: { equals: [1, 2, 3] },
        },
      };

      const result = createMockResult(200, {}, { numbers: [1, 2] });
      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(false);
    });

    it("should handle objects with different key counts", () => {
      mockJmespathSearch.mockReturnValue({ a: 1 });

      const assertions = {
        body: {
          obj: { equals: { a: 1, b: 2 } },
        },
      };

      const result = createMockResult(200, {}, { obj: { a: 1 } });
      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(false);
    });

    it("should handle arrays vs objects in deepEqual", () => {
      mockJmespathSearch.mockReturnValue([1, 2, 3]);

      const assertions = {
        body: {
          data: { equals: { 0: 1, 1: 2, 2: 3 } },
        },
      };

      const result = createMockResult(200, {}, { data: [1, 2, 3] });
      const results = assertionService.validateAssertions(assertions, result);
      expect(results[0].passed).toBe(false);
    });
  });
});
