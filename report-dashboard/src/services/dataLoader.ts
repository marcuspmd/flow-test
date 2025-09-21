import type { ReportData } from "../types/dashboard.types";
import fs from "fs";
import path from "path";
import { parse } from "yaml";

interface FlowTestConfig {
  reporting?: {
    output_dir?: string;
  };
}

/**
 * Load report data from flow-test results
 * Priority: 1. latest.json, 2. most recent timestamped file, 3. fallback to mock data
 */
export async function loadReportData(): Promise<ReportData> {
  try {
    const candidateDirectories = resolveReportDirectories();

    // Try to load a latest.json from candidate directories
    for (const directory of candidateDirectories) {
      const latestJsonPath = path.join(directory, "latest.json");
      const directLoad = tryLoadReport(latestJsonPath);
      if (directLoad) {
        console.log(`[DataLoader] Loaded data from ${latestJsonPath}`);
        return directLoad;
      }
    }

    // Fallback: find most recent timestamped file in each directory
    for (const directory of candidateDirectories) {
      const fallbackLoad = tryLoadMostRecentReport(directory);
      if (fallbackLoad) {
        console.log(`[DataLoader] Loaded data from latest timestamped report in ${directory}`);
        return fallbackLoad;
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

function resolveReportDirectories(): string[] {
  const directories = new Set<string>();

  // Dashboard local data directory used for browser fetches
  directories.add(path.join(process.cwd(), "src", "data"));

  const configOutputDir = loadOutputDirFromConfig();
  if (configOutputDir) {
    directories.add(configOutputDir);
  }

  // Default fallback to ../results for backward compatibility
  directories.add(path.join(process.cwd(), "..", "results"));

  return Array.from(directories);
}

function loadOutputDirFromConfig(): string | null {
  // Look for config files in the project root (parent of report-dashboard)
  const projectRoot = path.join(process.cwd(), "..");
  const possibleConfigs = [
    path.join(projectRoot, "flow-test.config.yml"),
    path.join(projectRoot, "flow-test.config.yaml"),
    path.join(projectRoot, "flow-test.config.json"),
  ];

  for (const configPath of possibleConfigs) {
    if (!fs.existsSync(configPath)) continue;

    try {
      const rawConfig = fs.readFileSync(configPath, "utf-8");
      const extension = path.extname(configPath).toLowerCase();
      let parsedConfig: FlowTestConfig | null = null;

      if (extension === ".yml" || extension === ".yaml") {
        parsedConfig = parse(rawConfig) as FlowTestConfig;
      } else if (extension === ".json") {
        parsedConfig = JSON.parse(rawConfig) as FlowTestConfig;
      }

      const outputDir =
        parsedConfig?.reporting?.output_dir ?? "./results";

      if (outputDir) {
        const resolvedPath = path.resolve(path.dirname(configPath), outputDir);
        console.log(
          `[DataLoader] Resolved report output directory from ${path.basename(
            configPath
          )}: ${resolvedPath}`
        );
        return resolvedPath;
      }
    } catch (error) {
      console.warn(
        `[DataLoader] Failed to parse configuration at ${configPath}:`,
        error
      );
    }
  }

  return null;
}

function tryLoadReport(filePath: string): ReportData | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);
    persistReportSnapshot(filePath, rawData);
    return data as ReportData;
  } catch (error) {
    console.warn(`[DataLoader] Failed to read report at ${filePath}:`, error);
    return null;
  }
}

function tryLoadMostRecentReport(directory: string): ReportData | null {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const entries = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json") && file !== "latest.json")
    .map((file) => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      return { filePath, mtime: stats.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const entry of entries) {
    const data = tryLoadReport(entry.filePath);
    if (data) {
      return data;
    }
  }

  return null;
}

function persistReportSnapshot(sourcePath: string, rawData: string): void {
  try {
    const publicDataDir = path.join(process.cwd(), "public", "data");
    fs.mkdirSync(publicDataDir, { recursive: true });
    const destinationPath = path.join(publicDataDir, "latest.json");
    fs.writeFileSync(destinationPath, rawData, "utf-8");
    // Ensure the original report is available alongside the public copy for debugging
    if (sourcePath !== destinationPath) {
      const cachedDir = path.join(process.cwd(), ".cache", "reports");
      fs.mkdirSync(cachedDir, { recursive: true });
      fs.writeFileSync(
        path.join(cachedDir, path.basename(sourcePath)),
        rawData,
        "utf-8"
      );
    }
  } catch (error) {
    console.warn("[DataLoader] Failed to persist report snapshot:", error);
  }
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
