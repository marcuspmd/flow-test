/**
 * @fileoverview Result building and aggregation service implementation
 * @module services/execution/result-builder
 */

import { injectable, inject } from "inversify";
import { TYPES } from "../../di/identifiers";
import type {
  IResultBuilder,
  PerformanceDataPoint,
} from "../../interfaces/services/IResultBuilder";
import type { ILogger } from "../../interfaces/services/ILogger";
import type {
  SuiteExecutionResult,
  StepExecutionResult,
  TestSuite,
  DiscoveredTest,
  DependencyResult,
} from "../../types/engine.types";
import type { PerformanceSummary } from "../../types/config.types";

/**
 * Service responsible for building and aggregating test execution results
 *
 * @remarks
 * Handles all aspects of result construction including:
 * - Suite result building from step results
 * - Performance data collection and aggregation
 * - Statistics calculation
 * - Error and cached result generation
 *
 * @public
 */
@injectable()
export class ResultBuilderService implements IResultBuilder {
  private performanceData: PerformanceDataPoint[] = [];

  constructor(@inject(TYPES.ILogger) private logger: ILogger) {}

  /**
   * Build suite execution result from step results
   */
  buildSuiteResult(
    suite: TestSuite,
    test: DiscoveredTest,
    stepResults: StepExecutionResult[],
    startTime: Date,
    endTime: Date
  ): SuiteExecutionResult {
    const duration = endTime.getTime() - startTime.getTime();
    const stats = this.calculateStatistics(stepResults);

    // Determine overall status
    let status: "success" | "failure" | "skipped" = "success";
    if (stats.failed > 0) {
      status = "failure";
    } else if (stats.executed === 0 || stats.skipped === stepResults.length) {
      status = "skipped";
    }

    return {
      node_id: test.node_id,
      suite_name: suite.suite_name,
      file_path: test.file_path,
      priority: test.priority,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: duration,
      status,
      steps_executed: stats.executed,
      steps_successful: stats.successful,
      steps_failed: stats.failed,
      success_rate: stats.successRate,
      steps_results: stepResults,
      variables_captured: this.extractCapturedVariables(stepResults),
    };
  }

  /**
   * Build error suite result for failed suite execution
   */
  buildErrorResult(
    suite: TestSuite,
    test: DiscoveredTest,
    error: Error,
    startTime: Date
  ): SuiteExecutionResult {
    const now = new Date();
    const duration = now.getTime() - startTime.getTime();

    return {
      node_id: test.node_id,
      suite_name: suite.suite_name,
      file_path: test.file_path,
      priority: test.priority,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      duration_ms: duration,
      status: "failure",
      steps_executed: 0,
      steps_successful: 0,
      steps_failed: 1,
      success_rate: 0,
      steps_results: [],
      error_message: `Execution error: ${error.message}`,
      variables_captured: {},
    };
  }

  /**
   * Build suite result from cached dependency result
   */
  buildCachedResult(
    cachedResult: DependencyResult,
    test: DiscoveredTest
  ): SuiteExecutionResult {
    const now = new Date();

    return {
      node_id: test.node_id,
      suite_name: test.suite_name,
      file_path: test.file_path,
      priority: test.priority,
      start_time: now.toISOString(),
      end_time: now.toISOString(),
      duration_ms: 0, // Cache hit = no execution time
      status: "success",
      steps_executed: 1, // Assume 1 step for cached results
      steps_successful: 1,
      steps_failed: 0,
      success_rate: 100,
      steps_results: [],
      variables_captured: cachedResult.exportedVariables || {},
    };
  }

  /**
   * Record performance data for a request
   */
  recordPerformance(request: any, result: any): void {
    if (result.response_details) {
      this.performanceData.push({
        method: request.method || "GET",
        url: request.url || "unknown",
        response_time_ms: result.duration_ms || 0,
        status_code: result.response_details.status_code || 0,
        timestamp: Date.now(),
      });

      this.logger.debug(
        `Recorded performance: ${request.method} ${request.url} - ${result.duration_ms}ms (${result.response_details.status_code})`
      );
    }
  }

  /**
   * Calculate execution statistics from step results
   */
  calculateStatistics(stepResults: StepExecutionResult[]): {
    total: number;
    executed: number;
    successful: number;
    failed: number;
    skipped: number;
    successRate: number;
  } {
    const total = stepResults.length;
    const successful = stepResults.filter((r) => r.status === "success").length;
    const failed = stepResults.filter((r) => r.status === "failure").length;
    const skipped = stepResults.filter((r) => r.status === "skipped").length;
    const executed = total - skipped;
    const successRate =
      executed > 0 ? Math.round((successful / executed) * 100) : 0;

    return {
      total,
      executed,
      successful,
      failed,
      skipped,
      successRate,
    };
  }

  /**
   * Build performance summary from collected data
   */
  buildPerformanceSummary(
    stepResults: StepExecutionResult[],
    duration: number
  ): PerformanceSummary {
    const responseTimes = this.performanceData.map((d) => d.response_time_ms);
    const requestCount = this.performanceData.length;

    // Calculate statistics
    const avgResponseTime =
      requestCount > 0
        ? Math.round(
            responseTimes.reduce((sum, time) => sum + time, 0) / requestCount
          )
        : 0;

    const minResponseTime = requestCount > 0 ? Math.min(...responseTimes) : 0;

    const maxResponseTime = requestCount > 0 ? Math.max(...responseTimes) : 0;

    // Calculate median
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const mid = Math.floor(sortedTimes.length / 2);
    const medianResponseTime =
      sortedTimes.length > 0
        ? sortedTimes.length % 2 === 0
          ? Math.round((sortedTimes[mid - 1] + sortedTimes[mid]) / 2)
          : sortedTimes[mid]
        : 0;

    // Calculate percentiles
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    const p99ResponseTime = sortedTimes[p99Index] || 0;

    // Requests per second
    const requestsPerSecond =
      duration > 0 ? Math.round((requestCount / duration) * 1000) : 0;

    return {
      total_requests: requestCount,
      average_response_time_ms: avgResponseTime,
      min_response_time_ms: minResponseTime,
      max_response_time_ms: maxResponseTime,
      requests_per_second: requestsPerSecond,
      slowest_endpoints: this.calculateSlowestEndpoints(),
    };
  }

  /**
   * Reset performance data collection
   */
  resetPerformanceData(): void {
    this.performanceData = [];
    this.logger.debug("Performance data reset");
  }

  /**
   * Get current performance data
   */
  getPerformanceData(): PerformanceDataPoint[] {
    return [...this.performanceData]; // Return copy to prevent mutations
  }

  /**
   * Attach raw URL to result for debugging
   */
  attachRawUrl(result: StepExecutionResult, rawUrl?: string): void {
    if (!result?.request_details || !rawUrl) {
      return;
    }

    const baseUrl = result.request_details.base_url || "";
    let templateUrl = rawUrl;
    const isAbsolute = /^(https?:)?\/\//i.test(rawUrl);
    const hasBasePlaceholder = rawUrl.includes("{{base_url}}");

    // If URL is relative and has base_url, create template
    if (!isAbsolute && baseUrl && !hasBasePlaceholder) {
      const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
      templateUrl = `{{base_url}}${path}`;
    }

    result.request_details.raw_url = templateUrl;
  }

  /**
   * Extract all captured variables from step results
   */
  private extractCapturedVariables(
    stepResults: StepExecutionResult[]
  ): Record<string, any> {
    const allCaptured: Record<string, any> = {};

    for (const stepResult of stepResults) {
      if (stepResult.captured_variables) {
        Object.assign(allCaptured, stepResult.captured_variables);
      }
    }

    return allCaptured;
  }

  /**
   * Calculate slowest endpoints from performance data
   */
  private calculateSlowestEndpoints(): Array<{
    url: string;
    average_time_ms: number;
    call_count: number;
  }> {
    // Group by URL
    const urlGroups = new Map<string, number[]>();

    for (const dataPoint of this.performanceData) {
      const existing = urlGroups.get(dataPoint.url) || [];
      existing.push(dataPoint.response_time_ms);
      urlGroups.set(dataPoint.url, existing);
    }

    // Calculate averages and sort
    const endpoints = Array.from(urlGroups.entries())
      .map(([url, times]) => ({
        url,
        average_time_ms: Math.round(
          times.reduce((sum, t) => sum + t, 0) / times.length
        ),
        call_count: times.length,
      }))
      .sort((a, b) => b.average_time_ms - a.average_time_ms)
      .slice(0, 10); // Top 10 slowest

    return endpoints;
  }
}
