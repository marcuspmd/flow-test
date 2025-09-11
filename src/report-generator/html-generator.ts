import fs from "fs";
import path from "path";
import { AggregatedResult, StepExecutionResult } from "../types/config.types";

export interface HTMLGeneratorOptions {
  templateDir?: string;
  outputDir?: string;
  includeCurlCommands?: boolean;
  includeRawData?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export class HTMLReportGenerator {
  private options: HTMLGeneratorOptions;
  private compiledCSS: string = '';

  constructor(options: HTMLGeneratorOptions = {}) {
    this.options = {
      templateDir: path.join(__dirname, '../templates'),
      outputDir: './results',
      includeCurlCommands: true,
      includeRawData: true,
      theme: 'light',
      ...options
    };
  }

  /**
   * Generates HTML report from JSON data
   */
  async generateFromJSON(jsonPath: string, outputPath?: string): Promise<string> {
    const jsonData = await this.loadJSONData(jsonPath);
    return this.generateHTML(jsonData, outputPath);
  }

  /**
   * Generates HTML report from aggregated result object
   */
  async generateHTML(data: AggregatedResult, outputPath?: string): Promise<string> {
    // Compile CSS if not already done
    if (!this.compiledCSS) {
      await this.compileCSS();
    }

    const html = this.buildHTMLReport(data);
    
    const finalOutputPath = outputPath || path.join(this.options.outputDir!, `${this.sanitizeFileName(data.project_name)}_${this.generateTimestamp()}.html`);
    
    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(finalOutputPath, html, 'utf8');
    
    // Also create latest.html
    const latestPath = path.join(this.options.outputDir!, 'latest.html');
    fs.writeFileSync(latestPath, html, 'utf8');
    
    return finalOutputPath;
  }

  private async loadJSONData(jsonPath: string): Promise<AggregatedResult> {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonContent) as AggregatedResult;
  }

  private async compileCSS(): Promise<void> {
    try {
      // For now, we'll include a basic CSS. In production, this would be compiled Tailwind
      this.compiledCSS = await this.loadCompiledCSS();
    } catch (error) {
      console.warn('Could not load compiled CSS, using fallback');
      this.compiledCSS = this.getFallbackCSS();
    }
  }

  private async loadCompiledCSS(): Promise<string> {
    return `
      /* Professional Testing Report Styles v2.0 */
      :root {
        --color-success: #059669;
        --color-error: #dc2626;
        --color-warning: #d97706;
        --color-info: #0369a1;
        --color-skipped: #6b7280;
        --color-gray-50: #f9fafb;
        --color-gray-100: #f3f4f6;
        --color-gray-200: #e5e7eb;
        --color-gray-300: #d1d5db;
        --color-gray-700: #374151;
        --color-gray-800: #1f2937;
        --color-gray-900: #111827;
        --border-radius: 4px;
        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        --font-mono: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
      }
      
      * { box-sizing: border-box; }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        margin: 0;
        background: var(--color-gray-50);
        line-height: 1.5;
        color: var(--color-gray-900);
      }
      
      .container {
        max-width: 1600px;
        margin: 0 auto;
        padding: 1.5rem;
      }
      
      /* Header */
      .header {
        background: white;
        padding: 2rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-md);
        margin-bottom: 2rem;
        border: 1px solid var(--color-gray-200);
      }
      
      .title {
        font-size: 2rem;
        font-weight: 600;
        color: var(--color-gray-900);
        margin: 0 0 0.5rem 0;
      }
      
      .subtitle {
        font-size: 1rem;
        color: var(--color-gray-700);
        margin: 0;
      }
      
      /* Metrics Grid */
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
      }
      
      .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--color-gray-200);
        border-left: 3px solid var(--color-info);
      }
      
      .metric-card-success { border-left-color: var(--color-success); }
      .metric-card-error { border-left-color: var(--color-error); }
      .metric-card-warning { border-left-color: var(--color-warning); }
      
      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 0.25rem 0;
      }
      
      .metric-label {
        font-size: 0.75rem;
        color: var(--color-gray-700);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 500;
        margin: 0;
      }
      
      /* Suite Cards */
      .suite-card {
        background: white;
        border: 1px solid var(--color-gray-200);
        border-radius: var(--border-radius);
        margin: 1rem 0;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
      }
      
      .suite-header {
        padding: 1rem 1.25rem;
        background: var(--color-gray-50);
        border-bottom: 1px solid var(--color-gray-200);
        cursor: pointer;
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 1rem;
        align-items: center;
        transition: background-color 0.15s ease;
      }
      
      .suite-header:hover {
        background: var(--color-gray-100);
      }
      
      .suite-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      
      .suite-name {
        font-weight: 600;
        font-size: 1rem;
        color: var(--color-gray-900);
        margin: 0;
      }
      
      .suite-details {
        font-size: 0.875rem;
        color: var(--color-gray-700);
        font-family: var(--font-mono);
      }
      
      .suite-stats {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: var(--color-gray-700);
      }
      
      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-family: var(--font-mono);
      }
      
      .suite-content {
        display: none;
        background: white;
      }
      
      .suite-content.expanded {
        display: block;
      }
      
      /* Status Badges */
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: var(--border-radius);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
      
      .status-success { background: #dcfce7; color: #166534; }
      .status-error { background: #fef2f2; color: #991b1b; }
      .status-warning { background: #fef3c7; color: #92400e; }
      .status-skipped { background: #f3f4f6; color: #6b7280; }
      
      /* Step Cards */
      .step-card {
        border: 1px solid var(--color-gray-200);
        border-radius: var(--border-radius);
        margin: 0.75rem 0;
        background: white;
      }
      
      .step-header {
        padding: 0.875rem 1rem;
        background: var(--color-gray-50);
        border-bottom: 1px solid var(--color-gray-200);
        cursor: pointer;
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 0.75rem;
        align-items: center;
        transition: background-color 0.15s ease;
      }
      
      .step-header:hover {
        background: var(--color-gray-100);
      }
      
      .step-number {
        font-family: var(--font-mono);
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--color-gray-700);
        min-width: 2rem;
      }
      
      .step-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }
      
      .step-name {
        font-weight: 500;
        font-size: 0.9375rem;
        color: var(--color-gray-900);
        margin: 0;
      }
      
      .step-method-url {
        font-size: 0.8125rem;
        font-family: var(--font-mono);
        color: var(--color-gray-700);
      }
      
      .step-timing {
        font-size: 0.75rem;
        font-family: var(--font-mono);
        color: var(--color-gray-700);
      }
      
      .step-content {
        display: none;
        background: white;
      }
      
      .step-content.expanded {
        display: block;
      }
      
      /* Tabs */
      .tab-container {
        border-top: 1px solid var(--color-gray-200);
      }
      
      .tab-header {
        display: flex;
        background: var(--color-gray-50);
        border-bottom: 1px solid var(--color-gray-200);
      }
      
      .tab-button {
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-gray-700);
        border-bottom: 2px solid transparent;
        transition: all 0.15s ease;
      }
      
      .tab-button:hover {
        color: var(--color-gray-900);
        background: var(--color-gray-100);
      }
      
      .tab-button.active {
        color: var(--color-info);
        border-bottom-color: var(--color-info);
        background: white;
      }
      
      .tab-content {
        padding: 1rem;
        display: none;
      }
      
      .tab-content.active {
        display: block;
      }
      
      /* Request/Response */
      .request-response-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin: 0;
      }
      
      .request-section, .response-section {
        background: var(--color-gray-50);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--border-radius);
        overflow: hidden;
      }
      
      .section-header {
        padding: 0.75rem 1rem;
        background: var(--color-gray-100);
        border-bottom: 1px solid var(--color-gray-200);
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--color-gray-900);
      }
      
      .section-content {
        padding: 1rem;
      }
      
      /* Code Blocks */
      .code-block {
        background: var(--color-gray-900);
        color: var(--color-gray-100);
        padding: 1rem;
        border-radius: var(--border-radius);
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
        position: relative;
        border: 1px solid var(--color-gray-700);
        line-height: 1.4;
      }
      
      .copy-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: var(--color-gray-700);
        color: white;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: var(--border-radius);
        font-size: 0.6875rem;
        cursor: pointer;
        transition: background-color 0.15s ease;
        font-weight: 500;
      }
      
      .copy-button:hover {
        background: var(--color-gray-600);
      }
      
      /* Assertions */
      .assertions-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      
      .assertion-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        border-radius: var(--border-radius);
        border: 1px solid;
        font-size: 0.875rem;
      }
      
      .assertion-pass {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #166534;
      }
      
      .assertion-fail {
        background: #fef2f2;
        border-color: #fecaca;
        color: #991b1b;
      }
      
      .assertion-field {
        font-weight: 600;
        font-family: var(--font-mono);
      }
      
      .assertion-values {
        margin-top: 0.25rem;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
      }
      
      /* Scenarios */
      .scenarios-list {
        margin: 0;
        padding: 0;
      }
      
      .scenario-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        border: 1px solid var(--color-gray-200);
        border-radius: var(--border-radius);
        background: var(--color-gray-50);
      }
      
      .scenario-name {
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: var(--color-gray-900);
      }
      
      .scenario-condition {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--color-gray-700);
        margin-bottom: 0.5rem;
      }
      
      .scenario-result {
        font-size: 0.875rem;
        padding: 0.5rem;
        border-radius: var(--border-radius);
        background: white;
        border: 1px solid var(--color-gray-200);
      }
      
      /* Skip Reasons */
      .skip-reason {
        background: #fafafa;
        border: 1px solid var(--color-gray-300);
        border-radius: var(--border-radius);
        padding: 0.75rem;
        margin: 0.5rem 0;
        font-size: 0.875rem;
        color: var(--color-gray-700);
      }
      
      .skip-reason-title {
        font-weight: 600;
        color: var(--color-gray-900);
        margin-bottom: 0.25rem;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .container { padding: 1rem; }
        .metrics-grid { grid-template-columns: 1fr; }
        .request-response-grid { grid-template-columns: 1fr; }
        .suite-header { grid-template-columns: 1fr auto; }
        .step-header { grid-template-columns: 1fr auto; }
        .tab-header { flex-wrap: wrap; }
        .title { font-size: 1.5rem; }
      }
      
      /* Utilities */
      .text-xs { font-size: 0.75rem; }
      .text-sm { font-size: 0.875rem; }
      .font-mono { font-family: var(--font-mono); }
      .font-semibold { font-weight: 600; }
      .text-gray-700 { color: var(--color-gray-700); }
      .mb-2 { margin-bottom: 0.5rem; }
      .mt-4 { margin-top: 1rem; }
      .p-3 { padding: 0.75rem; }
      
      /* Expand/Collapse Icons */
      .expand-icon {
        transition: transform 0.2s ease;
        font-size: 0.875rem;
        color: var(--color-gray-700);
      }
      
      .expand-icon.expanded {
        transform: rotate(90deg);
      }
    `;
  }

  private getFallbackCSS(): string {
    return `
      body { font-family: system-ui, sans-serif; margin: 40px; background: #f8f9fa; }
      .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
      .header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px; }
      .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
      .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; }
    `;
  }

  private buildHTMLReport(data: AggregatedResult): string {
    const successRate = data.success_rate;
    const statusColor = successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flow Test Report - ${this.escapeHtml(data.project_name)}</title>
    <style>${this.compiledCSS}</style>
</head>
<body>
    <div class="container">
        ${this.buildHeader(data)}
        ${this.buildMetrics(data, statusColor)}
        ${this.buildPerformanceSection(data)}
        ${this.buildSuitesSection(data)}
        ${this.buildFooter(data)}
    </div>
    
    <script>
        ${this.buildJavaScript()}
    </script>
</body>
</html>`;
  }

  private buildHeader(data: AggregatedResult): string {
    return `
        <div class="header">
            <h1 class="title">${this.escapeHtml(data.project_name)}</h1>
            <p class="subtitle">Test Execution Report - Generated with Enhanced Flow Test Engine v2.0</p>
        </div>
    `;
  }

  private buildMetrics(data: AggregatedResult, statusColor: string): string {
    return `
        <div class="metrics-grid">
            <div class="metric-card metric-card-${statusColor}">
                <div class="metric-value" style="color: var(--color-${statusColor})">${data.success_rate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.total_tests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.formatDuration(data.total_duration_ms)}</div>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.successful_tests} / ${data.failed_tests}</div>
                <div class="metric-label">Pass / Fail</div>
            </div>
        </div>
    `;
  }

  private buildPerformanceSection(data: AggregatedResult): string {
    if (!data.performance_summary) return '';

    const perf = data.performance_summary;
    return `
        <div class="suite-card">
            <div class="suite-header">
                <h3>🚀 Performance Metrics</h3>
            </div>
            <div class="suite-content expanded">
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${perf.total_requests}</div>
                        <div class="metric-label">Total Requests</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${perf.average_response_time_ms.toFixed(0)}ms</div>
                        <div class="metric-label">Avg Response Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${perf.requests_per_second.toFixed(1)}</div>
                        <div class="metric-label">Requests/Second</div>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  private buildSuitesSection(data: AggregatedResult): string {
    return `
        <div class="suites-section">
            <h3>Test Suites</h3>
            ${data.suites_results.map(suite => this.buildSuiteCard(suite)).join('')}
        </div>
    `;
  }

  private buildSuiteCard(suite: any): string {
    const statusClass = suite.status === 'success' ? 'success' : suite.status === 'failure' ? 'error' : suite.status === 'skipped' ? 'skipped' : 'warning';
    const statusIcon = suite.status === 'success' ? '✅' : suite.status === 'failure' ? '❌' : suite.status === 'skipped' ? '⏭️' : '⚠️';

    return `
        <div class="suite-card">
            <div class="suite-header" onclick="toggleSuite(this)">
                <div class="suite-info">
                    <h4 class="suite-name">${this.escapeHtml(suite.suite_name)}</h4>
                    <div class="suite-details">${this.escapeHtml(suite.file_path || 'Unknown file')} • ${this.formatDuration(suite.duration_ms)}</div>
                </div>
                <div class="suite-stats">
                    <div class="stat-item">
                        <span class="text-xs text-gray-700">STEPS</span>
                        <span class="font-mono">${suite.steps_successful || 0}/${suite.steps_executed || 0}</span>
                    </div>
                    ${suite.steps_failed ? `
                    <div class="stat-item">
                        <span class="text-xs text-gray-700">FAILED</span>
                        <span class="font-mono text-error">${suite.steps_failed}</span>
                    </div>
                    ` : ''}
                    <div class="stat-item">
                        <span class="text-xs text-gray-700">RATE</span>
                        <span class="font-mono">${(suite.success_rate || 0).toFixed(1)}%</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="status-badge status-${statusClass}">
                        ${statusIcon} ${suite.status.toUpperCase()}
                    </div>
                    <span class="expand-icon">▶</span>
                </div>
            </div>
            <div class="suite-content">
                ${suite.error_message ? `
                <div class="p-3 mb-2" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--border-radius); color: #991b1b;">
                    <div class="skip-reason-title">Suite Error:</div>
                    ${this.escapeHtml(suite.error_message)}
                </div>
                ` : ''}
                ${suite.steps_results ? suite.steps_results.map((step: any, index: number) => this.buildStepCard(step, index)).join('') : ''}
            </div>
        </div>
    `;
  }

  private buildStepCard(step: StepExecutionResult, index: number): string {
    const statusClass = step.status === 'success' ? 'success' : step.status === 'failure' ? 'error' : step.status === 'skipped' ? 'skipped' : 'warning';
    const statusIcon = step.status === 'success' ? '✅' : step.status === 'failure' ? '❌' : step.status === 'skipped' ? '⏭️' : '⚠️';
    const stepId = `step-${index}-${Date.now()}`;

    const method = step.request_details?.method || 'N/A';
    const url = (step.request_details as any)?.full_url || step.request_details?.url || 'N/A';
    const statusCode = step.response_details?.status_code;

    // Skip reason detection
    let skipReason = '';
    if (step.status === 'skipped') {
      skipReason = step.error_message || 'Step was skipped due to conditions or dependencies';
    }

    // Count assertions
    const assertionsCount = step.assertions_results?.length || 0;
    const passedAssertions = step.assertions_results?.filter(a => a.passed).length || 0;
    const failedAssertions = assertionsCount - passedAssertions;

    // Check for scenarios (you may need to add scenarios to StepExecutionResult type)
    const hasScenarios = (step as any).scenarios_results?.length > 0;
    
    return `
        <div class="step-card">
            <div class="step-header" onclick="toggleStep(this)">
                <div class="step-number">#${index + 1}</div>
                <div class="step-info">
                    <div class="step-name">${this.escapeHtml(step.step_name)}</div>
                    <div class="step-method-url">
                        <span style="font-weight: 600;">${method}</span>
                        ${url.length > 60 ? url.substring(0, 60) + '...' : url}
                        ${statusCode ? ` → ${statusCode}` : ''}
                    </div>
                </div>
                <div class="step-timing">${this.formatDuration(step.duration_ms)}</div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="status-badge status-${statusClass}">
                        ${statusIcon} ${step.status.toUpperCase()}
                    </div>
                    <span class="expand-icon">▶</span>
                </div>
            </div>
            <div class="step-content">
                ${skipReason ? `
                <div class="skip-reason">
                    <div class="skip-reason-title">Skip Reason:</div>
                    ${this.escapeHtml(skipReason)}
                </div>
                ` : ''}
                
                ${step.error_message && step.status !== 'skipped' ? `
                <div class="p-3 mb-2" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--border-radius); color: #991b1b;">
                    <div class="skip-reason-title">Error Details:</div>
                    ${this.escapeHtml(step.error_message)}
                </div>
                ` : ''}

                <div class="tab-container">
                    <div class="tab-header">
                        <button class="tab-button active" onclick="switchTab(this, '${stepId}-overview')">Overview</button>
                        ${step.request_details ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-request')">Request</button>` : ''}
                        ${step.response_details ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-response')">Response</button>` : ''}
                        ${assertionsCount > 0 ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-assertions')">Assertions (${passedAssertions}/${assertionsCount})</button>` : ''}
                        ${hasScenarios ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-scenarios')">Scenarios</button>` : ''}
                        ${this.options.includeCurlCommands && (step.request_details as any)?.curl_command ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-curl')">cURL</button>` : ''}
                    </div>
                    
                    <div id="${stepId}-overview" class="tab-content active">
                        ${this.buildStepOverview(step)}
                    </div>
                    
                    ${step.request_details ? `
                    <div id="${stepId}-request" class="tab-content">
                        ${this.buildRequestTab(step.request_details)}
                    </div>
                    ` : ''}
                    
                    ${step.response_details ? `
                    <div id="${stepId}-response" class="tab-content">
                        ${this.buildResponseTab(step.response_details)}
                    </div>
                    ` : ''}
                    
                    ${assertionsCount > 0 ? `
                    <div id="${stepId}-assertions" class="tab-content">
                        ${this.buildAssertionsTab(step.assertions_results || [])}
                    </div>
                    ` : ''}
                    
                    ${hasScenarios ? `
                    <div id="${stepId}-scenarios" class="tab-content">
                        ${this.buildScenariosTab((step as any).scenarios_results)}
                    </div>
                    ` : ''}
                    
                    ${this.options.includeCurlCommands && (step.request_details as any)?.curl_command ? `
                    <div id="${stepId}-curl" class="tab-content">
                        ${this.buildCurlTab((step.request_details as any).curl_command)}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
  }

  private buildFooter(data: AggregatedResult): string {
    return `
        <div class="footer" style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; color: #6b7280;">
            Generated on ${new Date().toLocaleString()}<br>
            Execution: ${data.start_time} to ${data.end_time}<br>
            <small>Powered by Flow Test Engine v2.0 with Enhanced HTML Reports</small>
        </div>
    `;
  }

  private buildJavaScript(): string {
    return `
        function toggleSuite(element) {
            const suiteCard = element.closest('.suite-card');
            const content = suiteCard.querySelector('.suite-content');
            const icon = suiteCard.querySelector('.expand-icon');
            
            content.classList.toggle('expanded');
            icon.classList.toggle('expanded');
        }

        function toggleStep(element) {
            const stepCard = element.closest('.step-card');
            const content = stepCard.querySelector('.step-content');
            const icon = stepCard.querySelector('.expand-icon');
            
            content.classList.toggle('expanded');
            icon.classList.toggle('expanded');
        }

        function switchTab(button, targetId) {
            const tabContainer = button.closest('.tab-container');
            
            // Remove active class from all buttons
            tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all tab contents
            tabContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Show target tab content
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }

        async function copyToClipboard(button, text) {
            try {
                await navigator.clipboard.writeText(text);
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.background = 'var(--color-success)';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = 'var(--color-gray-700)';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                button.textContent = 'Failed';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            }
        }

        // Auto-expand first failed step for quick debugging
        document.addEventListener('DOMContentLoaded', function() {
            const firstFailedStep = document.querySelector('.step-card .status-error');
            if (firstFailedStep) {
                const stepCard = firstFailedStep.closest('.step-card');
                const content = stepCard.querySelector('.step-content');
                const icon = stepCard.querySelector('.expand-icon');
                if (content) {
                    content.classList.add('expanded');
                    if (icon) icon.classList.add('expanded');
                }
            }
        });
    `;
  }

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
      .replace(/[:.]/g, '-')
      .replace(/T/, '_')
      .slice(0, 19);
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private escapeHtml(text: string | undefined | null): string {
    if (text === undefined || text === null) return '';
    if (typeof text !== 'string') text = String(text);
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private escapeForJS(text: string): string {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  private buildStepOverview(step: StepExecutionResult): string {
    const capturedVars = Object.keys(step.captured_variables || {}).length;
    const availableVars = Object.keys(step.available_variables || {}).length;
    
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div class="p-3" style="background: var(--color-gray-50); border-radius: var(--border-radius); border: 1px solid var(--color-gray-200);">
                <div class="text-xs text-gray-700 font-semibold">EXECUTION TIME</div>
                <div class="font-mono text-lg">${this.formatDuration(step.duration_ms)}</div>
            </div>
            ${step.assertions_results ? `
            <div class="p-3" style="background: var(--color-gray-50); border-radius: var(--border-radius); border: 1px solid var(--color-gray-200);">
                <div class="text-xs text-gray-700 font-semibold">ASSERTIONS</div>
                <div class="font-mono text-lg">${step.assertions_results.filter(a => a.passed).length}/${step.assertions_results.length}</div>
            </div>
            ` : ''}
            ${capturedVars > 0 ? `
            <div class="p-3" style="background: var(--color-gray-50); border-radius: var(--border-radius); border: 1px solid var(--color-gray-200);">
                <div class="text-xs text-gray-700 font-semibold">CAPTURED VARS</div>
                <div class="font-mono text-lg">${capturedVars}</div>
            </div>
            ` : ''}
        </div>
        
        ${capturedVars > 0 ? `
        <div style="margin: 1rem 0;">
            <h5 style="margin: 0 0 0.5rem 0; color: var(--color-gray-900); font-weight: 600;">Captured Variables</h5>
            <div style="background: var(--color-gray-50); border: 1px solid var(--color-gray-200); border-radius: var(--border-radius); padding: 1rem;">
                ${Object.entries(step.captured_variables || {}).map(([key, value]) => `
                    <div style="display: flex; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.875rem;">
                        <span style="font-weight: 600; color: var(--color-info); min-width: 120px;">${this.escapeHtml(key)}:</span>
                        <span style="color: var(--color-gray-700); word-break: break-all;">${this.escapeHtml(JSON.stringify(value))}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;
  }

  private buildRequestTab(request: any): string {
    const headers = request.headers ? Object.entries(request.headers) : [];
    const bodyStr = request.body ? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2)) : null;
    const rawRequest = request.raw_request;
    
    return `
        <div class="request-response-grid">
            <div class="request-section">
                <div class="section-header">📤 Request Details</div>
                <div class="section-content">
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">Method:</span>
                            <span class="font-mono" style="background: var(--color-gray-100); padding: 0.125rem 0.5rem; border-radius: var(--border-radius);">${request.method}</span>
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">URL:</span>
                            <div class="font-mono text-sm" style="background: var(--color-gray-100); padding: 0.5rem; border-radius: var(--border-radius); margin-top: 0.25rem; word-break: break-all;">
                                ${this.escapeHtml(request.full_url || request.url)}
                            </div>
                        </div>
                    </div>
                    
                    ${headers.length > 0 ? `
                    <div style="margin-bottom: 1rem;">
                        <span style="font-weight: 600;">Headers:</span>
                        <div class="code-block" style="margin-top: 0.25rem;">
                            ${headers.map(([key, value]) => `${key}: ${value}`).join('\n')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${bodyStr ? `
                    <div style="margin-bottom: 1rem;">
                        <span style="font-weight: 600;">Body:</span>
                        <div class="code-block" style="margin-top: 0.25rem;">
                            <button class="copy-button" onclick="copyToClipboard(this, '${this.escapeForJS(bodyStr)}')">Copy</button>
                            ${this.escapeHtml(bodyStr)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${rawRequest ? `
            <div class="response-section">
                <div class="section-header">🔍 Raw HTTP Request</div>
                <div class="section-content">
                    <div class="code-block">
                        <button class="copy-button" onclick="copyToClipboard(this, '${this.escapeForJS(rawRequest)}')">Copy</button>
                        ${this.escapeHtml(rawRequest)}
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
  }

  private buildResponseTab(response: any): string {
    const headers = response.headers ? Object.entries(response.headers) : [];
    const bodyStr = response.body ? (typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)) : null;
    const rawResponse = response.raw_response;
    
    return `
        <div class="request-response-grid">
            <div class="request-section">
                <div class="section-header">📥 Response Details</div>
                <div class="section-content">
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">Status:</span>
                            <span class="font-mono" style="background: ${response.status_code >= 400 ? '#fef2f2' : '#f0fdf4'}; color: ${response.status_code >= 400 ? '#991b1b' : '#166534'}; padding: 0.125rem 0.5rem; border-radius: var(--border-radius);">${response.status_code}</span>
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">Size:</span>
                            <span class="font-mono">${response.size_bytes || 0} bytes</span>
                        </div>
                    </div>
                    
                    ${headers.length > 0 ? `
                    <div style="margin-bottom: 1rem;">
                        <span style="font-weight: 600;">Headers:</span>
                        <div class="code-block" style="margin-top: 0.25rem;">
                            ${headers.map(([key, value]) => `${key}: ${value}`).join('\n')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${bodyStr ? `
                    <div style="margin-bottom: 1rem;">
                        <span style="font-weight: 600;">Body:</span>
                        <div class="code-block" style="margin-top: 0.25rem;">
                            <button class="copy-button" onclick="copyToClipboard(this, '${this.escapeForJS(bodyStr)}')">Copy</button>
                            ${this.escapeHtml(bodyStr)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${rawResponse ? `
            <div class="response-section">
                <div class="section-header">🔍 Raw HTTP Response</div>
                <div class="section-content">
                    <div class="code-block">
                        <button class="copy-button" onclick="copyToClipboard(this, '${this.escapeForJS(rawResponse)}')">Copy</button>
                        ${this.escapeHtml(rawResponse)}
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
  }

  private buildAssertionsTab(assertions: any[]): string {
    if (!assertions || assertions.length === 0) {
      return '<div style="padding: 1rem; text-align: center; color: var(--color-gray-700);">No assertions defined for this step.</div>';
    }
    
    const passed = assertions.filter(a => a.passed).length;
    const failed = assertions.length - passed;
    
    return `
        <div style="margin-bottom: 1rem;">
            <div style="display: flex; gap: 1rem;">
                <div class="p-3" style="background: #f0fdf4; border-radius: var(--border-radius); border: 1px solid #bbf7d0;">
                    <div class="text-xs font-semibold" style="color: #166534;">PASSED</div>
                    <div class="font-mono text-lg" style="color: #166534;">${passed}</div>
                </div>
                ${failed > 0 ? `
                <div class="p-3" style="background: #fef2f2; border-radius: var(--border-radius); border: 1px solid #fecaca;">
                    <div class="text-xs font-semibold" style="color: #991b1b;">FAILED</div>
                    <div class="font-mono text-lg" style="color: #991b1b;">${failed}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <ul class="assertions-list">
            ${assertions.map(assertion => `
                <li class="assertion-item ${assertion.passed ? 'assertion-pass' : 'assertion-fail'}">
                    <div class="assertion-field">${this.escapeHtml(assertion.field)}</div>
                    <div class="assertion-values">
                        <div><strong>Expected:</strong> ${this.escapeHtml(JSON.stringify(assertion.expected))}</div>
                        <div><strong>Actual:</strong> ${this.escapeHtml(JSON.stringify(assertion.actual))}</div>
                        ${assertion.message ? `<div style="margin-top: 0.25rem;"><strong>Message:</strong> ${this.escapeHtml(assertion.message)}</div>` : ''}
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
  }

  private buildScenariosTab(scenarios: any[]): string {
    if (!scenarios || scenarios.length === 0) {
      return '<div style="padding: 1rem; text-align: center; color: var(--color-gray-700);">No scenarios results available for this step.</div>';
    }
    
    return `
        <div class="scenarios-list">
            ${scenarios.map(scenario => `
                <div class="scenario-item">
                    <div class="scenario-name">${this.escapeHtml(scenario.name || 'Unnamed Scenario')}</div>
                    <div class="scenario-condition"><strong>Condition:</strong> ${this.escapeHtml(scenario.condition || 'N/A')}</div>
                    <div class="scenario-result">
                        <div><strong>Executed:</strong> ${scenario.executed ? 'Yes' : 'No'}</div>
                        ${scenario.path ? `<div><strong>Path:</strong> ${this.escapeHtml(scenario.path)}</div>` : ''}
                        ${scenario.result ? `<div><strong>Result:</strong> ${this.escapeHtml(JSON.stringify(scenario.result))}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
  }

  private buildCurlTab(curlCommand: string): string {
    return `
        <div>
            <div style="margin-bottom: 1rem;">
                <span style="font-weight: 600;">Complete cURL Command:</span>
                <p style="font-size: 0.875rem; color: var(--color-gray-700); margin: 0.25rem 0;">
                    Copy and paste this command into your terminal or import into Postman.
                </p>
            </div>
            <div class="code-block">
                <button class="copy-button" onclick="copyToClipboard(this, '${this.escapeForJS(curlCommand)}')">Copy</button>
                ${this.escapeHtml(curlCommand)}
            </div>
        </div>
    `;
  }
}