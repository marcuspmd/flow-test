/**
 * @fileoverview Unit tests for RequiredValidationStrategy.
 */

import { RequiredValidationStrategy } from "../strategies/required.validation";
import { ValidationContextBuilder } from "../validation-context";

describe("RequiredValidationStrategy", () => {
  let strategy: RequiredValidationStrategy;

  beforeEach(() => {
    strategy = new RequiredValidationStrategy();
  });

  describe("canHandle", () => {
    it("should handle rule with required: true", () => {
      expect(strategy.canHandle({ required: true })).toBe(true);
    });

    it("should not handle rule with required: false", () => {
      expect(strategy.canHandle({ required: false })).toBe(false);
    });

    it("should not handle rule without required property", () => {
      expect(strategy.canHandle({ min_length: 5 })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("priority", () => {
    it("should have highest priority (100)", () => {
      expect(strategy.priority).toBe(100);
    });
  });

  describe("validate - successful cases", () => {
    it("should pass for non-empty string", () => {
      const context = ValidationContextBuilder.create(
        "email",
        "user@example.com"
      )
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
      expect(result.field).toBe("email");
      expect(result.validatorName).toBe("required");
    });

    it("should pass for non-empty array", () => {
      const context = ValidationContextBuilder.create("items", [1, 2, 3])
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for non-empty object", () => {
      const context = ValidationContextBuilder.create("user", {
        id: 1,
        name: "John",
      })
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for boolean true", () => {
      const context = ValidationContextBuilder.create("accepted", true)
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for boolean false when allow_false is true (default)", () => {
      const context = ValidationContextBuilder.create("flag", false)
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for number zero when allow_zero is true (default)", () => {
      const context = ValidationContextBuilder.create("count", 0)
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for positive number", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("validate - failure cases", () => {
    it("should fail for null value", () => {
      const context = ValidationContextBuilder.create("email", null)
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Field 'email' is required");
      expect(result.severity).toBe("error");
      expect(result.expected).toBe("non-null value");
      expect(result.actual).toBe("null");
    });

    it("should fail for undefined value", () => {
      const context = ValidationContextBuilder.create("email", undefined)
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Field 'email' is required");
      expect(result.actual).toBe("undefined");
    });

    it("should fail for empty string", () => {
      const context = ValidationContextBuilder.create("name", "")
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Field 'name' cannot be empty");
      expect(result.expected).toBe("non-empty value");
      expect(result.actual).toBe("empty string");
    });

    it("should fail for empty array", () => {
      const context = ValidationContextBuilder.create("items", [])
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain(
        "Field 'items' cannot be an empty array"
      );
      expect(result.expected).toBe("non-empty array");
      expect(result.actual).toBe("empty array");
    });

    it("should fail for empty object", () => {
      const context = ValidationContextBuilder.create("user", {})
        .withRule({ required: true })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain(
        "Field 'user' cannot be an empty object"
      );
      expect(result.expected).toBe("non-empty object");
      expect(result.actual).toBe("empty object");
    });

    it("should fail for false when allow_false is false", () => {
      const context = ValidationContextBuilder.create("accepted_terms", false)
        .withRule({ required: true, allow_false: false })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Field 'accepted_terms' must be true");
      expect(result.expected).toBe(true);
      expect(result.actual).toBe(false);
    });

    it("should fail for zero when allow_zero is false", () => {
      const context = ValidationContextBuilder.create("quantity", 0)
        .withRule({ required: true, allow_zero: false })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Field 'quantity' cannot be zero");
      expect(result.expected).toBe("non-zero number");
      expect(result.actual).toBe(0);
    });
  });

  describe("suggest", () => {
    it("should provide suggestion for null value", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ required: true })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Provide a value for 'field'");
    });

    it("should provide suggestion for empty string", () => {
      const context = ValidationContextBuilder.create("field", "")
        .withRule({ required: true })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Enter a non-empty value");
    });

    it("should provide suggestion for empty array", () => {
      const context = ValidationContextBuilder.create("field", [])
        .withRule({ required: true })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Add at least one item to the array");
    });

    it("should provide suggestion for false when not allowed", () => {
      const context = ValidationContextBuilder.create("accepted_terms", false)
        .withRule({ required: true, allow_false: false })
        .build();

      const suggestions = strategy.suggest(context);

      // No specific suggestion for false, returns empty array
      expect(suggestions).toEqual([]);
    });

    it("should provide suggestion for zero when not allowed", () => {
      const context = ValidationContextBuilder.create("quantity", 0)
        .withRule({ required: true, allow_zero: false })
        .build();

      const suggestions = strategy.suggest(context);

      // No specific suggestion for zero, returns empty array
      expect(suggestions).toEqual([]);
    });
  });
});
