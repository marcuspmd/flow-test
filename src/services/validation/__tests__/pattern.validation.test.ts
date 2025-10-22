/**
 * @fileoverview Unit tests for PatternValidationStrategy.
 */

import { PatternValidationStrategy } from "../strategies/pattern.validation";
import { ValidationContextBuilder } from "../validation-context";

describe("PatternValidationStrategy", () => {
  let strategy: PatternValidationStrategy;

  beforeEach(() => {
    strategy = new PatternValidationStrategy();
  });

  describe("canHandle", () => {
    it("should handle rule with pattern", () => {
      expect(strategy.canHandle({ pattern: "^test$" })).toBe(true);
    });

    it("should handle rule with regex", () => {
      expect(strategy.canHandle({ regex: "^test$" })).toBe(true);
    });

    it("should not handle rule without pattern or regex", () => {
      expect(strategy.canHandle({ min_length: 5 })).toBe(false);
      expect(strategy.canHandle({ required: true })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("priority", () => {
    it("should have high priority (60)", () => {
      expect(strategy.priority).toBe(60);
    });
  });

  describe("validate - successful cases", () => {
    it("should pass for value matching simple pattern", () => {
      const context = ValidationContextBuilder.create("code", "ABC123")
        .withRule({ pattern: "^[A-Z0-9]+$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
      expect(result.field).toBe("code");
      expect(result.validatorName).toBe("pattern");
    });

    it("should pass for email matching pattern", () => {
      const context = ValidationContextBuilder.create(
        "email",
        "user@example.com"
      )
        .withRule({ pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for phone number matching E.164 format", () => {
      const context = ValidationContextBuilder.create("phone", "+1234567890")
        .withRule({ regex: "^\\+?[1-9]\\d{1,14}$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for pattern with flags (case insensitive)", () => {
      const context = ValidationContextBuilder.create("name", "john")
        .withRule({ pattern: "/^JOHN$/i" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for pattern with multiline flag", () => {
      const context = ValidationContextBuilder.create("text", "line1\nline2")
        .withRule({ pattern: "/^line1$/m" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for numeric string matching digit pattern", () => {
      const context = ValidationContextBuilder.create("zip", "12345")
        .withRule({ pattern: "^\\d{5}$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should convert non-string values to string", () => {
      const context = ValidationContextBuilder.create("id", 12345)
        .withRule({ pattern: "^\\d+$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("validate - failure cases", () => {
    it("should fail for value not matching pattern", () => {
      const context = ValidationContextBuilder.create("code", "abc123")
        .withRule({ pattern: "^[A-Z]+$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("does not match required pattern");
      expect(result.severity).toBe("error");
      expect(result.expected).toContain("^[A-Z]+$");
    });

    it("should fail for invalid email format", () => {
      const context = ValidationContextBuilder.create("email", "invalid-email")
        .withRule({ pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("does not match required pattern");
    });

    it("should fail for null value", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ pattern: "^test$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain(
        "Value is required for pattern validation"
      );
    });

    it("should fail for undefined value", () => {
      const context = ValidationContextBuilder.create("field", undefined)
        .withRule({ pattern: "^test$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain(
        "Value is required for pattern validation"
      );
    });

    it("should fail for empty string", () => {
      const context = ValidationContextBuilder.create("field", "")
        .withRule({ pattern: "^.+$" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
    });
  });

  describe("validate - configuration errors", () => {
    it("should fail for empty pattern string", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ pattern: "" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid pattern configuration");
      expect(result.message).toContain("must be a non-empty string");
    });

    it("should fail for non-string pattern", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ pattern: 123 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid pattern configuration");
    });

    it("should fail for null pattern", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ pattern: null })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid pattern configuration");
    });

    it("should fail for invalid regex syntax", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ pattern: "[invalid(" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid regular expression");
    });

    it("should fail for regex with invalid flags", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ pattern: "/test/x" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      // Invalid flags may be accepted by RegExp constructor in some Node versions
      // So we just check it returns a result
      expect(result).toBeDefined();
    });
  });

  describe("validate - complex patterns", () => {
    it("should validate UUID pattern", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      const context = ValidationContextBuilder.create("uuid", validUUID)
        .withRule({
          pattern:
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail for invalid UUID", () => {
      const invalidUUID = "not-a-uuid";
      const context = ValidationContextBuilder.create("uuid", invalidUUID)
        .withRule({
          pattern:
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
    });

    it("should validate URL pattern", () => {
      const validURL = "https://example.com/path?query=value";
      const context = ValidationContextBuilder.create("url", validURL)
        .withRule({
          pattern:
            "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b",
        })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should validate ISO date pattern", () => {
      const isoDate = "2024-01-15T10:30:00.000Z";
      const context = ValidationContextBuilder.create("date", isoDate)
        .withRule({ pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("suggest", () => {
    it("should provide suggestion for pattern mismatch", () => {
      const context = ValidationContextBuilder.create("code", "abc123")
        .withRule({ pattern: "^[A-Z]+$" })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain(
        "Ensure value contains only allowed characters"
      );
    });

    it("should provide suggestion for null/undefined", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ pattern: "^test$" })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Provide a non-null value");
    });

    it("should provide example for common patterns - email", () => {
      const context = ValidationContextBuilder.create("email", "invalid")
        .withRule({ pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions.some((s) => s.includes("email"))).toBe(true);
    });
  });
});
