/**
 * @fileoverview Unit tests for NotEmptyStrategy.
 */

import { NotEmptyStrategy } from "../not-empty.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("NotEmptyStrategy", () => {
  let strategy: NotEmptyStrategy;

  beforeEach(() => {
    strategy = new NotEmptyStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with notEmpty property", () => {
      expect(strategy.canHandle({ notEmpty: true })).toBe(true);
      expect(strategy.canHandle({ notEmpty: false })).toBe(true);
    });

    it("should not handle checks without notEmpty property", () => {
      expect(strategy.canHandle({ exists: true })).toBe(false);
      expect(strategy.canHandle({ equals: "" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    describe("notEmpty: true", () => {
      it("should pass for non-empty string", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "hello",
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.message).toBe("OK");
      });

      it("should fail for empty string", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "",
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Value is empty");
      });

      it("should pass for non-empty array", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [1, 2, 3],
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for empty array", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [],
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should pass for non-empty object", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: { key: "value" },
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for empty object", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: {},
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail for null", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: null,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail for undefined", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: undefined,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should pass for numbers", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 0,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass for booleans", () => {
        const context: AssertionContext = {
          fieldName: "body.flag",
          actualValue: false,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("notEmpty: false", () => {
      it("should pass for empty string", () => {
        const context: AssertionContext = {
          fieldName: "body.optional",
          actualValue: "",
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for non-empty string", () => {
        const context: AssertionContext = {
          fieldName: "body.optional",
          actualValue: "data",
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Value is not empty");
      });

      it("should pass for empty array", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [],
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass for null", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: null,
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("result structure", () => {
      it("should have correct field name", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "test",
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.field).toBe("body.message.notEmpty");
      });

      it("should report actual emptiness state", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: "not empty",
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.actual).toBe(true); // not empty
      });
    });
  });
});
