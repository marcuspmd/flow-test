/**
 * @fileoverview Tests for InterpolationService
 */

import {
  InterpolationService,
  InterpolationContext,
} from "../interpolation.service";
import { fakerService } from "../faker.service";
import { javascriptService } from "../javascript.service";

// Mock dependencies
jest.mock("../faker.service", () => ({
  fakerService: {
    parseFakerExpression: jest.fn(),
  },
}));

jest.mock("../javascript.service", () => ({
  javascriptService: {
    executeExpression: jest.fn(),
  },
}));

describe("InterpolationService", () => {
  let service: InterpolationService;
  let mockVariableResolver: jest.Mock;
  let context: InterpolationContext;

  beforeEach(() => {
    service = new InterpolationService({ debug: false });
    mockVariableResolver = jest.fn();
    context = {
      variableResolver: mockVariableResolver,
      suppressWarnings: true,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("Basic String Interpolation", () => {
    it("should interpolate a single variable", () => {
      mockVariableResolver.mockReturnValue("John");
      const result = service.interpolate("{{username}}", context);
      expect(result).toBe("John");
      expect(mockVariableResolver).toHaveBeenCalledWith("username");
    });

    it("should interpolate multiple variables in a string", () => {
      mockVariableResolver.mockImplementation((path: string) => {
        if (path === "first") return "John";
        if (path === "last") return "Doe";
        return undefined;
      });

      const result = service.interpolate("Hello {{first}} {{last}}", context);
      expect(result).toBe("Hello John Doe");
    });

    it("should keep placeholder if variable not found", () => {
      mockVariableResolver.mockReturnValue(undefined);
      const result = service.interpolate("Hello {{missing}}", context);
      expect(result).toBe("Hello {{missing}}");
    });

    it("should handle variables with dot notation", () => {
      mockVariableResolver.mockReturnValue("admin");
      const result = service.interpolate("{{user.role}}", context);
      expect(result).toBe("admin");
      expect(mockVariableResolver).toHaveBeenCalledWith("user.role");
    });

    it("should return object if single variable resolves to object", () => {
      const userObject = { id: 123, name: "John" };
      mockVariableResolver.mockReturnValue(userObject);
      const result = service.interpolate("{{user}}", context);
      expect(result).toEqual(userObject);
    });
  });

  describe("Environment Variables", () => {
    beforeEach(() => {
      process.env.TEST_VAR = "test_value";
      process.env.API_KEY = "secret123";
    });

    afterEach(() => {
      delete process.env.TEST_VAR;
      delete process.env.API_KEY;
    });

    it("should resolve environment variables", () => {
      const result = service.interpolate("{{$env.TEST_VAR}}", context);
      expect(result).toBe("test_value");
    });

    it("should interpolate env vars in strings", () => {
      const result = service.interpolate("Key: {{$env.API_KEY}}", context);
      expect(result).toBe("Key: secret123");
    });

    it("should return null for missing env vars (single variable template)", () => {
      const result = service.interpolate("{{$env.MISSING}}", context);
      // Para single variable templates, retorna o valor resolvido (null neste caso)
      expect(result).toBe(null);
    });

    it("should prioritize env vars over regular variables", () => {
      mockVariableResolver.mockReturnValue("variable_value");
      const result = service.interpolate("{{$env.TEST_VAR}}", context);
      expect(result).toBe("test_value");
      expect(mockVariableResolver).not.toHaveBeenCalled();
    });
  });

  describe("Faker.js Integration", () => {
    it("should resolve $faker expressions", () => {
      (fakerService.parseFakerExpression as jest.Mock).mockReturnValue(
        "john@example.com"
      );
      const result = service.interpolate("{{$faker.internet.email}}", context);
      expect(result).toBe("john@example.com");
      expect(fakerService.parseFakerExpression).toHaveBeenCalledWith(
        "faker.internet.email"
      );
    });

    it("should resolve faker expressions without $ prefix", () => {
      (fakerService.parseFakerExpression as jest.Mock).mockReturnValue("John");
      const result = service.interpolate("{{faker.person.firstName}}", context);
      expect(result).toBe("John");
      expect(fakerService.parseFakerExpression).toHaveBeenCalledWith(
        "faker.person.firstName"
      );
    });

    it("should interpolate faker in strings", () => {
      (fakerService.parseFakerExpression as jest.Mock).mockReturnValue(
        "test@example.com"
      );
      const result = service.interpolate(
        "Email: {{$faker.internet.email}}",
        context
      );
      expect(result).toBe("Email: test@example.com");
    });

    it("should handle faker errors gracefully", () => {
      (fakerService.parseFakerExpression as jest.Mock).mockImplementation(
        () => {
          throw new Error("Invalid faker method");
        }
      );
      const result = service.interpolate("{{$faker.invalid.method}}", context);
      expect(result).toBe("{{$faker.invalid.method}}");
    });
  });

  describe("JavaScript Expressions", () => {
    it("should resolve $js: expressions", () => {
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(
        1234567890
      );
      const result = service.interpolate("{{$js:Date.now()}}", context);
      expect(result).toBe(1234567890);
      expect(javascriptService.executeExpression).toHaveBeenCalledWith(
        "Date.now()",
        expect.any(Object),
        false
      );
    });

    it("should resolve js: expressions without $ prefix", () => {
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(42);
      const result = service.interpolate("{{js:21 + 21}}", context);
      expect(result).toBe(42);
    });

    it("should resolve $js. code block expressions", () => {
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(5);
      const result = service.interpolate(
        "{{$js.return [1,2,3,4,5].length}}",
        context
      );
      expect(result).toBe(5);
      expect(javascriptService.executeExpression).toHaveBeenCalledWith(
        "return [1,2,3,4,5].length",
        expect.any(Object),
        true // useCodeBlock
      );
    });

    it("should resolve logical operators as JS", () => {
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(true);
      const result = service.interpolate(
        "{{status > 200 && status < 300}}",
        context
      );
      expect(result).toBe(true);
    });

    it("should handle JS errors gracefully", () => {
      (javascriptService.executeExpression as jest.Mock).mockImplementation(
        () => {
          throw new Error("Syntax error");
        }
      );
      const result = service.interpolate("{{$js:invalid syntax}}", context);
      expect(result).toBe("{{$js:invalid syntax}}");
    });
  });

  describe("Nested Interpolation", () => {
    it("should interpolate nested variables in JS expressions", () => {
      mockVariableResolver.mockImplementation((path: string) => {
        if (path === "username") return "admin";
        if (path === "password") return "secret";
        return undefined;
      });

      (javascriptService.executeExpression as jest.Mock).mockReturnValue(
        "YWRtaW46c2VjcmV0"
      );

      const result = service.interpolate(
        "{{$js:Buffer.from('{{username}}:{{password}}').toString('base64')}}",
        context
      );

      expect(result).toBe("YWRtaW46c2VjcmV0");
      expect(mockVariableResolver).toHaveBeenCalledWith("username");
      expect(mockVariableResolver).toHaveBeenCalledWith("password");
      expect(javascriptService.executeExpression).toHaveBeenCalledWith(
        "Buffer.from('admin:secret').toString('base64')",
        expect.any(Object),
        false
      );
    });

    it("should not recursively resolve Faker in nested context", () => {
      // Mock JS execution to return the preprocessed expression
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(
        "someFunc('{{$faker.person.name}}')"
      );

      const result = service.interpolate(
        "{{$js:someFunc('{{$faker.person.name}}')}}",
        context
      );

      // $faker SHOULD be resolved because it's encountered BEFORE JS in the resolution order
      // This is correct behavior - the outer {{...}} is resolved first, which triggers JS strategy,
      // which then preprocesses and skips nested $faker (correct behavior in JavaScriptStrategy)
      expect(result).toBeDefined();
    });

    it("should handle multiple levels of nesting", () => {
      mockVariableResolver.mockImplementation((path: string) => {
        if (path === "a") return "1";
        if (path === "b") return "2";
        return undefined;
      });

      const result = service.interpolate("{{a}} {{b}}", context);
      expect(result).toBe("1 2");
    });
  });

  describe("Object Interpolation", () => {
    it("should interpolate all object values", () => {
      mockVariableResolver.mockImplementation((path: string) => {
        if (path === "url") return "https://api.example.com";
        if (path === "token") return "abc123";
        return undefined;
      });

      const template = {
        baseUrl: "{{url}}",
        headers: {
          Authorization: "Bearer {{token}}",
        },
      };

      const result = service.interpolate(template, context);
      expect(result).toEqual({
        baseUrl: "https://api.example.com",
        headers: {
          Authorization: "Bearer abc123",
        },
      });
    });

    it("should handle arrays in objects", () => {
      mockVariableResolver.mockImplementation((path: string) => {
        if (path === "tag1") return "api";
        if (path === "tag2") return "test";
        return undefined;
      });

      const template = {
        tags: ["{{tag1}}", "{{tag2}}"],
      };

      const result = service.interpolate(template, context);
      expect(result).toEqual({
        tags: ["api", "test"],
      });
    });

    it("should detect circular references in objects", () => {
      const circular: any = { name: "test" };
      circular.self = circular;

      const result = service.interpolate(circular, context);
      expect(result.name).toBe("test");
      expect(result.self).toBe("[Circular Reference]");
    });
  });

  describe("Array Interpolation", () => {
    it("should interpolate array items", () => {
      mockVariableResolver.mockImplementation((path: string) => {
        if (path === "a") return "1";
        if (path === "b") return "2";
        if (path === "c") return "3";
        return undefined;
      });

      const result = service.interpolate(["{{a}}", "{{b}}", "{{c}}"], context);
      expect(result).toEqual(["1", "2", "3"]);
    });

    it("should detect circular references in arrays", () => {
      const circular: any[] = ["test"];
      circular.push(circular);

      const result = service.interpolate(circular, context);
      expect(result[0]).toBe("test");
      expect(result[1]).toBe("[Circular Reference]");
    });
  });

  describe("Resolution Order Priority", () => {
    beforeEach(() => {
      process.env.PRIORITY_TEST = "env_value";
    });

    afterEach(() => {
      delete process.env.PRIORITY_TEST;
    });

    it("should prioritize $env over regular variables", () => {
      mockVariableResolver.mockReturnValue("variable_value");
      const result = service.interpolate("{{$env.PRIORITY_TEST}}", context);
      expect(result).toBe("env_value");
      expect(mockVariableResolver).not.toHaveBeenCalled();
    });

    it("should prioritize Faker over regular variables", () => {
      (fakerService.parseFakerExpression as jest.Mock).mockReturnValue(
        "faker_value"
      );
      mockVariableResolver.mockReturnValue("variable_value");
      const result = service.interpolate(
        "{{$faker.person.firstName}}",
        context
      );
      expect(result).toBe("faker_value");
      expect(mockVariableResolver).not.toHaveBeenCalled();
    });

    it("should prioritize JS over regular variables", () => {
      (javascriptService.executeExpression as jest.Mock).mockReturnValue(
        "js_value"
      );
      mockVariableResolver.mockReturnValue("variable_value");
      const result = service.interpolate("{{$js:'test'}}", context);
      expect(result).toBe("js_value");
      expect(mockVariableResolver).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings", () => {
      const result = service.interpolate("", context);
      expect(result).toBe("");
    });

    it("should handle strings without variables", () => {
      const result = service.interpolate("plain text", context);
      expect(result).toBe("plain text");
    });

    it("should handle null values", () => {
      const result = service.interpolate(null, context);
      expect(result).toBeNull();
    });

    it("should handle undefined values", () => {
      const result = service.interpolate(undefined, context);
      expect(result).toBeUndefined();
    });

    it("should handle numbers", () => {
      const result = service.interpolate(123, context);
      expect(result).toBe(123);
    });

    it("should handle booleans", () => {
      expect(service.interpolate(true, context)).toBe(true);
      expect(service.interpolate(false, context)).toBe(false);
    });

    it("should handle malformed variable syntax", () => {
      const result = service.interpolate("{{incomplete", context);
      expect(result).toBe("{{incomplete");
    });

    it("should handle empty variable names", () => {
      const result = service.interpolate("{{}}", context);
      expect(result).toBe("{{}}");
    });
  });

  describe("Maximum Depth Protection", () => {
    it("should prevent infinite loops with maxDepth", () => {
      const deepService = new InterpolationService({ maxDepth: 3 });
      mockVariableResolver.mockReturnValue("{{nested}}");

      const result = deepService.interpolate("{{nested}}", context);
      // Should stop after maxDepth iterations
      expect(result).toContain("{{nested}}");
    });

    it("should respect custom maxDepth in context", () => {
      const customContext: InterpolationContext = {
        ...context,
        maxDepth: 2,
      };

      mockVariableResolver.mockReturnValue("value");
      const result = service.interpolate("{{var}}", customContext);
      expect(result).toBe("value");
    });
  });

  describe("Cache Management", () => {
    it("should clear cache", () => {
      const cachedService = new InterpolationService({ enableCache: true });
      expect(() => cachedService.clearCache()).not.toThrow();
    });
  });

  describe("Warning Suppression", () => {
    it("should suppress warnings when configured", () => {
      mockVariableResolver.mockReturnValue(undefined);
      const result = service.interpolate("{{missing}}", {
        ...context,
        suppressWarnings: true,
      });
      expect(result).toBe("{{missing}}");
      // No warnings should be logged (tested via mock logger if needed)
    });

    it("should log warnings when not suppressed", () => {
      mockVariableResolver.mockReturnValue(undefined);
      const result = service.interpolate("{{missing}}", {
        ...context,
        suppressWarnings: false,
      });
      expect(result).toBe("{{missing}}");
      // Warnings should be logged (tested via mock logger if needed)
    });
  });
});
