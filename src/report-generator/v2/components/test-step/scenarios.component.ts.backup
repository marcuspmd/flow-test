/**
 * @packageDocumentation
 * Componente de cenários para test steps V2
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig } from "../../types";

export interface ScenariosComponentProps {
  scenariosMeta: any;
  stepName: string;
  stepId: string;
  stepData?: any; // Para acessar captured_variables e outros dados do step
}

export interface ScenarioEvaluation {
  index: number;
  condition: string;
  matched: boolean;
  executed: boolean;
  branch: 'then' | 'else' | 'none';
  assertions_added?: number;
  captures_added?: number;
}

/**
 * Renderiza informações detalhadas sobre cenários condicionais
 */
export class ScenariosComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderScenarios(props: ScenariosComponentProps): string {
    const { scenariosMeta, stepName, stepId, stepData } = props;

    if (!scenariosMeta || !scenariosMeta.has_scenarios) {
      return this.renderNoScenariosState();
    }

    const tabId = this.generateId(`${stepId}-scenarios`);

    return this.html`
      <div class="scenarios-container bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 p-md border-b">
          <span class="text-lg">🎭</span>
          <h4 class="text-lg font-semibold text-default">Conditional Scenarios</h4>
          <span class="text-sm text-muted">(${scenariosMeta.executed_count || 0} executed)</span>
        </div>

        <div class="scenarios-content p-4">
          ${this.renderScenariosSummary(scenariosMeta)}

          ${scenariosMeta.evaluations && scenariosMeta.evaluations.length > 0 ? this.html`
            <div class="scenarios-evaluations mt-lg">
              <h5 class="text-md font-semibold text-default mb-md">Scenario Evaluations</h5>
              ${this.renderEvaluationsTable(scenariosMeta.evaluations, stepData)}
            </div>
          ` : ''}

          ${this.renderGlobalScenarioDetails(scenariosMeta)}
        </div>
      </div>
    `;
  }

  private renderScenariosSummary(scenariosMeta: any): string {
    const evaluations = scenariosMeta.evaluations || [];
    const totalScenarios = evaluations.length;
    const matchedScenarios = evaluations.filter((e: ScenarioEvaluation) => e.matched).length;
    const executedScenarios = evaluations.filter((e: ScenarioEvaluation) => e.executed).length;
    const matchRate = totalScenarios > 0 ? ((matchedScenarios / totalScenarios) * 100).toFixed(1) : "0";

    return this.html`
      <div class="scenarios-summary grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <div class="stat-card">
          <div class="text-xl text-primary mb-sm">📋</div>
          <div class="text-xl font-bold text-default">${totalScenarios}</div>
          <div class="text-xs text-muted">Total Scenarios</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-success mb-sm">✅</div>
          <div class="text-xl font-bold text-success">${matchedScenarios}</div>
          <div class="text-xs text-muted">Matched</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-warning mb-sm">🔄</div>
          <div class="text-xl font-bold text-warning">${executedScenarios}</div>
          <div class="text-xs text-muted">Executed</div>
        </div>

        <div class="stat-card">
          <div class="text-xl text-secondary mb-sm">📊</div>
          <div class="text-xl font-bold text-default">${matchRate}%</div>
          <div class="text-xs text-muted">Match Rate</div>
        </div>
      </div>
    `;
  }

  private renderEvaluationsTable(evaluations: ScenarioEvaluation[], stepData?: any): string {
    const cards = evaluations.map((evaluation, index) => {
      return this.html`
        <div class="scenario-card ${evaluation.executed ? 'executed' : 'not-executed'}">
          <div class="scenario-card-header">
            <div class="scenario-number">
              <span class="scenario-index">#${evaluation.index}</span>
              <span class="scenario-status-icon">
                ${evaluation.executed ? '🔄' : '⏭️'}
              </span>
            </div>
            <div class="scenario-results">
              <span class="match-result ${evaluation.matched ? 'matched' : 'not-matched'}">
                ${evaluation.matched ? '✅ Matched' : '❌ Not Matched'}
              </span>
              <span class="branch-result branch-${evaluation.branch}">
                ${this.getBranchLabel(evaluation.branch)}
              </span>
            </div>
          </div>

          <div class="scenario-card-body">
            <div class="condition-section">
              <h7 class="condition-label">Condition:</h7>
              <div class="condition-code">
                <code class="inline-code">${this.escapeHtml(evaluation.condition)}</code>
                <button
                  class="copy-condition-btn"
                  onclick="copyToClipboard('${this.escapeHtml(evaluation.condition)}')"
                  title="Copy condition"
                >
                  📋
                </button>
              </div>
            </div>

            ${this.renderScenarioDetails(evaluation, stepData)}

            <div class="scenario-actions">
              ${this.renderEvaluationActions(evaluation)}
            </div>
          </div>
        </div>
      `;
    });

    return this.html`
      <div class="scenarios-cards-grid">
        ${cards.join("")}
      </div>
    `;
  }

  private renderEvaluationActions(evaluation: ScenarioEvaluation): string {
    const actions: string[] = [];

    if (evaluation.assertions_added && evaluation.assertions_added > 0) {
      actions.push(this.html`
        <span class="action-badge assertions">
          📝 ${evaluation.assertions_added} assertions
        </span>
      `);
    }

    if (evaluation.captures_added && evaluation.captures_added > 0) {
      actions.push(this.html`
        <span class="action-badge captures">
          📥 ${evaluation.captures_added} captures
        </span>
      `);
    }

    return actions.length > 0
      ? this.html`<div class="actions-list">${actions.join("")}</div>`
      : this.html`<span class="text-muted text-xs">No actions</span>`;
  }

  private renderScenarioDetails(evaluation: ScenarioEvaluation, stepData?: any): string {
    const details: string[] = [];

    // Execution details
    if (evaluation.executed) {
      details.push(this.html`
        <div class="execution-details">
          <h7 class="detail-subtitle">Execution Details:</h7>
          <div class="execution-info">
            <div class="execution-item">
              <span class="execution-label">Branch Executed:</span>
              <span class="execution-value branch-${evaluation.branch}">
                ${this.getBranchLabel(evaluation.branch)}
              </span>
            </div>
            ${evaluation.assertions_added ? this.html`
              <div class="execution-item">
                <span class="execution-label">Assertions Added:</span>
                <span class="execution-value">${evaluation.assertions_added}</span>
              </div>
            ` : ''}
            ${evaluation.captures_added ? this.html`
              <div class="execution-item">
                <span class="execution-label">Variables Captured:</span>
                <span class="execution-value">${evaluation.captures_added}</span>
              </div>
            ` : ''}
          </div>

          ${this.renderCapturedVariablesDetails(evaluation, stepData)}
          </div>
        </div>
      `);
    } else {
      details.push(this.html`
        <div class="skip-details">
          <span class="skip-reason">
            ${evaluation.matched
              ? 'Condition matched but no actions defined'
              : 'Condition did not match current context'
            }
          </span>
        </div>
      `);
    }

    // Condition breakdown
    const conditionBreakdown = this.analyzeCondition(evaluation.condition);
    if (conditionBreakdown) {
      details.push(this.html`
        <div class="condition-breakdown">
          <h7 class="detail-subtitle">Condition Analysis:</h7>
          <div class="breakdown-content">
            ${conditionBreakdown}
          </div>
        </div>
      `);
    }

    return details.length > 0
      ? this.html`<div class="scenario-detail-content">${details.join('')}</div>`
      : '';
  }

  private renderGlobalScenarioDetails(scenariosMeta: any): string {
    const details: string[] = [];

    // Execution summary
    if (scenariosMeta.executed_count !== undefined) {
      const executionMessage = scenariosMeta.executed_count > 0
        ? `${scenariosMeta.executed_count} scenario(s) executed successfully`
        : "No scenarios matched the current conditions";

      details.push(this.html`
        <div class="scenario-detail-section">
          <h6 class="detail-title">Execution Summary</h6>
          <div class="detail-content">
            <p class="execution-summary ${scenariosMeta.executed_count > 0 ? 'success' : 'info'}">
              ${executionMessage}
            </p>
          </div>
        </div>
      `);
    }

    return details.length > 0
      ? this.html`<div class="scenario-details mt-lg space-y-md">${details.join("")}</div>`
      : '';
  }

  private renderNoScenariosState(): string {
    return this.html`
      <div class="scenarios-container p-md bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 mb-sm">
          <span class="text-lg">🎭</span>
          <h4 class="text-lg font-semibold text-default">Conditional Scenarios</h4>
        </div>
        <div class="text-center py-lg">
          <span class="text-muted text-sm">No conditional scenarios defined</span>
        </div>
      </div>
    `;
  }

  private getBranchLabel(branch: string): string {
    switch (branch) {
      case 'then': return '✅ Then';
      case 'else': return '❌ Else';
      case 'none': return '⚪ None';
      default: return branch;
    }
  }

  private analyzeCondition(condition: string): string {
    // Simple analysis of common condition patterns
    const patterns = [
      { regex: /status_code\s*==\s*`(\d+)`/, description: 'Checks if HTTP status code equals' },
      { regex: /status_code\s*!=\s*`(\d+)`/, description: 'Checks if HTTP status code is not' },
      { regex: /status_code\s*>=\s*`(\d+)`/, description: 'Checks if HTTP status code is at least' },
      { regex: /status_code\s*<=\s*`(\d+)`/, description: 'Checks if HTTP status code is at most' },
      { regex: /body\.(.+?)\s*==\s*`(.+?)`/, description: 'Checks if response body field equals' },
      { regex: /headers\.["'](.+?)["']\s*==\s*`(.+?)`/, description: 'Checks if response header equals' },
      { regex: /duration_ms\s*<\s*`(\d+)`/, description: 'Checks if response time is less than' },
      { regex: /size_bytes\s*>\s*`(\d+)`/, description: 'Checks if response size is greater than' },
    ];

    for (const pattern of patterns) {
      const match = condition.match(pattern.regex);
      if (match) {
        const value = match[1] || match[2];
        return this.html`
          <div class="condition-explanation">
            <span class="explanation-text">${pattern.description}</span>
            <span class="explanation-value">${this.escapeHtml(value)}</span>
          </div>
        `;
      }
    }

    // Complex conditions
    if (condition.includes('&&')) {
      return this.html`
        <div class="condition-explanation">
          <span class="explanation-text">Complex condition with multiple checks (AND logic)</span>
        </div>
      `;
    }

    if (condition.includes('||')) {
      return this.html`
        <div class="condition-explanation">
          <span class="explanation-text">Complex condition with multiple checks (OR logic)</span>
        </div>
      `;
    }

    return this.html`
      <div class="condition-explanation">
        <span class="explanation-text">Custom condition expression</span>
      </div>
    `;
  }

  private renderCapturedVariablesDetails(evaluation: ScenarioEvaluation, stepData?: any): string {
    // Se o cenário foi executado e teve captures, mostrar as variáveis
    if (!evaluation.executed || !evaluation.captures_added || evaluation.captures_added === 0) {
      return '';
    }

    // Tentar obter as variáveis capturadas do stepData
    // Diferentes possíveis localizações dos dados
    const capturedVariables =
      stepData?.captured_variables ||
      stepData?.capturedVariables ||
      stepData?.captured_vars ||
      {};

    // Debug: Vamos mostrar informações sobre o que temos disponível
    const hasStepData = !!stepData;
    const stepDataKeys = stepData ? Object.keys(stepData) : [];
    const variableCount = Object.keys(capturedVariables).length;

    // Se não temos variáveis, mas sabemos que foram capturadas, mostrar isso
    if (variableCount === 0) {
      return this.html`
        <div class="captured-variables-section">
          <h7 class="detail-subtitle">Captured Variables:</h7>
          <div class="captured-variables-info">
            <span class="no-variables-info">
              ${evaluation.captures_added} variables captured
              ${hasStepData ? '' : ' (step data not available)'}
            </span>
            ${hasStepData && stepDataKeys.length > 0 ? this.html`
              <div class="debug-info" style="font-size: 10px; color: #666; margin-top: 4px;">
                Available step data: ${stepDataKeys.join(', ')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Mostrar as variáveis capturadas
    return this.html`
      <div class="captured-variables-section">
        <h7 class="detail-subtitle">Captured Variables:</h7>
        <div class="captured-variables-list">
          ${Object.entries(capturedVariables).map(([key, value]) => this.html`
            <div class="captured-variable-item">
              <span class="variable-name">${this.escapeHtml(key)}:</span>
              <span class="variable-value">
                ${this.formatVariableValue(value)}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private formatVariableValue(value: any): string {
    if (value === null || value === undefined) {
      return '<span class="null-value">null</span>';
    }

    if (typeof value === 'string') {
      // Truncar strings muito longas
      const truncated = value.length > 100 ? value.substring(0, 100) + '...' : value;
      return `<span class="string-value">"${this.escapeHtml(truncated)}"</span>`;
    }

    if (typeof value === 'object') {
      try {
        const jsonStr = JSON.stringify(value, null, 2);
        const truncated = jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
        return `<pre class="object-value"><code>${this.escapeHtml(truncated)}</code></pre>`;
      } catch {
        return '<span class="object-value">[Object]</span>';
      }
    }

    return `<span class="primitive-value">${this.escapeHtml(String(value))}</span>`;
  }

  /**
   * Renderiza um resumo condensado dos cenários para uso em outras partes da UI
   */
  renderScenariosSummaryBadge(scenariosMeta: any): string {
    if (!scenariosMeta || !scenariosMeta.has_scenarios) {
      return '';
    }

    const evaluations = scenariosMeta.evaluations || [];
    const executedCount = scenariosMeta.executed_count || 0;
    const totalCount = evaluations.length;

    if (totalCount === 0) {
      return '';
    }

    const badgeClass = executedCount > 0 ? 'scenarios-badge-success' : 'scenarios-badge-info';

    return this.html`
      <div class="scenarios-summary-badge ${badgeClass}">
        <span class="badge-icon">🎭</span>
        <span class="badge-text">
          ${executedCount}/${totalCount} scenarios
        </span>
      </div>
    `;
  }

  /**
   * Renderiza estatísticas inline para uso em cards de step
   */
  renderInlineStats(scenariosMeta: any): string {
    if (!scenariosMeta || !scenariosMeta.has_scenarios) {
      return '';
    }

    const evaluations = scenariosMeta.evaluations || [];
    const matchedCount = evaluations.filter((e: ScenarioEvaluation) => e.matched).length;
    const executedCount = scenariosMeta.executed_count || 0;

    return this.html`
      <div class="scenarios-inline-stats text-xs text-muted">
        <span>📋 ${evaluations.length} scenarios</span>
        ${matchedCount > 0 ? this.html`
          <span class="ml-sm">✅ ${matchedCount} matched</span>
        ` : ''}
        ${executedCount > 0 ? this.html`
          <span class="ml-sm">🔄 ${executedCount} executed</span>
        ` : ''}
      </div>
    `;
  }

  private extractVariablesFromAlternativeSources(stepData?: any): Record<string, any> | null {
    if (!stepData) return null;

    // Procurar por variáveis em diferentes estruturas possíveis
    const sources = [
      stepData.variables,
      stepData.vars,
      stepData.captured,
      stepData.captures,
      stepData.step_variables,
      stepData.result_variables,
    ];

    for (const source of sources) {
      if (source && typeof source === 'object' && Object.keys(source).length > 0) {
        return source;
      }
    }

    // Se o stepData tem propriedades que parecem variáveis (não são objetos de metadata)
    const potentialVariables: Record<string, any> = {};
    const excludeKeys = [
      'id', 'name', 'status', 'duration', 'assertions', 'request', 'response',
      'curlCommand', 'errorContext', 'iteration_results', 'scenarios_meta',
      'step_name', 'duration_ms', 'assertions_results', 'request_details',
      'response_details', 'error_message'
    ];

    for (const [key, value] of Object.entries(stepData)) {
      if (!excludeKeys.includes(key) && !key.startsWith('_') && value !== null && value !== undefined) {
        // Se parece uma variável (não é um objeto complexo de metadata)
        if (typeof value !== 'object' || Array.isArray(value) ||
            (typeof value === 'object' && Object.keys(value).length < 10)) {
          potentialVariables[key] = value;
        }
      }
    }

    return Object.keys(potentialVariables).length > 0 ? potentialVariables : null;
  }
}