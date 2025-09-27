/**
 * @fileoverview Reporting service responsible for persisting execution results as JSON.
 *
 * @remarks
 * With the introduction of the standalone report dashboard, the core engine now
 * focuses solely on producing the canonical JSON artifact. Consumers that need
 * HTML or other visualizations should rely on the dashboard project to transform
 * the generated JSON file.
 */

import fs from "fs";
import path from "path";
import { ConfigManager } from "../core/config";
import {
  AggregatedResult,
  AssertionResult,
  SuiteExecutionResult,
} from "../types/engine.types";
import { getLogger } from "./logger.service";

interface HtmlReportAsset {
  type: "html";
  scope: "aggregate" | "suite";
  absolutePath: string;
  relativePath: string;
  fileName: string;
  suite?: {
    node_id: string;
    suite_name: string;
  };
}

interface SuiteHtmlEntry {
  suite: SuiteExecutionResult;
  fileName: string;
}

export class ReportingService {
  private configManager: ConfigManager;
  private logger = getLogger();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Generates all configured reports. The only supported format is JSON.
   */
  async generateReports(result: AggregatedResult): Promise<void> {
    const config = this.configManager.getConfig();
    const reportingConfig = config.reporting!;
    const outputDir = reportingConfig.output_dir;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = this.generateTimestamp();
    const baseName =
      this.sanitizeFileName(result.project_name) || "flow-test-report";
    const formats = reportingConfig.formats || ["json"];

    const assets: HtmlReportAsset[] = [];

    if (formats.includes("html")) {
      assets.push(
        ...this.generateHtmlReports(result, outputDir, baseName, timestamp)
      );
    }

    if (formats.includes("json")) {
      await this.generateJsonReport(
        result,
        outputDir,
        baseName,
        timestamp,
        assets
      );
    }
  }

  /**
   * Persists the aggregated result as JSON and keeps a copy named `latest.json`.
   */
  private async generateJsonReport(
    result: AggregatedResult,
    outputDir: string,
    baseName: string,
    timestamp: string,
    assets: HtmlReportAsset[]
  ): Promise<void> {
    const fileName = `${baseName}_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);
    const latestPath = path.join(outputDir, "latest.json");

    const reportData = {
      ...result,
      report_metadata: {
        generated_at: new Date().toISOString(),
        format: "json",
        version: "1.0.0",
        run_id: timestamp,
        assets: assets.map((asset) => ({
          type: asset.type,
          scope: asset.scope,
          file: asset.relativePath.replace(/\\/g, "/"),
          file_name: asset.fileName,
          suite_name: asset.suite?.suite_name,
          node_id: asset.suite?.node_id,
        })),
      },
    };

    const jsonContent = JSON.stringify(reportData, null, 2);

    fs.writeFileSync(filePath, jsonContent, "utf8");
    this.logger.info(`JSON report: ${filePath}`);

    fs.writeFileSync(latestPath, jsonContent, "utf8");
    this.logger.info(`Latest JSON: ${latestPath}`);
  }

  private generateHtmlReports(
    result: AggregatedResult,
    outputDir: string,
    baseName: string,
    timestamp: string
  ): HtmlReportAsset[] {
    const htmlConfig = this.configManager.getConfig().reporting?.html || {};
    const htmlRoot = path.join(outputDir, htmlConfig.output_subdir || "html");
    fs.mkdirSync(htmlRoot, { recursive: true });

    const runDir = path.join(htmlRoot, timestamp);
    fs.mkdirSync(runDir, { recursive: true });

    const generatedAt = new Date().toISOString();
    const assets: HtmlReportAsset[] = [];
    const suiteEntries: SuiteHtmlEntry[] = [];

    if (htmlConfig.per_suite !== false) {
      result.suites_results.forEach((suite, index) => {
        const sanitizedName =
          this.sanitizeFileName(suite.node_id || suite.suite_name) ||
          `suite-${index + 1}`;
        const fileName = `${sanitizedName}.html`;
        const filePath = path.join(runDir, fileName);
        const suiteHtml = this.renderSuiteHtml(suite, {
          generatedAt,
          projectName: result.project_name,
        });
        fs.writeFileSync(filePath, suiteHtml, "utf8");

        const asset: HtmlReportAsset = {
          type: "html",
          scope: "suite",
          absolutePath: filePath,
          relativePath: path.relative(outputDir, filePath),
          fileName,
          suite: {
            node_id: suite.node_id,
            suite_name: suite.suite_name,
          },
        };

        assets.push(asset);
        suiteEntries.push({ suite, fileName });
        this.logger.info(`HTML report (suite): ${filePath}`);
      });
    }

    if (htmlConfig.aggregate !== false) {
      const summaryFileName = baseName
        ? `${baseName}-summary.html`
        : "summary.html";
      const summaryPath = path.join(runDir, summaryFileName);
      const summaryHtml = this.renderSummaryHtml(result, suiteEntries, {
        generatedAt,
        timestamp,
      });
      fs.writeFileSync(summaryPath, summaryHtml, "utf8");

      const aggregateAsset: HtmlReportAsset = {
        type: "html",
        scope: "aggregate",
        absolutePath: summaryPath,
        relativePath: path.relative(outputDir, summaryPath),
        fileName: summaryFileName,
      };

      assets.unshift(aggregateAsset);
      this.logger.info(`HTML report (summary): ${summaryPath}`);
    }

    this.createLatestHtmlSnapshot(htmlRoot, assets);

    return assets;
  }

  private renderSummaryHtml(
    result: AggregatedResult,
    suiteEntries: SuiteHtmlEntry[],
    context: { generatedAt: string; timestamp: string }
  ): string {
    const linkMap = new Map<string, string>();
    suiteEntries.forEach((entry) => {
      linkMap.set(entry.suite.node_id, entry.fileName);
    });

    const rows = result.suites_results
      .map((suite, index) => {
        const link = linkMap.get(suite.node_id);
        const linkHtml = link
          ? `<a class="link" href="${this.escapeHtml(link)}">Open</a>`
          : "—";
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(suite.suite_name)}</td>
            <td><span class="status-badge ${this.getStatusClass(
              suite.status
            )}">${this.escapeHtml(suite.status.toUpperCase())}</span></td>
            <td>${this.escapeHtml(this.formatDuration(suite.duration_ms))}</td>
            <td>${suite.steps_successful}/${suite.steps_executed}</td>
            <td>${this.escapeHtml(suite.success_rate.toFixed(2))}%</td>
            <td>${linkHtml}</td>
          </tr>
        `;
      })
      .join("\n");

    const tableBody =
      rows.trim().length > 0
        ? rows
        : '<tr><td colspan="7" class="empty">No suites were executed.</td></tr>';

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(result.project_name)} - Summary</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        --success: #0f766e;
        --failure: #dc2626;
        --skipped: #f97316;
        --border: rgba(148, 163, 184, 0.4);
        --bg: rgba(15, 23, 42, 0.04);
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      body {
        margin: 0 auto;
        padding: 2rem;
        max-width: 1100px;
        background: #f8fafc;
        color: #0f172a;
      }
      h1 {
        margin-bottom: 0.25rem;
      }
      h2 {
        margin-top: 2rem;
      }
      .meta {
        color: #475569;
        font-size: 0.95rem;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .card {
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        padding: 1rem;
        background: white;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1.5rem;
        overflow: hidden;
        border-radius: 0.75rem;
      }
      thead {
        background: #0f172a;
        color: white;
      }
      th,
      td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border);
      }
      tbody tr:nth-child(even) {
        background: var(--bg);
      }
      .status-badge {
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        display: inline-block;
      }
      .status-success {
        background: rgba(16, 185, 129, 0.15);
        color: #065f46;
      }
      .status-failure {
        background: rgba(248, 113, 113, 0.2);
        color: #7f1d1d;
      }
      .status-skipped {
        background: rgba(251, 191, 36, 0.2);
        color: #92400e;
      }
      .link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 600;
      }
      .link:hover {
        text-decoration: underline;
      }
      .empty {
        text-align: center;
        padding: 2rem 1rem;
        color: #64748b;
      }
      footer {
        margin-top: 3rem;
        color: #64748b;
        font-size: 0.85rem;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Flow Test Summary – ${this.escapeHtml(result.project_name)}</h1>
      <p class="meta">Generated at ${this.escapeHtml(
        context.generatedAt
      )} • Run ID ${this.escapeHtml(context.timestamp)}</p>
    </header>

    <section class="summary-grid">
      <div class="card">
        <div class="meta">Total Suites</div>
        <div><strong>${result.total_tests}</strong></div>
      </div>
      <div class="card">
        <div class="meta">Success Rate</div>
        <div><strong>${this.escapeHtml(
          result.success_rate.toFixed(2)
        )}%</strong></div>
      </div>
      <div class="card">
        <div class="meta">Duration</div>
        <div><strong>${this.escapeHtml(
          this.formatDuration(result.total_duration_ms)
        )}</strong></div>
      </div>
      <div class="card">
        <div class="meta">Outcome</div>
        <div><strong>${
          result.failed_tests > 0 ? "Failed" : "Passed"
        }</strong></div>
      </div>
    </section>

    <h2>Suite Overview</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Suite</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Steps Passed</th>
          <th>Success Rate</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${tableBody}
      </tbody>
    </table>

    <footer>
      Generated by Flow Test Engine. Built for reproducible API testing flows.
    </footer>
  </body>
</html>`;
  }

  private renderSuiteHtml(
    suite: SuiteExecutionResult,
    context: { generatedAt: string; projectName: string }
  ): string {
    const steps = suite.steps_results
      .map((step, index) => {
        const assertionsSummary = this.formatAssertionsSummary(
          step.assertions_results
        );
        const detailSections: string[] = [];

        if (step.request_details) {
          detailSections.push(`
            <section>
              <h4>Request</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.request_details)
              )}</pre>
            </section>
          `);
        }

        if (step.response_details) {
          detailSections.push(`
            <section>
              <h4>Response</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.response_details)
              )}</pre>
            </section>
          `);
        }

        if (
          step.captured_variables &&
          Object.keys(step.captured_variables).length > 0
        ) {
          detailSections.push(`
            <section>
              <h4>Captured Variables</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.captured_variables)
              )}</pre>
            </section>
          `);
        }

        if (step.input_results && step.input_results.length > 0) {
          detailSections.push(`
            <section>
              <h4>Inputs</h4>
              <pre>${this.escapeHtml(this.formatJson(step.input_results))}</pre>
            </section>
          `);
        }

        if (step.dynamic_assignments && step.dynamic_assignments.length > 0) {
          detailSections.push(`
            <section>
              <h4>Dynamic Assignments</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.dynamic_assignments)
              )}</pre>
            </section>
          `);
        }

        if (step.iteration_results && step.iteration_results.length > 0) {
          detailSections.push(`
            <section>
              <h4>Iteration Results (${step.iteration_results.length})</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.iteration_results)
              )}</pre>
            </section>
          `);
        }

        if (step.scenarios_meta) {
          detailSections.push(`
            <section>
              <h4>Scenario Metadata</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.scenarios_meta)
              )}</pre>
            </section>
          `);
        }

        const details =
          detailSections.length > 0
            ? `<details><summary>View</summary>${detailSections.join(
                ""
              )}</details>`
            : "—";

        const errorMessage = step.error_message
          ? this.escapeHtml(step.error_message)
          : "—";

        const stepIdDisplay = step.step_id
          ? `<div class="step-id">ID: ${this.escapeHtml(step.step_id)}</div>`
          : "";
        const qualifiedIdDisplay =
          step.qualified_step_id && step.qualified_step_id !== step.step_id
            ? `<div class="step-id subtle">${this.escapeHtml(
                step.qualified_step_id
              )}</div>`
            : "";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="step-name">${this.escapeHtml(step.step_name)}</div>
              ${stepIdDisplay}
              ${qualifiedIdDisplay}
            </td>
            <td><span class="status-badge ${this.getStatusClass(
              step.status
            )}">${this.escapeHtml(step.status.toUpperCase())}</span></td>
            <td>${this.escapeHtml(this.formatDuration(step.duration_ms))}</td>
            <td>${this.escapeHtml(assertionsSummary)}</td>
            <td>${errorMessage}</td>
            <td>${details}</td>
          </tr>
        `;
      })
      .join("\n");

    const body =
      steps.trim().length > 0
        ? steps
        : '<tr><td colspan="7" class="empty">No steps were executed.</td></tr>';

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(suite.suite_name)} - Flow Test Report</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        --success: #0f766e;
        --failure: #dc2626;
        --skipped: #f97316;
        --border: rgba(148, 163, 184, 0.4);
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      body {
        margin: 0 auto;
        padding: 2rem;
        max-width: 1100px;
        background: #f8fafc;
        color: #0f172a;
      }
      header h1 {
        margin-bottom: 0.25rem;
      }
      header .meta {
        color: #475569;
        font-size: 0.95rem;
      }
      .step-name {
        font-weight: 600;
      }
      .step-id {
        font-size: 0.75rem;
        color: #475569;
      }
      .step-id.subtle {
        color: #94a3b8;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 2rem;
        border-radius: 0.75rem;
        overflow: hidden;
      }
      thead {
        background: #0f172a;
        color: white;
      }
      th,
      td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
      }
      tr:nth-child(even) {
        background: rgba(15, 23, 42, 0.04);
      }
      .status-badge {
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        display: inline-block;
      }
      .status-success {
        background: rgba(16, 185, 129, 0.15);
        color: #065f46;
      }
      .status-failure {
        background: rgba(248, 113, 113, 0.2);
        color: #7f1d1d;
      }
      .status-skipped {
        background: rgba(251, 191, 36, 0.2);
        color: #92400e;
      }
      section {
        margin-bottom: 1rem;
      }
      h4 {
        margin: 0.5rem 0;
      }
      pre {
        background: #0f172a;
        color: #f8fafc;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
      }
      details {
        cursor: pointer;
      }
      .empty {
        text-align: center;
        padding: 2rem 1rem;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${this.escapeHtml(suite.suite_name)}</h1>
      <p class="meta">Project ${this.escapeHtml(
        context.projectName
      )} • Generated ${this.escapeHtml(
      context.generatedAt
    )} • Status <span class="status-badge ${this.getStatusClass(
      suite.status
    )}">${this.escapeHtml(suite.status.toUpperCase())}</span></p>
      <p class="meta">Duration ${this.escapeHtml(
        this.formatDuration(suite.duration_ms)
      )} • Steps ${suite.steps_successful}/${suite.steps_executed}</p>
    </header>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Step</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Assertions</th>
          <th>Error</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>
  </body>
</html>`;
  }

  private createLatestHtmlSnapshot(
    htmlRoot: string,
    assets: HtmlReportAsset[]
  ): void {
    const latestDir = path.join(htmlRoot, "latest");
    if (fs.existsSync(latestDir)) {
      fs.rmSync(latestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(latestDir, { recursive: true });

    for (const asset of assets) {
      const destinationPath = path.join(latestDir, asset.fileName);
      fs.copyFileSync(asset.absolutePath, destinationPath);
    }
  }

  private escapeHtml(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private formatJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  private formatDuration(durationMs: number): string {
    if (!Number.isFinite(durationMs)) {
      return "n/a";
    }

    if (durationMs >= 1000) {
      return `${(durationMs / 1000).toFixed(2)} s`;
    }

    return `${durationMs.toFixed(0)} ms`;
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case "success":
        return "status-success";
      case "failure":
        return "status-failure";
      default:
        return "status-skipped";
    }
  }

  private formatAssertionsSummary(assertions?: AssertionResult[]): string {
    if (!assertions || assertions.length === 0) {
      return "—";
    }

    const passed = assertions.filter((assertion) => assertion.passed).length;
    return `${passed}/${assertions.length}`;
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
}
