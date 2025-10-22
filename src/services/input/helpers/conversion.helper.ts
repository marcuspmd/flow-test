/**
 * @fileoverview Input value conversion helper functions
 * 
 * Pure utility functions for converting input values to appropriate types.
 * Supports conversion for:
 * - Number type (parseFloat)
 * - Boolean type (confirm inputs)
 * - String type (default, no conversion)
 * 
 * @author Flow Test Engine
 * @since 1.2.0
 */

/**
 * Converts input value to the appropriate type based on input configuration.
 * 
 * Performs type conversion for:
 * - `number`: Converts to Number using parseFloat
 * - `confirm`: Converts to Boolean
 * - Other types: Returns value as-is (typically strings)
 * 
 * @param value - Input value to convert
 * @param type - Input type from configuration
 * @returns Converted value in the appropriate type
 * 
 * @example Number conversion
 * ```typescript
 * const result = convertValue("42.5", "number");
 * // → 42.5 (number)
 * ```
 * 
 * @example Boolean conversion
 * ```typescript
 * const result = convertValue("yes", "confirm");
 * // → true (boolean)
 * ```
 * 
 * @example String (no conversion)
 * ```typescript
 * const result = convertValue("hello", "text");
 * // → "hello" (string)
 * ```
 */
export function convertValue(value: any, type: string): any {
  switch (type) {
    case "number":
      return Number(value);
    case "confirm":
      return Boolean(value);
    default:
      return value;
  }
}
