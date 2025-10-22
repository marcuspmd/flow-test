/**
 * @fileoverview Unit tests for ContainsStrategy.
 */

import { ContainsStrategy } from "../contains.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("ContainsStrategy", () => {
  let strategy: ContainsStrategy;

  beforeEach(() => {
    strategy = new ContainsStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with contains property", () => {
      expect(strategy.canHandle({ contains: "text" })).toBe(true);
      expect(strategy.canHandle({ contains: 123 })).toBe(true);
    });

    it("should not handle checks without contains property", () => {
      expect(strategy.canHandle({ equals: "test" })).toBe(false);
      expect(strategy.canHandle({ regex: ".*" })).toBe(false);
      expect(strategy.canHandle({})).toBe(false);
    });
  });

  describe("validate", () => {
    describe("strings", () => {
      it("should pass when substring is found", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "Operation successful",
          expectedValue: "successful",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.message).toBe("OK");
      });

      it("should fail when substring is not found", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "Operation failed",
          expectedValue: "successful",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("Value does not contain");
      });

      it("should be case-sensitive", () => {
        const context: AssertionContext = {
          fieldName: "body.message",
          actualValue: "Hello World",
          expectedValue: "hello",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe("arrays", () => {
      it("should pass when element is in array", () => {
        const context: AssertionContext = {
          fieldName: "body.tags",
          actualValue: ["important", "urgent", "todo"],
          expectedValue: "urgent",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when element is not in array", () => {
        const context: AssertionContext = {
          fieldName: "body.tags",
          actualValue: ["important", "todo"],
          expectedValue: "urgent",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should use deep equality for objects in arrays", () => {
        const context: AssertionContext = {
          fieldName: "body.users",
          actualValue: [
            { id: 1, name: "John" },
            { id: 2, name: "Jane" },
          ],
          expectedValue: { id: 1, name: "John" },
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should handle type coercion in arrays", () => {
        const context: AssertionContext = {
          fieldName: "body.codes",
          actualValue: [1, 2, 3],
          expectedValue: "2",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("objects", () => {
      it("should pass when value is in object", () => {
        const context: AssertionContext = {
          fieldName: "body.config",
          actualValue: { timeout: 5000, retry: 3 },
          expectedValue: 3,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when value is not in object", () => {
        const context: AssertionContext = {
          fieldName: "body.config",
          actualValue: { timeout: 5000, retry: 3 },
          expectedValue: 10,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should use deep equality for nested objects", () => {
        const context: AssertionContext = {
          fieldName: "body.data",
          actualValue: { a: { b: 1 }, c: { d: 2 } },
          expectedValue: { d: 2 },
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should fail for non-searchable types", () => {
        const context: AssertionContext = {
          fieldName: "body.number",
          actualValue: 12345,
          expectedValue: 23,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });

      it("should handle null values", () => {
        const context: AssertionContext = {
          fieldName: "body.field",
          actualValue: null,
          expectedValue: "test",
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
      });
    });
  });
});
