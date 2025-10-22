/**
 * @fileoverview Input service module - Barrel export.
 *
 * @remarks
 * This module provides centralized exports for the input service,
 * strategies, helpers, and types. It maintains backward compatibility
 * with existing imports while organizing code in a modular structure.
 *
 * @packageDocumentation
 */

// Main service
export { InputService } from "./input.service";

// Strategy pattern exports
export {
  InputTypeRegistry,
  getDefaultInputTypeRegistry,
} from "./strategies/input-types";

export {
  PromptStyleRegistry,
  getDefaultPromptStyleRegistry,
} from "./strategies/prompt-styles";

// Helpers
export { validateInput } from "./helpers/validation.helper";
export { convertValue } from "./helpers/conversion.helper";
