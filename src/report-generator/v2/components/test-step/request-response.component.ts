/**
 * @packageDocumentation
 * Componente de request/response para test steps V2
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig, RequestData, ResponseData } from "../../types";

export interface RequestResponseComponentProps {
  request?: RequestData;
  response?: ResponseData;
  curlCommand?: string;
  stepId: string;
}

/**
 * Renderiza os detalhes de request e response de forma organizada
 */
export class RequestResponseComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderRequestResponse(props: RequestResponseComponentProps): string {
    const { request, response, curlCommand, stepId } = props;

    if (!request && !response && !curlCommand) {
      return this.renderEmptyState();
    }

    const tabId = this.generateId(`${stepId}-req-res`);

    return this.html`
      <div class="request-response-container bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 p-md border-b">
          <span class="text-lg">🌐</span>
          <h4 class="text-lg font-semibold text-default">Request & Response</h4>
        </div>

        <div class="tabs-container p-4" id="${tabId}">
          ${this.renderTabs(tabId, request, response, curlCommand)}
          ${this.renderTabContents(tabId, request, response, curlCommand)}
        </div>
      </div>
    `;
  }

  private renderTabs(
    tabId: string,
    request?: RequestData,
    response?: ResponseData,
    curlCommand?: string
  ): string {
    const tabs: string[] = [];

    if (request) {
      tabs.push(this.html`
        <button class="tab-button active" onclick="showTab('${tabId}', 'request')" data-tab="request">
          📤 Request
        </button>
      `);
    }

    if (response) {
      tabs.push(this.html`
        <button class="tab-button" onclick="showTab('${tabId}', 'response')" data-tab="response">
          📥 Response
        </button>
      `);
    }

    if (curlCommand) {
      tabs.push(this.html`
        <button class="tab-button" onclick="showTab('${tabId}', 'curl')" data-tab="curl">
          💻 cURL
        </button>
      `);
    }

    return this.html`
      <div class="flex border-b bg-gray-50" role="tablist">
        ${tabs.join("")}
      </div>
    `;
  }

  private renderTabContents(
    tabId: string,
    request?: RequestData,
    response?: ResponseData,
    curlCommand?: string
  ): string {
    const contents: string[] = [];

    if (request) {
      contents.push(this.html`
        <div id="${tabId}-request" class="tab-content active" role="tabpanel">
          ${this.renderRequestDetails(request)}
        </div>
      `);
    }

    if (response) {
      contents.push(this.html`
        <div id="${tabId}-response" class="tab-content hidden" role="tabpanel">
          ${this.renderResponseDetails(response)}
        </div>
      `);
    }

    if (curlCommand) {
      contents.push(this.html`
        <div id="${tabId}-curl" class="tab-content hidden" role="tabpanel">
          ${this.renderCurlCommand(curlCommand)}
        </div>
      `);
    }

    return this.html`<div class="tab-contents">${contents.join("")}</div>`;
  }

  private renderRequestDetails(request: RequestData): string {
    const resolvedUrl = request.full_url || request.url;
    const hasTemplateUrl = Boolean(request.raw_url);
    const baseUrlValue = request.base_url;

    return this.html`
      <div class="p-md space-y-md">
        <div class="request-summary w-full flex items-center space-x-md">
          <div class="flex-row w-full justify-between">
            <div class="url-details">
            ${
              hasTemplateUrl
                ? this.html`
                <div class="raw-url">
                  <code class="url text-sm font-mono break-all bg-gray-50 px-sm py-xs rounded border border-dashed border-gray-300">
                    ${this.escapeHtml(request.raw_url || "")}
                  </code>
                </div>
              `
                : ""
            }
              <div class="resolved-url">
                <code class="url text-sm font-mono break-all bg-gray-100 px-sm py-xs rounded">
                  ${this.escapeHtml(resolvedUrl)}
                </code>
              </div>

            </div>
          </div>
          <span class="method-badge px-sm py-xs rounded font-mono text-sm font-bold bg-blue-100 text-blue-800">
            ${this.escapeHtml(request.method)}
          </span>
        </div>
        ${
          Object.keys(request.headers || {}).length > 0
            ? this.html`
        <div class="headers-section">
            <h5 class="text-sm font-semibold text-default">Headers</h5>
        <pre class="code-block mt-2"><code>${this.escapeHtml(
          this.formatHeaders(request.headers)
        )}</code></pre>
          </div>
        `
            : ""
        }

        ${
          request.body
            ? this.html`
          <div class="body-section">
            <h5 class="text-sm font-semibold text-default">Body</h5>
            <pre class="code-block mt-2"><code>${this.escapeHtml(
              this.formatBody(request.body)
            )}</code></pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderResponseDetails(response: ResponseData): string {
    return this.html`
      <div class="p-md space-y-md">
        <div class="response-summary flex items-center space-x-md">
          <span class="status-badge px-sm py-xs rounded font-mono text-sm font-bold ${this.getStatusBadgeClass(
            response.status_code
          )}">
            ${response.status_code || "Unknown"}
          </span>
        </div>

        ${
          Object.keys(response.headers || {}).length > 0
            ? this.html`
          <div class="headers-section">
            <h5 class="text-sm font-semibold text-default mb-sm">Headers</h5>
            <pre class="code-block"><code>${this.escapeHtml(
              this.formatHeaders(response.headers)
            )}</code></pre>
          </div>
        `
            : ""
        }

        ${
          response.body
            ? this.html`
          <div class="body-section">
            <h5 class="text-sm font-semibold text-default mb-sm">Body</h5>
            <pre class="code-block"><code>${this.escapeHtml(
              this.formatBody(response.body)
            )}</code></pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderCurlCommand(curlCommand: string): string {
    return this.html`
      <div class="p-md">
        <div class="flex items-center justify-between mb-sm">
          <h5 class="text-sm font-semibold text-default">cURL Command</h5>
          <button
            class="copy-button text-xs px-sm py-xs rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            onclick="copyToClipboard('${this.escapeHtml(curlCommand)}')"
          >
            📋 Copy
          </button>
        </div>
        <pre class="code-block code-block--command"><code>${this.escapeHtml(
          curlCommand
        )}</code></pre>
      </div>
    `;
  }

  private renderEmptyState(): string {
    return this.html`
      <div class="request-response-container p-md bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 mb-sm">
          <span class="text-lg">🌐</span>
          <h4 class="text-lg font-semibold text-default">Request & Response</h4>
        </div>
        <div class="text-center py-lg">
          <span class="text-muted text-sm">Nenhum detalhe de request/response disponível</span>
        </div>
      </div>
    `;
  }

  private formatHeaders(headers: Record<string, any>): string {
    return Object.entries(headers || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  private formatBody(body: any): string {
    if (typeof body === "string") {
      try {
        // Tenta fazer parse do JSON para formatar
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

  private getStatusBadgeClass(status?: number): string {
    if (!status) return "bg-gray-100 text-gray-800";

    if (status >= 200 && status < 300) return "bg-green-100 text-green-800";
    if (status >= 300 && status < 400) return "bg-yellow-100 text-yellow-800";
    if (status >= 400 && status < 500) return "bg-orange-100 text-orange-800";
    if (status >= 500) return "bg-red-100 text-red-800";

    return "bg-gray-100 text-gray-800";
  }
}
