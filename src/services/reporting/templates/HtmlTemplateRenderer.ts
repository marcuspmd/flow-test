/**
 * @fileoverview HTML Template Renderer - generates HTML report pages
 *
 * @remarks
 * This class is responsible for rendering HTML templates for both aggregate
 * summary pages and individual suite detail pages. It extracts the rendering
 * logic from the main ReportingService to improve maintainability.
 *
 * The HTML templates produce a Postman-inspired dark-themed interface with:
 * - Aggregate summary with metrics and suite cards
 * - Individual suite pages with step details
 * - Tabbed interface for request/response inspection
 * - Copy-to-clipboard functionality
 * - Responsive design
 */

import type {
  AggregatedResult,
  SuiteExecutionResult,
  StepExecutionResult,
} from "../../../types/engine.types";
import { ReportingUtils } from "../utils/ReportingUtils";

/**
 * Context for suite HTML entry linking
 */
export interface SuiteHtmlEntry {
  suite: SuiteExecutionResult;
  fileName: string;
}

/**
 * Context for rendering HTML pages
 */
export interface HtmlRenderContext {
  projectName: string;
  generatedAt: string;
  timestamp?: string;
}

/**
 * Pretty response payload for display
 */
interface PrettyResponsePayload {
  type: "json" | "xml" | "html" | "text";
  label: string;
  raw: string;
  formatted: string;
  iframeContent?: string;
}

/**
 * Renders HTML templates for test reports
 */
export class HtmlTemplateRenderer {
  /**
   * Render aggregate summary HTML page
   */
  renderSummaryPage(
    result: AggregatedResult,
    suiteEntries: SuiteHtmlEntry[],
    context: HtmlRenderContext
  ): string {
    const linkMap = new Map<string, string>();
    suiteEntries.forEach((entry) => {
      linkMap.set(entry.suite.node_id, entry.fileName);
    });

    // Calculate aggregate step metrics
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

    // Render suite cards HTML
    const suitesMarkup = this.renderSuiteCards(result.suites_results, linkMap);
    const suitesSection = this.renderSuitesSection(suitesMarkup);

    // Build hero stats
    const heroStats = this.renderHeroStats(result);

    // Build metrics grid
    const metricsGrid = this.renderMetricsGrid(
      result,
      totalSteps,
      passedSteps,
      failedSteps,
      skippedSteps,
      stepCoverage
    );

    // Escape all labels
    const projectName = ReportingUtils.escapeHtml(result.project_name);
    const runIdLabel = ReportingUtils.escapeHtml(context.timestamp || "");
    const generatedAtLabel = ReportingUtils.escapeHtml(context.generatedAt);

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${projectName} - Flow Test Report</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${this.renderStyles()}
  </head>
  <body>
    <div class="layout">
      <div class="hero">
        <span class="hero-badge">Flow Test Report</span>
        <h1 class="hero-title">${projectName}</h1>
        <p class="hero-subtitle">Test run ID: ${runIdLabel}</p>
        <p class="hero-meta">Generated at ${generatedAtLabel}</p>
        ${heroStats}
      </div>
      ${metricsGrid}
      ${suitesSection}
    </div>
    ${this.renderScripts()}
  </body>
</html>`;
  }

  /**
   * Render individual suite detail page
   */
  renderSuitePage(
    suite: SuiteExecutionResult,
    context: HtmlRenderContext
  ): string {
    const projectName = ReportingUtils.escapeHtml(context.projectName);
    const suiteName = ReportingUtils.escapeHtml(suite.suite_name);
    const nodeId = ReportingUtils.escapeHtml(suite.node_id);
    const statusClass = ReportingUtils.getStatusClass(suite.status);
    const statusLabel = ReportingUtils.escapeHtml(suite.status.toUpperCase());

    const heroSection = this.renderSuiteHeroSection(suite, context);
    const waterfallSection = this.renderWaterfallSection(suite);
    const stepsSection = this.renderStepsSection(suite);

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${suiteName} - ${projectName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${this.renderStyles()}
  </head>
  <body>
    <div class="layout">
      ${heroSection}
      ${waterfallSection}
      ${stepsSection}
    </div>
    ${this.renderScripts()}
  </body>
</html>`;
  }

  /**
   * Render hero stats section for summary page
   */
  private renderHeroStats(result: AggregatedResult): string {
    const startTimeLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDateTime(result.start_time)
    );
    const endTimeLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDateTime(result.end_time)
    );
    const durationLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDuration(result.total_duration_ms)
    );
    const suitesPassedLabel = ReportingUtils.escapeHtml(
      result.successful_tests.toString()
    );
    const suitesFailedLabel = ReportingUtils.escapeHtml(
      result.failed_tests.toString()
    );
    const totalSuitesLabel = ReportingUtils.escapeHtml(
      result.total_tests.toString()
    );

    return `<div class="hero-stats">
      <div class="hero-stat hero-stat--neutral">
        <span>📅</span>
        <span>${startTimeLabel} - ${endTimeLabel}</span>
      </div>
      <div class="hero-stat hero-stat--neutral">
        <span>⏱️</span>
        <span>${durationLabel}</span>
      </div>
      <div class="hero-stat hero-stat--success">
        <span>✅</span>
        <span>${suitesPassedLabel}/${totalSuitesLabel} suites passed</span>
      </div>
      ${
        result.failed_tests > 0
          ? `<div class="hero-stat hero-stat--danger">
        <span>❌</span>
        <span>${suitesFailedLabel} suite${
              result.failed_tests === 1 ? "" : "s"
            } failed</span>
      </div>`
          : ""
      }
    </div>`;
  }

  /**
   * Render metrics grid for summary page
   */
  private renderMetricsGrid(
    result: AggregatedResult,
    totalSteps: number,
    passedSteps: number,
    failedSteps: number,
    skippedSteps: number,
    stepCoverage: string
  ): string {
    const successRateLabel = ReportingUtils.escapeHtml(
      result.success_rate.toFixed(2)
    );
    const totalSuitesLabel = ReportingUtils.escapeHtml(
      result.total_tests.toString()
    );
    const stepRatioLabel = ReportingUtils.escapeHtml(
      totalSteps > 0 ? `${passedSteps}/${totalSteps}` : "0/0"
    );
    const stepCoverageLabel = ReportingUtils.escapeHtml(
      totalSteps > 0 ? `${stepCoverage}% coverage` : "No steps executed"
    );
    const failedStepsLabel = ReportingUtils.escapeHtml(failedSteps.toString());
    const skippedStepsLabel = ReportingUtils.escapeHtml(
      skippedSteps.toString()
    );

    return `<div class="metrics-grid">
      <div class="metric-card metric-card--accent">
        <span class="metric-label">Success Rate</span>
        <span class="metric-value">${successRateLabel}%</span>
        <span class="metric-subtext">${totalSuitesLabel} suites executed</span>
      </div>
      <div class="metric-card metric-card--success">
        <span class="metric-label">Steps Passed</span>
        <span class="metric-value">${stepRatioLabel}</span>
        <span class="metric-subtext">${stepCoverageLabel}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Failed Steps</span>
        <span class="metric-value">${failedStepsLabel}</span>
        <span class="metric-subtext">Across all suites</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Skipped Steps</span>
        <span class="metric-value">${skippedStepsLabel}</span>
        <span class="metric-subtext">Not executed</span>
      </div>
    </div>`;
  }

  /**
   * Render suite cards for summary page
   */
  private renderSuiteCards(
    suites: SuiteExecutionResult[],
    linkMap: Map<string, string>
  ): string {
    return suites
      .map((suite, index) => {
        const link = linkMap.get(suite.node_id);
        const suiteName = ReportingUtils.escapeHtml(suite.suite_name);
        const nodeId = ReportingUtils.escapeHtml(suite.node_id);
        const statusClass = ReportingUtils.getStatusClass(suite.status);
        const statusLabel = ReportingUtils.escapeHtml(
          suite.status.toUpperCase()
        );
        const priorityBadge = suite.priority
          ? `<span class="priority-badge">${ReportingUtils.escapeHtml(
              suite.priority
            )}</span>`
          : "";
        const stepsSummary = ReportingUtils.escapeHtml(
          `${suite.steps_successful}/${suite.steps_executed}`
        );
        const durationSummary = ReportingUtils.escapeHtml(
          ReportingUtils.formatDuration(suite.duration_ms)
        );
        const successSummary = ReportingUtils.escapeHtml(
          suite.success_rate.toFixed(2)
        );
        const failureNotice =
          suite.steps_failed > 0
            ? `<div class="suite-card__alert suite-card__alert--danger">${ReportingUtils.escapeHtml(
                `${suite.steps_failed} failing step${
                  suite.steps_failed === 1 ? "" : "s"
                }`
              )}</div>`
            : "";
        const errorSection =
          suite.status === "failure" && suite.error_message
            ? `<p class="suite-card__error">${ReportingUtils.escapeHtml(
                suite.error_message
              )}</p>`
            : "";
        const linkMarkup = link
          ? `<a class="suite-link" href="${ReportingUtils.escapeHtml(
              link
            )}">Open report &rarr;</a>`
          : `<span class="suite-link suite-link--disabled">Per-suite HTML disabled</span>`;
        const windowLabel = ReportingUtils.escapeHtml(
          `${ReportingUtils.formatDateTime(
            suite.start_time
          )} - ${ReportingUtils.formatDateTime(suite.end_time)}`
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
  }

  /**
   * Render suites section wrapper
   */
  private renderSuitesSection(suitesMarkup: string): string {
    if (suitesMarkup.trim().length === 0) {
      return `<section class="suite-section">
        <div class="empty-state">
          No suites were executed for this run.
        </div>
      </section>`;
    }

    return `<section class="suite-section">
      <h2>Suite Runs</h2>
      <div class="suite-grid">
${suitesMarkup}
      </div>
    </section>`;
  }

  /**
   * Render hero section for suite detail page
   */
  private renderSuiteHeroSection(
    suite: SuiteExecutionResult,
    context: HtmlRenderContext
  ): string {
    const projectName = ReportingUtils.escapeHtml(context.projectName);
    const generatedAtLabel = ReportingUtils.escapeHtml(context.generatedAt);
    const suiteName = ReportingUtils.escapeHtml(suite.suite_name);
    const nodeId = ReportingUtils.escapeHtml(suite.node_id);
    const statusClass = ReportingUtils.getStatusClass(suite.status);
    const statusLabel = ReportingUtils.escapeHtml(suite.status.toUpperCase());
    const durationLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDuration(suite.duration_ms)
    );
    const successRateLabel = ReportingUtils.escapeHtml(
      suite.success_rate.toFixed(2)
    );
    const totalStepsLabel = ReportingUtils.escapeHtml(
      suite.steps_executed.toString()
    );
    const passedStepsLabel = ReportingUtils.escapeHtml(
      suite.steps_successful.toString()
    );
    const failedStepsLabel = ReportingUtils.escapeHtml(
      suite.steps_failed.toString()
    );
    const skippedStepsCount = Math.max(
      0,
      suite.steps_executed - suite.steps_successful - suite.steps_failed
    );
    const skippedStepsLabel = ReportingUtils.escapeHtml(
      skippedStepsCount.toString()
    );
    const startTimeLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDateTime(suite.start_time)
    );
    const endTimeLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDateTime(suite.end_time)
    );
    const priorityBadge = suite.priority
      ? `<span class="hero-meta-item hero-meta-item--badge">Priority ${ReportingUtils.escapeHtml(
          suite.priority
        )}</span>`
      : "";
    const suiteErrorBanner = suite.error_message
      ? `<div class="suite-error-banner">${ReportingUtils.escapeHtml(
          suite.error_message
        )}</div>`
      : "";

    return `<div class="hero">
      <span class="hero-badge">${projectName}</span>
      <h1 class="hero-title">${suiteName}</h1>
      <p class="hero-subtitle">Node ID: <code>${nodeId}</code></p>
      <p class="hero-meta">
        <span class="hero-meta-item">Generated at ${generatedAtLabel}</span>
        ${priorityBadge}
      </p>
      ${suiteErrorBanner}
      <div class="hero-stats">
        <div class="hero-stat hero-stat--neutral">
          <span>📅</span>
          <span>${startTimeLabel} - ${endTimeLabel}</span>
        </div>
        <div class="hero-stat hero-stat--neutral">
          <span>⏱️</span>
          <span>${durationLabel}</span>
        </div>
        <div class="hero-stat ${statusClass}">
          <span>${suite.status === "success" ? "✅" : "❌"}</span>
          <span>${statusLabel}</span>
        </div>
      </div>
      <div class="metrics-grid">
        <div class="metric-card metric-card--accent">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value">${successRateLabel}%</span>
          <span class="metric-subtext">${totalStepsLabel} steps executed</span>
        </div>
        <div class="metric-card metric-card--success">
          <span class="metric-label">Steps Passed</span>
          <span class="metric-value">${passedStepsLabel}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Steps Failed</span>
          <span class="metric-value">${failedStepsLabel}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Steps Skipped</span>
          <span class="metric-value">${skippedStepsLabel}</span>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render waterfall chart section showing request timing visualization
   */
  private renderWaterfallSection(suite: SuiteExecutionResult): string {
    // Filter steps that have request timing data
    const stepsWithRequests = suite.steps_results.filter(
      (step) => step.request_details && step.response_details?.timing
    );

    if (stepsWithRequests.length === 0) {
      return "";
    }

    // Calculate the earliest start time and latest end time
    let earliestStart = Infinity;
    let latestEnd = 0;

    stepsWithRequests.forEach((step) => {
      const timing = step.response_details?.timing;
      if (timing?.started_at && timing?.completed_at) {
        const start = new Date(timing.started_at).getTime();
        const end = new Date(timing.completed_at).getTime();
        earliestStart = Math.min(earliestStart, start);
        latestEnd = Math.max(latestEnd, end);
      }
    });

    const totalDuration = latestEnd - earliestStart;

    // Generate waterfall bars
    const waterfallBars = stepsWithRequests
      .map((step, index) => {
        const timing = step.response_details?.timing;
        if (!timing?.started_at || !timing?.completed_at) {
          return "";
        }

        const start = new Date(timing.started_at).getTime();
        const end = new Date(timing.completed_at).getTime();
        const duration = end - start;
        const offset = start - earliestStart;

        const offsetPercent = totalDuration > 0 ? (offset / totalDuration) * 100 : 0;
        const durationPercent = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

        const stepName = ReportingUtils.escapeHtml(step.step_name);
        const method = step.request_details?.method || "";
        const statusCode = step.response_details?.status_code || 0;
        const statusClass = statusCode >= 200 && statusCode < 300 ? "success" : "error";

        const ttfb = timing.time_to_first_byte_ms || 0;
        const download = timing.content_download_ms || 0;
        const ttfbPercent = duration > 0 ? (ttfb / duration) * 100 : 0;
        const downloadPercent = duration > 0 ? (download / duration) * 100 : 0;

        return `<div class="waterfall-row">
          <div class="waterfall-label">
            <span class="waterfall-step-name">${stepName}</span>
            <span class="waterfall-method waterfall-method-${method.toLowerCase()}">${method}</span>
            <span class="waterfall-status waterfall-status-${statusClass}">${statusCode}</span>
          </div>
          <div class="waterfall-chart">
            <div class="waterfall-bar" style="left: ${offsetPercent}%; width: ${durationPercent}%;">
              <div class="waterfall-segment waterfall-ttfb" style="width: ${ttfbPercent}%;" title="TTFB: ${ttfb}ms"></div>
              <div class="waterfall-segment waterfall-download" style="width: ${downloadPercent}%;" title="Download: ${download}ms"></div>
              <span class="waterfall-duration">${duration}ms</span>
            </div>
          </div>
        </div>`;
      })
      .join("\n");

    return `<section class="waterfall-section">
      <div class="waterfall-card">
        <div class="waterfall-header">
          <h2>📊 Request Waterfall</h2>
          <div class="waterfall-legend">
            <span class="legend-item">
              <span class="legend-color legend-ttfb"></span>
              Time to First Byte
            </span>
            <span class="legend-item">
              <span class="legend-color legend-download"></span>
              Content Download
            </span>
          </div>
        </div>
        <div class="waterfall-container">
          ${waterfallBars}
        </div>
      </div>
    </section>`;
  }

  /**
   * Render steps section for suite detail page
   */
  private renderStepsSection(suite: SuiteExecutionResult): string {
    const stepsMarkup = suite.steps_results
      .map((step, index) => this.renderStepCard(step, index))
      .join("\n");

    const totalLabel = ReportingUtils.escapeHtml(
      suite.steps_executed.toString()
    );
    const passedLabel = ReportingUtils.escapeHtml(
      suite.steps_successful.toString()
    );

    return `<section class="steps-section">
      <div class="steps-card">
        <div class="steps-card__header">
          <h2>Execution Steps</h2>
          <span class="steps-summary">${passedLabel}/${totalLabel} passed</span>
        </div>
        <div class="steps-grid">
${stepsMarkup}
        </div>
      </div>
    </section>`;
  }

  /**
   * Render individual step card
   */
  private renderStepCard(step: StepExecutionResult, index: number): string {
    const stepName = ReportingUtils.escapeHtml(step.step_name);
    const stepId = step.step_id
      ? `<span class="step-id">ID: ${ReportingUtils.escapeHtml(
          step.step_id
        )}</span>`
      : "";
    const statusClass = ReportingUtils.getStatusClass(step.status);
    const statusLabel = ReportingUtils.escapeHtml(step.status.toUpperCase());
    const durationLabel = ReportingUtils.escapeHtml(
      ReportingUtils.formatDuration(step.duration_ms)
    );
    const assertionsSummary = ReportingUtils.escapeHtml(
      ReportingUtils.formatAssertionsSummary(step.assertions_results)
    );

    const errorSection = step.error_message
      ? `<div class="metric metric-error">
          <span class="metric-label">Error</span>
          <span class="metric-value error-text">${ReportingUtils.escapeHtml(
            step.error_message
          )}</span>
        </div>`
      : "";

    const hasDetails =
      step.request_details ||
      step.response_details ||
      (step.assertions_results && step.assertions_results.length > 0) ||
      (step.captured_variables &&
        Object.keys(step.captured_variables).length > 0);

    const detailsSection = hasDetails
      ? this.renderStepDetails(step)
      : `<div class="step-details">
          <p class="detail-empty">No detailed information available</p>
        </div>`;

    return `<article class="step-card">
      <header class="step-header">
        <span class="step-index">#${index + 1}</span>
        <div class="step-info">
          <div class="step-name">${stepName}</div>
          ${stepId}
        </div>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </header>
      <div class="step-metrics">
        <div class="metric">
          <span class="metric-label">Duration</span>
          <span class="metric-value">${durationLabel}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Assertions</span>
          <span class="metric-value">${assertionsSummary}</span>
        </div>
        ${errorSection}
      </div>
      ${detailsSection}
    </article>`;
  }

  /**
   * Render step details section with tabs
   */
  private renderStepDetails(step: StepExecutionResult): string {
    const tabs: string[] = [];
    const contents: string[] = [];

    // Request tab
    if (step.request_details) {
      tabs.push(
        '<button class="tab-btn active" data-tab="request">Request</button>'
      );
      contents.push(this.renderRequestTab(step.request_details));
    }

    // Response tab
    if (step.response_details) {
      tabs.push(
        '<button class="tab-btn" data-tab="response">Response</button>'
      );
      contents.push(this.renderResponseTab(step.response_details));
    }

    // Assertions tab
    if (step.assertions_results && step.assertions_results.length > 0) {
      tabs.push(
        '<button class="tab-btn" data-tab="assertions">Assertions</button>'
      );
      contents.push(this.renderAssertionsTab(step.assertions_results));
    }

    // Captures tab
    if (
      step.captured_variables &&
      Object.keys(step.captured_variables).length > 0
    ) {
      tabs.push(
        '<button class="tab-btn" data-tab="captures">Captures</button>'
      );
      contents.push(this.renderCapturesTab(step.captured_variables));
    }

    // Exports tab (Dynamic Assignments & Input Results)
    const hasExports =
      (step.dynamic_assignments && step.dynamic_assignments.length > 0) ||
      (step.input_results && step.input_results.length > 0);
    if (hasExports) {
      tabs.push('<button class="tab-btn" data-tab="exports">Exports</button>');
      contents.push(this.renderExportsTab(step));
    }

    // Decision Tracking tab (Scenarios)
    if (step.scenarios_meta && step.scenarios_meta.has_scenarios) {
      tabs.push('<button class="tab-btn" data-tab="decisions">🔀 Decisions</button>');
      contents.push(this.renderDecisionsTab(step.scenarios_meta));
    }

    if (tabs.length === 0) {
      return `<div class="step-details">
        <p class="detail-empty">No details available</p>
      </div>`;
    }

    return `<div class="step-details">
      <div class="detail-tabs">
        <nav class="detail-tabs-nav">
          ${tabs.join("\n")}
        </nav>
        <div class="detail-tabs-content">
          ${contents.join("\n")}
        </div>
      </div>
    </div>`;
  }

  /**
   * Render request tab content
   */
  private renderRequestTab(request: any): string {
    const method = ReportingUtils.escapeHtml(request.method || "");
    const url = ReportingUtils.escapeHtml(
      request.full_url || request.url || ""
    );
    const curlCommand = ReportingUtils.generateCurlCommand(request);

    const headersJson = ReportingUtils.formatJson(request.headers);
    const headersHtml =
      request.headers && Object.keys(request.headers).length > 0
        ? `<div class="code-block">
            <div class="code-header">
              <span class="code-title">Headers</span>
              <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
                headersJson
              )}">
                <span class="copy-icon">📋</span>
                <span class="copy-text">Copy</span>
              </button>
            </div>
            <pre class="code-content">${ReportingUtils.escapeHtml(
              headersJson
            )}</pre>
          </div>`
        : "";

    const bodyContent =
      typeof request.body === "string"
        ? request.body
        : ReportingUtils.formatJson(request.body);
    const bodyHtml = request.body
      ? `<div class="code-block">
            <div class="code-header">
              <span class="code-title">Body</span>
              <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
                bodyContent
              )}">
                <span class="copy-icon">📋</span>
                <span class="copy-text">Copy</span>
              </button>
            </div>
            <pre class="code-content">${ReportingUtils.escapeHtml(
              bodyContent
            )}</pre>
          </div>`
      : "";

    const curlHtml = `<div class="code-block">
      <div class="code-header">
        <span class="code-title">cURL Command</span>
        <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
          curlCommand
        )}">
          <span class="copy-icon">📋</span>
          <span class="copy-text">Copy</span>
        </button>
      </div>
      <pre class="code-content">${ReportingUtils.escapeHtml(curlCommand)}</pre>
    </div>`;

    return `<div class="tab-content active" data-tab="request">
      <div class="request-summary">
        <span class="request-method request-method--${method.toLowerCase()}">${method}</span>
        <span class="request-url">${url}</span>
      </div>
      ${headersHtml}
      ${bodyHtml}
      ${curlHtml}
    </div>`;
  }

  /**
   * Render response tab content
   */
  private renderResponseTab(response: any): string {
    const status = ReportingUtils.escapeHtml(String(response.status_code || response.status || ""));
    const statusClass =
      (response.status_code || response.status) >= 200 && (response.status_code || response.status) < 300
        ? "response-status--success"
        : "response-status--error";

    // Render timing information if available
    const timingHtml = response.timing ? this.renderTimingBreakdown(response.timing) : "";

    const responseHeadersJson = ReportingUtils.formatJson(response.headers);
    const headersHtml =
      response.headers && Object.keys(response.headers).length > 0
        ? `<div class="code-block">
            <div class="code-header">
              <span class="code-title">Headers</span>
              <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
                responseHeadersJson
              )}">
                <span class="copy-icon">📋</span>
                <span class="copy-text">Copy</span>
              </button>
            </div>
            <pre class="code-content">${ReportingUtils.escapeHtml(
              responseHeadersJson
            )}</pre>
          </div>`
        : "";

    const responseBodyContent =
      typeof response.body === "string"
        ? response.body
        : ReportingUtils.formatJson(response.body);
    const bodyHtml = response.body
      ? `<div class="code-block">
          <div class="code-header">
            <span class="code-title">Body</span>
            <button class="copy-btn" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
              responseBodyContent
            )}">
              <span class="copy-icon">📋</span>
              <span class="copy-text">Copy</span>
            </button>
          </div>
          <pre class="code-content">${ReportingUtils.escapeHtml(
            responseBodyContent
          )}</pre>
        </div>`
      : "";

    return `<div class="tab-content" data-tab="response">
      <div class="response-summary">
        <span class="response-status ${statusClass}">Status: ${status}</span>
      </div>
      ${timingHtml}
      ${headersHtml}
      ${bodyHtml}
    </div>`;
  }

  /**
   * Render timing breakdown visualization
   */
  private renderTimingBreakdown(timing: any): string {
    if (!timing || !timing.total_ms) {
      return "";
    }

    const total = timing.total_ms || 0;
    const ttfb = timing.time_to_first_byte_ms || 0;
    const download = timing.content_download_ms || 0;

    // Calculate percentages for visual bar
    const ttfbPercent = total > 0 ? (ttfb / total) * 100 : 0;
    const downloadPercent = total > 0 ? (download / total) * 100 : 0;

    return `<div class="timing-breakdown">
      <h4 class="timing-title">⏱️ Request Timing</h4>
      <div class="timing-bar">
        <div class="timing-segment timing-ttfb" style="width: ${ttfbPercent}%" title="Time to First Byte: ${ttfb}ms"></div>
        <div class="timing-segment timing-download" style="width: ${downloadPercent}%" title="Content Download: ${download}ms"></div>
      </div>
      <div class="timing-details">
        <div class="timing-item">
          <span class="timing-label">Time to First Byte</span>
          <span class="timing-value">${ttfb}ms</span>
        </div>
        <div class="timing-item">
          <span class="timing-label">Content Download</span>
          <span class="timing-value">${download}ms</span>
        </div>
        <div class="timing-item timing-total">
          <span class="timing-label">Total</span>
          <span class="timing-value">${total}ms</span>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render assertions tab content
   */
  private renderAssertionsTab(assertions: any[]): string {
    const assertionsHtml = assertions
      .map((assertion) => {
        const passed = assertion.passed;
        const icon = passed ? "✅" : "❌";
        const statusClass = passed ? "assertion--passed" : "assertion--failed";

        // Use 'field' instead of 'path' as per AssertionResult interface
        const field = ReportingUtils.escapeHtml(
          assertion.field || assertion.path || "unknown"
        );
        const message = ReportingUtils.escapeHtml(assertion.message || "");

        // Format expected and actual values for better visibility
        const expected =
          assertion.expected !== undefined
            ? ReportingUtils.escapeHtml(JSON.stringify(assertion.expected))
            : "";
        const actual =
          assertion.actual !== undefined
            ? ReportingUtils.escapeHtml(JSON.stringify(assertion.actual))
            : "";

        // Build detailed assertion info
        let detailsHtml = "";
        if (expected || actual) {
          detailsHtml = `<div class="assertion-details">`;
          if (expected) {
            detailsHtml += `<span class="assertion-detail"><strong>Expected:</strong> ${expected}</span>`;
          }
          if (actual) {
            detailsHtml += `<span class="assertion-detail"><strong>Actual:</strong> ${actual}</span>`;
          }
          detailsHtml += `</div>`;
        }

        return `<div class="assertion ${statusClass}">
          <span class="assertion-icon">${icon}</span>
          <div class="assertion-content">
            <div class="assertion-path"><strong>${field}</strong></div>
            ${message ? `<div class="assertion-message">${message}</div>` : ""}
            ${detailsHtml}
          </div>
        </div>`;
      })
      .join("\n");

    // Create JSON of all assertions for copy
    const assertionsJson = ReportingUtils.formatJson(assertions);

    return `<div class="tab-content" data-tab="assertions">
      <div class="code-block">
        <div class="code-header">
          <span class="code-label">Assertions Results</span>
          <button class="copy-button" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
            assertionsJson
          )}">
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="assertions-list">
          ${assertionsHtml}
        </div>
      </div>
    </div>`;
  }

  /**
   * Render captures tab content
   */
  private renderCapturesTab(captures: Record<string, any>): string {
    const capturesHtml = Object.entries(captures)
      .map(([key, value]) => {
        const keyLabel = ReportingUtils.escapeHtml(key);
        const valueLabel = ReportingUtils.escapeHtml(
          typeof value === "string" ? value : ReportingUtils.formatJson(value)
        );

        return `<div class="capture-item">
          <div class="capture-key">${keyLabel}</div>
          <div class="capture-value">${valueLabel}</div>
        </div>`;
      })
      .join("\n");

    // Create JSON of all captures for copy
    const capturesJson = ReportingUtils.formatJson(captures);

    return `<div class="tab-content" data-tab="captures">
      <div class="code-block">
        <div class="code-header">
          <span class="code-label">Captured Variables</span>
          <button class="copy-button" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
            capturesJson
          )}">
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="captures-list">
          ${capturesHtml}
        </div>
      </div>
    </div>`;
  }

  /**
   * Render exports tab content (dynamic assignments and input variables)
   */
  private renderExportsTab(step: StepExecutionResult): string {
    let contentHtml = "";

    // Dynamic Assignments section
    if (step.dynamic_assignments && step.dynamic_assignments.length > 0) {
      const dynamicHtml = step.dynamic_assignments
        .map((assignment) => {
          const nameLabel = ReportingUtils.escapeHtml(assignment.name);
          const valueLabel = ReportingUtils.escapeHtml(
            typeof assignment.value === "string"
              ? assignment.value
              : ReportingUtils.formatJson(assignment.value)
          );
          const scopeLabel = ReportingUtils.escapeHtml(
            assignment.scope || "runtime"
          );
          const sourceLabel = ReportingUtils.escapeHtml(
            assignment.source || "computed"
          );
          const persistIcon = assignment.persist ? "🌐" : "";
          const persistLabel = assignment.persist ? " (Global)" : "";

          return `<div class="export-item">
            <div class="export-header">
              <span class="export-name">${nameLabel}</span>
              <span class="export-badge ${
                assignment.persist ? "export-badge--global" : ""
              }">${scopeLabel}${persistLabel} ${persistIcon}</span>
            </div>
            <div class="export-meta">
              <span class="export-source">Source: ${sourceLabel}</span>
              ${
                assignment.expression
                  ? `<span class="export-expr">Expression: ${ReportingUtils.escapeHtml(
                      assignment.expression
                    )}</span>`
                  : ""
              }
            </div>
            <div class="export-value">${valueLabel}</div>
          </div>`;
        })
        .join("\n");

      contentHtml += `<div class="export-section">
        <h4 class="export-section-title">Dynamic Assignments</h4>
        <div class="exports-list">
          ${dynamicHtml}
        </div>
      </div>`;
    }

    // Input Results section
    if (step.input_results && step.input_results.length > 0) {
      const inputHtml = step.input_results
        .map((result) => {
          const nameLabel = ReportingUtils.escapeHtml(result.variable);
          const valueLabel = ReportingUtils.escapeHtml(
            typeof result.value === "string"
              ? result.value
              : ReportingUtils.formatJson(result.value)
          );
          const statusIcon = result.validation_passed ? "✅" : "⚠️";
          const defaultLabel = result.used_default ? " (default)" : "";

          return `<div class="export-item">
            <div class="export-header">
              <span class="export-name">${statusIcon} ${nameLabel}</span>
              <span class="export-badge">input${defaultLabel}</span>
            </div>
            <div class="export-value">${valueLabel}</div>
            ${
              result.derived_assignments &&
              result.derived_assignments.length > 0
                ? `
              <details class="export-derived">
                <summary>Derived Variables (${
                  result.derived_assignments.length
                })</summary>
                <div class="derived-list">
                  ${result.derived_assignments
                    .map(
                      (derived) =>
                        `<div class="derived-item">
                      <span class="derived-name">${ReportingUtils.escapeHtml(
                        derived.name
                      )}</span>
                      <span class="derived-value">${ReportingUtils.escapeHtml(
                        typeof derived.value === "string"
                          ? derived.value
                          : ReportingUtils.formatJson(derived.value)
                      )}</span>
                    </div>`
                    )
                    .join("")}
                </div>
              </details>
            `
                : ""
            }
          </div>`;
        })
        .join("\n");

      contentHtml += `<div class="export-section">
        <h4 class="export-section-title">Input Variables</h4>
        <div class="exports-list">
          ${inputHtml}
        </div>
      </div>`;
    }

    // Create JSON for copy
    const exportsData = {
      dynamic_assignments: step.dynamic_assignments || [],
      input_results: step.input_results || [],
    };
    const exportsJson = ReportingUtils.formatJson(exportsData);

    return `<div class="tab-content" data-tab="exports">
      <div class="code-block">
        <div class="code-header">
          <span class="code-label">Exported Variables</span>
          <button class="copy-button" onclick="copyToClipboard(this)" data-content="${ReportingUtils.escapeAttribute(
            exportsJson
          )}">
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        ${contentHtml}
      </div>
    </div>`;
  }

  /**
   * Render decision tracking tab showing scenario evaluations
   */
  private renderDecisionsTab(scenarioMeta: any): string {
    if (!scenarioMeta.evaluations || scenarioMeta.evaluations.length === 0) {
      return `<div class="tab-content" data-tab="decisions">
        <div class="detail-empty">No scenario evaluations recorded</div>
      </div>`;
    }

    const evaluationsHtml = scenarioMeta.evaluations
      .map((evaluation: any, index: number) => {
        const conditionLabel = ReportingUtils.escapeHtml(evaluation.condition || "");
        const branchLabel = evaluation.branch || "none";
        const matched = evaluation.matched;
        const executed = evaluation.executed;

        const matchIcon = matched ? "✅" : "❌";
        const branchIcon = branchLabel === "then" ? "➡️" : branchLabel === "else" ? "⬅️" : "⏸️";
        const statusClass = matched ? "decision-matched" : "decision-not-matched";
        const executionClass = executed ? "decision-executed" : "decision-skipped";

        let actionsHtml = "";
        if (evaluation.assertions_added || evaluation.captures_added) {
          const actions = [];
          if (evaluation.assertions_added) {
            actions.push(`${evaluation.assertions_added} assertion(s)`);
          }
          if (evaluation.captures_added) {
            actions.push(`${evaluation.captures_added} capture(s)`);
          }
          actionsHtml = `<div class="decision-actions">
            <span class="decision-actions-label">Actions performed:</span>
            <span class="decision-actions-value">${actions.join(", ")}</span>
          </div>`;
        }

        return `<div class="decision-item ${statusClass} ${executionClass}">
          <div class="decision-header">
            <span class="decision-index">Scenario #${evaluation.index + 1}</span>
            <div class="decision-status">
              <span class="decision-match">${matchIcon} ${matched ? "Matched" : "Not Matched"}</span>
              <span class="decision-branch">${branchIcon} ${branchLabel}</span>
            </div>
          </div>
          <div class="decision-condition">
            <span class="decision-condition-label">Condition:</span>
            <code class="decision-condition-value">${conditionLabel}</code>
          </div>
          ${actionsHtml}
          ${!executed ? '<div class="decision-note">⚠️ Not executed</div>' : ""}
        </div>`;
      })
      .join("\n");

    const summaryHtml = `<div class="decisions-summary">
      <div class="summary-item">
        <span class="summary-label">Total Scenarios:</span>
        <span class="summary-value">${scenarioMeta.evaluations.length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Executed:</span>
        <span class="summary-value">${scenarioMeta.executed_count}</span>
      </div>
    </div>`;

    return `<div class="tab-content" data-tab="decisions">
      <div class="code-block">
        <div class="code-header">
          <span class="code-label">Scenario Decision Flow</span>
        </div>
        ${summaryHtml}
        <div class="decisions-list">
          ${evaluationsHtml}
        </div>
      </div>
    </div>`;
  }

  /**
   * Render CSS styles (truncated for brevity - includes full Postman-inspired dark theme)
   */
  private renderStyles(): string {
    return `<style>
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
      * { box-sizing: border-box; }
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
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
      .hero {
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(12, 18, 28, 0.94));
        border: 1px solid var(--border-strong);
        border-radius: 6px;
        padding: 28px;
        box-shadow: 0 16px 28px rgba(8, 15, 26, 0.32);
      }
      .hero-badge {
        display: inline-flex;
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
      }
      .hero-subtitle, .hero-meta {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
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
      .hero-stat--success { border-color: rgba(45, 212, 191, 0.5); color: var(--success); }
      .hero-stat--danger { border-color: rgba(248, 113, 113, 0.5); color: var(--danger); }
      .hero-stat--neutral { border-color: rgba(148, 163, 184, 0.35); color: var(--muted); }
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
      .metric-card--success { border-color: rgba(45, 212, 191, 0.3); }
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
      .metric-subtext { font-size: 0.9rem; color: var(--muted); }
      .suite-section { margin-top: 52px; }
      .suite-section h2 { margin: 0 0 18px; font-size: 1.4rem; }
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
      }
      .suite-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 108, 55, 0.25);
      }
      .suite-card__header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
      }
      .suite-card__title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
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
      .suite-name { font-weight: 600; font-size: 1.05rem; }
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
        color: var(--danger);
      }
      .status-skipped {
        background: rgba(250, 204, 21, 0.18);
        color: var(--warning);
      }
      .suite-card__stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stat-label {
        font-size: 0.75rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .stat-value { font-weight: 600; }
      .stat-value--code {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.85rem;
      }
      .suite-card__meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .meta-item { font-size: 0.85rem; color: var(--muted); }
      .suite-card__alert {
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .suite-card__alert--danger {
        background: rgba(248, 113, 113, 0.15);
        color: var(--danger);
        border: 1px solid rgba(248, 113, 113, 0.3);
      }
      .suite-card__error {
        margin: 0;
        padding: 8px 12px;
        background: rgba(248, 113, 113, 0.1);
        border-left: 3px solid var(--danger);
        font-size: 0.9rem;
        color: var(--danger);
      }
      .suite-card__footer { display: flex; justify-content: flex-end; }
      .suite-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: var(--accent);
        color: white;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.2s ease;
      }
      .suite-link:hover { background: #ff7a4a; }
      .suite-link--disabled {
        background: var(--surface);
        color: var(--muted);
        cursor: not-allowed;
      }
      .steps-section { margin-top: 48px; }
      .steps-card {
        background: var(--surface-alt);
        border-radius: 6px;
        border: 1px solid var(--border);
        padding: 20px 22px;
        box-shadow: 0 16px 28px rgba(8, 15, 26, 0.28);
      }
      .steps-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .steps-card__header h2 { margin: 0; font-size: 1.35rem; }
      .steps-summary { color: var(--muted); font-size: 0.95rem; }
      .steps-grid { display: grid; gap: 16px; margin-top: 16px; }
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
        width: 32px;
        height: 32px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--muted);
      }
      .step-info { flex: 1; }
      .step-name { font-weight: 600; margin-bottom: 4px; }
      .step-id {
        color: var(--muted);
        font-size: 0.8rem;
      }
      .step-metrics {
        display: flex;
        gap: 16px;
        padding: 12px 16px;
        background: var(--surface-soft);
        border-bottom: 1px solid var(--border);
      }
      .metric { display: flex; flex-direction: column; gap: 4px; }
      .metric-error { color: var(--danger); }
      .error-text { color: rgba(248, 113, 113, 0.95); }
      .step-details { padding: 16px; }
      .detail-empty { color: var(--muted); font-size: 0.9rem; }
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
      .tab-content { display: none; padding: 16px; }
      .tab-content.active { display: block; }
      .code-block {
        background: var(--surface-soft);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .code-block:last-child { margin-bottom: 0; }
      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
      }
      .code-title {
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .copy-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--text);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .copy-btn:hover {
        background: var(--surface-soft);
        border-color: var(--accent);
      }
      .copy-icon { font-size: 0.9rem; }
      .code-content {
        margin: 0;
        padding: 14px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.85rem;
        line-height: 1.6;
        color: var(--text);
        overflow-x: auto;
      }
      .request-summary, .response-summary {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: var(--surface-alt);
        border-radius: 4px;
        margin-bottom: 12px;
      }
      .request-method {
        display: inline-flex;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 700;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        background: var(--success);
        color: #000;
      }
      .request-method--post { background: #facc15; }
      .request-method--put { background: #60a5fa; }
      .request-method--delete { background: var(--danger); color: #fff; }
      .request-url {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9rem;
        color: var(--text);
        word-break: break-all;
      }
      .response-status {
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .response-status--success {
        background: rgba(45, 212, 191, 0.15);
        color: var(--success);
      }
      .response-status--error {
        background: rgba(248, 113, 113, 0.15);
        color: var(--danger);
      }
      .assertions-list, .captures-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .assertion {
        display: flex;
        align-items: start;
        gap: 12px;
        padding: 12px;
        background: var(--surface-soft);
        border-radius: 4px;
        border-left: 3px solid transparent;
      }
      .assertion--passed { border-left-color: var(--success); }
      .assertion--failed { border-left-color: var(--danger); }
      .assertion-icon { font-size: 1.2rem; }
      .assertion-content { flex: 1; }
      .assertion-path {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9rem;
        color: var(--text);
        margin-bottom: 4px;
        font-weight: 600;
      }
      .assertion-message {
        font-size: 0.85rem;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .assertion-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border);
      }
      .assertion-detail {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.8rem;
        color: var(--muted);
      }
      .assertion-detail strong {
        color: var(--text);
        margin-right: 6px;
      }
      .capture-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--surface-soft);
        border-radius: 4px;
      }
      .capture-key {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--accent);
      }
      .capture-value {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.85rem;
        color: var(--text);
        word-break: break-all;
      }
      /* Export styles */
      .export-section {
        margin-bottom: 24px;
      }
      .export-section:last-child {
        margin-bottom: 0;
      }
      .export-section-title {
        margin: 0 0 12px 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .exports-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .export-item {
        padding: 14px;
        background: var(--surface-soft);
        border-radius: 6px;
        border-left: 3px solid var(--accent);
      }
      .export-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .export-name {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--accent);
      }
      .export-badge {
        display: inline-flex;
        padding: 2px 8px;
        font-size: 0.75rem;
        font-weight: 600;
        background: rgba(148, 163, 184, 0.15);
        color: var(--muted);
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .export-badge--global {
        background: rgba(45, 212, 191, 0.15);
        color: var(--success);
      }
      .export-meta {
        display: flex;
        gap: 12px;
        margin-bottom: 8px;
        font-size: 0.8rem;
        color: var(--muted);
      }
      .export-source, .export-expr {
        font-family: 'Consolas', 'Monaco', monospace;
      }
      .export-value {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.85rem;
        color: var(--text);
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        word-break: break-all;
      }
      .export-derived {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }
      .export-derived summary {
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--muted);
        user-select: none;
      }
      .export-derived summary:hover {
        color: var(--text);
      }
      .derived-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .derived-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.8rem;
      }
      .derived-name {
        color: var(--muted);
        flex-shrink: 0;
      }
      .derived-value {
        color: var(--text);
        word-break: break-all;
      }
      .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: var(--muted);
        font-size: 1.05rem;
      }
      .suite-error-banner {
        margin-top: 16px;
        padding: 12px 16px;
        background: rgba(248, 113, 113, 0.15);
        border: 1px solid rgba(248, 113, 113, 0.3);
        border-radius: 4px;
        color: var(--danger);
        font-size: 0.95rem;
      }
      .hero-meta-item--badge {
        display: inline-flex;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Waterfall Chart Styles */
      .waterfall-section {
        margin-top: 52px;
      }
      .waterfall-card {
        background: var(--surface);
        border-radius: 6px;
        border: 1px solid var(--border);
        padding: 24px;
        box-shadow: 0 12px 24px rgba(8, 15, 26, 0.2);
      }
      .waterfall-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .waterfall-header h2 {
        margin: 0;
        font-size: 1.4rem;
      }
      .waterfall-legend {
        display: flex;
        gap: 20px;
        font-size: 0.85rem;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
      }
      .legend-color {
        width: 20px;
        height: 12px;
        border-radius: 3px;
      }
      .legend-ttfb {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
      }
      .legend-download {
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
      }
      .waterfall-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .waterfall-row {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 16px;
        align-items: center;
        min-height: 40px;
      }
      .waterfall-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
      }
      .waterfall-step-name {
        color: var(--text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .waterfall-method {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      .waterfall-method-get { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
      .waterfall-method-post { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
      .waterfall-method-put { background: rgba(251, 146, 60, 0.2); color: #fb923c; }
      .waterfall-method-delete { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      .waterfall-method-patch { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
      .waterfall-status {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .waterfall-status-success { background: rgba(45, 212, 191, 0.2); color: var(--success); }
      .waterfall-status-error { background: rgba(248, 113, 113, 0.2); color: var(--danger); }
      .waterfall-chart {
        position: relative;
        height: 32px;
        background: var(--surface-alt);
        border-radius: 4px;
        border: 1px solid var(--border);
      }
      .waterfall-bar {
        position: absolute;
        height: 100%;
        display: flex;
        border-radius: 3px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .waterfall-bar:hover {
        transform: scaleY(1.1);
        z-index: 10;
      }
      .waterfall-segment {
        height: 100%;
      }
      .waterfall-ttfb {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
      }
      .waterfall-download {
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
      }
      .waterfall-duration {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }

      /* Timing Breakdown Styles */
      .timing-breakdown {
        margin: 16px 0;
        padding: 16px;
        background: var(--surface-alt);
        border-radius: 6px;
        border: 1px solid var(--border);
      }
      .timing-title {
        margin: 0 0 12px 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text);
      }
      .timing-bar {
        display: flex;
        height: 24px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .timing-segment {
        height: 100%;
        transition: opacity 0.2s ease;
      }
      .timing-segment:hover {
        opacity: 0.8;
      }
      .timing-details {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .timing-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
      }
      .timing-item.timing-total {
        padding-top: 8px;
        border-top: 1px solid var(--border);
        font-weight: 600;
      }
      .timing-label {
        color: var(--muted);
      }
      .timing-value {
        color: var(--text);
        font-weight: 600;
        font-family: 'Consolas', 'Monaco', monospace;
      }

      /* Decision Tracking Styles */
      .decisions-summary {
        display: flex;
        gap: 24px;
        padding: 16px;
        margin-bottom: 16px;
        background: var(--surface-alt);
        border-radius: 6px;
        border: 1px solid var(--border);
      }
      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .summary-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
      }
      .summary-value {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text);
      }
      .decisions-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .decision-item {
        padding: 16px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--surface-alt);
        transition: all 0.2s ease;
      }
      .decision-item:hover {
        border-color: var(--border-strong);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .decision-matched {
        border-left: 3px solid var(--success);
      }
      .decision-not-matched {
        border-left: 3px solid var(--muted);
      }
      .decision-skipped {
        opacity: 0.6;
      }
      .decision-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .decision-index {
        font-weight: 600;
        color: var(--text);
      }
      .decision-status {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .decision-match,
      .decision-branch {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .decision-condition {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 8px;
      }
      .decision-condition-label {
        font-size: 0.8rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .decision-condition-value {
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.85rem;
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.2);
      }
      .decision-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border);
        font-size: 0.85rem;
      }
      .decision-actions-label {
        color: var(--muted);
      }
      .decision-actions-value {
        color: var(--text);
        font-weight: 500;
      }
      .decision-note {
        margin-top: 8px;
        padding: 8px;
        background: rgba(251, 191, 36, 0.1);
        border-left: 3px solid var(--warning);
        border-radius: 4px;
        font-size: 0.85rem;
        color: var(--warning);
      }

      @media (max-width: 768px) {
        .layout { padding: 32px 20px; }
        .hero { padding: 20px; }
        .hero-title { font-size: 1.75rem; }
        .suite-grid { grid-template-columns: 1fr; }
        .metrics-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .waterfall-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .waterfall-legend {
          flex-direction: column;
          gap: 8px;
        }
      }
    </style>`;
  }

  /**
   * Render JavaScript for interactivity
   */
  private renderScripts(): string {
    return `<script>
      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const tabName = this.getAttribute('data-tab');
          const tabsContainer = this.closest('.detail-tabs');

          // Update buttons
          tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          // Update content
          tabsContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          tabsContainer.querySelector(\`.tab-content[data-tab="\${tabName}"]\`).classList.add('active');
        });
      });

      // Copy to clipboard
      function copyToClipboard(button) {
        const content = button.getAttribute('data-content');
        navigator.clipboard.writeText(content).then(() => {
          const originalText = button.querySelector('.copy-text').textContent;
          button.querySelector('.copy-text').textContent = 'Copied!';
          setTimeout(() => {
            button.querySelector('.copy-text').textContent = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Copy failed:', err);
        });
      }
    </script>`;
  }
}
