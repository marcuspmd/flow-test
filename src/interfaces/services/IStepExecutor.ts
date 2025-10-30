/**
 * @fileoverview Step execution service interface
 * @module interfaces/services/IStepExecutor
 */

import type {
  TestStep,
  TestSuite,
  StepExecutionResult,
  EngineHooks,
  DiscoveredTest,
  SkipConfig,
} from "../../types/engine.types";

/**
 * Step identifiers for tracking and scoping
 */
export interface StepIdentifiers {
  /** Simple step ID */
  stepId: string;
  /** Fully qualified step ID (suite.step) */
  qualifiedStepId: string;
  /** Normalized qualified step ID */
  normalizedQualifiedStepId: string;
}

/**
 * Context for step execution
 */
export interface StepExecutionContext {
  /** The test step to execute */
  step: TestStep;
  /** Parent test suite */
  suite: TestSuite;
  /** Index of step in suite */
  stepIndex: number;
  /** Step identifiers */
  identifiers: StepIdentifiers;
  /** Execution hooks */
  hooks?: EngineHooks;
  /** Whether to actually execute or skip */
  shouldExecute?: boolean;
  /** Discovered test reference */
  discoveredTest?: DiscoveredTest;
}

/**
 * Service responsible for executing individual test steps
 *
 * @remarks
 * Handles step execution lifecycle including:
 * - Strategy selection and delegation
 * - Skip condition evaluation (pre/post)
 * - Hook execution
 * - Result building
 *
 * @public
 */
export interface IStepExecutor {
  /**
   * Execute a single test step
   *
   * @param context - Step execution context
   * @returns Step execution result
   */
  executeStep(context: StepExecutionContext): Promise<StepExecutionResult>;

  /**
   * Compute step identifiers for a given step
   *
   * @param suiteNodeId - Suite node ID
   * @param step - Test step
   * @param stepIndex - Step index in suite
   * @returns Step identifiers
   */
  computeStepIdentifiers(
    suiteNodeId: string,
    step: TestStep,
    stepIndex: number
  ): StepIdentifiers;

  /**
   * Evaluate skip condition for a step
   *
   * @param skipConfig - Skip configuration (string or object)
   * @param timing - When to evaluate (pre_execution or post_capture)
   * @param additionalContext - Additional context for post_capture evaluation
   * @returns True if step should be skipped
   */
  evaluateSkipCondition(
    skipConfig: string | SkipConfig,
    timing: "pre_execution" | "post_capture",
    additionalContext?: Record<string, any>
  ): boolean;
}
