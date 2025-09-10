import fs from "fs";
import path from "path";
import { ConfigManager } from "../core/config";
import { AggregatedResult, ReportFormat } from "../types/engine.types";
import { getLogger } from "./logger.service";

/**
 * Service for generating reports in multiple formats
 */
export class ReportingService {
  private configManager: ConfigManager;
  private logger = getLogger();

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
        this.logger.error(`Failed to generate ${format} report`, {
          error: error as Error,
        });
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
        this.logger.warn(`Unknown report format: ${format}`);
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
    this.logger.info(`JSON report: ${filePath}`);

    // Saves copy as latest.json
    fs.writeFileSync(latestPath, jsonContent, "utf8");
    this.logger.info(`Latest JSON: ${latestPath}`);
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
    this.logger.info(`JUnit report: ${filePath}`);

    // Saves copy as latest.xml
    fs.writeFileSync(latestPath, xml, "utf8");
    this.logger.info(`Latest JUnit: ${latestPath}`);
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
    this.logger.info(`HTML report: ${filePath}`);

    // Saves copy as latest.html
    fs.writeFileSync(latestPath, html, "utf8");
    this.logger.info(`Latest HTML: ${latestPath}`);
  }

  /**
   * Generates console report
   */
  private generateConsoleReport(result: AggregatedResult): void {
    this.logger.info(`\n📋 Detailed Console Report`);
    this.logger.info(`═══════════════════════════`);

    // Summary section
    this.logger.info(`\n📊 Summary:`);
    this.logger.info(`   Project: ${result.project_name}`);
    this.logger.info(
      `   Duration: ${this.formatDuration(result.total_duration_ms)}`
    );
    this.logger.info(`   Success Rate: ${result.success_rate.toFixed(1)}%`);
    this.logger.info(
      `   Tests: ${result.successful_tests}✅ ${result.failed_tests}❌ ${result.skipped_tests}⏭️`
    );

    // Performance section
    if (result.performance_summary) {
      const perf = result.performance_summary;
      this.logger.info(`\n🚀 Performance:`);
      this.logger.info(`   Total Requests: ${perf.total_requests}`);
      this.logger.info(
        `   Avg Response Time: ${perf.average_response_time_ms.toFixed(0)}ms`
      );
      this.logger.info(
        `   Min/Max Response: ${perf.min_response_time_ms}ms / ${perf.max_response_time_ms}ms`
      );
      this.logger.info(
        `   Requests/Second: ${perf.requests_per_second.toFixed(1)}`
      );

      if (perf.slowest_endpoints && perf.slowest_endpoints.length > 0) {
        this.logger.info(`\n🐌 Slowest Endpoints:`);
        perf.slowest_endpoints.slice(0, 3).forEach((endpoint, index) => {
          this.logger.info(
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
      this.logger.info(`\n📋 Suite Details:`);
      result.suites_results.forEach((suite, index) => {
        const status =
          suite.status === "success"
            ? "✅"
            : suite.status === "failure"
            ? "❌"
            : "⏭️";
        this.logger.info(
          `   ${index + 1}. ${status} ${suite.suite_name} (${
            suite.duration_ms
          }ms)`
        );

        if (suite.status === "failure" && suite.error_message) {
          this.logger.error(`Error: ${suite.error_message}`);
        }

        if (suite.steps_failed > 0) {
          this.logger.warn(
            `Failed Steps: ${suite.steps_failed}/${suite.steps_executed}`
          );
        }
      });
    }

    // Variables state
    if (
      result.global_variables_final_state &&
      Object.keys(result.global_variables_final_state).length > 0
    ) {
      this.logger.info(`\n🔧 Final Variables State:`);
      Object.entries(result.global_variables_final_state).forEach(
        ([key, value]) => {
          const displayValue =
            typeof value === "string" ? value : JSON.stringify(value);
          const truncated =
            displayValue.length > 50
              ? displayValue.substring(0, 47) + "..."
              : displayValue;
          this.logger.info(`   ${key}: ${truncated}`);
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
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow-x: auto; }
        .header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #343a40; margin: 0; font-size: 2.5em; font-weight: 300; }
        .subtitle { color: #6c757d; margin: 5px 0 0 0; font-size: 1.2em; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid ${statusColor}; }
        .metric-value { font-size: 2em; font-weight: bold; color: ${statusColor}; margin: 0; }
        .metric-label { color: #6c757d; margin: 5px 0 0 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px; }
        .suite { border: 1px solid #e9ecef; border-radius: 6px; margin: 15px 0; overflow: hidden; }
        .suite-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .suite-name { font-weight: 600; color: #343a40; }
        .suite-status { padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 500; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failure { background: #f8d7da; color: #721c24; }
        .status-skipped { background: #fff3cd; color: #856404; }
        .suite-details { padding: 15px 20px; background: white; }
        .suite-toggle { font-size: 1.2em; color: #6c757d; transition: transform 0.2s; }
        .suite-toggle.expanded { transform: rotate(90deg); }
        .suite-content { display: none; }
        .suite-content.expanded { display: block; }
        .performance { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 30px 0; }
        .performance h3 { margin-top: 0; color: #1976d2; }
        .perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .perf-item { text-align: center; }
        .perf-value { font-size: 1.4em; font-weight: bold; color: #1976d2; }
        .perf-label { font-size: 0.9em; color: #666; }
        .timestamp { color: #6c757d; font-size: 0.9em; margin-top: 20px; text-align: center; }
        .step { border: 1px solid #e9ecef; border-radius: 4px; margin: 10px 0; background: #fafafa; }
        .step-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .step-name { font-weight: 500; color: #343a40; }
        .step-status { padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 500; }
        .step-toggle { font-size: 1em; color: #6c757d; transition: transform 0.2s; }
        .step-toggle.expanded { transform: rotate(90deg); }
        .step-content { display: none; padding: 15px; }
        .step-content.expanded { display: block; }
        .request-response { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .request, .response { background: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef; overflow: hidden; }
        .request h4, .response h4 { margin: 0 0 10px 0; color: #495057; font-size: 1em; }
        .code-block { background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.85em; overflow-x: auto; overflow-y: auto; max-height: 400px; white-space: pre-wrap; word-break: break-all; line-height: 1.4; }
        .assertion { margin: 5px 0; padding: 8px; border-radius: 4px; font-size: 0.9em; }
        .assertion.pass { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .assertion.fail { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .variables { background: #e7f3ff; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .variables h5 { margin: 0 0 8px 0; color: #0066cc; font-size: 0.9em; }
        .variable-item { font-family: monospace; font-size: 0.85em; margin: 2px 0; }
        .error-message { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; border: 1px solid #f5c6cb; margin: 10px 0; }
    </style>
    <script>
        function toggleSuite(element) {
            // Navegar da suite-header para suite-content
            const suiteElement = element.closest('.suite');
            const content = suiteElement.querySelector('.suite-content');
            const toggle = suiteElement.querySelector('.suite-toggle');

            if (content && toggle) {
                content.classList.toggle('expanded');
                toggle.classList.toggle('expanded');
            }
        }

        function toggleStep(element) {
            const stepElement = element.closest('.step');
            const content = stepElement.querySelector('.step-content');
            const toggle = stepElement.querySelector('.step-toggle');

            if (content && toggle) {
                content.classList.toggle('expanded');
                toggle.classList.toggle('expanded');
            }
        }
    </script>
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
   * Builds step section for HTML
   */
  private buildStepSection(step: any, index: number): string {
    const statusClass = `status-${step.status}`;
    const statusIcon =
      step.status === "success"
        ? "✅"
        : step.status === "failure"
        ? "❌"
        : "⏭️";

    const requestHtml = step.request_details
      ? this.buildRequestSection(step.request_details)
      : "";
    const responseHtml = step.response_details
      ? this.buildResponseSection(step.response_details)
      : "";
    const assertionsHtml = step.assertions_results
      ? this.buildAssertionsSection(step.assertions_results)
      : "";
    const variablesHtml = step.captured_variables
      ? this.buildVariablesSection(step.captured_variables)
      : "";
    const errorHtml = step.error_message
      ? `<div class="error-message"><strong>Error:</strong> ${this.escapeHtml(
          step.error_message
        )}</div>`
      : "";

    const requestResponseHtml =
      requestHtml || responseHtml
        ? `
        <div class="request-response">
            ${requestHtml}
            ${responseHtml}
        </div>`
        : "";

    return `
        <div class="step">
            <div class="step-header" onclick="toggleStep(this)">
                <div class="step-name">${index + 1}. ${this.escapeHtml(
      step.step_name
    )}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="step-status ${statusClass}">${statusIcon} ${
      step.status
    }</div>
                    <div class="step-toggle">▶</div>
                </div>
            </div>
            <div class="step-content">
                <div style="margin-bottom: 10px;">
                    <strong>Duration:</strong> ${step.duration_ms}ms
                </div>
                ${errorHtml}
                ${requestResponseHtml}
                ${assertionsHtml}
                ${variablesHtml}
            </div>
        </div>`;
  }

  /**
   * Builds request section for HTML
   */
  private buildRequestSection(request: any): string {
    const headers = request.headers
      ? Object.entries(request.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";
    const body = request.body ? JSON.stringify(request.body, null, 2) : "";

    return `
        <div class="request">
            <h4>📤 Request</h4>
            <div><strong>Method:</strong> ${request.method}</div>
            <div><strong>URL:</strong> ${this.escapeHtml(request.url)}</div>
            ${
              headers
                ? `<div><strong>Headers:</strong></div><div class="code-block">${this.escapeHtml(
                    headers
                  )}</div>`
                : ""
            }
            ${
              body
                ? `<div><strong>Body:</strong></div><div class="code-block">${this.escapeHtml(
                    body
                  )}</div>`
                : ""
            }
        </div>`;
  }

  /**
   * Builds response section for HTML
   */
  private buildResponseSection(response: any): string {
    const headers = Object.entries(response.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const body =
      typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body, null, 2);

    return `
        <div class="response">
            <h4>📥 Response</h4>
            <div><strong>Status:</strong> ${response.status_code}</div>
            <div><strong>Size:</strong> ${response.size_bytes} bytes</div>
            <div><strong>Headers:</strong></div>
            <div class="code-block">${this.escapeHtml(headers)}</div>
            <div><strong>Body:</strong></div>
            <div class="code-block">${this.escapeHtml(body)}</div>
        </div>`;
  }

  /**
   * Builds assertions section for HTML
   */
  private buildAssertionsSection(assertions: any[]): string {
    if (assertions.length === 0) return "";

    const assertionsHtml = assertions
      .map(
        (assertion) => `
        <div class="assertion ${assertion.passed ? "pass" : "fail"}">
            <strong>${this.escapeHtml(assertion.field)}:</strong>
            Expected: ${this.escapeHtml(JSON.stringify(assertion.expected))}
            Actual: ${this.escapeHtml(JSON.stringify(assertion.actual))}
            ${
              assertion.message
                ? `<br><em>${this.escapeHtml(assertion.message)}</em>`
                : ""
            }
        </div>`
      )
      .join("");

    return `
        <div>
            <h4 style="margin: 15px 0 10px 0; color: #495057;">🧪 Assertions</h4>
            ${assertionsHtml}
        </div>`;
  }

  /**
   * Builds variables section for HTML
   */
  private buildVariablesSection(variables: Record<string, any>): string {
    const variablesHtml = Object.entries(variables)
      .map(
        ([key, value]) => `
        <div class="variable-item"><strong>${key}:</strong> ${this.escapeHtml(
          JSON.stringify(value)
        )}</div>`
      )
      .join("");

    return `
        <div class="variables">
            <h5>📋 Captured Variables</h5>
            ${variablesHtml}
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

    const stepsHtml = suite.steps_results
      ? suite.steps_results
          .map((step: any, index: number) => this.buildStepSection(step, index))
          .join("")
      : "";

    return `
        <div class="suite">
            <div class="suite-header" onclick="toggleSuite(this)">
                <div class="suite-name">${this.escapeHtml(
                  suite.suite_name
                )}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="suite-status ${statusClass}">${statusIcon} ${
      suite.status
    }</div>
                    <div class="suite-toggle">▶</div>
                </div>
            </div>
            <div class="suite-details">
                <strong>Duration:</strong> ${suite.duration_ms}ms<br>
                <strong>Steps:</strong> ${suite.steps_successful}/${
      suite.steps_executed
    } successful<br>
                <strong>File:</strong> ${this.escapeHtml(suite.file_path)}
                ${
                  suite.error_message
                    ? `<br><div class="error-message"><strong>Error:</strong> ${this.escapeHtml(
                        suite.error_message
                      )}</div>`
                    : ""
                }
            </div>
            <div class="suite-content">
                <div style="padding: 15px 20px; border-top: 1px solid #e9ecef;">
                    <h4 style="margin: 0 0 15px 0; color: #495057;">Test Steps</h4>
                    ${stepsHtml}
                </div>
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
