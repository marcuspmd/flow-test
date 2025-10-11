/**
 * QA Report Service - Transforms test results into QA/tester-friendly format
 *
 * This service generates comprehensive JSON reports designed for QA teams,
 * suitable for HTML/PDF generation and test documentation.
 */

import type {
  AggregatedResult,
  SuiteExecutionResult,
  StepExecutionResult,
} from "../types/config.types";

/**
 * QA Report structure designed for QA/tester consumption
 */
export interface QAReport {
  /** Executive summary with high-level metrics */
  executive_summary: ExecutiveSummary;

  /** Detailed test cases with results */
  test_cases: QATestCase[];

  /** Comprehensive metrics and statistics */
  metrics: QAMetrics;

  /** Failed tests and issues */
  issues: QAIssue[];

  /** Performance analysis */
  performance: QAPerformance;
}

export interface ExecutiveSummary {
  project_name: string;
  test_run_date: string;
  test_run_time: string;
  overall_status: "PASSED" | "FAILED" | "PARTIALLY_PASSED";
  total_test_suites: number;
  passed_suites: number;
  failed_suites: number;
  skipped_suites: number;
  success_rate: string;
  total_duration: string;
  total_duration_ms: number;
}

export interface QATestCase {
  /** Test case identifier */
  test_case_id: string;

  /** Test suite name */
  suite_name: string;

  /** Test description */
  description: string;

  /** Priority level */
  priority: string;

  /** Test status */
  status: "PASSED" | "FAILED" | "SKIPPED";

  /** Execution time in human-readable format */
  duration: string;

  /** Execution time in milliseconds */
  duration_ms: number;

  /** Test steps with details */
  steps: QATestStep[];

  /** Error message if failed */
  error_message?: string;

  /** File path for reference */
  file_path: string;

  /** Execution timestamp */
  executed_at: string;

  /** Success metrics */
  steps_total: number;
  steps_passed: number;
  steps_failed: number;
  step_success_rate: string;
}

export interface QATestStep {
  /** Step number */
  step_number: number;

  /** Step identifier */
  step_id?: string;

  /** Step name/description */
  step_name: string;

  /** Step status */
  status: "PASSED" | "FAILED" | "SKIPPED";

  /** Step type */
  type: "HTTP_REQUEST" | "ASSERTION" | "DATA_CAPTURE" | "CALL" | "OTHER";

  /** Execution duration */
  duration: string;
  duration_ms: number;

  /** Request details if applicable */
  request?: {
    method: string;
    url: string;
    full_url?: string;
    headers?: Record<string, string>;
    body?: any;
    curl_command?: string;
  };

  /** Response details if applicable */
  response?: {
    status_code: number;
    status_text: string;
    size: string;
    headers?: Record<string, string>;
    body?: any;
    response_time_ms?: number;
  };

  /** Assertions performed */
  assertions?: QAAssertion[];

  /** Variables captured */
  variables_captured?: Record<string, any>;

  /** Error message if failed */
  error_message?: string;
}

export interface QAAssertion {
  /** Assertion description */
  description: string;

  /** Field being asserted */
  field: string;

  /** Expected value */
  expected: any;

  /** Actual value received */
  actual: any;

  /** Assertion result */
  passed: boolean;

  /** Additional message */
  message?: string;
}

export interface QAMetrics {
  /** Total counts */
  total_test_suites: number;
  total_test_steps: number;

  /** Suite-level metrics */
  suites_passed: number;
  suites_failed: number;
  suites_skipped: number;
  suites_success_rate: string;

  /** Step-level metrics */
  steps_passed: number;
  steps_failed: number;
  steps_skipped: number;
  steps_success_rate: string;

  /** Timing metrics */
  total_duration_ms: number;
  average_suite_duration_ms: number;
  average_step_duration_ms: number;

  /** Distribution by priority */
  by_priority: {
    [priority: string]: {
      total: number;
      passed: number;
      failed: number;
      success_rate: string;
    };
  };

  /** Distribution by status */
  by_status: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface QAIssue {
  /** Issue severity */
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

  /** Test case that failed */
  test_case_id: string;
  suite_name: string;

  /** Step where issue occurred */
  step_name?: string;
  step_number?: number;

  /** Error message */
  error_message: string;

  /** Issue category */
  category: "ASSERTION_FAILED" | "HTTP_ERROR" | "EXECUTION_ERROR" | "OTHER";

  /** Timestamp */
  occurred_at: string;

  /** File path for reference */
  file_path: string;
}

export interface QAPerformance {
  /** HTTP performance metrics */
  total_requests?: number;
  average_response_time_ms?: number;
  min_response_time_ms?: number;
  max_response_time_ms?: number;
  requests_per_second?: number;

  /** Slowest endpoints */
  slowest_endpoints?: Array<{
    url: string;
    average_time_ms: number;
    call_count: number;
  }>;

  /** Overall performance rating */
  performance_rating?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
}

export class QAReportService {
  private readonly redactedValue = "[REDACTED]";
  private readonly sensitiveKeyPatterns: RegExp[] = [
    /password/i,
    /secret/i,
    /sensitive/i,
    /token/i,
    /api[-_]?key/i,
    /authorization/i,
  ];

  /**
   * Transforms aggregated test results into QA-friendly report format
   */
  transformToQAReport(result: AggregatedResult): QAReport {
    const executiveSummary = this.buildExecutiveSummary(result);
    const testCases = this.buildTestCases(result);
    const metrics = this.buildMetrics(result, testCases);
    const issues = this.buildIssues(result);
    const performance = this.buildPerformance(result);

    const report: QAReport = {
      executive_summary: executiveSummary,
      test_cases: testCases,
      metrics,
      issues,
      performance,
    };

    return this.sanitizeReport(report);
  }

  private buildExecutiveSummary(result: AggregatedResult): ExecutiveSummary {
    const startDate = new Date(result.start_time);
    const overallStatus = this.determineOverallStatus(result);

    return {
      project_name: result.project_name,
      test_run_date: startDate.toLocaleDateString("pt-BR"),
      test_run_time: startDate.toLocaleTimeString("pt-BR"),
      overall_status: overallStatus,
      total_test_suites: result.total_tests,
      passed_suites: result.successful_tests,
      failed_suites: result.failed_tests,
      skipped_suites: result.skipped_tests,
      success_rate: `${result.success_rate.toFixed(2)}%`,
      total_duration: this.formatDuration(result.total_duration_ms),
      total_duration_ms: result.total_duration_ms,
    };
  }

  private determineOverallStatus(
    result: AggregatedResult
  ): "PASSED" | "FAILED" | "PARTIALLY_PASSED" {
    if (result.failed_tests === 0 && result.successful_tests > 0) {
      return "PASSED";
    } else if (result.successful_tests === 0 && result.failed_tests > 0) {
      return "FAILED";
    } else {
      return "PARTIALLY_PASSED";
    }
  }

  private buildTestCases(result: AggregatedResult): QATestCase[] {
    return result.suites_results.map((suite, index) =>
      this.transformSuiteToTestCase(suite, index + 1)
    );
  }

  private transformSuiteToTestCase(
    suite: SuiteExecutionResult,
    caseNumber: number
  ): QATestCase {
    const steps = this.transformSteps(suite.steps_results);

    return {
      test_case_id: suite.node_id || `TC-${caseNumber.toString().padStart(3, "0")}`,
      suite_name: suite.suite_name,
      description: suite.suite_name,
      priority: suite.priority || "medium",
      status: this.mapStatus(suite.status),
      duration: this.formatDuration(suite.duration_ms),
      duration_ms: suite.duration_ms,
      steps,
      error_message: suite.error_message,
      file_path: suite.file_path,
      executed_at: suite.start_time,
      steps_total: suite.steps_executed,
      steps_passed: suite.steps_successful,
      steps_failed: suite.steps_failed,
      step_success_rate: `${suite.success_rate.toFixed(2)}%`,
    };
  }

  private transformSteps(steps: StepExecutionResult[]): QATestStep[] {
    return steps.map((step, index) => this.transformStep(step, index + 1));
  }

  private transformStep(step: StepExecutionResult, stepNumber: number): QATestStep {
    const stepType = this.determineStepType(step);

    const qaStep: QATestStep = {
      step_number: stepNumber,
      step_id: step.step_id,
      step_name: step.step_name,
      status: this.mapStatus(step.status),
      type: stepType,
      duration: this.formatDuration(step.duration_ms),
      duration_ms: step.duration_ms,
      error_message: step.error_message,
    };

    // Add request details
    if (step.request_details) {
      qaStep.request = {
        method: step.request_details.method,
        url: step.request_details.url,
        full_url: step.request_details.full_url,
        headers: step.request_details.headers,
        body: step.request_details.body,
        curl_command: step.request_details.curl_command,
      };
    }

    // Add response details
    if (step.response_details) {
      qaStep.response = {
        status_code: step.response_details.status_code,
        status_text: this.getStatusText(step.response_details.status_code),
        size: this.formatBytes(step.response_details.size_bytes),
        headers: step.response_details.headers,
        body: step.response_details.body,
        response_time_ms: step.duration_ms, // Response time is the step duration
      };
    }

    // Add assertions
    if (step.assertions_results && step.assertions_results.length > 0) {
      qaStep.assertions = step.assertions_results.map((assertion) => ({
        description: `Assert ${assertion.field}`,
        field: assertion.field,
        expected: assertion.expected,
        actual: assertion.actual,
        passed: assertion.passed,
        message: assertion.message,
      }));
    }

    // Add captured variables
    if (step.captured_variables && Object.keys(step.captured_variables).length > 0) {
      qaStep.variables_captured = step.captured_variables;
    }

    return qaStep;
  }

  private determineStepType(
    step: StepExecutionResult
  ): "HTTP_REQUEST" | "ASSERTION" | "DATA_CAPTURE" | "CALL" | "OTHER" {
    if (step.request_details) {
      return "HTTP_REQUEST";
    } else if (step.assertions_results && step.assertions_results.length > 0) {
      return "ASSERTION";
    } else if (step.captured_variables && Object.keys(step.captured_variables).length > 0) {
      return "DATA_CAPTURE";
    } else {
      return "OTHER";
    }
  }

  private buildMetrics(result: AggregatedResult, testCases: QATestCase[]): QAMetrics {
    const totalSteps = testCases.reduce((sum, tc) => sum + tc.steps_total, 0);
    const passedSteps = testCases.reduce((sum, tc) => sum + tc.steps_passed, 0);
    const failedSteps = testCases.reduce((sum, tc) => sum + tc.steps_failed, 0);
    const skippedSteps = totalSteps - passedSteps - failedSteps;

    const stepSuccessRate =
      totalSteps > 0 ? ((passedSteps / totalSteps) * 100).toFixed(2) : "0.00";

    const avgSuiteDuration =
      result.total_tests > 0 ? result.total_duration_ms / result.total_tests : 0;

    const avgStepDuration = totalSteps > 0 ? result.total_duration_ms / totalSteps : 0;

    const byPriority = this.calculateByPriority(testCases);
    const byStatus = {
      passed: result.successful_tests,
      failed: result.failed_tests,
      skipped: result.skipped_tests,
    };

    return {
      total_test_suites: result.total_tests,
      total_test_steps: totalSteps,
      suites_passed: result.successful_tests,
      suites_failed: result.failed_tests,
      suites_skipped: result.skipped_tests,
      suites_success_rate: `${result.success_rate.toFixed(2)}%`,
      steps_passed: passedSteps,
      steps_failed: failedSteps,
      steps_skipped: skippedSteps,
      steps_success_rate: `${stepSuccessRate}%`,
      total_duration_ms: result.total_duration_ms,
      average_suite_duration_ms: avgSuiteDuration,
      average_step_duration_ms: avgStepDuration,
      by_priority: byPriority,
      by_status: byStatus,
    };
  }

  private calculateByPriority(testCases: QATestCase[]): QAMetrics["by_priority"] {
    const byPriority: QAMetrics["by_priority"] = {};

    for (const testCase of testCases) {
      const priority = testCase.priority;

      if (!byPriority[priority]) {
        byPriority[priority] = {
          total: 0,
          passed: 0,
          failed: 0,
          success_rate: "0.00%",
        };
      }

      byPriority[priority].total += 1;

      if (testCase.status === "PASSED") {
        byPriority[priority].passed += 1;
      } else if (testCase.status === "FAILED") {
        byPriority[priority].failed += 1;
      }
    }

    // Calculate success rates
    for (const priority in byPriority) {
      const data = byPriority[priority];
      const successRate =
        data.total > 0 ? ((data.passed / data.total) * 100).toFixed(2) : "0.00";
      data.success_rate = `${successRate}%`;
    }

    return byPriority;
  }

  private buildIssues(result: AggregatedResult): QAIssue[] {
    const issues: QAIssue[] = [];

    for (const suite of result.suites_results) {
      if (suite.status === "failure") {
        // Add suite-level issue
        if (suite.error_message) {
          issues.push({
            severity: this.mapPriorityToSeverity(suite.priority),
            test_case_id: suite.node_id,
            suite_name: suite.suite_name,
            error_message: suite.error_message,
            category: "EXECUTION_ERROR",
            occurred_at: suite.start_time,
            file_path: suite.file_path,
          });
        }

        // Add step-level issues
        for (let i = 0; i < suite.steps_results.length; i++) {
          const step = suite.steps_results[i];

          if (step.status === "failure") {
            issues.push({
              severity: this.mapPriorityToSeverity(suite.priority),
              test_case_id: suite.node_id,
              suite_name: suite.suite_name,
              step_name: step.step_name,
              step_number: i + 1,
              error_message: step.error_message || "Step failed",
              category: this.determineIssueCategory(step),
              occurred_at: suite.start_time,
              file_path: suite.file_path,
            });
          }
        }
      }
    }

    return issues;
  }

  private determineIssueCategory(
    step: StepExecutionResult
  ): "ASSERTION_FAILED" | "HTTP_ERROR" | "EXECUTION_ERROR" | "OTHER" {
    if (step.assertions_results?.some((a) => !a.passed)) {
      return "ASSERTION_FAILED";
    } else if (step.response_details?.status_code && step.response_details.status_code >= 400) {
      return "HTTP_ERROR";
    } else {
      return "EXECUTION_ERROR";
    }
  }

  private mapPriorityToSeverity(
    priority?: string
  ): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "CRITICAL";
      case "high":
        return "HIGH";
      case "low":
        return "LOW";
      case "medium":
      default:
        return "MEDIUM";
    }
  }

  private buildPerformance(result: AggregatedResult): QAPerformance {
    if (!result.performance_summary) {
      return {};
    }

    const perf = result.performance_summary;
    const rating = this.calculatePerformanceRating(perf.average_response_time_ms);

    return {
      total_requests: perf.total_requests,
      average_response_time_ms: perf.average_response_time_ms,
      min_response_time_ms: perf.min_response_time_ms,
      max_response_time_ms: perf.max_response_time_ms,
      requests_per_second: perf.requests_per_second,
      slowest_endpoints: perf.slowest_endpoints,
      performance_rating: rating,
    };
  }

  private calculatePerformanceRating(
    avgResponseTime: number
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (avgResponseTime < 100) {
      return "EXCELLENT";
    } else if (avgResponseTime < 500) {
      return "GOOD";
    } else if (avgResponseTime < 1000) {
      return "FAIR";
    } else {
      return "POOR";
    }
  }

  private sanitizeReport<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeReport(item)) as unknown as T;
    }

    if (typeof data === "string") {
      return this.sanitizeString(data) as unknown as T;
    }

    if (typeof data === "object") {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data as Record<string, any>)) {
        if (this.isSensitiveKey(key)) {
          sanitized[key] = this.redactedValue;
        } else {
          sanitized[key] = this.sanitizeReport(value);
        }
      }
      return sanitized as T;
    }

    return data;
  }

  private isSensitiveKey(key: string): boolean {
    return this.sensitiveKeyPatterns.some((pattern) => pattern.test(key));
  }

  private sanitizeString(value: string): string {
    let sanitized = value;

    sanitized = sanitized.replace(
      /(password\s*[:=]\s*)([^\n\r,&]*)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /("password"\s*:\s*)"([^"]*)"/gi,
      `$1"${this.redactedValue}"`
    );
    sanitized = sanitized.replace(
      /(secret\s*[:=]\s*)([^\n\r,&]*)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /("secret[^"]*"\s*:\s*)"([^"]*)"/gi,
      `$1"${this.redactedValue}"`
    );
    sanitized = sanitized.replace(
      /(sensitive\s*[:=]\s*)([^\n\r,&]*)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /("sensitive[^"]*"\s*:\s*)"([^"]*)"/gi,
      `$1"${this.redactedValue}"`
    );
    sanitized = sanitized.replace(
      /(token\s*[:=]\s*)([^\n\r,&]*)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /("token"\s*:\s*)"([^"]*)"/gi,
      `$1"${this.redactedValue}"`
    );
    sanitized = sanitized.replace(
      /(api[-_]?key\s*[:=]\s*)([^\n\r,&]*)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /("api[-_]?key"\s*:\s*)"([^"]*)"/gi,
      `$1"${this.redactedValue}"`
    );
    sanitized = sanitized.replace(
      /(bearer\s+)([^\s"'`]+)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /(authorization\s*[:=]\s*)([^\n\r,&]*)/gi,
      `$1${this.redactedValue}`
    );
    sanitized = sanitized.replace(
      /("authorization"\s*:\s*)"([^"]*)"/gi,
      `$1"${this.redactedValue}"`
    );

    return sanitized;
  }

  private mapStatus(status: string): "PASSED" | "FAILED" | "SKIPPED" {
    switch (status.toLowerCase()) {
      case "success":
        return "PASSED";
      case "failure":
        return "FAILED";
      case "skipped":
        return "SKIPPED";
      default:
        return "FAILED";
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)}KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    }
  }

  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      200: "OK",
      201: "Created",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
    };

    return statusTexts[statusCode] || "Unknown";
  }
}
