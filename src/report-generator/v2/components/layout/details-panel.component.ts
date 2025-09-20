/**
 * @packageDocumentation
 * Componente do painel principal de detalhes V2
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { DetailsPanelProps, ThemeConfig, NavigationItem } from "../../types";
import { AssertionsComponent } from "../test-step/assertions.component";
import { RequestResponseComponent } from "../test-step/request-response.component";
import { IterationsComponent } from "../test-step/iterations.component";
import { ScenariosComponent } from "../test-step/scenarios.component";

/**
 * Renderiza o painel principal de detalhes com mais espaço para visualização
 */
export class DetailsPanelComponent extends BaseComponentV2 {
  private assertionsComponent: AssertionsComponent;
  private requestResponseComponent: RequestResponseComponent;
  private iterationsComponent: IterationsComponent;
  private scenariosComponent: ScenariosComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.assertionsComponent = new AssertionsComponent(theme);
    this.requestResponseComponent = new RequestResponseComponent(theme);
    this.iterationsComponent = new IterationsComponent(theme);
    this.scenariosComponent = new ScenariosComponent(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderDetailsPanel(props: DetailsPanelProps): string {
    const { selectedItem, navigationItems, testData } = props;

    if (!navigationItems || navigationItems.length === 0) {
      return this.renderWelcomeState();
    }

    const activeId = selectedItem?.id || navigationItems[0]?.id || "";
    const sections: string[] = [];

    navigationItems.forEach((item, itemIndex) => {
      try {
        const rootSection = this.renderDetailSection(item, testData, activeId);
        if (rootSection) {
          sections.push(rootSection);
        }
      } catch (error) {
        // Add a fallback section
        sections.push(this.renderErrorSection(item, error));
      }

      (item.children || []).forEach((child, childIndex) => {
        try {
          const childSection = this.renderDetailSection(
            child,
            testData,
            activeId
          );
          if (childSection) {
            sections.push(childSection);
          }
        } catch (error) {
          // Add a fallback section
          sections.push(this.renderErrorSection(child, error));
        }
      });
    });

    if (sections.length === 0) {
      return this.renderWelcomeState();
    }

    return this.html`
      <div
        id="main-content-area"
        class="detail-container"
        data-active-id="${this.escapeHtml(activeId)}"
      >
        ${sections.join("\n")}
      </div>
    `;
  }

  private renderDetailSection(
    item: NavigationItem,
    testData: any,
    activeId: string
  ): string {
    try {
      const content = this.renderItemContent(item, testData);

      if (!content) {
        return "";
      }

      const isActive = item.id === activeId;

      const section = this.html`
        <section
          class="detail-section ${isActive ? "is-active" : "is-hidden"}"
          data-item-id="${this.escapeHtml(item.id)}"
          role="tabpanel"
          aria-hidden="${isActive ? "false" : "true"}"
        >
          ${content}
        </section>
      `;

      return section;
    } catch (error) {
      console.error(
        `[DEBUG] Error in renderDetailSection for item ${item.id}:`,
        error
      );
      throw error; // Re-throw to be caught by the outer try-catch
    }
  }

  private renderItemContent(item: NavigationItem, testData: any): string {
    try {
      let result: string;

      switch (item.type) {
        case "suite":
          result = this.buildSuiteContent(item, testData);
          break;
        case "step":
          result = this.buildStepContent(item, testData);
          break;
        case "group":
          result = this.buildGroupContent(item, testData);
          break;
        default:
          result = this.renderUnknownItemType(item);
          break;
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  private renderWelcomeState(): string {
    return this.html`
      <div id="main-content-area" class="flex items-center justify-center h-full p-xl">
        <div class="text-center max-w-md">
          <div class="text-6xl mb-lg">🧪</div>
          <h2 class="text-2xl font-bold text-default mb-md">Flow Test Report V2</h2>
          <p class="text-muted text-lg mb-lg">
            Selecione uma suite ou step na barra lateral para visualizar os detalhes.
          </p>
          <div class="grid grid-cols-2 gap-md text-sm">
            <div class="bg-surface p-md rounded border">
              <div class="text-primary text-2xl mb-sm">📊</div>
              <div class="font-semibold text-default">Layout Expandido</div>
              <div class="text-muted">Mais espaço para análise</div>
            </div>
            <div class="bg-surface p-md rounded border">
              <div class="text-success text-2xl mb-sm">🎨</div>
              <div class="font-semibold text-default">Design Moderno</div>
              <div class="text-muted">Interface inspirada em design systems</div>
            </div>
            <div class="bg-surface p-md rounded border">
              <div class="text-warning text-2xl mb-sm">🧩</div>
              <div class="font-semibold text-default">Componentizado</div>
              <div class="text-muted">Fácil de customizar e estender</div>
            </div>
            <div class="bg-surface p-md rounded border">
              <div class="text-secondary text-2xl mb-sm">⚡</div>
              <div class="font-semibold text-default">Performance</div>
              <div class="text-muted">Carregamento otimizado</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private buildSuiteContent(item: NavigationItem, testData: any): string {
    const suiteData = this.findSuiteData(item.id, testData);

    if (!suiteData) {
      return this.renderMissingDataNotice("Suite data not found");
    }

    const metadataMarkup = this.renderSuiteMetadata(suiteData);
    const stepsMarkup = this.renderSuiteSteps(item, suiteData);

    return this.html`
      <div class="detail-wrapper">
        ${this.renderBreadcrumb([
          { name: "Suites", url: "#" },
          { name: item.name },
        ])}

        <section class="detail-card">
          <div class="detail-card-header">
            <div class="detail-card-heading">
              <span class="detail-card-icon">📋</span>
              <div class="detail-card-title-group">
                <h1 class="detail-card-title">${this.escapeHtml(item.name)}</h1>
                <p class="detail-card-subtitle">Test Suite</p>
              </div>
            </div>
            <div class="detail-card-status">
              ${this.renderStatusBadge(item.status, "text-lg px-lg py-sm")}
            </div>
          </div>
          ${this.renderSuiteSummary(item, suiteData)}
        </section>

        ${
          metadataMarkup
            ? this.html`
            <section class="detail-card">
              <h2 class="detail-section-title">Metadata</h2>
              ${metadataMarkup}
            </section>
          `
            : ""
        }

        <section class="detail-card">
          <h2 class="detail-section-title">Steps</h2>
          ${stepsMarkup}
        </section>
      </div>
    `;
  }

  private buildStepContent(item: NavigationItem, testData: any): string {
    const stepResult = this.findStepData(item.id, testData);

    if (!stepResult) {
      return this.renderMissingDataNotice("Step data not found");
    }

    const { step, suite } = stepResult;

    return this.html`
      <div class="detail-wrapper">
        ${this.renderBreadcrumb([
          { name: "Suites", url: "#" },
          { name: suite?.name || "Suite" },
          { name: item.name },
        ])}

        <section class="detail-card">
          <div class="detail-card-header">
            <div class="detail-card-heading">
              <span class="detail-card-icon">🔧</span>
              <div class="detail-card-title-group">
                <h1 class="detail-card-title">${this.escapeHtml(item.name)}</h1>
                <p class="detail-card-subtitle">Test Step</p>
              </div>
            </div>
            <div class="detail-card-status">
              ${this.renderStatusBadge(item.status, "text-lg px-lg py-sm")}
            </div>
          </div>
          ${this.renderStepSummary(item, step)}
        </section>

        <section class="detail-card">
          <h2 class="detail-section-title">Execution Details</h2>
          <div class="detail-execution-grid">
            ${this.renderStepAssertions(step)}
            ${this.renderStepRequestResponse(step)}
          </div>
        </section>

        ${this.renderStepIterations(step, item)}
        ${this.renderStepScenarios(step, item)}

        ${(() => {
          const additional = this.renderStepAdditionalInfo(step);
          return additional
            ? this.html`
              <section class="detail-card">
                <h2 class="detail-section-title">Additional Information</h2>
                ${additional}
              </section>
            `
            : "";
        })()}
      </div>
    `;
  }

  private buildGroupContent(item: NavigationItem, testData: any): string {
    return this.html`
      <div class="detail-wrapper">
        ${this.renderBreadcrumb([
          { name: "Groups", url: "#" },
          { name: item.name },
        ])}

        <section class="detail-card">
          <div class="detail-card-header">
            <div class="detail-card-heading">
              <span class="detail-card-icon">📁</span>
              <div class="detail-card-title-group">
                <h1 class="detail-card-title">${this.escapeHtml(item.name)}</h1>
                <p class="detail-card-subtitle">Test Group</p>
              </div>
            </div>
          </div>
        </section>

        <section class="detail-card">
          <h2 class="detail-section-title">Summary</h2>
          ${this.renderGroupSummary(item)}
        </section>

        ${(() => {
          const itemsMarkup = this.renderGroupItems(item);
          return itemsMarkup
            ? this.html`
              <section class="detail-card">
                <h2 class="detail-section-title">Items</h2>
                ${itemsMarkup}
              </section>
            `
            : "";
        })()}
      </div>
    `;
  }

  private renderBreadcrumb(
    items: Array<{ name: string; url?: string }>
  ): string {
    const breadcrumbItems = items.map((item, index) => {
      const isLast = index === items.length - 1;

      if (isLast) {
        return this.html`<span class="text-muted">${this.escapeHtml(
          item.name
        )}</span>`;
      }

      return this.html`
        <a href="${item.url || "#"}" class="text-primary hover:underline">
          ${this.escapeHtml(item.name)}
        </a>
      `;
    });

    return this.html`
      <nav class="breadcrumb" ${this.getA11yAttributes({
        label: "Breadcrumb",
      })}>
        <div class="flex items-center space-x-sm text-sm">
          ${breadcrumbItems.join('<span class="text-muted">→</span>')}
        </div>
      </nav>
    `;
  }

  private renderSuiteSummary(item: NavigationItem, suiteData: any): string {
    const stats = this.calculateSuiteStats(item);

    return this.html`
      <div class="suite-summary">
        <div class="stat-card">
          <div class="text-2xl text-primary mb-sm">📊</div>
          <div class="text-2xl font-bold text-default">${stats.totalSteps}</div>
          <div class="text-sm text-muted">Total Steps</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl text-success mb-sm">✅</div>
          <div class="text-2xl font-bold text-success">${
            stats.successSteps
          }</div>
          <div class="text-sm text-muted">Passed</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl text-error mb-sm">❌</div>
          <div class="text-2xl font-bold text-error">${stats.failedSteps}</div>
          <div class="text-sm text-muted">Failed</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl text-secondary mb-sm">⏱️</div>
          <div class="text-2xl font-bold text-default">${this.formatDuration(
            stats.duration
          )}</div>
          <div class="text-sm text-muted">Duration</div>
        </div>
      </div>
    `;
  }

  private renderStepSummary(item: NavigationItem, stepData: any): string {
    // Calculate additional metrics for iterations and scenarios
    const iterations =
      stepData?.iteration_results || stepData?.iterations || [];
    const scenariosMeta = stepData?.scenarios_meta || stepData?.scenariosMeta;
    const hasIterations = iterations.length > 0;
    const hasScenarios = scenariosMeta?.has_scenarios;

    const summaryItems = [
      {
        icon: "🔍",
        iconClass: "text-primary",
        value: stepData?.assertions?.length || 0,
        label: "Assertions",
      },
      {
        icon: "⏱️",
        iconClass: "text-success",
        value: this.formatDuration(stepData?.duration || 0),
        label: "Duration",
      },
      {
        icon: "🌐",
        iconClass: "text-warning",
        value: stepData?.request?.method || "N/A",
        label: "Method",
      },
      {
        icon: "📊",
        iconClass: "text-secondary",
        value: stepData?.response?.status_code || "N/A",
        label: "Status Code",
      },
    ];

    // Add iterations summary if present
    if (hasIterations) {
      summaryItems.push({
        icon: "🔄",
        iconClass: "text-info",
        value: iterations.length,
        label: "Iterations",
      });
    }

    // Add scenarios summary if present
    if (hasScenarios) {
      const executedCount = scenariosMeta.executed_count || 0;
      const totalScenarios = scenariosMeta.evaluations?.length || 0;
      summaryItems.push({
        icon: "🎭",
        iconClass: "text-purple",
        value: `${executedCount}/${totalScenarios}`,
        label: "Scenarios",
      });
    }

    return this.html`
      <div class="step-summary">
        ${summaryItems
          .map(
            (item) => this.html`
          <div class="summary-item">
            <span class="summary-icon ${item.iconClass}">${item.icon}</span>
            <div>
              <div class="summary-value">${item.value}</div>
              <div class="summary-label">${item.label}</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>

      ${
        hasIterations || hasScenarios
          ? this.html`
        <div class="step-enhanced-info mt-sm">
          ${
            hasIterations
              ? this.html`
            <div class="enhanced-info-badge iterations-badge">
              🔄 ${iterations.length} iteration${
                  iterations.length !== 1 ? "s" : ""
                }
            </div>
          `
              : ""
          }
          ${
            hasScenarios
              ? this.scenariosComponent.renderScenariosSummaryBadge(
                  scenariosMeta
                )
              : ""
          }
        </div>
      `
          : ""
      }
    `;
  }

  private renderSuiteMetadata(suiteData: any): string {
    if (!suiteData?.metadata) return "";

    const priority = suiteData.metadata.priority;
    const tags = suiteData.metadata.tags || [];
    const description = suiteData.metadata.description;

    if (!priority && tags.length === 0 && !description) {
      return "";
    }

    return this.html`
      <div class="suite-metadata text-sm">
        ${
          priority
            ? this.html`
          <div>
            <span class="text-muted">Priority:</span>
            <span class="ml-sm font-medium text-default">${this.escapeHtml(
              priority
            )}</span>
          </div>
        `
            : ""
        }
        ${
          tags.length > 0
            ? this.html`
          <div>
            <span class="text-muted">Tags:</span>
            <span class="ml-sm">${tags.join(", ")}</span>
          </div>
        `
            : ""
        }
        ${
          description
            ? this.html`
          <div class="mt-sm">
            <span class="text-muted">Description:</span>
            <span class="ml-sm text-default">${this.escapeHtml(
              description
            )}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderSuiteSteps(item: NavigationItem, suiteData: any): string {
    const steps = item.children || [];

    return steps.length === 0
      ? this
          .html`<p class="text-sm text-muted">No steps recorded for this suite.</p>`
      : this.html`
        <div class="suite-steps">
          <div class="detail-list" data-count="${steps.length}">
            ${steps.map((step) => this.renderStepCard(step)).join("")}
          </div>
        </div>
      `;
  }

  private renderStepCard(step: NavigationItem): string {
    return this.html`
      <div class="step-card bg-surface p-md rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
           onclick="selectNavItem('${step.id}')">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-md">
            <span class="text-xl">🔧</span>
            <div>
              <h4 class="font-semibold text-default">${this.escapeHtml(
                step.name
              )}</h4>
              <p class="text-sm text-muted">Test Step</p>
            </div>
          </div>
          ${this.renderStatusBadge(step.status)}
        </div>
      </div>
    `;
  }

  private renderStepAssertions(stepData: any): string {
    if (!stepData?.assertions) {
      return this
        .html`<div class="xl:col-span-2">${this.assertionsComponent.renderAssertions(
        { assertions: [], stepId: stepData?.id || "unknown" }
      )}</div>`;
    }

    return this.assertionsComponent.renderAssertions({
      assertions: stepData.assertions,
      stepId: stepData.id || "unknown",
    });
  }

  private renderStepRequestResponse(stepData: any): string {
    return this.requestResponseComponent.renderRequestResponse({
      request: stepData?.request,
      response: stepData?.response,
      curlCommand: stepData?.curlCommand,
      stepId: stepData?.id || "unknown",
    });
  }

  private renderStepIterations(
    stepData: any,
    navigationItem: NavigationItem
  ): string {
    // Check for iteration_results in stepData
    const iterations = stepData?.iteration_results || stepData?.iterations;

    if (!iterations || !Array.isArray(iterations) || iterations.length === 0) {
      return "";
    }

    return this.iterationsComponent.renderIterations({
      iterations,
      stepName: navigationItem.name,
      stepId: stepData?.id || navigationItem.id,
    });
  }

  private renderStepScenarios(
    stepData: any,
    navigationItem: NavigationItem
  ): string {
    // Check for scenarios_meta in stepData
    const scenariosMeta = stepData?.scenarios_meta || stepData?.scenariosMeta;

    if (!scenariosMeta || !scenariosMeta.has_scenarios) {
      return "";
    }

    return this.scenariosComponent.renderScenarios({
      scenariosMeta,
      stepName: navigationItem.name,
      stepId: stepData?.id || navigationItem.id,
      stepData: stepData, // Passar os dados do step para acessar captured_variables
    });
  }

  private renderStepAdditionalInfo(stepData: any): string {
    const variableCount = stepData?.capturedVariables
      ? Array.isArray(stepData.capturedVariables)
        ? stepData.capturedVariables.length
        : Object.keys(stepData.capturedVariables).length
      : 0;
    const hasError = Boolean(stepData?.errorContext);

    if (variableCount === 0 && !hasError) {
      return "";
    }

    return this.html`
      <div class="step-additional-info">
        ${
          variableCount > 0
            ? this.renderCapturedVariables(stepData.capturedVariables)
            : ""
        }
        ${hasError ? this.renderErrorContext(stepData.errorContext) : ""}
      </div>
    `;
  }

  private renderCapturedVariables(variables: any): string {
    if (!variables) {
      return "";
    }

    const entries = Array.isArray(variables)
      ? variables
      : Object.entries(variables).map(([name, value]) => ({ name, value }));

    if (entries.length === 0) {
      return "";
    }

    return this.html`
      <div class="captured-variables bg-surface p-lg rounded-lg border">
        <h4 class="text-lg font-semibold text-default mb-md">Captured Variables</h4>
        <div class="space-y-sm">
          ${entries
            .map(
              (variable: any) => this.html`
            <div class="flex items-start space-x-md">
              <span class="text-sm font-mono text-primary">${this.escapeHtml(
                variable.name
              )}:</span>
              <span class="text-sm font-mono text-success">${this.escapeHtml(
                typeof variable.value === "string"
                  ? variable.value
                  : JSON.stringify(variable.value, null, 2)
              )}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  private renderErrorContext(errorContext: any): string {
    return this.html`
      <div class="error-context bg-red-50 border border-red-200 p-lg rounded-lg">
        <h4 class="text-lg font-semibold text-error mb-md">Error Details</h4>
        <div class="space-y-md text-sm">
          <div>
            <span class="text-muted">Message:</span>
            <div class="mt-sm p-sm bg-white rounded border font-mono">${this.escapeHtml(
              errorContext.message
            )}</div>
          </div>
          ${
            errorContext.details
              ? this.html`
            <div>
              <span class="text-muted">Details:</span>
              <div class="mt-sm p-sm bg-white rounded border font-mono text-xs">${this.escapeHtml(
                errorContext.details
              )}</div>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  private renderGroupSummary(item: NavigationItem): string {
    const stats = this.calculateGroupStats(item);

    return this.html`
      <div class="group-summary">
        <div class="stat-card">
          <div class="text-2xl text-primary mb-sm">📁</div>
          <div class="text-2xl font-bold text-default">${stats.totalItems}</div>
          <div class="text-sm text-muted">Total Items</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl text-success mb-sm">✅</div>
          <div class="text-2xl font-bold text-success">${stats.successItems}</div>
          <div class="text-sm text-muted">Passed</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl text-error mb-sm">❌</div>
          <div class="text-2xl font-bold text-error">${stats.failedItems}</div>
          <div class="text-sm text-muted">Failed</div>
        </div>
      </div>
    `;
  }

  private renderGroupItems(item: NavigationItem): string {
    const items = item.children || [];

    if (items.length === 0) {
      return "";
    }

    return this.html`
      <div class="group-items detail-list" data-count="${items.length}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          ${items.map((child) => this.renderGroupItemCard(child)).join("")}
        </div>
      </div>
    `;
  }

  private renderGroupItemCard(item: NavigationItem): string {
    const icon = item.type === "suite" ? "📋" : "🔧";

    return this.html`
      <div class="group-item-card bg-surface p-md rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
           onclick="selectNavItem('${item.id}')">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-md">
            <span class="text-xl">${icon}</span>
            <div>
              <h4 class="font-semibold text-default">${this.escapeHtml(
                item.name
              )}</h4>
              <p class="text-sm text-muted">${
                item.type === "suite" ? "Test Suite" : "Test Step"
              }</p>
            </div>
          </div>
          ${this.renderStatusBadge(item.status)}
        </div>
      </div>
    `;
  }

  private renderMissingDataNotice(message: string): string {
    return this.html`
      <div class="detail-wrapper">
        <section class="detail-card">
          <div class="missing-data-card text-center border border-dashed border-amber-300 rounded-lg p-lg bg-surface">
            <div class="text-4xl mb-md">📭</div>
            <h2 class="text-xl font-semibold text-default mb-sm">Dados indisponíveis</h2>
            <p class="text-muted text-sm">${this.escapeHtml(message)}</p>
          </div>
        </section>
      </div>
    `;
  }

  private renderUnknownItemType(item: NavigationItem): string {
    return this.html`
      <div class="detail-wrapper p-xl max-w-none">
        <div class="text-center">
          <div class="text-6xl mb-lg">❓</div>
          <h2 class="text-2xl font-bold text-default mb-md">Tipo de item desconhecido</h2>
          <p class="text-muted">
            O tipo "${this.escapeHtml(
              item.type
            )}" não é suportado por este visualizador.
          </p>
        </div>
      </div>
    `;
  }

  private renderErrorSection(item: NavigationItem, error: any): string {
    const isActive = false; // Error sections are not initially active

    return this.html`
      <section
        class="detail-section ${isActive ? "is-active" : "is-hidden"}"
        data-item-id="${this.escapeHtml(item.id)}"
        role="tabpanel"
        aria-hidden="${isActive ? "false" : "true"}"
      >
        <div class="detail-wrapper">
          <section class="detail-card border-red-200 bg-red-50">
            <div class="text-center p-xl">
              <div class="text-4xl mb-md">⚠️</div>
              <h2 class="text-xl font-semibold text-error mb-sm">Erro na renderização</h2>
              <p class="text-sm text-muted mb-md">
                Ocorreu um erro ao renderizar o item "${this.escapeHtml(
                  item.name
                )}"
              </p>
              <details class="text-left">
                <summary class="text-sm text-primary cursor-pointer">Detalhes do erro</summary>
                <pre class="text-xs mt-sm p-sm bg-gray-100 rounded overflow-auto">
${this.escapeHtml(error?.message || error?.toString() || "Erro desconhecido")}
                </pre>
              </details>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  // Métodos auxiliares para buscar dados
  private findSuiteData(id: string, testData: any): any {
    // Implementar busca nos dados dos testes
    return testData?.suites?.find((suite: any) => suite.id === id);
  }

  private findStepData(
    id: string,
    testData: any
  ): { step: any; suite: any } | null {
    if (!testData?.suites) {
      return null;
    }

    for (const suite of testData.suites) {
      const step = (suite.steps || []).find(
        (currentStep: any) => currentStep.id === id
      );

      if (step) {
        return { step, suite };
      }
    }

    return null;
  }

  private calculateSuiteStats(item: NavigationItem): any {
    const children = item.children || [];
    const totalSteps = children.length;
    const successSteps = children.filter(
      (child) => child.status === "success"
    ).length;
    const failedSteps = children.filter((child) =>
      ["failed", "error", "failure"].includes(child.status)
    ).length;

    return {
      totalSteps,
      successSteps,
      failedSteps,
      duration: item.data?.duration || 0,
    };
  }

  private calculateGroupStats(item: NavigationItem): any {
    const children = item.children || [];
    const totalItems = children.length;
    const successItems = children.filter(
      (child) => child.status === "success"
    ).length;
    const failedItems = children.filter((child) =>
      ["failed", "error", "failure"].includes(child.status)
    ).length;

    return {
      totalItems,
      successItems,
      failedItems,
    };
  }
}
