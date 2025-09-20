/**
 * @packageDocumentation
 * Componente de detalhes da response
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig, ResponseData } from "../../../../types";

export interface ResponseDetailsComponentProps {
  response: ResponseData;
}

/**
 * Renderiza os detalhes completos de uma response HTTP
 */
export class ResponseDetailsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderResponse(props: ResponseDetailsComponentProps): string {
    const { response } = props;

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

  private getStatusBadgeClass(statusCode: number | undefined): string {
    if (!statusCode) return "bg-gray-100 text-gray-800";

    if (statusCode >= 200 && statusCode < 300) {
      return "bg-green-100 text-green-800";
    } else if (statusCode >= 300 && statusCode < 400) {
      return "bg-yellow-100 text-yellow-800";
    } else if (statusCode >= 400 && statusCode < 500) {
      return "bg-orange-100 text-orange-800";
    } else if (statusCode >= 500) {
      return "bg-red-100 text-red-800";
    }

    return "bg-gray-100 text-gray-800";
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
