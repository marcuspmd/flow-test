/**
 * @fileoverview Result building and aggregation service interface
 * @module interfaces/services/IResultBuilder
 */

import type {
  SuiteExecutionResult,
  StepExecutionResult,
  TestSuite,
  DiscoveredTest,
  DependencyResult,
} from "../../types/engine.types";
import type { PerformanceSummary } from "../../types/config.types";

/**
 * Performance data point
 */
export interface PerformanceDataPoint {
  /** Request method */
  method: string;
  /** Request URL */
  url: string;
  /** Response time in milliseconds */
  response_time_ms: number;
  /** Response status code */
  status_code: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Service responsible for building and aggregating test execution results
 *
 * @remarks
 * Handles result construction including:
 * - Suite result building
 * - Performance data collection
 * - Statistics aggregation
 * - Error result creation
 * - Cached result reconstruction
 *
 * @public
 */
export interface IResultBuilder {
  /**
   * Build suite execution result from step results
   *
   * @param suite - Test suite
   * @param test - Discovered test
   * @param stepResults - Array of step results
   * @param startTime - Suite start time
   * @param endTime - Suite end time
   * @returns Complete suite execution result
   */
  buildSuiteResult(
    suite: TestSuite,
    test: DiscoveredTest,
    stepResults: StepExecutionResult[],
    startTime: Date,
    endTime: Date
  ): SuiteExecutionResult;

  /**
   * Build error suite result for failed suite execution
   *
   * @param suite - Test suite
   * @param test - Discovered test
   * @param error - Error that occurred
   * @param startTime - Suite start time
   * @returns Error suite result
   */
  buildErrorResult(
    suite: TestSuite,
    test: DiscoveredTest,
    error: Error,
    startTime: Date
  ): SuiteExecutionResult;

  /**
   * Build suite result from cached dependency result
   *
   * @param cachedResult - Cached dependency result
   * @param test - Discovered test
   * @returns Cached suite result
   */
  buildCachedResult(
    cachedResult: DependencyResult,
    test: DiscoveredTest
  ): SuiteExecutionResult;

  /**
   * Record performance data for a request
   *
   * @param request - Request details
   * @param result - Response/result details
   */
  recordPerformance(request: any, result: any): void;

  /**
   * Calculate execution statistics from step results
   *
   * @param stepResults - Array of step results
   * @returns Execution statistics (suite-level)
   */
  calculateStatistics(stepResults: StepExecutionResult[]): {
    total: number;
    executed: number;
    successful: number;
    failed: number;
    skipped: number;
    successRate: number;
  };

  /**
   * Build performance summary from collected data
   *
   * @param stepResults - Array of step results
   * @param duration - Total duration in milliseconds
   * @returns Performance summary
   */
  buildPerformanceSummary(
    stepResults: StepExecutionResult[],
    duration: number
  ): PerformanceSummary;

  /**
   * Reset performance data collection
   */
  resetPerformanceData(): void;

  /**
   * Get current performance data
   *
   * @returns Array of performance data points
   */
  getPerformanceData(): PerformanceDataPoint[];

  /**
   * Attach raw URL to result for debugging
   *
   * @param result - Step result to modify
   * @param rawUrl - Raw uninterpolated URL
   */
  attachRawUrl(result: StepExecutionResult, rawUrl?: string): void;
}
