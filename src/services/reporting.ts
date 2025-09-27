/**
 * @fileoverview Reporting service responsible for persisting execution results as JSON and HTML.
 *
 * @remarks
 * Produces the canonical JSON artifact and a Postman-inspired HTML experience whenever
 * the html format is enabled through configuration or CLI overrides.
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

    const generatedAt = new Date().toISOString();
    const assets: HtmlReportAsset[] = [];
    const suiteEntries: SuiteHtmlEntry[] = [];

    if (htmlConfig.per_suite !== false) {
      result.suites_results.forEach((suite, index) => {
        const sanitizedName =
          this.sanitizeFileName(suite.node_id || suite.suite_name) ||
          `suite-${index + 1}`;
        const fileName = `${sanitizedName}_${timestamp}.html`;
        const filePath = path.join(htmlRoot, fileName);
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
        ? `${baseName}-summary_${timestamp}.html`
        : `summary_${timestamp}.html`;
      const summaryPath = path.join(htmlRoot, summaryFileName);
      const indexPath = path.join(htmlRoot, `index_${timestamp}.html`);
      const summaryHtml = this.renderSummaryHtml(result, suiteEntries, {
        generatedAt,
        timestamp,
      });

      fs.writeFileSync(indexPath, summaryHtml, "utf8");
      this.logger.info(`HTML report (summary): ${indexPath}`);

      if (summaryFileName !== `index_${timestamp}.html`) {
        fs.writeFileSync(summaryPath, summaryHtml, "utf8");
        this.logger.info(`HTML report (summary alias): ${summaryPath}`);
      }

      const aggregateAsset: HtmlReportAsset = {
        type: "html",
        scope: "aggregate",
        absolutePath: indexPath,
        relativePath: path.relative(outputDir, indexPath),
        fileName: `index_${timestamp}.html`,
      };

      assets.unshift(aggregateAsset);
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

    const totalSteps = result.suites_results.reduce(
      (acc, suite) => acc + suite.steps_executed,
      0
    );
    const passedSteps = result.suites_results.reduce(
      (acc, suite) => acc + suite.steps_successful,
      0
    );
    const failedSteps = result.suites_results.reduce(
      (acc, suite) => acc + suite.steps_failed,
      0
    );
    const skippedSteps = Math.max(0, totalSteps - passedSteps - failedSteps);
    const stepCoverage =
      totalSteps > 0 ? ((passedSteps / totalSteps) * 100).toFixed(1) : "0.0";

    const projectName = this.escapeHtml(result.project_name);
    const runIdLabel = this.escapeHtml(context.timestamp);
    const generatedAtLabel = this.escapeHtml(context.generatedAt);
    const startTimeLabel = this.escapeHtml(
      this.formatDateTime(result.start_time)
    );
    const endTimeLabel = this.escapeHtml(this.formatDateTime(result.end_time));
    const durationLabel = this.escapeHtml(
      this.formatDuration(result.total_duration_ms)
    );
    const totalSuitesLabel = this.escapeHtml(result.total_tests.toString());
    const successRateLabel = this.escapeHtml(result.success_rate.toFixed(2));
    const suitesPassedLabel = this.escapeHtml(
      result.successful_tests.toString()
    );
    const suitesFailedLabel = this.escapeHtml(result.failed_tests.toString());
    const suitesSkippedLabel = this.escapeHtml(result.skipped_tests.toString());
    const stepRatioLabel = this.escapeHtml(
      totalSteps > 0 ? `${passedSteps}/${totalSteps}` : "0/0"
    );
    const stepCoverageLabel = this.escapeHtml(
      totalSteps > 0 ? `${stepCoverage}% coverage` : "No steps executed"
    );
    const failedStepsLabel = this.escapeHtml(failedSteps.toString());
    const skippedStepsLabel = this.escapeHtml(skippedSteps.toString());

    const suitesMarkup = result.suites_results
      .map((suite, index) => {
        const link = linkMap.get(suite.node_id);
        const suiteName = this.escapeHtml(suite.suite_name);
        const nodeId = this.escapeHtml(suite.node_id);
        const statusClass = this.getStatusClass(suite.status);
        const statusLabel = this.escapeHtml(suite.status.toUpperCase());
        const priorityBadge = suite.priority
          ? `<span class="priority-badge">${this.escapeHtml(
              suite.priority
            )}</span>`
          : "";
        const stepsSummary = this.escapeHtml(
          `${suite.steps_successful}/${suite.steps_executed}`
        );
        const durationSummary = this.escapeHtml(
          this.formatDuration(suite.duration_ms)
        );
        const successSummary = this.escapeHtml(suite.success_rate.toFixed(2));
        const failureNotice =
          suite.steps_failed > 0
            ? `<div class="suite-card__alert suite-card__alert--danger">${this.escapeHtml(
                `${suite.steps_failed} failing step${
                  suite.steps_failed === 1 ? "" : "s"
                }`
              )}</div>`
            : "";
        const errorSection =
          suite.status === "failure" && suite.error_message
            ? `<p class="suite-card__error">${this.escapeHtml(
                suite.error_message
              )}</p>`
            : "";
        const linkMarkup = link
          ? `<a class="suite-link" href="${this.escapeHtml(
              link
            )}">Open report &rarr;</a>`
          : `<span class="suite-link suite-link--disabled">Per-suite HTML disabled</span>`;
        const windowLabel = this.escapeHtml(
          `${this.formatDateTime(suite.start_time)} - ${this.formatDateTime(
            suite.end_time
          )}`
        );

        return `
          <article class="suite-card">
            <header class="suite-card__header">
              <div class="suite-card__title">
                <span class="suite-index">#${index + 1}</span>
                <span class="suite-name">${suiteName}</span>
                ${priorityBadge}
              </div>
              <span class="status-pill ${statusClass}">${statusLabel}</span>
            </header>
            <div class="suite-card__stats">
              <div class="stat">
                <span class="stat-label">Steps</span>
                <span class="stat-value">${stepsSummary}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Duration</span>
                <span class="stat-value">${durationSummary}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Success</span>
                <span class="stat-value">${successSummary}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Node</span>
                <span class="stat-value stat-value--code">${nodeId}</span>
              </div>
            </div>
            <div class="suite-card__meta">
              <span class="meta-item">${windowLabel}</span>
              ${failureNotice}
            </div>
            ${errorSection}
            <footer class="suite-card__footer">
              ${linkMarkup}
            </footer>
          </article>
        `;
      })
      .join("\n");

    const suitesSection =
      suitesMarkup.trim().length > 0
        ? `<section class="suite-section">
            <h2>Suite Runs</h2>
            <div class="suite-grid">
${suitesMarkup}
            </div>
          </section>`
        : `<section class="suite-section">
            <div class="empty-state">
              No suites were executed for this run.
            </div>
          </section>`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${projectName} - Flow Test Report</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f1117;
        --surface: #161f2f;
        --surface-alt: #1c2639;
        --surface-soft: #1d2b40;
        --border: rgba(148, 163, 184, 0.18);
        --border-strong: rgba(148, 163, 184, 0.32);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #ff6c37;
        --accent-soft: rgba(255, 108, 55, 0.15);
        --success: #2dd4bf;
        --danger: #f87171;
        --warning: #facc15;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top right, rgba(255, 108, 55, 0.08), transparent 60%) var(--bg);
        color: var(--text);
        min-height: 100vh;
      }
      .layout {
        max-width: 1200px;
        margin: 0 auto;
        padding: 56px 40px 64px;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .hero {
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(12, 18, 28, 0.94));
        border: 1px solid var(--border-strong);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 30px 60px rgba(8, 15, 26, 0.45);
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
        font-size: 0.8rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .hero-title {
        margin: 14px 0 8px;
        font-size: 2.25rem;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .hero-subtitle,
      .hero-meta {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .hero-meta {
        margin-top: 4px;
      }
      .hero-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }
      .hero-stat {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        font-size: 0.95rem;
        font-weight: 600;
      }
      .hero-stat--success {
        border-color: rgba(45, 212, 191, 0.5);
        color: var(--success);
      }
      .hero-stat--danger {
        border-color: rgba(248, 113, 113, 0.5);
        color: var(--danger);
      }
      .hero-stat--neutral {
        border-color: rgba(148, 163, 184, 0.35);
        color: var(--muted);
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-top: 36px;
      }
      .metric-card {
        background: var(--surface);
        border-radius: 18px;
        border: 1px solid var(--border);
        padding: 20px 22px;
        box-shadow: 0 20px 40px rgba(8, 15, 26, 0.25);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .metric-card--accent {
        border-color: rgba(255, 108, 55, 0.45);
        box-shadow: 0 25px 55px rgba(255, 108, 55, 0.25);
      }
      .metric-card--success {
        border-color: rgba(45, 212, 191, 0.4);
      }
      .metric-label {
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .metric-subtext {
        font-size: 0.9rem;
        color: var(--muted);
      }
      .suite-section {
        margin-top: 52px;
      }
      .suite-section h2 {
        margin: 0 0 18px;
        font-size: 1.4rem;
      }
      .suite-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 24px;
      }
      .suite-card {
        background: var(--surface-alt);
        border-radius: 20px;
        border: 1px solid var(--border);
        padding: 22px 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .suite-card:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 108, 55, 0.4);
      }
      .suite-card__header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .suite-card__title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .suite-index {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--muted);
      }
      .suite-name {
        font-size: 1.05rem;
        font-weight: 600;
      }
      .priority-badge {
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.04);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .status-pill {
        padding: 6px 13px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(148, 163, 184, 0.12);
        color: var(--muted);
      }
      .status-success {
        background: rgba(45, 212, 191, 0.15);
        color: var(--success);
      }
      .status-failure {
        background: rgba(248, 113, 113, 0.18);
        color: var(--danger);
      }
      .status-skipped {
        background: rgba(250, 204, 21, 0.18);
        color: var(--warning);
      }
      .suite-card__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 14px;
      }
      .stat {
        background: var(--surface);
        border-radius: 14px;
        border: 1px solid var(--border);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stat-label {
        font-size: 0.75rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .stat-value {
        font-size: 1.1rem;
        font-weight: 600;
      }
      .stat-value--code {
        font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
        font-size: 0.95rem;
        word-break: break-all;
      }
      .suite-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: var(--muted);
        font-size: 0.9rem;
      }
      .suite-card__alert {
        padding: 6px 12px;
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.8rem;
        border: 1px solid rgba(248, 113, 113, 0.45);
        color: var(--danger);
        background: rgba(248, 113, 113, 0.12);
      }
      .suite-card__footer {
        display: flex;
        justify-content: flex-end;
      }
      .suite-link {
        font-weight: 600;
        color: var(--accent);
      }
      .suite-link--disabled {
        color: var(--muted);
        cursor: not-allowed;
      }
      .suite-card__error {
        margin: 0;
        padding: 14px 18px;
        border-radius: 16px;
        background: rgba(248, 113, 113, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.35);
        color: rgba(248, 113, 113, 0.95);
        font-size: 0.92rem;
      }
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px;
        background: var(--surface);
        border-radius: 20px;
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 1rem;
      }
      .page-footer {
        margin-top: 64px;
        color: var(--muted);
        font-size: 0.88rem;
        text-align: center;
      }
      @media (max-width: 720px) {
        .layout {
          padding: 36px 20px 48px;
        }
        .hero {
          padding: 24px;
        }
        .metrics-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <header class="hero">
        <span class="hero-badge">Flow Test Engine</span>
        <h1 class="hero-title">${projectName}</h1>
        <p class="hero-subtitle">Run ${runIdLabel} | Generated ${generatedAtLabel}</p>
        <p class="hero-meta">Started ${startTimeLabel} | Finished ${endTimeLabel}</p>
        <div class="hero-stats">
          <span class="hero-stat hero-stat--success">${suitesPassedLabel} passed</span>
          <span class="hero-stat hero-stat--danger">${suitesFailedLabel} failed</span>
          <span class="hero-stat hero-stat--neutral">${suitesSkippedLabel} skipped</span>
        </div>
      </header>
      <section class="metrics-grid">
        <article class="metric-card metric-card--accent">
          <span class="metric-label">Total Suites</span>
          <span class="metric-value">${totalSuitesLabel}</span>
          <span class="metric-subtext">Duration ${durationLabel}</span>
        </article>
        <article class="metric-card metric-card--success">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value">${successRateLabel}%</span>
          <span class="metric-subtext">${suitesPassedLabel} passed | ${suitesFailedLabel} failed</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Steps Passed</span>
          <span class="metric-value">${stepRatioLabel}</span>
          <span class="metric-subtext">${stepCoverageLabel}</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Step Outcomes</span>
          <span class="metric-value">${failedStepsLabel}</span>
          <span class="metric-subtext">${skippedStepsLabel} skipped</span>
        </article>
      </section>
      ${suitesSection}
      <footer class="page-footer">
        Generated by Flow Test Engine. Share the JSON artifact alongside this HTML for full fidelity.
      </footer>
    </div>
  </body>
</html>`;
  }

  private renderSuiteHtml(
    suite: SuiteExecutionResult,
    context: { generatedAt: string; projectName: string }
  ): string {
    const projectName = this.escapeHtml(context.projectName);
    const generatedAtLabel = this.escapeHtml(context.generatedAt);
    const suiteName = this.escapeHtml(suite.suite_name);
    const nodeId = this.escapeHtml(suite.node_id);
    const statusClass = this.getStatusClass(suite.status);
    const statusLabel = this.escapeHtml(suite.status.toUpperCase());
    const durationLabel = this.escapeHtml(
      this.formatDuration(suite.duration_ms)
    );
    const successRateLabel = this.escapeHtml(suite.success_rate.toFixed(2));
    const totalStepsLabel = this.escapeHtml(suite.steps_executed.toString());
    const passedStepsLabel = this.escapeHtml(suite.steps_successful.toString());
    const failedStepsLabel = this.escapeHtml(suite.steps_failed.toString());
    const skippedStepsCount = Math.max(
      0,
      suite.steps_executed - suite.steps_successful - suite.steps_failed
    );
    const skippedStepsLabel = this.escapeHtml(skippedStepsCount.toString());
    const startTimeLabel = this.escapeHtml(
      this.formatDateTime(suite.start_time)
    );
    const endTimeLabel = this.escapeHtml(this.formatDateTime(suite.end_time));
    const priorityBadge = suite.priority
      ? `<span class="hero-meta-item hero-meta-item--badge">Priority ${this.escapeHtml(
          suite.priority
        )}</span>`
      : "";
    const suiteErrorBanner = suite.error_message
      ? `<div class="suite-error-banner">${this.escapeHtml(
          suite.error_message
        )}</div>`
      : "";

    const steps = suite.steps_results
      .map((step, index) => {
        const assertionsSummary = this.escapeHtml(
          this.formatAssertionsSummary(step.assertions_results)
        );
        const detailSections: string[] = [];

        if (step.request_details) {
          detailSections.push(`
            <section class="detail-section">
              <h4>Request</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.request_details)
              )}</pre>
            </section>
          `);
        }

        if (step.response_details) {
          detailSections.push(`
            <section class="detail-section">
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
            <section class="detail-section">
              <h4>Captured Variables</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.captured_variables)
              )}</pre>
            </section>
          `);
        }

        if (step.input_results && step.input_results.length > 0) {
          detailSections.push(`
            <section class="detail-section">
              <h4>Inputs</h4>
              <pre>${this.escapeHtml(this.formatJson(step.input_results))}</pre>
            </section>
          `);
        }

        if (step.dynamic_assignments && step.dynamic_assignments.length > 0) {
          detailSections.push(`
            <section class="detail-section">
              <h4>Dynamic Assignments</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.dynamic_assignments)
              )}</pre>
            </section>
          `);
        }

        if (step.iteration_results && step.iteration_results.length > 0) {
          detailSections.push(`
            <section class="detail-section">
              <h4>Iteration Results (${step.iteration_results.length})</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.iteration_results)
              )}</pre>
            </section>
          `);
        }

        if (step.scenarios_meta) {
          detailSections.push(`
            <section class="detail-section">
              <h4>Scenario Metadata</h4>
              <pre>${this.escapeHtml(
                this.formatJson(step.scenarios_meta)
              )}</pre>
            </section>
          `);
        }

        const detailContent =
          detailSections.length > 0
            ? `<details class="detail-toggle"><summary>Inspect</summary>${detailSections.join(
                ""
              )}</details>`
            : '<span class="detail-empty">None</span>';

        const errorCell = step.error_message
          ? `<span class="error-text">${this.escapeHtml(
              step.error_message
            )}</span>`
          : '<span class="muted">None</span>';

        const stepIdDisplay = step.step_id
          ? `<div class="step-id">ID: ${this.escapeHtml(step.step_id)}</div>`
          : "";
        const qualifiedIdDisplay =
          step.qualified_step_id && step.qualified_step_id !== step.step_id
            ? `<div class="step-id step-id--subtle">${this.escapeHtml(
                step.qualified_step_id
              )}</div>`
            : "";

        const statusBadge = `<span class="status-pill ${this.getStatusClass(
          step.status
        )}">${this.escapeHtml(step.status.toUpperCase())}</span>`;
        const durationSummary = this.escapeHtml(
          this.formatDuration(step.duration_ms)
        );

        return `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="step-name">${this.escapeHtml(step.step_name)}</div>
              ${stepIdDisplay}
              ${qualifiedIdDisplay}
            </td>
            <td>${statusBadge}</td>
            <td>${durationSummary}</td>
            <td>${assertionsSummary}</td>
            <td>${errorCell}</td>
            <td>${detailContent}</td>
          </tr>
        `;
      })
      .join("\n");

    const tableBody =
      steps.trim().length > 0
        ? steps
        : '<tr class="empty-row"><td colspan="7">No steps were executed.</td></tr>';

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${suiteName} - Suite Report</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f1117;
        --surface: #161f2f;
        --surface-alt: #1c2639;
        --surface-soft: #1d2b40;
        --border: rgba(148, 163, 184, 0.18);
        --border-strong: rgba(148, 163, 184, 0.32);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #ff6c37;
        --accent-soft: rgba(255, 108, 55, 0.15);
        --success: #2dd4bf;
        --danger: #f87171;
        --warning: #facc15;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top right, rgba(255, 108, 55, 0.08), transparent 60%) var(--bg);
        color: var(--text);
        min-height: 100vh;
      }
      .layout {
        max-width: 1200px;
        margin: 0 auto;
        padding: 56px 40px 64px;
      }
      a {
        color: var(--accent);
      }
      .hero {
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(12, 18, 28, 0.94));
        border: 1px solid var(--border-strong);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 30px 60px rgba(8, 15, 26, 0.45);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .hero-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
        font-size: 0.8rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .hero-title {
        margin: 0;
        font-size: 2.1rem;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .hero-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .hero-meta-item {
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--surface);
        border: 1px solid var(--border);
        font-size: 0.85rem;
        color: var(--muted);
      }
      .hero-meta-item--badge {
        color: var(--accent);
        border-color: rgba(255, 108, 55, 0.45);
      }
      .hero-meta-item--code {
        font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
        font-size: 0.8rem;
      }
      .hero-subtext,
      .hero-meta,
      .hero-generated {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .hero-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .hero-stat {
        display: inline-flex;
        align-items: center;
        padding: 10px 16px;
        border-radius: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        font-size: 0.95rem;
        font-weight: 600;
      }
      .hero-stat--success {
        border-color: rgba(45, 212, 191, 0.5);
        color: var(--success);
      }
      .hero-stat--danger {
        border-color: rgba(248, 113, 113, 0.5);
        color: var(--danger);
      }
      .hero-stat--neutral {
        border-color: rgba(148, 163, 184, 0.35);
        color: var(--muted);
      }
      .status-pill {
        padding: 6px 13px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(148, 163, 184, 0.12);
        color: var(--muted);
      }
      .status-success {
        background: rgba(45, 212, 191, 0.15);
        color: var(--success);
      }
      .status-failure {
        background: rgba(248, 113, 113, 0.18);
        color: var(--danger);
      }
      .status-skipped {
        background: rgba(250, 204, 21, 0.18);
        color: var(--warning);
      }
      .suite-error-banner {
        margin: 24px 0 0;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid rgba(248, 113, 113, 0.4);
        background: rgba(248, 113, 113, 0.12);
        color: rgba(248, 113, 113, 0.95);
        font-size: 0.95rem;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-top: 36px;
      }
      .metric-card {
        background: var(--surface);
        border-radius: 18px;
        border: 1px solid var(--border);
        padding: 20px 22px;
        box-shadow: 0 20px 40px rgba(8, 15, 26, 0.25);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .metric-card--accent {
        border-color: rgba(255, 108, 55, 0.45);
        box-shadow: 0 25px 55px rgba(255, 108, 55, 0.25);
      }
      .metric-card--success {
        border-color: rgba(45, 212, 191, 0.4);
      }
      .metric-label {
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .metric-subtext {
        font-size: 0.9rem;
        color: var(--muted);
      }
      .steps-section {
        margin-top: 48px;
      }
      .steps-card {
        background: var(--surface-alt);
        border-radius: 22px;
        border: 1px solid var(--border);
        padding: 24px 26px;
        box-shadow: 0 24px 48px rgba(8, 15, 26, 0.28);
      }
      .steps-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 18px;
      }
      .steps-card__header h2 {
        margin: 0;
        font-size: 1.4rem;
      }
      .steps-summary {
        color: var(--muted);
        font-size: 0.95rem;
      }
      .steps-table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 16px;
        overflow: hidden;
      }
      .steps-table thead {
        background: rgba(17, 24, 39, 0.82);
        color: var(--text);
      }
      .steps-table th,
      .steps-table td {
        padding: 14px 18px;
        text-align: left;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        vertical-align: top;
      }
      .steps-table tbody tr:hover {
        background: rgba(30, 42, 61, 0.35);
      }
      .step-name {
        font-weight: 600;
        margin-bottom: 4px;
      }
      .step-id {
        color: var(--muted);
        font-size: 0.8rem;
      }
      .step-id--subtle {
        color: rgba(148, 163, 184, 0.6);
      }
      .error-text {
        color: rgba(248, 113, 113, 0.95);
      }
      .muted {
        color: var(--muted);
      }
      .detail-empty {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .detail-toggle {
        background: var(--surface);
        border-radius: 14px;
        border: 1px solid var(--border);
        padding: 12px 14px;
      }
      .detail-toggle > summary {
        cursor: pointer;
        font-weight: 600;
        color: var(--accent);
        outline: none;
      }
      .detail-toggle[open] {
        border-color: rgba(255, 108, 55, 0.4);
      }
      .detail-section {
        margin-top: 14px;
      }
      .detail-section h4 {
        margin: 0 0 8px;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
      }
      .detail-section pre {
        margin: 0;
        background: var(--surface-soft);
        border-radius: 12px;
        border: 1px solid var(--border);
        padding: 14px;
        overflow: auto;
        font-size: 0.85rem;
        line-height: 1.55;
        font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
      }
      .empty-row td {
        text-align: center;
        padding: 32px 0;
        color: var(--muted);
      }
      .page-footer {
        margin-top: 60px;
        color: var(--muted);
        font-size: 0.88rem;
        text-align: center;
      }
      @media (max-width: 720px) {
        .layout {
          padding: 36px 20px 48px;
        }
        .hero {
          padding: 24px;
        }
        .metrics-grid,
        .steps-card__header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .steps-card {
          padding: 20px;
        }
        .steps-table th,
        .steps-table td {
          padding: 12px;
        }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <section class="hero">
        <div class="hero-top">
          <span class="hero-badge">Suite Report</span>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </div>
        <h1 class="hero-title">${suiteName}</h1>
        <div class="hero-meta-row">
          <span class="hero-meta-item">Project ${projectName}</span>
          <span class="hero-meta-item hero-meta-item--code">Node ${nodeId}</span>
          ${priorityBadge}
        </div>
        <p class="hero-meta">Started ${startTimeLabel} | Finished ${endTimeLabel}</p>
        <p class="hero-generated">Generated ${generatedAtLabel}</p>
        <div class="hero-stats">
          <span class="hero-stat hero-stat--success">${passedStepsLabel} passed</span>
          <span class="hero-stat hero-stat--danger">${failedStepsLabel} failed</span>
          <span class="hero-stat hero-stat--neutral">${skippedStepsLabel} skipped</span>
        </div>
      </section>
      ${suiteErrorBanner}
      <section class="metrics-grid">
        <article class="metric-card metric-card--accent">
          <span class="metric-label">Duration</span>
          <span class="metric-value">${durationLabel}</span>
          <span class="metric-subtext">${startTimeLabel} to ${endTimeLabel}</span>
        </article>
        <article class="metric-card metric-card--success">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value">${successRateLabel}%</span>
          <span class="metric-subtext">${passedStepsLabel} of ${totalStepsLabel} steps</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Total Steps</span>
          <span class="metric-value">${totalStepsLabel}</span>
          <span class="metric-subtext">${passedStepsLabel} passed</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Failures</span>
          <span class="metric-value">${failedStepsLabel}</span>
          <span class="metric-subtext">${skippedStepsLabel} skipped</span>
        </article>
      </section>
      <section class="steps-section">
        <div class="steps-card">
          <div class="steps-card__header">
            <h2>Steps</h2>
            <span class="steps-summary">${passedStepsLabel}/${totalStepsLabel} passed</span>
          </div>
          <table class="steps-table">
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
${tableBody}
            </tbody>
          </table>
        </div>
      </section>
      <footer class="page-footer">
        Generated by Flow Test Engine. Keep the JSON artifact nearby for end-to-end traceability.
      </footer>
    </div>
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

  private formatDateTime(value: string | undefined): string {
    if (!value) {
      return "n/a";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
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
