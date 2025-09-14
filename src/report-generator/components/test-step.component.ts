/**
 * Componente TestStep - Step individual de teste
 *
 * Responsabilidades:
 * - Exibir informações do step (nome, status, duração)
 * - Sistema de tabs para diferentes tipos de conteúdo
 * - Tabs: Assertions, Request, Response, cURL
 * - Formatação de JSON e dados estruturados
 * - Highlighting de código e dados
 */

import { BaseComponent } from "./base-component";
import { TestStepProps, TabData } from "./types";

export class TestStepComponent extends BaseComponent {
  private getStatusIcon(status: string): string {
    return status === "success" ? "✓" : "✗";
  }

  private getStatusClasses(status: string): {
    border: string;
    icon: string;
    bg: string;
  } {
    if (status === "success") {
      return {
        border: "border-l-green-500",
        icon: "text-green-500",
        bg: "bg-green-50 dark:bg-green-900/10",
      };
    }

    return {
      border: "border-l-red-500",
      icon: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/10",
    };
  }

  private formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  private renderAssertionsTab(assertions: any[]): string {
    if (!assertions || assertions.length === 0) {
      return this.html`
        <div class="text-secondary text-center py-4">
          <p>Nenhuma asserção registrada</p>
        </div>
      `;
    }

    return this.html`
      <div class="space-y-3">
        <h4 class="font-semibold text-primary text-sm uppercase tracking-wide">
          Assertions (${assertions.length})
        </h4>
        <ul class="space-y-2">
          ${this.renderList(
            assertions,
            (assertion) => this.html`
            <li class="flex items-center justify-between p-3 bg-primary rounded-lg border border-default">
              <div class="flex items-center space-x-3">
                <span class="${
                  assertion.passed ? "text-green-500" : "text-red-500"
                } text-lg">
                  ${assertion.passed ? "✓" : "✗"}
                </span>
                <div>
                  <span class="font-medium text-primary">
                    ${this.escapeHtml(assertion.type)}
                  </span>
                  ${
                    assertion.operator
                      ? this.html`
                    <span class="text-secondary text-sm ml-2">
                      (${this.escapeHtml(assertion.operator)})
                    </span>
                  `
                      : ""
                  }
                </div>
              </div>

              <div class="text-right text-xs">
                <div class="text-secondary">Expected:</div>
                <div class="font-mono text-blue-600 dark:text-blue-400">
                  ${this.escapeHtml(assertion.expected)}
                </div>
                ${
                  !assertion.passed
                    ? this.html`
                  <div class="text-secondary mt-1">Actual:</div>
                  <div class="font-mono text-red-600 dark:text-red-400">
                    ${this.escapeHtml(assertion.actual)}
                  </div>
                `
                    : ""
                }
              </div>
            </li>
          `
          )}
        </ul>
      </div>
    `;
  }

  private renderRequestTab(request: any): string {
    if (!request) {
      return this.html`
        <div class="text-secondary text-center py-4">
          <p>Dados de request não disponíveis</p>
        </div>
      `;
    }

    return this.html`
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold text-primary mb-2">Method & URL</h4>
          <div class="p-3 bg-tertiary rounded-lg border border-default font-mono text-sm">
            <span class="font-bold text-blue-600 dark:text-blue-400">
              ${this.escapeHtml(request.method || "GET")}
            </span>
            <span class="ml-2 text-primary">
              ${this.escapeHtml(request.url || "")}
            </span>
          </div>
        </div>

        ${
          request.headers
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-2">Headers</h4>
            <pre class="p-3 bg-tertiary rounded-lg border border-default text-xs text-primary font-mono overflow-x-auto">
${this.escapeHtml(this.formatJson(request.headers))}
            </pre>
          </div>
        `
            : ""
        }

        ${
          request.body
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-2">Body</h4>
            <pre class="p-3 bg-tertiary rounded-lg border border-default text-xs text-primary font-mono overflow-x-auto">
${this.escapeHtml(this.formatJson(request.body))}
            </pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderResponseTab(response: any): string {
    if (!response) {
      return this.html`
        <div class="text-secondary text-center py-4">
          <p>Dados de response não disponíveis</p>
        </div>
      `;
    }

    const statusColor =
      response.status_code >= 200 && response.status_code < 300
        ? "text-green-600 dark:text-green-400"
        : response.status_code >= 400
        ? "text-red-600 dark:text-red-400"
        : "text-yellow-600 dark:text-yellow-400";

    return this.html`
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold text-primary mb-2">Status Code</h4>
          <div class="p-3 bg-tertiary rounded-lg border border-default">
            <span class="text-lg font-bold ${statusColor}">
              ${response.status_code}
            </span>
          </div>
        </div>

        ${
          response.headers
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-2">Headers</h4>
            <pre class="p-3 bg-tertiary rounded-lg border border-default text-xs text-primary font-mono overflow-x-auto">
${this.escapeHtml(this.formatJson(response.headers))}
            </pre>
          </div>
        `
            : ""
        }

        ${
          response.body
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-2">Body</h4>
            <pre class="p-3 bg-tertiary rounded-lg border border-default text-xs text-primary font-mono overflow-x-auto">
${this.escapeHtml(this.formatJson(response.body))}
            </pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderCurlTab(curlCommand: string): string {
    if (!curlCommand) {
      return this.html`
        <div class="text-secondary text-center py-4">
          <p>Comando cURL não disponível</p>
        </div>
      `;
    }

    return this.html`
      <div>
        <h4 class="font-semibold text-primary mb-2">cURL Command</h4>
        <div class="relative">
          <pre class="p-3 bg-tertiary rounded-lg border border-default text-xs text-primary font-mono overflow-x-auto">
${this.escapeHtml(curlCommand)}
          </pre>
          <button
            class="absolute top-2 right-2 btn-secondary text-xs py-1 px-2"
            onclick="navigator.clipboard.writeText('${this.escapeHtml(
              curlCommand
            ).replace(/'/g, "\\'")}')"
            title="Copiar comando"
          >
            📋 Copy
          </button>
        </div>
      </div>
    `;
  }

  private renderTabs(step: any, stepId: string): string {
    const tabs: TabData[] = [];

    // Tab de Assertions (sempre presente)
    tabs.push({
      id: `${stepId}-assertions`,
      label: `Assertions (${(step.assertions || []).length})`,
      content: this.renderAssertionsTab(step.assertions || []),
      active: true,
    });

    // Tab de Request (se disponível)
    if (step.request) {
      tabs.push({
        id: `${stepId}-request`,
        label: "Request",
        content: this.renderRequestTab(step.request),
      });
    }

    // Tab de Response (se disponível)
    if (step.response) {
      tabs.push({
        id: `${stepId}-response`,
        label: "Response",
        content: this.renderResponseTab(step.response),
      });
    }

    // Tab de cURL (se disponível)
    if (step.curlCommand) {
      tabs.push({
        id: `${stepId}-curl`,
        label: "cURL",
        content: this.renderCurlTab(step.curlCommand),
      });
    }

    return this.html`
      <div class="tabs-container">
        <!-- Tab buttons -->
        <div class="flex border-b border-default mb-4 overflow-x-auto">
          ${this.renderList(
            tabs,
            (tab) => this.html`
            <button
              class="tab-button px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap ${
                tab.active
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-transparent text-secondary hover:text-primary hover:border-gray-300"
              }"
              onclick="switchTab('${stepId}', '${tab.id}')"
              role="tab"
              aria-selected="${tab.active ? "true" : "false"}"
              aria-controls="${tab.id}"
            >
              ${this.escapeHtml(tab.label)}
            </button>
          `
          )}
        </div>

        <!-- Tab contents -->
        ${this.renderList(
          tabs,
          (tab) => this.html`
          <div
            id="${tab.id}"
            class="tab-content ${tab.active ? "" : "hidden"}"
            role="tabpanel"
          >
            ${tab.content}
          </div>
        `
        )}
      </div>
    `;
  }

  render(props: TestStepProps): string {
    const { step, index } = props;
    const statusClasses = this.getStatusClasses(step.status);
    const statusIcon = this.getStatusIcon(step.status);
    const stepId = step.stepId || this.generateId(`step-${index}`);

    return this.html`
      <div class="card ${statusClasses.border} mb-3">
        <!-- Cabeçalho do step -->
        <div
          class="flex justify-between items-center p-3 cursor-pointer hover:${
            statusClasses.bg
          } transition-colors duration-200"
          onclick="toggleStep('${stepId}')"
          role="button"
          tabindex="0"
          aria-expanded="false"
          aria-controls="${stepId}-content"
        >
          <div class="flex items-center space-x-3">
            <!-- Número e status -->
            <div class="flex items-center space-x-2">
              <span class="font-mono text-sm text-secondary">
                #${index + 1}
              </span>
              <span class="text-lg ${statusClasses.icon}">
                ${statusIcon}
              </span>
            </div>

            <!-- Nome do step -->
            <h3 class="font-medium text-primary">
              ${this.escapeHtml(step.stepName)}
            </h3>
          </div>

          <!-- Duração e controles -->
          <div class="flex items-center space-x-3">
            <span class="text-sm text-secondary">
              ${this.formatDuration(step.duration)}
            </span>
            <span
              id="${stepId}-icon"
              class="transform transition-transform duration-200 text-secondary"
              aria-hidden="true"
            >
              ▶
            </span>
          </div>
        </div>

        <!-- Conteúdo do step -->
        <div
          id="${stepId}-content"
          class="hidden border-t border-default"
        >
          <div class="p-4 bg-tertiary">
            ${this.renderTabs(step, stepId)}
          </div>
        </div>
      </div>
    `;
  }
}
