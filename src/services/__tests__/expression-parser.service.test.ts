/**
 * @fileoverview Tests for deterministic expression parser
 */

import { ExpressionParserService, ExpressionType } from "../expression-parser.service";
import { getLogger } from "../logger.service";
import { InterpolationService } from "../interpolation.service";
import { JavaScriptService } from "../javascript.service";
import { FakerService } from "../faker.service";

describe("ExpressionParserService", () => {
  let parser: ExpressionParserService;
  let logger: any;

  beforeEach(() => {
    logger = getLogger();
    parser = new ExpressionParserService(logger);
  });

  describe("Literal Expressions", () => {
    it("should parse plain text as literal", () => {
      const result = parser.parseExpression("plain text");

      expect(result.type).toBe("literal");
      expect(result.result).toBe("plain text");
      expect(result.expression).toBe("plain text");
    });

    it("should parse numbers as strings when passed as strings", () => {
      const result = parser.parseExpression("123");

      expect(result.type).toBe("literal");
      expect(result.result).toBe("123");
    });

    it("should parse empty string as literal", () => {
      const result = parser.parseExpression("");

      expect(result.type).toBe("literal");
      expect(result.result).toBe("");
    });
  });

  describe("Template Expressions", () => {
    it("should parse template with single variable", () => {
      const result = parser.parseExpression("{{name}}", {
        variableResolver: (path) => (path === "name" ? "John" : undefined),
      });

      expect(result.type).toBe("template");
      expect(result.result).toBe("John");
    });

    it("should parse template with multiple variables", () => {
      const result = parser.parseExpression("Hello {{name}}, you have {{count}} messages", {
        variableResolver: (path) => {
          if (path === "name") return "John";
          if (path === "count") return "5";
          return undefined;
        },
      });

      expect(result.type).toBe("template");
      expect(result.result).toBe("Hello John, you have 5 messages");
    });

    it("should parse template with environment variable", () => {
      process.env.TEST_VAR = "test_value";
      
      const result = parser.parseExpression("{{$env.TEST_VAR}}");

      expect(result.type).toBe("template");
      expect(result.result).toBe("test_value");

      delete process.env.TEST_VAR;
    });

    it("should parse template with nested variables", () => {
      const result = parser.parseExpression("{{base_url}}/api/{{version}}/users", {
        variableResolver: (path) => {
          if (path === "base_url") return "https://api.example.com";
          if (path === "version") return "v1";
          return undefined;
        },
      });

      expect(result.type).toBe("template");
      expect(result.result).toBe("https://api.example.com/api/v1/users");
    });
  });

  describe("JMESPath Expressions", () => {
    it("should parse simple JMESPath query", () => {
      const context = {
        response: {
          data: [{ id: 123, name: "Test" }],
        },
      };

      const result = parser.parseExpression("@response.data[0].id", {
        jmespathContext: context,
      });

      expect(result.type).toBe("jmespath");
      expect(result.result).toBe(123);
    });

    it("should parse JMESPath with filter", () => {
      const context = {
        users: [
          { id: 1, active: true },
          { id: 2, active: false },
          { id: 3, active: true },
        ],
      };

      const result = parser.parseExpression("@users[?active]", {
        jmespathContext: context,
      });

      expect(result.type).toBe("jmespath");
      expect(result.result).toHaveLength(2);
      expect(result.result[0].id).toBe(1);
      expect(result.result[1].id).toBe(3);
    });

    it("should parse JMESPath with projection", () => {
      const context = {
        items: [{ price: 10 }, { price: 20 }, { price: 30 }],
      };

      const result = parser.parseExpression("@items[*].price", {
        jmespathContext: context,
      });

      expect(result.type).toBe("jmespath");
      expect(result.result).toEqual([10, 20, 30]);
    });

    it("should throw error for empty JMESPath expression", () => {
      expect(() => parser.parseExpression("@")).toThrow(
        "JMESPath expression cannot be empty"
      );
    });

    it("should throw error for invalid JMESPath syntax", () => {
      expect(() =>
        parser.parseExpression("@invalid[[[", { jmespathContext: {} })
      ).toThrow("Failed to parse JMESPath expression");
    });
  });

  describe("JavaScript Expressions", () => {
    it("should parse simple JavaScript expression", () => {
      const result = parser.parseExpression("$return 2 + 2");

      expect(result.type).toBe("javascript");
      expect(result.result).toBe(4);
    });

    it("should parse JavaScript expression without return keyword", () => {
      const result = parser.parseExpression("$2 + 2");

      expect(result.type).toBe("javascript");
      expect(result.result).toBe(4);
    });

    it("should parse JavaScript with variable access", () => {
      const result = parser.parseExpression("$return items.length * 2", {
        javascriptContext: {
          variables: { items: [1, 2, 3] },
        },
      });

      expect(result.type).toBe("javascript");
      expect(result.result).toBe(6);
    });

    it("should parse JavaScript with Math operations", () => {
      const result = parser.parseExpression("$Math.max(10, 20, 5)");

      expect(result.type).toBe("javascript");
      expect(result.result).toBe(20);
    });

    it("should parse JavaScript with array operations", () => {
      const result = parser.parseExpression("$[1, 2, 3].reduce((a, b) => a + b, 0)");

      expect(result.type).toBe("javascript");
      expect(result.result).toBe(6);
    });

    it("should throw error for empty JavaScript expression", () => {
      expect(() => parser.parseExpression("$")).toThrow(
        "JavaScript expression cannot be empty"
      );
    });
  });

  describe("Faker Expressions", () => {
    it("should parse simple Faker expression", () => {
      const result = parser.parseExpression("#faker.person.firstName");

      expect(result.type).toBe("faker");
      expect(result.result).toBeTruthy();
      expect(typeof result.result).toBe("string");
    });

    it("should parse Faker with method chain", () => {
      const result = parser.parseExpression("#faker.internet.email");

      expect(result.type).toBe("faker");
      expect(result.result).toContain("@");
    });

    it("should parse Faker with number generation", () => {
      const result = parser.parseExpression("#faker.number.int");

      expect(result.type).toBe("faker");
      expect(typeof result.result).toBe("number");
    });

    it("should parse Faker with UUID", () => {
      const result = parser.parseExpression("#faker.string.uuid");

      expect(result.type).toBe("faker");
      expect(result.result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe("Mixed Syntax Detection", () => {
    it("should throw error when mixing @ with #faker", () => {
      expect(() =>
        parser.parseExpression("@response.data with #faker.name")
      ).toThrow("Cannot mix prefixes");
    });

    it("should throw error when mixing $ with #faker", () => {
      expect(() => parser.parseExpression("$return #faker.name")).toThrow(
        "Cannot mix prefixes"
      );
    });

    it("should allow templates with $env and $faker", () => {
      process.env.TEST_API = "https://api.test.com";
      
      // This should work - templates can contain these
      const result = parser.parseExpression("{{$env.TEST_API}}/{{$faker.string.uuid}}");

      expect(result.type).toBe("template");
      expect(result.result).toContain("https://api.test.com/");

      delete process.env.TEST_API;
    });
  });

  describe("Ambiguity Warnings", () => {
    beforeEach(() => {
      parser.configure({ enableWarnings: true, debug: false });
      jest.spyOn(logger, "warn").mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should warn for expression that looks like JMESPath", () => {
      parser.parseExpression("response.data[0].id");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Looks like JMESPath")
      );
    });

    it("should warn for expression that looks like JavaScript", () => {
      parser.parseExpression("Math.random()");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Looks like JavaScript")
      );
    });

    it("should warn for expression that looks like Faker", () => {
      parser.parseExpression("faker.person.firstName");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Looks like Faker")
      );
    });

    it("should not warn when warnings are disabled", () => {
      parser.configure({ enableWarnings: false });
      parser.parseExpression("response.data[0].id");

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe("Debug/Trace Mode", () => {
    it("should include trace when debug is enabled", () => {
      parser.configure({ debug: true });

      const result = parser.parseExpression("Hello World");

      expect(result.trace).toBeDefined();
      expect(result.trace?.length).toBeGreaterThan(0);
      expect(result.trace?.[0]).toContain("[PARSE] Input:");
    });

    it("should not include trace when debug is disabled", () => {
      parser.configure({ debug: false });

      const result = parser.parseExpression("Hello World");

      expect(result.trace).toBeUndefined();
    });

    it("should trace Faker execution", () => {
      parser.configure({ debug: true });

      const result = parser.parseExpression("#faker.person.firstName");

      expect(result.trace).toBeDefined();
      const traceLine = result.trace?.find((line) => line.includes("[FAKER] Method:"));
      expect(traceLine).toBeDefined();
    });

    it("should trace JMESPath execution", () => {
      parser.configure({ debug: true });

      const result = parser.parseExpression("@data.id", {
        jmespathContext: { data: { id: 123 } },
      });

      expect(result.trace).toBeDefined();
      const traceLine = result.trace?.find((line) => line.includes("[JMESPATH] Query:"));
      expect(traceLine).toBeDefined();
    });
  });

  describe("parseValue", () => {
    it("should handle non-string values as literals", () => {
      expect(parser.parseValue(123).type).toBe("literal");
      expect(parser.parseValue(123).result).toBe(123);

      expect(parser.parseValue(true).type).toBe("literal");
      expect(parser.parseValue(true).result).toBe(true);

      expect(parser.parseValue(null).type).toBe("literal");
      expect(parser.parseValue(null).result).toBe(null);
    });

    it("should parse string values using parseExpression", () => {
      const result = parser.parseValue("#faker.person.firstName");

      expect(result.type).toBe("faker");
      expect(typeof result.result).toBe("string");
    });
  });

  describe("parseExpressions (batch)", () => {
    it("should parse multiple expressions", () => {
      const values = {
        literal: "hello",
        template: "{{name}}",
        faker: "#faker.person.firstName",
        js: "$return 2 + 2",
      };

      const results = parser.parseExpressions(values, {
        variableResolver: (path) => (path === "name" ? "John" : undefined),
      });

      expect(results.literal.type).toBe("literal");
      expect(results.literal.result).toBe("hello");

      expect(results.template.type).toBe("template");
      expect(results.template.result).toBe("John");

      expect(results.faker.type).toBe("faker");
      expect(typeof results.faker.result).toBe("string");

      expect(results.js.type).toBe("javascript");
      expect(results.js.result).toBe(4);
    });
  });

  describe("Determinism", () => {
    it("should always produce the same type for the same input", () => {
      const inputs = [
        "plain text",
        "{{variable}}",
        "@data.field",
        "$return x",
        "#faker.person.firstName",
      ];

      const expectedTypes: ExpressionType[] = [
        "literal",
        "template",
        "jmespath",
        "javascript",
        "faker",
      ];

      inputs.forEach((input, index) => {
        // Parse multiple times
        const result1 = parser.parseExpression(input, {
          jmespathContext: { data: { field: "value" } },
          javascriptContext: { variables: { x: 10 } },
        });
        const result2 = parser.parseExpression(input, {
          jmespathContext: { data: { field: "value" } },
          javascriptContext: { variables: { x: 10 } },
        });

        expect(result1.type).toBe(expectedTypes[index]);
        expect(result2.type).toBe(expectedTypes[index]);
        expect(result1.type).toBe(result2.type);
      });
    });
  });

  describe("getSyntaxGuide", () => {
    it("should return syntax reference guide", () => {
      const guide = ExpressionParserService.getSyntaxGuide();

      expect(guide).toContain("Texto fixo");
      expect(guide).toContain("Variável/Template");
      expect(guide).toContain("Consulta JSON");
      expect(guide).toContain("Cálculo/Lógica");
      expect(guide).toContain("Dado falso");
      expect(guide).toContain("#faker.person.fullName");
      expect(guide).toContain("@response.data[0].id");
      expect(guide).toContain("$return x * 2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle expressions with special characters", () => {
      const result = parser.parseExpression("Hello! @#$%^&*()");

      expect(result.type).toBe("literal");
      expect(result.result).toBe("Hello! @#$%^&*()");
    });

    it("should handle multiline strings", () => {
      const result = parser.parseExpression("Line 1\nLine 2\nLine 3");

      expect(result.type).toBe("literal");
      expect(result.result).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should handle Unicode characters", () => {
      const result = parser.parseExpression("Olá 世界 🌍");

      expect(result.type).toBe("literal");
      expect(result.result).toBe("Olá 世界 🌍");
    });

    it("should handle expressions starting with common prefixes in text", () => {
      // These should be literals, not special expressions
      expect(parser.parseExpression("I have $100").type).toBe("literal");
      expect(parser.parseExpression("Email me at test@example.com").type).toBe("literal");
      expect(parser.parseExpression("Use hashtag #trending").type).toBe("literal");
    });
  });

  describe("Configuration", () => {
    it("should allow configuration changes", () => {
      parser.configure({ debug: true, enableWarnings: false, strict: true });

      const result = parser.parseExpression("test");

      expect(result.trace).toBeDefined();
    });

    it("should maintain configuration across multiple calls", () => {
      parser.configure({ debug: true });

      const result1 = parser.parseExpression("test1");
      const result2 = parser.parseExpression("test2");

      expect(result1.trace).toBeDefined();
      expect(result2.trace).toBeDefined();
    });
  });
});
