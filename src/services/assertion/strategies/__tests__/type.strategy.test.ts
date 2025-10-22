/**
 * @fileoverview Unit tests for TypeStrategy.
 */

import { TypeStrategy } from "../type.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("TypeStrategy", () => {
  let strategy: TypeStrategy;

  beforeEach(() => {
    strategy = new TypeStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with type property", () => {
      expect(strategy.canHandle({ type: "string" })).toBe(true);
      expect(strategy.canHandle({ type: "number" })).toBe(true);
      expect(strategy.canHandle({ type: "array" })).toBe(true);
    });

    it("should not handle checks without type property", () => {
      expect(strategy.canHandle({ equals: "test" })).toBe(false);
      expect(strategy.canHandle({ contains: "text" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    describe("string type", () => {
      it("should pass for string values", () => {
        const context: AssertionContext = {
          fieldName: "body.name",
          actualValue: "test",
          expectedValue: "string",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.actual).toBe("string");
      });

      it("should fail for non-string values", () => {
        const context: AssertionContext = {
          fieldName: "body.name",
          actualValue: 123,
          expectedValue: "string",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.actual).toBe("number");
      });
    });

    describe("number type", () => {
      it("should pass for number values", () => {
        const context: AssertionContext = {
          fieldName: "body.age",
          actualValue: 42,
          expectedValue: "number",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass for float values", () => {
        const context: AssertionContext = {
          fieldName: "body.price",
          actualValue: 19.99,
          expectedValue: "number",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("boolean type", () => {
      it("should pass for boolean values", () => {
        const context: AssertionContext = {
          fieldName: "body.active",
          actualValue: true,
          expectedValue: "boolean",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for non-boolean values", () => {
        const context: AssertionContext = {
          fieldName: "body.active",
          actualValue: "true",
          expectedValue: "boolean",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("array type", () => {
      it("should pass for array values", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [1, 2, 3],
          expectedValue: "array",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.actual).toBe("array");
      });

      it("should pass for empty arrays", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [],
          expectedValue: "array",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should distinguish array from object", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: { 0: "a", 1: "b" },
          expectedValue: "array",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.actual).toBe("object");
      });
    });

    describe("object type", () => {
      it("should pass for object values", () => {
        const context: AssertionContext = {
          fieldName: "body.user",
          actualValue: { id: 1, name: "John" },
          expectedValue: "object",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.actual).toBe("object");
      });

      it("should pass for empty objects", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: {},
          expectedValue: "object",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should distinguish object from array", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: [1, 2, 3],
          expectedValue: "object",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.actual).toBe("array");
      });
    });

    describe("null type", () => {
      it("should pass for null values", () => {
        const context: AssertionContext = {
          fieldName: "body.deleted_at",
          actualValue: null,
          expectedValue: "null",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.actual).toBe("null");
      });

      it("should distinguish null from undefined", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: undefined,
          expectedValue: "null",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.actual).toBe("undefined");
      });
    });

    describe("undefined type", () => {
      it("should pass for undefined values", () => {
        const context: AssertionContext = {
          fieldName: "body.optional_field",
          actualValue: undefined,
          expectedValue: "undefined",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("error messages", () => {
      it("should provide clear error message for type mismatch", () => {
        const context: AssertionContext = {
          fieldName: "body.age",
          actualValue: "42",
          expectedValue: "number",
        };

        const result = strategy.validate(context);

        expect(result.message).toContain("Expected type: number");
        expect(result.message).toContain("Received: string");
      });
    });
  });
});
