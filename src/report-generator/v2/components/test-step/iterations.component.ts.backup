/**
 * @packageDocumentation
 * Componente de iterações para test steps V2
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig } from "../../types";

export interface IterationsComponentProps {
  iterations: any[];
  stepName: string;
  stepId: string;
}

export interface IterationStats {
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  totalDuration: number;
  averageDuration: number;
}

/**
 * Renderiza múltiplas iterações de um test step de forma organizada
 */
export class IterationsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderIterations(props: IterationsComponentProps): string {
    const { iterations, stepName, stepId } = props;

    if (!iterations || iterations.length === 0) {
      return this.renderEmptyState();
    }

    const stats = this.calculateIterationStats(iterations);
    const carouselId = this.generateId(`${stepId}-iterations`);

    return this.html`
      <div class="iterations-container bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 p-md border-b">
          <span class="text-lg">🔄</span>
          <h4 class="text-lg font-semibold text-default">Iterations</h4>
          <span class="text-sm text-muted">(${iterations.length} executions)</span>
        </div>

        <div class="iterations-content p-4">
          ${this.renderIterationStats(stats)}

          <div class="iterations-carousel mt-lg" id="${carouselId}">
            ${this.renderIterationCarousel(carouselId, iterations)}
          </div>
        </div>
      </div>
    `;
  }

  private renderIterationStats(stats: IterationStats): string {
    const successRate = stats.totalIterations > 0
      ? ((stats.successfulIterations / stats.totalIterations) * 100).toFixed(1)
      : "0";

    return this.html`
      <div class="iteration-stats grid grid-cols-2 lg:grid-cols-5 gap-md mb-lg">
        <div class="stat-card">
          <div class="text-xl text-primary mb-sm">📊</div>
          <div class="text-xl font-bold text-default">${stats.totalIterations}</div>
          <div class="text-xs text-muted">Total</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-success mb-sm">✅</div>
          <div class="text-xl font-bold text-success">${stats.successfulIterations}</div>
          <div class="text-xs text-muted">Success</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-error mb-sm">❌</div>
          <div class="text-xl font-bold text-error">${stats.failedIterations}</div>
          <div class="text-xs text-muted">Failed</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-warning mb-sm">📈</div>
          <div class="text-xl font-bold text-default">${successRate}%</div>
          <div class="text-xs text-muted">Success Rate</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-secondary mb-sm">⏱️</div>
          <div class="text-xl font-bold text-default">${this.formatDuration(stats.averageDuration)}</div>
          <div class="text-xs text-muted">Avg Duration</div>
        </div>
      </div>
    `;
  }

  private renderIterationCarousel(carouselId: string, iterations: any[]): string {
    const carouselItems = iterations.map((iteration, index) => {
      const isFirst = index === 0;
      const status = iteration.status || 'unknown';
      const statusIcon = this.getStatusIcon(status);

      return this.html`
        <div class="carousel-item ${isFirst ? 'active' : ''}" data-index="${index}">
          <div class="iteration-header">
            <div class="flex items-center justify-between mb-md">
              <div class="flex items-center space-x-md">
                <span class="iteration-icon text-xl">${statusIcon}</span>
                <div>
                  <h5 class="text-lg font-semibold text-default">
                    Iteration ${index + 1}
                  </h5>
                  <p class="text-sm text-muted">
                    ${this.escapeHtml(iteration.step_name || 'Unnamed')}
                  </p>
                </div>
              </div>
              ${this.renderStatusBadge(status)}
            </div>
          </div>

          <div class="iteration-details-cards">
            ${this.renderIterationDetailsCards(iteration, index)}
          </div>
        </div>
      `;
    });

    return this.html`
      <div class="carousel-container">
        <div class="carousel-controls">
          <button
            class="carousel-btn carousel-prev"
            onclick="navigateCarousel('${carouselId}', -1)"
            ${iterations.length <= 1 ? 'disabled' : ''}
          >
            ← Previous
          </button>

          <div class="carousel-indicators">
            ${iterations.map((_, index) => this.html`
              <button
                class="indicator ${index === 0 ? 'active' : ''}"
                onclick="goToCarouselSlide('${carouselId}', ${index})"
                data-index="${index}"
              >
                ${index + 1}
              </button>
            `).join('')}
          </div>

          <button
            class="carousel-btn carousel-next"
            onclick="navigateCarousel('${carouselId}', 1)"
            ${iterations.length <= 1 ? 'disabled' : ''}
          >
            Next →
          </button>
        </div>

        <div class="carousel-content" id="${carouselId}-content">
          ${carouselItems.join('')}
        </div>
      </div>

      <script>
        ${this.renderCarouselScript(carouselId, iterations.length)}
      </script>
    `;
  }

  private renderIterationDetailsCards(iteration: any, index: number): string {
    const cards: string[] = [];

    // Request Card
    if (iteration.request_details) {
      cards.push(this.html`
        <div class="detail-card request-card">
          <div class="card-header">
            <span class="card-icon">📤</span>
            <h6 class="card-title">Request</h6>
          </div>
          <div class="card-content">
            ${this.renderRequestCard(iteration.request_details)}
          </div>
        </div>
      `);
    }

    // Response Card
    if (iteration.response_details) {
      cards.push(this.html`
        <div class="detail-card response-card">
          <div class="card-header">
            <span class="card-icon">📥</span>
            <h6 class="card-title">Response</h6>
          </div>
          <div class="card-content">
            ${this.renderResponseCard(iteration.response_details)}
          </div>
        </div>
      `);
    }

    // cURL Card
    if (iteration.request_details) {
      const curlCommand = this.generateCurlCommand(iteration.request_details);
      cards.push(this.html`
        <div class="detail-card curl-card">
          <div class="card-header">
            <span class="card-icon">💻</span>
            <h6 class="card-title">cURL Command</h6>
            <button
              class="copy-btn"
              onclick="copyToClipboard('${this.escapeHtml(curlCommand)}')"
            >
              📋 Copy
            </button>
          </div>
          <div class="card-content">
            <pre class="curl-command"><code>${this.escapeHtml(curlCommand)}</code></pre>
          </div>
        </div>
      `);
    }

    // Assertions Card
    if (iteration.assertions_results && iteration.assertions_results.length > 0) {
      cards.push(this.html`
        <div class="detail-card assertions-card">
          <div class="card-header">
            <span class="card-icon">✅</span>
            <h6 class="card-title">Assertions</h6>
          </div>
          <div class="card-content">
            ${this.renderAssertionsCard(iteration.assertions_results)}
          </div>
        </div>
      `);
    }

    // Variables Card
    if (iteration.captured_variables && Object.keys(iteration.captured_variables).length > 0) {
      cards.push(this.html`
        <div class="detail-card variables-card">
          <div class="card-header">
            <span class="card-icon">📦</span>
            <h6 class="card-title">Captured Variables</h6>
          </div>
          <div class="card-content">
            ${this.renderVariablesCard(iteration.captured_variables)}
          </div>
        </div>
      `);
    }

    // Duration and Meta Card
    cards.push(this.html`
      <div class="detail-card meta-card">
        <div class="card-header">
          <span class="card-icon">⏱️</span>
          <h6 class="card-title">Execution Details</h6>
        </div>
        <div class="card-content">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Duration:</span>
              <span class="meta-value">${this.formatDuration(iteration.duration_ms || 0)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Status:</span>
              <span class="meta-value status-${iteration.status}">${iteration.status || 'unknown'}</span>
            </div>
            ${iteration.error_message ? this.html`
              <div class="meta-item error-item">
                <span class="meta-label">Error:</span>
                <span class="meta-value error-message">${this.escapeHtml(iteration.error_message)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `);

    return this.html`
      <div class="iteration-cards-grid">
        ${cards.join('')}
      </div>
    `;
  }

  private renderIterationDetails(iteration: any): string {
    const sections: string[] = [];

    // Request/Response details
    if (iteration.request_details || iteration.response_details) {
      sections.push(this.html`
        <div class="iteration-section">
          <h6 class="section-title">Request & Response</h6>
          <div class="section-content">
            ${this.renderRequestSummary(iteration.request_details)}
            ${this.renderResponseSummary(iteration.response_details)}
          </div>
        </div>
      `);
    }

    // Assertions
    if (iteration.assertions_results && iteration.assertions_results.length > 0) {
      sections.push(this.html`
        <div class="iteration-section">
          <h6 class="section-title">Assertions</h6>
          <div class="section-content">
            ${this.renderAssertionsSummary(iteration.assertions_results)}
          </div>
        </div>
      `);
    }

    // Captured Variables
    if (iteration.captured_variables && Object.keys(iteration.captured_variables).length > 0) {
      sections.push(this.html`
        <div class="iteration-section">
          <h6 class="section-title">Captured Variables</h6>
          <div class="section-content">
            ${this.renderCapturedVariablesSummary(iteration.captured_variables)}
          </div>
        </div>
      `);
    }

    // Error details
    if (iteration.error_message) {
      sections.push(this.html`
        <div class="iteration-section">
          <h6 class="section-title">Error Details</h6>
          <div class="section-content">
            <div class="error-message bg-red-50 border border-red-200 p-sm rounded text-sm">
              ${this.escapeHtml(iteration.error_message)}
            </div>
          </div>
        </div>
      `);
    }

    return sections.length > 0
      ? this.html`<div class="iteration-details space-y-md">${sections.join("")}</div>`
      : this.html`<div class="text-sm text-muted">No detailed information available</div>`;
  }

  private renderRequestSummary(request: any): string {
    if (!request) return '';

    return this.html`
      <div class="request-summary mb-sm">
        <div class="flex items-center space-x-sm text-sm">
          <span class="method-badge">${this.escapeHtml(request.method || 'GET')}</span>
          <span class="url-preview">${this.truncateUrl(request.url || '')}</span>
        </div>
      </div>
    `;
  }

  private renderResponseSummary(response: any): string {
    if (!response) return '';

    return this.html`
      <div class="response-summary text-sm">
        <div class="flex items-center space-x-sm">
          <span class="status-code ${this.getStatusClass(response.status_code)}">
            ${response.status_code || 'N/A'}
          </span>
          <span class="response-time text-muted">
            ${response.duration_ms ? this.formatDuration(response.duration_ms) : 'N/A'}
          </span>
          <span class="response-size text-muted">
            ${response.size_bytes ? this.formatBytes(response.size_bytes) : 'N/A'}
          </span>
        </div>
      </div>
    `;
  }

  private renderAssertionsSummary(assertions: any[]): string {
    const passed = assertions.filter(a => a.passed).length;
    const failed = assertions.length - passed;

    return this.html`
      <div class="assertions-summary text-sm">
        <div class="flex items-center space-x-md">
          <span class="text-success">✅ ${passed} passed</span>
          ${failed > 0 ? this.html`<span class="text-error">❌ ${failed} failed</span>` : ''}
        </div>
        ${failed > 0 ? this.html`
          <div class="failed-assertions mt-sm">
            ${assertions.filter(a => !a.passed).map(assertion => this.html`
              <div class="failed-assertion text-xs text-error">
                ${this.escapeHtml(assertion.field)}: ${this.escapeHtml(assertion.message)}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderCapturedVariablesSummary(variables: Record<string, any>): string {
    const entries = Object.entries(variables).slice(0, 3); // Show first 3
    const remaining = Object.keys(variables).length - entries.length;

    return this.html`
      <div class="captured-variables-summary text-sm">
        <div class="variable-list space-y-xs">
          ${entries.map(([key, value]) => this.html`
            <div class="variable-item">
              <span class="variable-name font-mono text-primary">${this.escapeHtml(key)}:</span>
              <span class="variable-value font-mono text-muted">${this.escapeHtml(String(value).slice(0, 50))}${String(value).length > 50 ? '...' : ''}</span>
            </div>
          `).join('')}
          ${remaining > 0 ? this.html`
            <div class="text-xs text-muted">... and ${remaining} more</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderEmptyState(): string {
    return this.html`
      <div class="iterations-container p-md bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 mb-sm">
          <span class="text-lg">🔄</span>
          <h4 class="text-lg font-semibold text-default">Iterations</h4>
        </div>
        <div class="text-center py-lg">
          <span class="text-muted text-sm">No iteration data available</span>
        </div>
      </div>
    `;
  }

  private calculateIterationStats(iterations: any[]): IterationStats {
    const totalIterations = iterations.length;
    const successfulIterations = iterations.filter(i => i.status === 'success').length;
    const failedIterations = totalIterations - successfulIterations;
    const totalDuration = iterations.reduce((sum, i) => sum + (i.duration_ms || 0), 0);
    const averageDuration = totalIterations > 0 ? totalDuration / totalIterations : 0;

    return {
      totalIterations,
      successfulIterations,
      failedIterations,
      totalDuration,
      averageDuration
    };
  }


  private getStatusClass(statusCode?: number): string {
    if (!statusCode) return 'text-muted';
    if (statusCode >= 200 && statusCode < 300) return 'text-success';
    if (statusCode >= 300 && statusCode < 400) return 'text-warning';
    if (statusCode >= 400) return 'text-error';
    return 'text-muted';
  }

  private truncateUrl(url: string, maxLength: number = 40): string {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength) + '...';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private renderRequestCard(request: any): string {
    return this.html`
      <div class="request-details">
        <div class="request-line">
          <span class="method-badge">${this.escapeHtml(request.method || 'GET')}</span>
          <span class="url-path">${this.escapeHtml(request.url || '')}</span>
        </div>

        ${Object.keys(request.headers || {}).length > 0 ? this.html`
          <div class="headers-section">
            <h7 class="section-subtitle">Headers:</h7>
            <div class="headers-list">
              ${Object.entries(request.headers || {}).map(([key, value]) => this.html`
                <div class="header-item">
                  <span class="header-key">${this.escapeHtml(key)}:</span>
                  <span class="header-value">${this.escapeHtml(String(value))}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${request.body ? this.html`
          <div class="body-section">
            <h7 class="section-subtitle">Body:</h7>
            <pre class="body-content"><code>${this.escapeHtml(this.formatBody(request.body))}</code></pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderResponseCard(response: any): string {
    return this.html`
      <div class="response-details">
        <div class="response-status">
          <span class="status-code ${this.getStatusClass(response.status_code)}">
            ${response.status_code || 'N/A'}
          </span>
          <span class="response-time">
            ${response.duration_ms ? this.formatDuration(response.duration_ms) : 'N/A'}
          </span>
          <span class="response-size">
            ${response.size_bytes ? this.formatBytes(response.size_bytes) : 'N/A'}
          </span>
        </div>

        ${Object.keys(response.headers || {}).length > 0 ? this.html`
          <div class="headers-section">
            <h7 class="section-subtitle">Headers:</h7>
            <div class="headers-list">
              ${Object.entries(response.headers || {}).slice(0, 5).map(([key, value]) => this.html`
                <div class="header-item">
                  <span class="header-key">${this.escapeHtml(key)}:</span>
                  <span class="header-value">${this.escapeHtml(String(value))}</span>
                </div>
              `).join('')}
              ${Object.keys(response.headers || {}).length > 5 ? this.html`
                <div class="header-item more">... and ${Object.keys(response.headers).length - 5} more</div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${response.body ? this.html`
          <div class="body-section">
            <h7 class="section-subtitle">Body:</h7>
            <pre class="body-content"><code>${this.escapeHtml(this.formatBody(response.body).slice(0, 500))}${this.formatBody(response.body).length > 500 ? '...' : ''}</code></pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderAssertionsCard(assertions: any[]): string {
    return this.html`
      <div class="assertions-list">
        ${assertions.map(assertion => this.html`
          <div class="assertion-item ${assertion.passed ? 'passed' : 'failed'}">
            <span class="assertion-icon">${assertion.passed ? '✅' : '❌'}</span>
            <div class="assertion-details">
              <div class="assertion-field">${this.escapeHtml(assertion.field)}</div>
              <div class="assertion-message">${this.escapeHtml(assertion.message || assertion.actual)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderVariablesCard(variables: Record<string, any>): string {
    return this.html`
      <div class="variables-list">
        ${Object.entries(variables).map(([key, value]) => this.html`
          <div class="variable-item">
            <span class="variable-key">${this.escapeHtml(key)}:</span>
            <span class="variable-value">${this.escapeHtml(String(value).slice(0, 100))}${String(value).length > 100 ? '...' : ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateCurlCommand(request: any): string {
    const method = request.method || 'GET';
    const url = request.url || '';
    const headers = request.headers || {};
    const body = request.body;

    let curl = `curl -X ${method}`;

    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\
  -H "${key}: ${value}"`;
    });

    // Add body if present
    if (body && method !== 'GET') {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      curl += ` \\
  -d '${bodyStr}'`;
    }

    curl += ` \\
  "${url}"`;

    return curl;
  }

  private renderCarouselScript(carouselId: string, totalItems: number): string {
    return this.html`
      function navigateCarousel(carouselId, direction) {
        const container = document.getElementById(carouselId + '-content');
        if (!container) return;

        const items = container.querySelectorAll('.carousel-item');
        const indicators = container.parentElement.querySelectorAll('.indicator');

        let activeIndex = 0;
        items.forEach((item, index) => {
          if (item.classList.contains('active')) {
            activeIndex = index;
          }
        });

        let newIndex = activeIndex + direction;
        if (newIndex >= ${totalItems}) newIndex = 0;
        if (newIndex < 0) newIndex = ${totalItems} - 1;

        goToCarouselSlide(carouselId, newIndex);
      }

      function goToCarouselSlide(carouselId, index) {
        const container = document.getElementById(carouselId + '-content');
        if (!container) return;

        const items = container.querySelectorAll('.carousel-item');
        const indicators = container.parentElement.querySelectorAll('.indicator');

        items.forEach((item, i) => {
          item.classList.toggle('active', i === index);
        });

        indicators.forEach((indicator, i) => {
          indicator.classList.toggle('active', i === index);
        });
      }
    `;
  }

  private formatBody(body: any): string {
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body;
      }
    }

    if (typeof body === "object") {
      return JSON.stringify(body, null, 2);
    }

    return String(body);
  }
}