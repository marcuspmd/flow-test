/**
 * @fileoverview Unit tests for JavaScriptService
 *
 * @remarks
 * This test suite covers the JavaScriptService class which handles
 * secure JavaScript execution for dynamic expressions in tests.
 */

import {
  JavaScriptService,
  JavaScriptExecutionContext,
  JavaScriptConfig,
} from "../javascript.service";

describe("JavaScriptService", () => {
  let javascriptService: JavaScriptService;

  beforeEach(() => {
    javascriptService = new JavaScriptService();
  });

  describe("constructor", () => {
    it("should create instance with default config", () => {
      expect(javascriptService).toBeInstanceOf(JavaScriptService);
      const config = javascriptService.getConfig();
      expect(config.timeout).toBe(5000);
      expect(config.enableConsole).toBe(false);
      expect(config.maxMemory).toBe(8 * 1024 * 1024);
    });

    it("should create instance with custom config", () => {
      const customConfig: JavaScriptConfig = {
        timeout: 3000,
        enableConsole: true,
        maxMemory: 16 * 1024 * 1024,
      };

      const service = new JavaScriptService(customConfig);
      const config = service.getConfig();

      expect(config.timeout).toBe(3000);
      expect(config.enableConsole).toBe(true);
      expect(config.maxMemory).toBe(16 * 1024 * 1024);
    });
  });

  describe("getInstance (singleton)", () => {
    it("should return same instance", () => {
      const instance1 = JavaScriptService.getInstance();
      const instance2 = JavaScriptService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create instance with config on first call", () => {
      // Reset singleton for this test
      (JavaScriptService as any).instance = undefined;

      const config = { timeout: 2000 };
      const instance = JavaScriptService.getInstance(config);

      expect(instance.getConfig().timeout).toBe(2000);
    });
  });

  describe("validateExpression", () => {
    it("should validate safe expressions", () => {
      const safeExpressions = [
        "1 + 1",
        "variables.test_var",
        "response.body.user.name",
        "Math.max(1, 2, 3)",
        "JSON.stringify({test: true})",
        "new Date().getTime()",
        "(variables.count || 0) + 1",
      ];

      safeExpressions.forEach((expr) => {
        const result = javascriptService.validateExpression(expr);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    it("should reject dangerous expressions", () => {
      const dangerousExpressions = [
        { expr: "require('fs')", pattern: "require" },
        { expr: "import fs from 'fs'", pattern: "import" },
        { expr: "eval('malicious code')", pattern: "eval" },
        { expr: "new Function('return 1')()", pattern: "Function" },
        { expr: "obj.constructor", pattern: "constructor" },
        { expr: "obj.prototype.method", pattern: "prototype" },
        { expr: "obj.__proto__", pattern: "__proto__" },
        { expr: "process.exit()", pattern: "process" },
        { expr: "global.test", pattern: "global" },
        // Buffer.from() is allowed, but dangerous Buffer methods are blocked
        { expr: "Buffer.alloc(10)", pattern: "Buffer.alloc" },
        { expr: "Buffer.allocUnsafe(10)", pattern: "Buffer.allocUnsafe" },
      ];

      dangerousExpressions.forEach(({ expr, pattern }) => {
        const result = javascriptService.validateExpression(expr);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain("dangerous pattern");
      });
    });

    it("should reject overly long expressions", () => {
      const longExpression = "1 + ".repeat(500) + "1";
      const result = javascriptService.validateExpression(longExpression);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("too long");
    });

    it("should reject expressions with mismatched parentheses", () => {
      const invalidExpressions = [
        "Math.max(1, 2",
        "Math.max 1, 2)",
        "((1 + 2)",
        "(1 + 2))",
      ];

      invalidExpressions.forEach((expr) => {
        const result = javascriptService.validateExpression(expr);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain("Mismatched parentheses");
      });
    });

    it("should reject overly complex expressions", () => {
      const complexExpression = "(".repeat(25) + "1" + ")".repeat(25);
      const result = javascriptService.validateExpression(complexExpression);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("too complex");
    });
  });

  describe("parseJavaScriptExpression", () => {
    it("should parse valid JavaScript expressions", () => {
      const testCases = [
        { input: "js: 1 + 1", expected: "1 + 1" },
        { input: "js:variables.test", expected: "variables.test" },
        { input: "js:  Math.random()  ", expected: "Math.random()" },
        { input: "js: response.body.id > 0", expected: "response.body.id > 0" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = javascriptService.parseJavaScriptExpression(input);
        expect(result).toBe(expected);
      });
    });

    it("should parse expressions with $js prefix", () => {
      const result = javascriptService.parseJavaScriptExpression("$js: 1 + 2");
      expect(result).toBe("1 + 2");
    });

    it("should return null for non-JavaScript expressions", () => {
      const nonJsExpressions = [
        "regular_variable",
        "faker.name.firstName",
        "env.API_KEY",
        "javascript: not js prefix",
        "",
      ];

      nonJsExpressions.forEach((expr) => {
        const result = javascriptService.parseJavaScriptExpression(expr);
        expect(result).toBeNull();
      });
    });
  });

  describe("executeExpression", () => {
    describe("basic expressions", () => {
      it("should execute simple mathematical expressions", () => {
        expect(javascriptService.executeExpression("1 + 1")).toBe(2);
        expect(javascriptService.executeExpression("Math.max(1, 5, 3)")).toBe(
          5
        );
        expect(javascriptService.executeExpression("Math.round(3.7)")).toBe(4);
      });

      it("should execute string operations", () => {
        expect(
          javascriptService.executeExpression("'hello'.toUpperCase()")
        ).toBe("HELLO");
        expect(javascriptService.executeExpression("'test'.length")).toBe(4);
        expect(
          javascriptService.executeExpression("'a,b,c'.split(',').length")
        ).toBe(3);
      });

      it("should execute JSON operations", () => {
        const result = javascriptService.executeExpression(
          "JSON.parse('{\"test\": 123}')"
        );
        expect(result).toEqual({ test: 123 });

        expect(
          javascriptService.executeExpression("JSON.stringify({a: 1})")
        ).toBe('{"a":1}');
      });

      it("should execute date operations", () => {
        const result = javascriptService.executeExpression("Date.now() > 0");
        expect(result).toBe(true);
      });

      it("should execute array operations", () => {
        expect(javascriptService.executeExpression("[1, 2, 3].length")).toBe(3);
        expect(
          javascriptService.executeExpression(
            "[1, 2, 3].filter(x => x > 1).length"
          )
        ).toBe(2);
      });
    });

    describe("context usage", () => {
      it("should access response data", () => {
        const context: JavaScriptExecutionContext = {
          response: {
            body: { user: { id: 123, name: "John" } },
            status: 200,
            headers: { "content-type": "application/json" },
          },
        };

        expect(
          javascriptService.executeExpression("response.body.user.id", context)
        ).toBe(123);
        expect(
          javascriptService.executeExpression(
            "response.body.user.name",
            context
          )
        ).toBe("John");
        expect(
          javascriptService.executeExpression("response.status", context)
        ).toBe(200);
        expect(
          javascriptService.executeExpression(
            "response.headers['content-type']",
            context
          )
        ).toBe("application/json");
      });

      it("should access variables", () => {
        const context: JavaScriptExecutionContext = {
          variables: {
            test_var: "test_value",
            count: 5,
            api_base: "https://api.example.com",
          },
        };

        expect(
          javascriptService.executeExpression("variables.test_var", context)
        ).toBe("test_value");
        expect(
          javascriptService.executeExpression("variables.count * 2", context)
        ).toBe(10);
        expect(javascriptService.executeExpression("test_var", context)).toBe(
          "test_value"
        );
        expect(javascriptService.executeExpression("count + 1", context)).toBe(
          6
        );
      });

      it("should access captured data", () => {
        const context: JavaScriptExecutionContext = {
          captured: {
            user_id: 456,
            session_token: "abc123",
          },
        };

        expect(
          javascriptService.executeExpression("captured.user_id", context)
        ).toBe(456);
        expect(
          javascriptService.executeExpression("captured.session_token", context)
        ).toBe("abc123");
      });

      it("should access request data", () => {
        const context: JavaScriptExecutionContext = {
          request: {
            method: "POST",
            url: "/api/users",
            body: { name: "Alice" },
            headers: { authorization: "Bearer token" },
          },
        };

        expect(
          javascriptService.executeExpression("request.method", context)
        ).toBe("POST");
        expect(
          javascriptService.executeExpression("request.body.name", context)
        ).toBe("Alice");
        expect(
          javascriptService.executeExpression(
            "request.headers.authorization",
            context
          )
        ).toBe("Bearer token");
      });

      it("should access environment variables", () => {
        // Set a test environment variable
        process.env.TEST_JS_VAR = "test_env_value";

        const result = javascriptService.executeExpression("env.TEST_JS_VAR");
        expect(result).toBe("test_env_value");

        // Clean up
        delete process.env.TEST_JS_VAR;
      });

      it("should handle empty context gracefully", () => {
        expect(
          javascriptService.executeExpression("response.body || 'default'", {})
        ).toBe("default");
        expect(
          javascriptService.executeExpression("variables.missing || 42", {})
        ).toBe(42);
      });
    });

    describe("code block execution", () => {
      it("should execute code blocks", () => {
        const codeBlock = `
          var sum = 0;
          for (var i = 1; i <= 5; i++) {
            sum += i;
          }
          return sum;
        `;

        const result = javascriptService.executeExpression(codeBlock, {}, true);
        expect(result).toBe(15);
      });

      it("should execute complex logic in code blocks", () => {
        const context: JavaScriptExecutionContext = {
          variables: { items: [1, 2, 3, 4, 5] },
        };

        const codeBlock = `
          var filtered = variables.items.filter(function(item) {
            return item % 2 === 0;
          });
          return filtered.length;
        `;

        const result = javascriptService.executeExpression(
          codeBlock,
          context,
          true
        );
        expect(result).toBe(2); // Even numbers: 2, 4
      });
    });

    describe("error handling", () => {
      it("should throw error for invalid expressions", () => {
        expect(() => {
          javascriptService.executeExpression("require('fs')");
        }).toThrow("Invalid JavaScript expression");
      });

      it("should throw error for runtime errors", () => {
        expect(() => {
          javascriptService.executeExpression("unknownVariable.method()");
        }).toThrow("JavaScript execution error");
      });

      it("should handle syntax errors", () => {
        expect(() => {
          javascriptService.executeExpression("1 +");
        }).toThrow("JavaScript execution error");
      });

      it("should handle reference errors", () => {
        expect(() => {
          javascriptService.executeExpression("undefinedVariable.property");
        }).toThrow("JavaScript execution error");
      });
    });

    describe("security", () => {
      it("should not have access to dangerous globals", () => {
        // These should throw errors because the globals are removed
        expect(() => {
          javascriptService.executeExpression("process.exit()");
        }).toThrow();

        expect(() => {
          javascriptService.executeExpression("global.test");
        }).toThrow();

        // Buffer.from() is now allowed for base64 encoding
        // But dangerous Buffer methods should be blocked
        expect(() => {
          javascriptService.executeExpression("Buffer.alloc(10)");
        }).toThrow();

        expect(() => {
          javascriptService.executeExpression("Buffer.allocUnsafe(10)");
        }).toThrow();
      });

      it("should sanitize variable names", () => {
        const context: JavaScriptExecutionContext = {
          variables: {
            valid_var: "valid",
            "123invalid": "invalid",
            "with-dash": "invalid",
            "with.dot": "invalid",
          },
        };

        // Valid identifier should work
        expect(javascriptService.executeExpression("valid_var", context)).toBe(
          "valid"
        );

        // Invalid identifiers should not be available directly
        expect(() => {
          javascriptService.executeExpression("123invalid", context);
        }).toThrow();

        // But should be available through variables object
        expect(
          javascriptService.executeExpression(
            "variables['123invalid']",
            context
          )
        ).toBe("invalid");
        expect(
          javascriptService.executeExpression("variables['with-dash']", context)
        ).toBe("invalid");
      });
    });

    describe("console access", () => {
      it("should not have console access by default", () => {
        const result = javascriptService.executeExpression("typeof console");
        expect(result).toBe("undefined");
      });

      it("should have console access when enabled", () => {
        const serviceWithConsole = new JavaScriptService({
          enableConsole: true,
        });
        const result =
          serviceWithConsole.executeExpression("typeof console.log");
        expect(result).toBe("function");
      });
    });
  });

  describe("configuration management", () => {
    it("should update configuration", () => {
      const newConfig = {
        timeout: 10000,
        enableConsole: true,
      };

      javascriptService.updateConfig(newConfig);
      const config = javascriptService.getConfig();

      expect(config.timeout).toBe(10000);
      expect(config.enableConsole).toBe(true);
      expect(config.maxMemory).toBe(8 * 1024 * 1024); // Should keep original value
    });

    it("should partially update configuration", () => {
      javascriptService.updateConfig({ timeout: 7000 });
      const config = javascriptService.getConfig();

      expect(config.timeout).toBe(7000);
      expect(config.enableConsole).toBe(false); // Should keep original
    });

    it("should return immutable config copy", () => {
      const config1 = javascriptService.getConfig();
      config1.timeout = 999;

      const config2 = javascriptService.getConfig();
      expect(config2.timeout).not.toBe(999);
    });
  });

  describe("complex scenarios", () => {
    it("should handle nested object operations", () => {
      const context: JavaScriptExecutionContext = {
        response: {
          body: {
            data: {
              users: [
                { id: 1, name: "Alice", active: true },
                { id: 2, name: "Bob", active: false },
                { id: 3, name: "Charlie", active: true },
              ],
            },
          },
        },
      };

      const activeUsersCount = javascriptService.executeExpression(
        "response.body.data.users.filter(u => u.active).length",
        context
      );
      expect(activeUsersCount).toBe(2);

      const userNames = javascriptService.executeExpression(
        "response.body.data.users.map(u => u.name).join(', ')",
        context
      );
      expect(userNames).toBe("Alice, Bob, Charlie");
    });

    it("should handle conditional logic", () => {
      const context: JavaScriptExecutionContext = {
        variables: { status: "success", code: 200 },
      };

      const result = javascriptService.executeExpression(
        "variables.status === 'success' && variables.code === 200 ? 'OK' : 'Error'",
        context
      );
      expect(result).toBe("OK");
    });

    it("should handle type checking and validation", () => {
      const context: JavaScriptExecutionContext = {
        response: { body: { value: "123" } },
      };

      const isValidNumber = javascriptService.executeExpression(
        "!isNaN(parseInt(response.body.value)) && isFinite(parseInt(response.body.value))",
        context
      );
      expect(isValidNumber).toBe(true);
    });
  });
});
