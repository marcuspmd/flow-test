/**
 * @fileoverview Variable context management service interface
 * @module interfaces/services/IVariableContextManager
 */

import type {
  TestSuite,
  DiscoveredTest,
  DependencyResult,
} from "../../types/engine.types";

/**
 * Variable scope types
 */
export type VariableScope = "global" | "suite" | "runtime" | "imported";

/**
 * Variable context snapshot
 */
export interface VariableContextSnapshot {
  /** All variables across all scopes */
  allVariables: Record<string, any>;
  /** Variables by scope */
  byScope: Map<VariableScope, Record<string, any>>;
  /** Exported variables from suite */
  exports: Record<string, any>;
}

/**
 * Service responsible for managing variable contexts and scopes
 *
 * @remarks
 * Handles variable lifecycle including:
 * - Context initialization and cleanup
 * - Scope management (global, suite, runtime)
 * - Export registration and retrieval
 * - Variable filtering and masking
 *
 * @public
 */
export interface IVariableContextManager {
  /**
   * Initialize variable context for a test suite
   *
   * @param suite - Test suite to initialize context for
   * @param test - Discovered test metadata
   */
  initializeContext(suite: TestSuite, test: DiscoveredTest): void;

  /**
   * Cleanup variable context after suite execution
   *
   * @param suite - Test suite to cleanup context for
   * @param preserveExports - Whether to preserve exported variables
   */
  cleanupContext(suite: TestSuite, preserveExports?: boolean): void;

  /**
   * Register suite exports in global registry
   *
   * @param test - Discovered test
   * @param variables - Captured variables
   * @param exports - Export definitions
   */
  registerExports(
    test: DiscoveredTest,
    variables: Record<string, any>,
    exports?: string[]
  ): void;

  /**
   * Restore exported variables from cached result
   *
   * @param cachedResult - Cached dependency result
   */
  restoreExportsFromCache(cachedResult: DependencyResult): void;

  /**
   * Get all captured variables for export
   *
   * @param stepResults - Array of step results
   * @returns Captured variables across all steps
   */
  getAllCapturedVariables(stepResults: any[]): Record<string, any>;

  /**
   * Get exported variables for a test
   *
   * @param test - Discovered test
   * @returns Exported variables
   */
  getExportedVariables(test: DiscoveredTest): Record<string, any>;

  /**
   * Filter and mask sensitive variables for logging
   *
   * @param variables - Variables to filter
   * @param context - Context for filtering (step name, etc.)
   * @returns Filtered and masked variables
   */
  filterAndMaskVariables(
    variables: Record<string, any>,
    context?: { stepName?: string }
  ): Record<string, any>;

  /**
   * Get current variable context snapshot
   *
   * @returns Current variable context
   */
  getContextSnapshot(): VariableContextSnapshot;

  /**
   * Process captured variables after step execution
   *
   * @param capturedVariables - Variables captured in step
   * @param scope - Variable scope to use
   */
  processCapturedVariables(
    capturedVariables: Record<string, any>,
    scope?: VariableScope
  ): void;
}
