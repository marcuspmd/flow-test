/**
 * @fileoverview Unit tests for length strategies.
 */

import { LengthStrategy, MinLengthStrategy } from "../length.strategy";
import { AssertionContext } from "../assertion-strategy.interface";

describe("Length Strategies", () => {
  describe("LengthStrategy", () => {
    let strategy: LengthStrategy;

    beforeEach(() => {
      strategy = new LengthStrategy();
    });

    describe("canHandle", () => {
      it("should handle checks with length property", () => {
        expect(strategy.canHandle({ length: { equals: 5 } })).toBe(true);
      });

      it("should not handle checks without length property", () => {
        expect(strategy.canHandle({ minLength: 5 })).toBe(false);
        expect(strategy.canHandle({ equals: 5 })).toBe(false);
      });
    });

    describe("validate", () => {
      describe("for strings", () => {
        it("should validate length.equals for strings", () => {
          const context: AssertionContext = {
            fieldName: "body.name",
            actualValue: "hello",
            expectedValue: { equals: 5 },
          };

          const results = strategy.validate(context);

          expect(Array.isArray(results)).toBe(true);
          expect(results[0].passed).toBe(true);
          expect(results[0].field).toBe("body.name.length.equals");
        });

        it("should fail when length is different", () => {
          const context: AssertionContext = {
            fieldName: "body.text",
            actualValue: "test",
            expectedValue: { equals: 10 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(false);
          expect(results[0].message).toContain("Expected length: 10");
        });
      });

      describe("for arrays", () => {
        it("should validate length.equals for arrays", () => {
          const context: AssertionContext = {
            fieldName: "body.items",
            actualValue: [1, 2, 3],
            expectedValue: { equals: 3 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(true);
          expect(results[0].actual).toBe(3);
        });

        it("should fail when array length is different", () => {
          const context: AssertionContext = {
            fieldName: "body.items",
            actualValue: [1, 2],
            expectedValue: { equals: 5 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(false);
        });
      });

      describe("nested operators", () => {
        it("should validate length.greater_than", () => {
          const context: AssertionContext = {
            fieldName: "body.items",
            actualValue: [1, 2, 3, 4, 5],
            expectedValue: { greater_than: 3 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(true);
          expect(results[0].field).toBe("body.items.length.greater_than");
        });

        it("should validate length.less_than", () => {
          const context: AssertionContext = {
            fieldName: "body.text",
            actualValue: "short",
            expectedValue: { less_than: 10 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(true);
          expect(results[0].field).toBe("body.text.length.less_than");
        });

        it("should validate length.greater_than_or_equal", () => {
          const context: AssertionContext = {
            fieldName: "body.items",
            actualValue: [1, 2, 3],
            expectedValue: { greater_than_or_equal: 3 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(true);
        });

        it("should validate length.less_than_or_equal", () => {
          const context: AssertionContext = {
            fieldName: "body.items",
            actualValue: [1, 2, 3],
            expectedValue: { less_than_or_equal: 5 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(true);
        });

        it("should validate multiple nested operators", () => {
          const context: AssertionContext = {
            fieldName: "body.items",
            actualValue: [1, 2, 3, 4, 5],
            expectedValue: {
              greater_than: 0,
              less_than: 10,
              equals: 5,
            },
          };

          const results = strategy.validate(context);

          expect(results.length).toBe(3);
          expect(results.every((r) => r.passed)).toBe(true);
        });
      });

      describe("invalid values", () => {
        it("should fail for numbers", () => {
          const context: AssertionContext = {
            fieldName: "body.count",
            actualValue: 123,
            expectedValue: { equals: 3 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(false);
          expect(results[0].message).toContain(
            "Value must be an array or string"
          );
        });

        it("should fail for objects", () => {
          const context: AssertionContext = {
            fieldName: "body.data",
            actualValue: { a: 1 },
            expectedValue: { equals: 1 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(false);
        });

        it("should fail for null", () => {
          const context: AssertionContext = {
            fieldName: "body.field",
            actualValue: null,
            expectedValue: { equals: 0 },
          };

          const results = strategy.validate(context);

          expect(results[0].passed).toBe(false);
        });
      });
    });
  });

  describe("MinLengthStrategy", () => {
    let strategy: MinLengthStrategy;

    beforeEach(() => {
      strategy = new MinLengthStrategy();
    });

    describe("canHandle", () => {
      it("should handle checks with minLength property", () => {
        expect(strategy.canHandle({ minLength: 3 })).toBe(true);
      });

      it("should not handle checks without minLength property", () => {
        expect(strategy.canHandle({ length: { equals: 3 } })).toBe(false);
      });
    });

    describe("validate", () => {
      it("should pass when string meets minimum length", () => {
        const context: AssertionContext = {
          fieldName: "body.password",
          actualValue: "password123",
          expectedValue: 8,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
        expect(result.field).toBe("body.password.minLength");
      });

      it("should pass when length equals minimum", () => {
        const context: AssertionContext = {
          fieldName: "body.password",
          actualValue: "12345678",
          expectedValue: 8,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail when string is too short", () => {
        const context: AssertionContext = {
          fieldName: "body.password",
          actualValue: "short",
          expectedValue: 8,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain("less than minimum 8");
      });

      it("should work with arrays", () => {
        const context: AssertionContext = {
          fieldName: "body.items",
          actualValue: [1, 2, 3, 4, 5],
          expectedValue: 3,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(true);
      });

      it("should fail for non-measurable types", () => {
        const context: AssertionContext = {
          fieldName: "body.count",
          actualValue: 100,
          expectedValue: 3,
        };

        const result = strategy.validate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain(
          "Value must be an array or string to check minLength"
        );
      });
    });
  });
});
