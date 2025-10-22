/**
 * @fileoverview Unit tests for In and NotIn assertion strategies.
 */

import { InStrategy, NotInStrategy } from "../strategies/in.strategy";
import { AssertionContext } from "../strategies/assertion-strategy.interface";

describe("InStrategy", () => {
  let strategy: InStrategy;

  beforeEach(() => {
    strategy = new InStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with 'in' property", () => {
      expect(strategy.canHandle({ in: [1, 2, 3] })).toBe(true);
    });

    it("should not handle checks without 'in' property", () => {
      expect(strategy.canHandle({ equals: 123 })).toBe(false);
      expect(strategy.canHandle({ not_in: [1, 2] })).toBe(false);
    });
  });

  describe("validate", () => {
    it("should pass when value is in the list", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: [200, 201, 202],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
      expect(result.field).toBe("status_code.in");
      expect(result.message).toBe("OK");
    });

    it("should pass when string value is in the list", () => {
      const context: AssertionContext = {
        fieldName: "body.status",
        actualValue: "active",
        expectedValue: ["active", "pending", "processing"],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
      expect(result.field).toBe("body.status.in");
      expect(result.message).toBe("OK");
    });

    it("should fail when value is not in the list", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 404,
        expectedValue: [200, 201, 202],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
      expect(result.field).toBe("status_code.in");
      expect(result.message).toContain("is not in allowed list");
      expect(result.message).toContain("404");
    });

    it("should fail when expectedValue is not an array", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: "not-an-array" as any,
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("requires an array");
    });

    it("should handle empty arrays", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: [],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
    });

    it("should handle null and undefined values", () => {
      const contextNull: AssertionContext = {
        fieldName: "field",
        actualValue: null,
        expectedValue: [null, undefined, "value"],
      };

      const resultNull = strategy.validate(contextNull);
      expect(resultNull.passed).toBe(true);

      const contextUndefined: AssertionContext = {
        fieldName: "field",
        actualValue: undefined,
        expectedValue: [null, undefined, "value"],
      };

      const resultUndefined = strategy.validate(contextUndefined);
      expect(resultUndefined.passed).toBe(true);
    });

    it("should handle mixed type arrays", () => {
      const context: AssertionContext = {
        fieldName: "mixed_field",
        actualValue: 200,
        expectedValue: [200, "success", true, null],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
    });
  });
});

describe("NotInStrategy", () => {
  let strategy: NotInStrategy;

  beforeEach(() => {
    strategy = new NotInStrategy();
  });

  describe("canHandle", () => {
    it("should handle checks with 'not_in' property", () => {
      expect(strategy.canHandle({ not_in: [1, 2, 3] })).toBe(true);
    });

    it("should not handle checks without 'not_in' property", () => {
      expect(strategy.canHandle({ equals: 123 })).toBe(false);
      expect(strategy.canHandle({ in: [1, 2] })).toBe(false);
    });
  });

  describe("validate", () => {
    it("should pass when value is NOT in the list", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: [400, 404, 500],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
      expect(result.field).toBe("status_code.not_in");
      expect(result.message).toBe("OK");
    });

    it("should pass when string value is NOT in the list", () => {
      const context: AssertionContext = {
        fieldName: "body.status",
        actualValue: "active",
        expectedValue: ["deleted", "banned", "suspended"],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
      expect(result.field).toBe("body.status.not_in");
      expect(result.message).toBe("OK");
    });

    it("should fail when value IS in the list", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 404,
        expectedValue: [400, 404, 500],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
      expect(result.field).toBe("status_code.not_in");
      expect(result.message).toContain("is in forbidden list");
      expect(result.message).toContain("404");
    });

    it("should fail when expectedValue is not an array", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: "not-an-array" as any,
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("requires an array");
    });

    it("should handle empty arrays (all values pass)", () => {
      const context: AssertionContext = {
        fieldName: "status_code",
        actualValue: 200,
        expectedValue: [],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
    });

    it("should handle null and undefined values", () => {
      const contextNull: AssertionContext = {
        fieldName: "field",
        actualValue: null,
        expectedValue: ["value", "other"],
      };

      const resultNull = strategy.validate(contextNull);
      expect(resultNull.passed).toBe(true);

      const contextNullInList: AssertionContext = {
        fieldName: "field",
        actualValue: null,
        expectedValue: [null, undefined],
      };

      const resultNullInList = strategy.validate(contextNullInList);
      expect(resultNullInList.passed).toBe(false);
    });

    it("should handle mixed type arrays", () => {
      const context: AssertionContext = {
        fieldName: "mixed_field",
        actualValue: 404,
        expectedValue: [200, "success", true, null],
      };

      const result = strategy.validate(context);

      expect(result.passed).toBe(true);
    });
  });
});
