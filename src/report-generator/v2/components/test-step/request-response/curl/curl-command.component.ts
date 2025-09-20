/**
 * @packageDocumentation
 * Componente de comando curl
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";

export interface CurlCommandComponentProps {
  curlCommand: string;
}

/**
 * Renderiza o comando curl com funcionalidade de cópia
 */
export class CurlCommandComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderCurl(props: CurlCommandComponentProps): string {
    const { curlCommand } = props;

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
}
