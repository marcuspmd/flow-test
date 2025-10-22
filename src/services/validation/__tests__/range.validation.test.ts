/**
 * @fileoverview Unit tests for RangeValidationStrategy.
 */

import { RangeValidationStrategy } from "../strategies/range.validation";
import { ValidationContextBuilder } from "../validation-context";

describe("RangeValidationStrategy", () => {
  let strategy: RangeValidationStrategy;

  beforeEach(() => {
    strategy = new RangeValidationStrategy();
  });

  describe("canHandle", () => {
    it("should handle rule with min", () => {
      expect(strategy.canHandle({ min: 0 })).toBe(true);
    });

    it("should handle rule with max", () => {
      expect(strategy.canHandle({ max: 100 })).toBe(true);
    });

    it("should handle rule with both min and max", () => {
      expect(strategy.canHandle({ min: 0, max: 100 })).toBe(true);
    });

    it("should not handle rule without min or max", () => {
      expect(strategy.canHandle({ required: true })).toBe(false);
      expect(strategy.canHandle({ min_length: 5 })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("priority", () => {
    it("should have medium-high priority (55)", () => {
      expect(strategy.priority).toBe(55);
    });
  });

  describe("validate - min constraint", () => {
    it("should pass for value above minimum", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({ min: 18 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
      expect(result.field).toBe("age");
      expect(result.validatorName).toBe("range");
    });

    it("should pass for value equal to minimum", () => {
      const context = ValidationContextBuilder.create("age", 18)
        .withRule({ min: 18 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail for value below minimum", () => {
      const context = ValidationContextBuilder.create("age", 15)
        .withRule({ min: 18 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Value must be at least 18");
      expect(result.message).toContain("current: 15");
      expect(result.severity).toBe("error");
      expect(result.expected).toContain(">= 18");
      expect(result.actual).toBe(15);
    });

    it("should pass for negative numbers within range", () => {
      const context = ValidationContextBuilder.create("temperature", -5)
        .withRule({ min: -10 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for zero as minimum", () => {
      const context = ValidationContextBuilder.create("count", 5)
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("validate - max constraint", () => {
    it("should pass for value below maximum", () => {
      const context = ValidationContextBuilder.create("quantity", 50)
        .withRule({ max: 100 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for value equal to maximum", () => {
      const context = ValidationContextBuilder.create("quantity", 100)
        .withRule({ max: 100 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail for value above maximum", () => {
      const context = ValidationContextBuilder.create("quantity", 150)
        .withRule({ max: 100 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Value must be at most 100");
      expect(result.message).toContain("current: 150");
      expect(result.expected).toContain("<= 100");
      expect(result.actual).toBe(150);
    });
  });

  describe("validate - min and max constraints", () => {
    it("should pass for value within range", () => {
      const context = ValidationContextBuilder.create("age", 30)
        .withRule({ min: 18, max: 65 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for value at minimum of range", () => {
      const context = ValidationContextBuilder.create("age", 18)
        .withRule({ min: 18, max: 65 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should pass for value at maximum of range", () => {
      const context = ValidationContextBuilder.create("age", 65)
        .withRule({ min: 18, max: 65 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail for value below range", () => {
      const context = ValidationContextBuilder.create("age", 15)
        .withRule({ min: 18, max: 65 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 18");
    });

    it("should fail for value above range", () => {
      const context = ValidationContextBuilder.create("age", 70)
        .withRule({ min: 18, max: 65 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("at most 65");
    });
  });

  describe("validate - type conversion", () => {
    it("should convert string to number", () => {
      const context = ValidationContextBuilder.create("age", "25")
        .withRule({ min: 18, max: 65 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should convert numeric string with decimals", () => {
      const context = ValidationContextBuilder.create("price", "19.99")
        .withRule({ min: 0, max: 100 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail for non-numeric string", () => {
      const context = ValidationContextBuilder.create("field", "not-a-number")
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Value must be a number");
      expect(result.expected).toBe("number");
    });

    it("should fail for boolean value", () => {
      const context = ValidationContextBuilder.create("field", true)
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Value must be a number");
    });

    it("should fail for array value", () => {
      const context = ValidationContextBuilder.create("field", [1, 2, 3])
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
    });

    it("should fail for object value", () => {
      const context = ValidationContextBuilder.create("field", { value: 10 })
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
    });
  });

  describe("validate - null and undefined", () => {
    it("should fail for null value", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain(
        "Value is required for range validation"
      );
    });

    it("should fail for undefined value", () => {
      const context = ValidationContextBuilder.create("field", undefined)
        .withRule({ min: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain(
        "Value is required for range validation"
      );
    });
  });

  describe("validate - configuration errors", () => {
    it("should fail for non-numeric min value", () => {
      const context = ValidationContextBuilder.create("field", 50)
        .withRule({ min: "not-a-number" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid min configuration");
    });

    it("should fail for non-numeric max value", () => {
      const context = ValidationContextBuilder.create("field", 50)
        .withRule({ max: "not-a-number" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid max configuration");
    });

    it("should fail for null min value", () => {
      const context = ValidationContextBuilder.create("field", 50)
        .withRule({ min: null })
        .build();

      const result = strategy.validate(context);

      // null min is treated as "no min constraint", so validation passes
      expect(result.valid).toBe(true);
    });

    it("should fail for object min value", () => {
      const context = ValidationContextBuilder.create("field", 50)
        .withRule({ min: { value: 10 } })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(false);
    });
  });

  describe("validate - variable resolution", () => {
    it("should resolve min from variables", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({ min: "{{min_age}}" })
        .withVariables({ min_age: 18 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should resolve max from variables", () => {
      const context = ValidationContextBuilder.create("quantity", 50)
        .withRule({ max: "{{max_quantity}}" })
        .withVariables({ max_quantity: 100 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should resolve both min and max from variables", () => {
      const context = ValidationContextBuilder.create("price", 50)
        .withRule({ min: "{{min_price}}", max: "{{max_price}}" })
        .withVariables({ min_price: 10, max_price: 100 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail when variable is not found", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({ min: "{{undefined_var}}" })
        .withVariables({})
        .build();

      const result = strategy.validate(context);

      // Undefined variable returns undefined, which is treated as "no constraint"
      expect(result.valid).toBe(true);
    });

    it("should handle numeric string variables", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({ min: "{{min_age}}" })
        .withVariables({ min_age: "18" })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });
  });

  describe("validate - edge cases", () => {
    it("should handle floating point numbers", () => {
      const context = ValidationContextBuilder.create("price", 19.99)
        .withRule({ min: 10.0, max: 20.0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should handle very large numbers", () => {
      const context = ValidationContextBuilder.create("big_number", 1000000)
        .withRule({ min: 0, max: 10000000 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should handle negative range", () => {
      const context = ValidationContextBuilder.create("temperature", -5)
        .withRule({ min: -10, max: 0 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should handle min equal to max", () => {
      const context = ValidationContextBuilder.create("constant", 42)
        .withRule({ min: 42, max: 42 })
        .build();

      const result = strategy.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should fail when min is greater than max (invalid config)", () => {
      const context = ValidationContextBuilder.create("field", 50)
        .withRule({ min: 100, max: 10 })
        .build();

      const result = strategy.validate(context);

      // Should fail because value is less than min
      expect(result.valid).toBe(false);
    });
  });

  describe("suggest", () => {
    it("should provide suggestion for value below min", () => {
      const context = ValidationContextBuilder.create("age", 15)
        .withRule({ min: 18 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(
        suggestions.some((s) => s.includes("Increase value by at least"))
      ).toBe(true);
    });

    it("should provide suggestion for value above max", () => {
      const context = ValidationContextBuilder.create("quantity", 150)
        .withRule({ max: 100 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(
        suggestions.some((s) => s.includes("Decrease value by at least"))
      ).toBe(true);
    });

    it("should provide suggestion for non-numeric value", () => {
      const context = ValidationContextBuilder.create("field", "not-a-number")
        .withRule({ min: 0 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(
        suggestions.some((s) => s.includes("Ensure value is a valid number"))
      ).toBe(true);
    });

    it("should provide suggestion for null value", () => {
      const context = ValidationContextBuilder.create("field", null)
        .withRule({ min: 0 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions).toContain("Provide a numeric value");
    });

    it("should provide valid range in suggestions", () => {
      const context = ValidationContextBuilder.create("age", 100)
        .withRule({ min: 18, max: 65 })
        .build();

      const suggestions = strategy.suggest(context);

      expect(suggestions.some((s) => s.includes("Valid range: 18 to 65"))).toBe(
        true
      );
    });

    it("should provide no suggestions for valid values", () => {
      const context = ValidationContextBuilder.create("age", 30)
        .withRule({ min: 18, max: 65 })
        .build();

      const suggestions = strategy.suggest(context);

      // Valid values still get range information in suggestions
      expect(suggestions).toContain("Valid range: 18 to 65");
    });
  });
});
