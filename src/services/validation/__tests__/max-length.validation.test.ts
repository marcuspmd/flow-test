/**
 * @fileoverview Unit tests for MaxLengthValidationStrategy.
 */

import { MaxLengthValidationStrategy } from "../strategies/max-length.validation";
import { ValidationContextBuilder } from "../validation-context";

describe("MaxLengthValidationStrategy", () => {
  let strategy: MaxLengthValidationStrategy;

  beforeEach(() => {
    strategy = new MaxLengthValidationStrategy();
  });

  describe("canHandle", () => {
    it("should handle rule with max_length", () => {
      expect(strategy.canHandle({ max_length: 10 })).toBe(true);
    });

    it("should handle rule with maxLength (camelCase)", () => {
      expect(strategy.canHandle({ maxLength: 10 })).toBe(true);
    });

    it("should not handle rule without max_length", () => {
      expect(strategy.canHandle({ min_length: 5 })).toBe(false);
      expect(strategy.canHandle({ pattern: "^test$" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("priority", () => {
    it("should have medium priority (50)", () => {
      expect(strategy.priority).toBe(50);
    });
  });

  describe("validate - successful cases", () => {
    it("should pass for string below maximum length", () => {
      const context = ValidationContextBuilder.create("username", "john_doe")
        .withRule({ max_length: 20 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
      expect(result.field).toBe("username");
      expect(result.validatorName).toBe("max_length");
    });

    it("should pass for string at exact maximum length", () => {
      const context = ValidationContextBuilder.create("code", "ABC")
        .withRule({ max_length: 3 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for empty string with max_length", () => {
      const context = ValidationContextBuilder.create("optional", "")
        .withRule({ max_length: 10 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for array below maximum length", () => {
      const context = ValidationContextBuilder.create("items", [1, 2, 3])
        .withRule({ max_length: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for null value (treated as length 0)", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ max_length: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for undefined value (treated as length 0)", () => {
      const context = ValidationContextBuilder.create("field", undefined)
        .withRule({ max_length: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should support maxLength (camelCase)", () => {
      const context = ValidationContextBuilder.create("name", "John")
        .withRule({ maxLength: 10 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("validate - failure cases", () => {
    it("should fail for string exceeding maximum length", () => {
      const context = ValidationContextBuilder.create("bio", "A".repeat(500))
        .withRule({ max_length: 200 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at most 200 characters");
      expect(result.message).toContain("current: 500");
      expect(result.severity).toBe("error");
      expect(result.expected).toBe(200);
      expect(result.actual).toBe(500);
    });

    it("should fail for array exceeding maximum length", () => {
      const context = ValidationContextBuilder.create("tags", [1, 2, 3, 4, 5])
        .withRule({ max_length: 3 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at most 3 elements");
      expect(result.expected).toBe(3);
      expect(result.actual).toBe(5);
    });

    it("should use singular form for max_length = 1", () => {
      const context = ValidationContextBuilder.create("code", "AB")
        .withRule({ max_length: 1 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at most 1 character");
      expect(result.message).not.toContain("characters");
    });

    it("should fail for non-string/non-array value", () => {
      const context = ValidationContextBuilder.create("field", 12345)
        .withRule({ max_length: 10 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string or array");
      expect(result.expected).toBe("string | array");
      expect(result.actual).toBe("number");
    });

    it("should fail for object value", () => {
      const context = ValidationContextBuilder.create("field", { key: "value" })
        .withRule({ max_length: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string or array");
    });
  });

  describe("validate - configuration errors", () => {
    it("should fail for negative max_length", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ max_length: -5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid max_length configuration");
      expect(result.message).toContain("must be a positive number");
    });

    it("should fail for non-numeric max_length", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ max_length: "ten" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid max_length configuration");
    });

    it("should fail for null max_length", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ max_length: null })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid max_length configuration");
    });
  });

  describe("suggest", () => {
    it("should provide suggestion for string exceeding max length", () => {
      const context = ValidationContextBuilder.create("bio", "A".repeat(300))
        .withRule({ max_length: 200 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Shorten text to 200 characters or less");
      expect(suggestions).toContain("Remove at least 100 characters");
    });

    it("should provide suggestion for array exceeding max length", () => {
      const context = ValidationContextBuilder.create("items", [1, 2, 3, 4, 5])
        .withRule({ max_length: 3 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Reduce array to 3 elements or fewer");
      expect(suggestions).toContain("Remove at least 2 elements");
    });

    it("should provide suggestion for wrong type", () => {
      const context = ValidationContextBuilder.create("field", 123)
        .withRule({ max_length: 10 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Ensure value is a string or array");
    });

    it("should not provide suggestions for valid values", () => {
      const context = ValidationContextBuilder.create("name", "John")
        .withRule({ max_length: 10 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toHaveLength(0);
    });
  });
});
