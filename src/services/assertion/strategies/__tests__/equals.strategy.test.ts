/**
 * @fileoverview Unit tests for EqualsStrategy.
 */

import { EqualsStrategy } from "../equals.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("EqualsStrategy", () => {
  let strategy: EqualsStrategy;

  beforeEach(() => {
    strategy = new EqualsStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with equals property", () => {
      expect(strategy.canHandle({ equals: 200 })).toBe(true);
      expect(strategy.canHandle({ equals: "test" })).toBe(true);
      expect(strategy.canHandle({ equals: null })).toBe(true);
    });

    it("should not handle checks without equals property", () => {
      expect(strategy.canHandle({ contains: "test" })).toBe(false);
      expect(strategy.canHandle({ greater_than: 10 })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    describe("primitive types", () => {
      it("should pass for equal numbers", () => {
        const context: AssertionContext = {
          fieldName: "status_code",
          actualValue: 200,
          expectedValue: 200,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.field).toBe("status_code.equals");
        expect(result.message).toBe("OK");
        expect(result.expected).toBe(200);
        expect(result.actual).toBe(200);
      });

      it("should fail for different numbers", () => {
        const context: AssertionContext = {
          fieldName: "status_code",
          actualValue: 404,
          expectedValue: 200,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Expected: 200");
        expect(result.message).toContain("Received: 404");
      });

      it("should pass for equal strings", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "success",
          expectedValue: "success",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.field).toBe("body.message.equals");
      });

      it("should pass for equal booleans", () => {
        const context: AssertionContext = {
          fieldName: "body.active",
          actualValue: true,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("type coercion", () => {
      it("should coerce number to string", () => {
        const context: AssertionContext = {
          fieldName: "body.code",
          actualValue: 200,
          expectedValue: "200",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should coerce string to number", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: "123",
          expectedValue: 123,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should coerce boolean to string", () => {
        const context: AssertionContext = {
          fieldName: "body.flag",
          actualValue: true,
          expectedValue: "true",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("objects", () => {
      it("should pass for equal objects", () => {
        const context: AssertionContext = {
          fieldName: "body.user",
          actualValue: { id: 1, name: "John" },
          expectedValue: { id: 1, name: "John" },
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for different objects", () => {
        const context: AssertionContext = {
          fieldName: "body.user",
          actualValue: { id: 1, name: "John" },
          expectedValue: { id: 2, name: "Jane" },
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should handle nested objects", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: { user: { profile: { age: 30 } } },
          expectedValue: { user: { profile: { age: 30 } } },
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("arrays", () => {
      it("should pass for equal arrays", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [1, 2, 3],
          expectedValue: [1, 2, 3],
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for different arrays", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [1, 2, 3],
          expectedValue: [1, 2, 4],
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail for arrays with different lengths", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [1, 2],
          expectedValue: [1, 2, 3],
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("null and undefined", () => {
      it("should pass for null equals null", () => {
        const context: AssertionContext = {
          fieldName: "body.deleted_at",
          actualValue: null,
          expectedValue: null,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for null vs undefined", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: null,
          expectedValue: undefined,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("result structure", () => {
      it("should include all required fields", () => {
        const context: AssertionContext = {
          fieldName: "test.field",
          actualValue: "value",
          expectedValue: "value",
        };

        const result = strategy.validate(context);

        expect(result).toHaveProperty("field");
        expect(result).toHaveProperty("expected");
        expect(result).toHaveProperty("actual");
        expect(result).toHaveProperty("passed");
        expect(result).toHaveProperty("message");
      });

      it("should format field name correctly", () => {
        const context: AssertionContext = {
          fieldName: "body.user.id",
          actualValue: 123,
          expectedValue: 123,
        };

        const result = strategy.validate(context);

        expect(result.field).toBe("body.user.id.equals");
      });
    });
  });

  describe("name property", () => {
    it("should have correct strategy name", () => {
      expect(strategy.name).toBe("equals");
    });
  });
});
