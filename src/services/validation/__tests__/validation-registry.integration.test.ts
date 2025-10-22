/**
 * @fileoverview Integration tests for ValidationRegistry with basic strategies.
 */

import { ValidationRegistry } from "../validation-registry";
import { ValidationContextBuilder } from "../validation-context";
import {
  MinLengthValidationStrategy,
  MaxLengthValidationStrategy,
  PatternValidationStrategy,
  RangeValidationStrategy,
  ALL_BASIC_VALIDATION_STRATEGIES,
} from "../strategies";

describe("ValidationRegistry - Integration", () => {
  let registry: ValidationRegistry;

  beforeEach(() => {
    registry = new ValidationRegistry();
  });

  describe("registration", () => {
    it("should register individual strategies", () => {
      registry.register(new MinLengthValidationStrategy());
      registry.register(new MaxLengthValidationStrategy());

      expect(registry.count()).toBe(2);
      expect(registry.hasStrategy("min_length")).toBe(true);
      expect(registry.hasStrategy("max_length")).toBe(true);
    });

    it("should register all basic strategies at once", () => {
      ALL_BASIC_VALIDATION_STRATEGIES.forEach((Strategy) => {
        registry.register(new Strategy());
      });

      expect(registry.count()).toBe(4);
      expect(registry.getStrategyNames()).toEqual(
        expect.arrayContaining(["min_length", "max_length", "pattern", "range"])
      );
    });

    it("should sort strategies by priority", () => {
      registry.register(new MinLengthValidationStrategy()); // priority: 50
      registry.register(new PatternValidationStrategy()); // priority: 60
      registry.register(new RangeValidationStrategy()); // priority: 55

      const names = registry.getStrategyNames();
      // Pattern should be first (highest priority: 60)
      expect(names[0]).toBe("pattern");
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      ALL_BASIC_VALIDATION_STRATEGIES.forEach((Strategy) => {
        registry.register(new Strategy());
      });
    });

    it("should validate with single strategy", () => {
      const context = ValidationContextBuilder.create("password", "Pass123")
        .withRule({ min_length: 8 })
        .build();

      const result = registry.validate(context);

      expect(result.valid).toBe(false);
      expect(result.validatorName).toBe("min_length");
    });

    it("should validate with multiple strategies (validateAll)", () => {
      const context = ValidationContextBuilder.create("password", "Pass123")
        .withRule({
          min_length: 8,
          max_length: 20,
          pattern: "^[A-Za-z0-9]+$",
        })
        .build();

      const resultSet = registry.validateAll(context);

      expect(resultSet.results).toHaveLength(3);
      expect(resultSet.valid).toBe(false); // min_length failed
      expect(resultSet.errors.length).toBeGreaterThan(0);
    });

    it("should pass all validations when all rules satisfied", () => {
      const context = ValidationContextBuilder.create("username", "JohnDoe")
        .withRule({
          min_length: 5,
          max_length: 20,
          pattern: "^[A-Za-z]+$",
        })
        .build();

      const resultSet = registry.validateAll(context);

      expect(resultSet.valid).toBe(true);
      expect(resultSet.errors).toHaveLength(0);
      expect(resultSet.results.every((r) => r.valid)).toBe(true);
    });

    it("should validate multiple fields", () => {
      const validations = {
        email: ValidationContextBuilder.create("email", "user@example.com")
          .withRule({ pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" })
          .build(),
        age: ValidationContextBuilder.create("age", 25)
          .withRule({ min: 18, max: 120 })
          .build(),
      };

      const results = registry.validateMany(validations);

      expect(results.email.valid).toBe(true);
      expect(results.age.valid).toBe(true);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      registry.register(new MinLengthValidationStrategy());
    });

    it("should handle no matching strategy gracefully", () => {
      const context = ValidationContextBuilder.create("field", "value")
        .withRule({ unknown_rule: true })
        .build();

      const result = registry.validate(context);

      expect(result.valid).toBe(false);
      expect(result.severity).toBe("warning");
      expect(result.message).toContain("No validator found");
    });

    it("should handle strategy throwing error", () => {
      // Create a strategy that throws
      const badStrategy = {
        name: "bad_strategy",
        priority: 0,
        canHandle: () => true,
        validate: () => {
          throw new Error("Strategy error");
        },
      };

      registry.register(badStrategy as any);

      const context = ValidationContextBuilder.create("field", "value")
        .withRule({ any_rule: true })
        .build();

      const result = registry.validate(context);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Strategy error");
    });
  });

  describe("real-world scenarios", () => {
    beforeEach(() => {
      ALL_BASIC_VALIDATION_STRATEGIES.forEach((Strategy) => {
        registry.register(new Strategy());
      });
    });

    it("should validate password requirements", () => {
      const context = ValidationContextBuilder.create(
        "password",
        "SecurePass123"
      )
        .withRule({
          min_length: 8,
          max_length: 50,
          pattern: "^(?=.*[A-Z])(?=.*[0-9]).+$", // At least one uppercase and one digit
        })
        .build();

      const resultSet = registry.validateAll(context);

      expect(resultSet.valid).toBe(true);
    });

    it("should validate email with constraints", () => {
      const context = ValidationContextBuilder.create(
        "email",
        "user@example.com"
      )
        .withRule({
          min_length: 5,
          max_length: 100,
          pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
        })
        .build();

      const resultSet = registry.validateAll(context);

      expect(resultSet.valid).toBe(true);
    });

    it("should validate age with range", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({
          min: 18,
          max: 65,
        })
        .build();

      const result = registry.validate(context);

      expect(result.valid).toBe(true);
    });

    it("should detect multiple validation failures", () => {
      const context = ValidationContextBuilder.create("username", "ab")
        .withRule({
          min_length: 5, // Fail
          max_length: 20, // Pass
          pattern: "^[a-z]+$", // Pass
        })
        .build();

      const resultSet = registry.validateAll(context);

      expect(resultSet.valid).toBe(false);
      expect(resultSet.errors).toHaveLength(1);
      expect(resultSet.errors[0]).toContain("at least 5");
    });
  });
});
