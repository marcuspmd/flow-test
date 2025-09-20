/**
 * @packageDocumentation
 * Componente de detalhes do request
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig, RequestData } from "../../../../types";

export interface RequestDetailsComponentProps {
  request: RequestData;
}

/**
 * Renderiza os detalhes completos de um request HTTP
 */
export class RequestDetailsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderRequest(props: RequestDetailsComponentProps): string {
    const { request } = props;
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

  private formatHeaders(headers: Record<string, any>): string {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  private formatBody(body: any): string {
    if (typeof body === "string") {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    return JSON.stringify(body, null, 2);
  }
}
