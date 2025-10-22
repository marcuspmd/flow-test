/**
 * @fileoverview Tests for variable masking utilities
 */

import {
  maskSensitiveVariables,
  isSensitiveVariableName,
} from "../variable-masking.utils";

describe("VariableMaskingUtils", () => {
  describe("maskSensitiveVariables", () => {
    it("should mask password variables", () => {
      const variables = {
        password: "secret123",
        user_password: "mypassword",
        api_password: "apipass",
        normal_var: "normal_value",
      };

      const result = maskSensitiveVariables(variables);

      expect(result.password).toBe("s*******3"); // "secret123" -> "s*******3" (9 chars total)
      expect(result.user_password).toBe("m********d"); // "mypassword" -> "m********d" (10 chars total)
      expect(result.api_password).toBe("a*****s"); // "apipass" -> "a*****s" (7 chars total)
      expect(result.normal_var).toBe("normal_value");
    });

    it("should mask token variables", () => {
      const variables = {
        access_token: "abc123def456",
        auth_token: "xyz789",
        bearer_token: "token123456789",
        normal_data: "some_data",
      };

      const result = maskSensitiveVariables(variables);

      expect(result.access_token).toBe("a**********6"); // "abc123def456" -> "a**********6" (12 chars)
      expect(result.auth_token).toBe("x****9"); // "xyz789" -> "x****9" (6 chars)
      expect(result.bearer_token).toBe("t************9"); // "token123456789" -> "t************9" (14 chars)
      expect(result.normal_data).toBe("some_data");
    });

    it("should mask environment variables", () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = "env_value";

      const variables = {
        TEST_VAR: "env_value",
        FLOW_TEST_API_KEY: "secret_key",
        custom_var: "custom_value",
      };

      const result = maskSensitiveVariables(variables);

      expect(result.TEST_VAR).toBe("e*******e"); // "env_value" -> "e*******e" (9 chars)
      expect(result.FLOW_TEST_API_KEY).toBe("s********y"); // "secret_key" -> "s********y" (10 chars)
      expect(result.custom_var).toBe("custom_value");

      // Cleanup
      if (originalEnv !== undefined) {
        process.env.TEST_VAR = originalEnv;
      } else {
        delete process.env.TEST_VAR;
      }
    });

    it("should mask short values appropriately", () => {
      const variables = {
        password: "ab",
        secret: "a",
        token: "",
        key: "abc",
      };

      const result = maskSensitiveVariables(variables);

      expect(result.password).toBe("***");
      expect(result.secret).toBe("***");
      expect(result.token).toBe("***");
      expect(result.key).toBe("***");
    });

    it("should mask object and array values", () => {
      const variables = {
        credentials: { user: "admin", pass: "secret" },
        tokens: ["token1", "token2", "token3"],
        normal_object: { data: "value" },
        normal_array: ["item1", "item2"],
      };

      const result = maskSensitiveVariables(variables);

      expect(result.credentials).toEqual({ user: "***", pass: "***" });
      expect(result.tokens).toEqual(["***", "***", "***"]);
      expect(result.normal_object).toEqual({ data: "value" });
      expect(result.normal_array).toEqual(["item1", "item2"]);
    });

    it("should handle null and undefined values", () => {
      const variables = {
        password: null,
        secret: undefined,
        normal_var: "value",
      };

      const result = maskSensitiveVariables(variables);

      expect(result.password).toBe("***");
      expect(result.secret).toBe("***");
      expect(result.normal_var).toBe("value");
    });

    it("should mask numeric and boolean sensitive values", () => {
      const variables = {
        api_key: 123456,
        secret_flag: true,
        normal_number: 42,
        normal_flag: false,
      };

      const result = maskSensitiveVariables(variables);

      expect(result.api_key).toBe("***");
      expect(result.secret_flag).toBe("***");
      expect(result.normal_number).toBe(42);
      expect(result.normal_flag).toBe(false);
    });
  });

  describe("isSensitiveVariableName", () => {
    it("should identify sensitive variable names", () => {
      const sensitiveNames = [
        "password",
        "PASSWORD",
        "user_password",
        "api_key",
        "API_KEY",
        "secret",
        "SECRET_TOKEN",
        "auth_token",
        "access_token",
        "bearer_token",
        "client_secret",
        "private_key",
        "sensitive_data",
        "credential",
        "passphrase",
        "username",
        "user_name",
        "email",
        "login",
        "cert",
        "pem",
      ];

      sensitiveNames.forEach((name) => {
        expect(isSensitiveVariableName(name)).toBe(true);
      });
    });

    it("should not identify normal variable names as sensitive", () => {
      const normalNames = [
        "user_id",
        "data",
        "response",
        "config",
        "status",
        "name",
        "description",
        "url",
        "port",
        "timeout",
        "version",
        "environment",
      ];

      normalNames.forEach((name) => {
        expect(isSensitiveVariableName(name)).toBe(false);
      });
    });
  });
});
