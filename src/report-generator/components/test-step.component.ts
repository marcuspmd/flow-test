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
import { TestStepProps, TabData, IterationStepData, ScenarioMeta } from "./types";

export class TestStepComponent extends BaseComponent {
  private getStatusIcon(status: "success" | "failure" | "info"): string {
    if (status === "success") return "✓";
    if (status === "failure") return "✗";
    return "ℹ";
  }

  private getStatusClasses(status: "success" | "failure" | "info"): {
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

    if (status === "failure") {
      return {
        border: "border-l-red-500",
        icon: "text-red-500",
        bg: "bg-red-50 dark:bg-red-900/10",
      };
    }

    // info (neutro)
    return {
      border: "border-l-blue-500",
      icon: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/10",
    };
  }

  private countAllAssertions(step: any): number {
    const direct = Array.isArray(step.assertions) ? step.assertions.length : 0;
    const fromIterations = Array.isArray(step.iterations)
      ? step.iterations.reduce((sum: number, it: any) => sum + (Array.isArray(it.assertions) ? it.assertions.length : 0), 0)
      : 0;
    return direct + fromIterations;
  }

  private formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  private formatAssertionField(field: string): {
    name: string;
    operator?: string;
  } {
    // Extrai o operador do campo (ex: response_time_ms.less_than -> less_than)
    const parts = field.split(".");
    const operator = parts.length > 1 ? parts[parts.length - 1] : undefined;
    const cleanField = parts[0];

    // Converte campos técnicos em nomes mais legíveis
    const fieldMappings: Record<string, string> = {
      status_code: "Status Code",
      response_time_ms: "Response Time",
      response_time: "Response Time",
      body: "Response Body",
      headers: "Headers",
    };

    // Verifica se é um campo direto mapeado
    const displayName = fieldMappings[cleanField] || cleanField;

    // Trata campos aninhados como body.message, headers.content-type
    if (field.startsWith("body.")) {
      return {
        name: `Body: ${field.substring(5)}`,
        operator: operator,
      };
    }

    if (field.startsWith("headers.")) {
      return {
        name: `Header: ${field.substring(8)}`,
        operator: operator,
      };
    }

    return {
      name: displayName,
      operator: operator,
    };
  }

  private formatAssertionValue(value: any, field: string): string {
    // Formatação especial para campos de performance
    if (field.includes("response_time") || field.includes("time")) {
      if (typeof value === "number") {
        return `${value}ms`;
      }
    }

    // Formatação especial para status codes
    if (field === "status_code" && typeof value === "number") {
      const statusTexts: Record<number, string> = {
        200: "OK",
        201: "Created",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        500: "Internal Server Error",
      };
      return `${value} ${statusTexts[value] || ""}`.trim();
    }

    // Para outros valores, usar formatação JSON normal
    return this.formatJson(value);
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
                    ${this.escapeHtml(
                      this.formatAssertionField(assertion.field).name
                    )}
                  </span>
                  ${
                    this.formatAssertionField(assertion.field).operator
                      ? this.html`
                    <span class="text-secondary text-sm ml-2">
                      (${this.escapeHtml(
                        this.formatAssertionField(assertion.field).operator
                      )})
                    </span>
                  `
                      : ""
                  }
                  ${
                    assertion.message && assertion.message !== "OK"
                      ? this.html`
                    <div class="text-secondary text-xs mt-1">
                      ${this.escapeHtml(assertion.message)}
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>

              <div class="text-right text-xs">
                <div class="flex items-center justify-end space-x-4">
                  <div class="text-center">
                    <div class="text-secondary text-xs">Expected</div>
                    <div class="font-mono text-blue-600 dark:text-blue-400">
                      ${this.escapeHtml(
                        this.formatAssertionValue(
                          assertion.expected,
                          assertion.field
                        )
                      )}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-secondary text-xs">Actual</div>
                    <div class="font-mono ${
                      assertion.passed
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }">
                      ${this.escapeHtml(
                        this.formatAssertionValue(
                          assertion.actual,
                          assertion.field
                        )
                      )}
                    </div>
                  </div>
                </div>
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
          <h4 class="font-semibold text-primary text-sm uppercase tracking-wide mb-3">
            Method & URL
          </h4>
          <div class="relative">
            <div class="flex items-center justify-between p-3 bg-primary rounded-lg border border-default pr-12">
              <div class="flex items-center space-x-3">
                <span class="text-blue-500 text-lg">🌐</span>
                <div class="text-center">
                  <div class="text-secondary text-xs">Method</div>
                  <div class="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    ${this.escapeHtml(request.method || "GET")}
                  </div>
                </div>
              </div>
              <div class="text-right flex-1 mr-4">
                <div class="text-secondary text-xs">URL</div>
                <div class="font-mono text-green-600 dark:text-green-400 break-all">
                  ${this.escapeHtml(request.full_url || request.url || "")}
                </div>
              </div>
            </div>
          </div>
        </div>

        ${
          request.headers
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-2">Headers</h4>
            <pre class="terminal-code">
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
            <pre class="terminal-code">
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
          <h4 class="font-semibold text-primary text-sm uppercase tracking-wide mb-3">
            Status Code
          </h4>
          <div class="flex items-center justify-between p-3 bg-primary rounded-lg border border-default">
            <div class="flex items-center space-x-3">
              <span class="${
                response.status_code >= 200 && response.status_code < 300
                  ? "text-green-500"
                  : response.status_code >= 400
                  ? "text-red-500"
                  : "text-yellow-500"
              } text-lg">
                ${
                  response.status_code >= 200 && response.status_code < 300
                    ? "✓"
                    : response.status_code >= 400
                    ? "✗"
                    : "⚠"
                }
              </span>
              <div class="text-center">
                <div class="text-secondary text-xs">Status</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-mono ${
                response.status_code >= 200 && response.status_code < 300
                  ? "text-green-600 dark:text-green-400"
                  : response.status_code >= 400
                  ? "text-red-600 dark:text-red-400"
                  : "text-yellow-600 dark:text-yellow-400"
              } font-bold text-lg">
                ${response.status_code}
              </div>
            </div>
          </div>
        </div>

        ${
          response.headers
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-2">Headers</h4>
            <pre class="terminal-code">
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
            <pre class="terminal-code">
${this.escapeHtml(this.formatJson(response.body))}
            </pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderRawTab(request: any, response: any): string {
    const hasRawData = request?.raw_request || response?.raw_response;

    if (!hasRawData) {
      return this.html`
        <div class="text-secondary text-center py-4">
          <p>Dados brutos não disponíveis</p>
        </div>
      `;
    }

    return this.html`
      <div class="space-y-6">
        ${
          request?.raw_request
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-3 flex items-center gap-2">
              <span class="text-blue-300 dark:text-blue-400">→</span>
              Raw Request
            </h4>
            <div class="relative">
              <pre class="terminal-code">
${this.escapeHtml(request.raw_request)}
              </pre>
              <button
                class="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2 shadow-md transition-colors duration-200"
                onclick="navigator.clipboard.writeText('${this.escapeHtml(
                  request.raw_request
                ).replace(/'/g, "\\'")}')"
                title="Copiar request"
              >
                📋
              </button>
            </div>
          </div>
        `
            : ""
        }

        ${
          response?.raw_response
            ? this.html`
          <div>
            <h4 class="font-semibold text-primary mb-3 flex items-center gap-2">
              <span class="text-green-300 dark:text-green-400">←</span>
              Raw Response
            </h4>
            <div class="relative">
              <pre class="terminal-code">
${this.escapeHtml(response.raw_response)}
              </pre>
              <button
                class="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2 shadow-md transition-colors duration-200"
                onclick="navigator.clipboard.writeText('${this.escapeHtml(
                  response.raw_response
                ).replace(/'/g, "\\'")}')"
                title="Copiar response"
              >
                📋
              </button>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderIterationCard(parentStepId: string, it: IterationStepData): string {
    const itStepId = `${parentStepId}-it-${it.index}`;
    const headerStatus = this.getStatusClasses(it.status);
    const statusIcon = this.getStatusIcon(it.status);

    const tabs = this.renderTabs(
      {
        assertions: it.assertions,
        request: it.request,
        response: it.response,
        curlCommand: it.curlCommand,
      } as any,
      itStepId
    );

    return this.html`
      <div class="card ${headerStatus.border}">
        <div class="flex justify-between items-center p-3 ${headerStatus.bg} rounded-t-lg">
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <span class="font-mono text-xs text-secondary">[${it.index}/${it.total}]</span>
              <span class="text-lg ${headerStatus.icon}">${statusIcon}</span>
            </div>
            <h4 class="font-medium text-primary">${this.escapeHtml(it.stepName)}</h4>
          </div>
          <div class="text-sm text-secondary">${this.formatDuration(it.duration)}</div>
        </div>
        <div class="p-4 bg-tertiary border-t border-default">
          ${tabs}
        </div>
      </div>
    `;
  }

  private renderIterationsTab(step: any, stepId: string): string {
    const iterations: IterationStepData[] = step.iterations || [];
    if (!iterations.length) return "";

    return this.html`
      <div class="space-y-3">
        <h4 class="font-semibold text-primary text-sm uppercase tracking-wide">
          Iterations (${iterations.length})
        </h4>
        <div class="space-y-3">
          ${this.renderList(iterations, (it) => this.renderIterationCard(stepId, it))}
        </div>
      </div>
    `;
  }

  private renderScenariosTab(meta?: ScenarioMeta): string {
    if (!meta || !meta.has_scenarios) {
      return this.html`
        <div class="text-secondary text-center py-4">
          <p>Nenhum cenário registrado</p>
        </div>
      `;
    }

    const evals = meta.evaluations || [];
    return this.html`
      <div class="space-y-3">
        <h4 class="font-semibold text-primary text-sm uppercase tracking-wide">
          Cenários (${evals.length}) • Executados: ${meta.executed_count}
        </h4>
        <ul class="space-y-2">
          ${this.renderList(
            evals,
            (e) => this.html`
              <li class="p-3 bg-primary rounded-lg border border-default">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="font-mono text-xs text-secondary">#${e.index}</span>
                    <code class="text-xs text-primary">${this.escapeHtml(e.condition)}</code>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="badge ${e.matched ? 'badge-green' : 'badge-gray'}">${e.matched ? 'matched' : 'not matched'}</span>
                    <span class="badge ${e.executed ? 'badge-blue' : 'badge-gray'}">${e.executed ? 'executado' : 'não executado'}</span>
                    ${e.branch && e.branch !== 'none' ? this.html`<span class="badge badge-indigo">${e.branch}</span>` : ''}
                    ${typeof e.assertions_added === 'number' ? this.html`<span class="badge badge-amber">assertions: ${e.assertions_added}</span>` : ''}
                    ${typeof e.captures_added === 'number' ? this.html`<span class="badge badge-teal">captures: ${e.captures_added}</span>` : ''}
                  </div>
                </div>
              </li>
            `
          )}
        </ul>
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
          <pre class="terminal-code">
${this.escapeHtml(curlCommand)}
          </pre>
          <button
            class="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2 shadow-md transition-colors duration-200"
            onclick="navigator.clipboard.writeText('${this.escapeHtml(
              curlCommand
            ).replace(/'/g, "\\'")}')"
            title="Copiar comando"
          >
            📋
          </button>
        </div>
      </div>
    `;
  }

  private renderTabs(step: any, stepId: string): string {
    // Se for step com iterações, renderiza apenas a aba "Iterations"
    if (Array.isArray(step.iterations) && step.iterations.length > 0) {
      const onlyTab: TabData = {
        id: `${stepId}-iterations`,
        label: `Iterations (${step.iterations.length})`,
        content: this.renderIterationsTab(step, stepId),
        active: true,
      };
      return this.html`
        <div id="${stepId}-tabs" class="tabs-container">
          <!-- Tab buttons -->
          <div class="flex border-b border-default mb-4 overflow-x-auto">
            <button
              class="tab-button px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
              onclick="switchTab('${stepId}-tabs', '${onlyTab.id}')"
              role="tab"
              aria-selected="true"
              aria-controls="${onlyTab.id}"
            >
              ${this.escapeHtml(onlyTab.label)}
            </button>
          </div>

          <!-- Tab contents -->
          <div id="${onlyTab.id}" class="tab-content " role="tabpanel">
            ${onlyTab.content}
          </div>
        </div>
      `;
    }

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

    // Tab de Cenários (se disponível)
    if (step.scenariosMeta && step.scenariosMeta.has_scenarios) {
      tabs.push({
        id: `${stepId}-scenarios`,
        label: `Scenarios (${step.scenariosMeta.executed_count})`,
        content: this.renderScenariosTab(step.scenariosMeta),
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

    // Tab de Raw (se disponível)
    if (step.request?.raw_request || step.response?.raw_response) {
      tabs.push({
        id: `${stepId}-raw`,
        label: "Raw",
        content: this.renderRawTab(step.request, step.response),
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
      <div id="${stepId}-tabs" class="tabs-container">
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
              onclick="switchTab('${stepId}-tabs', '${tab.id}')"
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
    const totalAssertions = this.countAllAssertions(step);
    const visualStatus: "success" | "failure" | "info" =
      step.status === "failure" ? "failure" : totalAssertions > 0 ? "success" : "info";
    const statusClasses = this.getStatusClasses(visualStatus);
    const statusIcon = this.getStatusIcon(visualStatus);
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
            ${step.scenariosMeta && step.scenariosMeta.has_scenarios ? this.html`<span class="ml-2 badge badge-indigo">Scenario</span>` : ''}
            ${
              visualStatus === "info"
                ? this.html`<span class="ml-2 badge badge-blue">Sem assertions</span>`
                : ""
            }
          </div>

          <!-- Duração e controles -->
          <div class="flex items-center space-x-3">
            <span class="text-sm text-secondary">
              ${this.formatDuration(step.duration)}
            </span>
            <span
              id="${stepId}-icon"
              class="transform transition-transform duration-200 text-primary"
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
