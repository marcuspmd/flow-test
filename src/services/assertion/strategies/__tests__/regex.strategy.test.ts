/**
 * @fileoverview Unit tests for RegexStrategy.
 */

import { RegexStrategy } from "../regex.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("RegexStrategy", () => {
  let strategy: RegexStrategy;

  beforeEach(() => {
    strategy = new RegexStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with regex property", () => {
      expect(strategy.canHandle({ regex: "^[a-z]+$" })).toBe(true);
    });

    it("should handle checks with pattern property", () => {
      expect(strategy.canHandle({ pattern: "\\d+" })).toBe(true);
    });

    it("should not handle checks without regex or pattern", () => {
      expect(strategy.canHandle({ equals: "test" })).toBe(false);
      expect(strategy.canHandle({ contains: "text" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    describe("valid patterns", () => {
      it("should pass for matching email pattern", () => {
        const context: AssertionContext = {
          fieldName: "body.email",
          actualValue: "test@example.com",
          expectedValue: "^[^@]+@[^@]+\\.[^@]+$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.message).toBe("OK");
      });

      it("should pass for matching alphanumeric pattern", () => {
        const context: AssertionContext = {
          fieldName: "body.username",
          actualValue: "user123",
          expectedValue: "^[a-zA-Z0-9]+$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass for digit pattern", () => {
        const context: AssertionContext = {
          fieldName: "body.code",
          actualValue: "12345",
          expectedValue: "^\\d+$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("non-matching patterns", () => {
      it("should fail for non-matching pattern", () => {
        const context: AssertionContext = {
          fieldName: "body.email",
          actualValue: "invalid-email",
          expectedValue: "^[^@]+@[^@]+\\.[^@]+$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Value does not match pattern");
      });

      it("should be case-sensitive by default", () => {
        const context: AssertionContext = {
          fieldName: "body.text",
          actualValue: "Hello",
          expectedValue: "^[a-z]+$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("special characters", () => {
      it("should handle dot in pattern", () => {
        const context: AssertionContext = {
          fieldName: "body.url",
          actualValue: "test.com",
          expectedValue: "^[a-z]+\\.[a-z]+$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should handle special regex characters", () => {
        const context: AssertionContext = {
          fieldName: "body.phone",
          actualValue: "+1-555-1234",
          expectedValue: "^\\+\\d{1}-\\d{3}-\\d{4}$",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("non-string values", () => {
      it("should fail for number values", () => {
        const context: AssertionContext = {
          fieldName: "body.id",
          actualValue: 123,
          expectedValue: "\\d+",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail for boolean values", () => {
        const context: AssertionContext = {
          fieldName: "body.flag",
          actualValue: true,
          expectedValue: "true",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail for null values", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: null,
          expectedValue: ".*",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("invalid regex patterns", () => {
      it("should handle invalid regex gracefully", () => {
        const context: AssertionContext = {
          fieldName: "body.text",
          actualValue: "test",
          expectedValue: "[invalid",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("property name tracking", () => {
      it("should use regex in field name when regex property is used", () => {
        strategy.canHandle({ regex: "test" }); // Sets lastPropertyName

        const context: AssertionContext & {
          propertyName?: "regex" | "pattern";
        } = {
          fieldName: "body.field",
          actualValue: "test",
          expectedValue: "test",
          propertyName: "regex",
        };

        const result = strategy.validate(context);

        expect(result.field).toBe("body.field.regex");
      });

      it("should use pattern in field name when pattern property is used", () => {
        strategy.canHandle({ pattern: "test" }); // Sets lastPropertyName

        const context: AssertionContext & {
          propertyName?: "regex" | "pattern";
        } = {
          fieldName: "body.field",
          actualValue: "test",
          expectedValue: "test",
          propertyName: "pattern",
        };

        const result = strategy.validate(context);

        expect(result.field).toBe("body.field.pattern");
      });
    });
  });
});
