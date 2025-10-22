/**
 * @fileoverview Unit tests for ExistsStrategy.
 */

import { ExistsStrategy } from "../exists.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("ExistsStrategy", () => {
  let strategy: ExistsStrategy;

  beforeEach(() => {
    strategy = new ExistsStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with exists property", () => {
      expect(strategy.canHandle({ exists: true })).toBe(true);
      expect(strategy.canHandle({ exists: false })).toBe(true);
    });

    it("should not handle checks without exists property", () => {
      expect(strategy.canHandle({ equals: "test" })).toBe(false);
      expect(strategy.canHandle({ type: "string" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    describe("exists: true", () => {
      it("should pass when value exists", () => {
        const context: AssertionContext = {
          fieldName: "body.token",
          actualValue: "abc123",
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.message).toBe("OK");
        expect(result.actual).toBe(true);
      });

      it("should pass for empty string", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: "",
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass for zero", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 0,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should pass for false", () => {
        const context: AssertionContext = {
          fieldName: "body.flag",
          actualValue: false,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when value is null", () => {
        const context: AssertionContext = {
          fieldName: "body.deleted_at",
          actualValue: null,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toBe("Field does not exist");
      });

      it("should fail when value is undefined", () => {
        const context: AssertionContext = {
          fieldName: "body.optional",
          actualValue: undefined,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("exists: false", () => {
      it("should pass when value is null", () => {
        const context: AssertionContext = {
          fieldName: "body.deleted_at",
          actualValue: null,
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.actual).toBe(false);
      });

      it("should pass when value is undefined", () => {
        const context: AssertionContext = {
          fieldName: "body.optional",
          actualValue: undefined,
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when value exists", () => {
        const context: AssertionContext = {
          fieldName: "body.token",
          actualValue: "abc123",
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toBe("Field should not exist");
      });

      it("should fail for empty string", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: "",
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should fail for zero", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 0,
          expectedValue: false,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("result structure", () => {
      it("should have correct field name", () => {
        const context: AssertionContext = {
          fieldName: "body.user.id",
          actualValue: 123,
          expectedValue: true,
        };

        const result = strategy.validate(context);

        expect(result.field).toBe("body.user.id.exists");
      });
    });
  });
});
