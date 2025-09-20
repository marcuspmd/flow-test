import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";

export class IterationCardsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  renderCards(iteration: any, index: number): string {
    const cards: string[] = [];

    // Request Card
    if (iteration.request_details) {
      cards.push(`
        <div class="detail-card bg-white p-4 rounded-lg border">
          <div class="card-header flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="card-icon text-lg">📤</span>
              <h6 class="card-title font-semibold">Request</h6>
            </div>
          </div>
          <div class="card-content">
            ${this.renderRequestCard(iteration.request_details)}
          </div>
        </div>
      `);
    }

    // Response Card
    if (iteration.response_details) {
      cards.push(`
        <div class="detail-card bg-white p-4 rounded-lg border">
          <div class="card-header flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="card-icon text-lg">📥</span>
              <h6 class="card-title font-semibold">Response</h6>
            </div>
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
      cards.push(`
        <div class="detail-card bg-white p-4 rounded-lg border">
          <div class="card-header flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="card-icon text-lg">💻</span>
              <h6 class="card-title font-semibold">cURL Command</h6>
            </div>
            <button
              class="copy-btn bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
              onclick="copyToClipboard('${this.escapeHtml(curlCommand)}')"
            >
              📋 Copy
            </button>
          </div>
          <div class="card-content">
            <pre class="curl-command bg-gray-100 p-3 rounded text-sm overflow-x-auto"><code>${this.escapeHtml(
              curlCommand
            )}</code></pre>
          </div>
        </div>
      `);
    }

    // Assertions Card
    if (
      iteration.assertions_results &&
      iteration.assertions_results.length > 0
    ) {
      cards.push(`
        <div class="detail-card bg-white p-4 rounded-lg border">
          <div class="card-header flex items-center space-x-2 mb-3">
            <span class="card-icon text-lg">✅</span>
            <h6 class="card-title font-semibold">Assertions</h6>
          </div>
          <div class="card-content">
            ${this.renderAssertionsCard(iteration.assertions_results)}
          </div>
        </div>
      `);
    }

    // Variables Card
    if (
      iteration.captured_variables &&
      Object.keys(iteration.captured_variables).length > 0
    ) {
      cards.push(`
        <div class="detail-card bg-white p-4 rounded-lg border">
          <div class="card-header flex items-center space-x-2 mb-3">
            <span class="card-icon text-lg">📦</span>
            <h6 class="card-title font-semibold">Captured Variables</h6>
          </div>
          <div class="card-content">
            ${this.renderVariablesCard(iteration.captured_variables)}
          </div>
        </div>
      `);
    }

    // Meta Card
    cards.push(`
      <div class="detail-card bg-white p-4 rounded-lg border">
        <div class="card-header flex items-center space-x-2 mb-3">
          <span class="card-icon text-lg">⏱️</span>
          <h6 class="card-title font-semibold">Execution Details</h6>
        </div>
        <div class="card-content">
          <div class="meta-grid space-y-2">
            <div class="meta-item flex justify-between">
              <span class="meta-label text-gray-600">Duration:</span>
              <span class="meta-value font-mono">${this.formatDuration(
                iteration.duration_ms || 0
              )}</span>
            </div>
            <div class="meta-item flex justify-between">
              <span class="meta-label text-gray-600">Status:</span>
              <span class="meta-value font-mono status-${iteration.status}">${
      iteration.status || "unknown"
    }</span>
            </div>
            ${
              iteration.error_message
                ? `
              <div class="meta-item">
                <span class="meta-label text-gray-600">Error:</span>
                <div class="meta-value error-message bg-red-50 p-2 rounded mt-1 text-sm text-red-800">${this.escapeHtml(
                  iteration.error_message
                )}</div>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `);

    return `
      <div class="iteration-cards-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${cards.join("")}
      </div>
    `;
  }

  private renderRequestCard(request: any): string {
    return `
      <div class="request-details">
        <div class="request-line flex items-center space-x-2 mb-2">
          <span class="method-badge bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">${this.escapeHtml(
            request.method || "GET"
          )}</span>
          <span class="url-path text-sm font-mono text-gray-700">${this.escapeHtml(
            request.url || ""
          )}</span>
        </div>

        ${
          Object.keys(request.headers || {}).length > 0
            ? `
          <div class="headers-section mt-3">
            <h7 class="section-subtitle text-xs font-semibold text-gray-600 uppercase tracking-wide">Headers:</h7>
            <div class="headers-list mt-1 space-y-1">
              ${Object.entries(request.headers || {})
                .map(
                  ([key, value]) => `
                <div class="header-item text-xs">
                  <span class="header-key font-mono text-gray-600">${this.escapeHtml(
                    key
                  )}:</span>
                  <span class="header-value font-mono text-gray-800">${this.escapeHtml(
                    String(value)
                  )}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          request.body
            ? `
          <div class="body-section mt-3">
            <h7 class="section-subtitle text-xs font-semibold text-gray-600 uppercase tracking-wide">Body:</h7>
            <pre class="body-content bg-gray-50 p-2 rounded text-xs mt-1 overflow-x-auto"><code>${this.escapeHtml(
              JSON.stringify(request.body, null, 2)
            )}</code></pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderResponseCard(response: any): string {
    return `
      <div class="response-details">
        <div class="response-status-line flex items-center space-x-3 mb-3">
          <span class="status-code ${this.getStatusClass(
            response.status_code
          )} px-2 py-1 rounded text-sm font-semibold">
            ${response.status_code || "N/A"}
          </span>
          <span class="response-time text-sm text-gray-600">
            ${
              response.duration_ms
                ? this.formatDuration(response.duration_ms)
                : "N/A"
            }
          </span>
          <span class="response-size text-sm text-gray-600">
            ${
              response.size_bytes
                ? this.formatBytes(response.size_bytes)
                : "N/A"
            }
          </span>
        </div>

        ${
          Object.keys(response.headers || {}).length > 0
            ? `
          <div class="headers-section mt-3">
            <h7 class="section-subtitle text-xs font-semibold text-gray-600 uppercase tracking-wide">Headers:</h7>
            <div class="headers-list mt-1 space-y-1 max-h-24 overflow-y-auto">
              ${Object.entries(response.headers || {})
                .slice(0, 5)
                .map(
                  ([key, value]) => `
                <div class="header-item text-xs">
                  <span class="header-key font-mono text-gray-600">${this.escapeHtml(
                    key
                  )}:</span>
                  <span class="header-value font-mono text-gray-800">${this.escapeHtml(
                    String(value)
                  )}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          response.body
            ? `
          <div class="body-section mt-3">
            <h7 class="section-subtitle text-xs font-semibold text-gray-600 uppercase tracking-wide">Body:</h7>
            <pre class="body-content bg-gray-50 p-2 rounded text-xs mt-1 max-h-32 overflow-auto"><code>${this.escapeHtml(
              JSON.stringify(response.body, null, 2)
            )}</code></pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderAssertionsCard(assertions: any[]): string {
    return `
      <div class="assertions-list space-y-2">
        ${assertions
          .map(
            (assertion) => `
          <div class="assertion-item flex items-start space-x-2 text-sm">
            <span class="assertion-status ${
              assertion.passed ? "text-green-600" : "text-red-600"
            }">
              ${assertion.passed ? "✅" : "❌"}
            </span>
            <div class="assertion-details flex-1">
              <div class="assertion-field font-mono text-xs text-gray-600">${this.escapeHtml(
                assertion.field
              )}</div>
              ${
                assertion.message
                  ? `
                <div class="assertion-message text-xs text-gray-800">${this.escapeHtml(
                  assertion.message
                )}</div>
              `
                  : ""
              }
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private renderVariablesCard(variables: Record<string, any>): string {
    return `
      <div class="variables-list space-y-2">
        ${Object.entries(variables)
          .map(
            ([key, value]) => `
          <div class="variable-item">
            <div class="variable-name font-mono text-xs text-blue-600 font-semibold">${this.escapeHtml(
              key
            )}</div>
            <div class="variable-value font-mono text-xs text-gray-800 bg-gray-50 p-1 rounded mt-1">${this.escapeHtml(
              String(value)
            )}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private generateCurlCommand(request: any): string {
    let curl = `curl -X ${request.method || "GET"} "${request.url || ""}"`;

    if (request.headers) {
      Object.entries(request.headers).forEach(([key, value]) => {
        curl += ` -H "${key}: ${value}"`;
      });
    }

    if (request.body) {
      curl += ` -d '${JSON.stringify(request.body)}'`;
    }

    return curl;
  }

  private getStatusClass(statusCode?: number): string {
    if (!statusCode) return "bg-gray-100 text-gray-800";
    if (statusCode >= 200 && statusCode < 300)
      return "bg-green-100 text-green-800";
    if (statusCode >= 300 && statusCode < 400)
      return "bg-yellow-100 text-yellow-800";
    if (statusCode >= 400) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  render(): string {
    return "";
  }
}
