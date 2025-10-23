/**
 * @fileoverview Strategy pattern interfaces for test step execution.
 *
 * @remarks
 * This module defines the core abstractions for executing different types of test steps
 * using the Strategy Pattern. Each step type (Request, Input, Call, Iterate, Scenario)
 * has a dedicated strategy that encapsulates its execution logic.
 *
 * **Design Goals:**
 * - **Single Responsibility**: Each strategy handles one step type
 * - **Open/Closed Principle**: New step types can be added without modifying existing code
 * - **Testability**: Strategies can be tested in isolation with mocked contexts
 * - **Maintainability**: Logic separated into focused, manageable units (~150-200 lines each)
 *
 * @packageDocumentation
 */

import type {
  TestSuite,
  TestStep,
  StepExecutionResult,
  DiscoveredTest,
  EngineHooks,
} from "../../../types/engine.types";
import type { VariableService } from "../../variable.service";
import type { HttpService } from "../../http.service";
import type { AssertionService } from "../../assertion";
import type { CaptureService } from "../../capture.service";
import type { ScenarioService } from "../../scenario.service";
import type { InputService } from "../../input";
import type { ScriptExecutorService } from "../../script-executor.service";
import type { CallService } from "../../call.service";
import type { IterationService } from "../../iteration.service";
import type { Logger } from "../../logger.service";
import type { ConfigManager } from "../../../core/config";

/**
 * Execution context shared across all strategies.
 *
 * @remarks
 * Encapsulates all dependencies and contextual information needed to execute a step.
 * Passed as readonly to strategies to prevent unintended mutations.
 *
 * **Design Principles:**
 * - **Immutable**: All properties are readonly to prevent side effects
 * - **Complete**: Contains all services needed for any step type
 * - **Reusable**: Same context structure used across all strategies
 *
 * @example Using context in a strategy
 * ```typescript
 * async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
 *   const { step, suite, httpService, logger } = context;
 *
 *   logger.info(`Executing step: ${step.name}`);
 *   const response = await httpService.request(...);
 *
 *   return this.buildResult(context, response);
 * }
 * ```
 */
export interface StepExecutionContext {
  /** Test suite being executed */
  readonly suite: TestSuite;

  /** Current test step to execute */
  readonly step: TestStep;

  /** Zero-based index of the step in the suite */
  readonly stepIndex: number;

  /** Step identifiers (stepId, qualifiedStepId, normalizedQualifiedStepId) */
  readonly identifiers: {
    readonly stepId: string;
    readonly qualifiedStepId: string;
    readonly normalizedQualifiedStepId: string;
  };

  /** Discovered test metadata (optional) */
  readonly discoveredTest?: DiscoveredTest;

  // Core Services (injected once, reused across strategies)

  /** Global variables service for variable interpolation and scoping */
  readonly globalVariables: import("../../../interfaces/services/IVariableService").IVariableService;

  /** HTTP service for executing requests */
  readonly httpService: import("../../../interfaces/services/IHttpService").IHttpService;

  /** Assertion service for validating responses */
  readonly assertionService: import("../../../interfaces/services/IAssertionService").IAssertionService;

  /** Capture service for extracting data with JMESPath */
  readonly captureService: import("../../../interfaces/services/ICaptureService").ICaptureService;

  /** Scenario service for conditional execution */
  readonly scenarioService: import("../../../interfaces/services/IScenarioService").IScenarioService;

  /** Input service for interactive prompts */
  readonly inputService: import("../../../interfaces/services/IInputService").IInputService;

  /** Script executor service for pre/post-request scripts */
  readonly scriptExecutorService: import("../../../interfaces/services/IScriptExecutorService").IScriptExecutorService;

  /** Hook executor service for lifecycle hooks */
  readonly hookExecutorService: import("../../../interfaces/services/IHookExecutorService").IHookExecutorService;

  /** Call service for cross-suite step invocation */
  readonly callService: import("../../../interfaces/services/ICallService").ICallService;

  /** Iteration service for loop execution */
  readonly iterationService: import("../../../interfaces/services/IIterationService").IIterationService;

  // Configuration and State

  /** Configuration manager for engine settings */
  readonly configManager?: ConfigManager;

  /** Step call stack for loop detection (used by CallStepStrategy) */
  readonly stepCallStack?: string[];

  /** Execution service instance (for getting step execution handler) */
  readonly executionService?: import("../../../interfaces/services/IExecutionService").IExecutionService;

  // Hooks and Logging

  /** Optional lifecycle hooks */
  readonly hooks: EngineHooks;

  /** Logger instance for structured logging */
  readonly logger: Logger;
}

/**
 * Strategy interface for executing a specific type of test step.
 *
 * @remarks
 * Implementations of this interface encapsulate the complete execution logic
 * for one step type (e.g., HTTP request, input prompt, cross-suite call).
 *
 * **Strategy Selection:**
 * The `canHandle` method determines if the strategy can execute the given step.
 * The factory iterates through registered strategies and selects the first match.
 *
 * **Execution Flow:**
 * 1. Factory calls `canHandle(step)` on each strategy
 * 2. First matching strategy's `execute(context)` is invoked
 * 3. Strategy returns a complete `StepExecutionResult`
 *
 * @example Implementing a custom strategy
 * ```typescript
 * export class CustomStepStrategy implements StepExecutionStrategy {
 *   canHandle(step: TestStep): boolean {
 *     return !!step.custom_config;
 *   }
 *
 *   async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
 *     const { step, logger } = context;
 *     logger.info(`Executing custom step: ${step.name}`);
 *
 *     // Custom execution logic...
 *
 *     return {
 *       success: true,
 *       step_name: step.name,
 *       // ... other result fields
 *     };
 *   }
 * }
 * ```
 */
export interface StepExecutionStrategy {
  /**
   * Determines if this strategy can handle the given step.
   *
   * @param step - Test step to evaluate
   * @returns `true` if this strategy should execute the step, `false` otherwise
   *
   * @remarks
   * Strategies are evaluated in registration order (highest priority first).
   * The first strategy returning `true` will be selected.
   *
   * **Priority Guidelines:**
   * - **High priority**: Wrapper strategies (Iterate wraps any step type)
   * - **Medium priority**: Specialized steps (Call, Scenario, Input)
   * - **Low priority**: Fallback strategies (Request - handles most steps)
   *
   * @example Strategy selection logic
   * ```typescript
   * // IteratedStepStrategy (high priority - wraps others)
   * canHandle(step: TestStep): boolean {
   *   return !!step.iterate;
   * }
   *
   * // RequestStepStrategy (low priority - fallback)
   * canHandle(step: TestStep): boolean {
   *   return !!step.request && !step.iterate && !step.call;
   * }
   * ```
   */
  canHandle(step: TestStep): boolean;

  /**
   * Executes the test step and returns the result.
   *
   * @param context - Execution context with all dependencies
   * @returns Promise resolving to the step execution result
   *
   * @throws Should handle errors internally and return result with `success: false`
   *
   * @remarks
   * Strategies are responsible for:
   * - Validating step configuration
   * - Interpolating variables
   * - Executing the step's primary action (HTTP, input, call, etc.)
   * - Running assertions
   * - Capturing variables
   * - Building a complete result object
   *
   * **Error Handling:**
   * Strategies should catch errors and return a failed result rather than throwing.
   * Uncaught exceptions will be caught by the orchestrator and converted to failures.
   *
   * @example Basic execution flow
   * ```typescript
   * async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
   *   const startTime = Date.now();
   *
   *   try {
   *     // 1. Pre-execution setup
   *     await this.prepareExecution(context);
   *
   *     // 2. Main execution logic
   *     const result = await this.executeMain(context);
   *
   *     // 3. Post-execution processing
   *     await this.processResult(context, result);
   *
   *     // 4. Build success result
   *     return this.buildSuccessResult(context, result, startTime);
   *   } catch (error) {
   *     // 5. Build failure result
   *     return this.buildFailureResult(context, error, startTime);
   *   }
   * }
   * ```
   */
  execute(context: StepExecutionContext): Promise<StepExecutionResult>;
}
