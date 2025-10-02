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
import type { StepExecutionResult } from "../types/config.types";
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

interface PrettyResponsePayload {
  type: "json" | "xml" | "html" | "text";
  label: string;
  raw: string;
  formatted: string;
  iframeContent?: string;
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
        border-radius: 6px;
        padding: 28px;
        box-shadow: 0 16px 28px rgba(8, 15, 26, 0.32);
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
        word-wrap: break-word;
        overflow-wrap: break-word;
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
        border-radius: 6px;
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
        border-radius: 6px;
        border: 1px solid var(--border);
        padding: 18px 20px;
        box-shadow: 0 12px 24px rgba(8, 15, 26, 0.2);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .metric-card--accent {
        border-color: rgba(255, 108, 55, 0.35);
        box-shadow: 0 18px 30px rgba(255, 108, 55, 0.18);
      }
      .metric-card--success {
        border-color: rgba(45, 212, 191, 0.3);
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
        border-radius: 6px;
        border: 1px solid var(--border);
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: transform 0.2s ease, border-color 0.2s ease;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .suite-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 108, 55, 0.25);
      }
      .suite-index {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        background: var(--surface);
        border: 1px solid var(--border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--muted);
      }
      .priority-badge {
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
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
        color: var,--danger);
      }
      .status-skipped {
        background: rgba(250, 204, 21, 0.18);
        color: var(--warning);
      }
      .steps-section {
        margin-top: 48px;
      }
      .steps-card {
        background: var(--surface-alt);
        border-radius: 6px;
        border: 1px solid var(--border);
        padding: 20px 22px;
        box-shadow: 0 16px 28px rgba(8, 15, 26, 0.28);
        overflow-x: auto;
      }
      .steps-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }
      .steps-card__header h2 {
        margin: 0;
        font-size: 1.35rem;
      }
      .steps-summary {
        color: var(--muted);
        font-size: 0.95rem;
      }
      .steps-grid {
        display: grid;
        gap: 16px;
        margin-top: 16px;
      }
      .step-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      .step-card:hover {
        border-color: var(--border-strong);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(8, 15, 26, 0.15);
      }
      .step-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid var(--border);
        background: var(--surface-alt);
      }
      .step-index {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--muted);
      }
      .step-info {
        flex: 1;
      }
      .step-status {
        margin-left: auto;
      }
      .step-metrics {
        display: flex;
        gap: 16px;
        padding: 12px 16px;
        background: var(--surface-soft);
        border-bottom: 1px solid var(--border);
      }
      .metric {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .metric-error {
        color: var(--danger);
      }
      .metric-label {
        font-size: 0.75rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .metric-value {
        font-size: 0.9rem;
        font-weight: 600;
      }
      .step-details {
        padding: 16px;
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
      .detail-tabs {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
      }
      .detail-tabs-nav {
        display: flex;
        border-bottom: 1px solid var(--border);
        background: var(--surface-alt);
      }
      .tab-btn {
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: var(--muted);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
      }
      .tab-btn:hover {
        color: var(--text);
        background: rgba(255, 255, 255, 0.05);
      }
      .tab-btn.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
        background: rgba(255, 108, 55, 0.1);
      }
      .detail-tabs-content {
        padding: 0;
      }
      .tab-content {
        display: none;
        padding: 16px;
      }
      .tab-content.active {
        display: block;
      }
      .code-block {
        background: var(--surface-soft);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
      }
      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
      }
      .code-title {
        font-size: 0.8rem;
        color: var(--muted);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .copy-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--muted);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .copy-btn:hover {
        background: var(--surface);
        color: var(--text);
        border-color: var(--accent);
      }
      .copy-btn.copied {
        background: var(--success);
        color: white;
        border-color: var(--success);
      }
      .copy-icon {
        font-size: 0.7rem;
      }
      .code-content {
        margin: 0;
        padding: 12px;
        background: var(--surface-soft);
        color: var(--text);
        font-size: 0.8rem;
        line-height: 1.5;
        font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
        overflow-x: auto;
        white-space: pre;
        max-height: 300px;
        overflow-y: auto;
      }
      .pretty-response {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
      }
      .pretty-response__preview {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }
      .pretty-response__label {
        font-size: 0.75rem;
        color: var(--muted);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .pretty-response__frame {
        display: block;
        width: 100%;
        min-height: 400px;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: transparent;
      }
      .assertions-list {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
      }
      .assertion-item {
        border: 1px solid var(--border);
        border-radius: 4px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .assertion-passed {
        border-color: var(--success);
        background: rgba(45, 212, 191, 0.05);
      }
      .assertion-failed {
        border-color: var(--danger);
        background: rgba(248, 113, 113, 0.05);
      }
      .assertion-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
        font-weight: 600;
        font-size: 0.85rem;
      }
      .assertion-passed .assertion-header {
        background: rgba(45, 212, 191, 0.1);
        color: var(--success);
      }
      .assertion-failed .assertion-header {
        background: rgba(248, 113, 113, 0.1);
        color: var(--danger);
      }
      .assertion-icon {
        font-size: 0.9rem;
      }
      .assertion-title {
        flex: 1;
      }
      .assertion-status {
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .assertion-details {
        padding: 12px;
        display: grid;
        gap: 8px;
        font-size: 0.85rem;
      }
      .assertion-details code {
        background: var(--surface-soft);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
        font-size: 0.8rem;
      }
      .assertion-error {
        padding: 8px;
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        border-radius: 4px;
        margin-top: 4px;
      }
      .empty-state {
        text-align: center;
        padding: 48px 32px;
        color: var(--muted);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 1rem;
      }
      .suite-error-banner {
        margin: 24px 0 0;
        padding: 16px 18px;
        border-radius: 4px;
        border: 1px solid rgba(248, 113, 113, 0.4);
        background: rgba(248, 113, 113, 0.12);
        color: rgba(248, 113, 113, 0.95);
        font-size: 0.95rem;
      }
      .stat {
        background: var(--surface);
        border-radius: 4px;
        border: 1px solid var(--border);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .suite-card__alert {
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.8rem;
        border: 1px solid rgba(248, 113, 113, 0.45);
        color: var(--danger);
        background: rgba(248, 113, 113, 0.12);
      }
      .suite-card__error {
        margin: 0;
        padding: 14px 18px;
        border-radius: 4px;
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
        border-radius: 6px;
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 1rem;
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

        const hasDetails =
          step.request_details ||
          step.response_details ||
          (step.captured_variables &&
            Object.keys(step.captured_variables).length > 0) ||
          (step.input_results && step.input_results.length > 0) ||
          (step.dynamic_assignments && step.dynamic_assignments.length > 0) ||
          (step.iteration_results && step.iteration_results.length > 0) ||
          step.scenarios_meta ||
          (step.assertions_results && step.assertions_results.length > 0);

        const prettyResponseTab = this.buildPrettyResponseTab(step);

        const detailContent = hasDetails
          ? `<div class="detail-tabs">
                <div class="detail-tabs-nav">
                  ${
                    step.request_details
                      ? '<button class="tab-btn active" data-tab="request">Request</button>'
                      : ""
                  }
                  ${
                    step.response_details
                      ? '<button class="tab-btn" data-tab="response">Response</button>'
                      : ""
                  }
                  ${prettyResponseTab ? prettyResponseTab.buttonHtml : ""}
                  ${
                    step.request_details
                      ? '<button class="tab-btn" data-tab="curl">cURL</button>'
                      : ""
                  }
                  ${
                    step.assertions_results &&
                    step.assertions_results.length > 0
                      ? '<button class="tab-btn" data-tab="assertions">Assertions</button>'
                      : ""
                  }
                  ${
                    step.captured_variables &&
                    Object.keys(step.captured_variables).length > 0
                      ? '<button class="tab-btn" data-tab="variables">Variables</button>'
                      : ""
                  }
                  ${
                    step.input_results && step.input_results.length > 0
                      ? '<button class="tab-btn" data-tab="inputs">Inputs</button>'
                      : ""
                  }
                  ${
                    step.dynamic_assignments &&
                    step.dynamic_assignments.length > 0
                      ? '<button class="tab-btn" data-tab="assignments">Assignments</button>'
                      : ""
                  }
                  ${
                    step.iteration_results && step.iteration_results.length > 0
                      ? '<button class="tab-btn" data-tab="iterations">Iterations</button>'
                      : ""
                  }
                  ${
                    step.scenarios_meta
                      ? '<button class="tab-btn" data-tab="scenarios">Scenarios</button>'
                      : ""
                  }
                </div>
                <div class="detail-tabs-content">
                  ${
                    step.request_details
                      ? `<div class="tab-content active" data-tab="request">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Request Details</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.request_details).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.request_details)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.response_details
                      ? `<div class="tab-content" data-tab="response">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Response Details</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.response_details).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.response_details)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${prettyResponseTab ? prettyResponseTab.contentHtml : ""}
                  ${
                    step.request_details
                      ? `<div class="tab-content" data-tab="curl">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">cURL Command</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.generateCurlCommand(
                            step.request_details
                          ).replace(/"/g, "&quot;")
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.generateCurlCommand(step.request_details)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.assertions_results &&
                    step.assertions_results.length > 0
                      ? `<div class="tab-content" data-tab="assertions">
                    <div class="assertions-list">
                      ${step.assertions_results
                        .map(
                          (assertion, idx) => `
                        <div class="assertion-item ${
                          assertion.passed
                            ? "assertion-passed"
                            : "assertion-failed"
                        }">
                          <div class="assertion-header">
                            <span class="assertion-icon">${
                              assertion.passed ? "✅" : "❌"
                            }</span>
                            <span class="assertion-title">Assertion ${
                              idx + 1
                            }</span>
                            <span class="assertion-status">${
                              assertion.passed ? "PASSED" : "FAILED"
                            }</span>
                          </div>
                          <div class="assertion-details">
                            <div class="assertion-field">
                              <strong>Field:</strong> <code>${this.escapeHtml(
                                assertion.field || "N/A"
                              )}</code>
                            </div>
                            <div class="assertion-message">
                              <strong>Message:</strong> <code>${this.escapeHtml(
                                assertion.message || "N/A"
                              )}</code>
                            </div>
                            <div class="assertion-expected">
                              <strong>Expected:</strong> <code>${this.escapeHtml(
                                String(assertion.expected || "N/A")
                              )}</code>
                            </div>
                            <div class="assertion-actual">
                              <strong>Actual:</strong> <code>${this.escapeHtml(
                                String(assertion.actual || "N/A")
                              )}</code>
                            </div>
                            ${
                              !assertion.passed && assertion.message
                                ? `<div class="assertion-error">
                              <strong>Error:</strong> <span class="error-text">${this.escapeHtml(
                                assertion.message
                              )}</span>
                            </div>`
                                : ""
                            }
                          </div>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.captured_variables &&
                    Object.keys(step.captured_variables).length > 0
                      ? `<div class="tab-content" data-tab="variables">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Captured Variables</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.captured_variables).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.captured_variables)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.input_results && step.input_results.length > 0
                      ? `<div class="tab-content" data-tab="inputs">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Input Results</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.input_results).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.input_results)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.dynamic_assignments &&
                    step.dynamic_assignments.length > 0
                      ? `<div class="tab-content" data-tab="assignments">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Dynamic Assignments</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.dynamic_assignments).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.dynamic_assignments)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.iteration_results && step.iteration_results.length > 0
                      ? `<div class="tab-content" data-tab="iterations">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Iteration Results (${
                          step.iteration_results.length
                        })</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.iteration_results).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.iteration_results)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    step.scenarios_meta
                      ? `<div class="tab-content" data-tab="scenarios">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">Scenario Metadata</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${this.escapeHtml(
                          this.formatJson(step.scenarios_meta).replace(
                            /"/g,
                            "&quot;"
                          )
                        )}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${this.escapeHtml(
                        this.formatJson(step.scenarios_meta)
                      )}</pre>
                    </div>
                  </div>`
                      : ""
                  }
                </div>
              </div>`
          : '<div class="detail-empty">No details available</div>';

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
          <div class="step-card">
            <div class="step-header">
              <div class="step-index">${index + 1}</div>
              <div class="step-info">
                <div class="step-name">${this.escapeHtml(step.step_name)}</div>
                ${stepIdDisplay}
                ${qualifiedIdDisplay}
              </div>
              <div class="step-status">${statusBadge}</div>
            </div>
            <div class="step-metrics">
              <div class="metric">
                <span class="metric-label">Duration</span>
                <span class="metric-value">${durationSummary}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Assertions</span>
                <span class="metric-value">${assertionsSummary}</span>
              </div>
              ${
                step.error_message
                  ? `<div class="metric metric-error">
                <span class="metric-label">Error</span>
                <span class="metric-value error-text">${this.escapeHtml(
                  step.error_message
                )}</span>
              </div>`
                  : ""
              }
            </div>
            <div class="step-details">
              ${detailContent}
            </div>
          </div>
        `;
      })
      .join("\n");

    const stepsContent =
      steps.trim().length > 0
        ? steps
        : '<div class="empty-state">No steps were executed.</div>';

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
        border-radius: 6px;
        padding: 28px;
        box-shadow: 0 16px 28px rgba(8, 15, 26, 0.32);
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
        border-radius: 6px;
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
        color: var,--danger);
      }
      .status-skipped {
        background: rgba(250, 204, 21, 0.18);
        color: var(--warning);
      }
      .steps-section {
        margin-top: 48px;
      }
      .steps-card {
        background: var(--surface-alt);
        border-radius: 6px;
        border: 1px solid var(--border);
        padding: 20px 22px;
        box-shadow: 0 16px 28px rgba(8, 15, 26, 0.28);
        overflow-x: auto;
      }
      .steps-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }
      .steps-card__header h2 {
        margin: 0;
        font-size: 1.35rem;
      }
      .steps-summary {
        color: var(--muted);
        font-size: 0.95rem;
      }
      .steps-grid {
        display: grid;
        gap: 16px;
        margin-top: 16px;
      }
      .step-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      .step-card:hover {
        border-color: var(--border-strong);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(8, 15, 26, 0.15);
      }
      .step-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid var(--border);
        background: var(--surface-alt);
      }
      .step-index {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--muted);
      }
      .step-info {
        flex: 1;
      }
      .step-status {
        margin-left: auto;
      }
      .step-metrics {
        display: flex;
        gap: 16px;
        padding: 12px 16px;
        background: var(--surface-soft);
        border-bottom: 1px solid var(--border);
      }
      .metric {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .metric-error {
        color: var(--danger);
      }
      .metric-label {
        font-size: 0.75rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .metric-value {
        font-size: 0.9rem;
        font-weight: 600;
      }
      .step-details {
        padding: 16px;
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
      .detail-tabs {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
      }
      .detail-tabs-nav {
        display: flex;
        border-bottom: 1px solid var(--border);
        background: var(--surface-alt);
      }
      .tab-btn {
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: var(--muted);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
      }
      .tab-btn:hover {
        color: var(--text);
        background: rgba(255, 255, 255, 0.05);
      }
      .tab-btn.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
        background: rgba(255, 108, 55, 0.1);
      }
      .detail-tabs-content {
        padding: 0;
      }
      .tab-content {
        display: none;
        padding: 16px;
      }
      .tab-content.active {
        display: block;
      }
      .code-block {
        background: var(--surface-soft);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
      }
      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
      }
      .code-title {
        font-size: 0.8rem;
        color: var(--muted);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .copy-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--muted);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .copy-btn:hover {
        background: var(--surface);
        color: var(--text);
        border-color: var(--accent);
      }
      .copy-btn.copied {
        background: var(--success);
        color: white;
        border-color: var(--success);
      }
      .copy-icon {
        font-size: 0.7rem;
      }
      .code-content {
        margin: 0;
        padding: 12px;
        background: var(--surface-soft);
        color: var(--text);
        font-size: 0.8rem;
        line-height: 1.5;
        font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
        overflow-x: auto;
        white-space: pre;
        max-height: 300px;
        overflow-y: auto;
      }
      .assertions-list {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
      }
      .assertion-item {
        border: 1px solid var(--border);
        border-radius: 4px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .assertion-passed {
        border-color: var(--success);
        background: rgba(45, 212, 191, 0.05);
      }
      .assertion-failed {
        border-color: var(--danger);
        background: rgba(248, 113, 113, 0.05);
      }
      .assertion-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
        font-weight: 600;
        font-size: 0.85rem;
      }
      .assertion-passed .assertion-header {
        background: rgba(45, 212, 191, 0.1);
        color: var(--success);
      }
      .assertion-failed .assertion-header {
        background: rgba(248, 113, 113, 0.1);
        color: var(--danger);
      }
      .assertion-icon {
        font-size: 0.9rem;
      }
      .assertion-title {
        flex: 1;
      }
      .assertion-status {
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .assertion-details {
        padding: 12px;
        display: grid;
        gap: 8px;
        font-size: 0.85rem;
      }
      .assertion-details code {
        background: var(--surface-soft);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
        font-size: 0.8rem;
      }
      .assertion-error {
        padding: 8px;
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        border-radius: 4px;
        margin-top: 4px;
      }
      .empty-state {
        text-align: center;
        padding: 48px 32px;
        color: var(--muted);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 1rem;
      }
      .suite-error-banner {
        margin: 24px 0 0;
        padding: 16px 18px;
        border-radius: 4px;
        border: 1px solid rgba(248, 113, 113, 0.4);
        background: rgba(248, 113, 113, 0.12);
        color: rgba(248, 113, 113, 0.95);
        font-size: 0.95rem;
      }
      .stat {
        background: var(--surface);
        border-radius: 4px;
        border: 1px solid var(--border);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .suite-card__alert {
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.8rem;
        border: 1px solid rgba(248, 113, 113, 0.45);
        color: var(--danger);
        background: rgba(248, 113, 113, 0.12);
      }
      .suite-card__error {
        margin: 0;
        padding: 14px 18px;
        border-radius: 4px;
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
        border-radius: 6px;
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 1rem;
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
          <div class="steps-grid">
${stepsContent}
          </div>
        </div>
      </section>
      <footer class="page-footer">
        Generated by Flow Test Engine. Keep the JSON artifact nearby for end-to-end traceability.
      </footer>
    </div>
    <script>
      // Tab functionality
      document.addEventListener('DOMContentLoaded', function() {
        // Initialize tab functionality
        const tabContainers = document.querySelectorAll('.detail-tabs');

        tabContainers.forEach(container => {
          const tabBtns = container.querySelectorAll('.tab-btn');
          const tabContents = container.querySelectorAll('.tab-content');

          const hasActive = Array.from(tabBtns).some(btn =>
            btn.classList.contains('active')
          );

          if (!hasActive && tabBtns.length > 0) {
            const firstBtn = tabBtns[0];
            firstBtn.classList.add('active');
            const firstTabId = firstBtn.getAttribute('data-tab');
            if (firstTabId) {
              const selector = '[data-tab="' + firstTabId + '"].tab-content';
              const firstContent = container.querySelector(selector);
              if (firstContent) {
                firstContent.classList.add('active');
              }
            }
          }

          tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
              const targetTab = this.getAttribute('data-tab');

              // Remove active class from all buttons and contents in this container
              tabBtns.forEach(b => b.classList.remove('active'));
              tabContents.forEach(c => c.classList.remove('active'));

              // Add active class to clicked button and corresponding content
              this.classList.add('active');
              const targetContent = container.querySelector(\`[data-tab="\${targetTab}"].tab-content\`);
              if (targetContent) {
                targetContent.classList.add('active');
              }
            });
          });
        });
      });

      // Copy to clipboard functionality
      function copyToClipboard(button) {
        const content = button.getAttribute('data-content');

        if (!content) return;

        // Decode HTML entities
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const decodedContent = tempDiv.textContent || tempDiv.innerText || '';

        navigator.clipboard.writeText(decodedContent).then(() => {
          // Visual feedback
          const originalHTML = button.innerHTML;
          button.classList.add('copied');
          button.innerHTML = '<span class="copy-icon">✓</span><span class="copy-text">Copied!</span>';

          setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);

          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = decodedContent;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            const originalHTML = button.innerHTML;
            button.classList.add('copied');
            button.innerHTML = '<span class="copy-icon">✓</span><span class="copy-text">Copied!</span>';

            setTimeout(() => {
              button.classList.remove('copied');
              button.innerHTML = originalHTML;
            }, 2000);
          } catch (err) {
            console.error('Fallback copy failed: ', err);
          }
          document.body.removeChild(textArea);
        });
      }
    </script>
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

  private buildPrettyResponseTab(
    step: StepExecutionResult
  ): { buttonHtml: string; contentHtml: string } | null {
    const payload = this.getPrettyResponsePayload(step.response_details);

    if (!payload) {
      return null;
    }

    const buttonHtml =
      '<button class="tab-btn" data-tab="pretty-response">Pretty Response</button>';
    const escapedCopyValue = this.escapeHtml(payload.raw);
    const escapedLabel = this.escapeHtml(payload.label);

    if (payload.type === "html") {
      const srcdocValue = this.escapeAttribute(
        payload.iframeContent ?? payload.formatted
      );

      return {
        buttonHtml,
        contentHtml: `<div class="tab-content" data-tab="pretty-response">
                    <div class="pretty-response">
                      <div class="pretty-response__preview">
                        <iframe allowfullscreen width="100%" height="500px" transparent class="pretty-response__frame" srcdoc="${srcdocValue}"></iframe>
                      </div>
                    </div>
                  </div>`,
      };
    }

    const escapedFormatted = this.escapeHtml(payload.formatted);

    return {
      buttonHtml,
      contentHtml: `<div class="tab-content" data-tab="pretty-response">
                    <div class="code-block">
                      <div class="code-header">
                        <span class="code-title">${escapedLabel}</span>
                        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${escapedCopyValue}">
                          <span class="copy-icon">📋</span>
                          <span class="copy-text">Copy</span>
                        </button>
                      </div>
                      <pre class="code-content">${escapedFormatted}</pre>
                    </div>
                  </div>`,
    };
  }

  private getPrettyResponsePayload(
    response?: StepExecutionResult["response_details"]
  ): PrettyResponsePayload | null {
    if (!response) {
      return null;
    }

    const contentType = this.extractContentType(response.headers);
    const normalizedType = contentType
      ? contentType.split(";")[0].trim().toLowerCase()
      : undefined;

    if (this.isJsonLike(response.body, normalizedType)) {
      let parsedBody = response.body;

      if (typeof response.body === "string") {
        try {
          parsedBody = JSON.parse(response.body);
        } catch {
          parsedBody = response.body;
        }
      }

      const formatted = this.formatJson(parsedBody);
      return {
        type: "json",
        label: "Pretty JSON",
        raw: formatted,
        formatted,
      };
    }

    const bodyString = this.getBodyString(response);

    if (bodyString === undefined) {
      return null;
    }

    if (
      (normalizedType && normalizedType.includes("html")) ||
      this.looksLikeHtml(bodyString)
    ) {
      return {
        type: "html",
        label: "HTML Preview",
        raw: bodyString,
        formatted: bodyString,
        iframeContent: bodyString,
      };
    }

    if (
      (normalizedType && normalizedType.includes("xml")) ||
      this.looksLikeXml(bodyString)
    ) {
      return {
        type: "xml",
        label: "Pretty XML",
        raw: bodyString,
        formatted: this.formatXml(bodyString),
      };
    }

    const label = contentType
      ? `Response Body (${contentType})`
      : "Response Body";

    return {
      type: "text",
      label,
      raw: bodyString,
      formatted: bodyString,
    };
  }

  private extractContentType(
    headers?: Record<string, string>
  ): string | undefined {
    if (!headers) {
      return undefined;
    }

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "content-type") {
        return value;
      }
    }

    return undefined;
  }

  private looksLikeHtml(value: string): boolean {
    const trimmed = value.trim();

    if (!trimmed.startsWith("<")) {
      return false;
    }

    if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
      return true;
    }

    if (/<body[\s>]/i.test(trimmed)) {
      return true;
    }

    const firstTag = trimmed.match(/^<([a-zA-Z0-9-:]+)/);
    if (!firstTag) {
      return false;
    }

    const htmlTags = new Set([
      "html",
      "head",
      "body",
      "div",
      "span",
      "section",
      "article",
      "main",
      "header",
      "footer",
      "nav",
      "p",
      "a",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ]);

    return htmlTags.has(firstTag[1].toLowerCase());
  }

  private looksLikeXml(value: string): boolean {
    const trimmed = value.trim();

    if (!trimmed.startsWith("<")) {
      return false;
    }

    if (/^<\?xml/i.test(trimmed)) {
      return true;
    }

    return (
      !this.looksLikeHtml(trimmed) && /^<([a-zA-Z_][-\w.:]*)/.test(trimmed)
    );
  }

  private isJsonLike(body: unknown, normalizedContentType?: string): boolean {
    if (normalizedContentType && normalizedContentType.includes("json")) {
      return true;
    }

    if (body === null || body === undefined) {
      return false;
    }

    if (typeof body === "object") {
      return !this.isBinaryPayload(body);
    }

    if (typeof body === "string") {
      const trimmed = body.trim();
      if (!trimmed) {
        return false;
      }

      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          JSON.parse(trimmed);
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  private getBodyString(
    response?: StepExecutionResult["response_details"]
  ): string | undefined {
    if (!response) {
      return undefined;
    }

    if (response.body === null || response.body === undefined) {
      if (typeof response.raw_response === "string") {
        const separator = response.raw_response.indexOf("\r\n\r\n");
        if (separator !== -1) {
          return response.raw_response.slice(separator + 4);
        }
        return response.raw_response;
      }
      return undefined;
    }

    if (typeof response.body === "string") {
      return response.body;
    }

    if (this.isBinaryPayload(response.body)) {
      try {
        if (typeof Buffer !== "undefined" && Buffer.isBuffer(response.body)) {
          return response.body.toString("utf8");
        }

        if (response.body instanceof ArrayBuffer) {
          if (typeof Buffer !== "undefined") {
            return Buffer.from(new Uint8Array(response.body)).toString("utf8");
          }
          return undefined;
        }

        if (ArrayBuffer.isView(response.body)) {
          if (typeof Buffer !== "undefined") {
            const view = response.body as ArrayBufferView;
            return Buffer.from(
              view.buffer,
              view.byteOffset,
              view.byteLength
            ).toString("utf8");
          }
          return undefined;
        }
      } catch {
        return undefined;
      }

      return undefined;
    }

    try {
      return JSON.stringify(response.body, null, 2);
    } catch {
      return String(response.body);
    }
  }

  private isBinaryPayload(value: unknown): boolean {
    if (!value) {
      return false;
    }

    if (
      typeof Buffer !== "undefined" &&
      typeof Buffer.isBuffer === "function" &&
      Buffer.isBuffer(value)
    ) {
      return true;
    }

    if (value instanceof ArrayBuffer) {
      return true;
    }

    return (
      typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value as any)
    );
  }

  private formatXml(xml: string): string {
    try {
      let formatted = "";
      const reg = /(>)(<)(\/*)/g;
      let padding = 0;
      const PADDING = "  ";
      const cleaned = xml
        .replace(/\r?\n/g, "")
        .replace(reg, "$1\n$2")
        .split("\n");

      for (const node of cleaned) {
        const trimmed = node.trim();
        if (!trimmed) {
          continue;
        }

        if (/^<\//.test(trimmed)) {
          padding = Math.max(padding - 1, 0);
        }

        const indent = PADDING.repeat(padding);
        formatted += `${indent}${trimmed}\n`;

        if (
          /^<[^!?][^>]*[^/]?>$/.test(trimmed) &&
          !/^<[^>]+>.*<\/[^>]+>$/.test(trimmed)
        ) {
          padding += 1;
        }
      }

      return formatted.trim();
    } catch {
      return xml;
    }
  }

  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  private generateCurlCommand(requestDetails: any): string {
    if (!requestDetails) {
      return "# No request details available";
    }

    let curlCommand = "curl";

    // Add method
    if (requestDetails.method && requestDetails.method !== "GET") {
      curlCommand += ` -X ${requestDetails.method}`;
    }

    // Add headers
    if (requestDetails.headers && typeof requestDetails.headers === "object") {
      Object.entries(requestDetails.headers).forEach(([key, value]) => {
        curlCommand += ` \\\n  -H "${key}: ${value}"`;
      });
    }

    // Add body if present
    if (requestDetails.body) {
      const bodyStr =
        typeof requestDetails.body === "string"
          ? requestDetails.body
          : JSON.stringify(requestDetails.body);
      curlCommand += ` \\\n  -d '${bodyStr}'`;
    }

    // Add URL (use full_url if available, otherwise url)
    const url = requestDetails.full_url || requestDetails.url || "";
    curlCommand += ` \\\n  "${url}"`;

    return curlCommand;
  }
}
