import fs from "fs";
import path from "path";
import { ConfigManager } from "../core/config";
import { AggregatedResult, ReportFormat } from "../types/engine.types";

/**
 * Service for generating reports in multiple formats
 */
export class ReportingService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Generates all configured reports
   */
  async generateReports(result: AggregatedResult): Promise<void> {
    const config = this.configManager.getConfig();
    const formats = config.reporting!.formats;
    const outputDir = config.reporting!.output_dir;

    // Ensures output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generates timestamp for unique file names
    const timestamp = this.generateTimestamp();
    const baseName = this.sanitizeFileName(result.project_name);

    // Generates each requested format
    for (const format of formats) {
      try {
        await this.generateReport(
          result,
          format,
          outputDir,
          baseName,
          timestamp
        );
      } catch (error) {
        console.error(`❌ Failed to generate ${format} report: ${error}`);
      }
    }
  }

  /**
   * Generates a specific report
   */
  private async generateReport(
    result: AggregatedResult,
    format: ReportFormat,
    outputDir: string,
    baseName: string,
    timestamp: string
  ): Promise<void> {
    switch (format) {
      case "json":
        await this.generateJsonReport(result, outputDir, baseName, timestamp);
        break;
      case "junit":
        await this.generateJunitReport(result, outputDir, baseName, timestamp);
        break;
      case "html":
        await this.generateHtmlReport(result, outputDir, baseName, timestamp);
        break;
      case "console":
        this.generateConsoleReport(result);
        break;
      default:
        console.warn(`⚠️  Unknown report format: ${format}`);
    }
  }

  /**
   * Generates JSON report
   */
  private async generateJsonReport(
    result: AggregatedResult,
    outputDir: string,
    baseName: string,
    timestamp: string
  ): Promise<void> {
    const fileName = `${baseName}_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);
    const latestPath = path.join(outputDir, "latest.json");

    const reportData = {
      ...result,
      report_metadata: {
        generated_at: new Date().toISOString(),
        format: "json",
        version: "2.0.0",
      },
    };

    const jsonContent = JSON.stringify(reportData, null, 2);

    // Saves file with timestamp
    fs.writeFileSync(filePath, jsonContent, "utf8");
    console.log(`📄 JSON report: ${filePath}`);

    // Saves copy as latest.json
    fs.writeFileSync(latestPath, jsonContent, "utf8");
    console.log(`📄 Latest JSON: ${latestPath}`);
  }

  /**
   * Generates JUnit XML report
   */
  private async generateJunitReport(
    result: AggregatedResult,
    outputDir: string,
    baseName: string,
    timestamp: string
  ): Promise<void> {
    const fileName = `${baseName}_${timestamp}.xml`;
    const filePath = path.join(outputDir, fileName);
    const latestPath = path.join(outputDir, "latest.xml");

    const xml = this.buildJunitXml(result);

    // Saves file with timestamp
    fs.writeFileSync(filePath, xml, "utf8");
    console.log(`📄 JUnit report: ${filePath}`);

    // Saves copy as latest.xml
    fs.writeFileSync(latestPath, xml, "utf8");
    console.log(`📄 Latest JUnit: ${latestPath}`);
  }

  /**
   * Generates HTML report
   */
  private async generateHtmlReport(
    result: AggregatedResult,
    outputDir: string,
    baseName: string,
    timestamp: string
  ): Promise<void> {
    const fileName = `${baseName}_${timestamp}.html`;
    const filePath = path.join(outputDir, fileName);
    const latestPath = path.join(outputDir, "latest.html");

    const html = this.buildHtmlReport(result);

    // Saves file with timestamp
    fs.writeFileSync(filePath, html, "utf8");
    console.log(`📄 HTML report: ${filePath}`);

    // Saves copy as latest.html
    fs.writeFileSync(latestPath, html, "utf8");
    console.log(`📄 Latest HTML: ${latestPath}`);
  }

  /**
   * Generates console report
   */
  private generateConsoleReport(result: AggregatedResult): void {
    console.log(`\n📋 Detailed Console Report`);
    console.log(`═══════════════════════════`);

    // Summary section
    console.log(`\n📊 Summary:`);
    console.log(`   Project: ${result.project_name}`);
    console.log(
      `   Duration: ${this.formatDuration(result.total_duration_ms)}`
    );
    console.log(`   Success Rate: ${result.success_rate.toFixed(1)}%`);
    console.log(
      `   Tests: ${result.successful_tests}✅ ${result.failed_tests}❌ ${result.skipped_tests}⏭️`
    );

    // Performance section
    if (result.performance_summary) {
      const perf = result.performance_summary;
      console.log(`\n🚀 Performance:`);
      console.log(`   Total Requests: ${perf.total_requests}`);
      console.log(
        `   Avg Response Time: ${perf.average_response_time_ms.toFixed(0)}ms`
      );
      console.log(
        `   Min/Max Response: ${perf.min_response_time_ms}ms / ${perf.max_response_time_ms}ms`
      );
      console.log(`   Requests/Second: ${perf.requests_per_second.toFixed(1)}`);

      if (perf.slowest_endpoints && perf.slowest_endpoints.length > 0) {
        console.log(`\n🐌 Slowest Endpoints:`);
        perf.slowest_endpoints.slice(0, 3).forEach((endpoint, index) => {
          console.log(
            `   ${index + 1}. ${
              endpoint.url
            } (${endpoint.average_time_ms.toFixed(0)}ms avg, ${
              endpoint.call_count
            } calls)`
          );
        });
      }
    }

    // Suite details
    if (result.suites_results.length > 0) {
      console.log(`\n📋 Suite Details:`);
      result.suites_results.forEach((suite, index) => {
        const status =
          suite.status === "success"
            ? "✅"
            : suite.status === "failure"
            ? "❌"
            : "⏭️";
        console.log(
          `   ${index + 1}. ${status} ${suite.suite_name} (${
            suite.duration_ms
          }ms)`
        );

        if (suite.status === "failure" && suite.error_message) {
          console.log(`      ↳ Error: ${suite.error_message}`);
        }

        if (suite.steps_failed > 0) {
          console.log(
            `      ↳ Failed Steps: ${suite.steps_failed}/${suite.steps_executed}`
          );
        }
      });
    }

    // Variables state
    if (
      result.global_variables_final_state &&
      Object.keys(result.global_variables_final_state).length > 0
    ) {
      console.log(`\n🔧 Final Variables State:`);
      Object.entries(result.global_variables_final_state).forEach(
        ([key, value]) => {
          const displayValue =
            typeof value === "string" ? value : JSON.stringify(value);
          const truncated =
            displayValue.length > 50
              ? displayValue.substring(0, 47) + "..."
              : displayValue;
          console.log(`   ${key}: ${truncated}`);
        }
      );
    }
  }

  /**
   * Builds XML in JUnit format
   */
  private buildJunitXml(result: AggregatedResult): string {
    const totalTests = result.suites_results.length;
    const failures = result.failed_tests;
    const time = (result.total_duration_ms / 1000).toFixed(3);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuite name="${this.escapeXml(result.project_name)}" `;
    xml += `tests="${totalTests}" failures="${failures}" `;
    xml += `time="${time}" timestamp="${result.start_time}">\n`;

    result.suites_results.forEach((suite) => {
      const suiteTime = (suite.duration_ms / 1000).toFixed(3);
      xml += `  <testcase name="${this.escapeXml(suite.suite_name)}" `;
      xml += `classname="${this.escapeXml(suite.file_path)}" `;
      xml += `time="${suiteTime}"`;

      if (suite.status === "failure") {
        xml += `>\n`;
        xml += `    <failure message="${this.escapeXml(
          suite.error_message || "Test failed"
        )}">\n`;
        xml += `      <![CDATA[${
          suite.error_message || "No detailed error message available"
        }]]>\n`;
        xml += `    </failure>\n`;
        xml += `  </testcase>\n`;
      } else if (suite.status === "skipped") {
        xml += `>\n`;
        xml += `    <skipped/>\n`;
        xml += `  </testcase>\n`;
      } else {
        xml += `/>\n`;
      }
    });

    xml += `</testsuite>\n`;
    return xml;
  }

  /**
   * Builds HTML report
   */
  private buildHtmlReport(result: AggregatedResult): string {
    const successRate = result.success_rate;
    const statusColor =
      successRate >= 90 ? "#28a745" : successRate >= 70 ? "#ffc107" : "#dc3545";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flow Test Report - ${this.escapeHtml(result.project_name)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #343a40; margin: 0; font-size: 2.5em; font-weight: 300; }
        .subtitle { color: #6c757d; margin: 5px 0 0 0; font-size: 1.2em; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid ${statusColor}; }
        .metric-value { font-size: 2em; font-weight: bold; color: ${statusColor}; margin: 0; }
        .metric-label { color: #6c757d; margin: 5px 0 0 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px; }
        .suite { border: 1px solid #e9ecef; border-radius: 6px; margin: 15px 0; overflow: hidden; }
        .suite-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
        .suite-name { font-weight: 600; color: #343a40; }
        .suite-status { padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 500; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failure { background: #f8d7da; color: #721c24; }
        .status-skipped { background: #fff3cd; color: #856404; }
        .suite-details { padding: 15px 20px; background: white; }
        .performance { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 30px 0; }
        .performance h3 { margin-top: 0; color: #1976d2; }
        .perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .perf-item { text-align: center; }
        .perf-value { font-size: 1.4em; font-weight: bold; color: #1976d2; }
        .perf-label { font-size: 0.9em; color: #666; }
        .timestamp { color: #6c757d; font-size: 0.9em; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${this.escapeHtml(result.project_name)}</h1>
            <p class="subtitle">Test Execution Report</p>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${result.success_rate.toFixed(
                  1
                )}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.total_tests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.formatDuration(
                  result.total_duration_ms
                )}</div>
                <div class="metric-label">Duration</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.successful_tests}/${
      result.failed_tests
    }</div>
                <div class="metric-label">Pass/Fail</div>
            </div>
        </div>

        ${
          result.performance_summary
            ? this.buildPerformanceSection(result.performance_summary)
            : ""
        }

        <h3>Test Suites</h3>
        ${result.suites_results
          .map((suite) => this.buildSuiteSection(suite))
          .join("")}

        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
            <br>
            Execution: ${result.start_time} to ${result.end_time}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Builds performance section for HTML
   */
  private buildPerformanceSection(perf: any): string {
    return `
        <div class="performance">
            <h3>🚀 Performance Metrics</h3>
            <div class="perf-grid">
                <div class="perf-item">
                    <div class="perf-value">${perf.total_requests}</div>
                    <div class="perf-label">Requests</div>
                </div>
                <div class="perf-item">
                    <div class="perf-value">${perf.average_response_time_ms.toFixed(
                      0
                    )}ms</div>
                    <div class="perf-label">Avg Response</div>
                </div>
                <div class="perf-item">
                    <div class="perf-value">${perf.requests_per_second.toFixed(
                      1
                    )}</div>
                    <div class="perf-label">Req/Sec</div>
                </div>
                <div class="perf-item">
                    <div class="perf-value">${perf.min_response_time_ms}ms</div>
                    <div class="perf-label">Min Time</div>
                </div>
                <div class="perf-item">
                    <div class="perf-value">${perf.max_response_time_ms}ms</div>
                    <div class="perf-label">Max Time</div>
                </div>
            </div>
        </div>`;
  }

  /**
   * Builds suite section for HTML
   */
  private buildSuiteSection(suite: any): string {
    const statusClass = `status-${suite.status}`;
    const statusIcon =
      suite.status === "success"
        ? "✅"
        : suite.status === "failure"
        ? "❌"
        : "⏭️";

    return `
        <div class="suite">
            <div class="suite-header">
                <div class="suite-name">${this.escapeHtml(
                  suite.suite_name
                )}</div>
                <div class="suite-status ${statusClass}">${statusIcon} ${
      suite.status
    }</div>
            </div>
            <div class="suite-details">
                <strong>Duration:</strong> ${suite.duration_ms}ms<br>
                <strong>Steps:</strong> ${suite.steps_successful}/${
      suite.steps_executed
    } successful<br>
                <strong>File:</strong> ${this.escapeHtml(suite.file_path)}
                ${
                  suite.error_message
                    ? `<br><strong>Error:</strong> ${this.escapeHtml(
                        suite.error_message
                      )}`
                    : ""
                }
            </div>
        </div>`;
  }

  /**
   * Formatting utilities
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  }

  private generateTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace(/T/, "_")
      .slice(0, 19);
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }
}
