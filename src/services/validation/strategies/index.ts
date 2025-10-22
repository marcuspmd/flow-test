/**
 * @fileoverview Exports all validation strategies.
 *
 * @remarks
 * Central export point for all validation strategies, making it easy to
 * import and register all strategies at once.
 *
 * @packageDocumentation
 */

export {
  ValidationStrategy,
  BaseValidationStrategy,
} from "./validation-strategy.interface";
export { MinLengthValidationStrategy } from "./min-length.validation";
export { MaxLengthValidationStrategy } from "./max-length.validation";
export { PatternValidationStrategy } from "./pattern.validation";
export { RangeValidationStrategy } from "./range.validation";

import { MinLengthValidationStrategy } from "./min-length.validation";
import { MaxLengthValidationStrategy } from "./max-length.validation";
import { PatternValidationStrategy } from "./pattern.validation";
import { RangeValidationStrategy } from "./range.validation";

/**
 * Array of all basic validation strategy classes.
 *
 * @remarks
 * Convenient for registering all strategies at once:
 *
 * @example
 * ```typescript
 * import { ValidationRegistry } from './validation-registry';
 * import { ALL_BASIC_VALIDATION_STRATEGIES } from './strategies';
 *
 * const registry = new ValidationRegistry();
 * ALL_BASIC_VALIDATION_STRATEGIES.forEach(Strategy => {
 *   registry.register(new Strategy());
 * });
 * ```
 *
 * @public
 */
export const ALL_BASIC_VALIDATION_STRATEGIES = [
  MinLengthValidationStrategy,
  MaxLengthValidationStrategy,
  PatternValidationStrategy,
  RangeValidationStrategy,
];
