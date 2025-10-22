/**
 * @fileoverview Assertion service module - Barrel export.
 *
 * @remarks
 * This module provides centralized exports for the assertion service,
 * strategies, helpers, and types. It maintains backward compatibility
 * with existing imports while organizing code in a modular structure.
 *
 * @packageDocumentation
 */

// Main service
export { AssertionService } from "./assertion.service";

// Strategy pattern exports
export {
  AssertionStrategy,
  AssertionContext,
} from "./strategies/assertion-strategy.interface";

// Re-export all strategies (from strategies/index.ts)
export * from "./strategies";

// Helpers
export { deepEqual } from "./helpers/comparison.helper";
