/**
 * @fileoverview Unit tests for MinLengthValidationStrategy.
 */

import { MinLengthValidationStrategy } from "../strategies/min-length.validation";
import { ValidationContextBuilder } from "../validation-context";

describe("MinLengthValidationStrategy", () => {
  let strategy: MinLengthValidationStrategy;

  beforeEach(() => {
    strategy = new MinLengthValidationStrategy();
  });

  describe("canHandle", () => {
    it("should handle rule with min_length", () => {
      expect(strategy.canHandle({ min_length: 5 })).toBe(true);
    });

    it("should handle rule with minLength (camelCase)", () => {
      expect(strategy.canHandle({ minLength: 5 })).toBe(true);
    });

    it("should not handle rule without min_length", () => {
      expect(strategy.canHandle({ max_length: 10 })).toBe(false);
      expect(strategy.canHandle({ pattern: "^test$" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate - successful cases", () => {
    it("should pass for string meeting minimum length", () => {
      const context = ValidationContextBuilder.create("password", "Pass1234")
        .withRule({ min_length: 8 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
      expect(result.field).toBe("password");
      expect(result.validatorName).toBe("min_length");
    });

    it("should pass for string exceeding minimum length", () => {
      const context = ValidationContextBuilder.create(
        "description",
        "This is a long description"
      )
        .withRule({ min_length: 10 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for array meeting minimum length", () => {
      const context = ValidationContextBuilder.create("items", [1, 2, 3, 4, 5])
        .withRule({ min_length: 3 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for exact minimum length", () => {
      const context = ValidationContextBuilder.create("code", "ABC")
        .withRule({ min_length: 3 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for zero minimum length", () => {
      const context = ValidationContextBuilder.create("optional", "")
        .withRule({ min_length: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("validate - failure cases", () => {
    it("should fail for string below minimum length", () => {
      const context = ValidationContextBuilder.create("password", "Pass")
        .withRule({ min_length: 8 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 8 characters");
      expect(result.message).toContain("current: 4");
      expect(result.severity).toBe("error");
      expect(result.expected).toBe(8);
      expect(result.actual).toBe(4);
    });

    it("should fail for empty string when minimum required", () => {
      const context = ValidationContextBuilder.create("name", "")
        .withRule({ min_length: 1 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 1 character");
      expect(result.message).not.toContain("characters");
    });

    it("should fail for array below minimum length", () => {
      const context = ValidationContextBuilder.create("tags", ["tag1"])
        .withRule({ min_length: 3 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 3 elements");
      expect(result.actual).toBe(1);
    });

    it("should fail for null value", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ min_length: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 5 characters");
      expect(result.message).toContain("current: 0");
    });

    it("should fail for undefined value", () => {
      const context = ValidationContextBuilder.create("field", undefined)
        .withRule({ min_length: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
    });

    it("should fail for non-string/non-array value", () => {
      const context = ValidationContextBuilder.create("number_field", 12345)
        .withRule({ min_length: 3 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("string or array");
    });

    it("should fail for invalid min_length configuration", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ min_length: "invalid" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid min_length configuration");
    });

    it("should fail for negative min_length", () => {
      const context = ValidationContextBuilder.create("field", "test")
        .withRule({ min_length: -5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("positive number");
    });
  });

  describe("validate - camelCase support", () => {
    it("should work with minLength property", () => {
      const context = ValidationContextBuilder.create("username", "john")
        .withRule({ minLength: 5 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 5 characters");
    });
  });

  describe("suggest", () => {
    it("should provide suggestions for null value", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ min_length: 5 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Provide a non-empty value");
    });

    it("should provide suggestions for wrong type", () => {
      const context = ValidationContextBuilder.create("field", 123)
        .withRule({ min_length: 5 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Ensure value is a string or array");
    });

    it("should provide specific character deficit for strings", () => {
      const context = ValidationContextBuilder.create("password", "Pass")
        .withRule({ min_length: 8 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Add at least 4 more characters"),
        ])
      );
    });

    it("should provide specific element deficit for arrays", () => {
      const context = ValidationContextBuilder.create("items", [1, 2])
        .withRule({ min_length: 5 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Add at least 3 more elements"),
        ])
      );
    });

    it("should handle singular form for deficit of 1", () => {
      const context = ValidationContextBuilder.create("code", "AB")
        .withRule({ min_length: 3 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions[0]).toContain("1 more character");
      expect(suggestions[0]).not.toContain("characters");
    });
  });

  describe("metadata", () => {
    it("should have correct strategy name", () => {
      expect(strategy.name).toBe("min_length");
    });

    it("should have medium priority", () => {
      expect(strategy.priority).toBe(50);
    });
  });
});
