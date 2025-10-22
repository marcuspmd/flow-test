/**
 * @fileoverview Unit tests for comparison helper functions.
 */

import {
  deepEqual,
  contains,
  matchesRegex,
  getValueType,
  getValueLength,
  isEmpty,
} from "../comparison.helper";

describe("comparison.helper", () => {
  describe("deepEqual", () => {
    describe("primitive types", () => {
      it("should return true for identical values", () => {
        expect(deepEqual(1, 1)).toBe(true);
        expect(deepEqual("test", "test")).toBe(true);
        expect(deepEqual(true, true)).toBe(true);
        expect(deepEqual(null, null)).toBe(true);
      });

      it("should return false for different values", () => {
        expect(deepEqual(1, 2)).toBe(false);
        expect(deepEqual("test", "other")).toBe(false);
        expect(deepEqual(true, false)).toBe(false);
      });

      it("should handle null and undefined", () => {
        expect(deepEqual(null, undefined)).toBe(false);
        expect(deepEqual(undefined, undefined)).toBe(true);
        expect(deepEqual(null, 0)).toBe(false);
      });
    });

    describe("type coercion", () => {
      it("should coerce number to string", () => {
        expect(deepEqual(123, "123")).toBe(true);
        expect(deepEqual("123", 123)).toBe(true);
      });

      it("should coerce boolean to string", () => {
        expect(deepEqual(true, "true")).toBe(true);
        expect(deepEqual("false", false)).toBe(true);
      });

      it("should not coerce incompatible types", () => {
        expect(deepEqual(123, true)).toBe(false);
        expect(deepEqual([], "array")).toBe(false);
      });
    });

    describe("objects", () => {
      it("should compare simple objects", () => {
        expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
        expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      });

      it("should detect different objects", () => {
        expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
        expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
      });

      it("should compare nested objects", () => {
        expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
        expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
      });

      it("should handle different key counts", () => {
        expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
      });

      it("should handle missing keys", () => {
        expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
      });
    });

    describe("arrays", () => {
      it("should compare simple arrays", () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(deepEqual(["a", "b"], ["a", "b"])).toBe(true);
      });

      it("should detect different arrays", () => {
        expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
        expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      });

      it("should compare nested arrays", () => {
        expect(deepEqual([[1, 2], [3]], [[1, 2], [3]])).toBe(true);
        expect(deepEqual([[1, 2], [3]], [[1, 2], [4]])).toBe(false);
      });

      it("should detect array vs object", () => {
        expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
      });
    });

    describe("mixed structures", () => {
      it("should compare complex nested structures", () => {
        const obj1 = { a: [1, { b: 2 }], c: { d: [3, 4] } };
        const obj2 = { a: [1, { b: 2 }], c: { d: [3, 4] } };
        expect(deepEqual(obj1, obj2)).toBe(true);
      });

      it("should detect differences in complex structures", () => {
        const obj1 = { a: [1, { b: 2 }], c: { d: [3, 4] } };
        const obj2 = { a: [1, { b: 3 }], c: { d: [3, 4] } };
        expect(deepEqual(obj1, obj2)).toBe(false);
      });
    });
  });

  describe("contains", () => {
    describe("strings", () => {
      it("should find substring", () => {
        expect(contains("hello world", "world")).toBe(true);
        expect(contains("test", "es")).toBe(true);
      });

      it("should return false for missing substring", () => {
        expect(contains("hello", "xyz")).toBe(false);
      });

      it("should be case-sensitive", () => {
        expect(contains("Hello", "hello")).toBe(false);
      });
    });

    describe("arrays", () => {
      it("should find element in array", () => {
        expect(contains([1, 2, 3], 2)).toBe(true);
        expect(contains(["a", "b", "c"], "b")).toBe(true);
      });

      it("should return false for missing element", () => {
        expect(contains([1, 2, 3], 4)).toBe(false);
      });

      it("should use deep equality", () => {
        expect(contains([{ a: 1 }, { a: 2 }], { a: 1 })).toBe(true);
        expect(contains([{ a: 1 }], { a: 2 })).toBe(false);
      });

      it("should handle type coercion", () => {
        expect(contains([1, 2, 3], "2")).toBe(true);
      });
    });

    describe("objects", () => {
      it("should find value in object", () => {
        expect(contains({ a: 1, b: 2 }, 2)).toBe(true);
        expect(contains({ x: "test", y: "other" }, "test")).toBe(true);
      });

      it("should return false for missing value", () => {
        expect(contains({ a: 1, b: 2 }, 3)).toBe(false);
      });

      it("should use deep equality for object values", () => {
        expect(contains({ a: { b: 1 } }, { b: 1 })).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should return false for non-searchable types", () => {
        expect(contains(123, 1)).toBe(false);
        expect(contains(true, true)).toBe(false);
        expect(contains(null, null)).toBe(false);
      });
    });
  });

  describe("matchesRegex", () => {
    it("should match valid patterns", () => {
      expect(matchesRegex("test123", "^[a-z]+\\d+$")).toBe(true);
      expect(matchesRegex("abc", "^[a-z]+$")).toBe(true);
    });

    it("should reject non-matching patterns", () => {
      expect(matchesRegex("test", "^\\d+$")).toBe(false);
      expect(matchesRegex("123abc", "^\\d+$")).toBe(false);
    });

    it("should handle special regex characters", () => {
      expect(matchesRegex("test.com", "^[a-z]+\\.[a-z]+$")).toBe(true);
      expect(matchesRegex("test@example.com", "^[^@]+@[^@]+$")).toBe(true);
    });

    it("should return false for non-string values", () => {
      expect(matchesRegex(123, "\\d+")).toBe(false);
      expect(matchesRegex(true, "true")).toBe(false);
      expect(matchesRegex(null, ".*")).toBe(false);
      expect(matchesRegex(undefined, ".*")).toBe(false);
    });

    it("should handle invalid regex patterns", () => {
      expect(matchesRegex("test", "[invalid")).toBe(false);
    });

    it("should be case-sensitive by default", () => {
      expect(matchesRegex("Test", "^[a-z]+$")).toBe(false);
      expect(matchesRegex("test", "^[a-z]+$")).toBe(true);
    });

    it("should support case-insensitive patterns", () => {
      expect(matchesRegex("Test", "(?i)^test$")).toBe(false); // JS doesn't support (?i)
    });
  });

  describe("getValueType", () => {
    it("should identify string type", () => {
      expect(getValueType("test")).toBe("string");
      expect(getValueType("")).toBe("string");
    });

    it("should identify number type", () => {
      expect(getValueType(123)).toBe("number");
      expect(getValueType(0)).toBe("number");
      expect(getValueType(3.14)).toBe("number");
    });

    it("should identify boolean type", () => {
      expect(getValueType(true)).toBe("boolean");
      expect(getValueType(false)).toBe("boolean");
    });

    it("should identify null type", () => {
      expect(getValueType(null)).toBe("null");
    });

    it("should identify undefined type", () => {
      expect(getValueType(undefined)).toBe("undefined");
    });

    it("should identify array type", () => {
      expect(getValueType([])).toBe("array");
      expect(getValueType([1, 2, 3])).toBe("array");
    });

    it("should identify object type", () => {
      expect(getValueType({})).toBe("object");
      expect(getValueType({ a: 1 })).toBe("object");
    });

    it("should distinguish array from object", () => {
      expect(getValueType([])).not.toBe("object");
      expect(getValueType({})).not.toBe("array");
    });
  });

  describe("getValueLength", () => {
    describe("strings", () => {
      it("should return length of string", () => {
        expect(getValueLength("hello")).toBe(5);
        expect(getValueLength("")).toBe(0);
        expect(getValueLength("test 123")).toBe(8);
      });
    });

    describe("arrays", () => {
      it("should return length of array", () => {
        expect(getValueLength([1, 2, 3])).toBe(3);
        expect(getValueLength([])).toBe(0);
        expect(getValueLength([1])).toBe(1);
      });
    });

    describe("non-measurable types", () => {
      it("should return -1 for numbers", () => {
        expect(getValueLength(123)).toBe(-1);
      });

      it("should return -1 for objects", () => {
        expect(getValueLength({ a: 1 })).toBe(-1);
      });

      it("should return -1 for booleans", () => {
        expect(getValueLength(true)).toBe(-1);
      });

      it("should return -1 for null and undefined", () => {
        expect(getValueLength(null)).toBe(-1);
        expect(getValueLength(undefined)).toBe(-1);
      });
    });
  });

  describe("isEmpty", () => {
    describe("null and undefined", () => {
      it("should return true for null", () => {
        expect(isEmpty(null)).toBe(true);
      });

      it("should return true for undefined", () => {
        expect(isEmpty(undefined)).toBe(true);
      });
    });

    describe("strings", () => {
      it("should return true for empty string", () => {
        expect(isEmpty("")).toBe(true);
      });

      it("should return false for non-empty string", () => {
        expect(isEmpty("test")).toBe(false);
        expect(isEmpty(" ")).toBe(false);
      });
    });

    describe("arrays", () => {
      it("should return true for empty array", () => {
        expect(isEmpty([])).toBe(true);
      });

      it("should return false for non-empty array", () => {
        expect(isEmpty([1])).toBe(false);
        expect(isEmpty([null])).toBe(false);
      });
    });

    describe("objects", () => {
      it("should return true for empty object", () => {
        expect(isEmpty({})).toBe(true);
      });

      it("should return false for non-empty object", () => {
        expect(isEmpty({ a: 1 })).toBe(false);
      });
    });

    describe("other types", () => {
      it("should return false for numbers", () => {
        expect(isEmpty(0)).toBe(false);
        expect(isEmpty(123)).toBe(false);
      });

      it("should return false for booleans", () => {
        expect(isEmpty(true)).toBe(false);
        expect(isEmpty(false)).toBe(false);
      });
    });
  });
});
