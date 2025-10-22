/**
 * @fileoverview Tests for conversion.helper
 */

import { convertValue } from "../conversion.helper";

describe("conversion.helper", () => {
  describe("convertValue", () => {
    describe("number conversion", () => {
      it("should convert string to number", () => {
        const result = convertValue("42", "number");
        expect(result).toBe(42);
        expect(typeof result).toBe("number");
      });

      it("should convert float string to number", () => {
        const result = convertValue("3.14", "number");
        expect(result).toBe(3.14);
        expect(typeof result).toBe("number");
      });

      it("should handle negative numbers", () => {
        const result = convertValue("-10", "number");
        expect(result).toBe(-10);
      });

      it("should return NaN for invalid number", () => {
        const result = convertValue("not-a-number", "number");
        expect(isNaN(result)).toBe(true);
      });

      it("should keep number as number", () => {
        const result = convertValue(123, "number");
        expect(result).toBe(123);
      });
    });

    describe("boolean conversion", () => {
      it("should convert truthy string to boolean", () => {
        const result = convertValue("yes", "confirm");
        expect(result).toBe(true);
        expect(typeof result).toBe("boolean");
      });

      it("should convert true to boolean", () => {
        const result = convertValue(true, "confirm");
        expect(result).toBe(true);
      });

      it("should convert false to boolean", () => {
        const result = convertValue(false, "confirm");
        expect(result).toBe(false);
      });

      it("should convert empty string to false", () => {
        const result = convertValue("", "confirm");
        expect(result).toBe(false);
      });

      it("should convert null to false", () => {
        const result = convertValue(null, "confirm");
        expect(result).toBe(false);
      });

      it("should convert undefined to false", () => {
        const result = convertValue(undefined, "confirm");
        expect(result).toBe(false);
      });

      it("should convert non-empty string to true", () => {
        const result = convertValue("anything", "confirm");
        expect(result).toBe(true);
      });
    });

    describe("no conversion (default)", () => {
      it("should return string as-is for text type", () => {
        const result = convertValue("hello", "text");
        expect(result).toBe("hello");
        expect(typeof result).toBe("string");
      });

      it("should return string as-is for email type", () => {
        const result = convertValue("user@example.com", "email");
        expect(result).toBe("user@example.com");
      });

      it("should return string as-is for url type", () => {
        const result = convertValue("https://example.com", "url");
        expect(result).toBe("https://example.com");
      });

      it("should return string as-is for password type", () => {
        const result = convertValue("secret", "password");
        expect(result).toBe("secret");
      });

      it("should return string as-is for multiline type", () => {
        const result = convertValue("line1\nline2", "multiline");
        expect(result).toBe("line1\nline2");
      });

      it("should return string as-is for unknown type", () => {
        const result = convertValue("value", "unknown-type");
        expect(result).toBe("value");
      });

      it("should handle objects for select type", () => {
        const obj = { id: 1, name: "Test" };
        const result = convertValue(obj, "select");
        expect(result).toBe(obj);
      });

      it("should handle arrays", () => {
        const arr = [1, 2, 3];
        const result = convertValue(arr, "text");
        expect(result).toBe(arr);
      });
    });
  });
});
