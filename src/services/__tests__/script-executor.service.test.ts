/**
 * Unit tests for ScriptExecutorService
 */

import { ScriptExecutorService } from "../script-executor.service";
import { getLogger, setupLogger } from "../logger.service";
import { ScriptConfig } from "../../types/common.types";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs");

describe("ScriptExecutorService", () => {
  let service: ScriptExecutorService;

  beforeEach(() => {
    setupLogger("console", "silent");
    const logger = getLogger();
    service = new ScriptExecutorService(logger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with logger", () => {
      expect(service).toBeInstanceOf(ScriptExecutorService);
    });
  });

  describe("executePreRequestScript", () => {
    describe("inline scripts", () => {
      it("should execute simple inline script successfully", async () => {
        const config: ScriptConfig = {
          script: "console.log('Hello World');",
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.console_output).toContain("Hello World");
        expect(result.execution_time_ms).toBeGreaterThan(0);
      });

      it("should allow script to modify request object", async () => {
        const config: ScriptConfig = {
          script: `
            request.headers = request.headers || {};
            request.headers['X-Custom-Header'] = 'test-value';
            request.url = '/modified';
          `,
        };

        const request = { method: "POST", url: "/original" };
        const result = await service.executePreRequestScript(
          config,
          {},
          request
        );

        expect(result.success).toBe(true);
        expect(result.modified_request).toBeDefined();
        expect(result.modified_request.url).toBe("/modified");
        expect(result.modified_request.headers["X-Custom-Header"]).toBe(
          "test-value"
        );
      });

      it("should capture variables set via setVariable", async () => {
        const config: ScriptConfig = {
          script: `
            setVariable('timestamp', Date.now());
            setVariable('custom_id', 'abc-123');
            setVariable('computed', 42 * 2);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables).toHaveProperty("timestamp");
        expect(result.variables.custom_id).toBe("abc-123");
        expect(result.variables.computed).toBe(84);
      });

      it("should access existing variables", async () => {
        const config: ScriptConfig = {
          script: `
            const userId = variables.user_id;
            setVariable('greeting', 'Hello user ' + userId);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          { user_id: 123 },
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables.greeting).toBe("Hello user 123");
      });

      it("should use crypto utilities", async () => {
        const config: ScriptConfig = {
          script: `
            const hash = crypto.createHash('md5').update('test').digest('hex');
            setVariable('hash', hash);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables.hash).toBe("098f6bcd4621d373cade4e832627b4f6");
      });

      it("should use Buffer utilities", async () => {
        const config: ScriptConfig = {
          script: `
            const encoded = Buffer.from('hello').toString('base64');
            setVariable('encoded', encoded);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables.encoded).toBe("aGVsbG8=");
      });

      it("should use faker utilities", async () => {
        const config: ScriptConfig = {
          script: `
            const email = faker.internet.email();
            const uuid = faker.string.uuid();
            setVariable('email', email);
            setVariable('uuid', uuid);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables.email).toMatch(/@/);
        expect(result.variables.uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
      });

      it("should use btoa helper function", async () => {
        const config: ScriptConfig = {
          script: `
            const encoded = btoa('hello');
            setVariable('encoded', encoded);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables.encoded).toBe("aGVsbG8=");
      });

      it("should use atob helper function", async () => {
        const config: ScriptConfig = {
          script: `
            const decoded = atob('aGVsbG8=');
            setVariable('decoded', decoded);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables.decoded).toBe("hello");
      });

      it("should handle script timeout", async () => {
        const config: ScriptConfig = {
          script: "while(true) {}",
          timeout: 100,
        };

        await expect(
          service.executePreRequestScript(
            config,
            {},
            { method: "GET", url: "/test" }
          )
        ).rejects.toThrow("Pre-request script execution failed");
      });

      it("should handle runtime errors", async () => {
        const config: ScriptConfig = {
          script: "throw new Error('Script error');",
        };

        await expect(
          service.executePreRequestScript(
            config,
            {},
            { method: "GET", url: "/test" }
          )
        ).rejects.toThrow("Pre-request script execution failed");
      });

      it("should continue on error when configured", async () => {
        const config: ScriptConfig = {
          script: "throw new Error('Script error');",
          continue_on_error: true,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Script error");
        expect(result.variables).toEqual({});
      });

      it("should capture console output before continuing after error", async () => {
        const config: ScriptConfig = {
          script: `
            console.log('before failure');
            throw new Error('Script failure');
          `,
          continue_on_error: true,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(false);
        expect(result.console_output).toContain("before failure");
        expect(result.error).toContain("Script failure");
      });

      it("should use default timeout when not specified", async () => {
        const config: ScriptConfig = {
          script: "setVariable('test', 'value');",
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
      });

      it("should capture console.log output", async () => {
        const config: ScriptConfig = {
          script: `
            console.log('Line 1');
            console.log('Line 2');
            console.log('Line 3');
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.console_output).toContain("Line 1");
        expect(result.console_output).toContain("Line 2");
        expect(result.console_output).toContain("Line 3");
      });

      it("should stringify complex console output", async () => {
        const config: ScriptConfig = {
          script: `
            console.log({ foo: 'bar' }, 123, false);
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.console_output).toContain('{"foo":"bar"} 123 false');
      });

      it("should clone buffers when capturing variables", async () => {
        const config: ScriptConfig = {
          script: `
            const buf = Buffer.from('hello');
            setVariable('buffer_value', buf);
            buf.write('WORLD');
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(Buffer.isBuffer(result.variables.buffer_value)).toBe(true);
        expect(result.variables.buffer_value.toString()).toBe("hello");
      });

      it("should ignore invalid variable names", async () => {
        const config: ScriptConfig = {
          script: `
            setVariable('', 'invalid');
            setVariable(undefined, 'also_invalid');
            setVariable('valid', 'stored');
          `,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        );

        expect(result.success).toBe(true);
        expect(result.variables).toHaveProperty("valid", "stored");
        expect(Object.keys(result.variables)).toEqual(["valid"]);
      });
    });

    describe("file-based scripts", () => {
      it("should load and execute script from file", async () => {
        const scriptPath = "/path/to/script.js";
        const scriptContent = "setVariable('from_file', true);";

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(scriptContent);

        const config: ScriptConfig = {
          script_file: scriptPath,
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" },
          "/suite/path.yaml"
        );

        expect(result.success).toBe(true);
        expect(result.variables.from_file).toBe(true);
      });

      it("should resolve relative script paths", async () => {
        const scriptContent = "setVariable('loaded', true);";

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(scriptContent);

        const config: ScriptConfig = {
          script_file: "./scripts/pre-request.js",
        };

        const result = await service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" },
          "/suite/test.yaml"
        );

        expect(result.success).toBe(true);
        expect(result.variables.loaded).toBe(true);
      });

      it("should throw error when script file not found", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const config: ScriptConfig = {
          script_file: "/nonexistent/script.js",
        };

        await expect(
          service.executePreRequestScript(
            config,
            {},
            { method: "GET", url: "/test" }
          )
        ).rejects.toThrow("Pre-request script execution failed");
      });

      it("should throw error when script file read fails", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error("Read error");
        });

        const config: ScriptConfig = {
          script_file: "/path/to/script.js",
        };

        await expect(
          service.executePreRequestScript(
            config,
            {},
            { method: "GET", url: "/test" }
          )
        ).rejects.toThrow("Pre-request script execution failed");
      });
    });
  });

  describe("executePostRequestScript", () => {
    describe("inline scripts", () => {
      it("should execute simple post-request script", async () => {
        const config: ScriptConfig = {
          script: "console.log('Response received');",
        };

        const response = {
          status: 200,
          status_code: 200,
          headers: {},
          body: { success: true },
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "GET", url: "/test" },
          response
        );

        expect(result.success).toBe(true);
        expect(result.console_output).toContain("Response received");
      });

      it("should access response data", async () => {
        const config: ScriptConfig = {
          script: `
            setVariable('status', response.status);
            setVariable('success', response.body.success);
            setVariable('user_id', response.body.data.id);
          `,
        };

        const response = {
          status: 201,
          status_code: 201,
          headers: { "content-type": "application/json" },
          body: { success: true, data: { id: 123, name: "Test" } },
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "POST", url: "/users" },
          response
        );

        expect(result.success).toBe(true);
        expect(result.variables.status).toBe(201);
        expect(result.variables.success).toBe(true);
        expect(result.variables.user_id).toBe(123);
      });

      it("should access request data", async () => {
        const config: ScriptConfig = {
          script: `
            setVariable('method', request.method);
            setVariable('url', request.url);
          `,
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "POST", url: "/api/test" },
          { status: 200, status_code: 200, headers: {}, body: {} }
        );

        expect(result.success).toBe(true);
        expect(result.variables.method).toBe("POST");
        expect(result.variables.url).toBe("/api/test");
      });

      it("should use crypto in post-request script", async () => {
        const config: ScriptConfig = {
          script: `
            const token = response.body.token;
            const hash = crypto.createHash('sha256').update(token).digest('hex');
            setVariable('token_hash', hash);
          `,
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "POST", url: "/login" },
          {
            status: 200,
            status_code: 200,
            headers: {},
            body: { token: "abc123" },
          }
        );

        expect(result.success).toBe(true);
        expect(result.variables.token_hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it("should handle post-request script timeout", async () => {
        const config: ScriptConfig = {
          script: "while(true) {}",
          timeout: 100,
        };

        await expect(
          service.executePostRequestScript(
            config,
            {},
            { method: "GET", url: "/test" },
            { status: 200, status_code: 200, headers: {}, body: {} }
          )
        ).rejects.toThrow("Post-request script execution failed");
      });

      it("should handle runtime errors in post-request", async () => {
        const config: ScriptConfig = {
          script: "throw new Error('Post-request error');",
        };

        await expect(
          service.executePostRequestScript(
            config,
            {},
            { method: "GET", url: "/test" },
            { status: 200, status_code: 200, headers: {}, body: {} }
          )
        ).rejects.toThrow("Post-request script execution failed");
      });

      it("should continue on error in post-request when configured", async () => {
        const config: ScriptConfig = {
          script: "throw new Error('Post-request error');",
          continue_on_error: true,
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "GET", url: "/test" },
          { status: 200, status_code: 200, headers: {}, body: {} }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Post-request error");
        expect(result.variables).toEqual({});
      });

      it("should use faker in post-request script", async () => {
        const config: ScriptConfig = {
          script: `
            const randomName = faker.person.firstName();
            setVariable('random_name', randomName);
          `,
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "GET", url: "/test" },
          { status: 200, status_code: 200, headers: {}, body: {} }
        );

        expect(result.success).toBe(true);
        expect(result.variables.random_name).toBeDefined();
        expect(typeof result.variables.random_name).toBe("string");
      });

      it("should not mutate original request object in post-request script", async () => {
        const request = { method: "GET", url: "/original" };
        const config: ScriptConfig = {
          script: `
            request.url = '/mutated';
            setVariable('changed_url', request.url);
          `,
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          request,
          { status: 200, status_code: 200, headers: {}, body: {} }
        );

        expect(result.success).toBe(true);
        expect(result.variables.changed_url).toBe("/mutated");
        expect(request.url).toBe("/original");
      });
    });

    describe("file-based scripts", () => {
      it("should load and execute post-request script from file", async () => {
        const scriptContent = `
          setVariable('status_ok', response.status === 200);
        `;

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(scriptContent);

        const config: ScriptConfig = {
          script_file: "/path/to/post-script.js",
        };

        const result = await service.executePostRequestScript(
          config,
          {},
          { method: "GET", url: "/test" },
          { status: 200, status_code: 200, headers: {}, body: {} },
          "/suite/path.yaml"
        );

        expect(result.success).toBe(true);
        expect(result.variables.status_ok).toBe(true);
      });

      it("should throw error when post-request script file is missing", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const config: ScriptConfig = {
          script_file: "/missing/post-script.js",
        };

        await expect(
          service.executePostRequestScript(
            config,
            {},
            { method: "GET", url: "/test" },
            { status: 200, status_code: 200, headers: {}, body: {} }
          )
        ).rejects.toThrow("Post-request script execution failed");
      });

      it("should throw error when post-request script file cannot be read", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error("Read error");
        });

        const config: ScriptConfig = {
          script_file: "/path/to/post-script.js",
        };

        await expect(
          service.executePostRequestScript(
            config,
            {},
            { method: "GET", url: "/test" },
            { status: 200, status_code: 200, headers: {}, body: {} }
          )
        ).rejects.toThrow("Post-request script execution failed");
      });
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle undefined script config", async () => {
      const config: ScriptConfig = {} as any;

      await expect(
        service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        )
      ).rejects.toThrow();
    });

    it("should handle complex object serialization", async () => {
      const config: ScriptConfig = {
        script: `
          setVariable('complex', {
            nested: { deep: { value: 42 } },
            array: [1, 2, 3],
            date: new Date().toISOString()
          });
        `,
      };

      const result = await service.executePreRequestScript(
        config,
        {},
        { method: "GET", url: "/test" }
      );

      expect(result.success).toBe(true);
      expect(result.variables.complex.nested.deep.value).toBe(42);
      expect(result.variables.complex.array).toEqual([1, 2, 3]);
    });

    it("should handle null and undefined values", async () => {
      const config: ScriptConfig = {
        script: `
          setVariable('null_value', null);
          setVariable('undefined_value', undefined);
        `,
      };

      const result = await service.executePreRequestScript(
        config,
        {},
        { method: "GET", url: "/test" }
      );

      expect(result.success).toBe(true);
      expect(result.variables.null_value).toBeNull();
    });

    it("should measure execution time correctly", async () => {
      const config: ScriptConfig = {
        script: `
          const start = Date.now();
          while (Date.now() - start < 50) {
            // Simulate work
          }
          setVariable('done', true);
        `,
        timeout: 1000,
      };

      const result = await service.executePreRequestScript(
        config,
        {},
        { method: "GET", url: "/test" }
      );

      expect(result.success).toBe(true);
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(50);
    });

    it("should handle scripts with syntax errors", async () => {
      const config: ScriptConfig = {
        script: "const x = {;", // Invalid syntax
      };

      await expect(
        service.executePreRequestScript(
          config,
          {},
          { method: "GET", url: "/test" }
        )
      ).rejects.toThrow();
    });

    it("should isolate script execution (no access to process)", async () => {
      const config: ScriptConfig = {
        script: `
          try {
            setVariable('has_process', typeof process !== 'undefined');
          } catch(e) {
            setVariable('has_process', false);
          }
        `,
      };

      const result = await service.executePreRequestScript(
        config,
        {},
        { method: "GET", url: "/test" }
      );

      expect(result.success).toBe(true);
      expect(result.variables.has_process).toBe(false);
    });

    it("should handle very long console output", async () => {
      const config: ScriptConfig = {
        script: `
          for (let i = 0; i < 100; i++) {
            console.log('Log line ' + i);
          }
        `,
      };

      const result = await service.executePreRequestScript(
        config,
        {},
        { method: "GET", url: "/test" }
      );

      expect(result.success).toBe(true);
      expect(result.console_output?.length).toBe(100);
    });

    it("should handle empty script", async () => {
      const config: ScriptConfig = {
        script: "",
      };

      const result = await service.executePreRequestScript(
        config,
        {},
        { method: "GET", url: "/test" }
      );

      expect(result.success).toBe(true);
      expect(result.variables).toEqual({});
    });

    it("should not modify original request object (pre-request)", async () => {
      const config: ScriptConfig = {
        script: "request.url = '/modified';",
      };

      const originalRequest = { method: "GET", url: "/original" };
      const requestCopy = { ...originalRequest };

      await service.executePreRequestScript(config, {}, requestCopy);

      // Original should remain unchanged
      expect(requestCopy.url).toBe("/original");
    });
  });
});
