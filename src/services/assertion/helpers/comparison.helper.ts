/**
 * @fileoverview Comparison utilities for assertion validation.
 *
 * @remarks
 * This module provides reusable comparison functions used across assertion strategies.
 * All functions are pure and side-effect free for optimal testability.
 *
 * @packageDocumentation
 */

/**
 * Deep equality comparison with type-tolerant conversion.
 *
 * @remarks
 * Performs recursive comparison of objects and arrays with automatic type coercion
 * for common scenarios (number ↔ string, boolean ↔ string).
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if values are deeply equal
 *
 * @example
 * ```typescript
 * deepEqual(123, "123"); // true (type coercion)
 * deepEqual({a: 1}, {a: 1}); // true (deep comparison)
 * deepEqual([1, 2], [1, 2]); // true (array comparison)
 * ```
 *
 * @public
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;

  // Type-tolerant comparison for numbers and strings
  if (typeof a !== typeof b) {
    // Try to compare number and string representations
    if (
      (typeof a === "number" && typeof b === "string") ||
      (typeof a === "string" && typeof b === "number")
    ) {
      return String(a) === String(b);
    }
    // Try boolean to string comparison
    if (
      (typeof a === "boolean" && typeof b === "string") ||
      (typeof a === "string" && typeof b === "boolean")
    ) {
      return String(a) === String(b);
    }
    return false;
  }

  if (typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Checks if a value contains another value.
 *
 * @remarks
 * Supports containment checking for:
 * - Strings (substring search)
 * - Arrays (element presence with deep equality)
 * - Objects (value presence with deep equality)
 *
 * @param haystack - Value to search within
 * @param needle - Value to search for
 * @returns True if haystack contains needle
 *
 * @example
 * ```typescript
 * contains("hello world", "world"); // true
 * contains([1, 2, 3], 2); // true
 * contains({a: 1, b: 2}, 2); // true
 * ```
 *
 * @public
 */
export function contains(haystack: any, needle: any): boolean {
  if (typeof haystack === "string" && typeof needle === "string") {
    return haystack.includes(needle);
  }

  if (Array.isArray(haystack)) {
    return haystack.some((item) => deepEqual(item, needle));
  }

  if (typeof haystack === "object" && haystack !== null) {
    return Object.values(haystack).some((value) => deepEqual(value, needle));
  }

  return false;
}

/**
 * Validates a value against a regular expression pattern.
 *
 * @remarks
 * Safely handles invalid regex patterns and non-string values.
 *
 * @param value - Value to test (must be string)
 * @param pattern - Regular expression pattern
 * @returns True if value matches pattern
 *
 * @example
 * ```typescript
 * matchesRegex("test123", "^[a-z]+\\d+$"); // true
 * matchesRegex("test", "^\\d+$"); // false
 * matchesRegex(123, "\\d+"); // false (not a string)
 * ```
 *
 * @public
 */
export function matchesRegex(value: any, pattern: string): boolean {
  if (typeof value !== "string") return false;

  try {
    const regex = new RegExp(pattern);
    return regex.test(value);
  } catch {
    return false;
  }
}

/**
 * Gets the runtime type of a value for type assertions.
 *
 * @remarks
 * Distinguishes between `null`, `array`, and `object` types which
 * JavaScript's `typeof` operator doesn't differentiate well.
 *
 * @param value - Value to check
 * @returns Type string: "null", "array", "object", "string", "number", "boolean", "undefined"
 *
 * @example
 * ```typescript
 * getValueType(null); // "null"
 * getValueType([1, 2]); // "array"
 * getValueType({}); // "object"
 * getValueType("test"); // "string"
 * ```
 *
 * @public
 */
export function getValueType(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Gets the length of a value for length assertions.
 *
 * @remarks
 * Only strings and arrays have meaningful lengths.
 * Returns -1 for other types to indicate invalid length check.
 *
 * @param value - Value to measure
 * @returns Length of string/array, or -1 if not applicable
 *
 * @example
 * ```typescript
 * getValueLength("hello"); // 5
 * getValueLength([1, 2, 3]); // 3
 * getValueLength(123); // -1
 * getValueLength({}); // -1
 * ```
 *
 * @public
 */
export function getValueLength(value: any): number {
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length;
  }
  return -1;
}

/**
 * Checks if a value is empty.
 *
 * @remarks
 * Considers the following as empty:
 * - `null` or `undefined`
 * - Empty string `""`
 * - Empty array `[]`
 * - Empty object `{}`
 *
 * @param value - Value to check
 * @returns True if value is empty
 *
 * @example
 * ```typescript
 * isEmpty(null); // true
 * isEmpty(""); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty("hello"); // false
 * isEmpty([1]); // false
 * ```
 *
 * @public
 */
export function isEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  );
}
