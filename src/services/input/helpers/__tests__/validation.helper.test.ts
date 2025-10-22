/**
 * @fileoverview Tests for validation.helper
 */

import {
  validateInput,
  evaluateValidationExpression,
} from "../validation.helper";
import type { InputConfig } from "../../../../types/engine.types";

describe("validation.helper", () => {
  describe("validateInput", () => {
    describe("required validation", () => {
      it("should pass when required field has value", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          required: true,
        };
        const result = validateInput("value", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when required field is empty string", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          required: true,
        };
        const result = validateInput("", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("This field is required");
      });

      it("should fail when required field is null", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          required: true,
        };
        const result = validateInput(null, config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("This field is required");
      });

      it("should fail when required field is undefined", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          required: true,
        };
        const result = validateInput(undefined, config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("This field is required");
      });

      it("should pass when optional field is empty", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          required: false,
        };
        const result = validateInput("", config, {});
        expect(result.valid).toBe(true);
      });
    });

    describe("string length validation", () => {
      it("should pass when string meets min_length", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: { min_length: 3 },
        };
        const result = validateInput("abc", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when string is shorter than min_length", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: { min_length: 5 },
        };
        const result = validateInput("ab", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Minimum length is 5");
      });

      it("should pass when string meets max_length", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: { max_length: 10 },
        };
        const result = validateInput("hello", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when string exceeds max_length", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: { max_length: 5 },
        };
        const result = validateInput("toolong", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Maximum length is 5");
      });
    });

    describe("pattern validation", () => {
      it("should pass when value matches pattern", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: { pattern: "^[a-z]+$" },
        };
        const result = validateInput("abc", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when value does not match pattern", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: { pattern: "^[a-z]+$" },
        };
        const result = validateInput("ABC123", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value does not match required pattern");
      });
    });

    describe("email validation", () => {
      it("should pass for valid email", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "email",
        };
        const result = validateInput("user@example.com", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail for invalid email format", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "email",
        };
        const result = validateInput("invalid-email", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid email format");
      });

      it("should fail for email without domain", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "email",
        };
        const result = validateInput("user@", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid email format");
      });
    });

    describe("URL validation", () => {
      it("should pass for valid URL", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "url",
        };
        const result = validateInput("https://example.com", config, {});
        expect(result.valid).toBe(true);
      });

      it("should pass for http URL", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "url",
        };
        const result = validateInput("http://example.com/path", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail for invalid URL", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "url",
        };
        const result = validateInput("not-a-url", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid URL format");
      });
    });

    describe("number validation", () => {
      it("should pass when number meets min", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "number",
          validation: { min: 10 },
        };
        const result = validateInput(15, config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when number is below min", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "number",
          validation: { min: 10 },
        };
        const result = validateInput(5, config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value must be at least 10");
      });

      it("should pass when number meets max", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "number",
          validation: { max: 100 },
        };
        const result = validateInput(50, config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when number exceeds max", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "number",
          validation: { max: 100 },
        };
        const result = validateInput(150, config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value must be at most 100");
      });

      it("should handle string min/max values", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "number",
          validation: { min: "10", max: "100" },
        };
        const result = validateInput(50, config, {});
        expect(result.valid).toBe(true);
      });
    });

    describe("custom validation", () => {
      it("should pass when custom validation returns true", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: {
            custom_validation: "value.length > 3",
          },
        };
        const result = validateInput("hello", config, {});
        expect(result.valid).toBe(true);
      });

      it("should fail when custom validation returns false", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: {
            custom_validation: "value.length > 10",
          },
        };
        const result = validateInput("short", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Custom validation failed");
      });

      it("should fail on custom validation error", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
          validation: {
            custom_validation: "invalid.syntax(",
          },
        };
        const result = validateInput("value", config, {});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Custom validation error");
      });
    });

    describe("no validation", () => {
      it("should pass when no validation rules provided", () => {
        const config: InputConfig = {
          variable: "test",
          prompt: "Test",
          type: "text",
        };
        const result = validateInput("any value", config, {});
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("evaluateValidationExpression", () => {
    const config: InputConfig = {
      variable: "age",
      prompt: "Enter age",
      type: "number",
    };

    describe("JMESPath expressions", () => {
      it("should pass when JMESPath condition is true", () => {
        const rule = {
          name: "Age check",
          expression: "value >= `18`",
          language: "jmespath",
        };
        const result = evaluateValidationExpression(rule, 25, config, {});
        expect(result).toBe(true);
      });

      it("should fail when JMESPath condition is false", () => {
        const rule = {
          name: "Age check",
          expression: "value >= `18`",
          language: "jmespath",
        };
        const result = evaluateValidationExpression(rule, 15, config, {});
        expect(result).toBe(false);
      });

      it("should have access to input context in JMESPath", () => {
        const rule = {
          name: "Type check",
          expression: "input.type == 'number'",
          language: "jmespath",
        };
        const result = evaluateValidationExpression(rule, 25, config, {});
        expect(result).toBe(true);
      });
    });

    describe("JavaScript expressions", () => {
      it("should pass when JavaScript condition is true", () => {
        const rule = {
          name: "Age check",
          expression: "__input_value >= 18",
          language: "javascript",
        };
        const result = evaluateValidationExpression(rule, 25, config, {});
        expect(result).toBe(true);
      });

      it("should fail when JavaScript condition is false", () => {
        const rule = {
          name: "Age check",
          expression: "__input_value >= 18",
          language: "javascript",
        };
        const result = evaluateValidationExpression(rule, 15, config, {});
        expect(result).toBe(false);
      });

      it("should default to javascript when no language specified", () => {
        const rule = {
          name: "Default check",
          expression: "__input_value > 0",
        };
        const result = evaluateValidationExpression(rule, 5, config, {});
        expect(result).toBe(true);
      });

      it("should have access to variables context", () => {
        const rule = {
          name: "Variable check",
          expression: "min_age && __input_value >= min_age",
        };
        const result = evaluateValidationExpression(rule, 25, config, {
          min_age: 18,
        });
        expect(result).toBe(true);
      });
    });

    describe("error handling", () => {
      it("should return false on JMESPath error", () => {
        const rule = {
          name: "Invalid",
          expression: "invalid[syntax",
          language: "jmespath",
        };
        const result = evaluateValidationExpression(rule, 25, config, {});
        expect(result).toBe(false);
      });

      it("should return false on JavaScript error", () => {
        const rule = {
          name: "Invalid",
          expression: "undefined.property",
          language: "javascript",
        };
        const result = evaluateValidationExpression(rule, 25, config, {});
        expect(result).toBe(false);
      });
    });
  });
});
