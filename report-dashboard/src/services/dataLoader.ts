import type { ReportData } from "../types/dashboard.types";
import fs from "fs";
import path from "path";

/**
 * Load report data from flow-test results
 * Priority: 1. latest.json, 2. most recent timestamped file, 3. fallback to mock data
 */
export async function loadReportData(): Promise<ReportData> {
  try {
    // Path to flow-test results directory
    const resultsDir = path.join(process.cwd(), "..", "results");
    const latestJsonPath = path.join(resultsDir, "latest.json");

    // Try to load latest.json first
    if (fs.existsSync(latestJsonPath)) {
      const rawData = fs.readFileSync(latestJsonPath, "utf-8");
      const data = JSON.parse(rawData);
      console.log("[DataLoader] Loaded data from latest.json");
      return data as ReportData;
    }

    // Fallback: Find most recent timestamped JSON file
    if (fs.existsSync(resultsDir)) {
      const files = fs
        .readdirSync(resultsDir)
        .filter(
          (file) =>
            file.endsWith(".json") && file.includes("flow-test-demo-project")
        )
        .sort()
        .reverse(); // Most recent first

      if (files.length > 0) {
        const recentFile = path.join(resultsDir, files[0]);
        const rawData = fs.readFileSync(recentFile, "utf-8");
        const data = JSON.parse(rawData);
        console.log(`[DataLoader] Loaded data from ${files[0]}`);
        return data as ReportData;
      }
    }

    console.warn("[DataLoader] No real data found, using fallback mock data");
    return getFallbackData();
  } catch (error) {
    console.error("[DataLoader] Error loading data:", error);
    console.log("[DataLoader] Using fallback mock data");
    return getFallbackData();
  }
}

/**
 * Fallback mock data when real data is not available
 */
function getFallbackData(): ReportData {
  return {
    project_name: "Flow Test Demo Project (Mock Data)",
    start_time: "2025-09-20T19:00:08.957Z",
    end_time: "2025-09-20T19:00:18.183Z",
    total_duration_ms: 9358,
    total_tests: 42,
    successful_tests: 42,
    failed_tests: 0,
    skipped_tests: 0,
    success_rate: 100,
    suites_results: [
      {
        node_id: "suite-01",
        suite_name: "CLI Comprehensive Test Suite",
        file_path: "tests/cli-test.yaml",
        priority: "high",
        start_time: "2025-09-20T19:00:08.957Z",
        end_time: "2025-09-20T19:00:12.183Z",
        duration_ms: 3226,
        status: "success",
        steps_executed: 10,
        steps_successful: 10,
        steps_failed: 0,
        success_rate: 100,
        steps_results: [],
      },
      {
        node_id: "suite-02",
        suite_name: "Authentication Flow Tests",
        file_path: "tests/auth-test.yaml",
        priority: "critical",
        start_time: "2025-09-20T19:00:12.957Z",
        end_time: "2025-09-20T19:00:18.183Z",
        duration_ms: 5132,
        status: "success",
        steps_executed: 13,
        steps_successful: 13,
        steps_failed: 0,
        success_rate: 100,
        steps_results: [],
      },
    ],
    report_metadata: {
      generated_at: "2025-09-20T19:00:18.259Z",
      format: "json",
      version: "1.0.0",
    },
  };
}

/**
 * Load navigation data for sidebar from real report data
 */
export function extractNavigationData(reportData: ReportData) {
  return reportData.suites_results.map((suite) => ({
    id: suite.node_id,
    label: suite.suite_name,
    path: `/suite/${suite.node_id}`,
    icon:
      suite.priority === "critical"
        ? "🔴"
        : suite.priority === "high"
        ? "🟡"
        : suite.priority === "medium"
        ? "🔵"
        : "🟢",
    children:
      suite.steps_results?.map((step, index) => ({
        id: `${suite.node_id}-step-${index}`,
        label: step.step_name,
        path: `/step/${suite.node_id}/${index}`,
        icon:
          step.status === "success"
            ? "✅"
            : step.status === "failed"
            ? "❌"
            : "⏭️",
      })) || [],
  }));
}

/**
 * Extract metrics data for components
 */
export function extractMetricsData(reportData: ReportData) {
  const allSteps =
    reportData.suites_results?.flatMap((suite) => suite.steps_results || []) ||
    [];

  return {
    totalTests: reportData.total_tests || 0,
    successRate: reportData.success_rate || 0,
    avgDuration:
      allSteps.length > 0
        ? Math.round(
            allSteps.reduce((acc, step) => acc + step.duration_ms, 0) /
              allSteps.length
          )
        : Math.round(reportData.total_duration_ms / reportData.total_tests),
    criticalTests:
      reportData.suites_results?.filter(
        (suite) => suite.priority === "critical"
      ).length || 0,
    failedTests: reportData.failed_tests || 0,
    skippedTests: reportData.skipped_tests || 0,
  };
}

/**
 * Extract all HTTP steps with suite context for requests page
 */
export function extractRequestSteps(reportData: ReportData) {
  return (
    reportData.suites_results?.flatMap(
      (suite) =>
        suite.steps_results?.map((step) => ({
          ...step,
          suite_name: suite.suite_name,
          suite_priority: suite.priority,
          suite_id: suite.node_id,
        })) || []
    ) || []
  );
}
