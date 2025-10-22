/**
 * @fileoverview Unit tests for NotEqualsStrategy.
 */

import { NotEqualsStrategy } from "../not-equals.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("NotEqualsStrategy", () => {
  let strategy: NotEqualsStrategy;

  beforeEach(() => {
    strategy = new NotEqualsStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with not_equals property", () => {
      expect(strategy.canHandle({ not_equals: 404 })).toBe(true);
      expect(strategy.canHandle({ not_equals: "error" })).toBe(true);
      expect(strategy.canHandle({ not_equals: null })).toBe(true);
    });

    it("should not handle checks without not_equals property", () => {
      expect(strategy.canHandle({ equals: "test" })).toBe(false);
      expect(strategy.canHandle({ contains: "test" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    it("should pass when values are different", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: 404,
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
      expect(result.message).toBe("OK");
    });

    it("should fail when values are equal", () => {
      const context: AssertionContext = {
        fieldName: "body.status",
        actualValue: "error",
        expectedValue: "error",
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("Value should not equal");
    });

    it("should handle type coercion", () => {
      const context: AssertionContext = {
        fieldName: "body.code",
        actualValue: 200,
        expectedValue: "404",
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
    });

    it("should detect equal values with type coercion", () => {
      const context: AssertionContext = {
        fieldName: "body.code",
        actualValue: 200,
        expectedValue: "200",
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
    });

    it("should handle null comparisons", () => {
      const context: AssertionContext = {
        fieldName: "body.deleted_at",
        actualValue: "2024-01-01",
        expectedValue: null,
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
    });

    it("should format expected value correctly", () => {
      const context: AssertionContext = {
        fieldName: "test.field",
        actualValue: "value1",
        expectedValue: "value2",
      };

      const result = strategy.validate(context);

      expect(result.expected).toBe("not value2");
    });
  });
});
