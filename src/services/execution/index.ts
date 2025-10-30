/**
 * @fileoverview Execution service module - Barrel export.
 *
 * @remarks
 * This module provides centralized exports for the execution service,
 * step execution strategies, and related types. It maintains backward
 * compatibility with existing imports while organizing code in a modular structure.
 *
 * @packageDocumentation
 */

// Main service
export { ExecutionService } from "./execution.service";

// v3.0 - Specialized execution services
export { StepExecutorService } from "./step-executor.service";
export { VariableContextManager } from "./variable-context-manager.service";
export { ResultBuilderService } from "./result-builder.service";
export { HookExecutorService } from "./hook-executor.service";

// Strategy pattern exports
export {
  StepExecutionStrategy,
  StepExecutionContext,
} from "./strategies/step-execution.strategy";

export { StepStrategyFactory } from "./strategies/step-strategy.factory";

// Individual strategies
export { RequestStepStrategy } from "./strategies/request-step.strategy";
export { InputStepStrategy } from "./strategies/input-step.strategy";
export { CallStepStrategy } from "./strategies/call-step.strategy";
export { IteratedStepStrategy } from "./strategies/iterated-step.strategy";
export { ScenarioStepStrategy } from "./strategies/scenario-step.strategy";
