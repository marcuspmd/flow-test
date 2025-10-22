/**
 * @fileoverview Unit tests for comparison strategies.
 */

import {
  GreaterThanStrategy,
  LessThanStrategy,
  GreaterThanOrEqualStrategy,
  LessThanOrEqualStrategy,
} from "../comparison.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("Comparison Strategies", () => {
  describe("GreaterThanStrategy", () => {
    let strategy: GreaterThanStrategy;

    beforeEach(() => {
      strategy = new GreaterThanStrategy();
    });

    describe("canHandle", () => {
      it("should handle checks with greater_than property", () => {
        expect(strategy.canHandle({ greater_than: 10 })).toBe(true);
      });

      it("should not handle other properties", () => {
        expect(strategy.canHandle({ less_than: 10 })).toBe(false);
        expect(strategy.canHandle({ equals: 10 })).toBe(false);
      });
    });

    describe("validate", () => {
      it("should pass when value is greater", () => {
        const context: AssertionContext = {
          fieldName: "body.age",
          actualValue: 25,
          expectedValue: 18,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.message).toBe("OK");
      });

      it("should fail when value is equal", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 10,
          expectedValue: 10,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail when value is less", () => {
        const context: AssertionContext = {
          fieldName: "body.score",
          actualValue: 5,
          expectedValue: 10,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Expected value > 10");
      });

      it("should fail for non-number values", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: "20",
          expectedValue: 10,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should handle negative numbers", () => {
        const context: AssertionContext = {
          fieldName: "body.temp",
          actualValue: 5,
          expectedValue: -10,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });
  });

  describe("LessThanStrategy", () => {
    let strategy: LessThanStrategy;

    beforeEach(() => {
      strategy = new LessThanStrategy();
    });

    describe("canHandle", () => {
      it("should handle checks with less_than property", () => {
        expect(strategy.canHandle({ less_than: 100 })).toBe(true);
      });

      it("should not handle other properties", () => {
        expect(strategy.canHandle({ greater_than: 10 })).toBe(false);
      });
    });

    describe("validate", () => {
      it("should pass when value is less", () => {
        const context: AssertionContext = {
          fieldName: "response_time_ms",
          actualValue: 500,
          expectedValue: 2000,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when value is equal", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 100,
          expectedValue: 100,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail when value is greater", () => {
        const context: AssertionContext = {
          fieldName: "body.price",
          actualValue: 150,
          expectedValue: 100,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Expected value < 100");
      });

      it("should handle decimal numbers", () => {
        const context: AssertionContext = {
          fieldName: "body.rating",
          actualValue: 4.5,
          expectedValue: 5.0,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });
  });

  describe("GreaterThanOrEqualStrategy", () => {
    let strategy: GreaterThanOrEqualStrategy;

    beforeEach(() => {
      strategy = new GreaterThanOrEqualStrategy();
    });

    describe("canHandle", () => {
      it("should handle checks with greater_than_or_equal property", () => {
        expect(strategy.canHandle({ greater_than_or_equal: 1 })).toBe(true);
      });
    });

    describe("validate", () => {
      it("should pass when value is greater", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 10,
          expectedValue: 5,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass when value is equal", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 5,
          expectedValue: 5,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when value is less", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 3,
          expectedValue: 5,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Expected value >= 5");
      });
    });
  });

  describe("LessThanOrEqualStrategy", () => {
    let strategy: LessThanOrEqualStrategy;

    beforeEach(() => {
      strategy = new LessThanOrEqualStrategy();
    });

    describe("canHandle", () => {
      it("should handle checks with less_than_or_equal property", () => {
        expect(strategy.canHandle({ less_than_or_equal: 100 })).toBe(true);
      });
    });

    describe("validate", () => {
      it("should pass when value is less", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: 50,
          expectedValue: 100,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass when value is equal", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: 100,
          expectedValue: 100,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when value is greater", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: 150,
          expectedValue: 100,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Expected value <= 100");
      });
    });
  });
});
