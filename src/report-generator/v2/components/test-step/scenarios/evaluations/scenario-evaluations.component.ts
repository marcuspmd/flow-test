/**
 * @packageDocumentation
 * Componente de avaliações dos cenários
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";

export interface ScenarioEvaluationsComponentProps {
  evaluations: ScenarioEvaluation[];
  stepData?: any;
}

export interface ScenarioEvaluation {
  index: number;
  condition: string;
  matched: boolean;
  executed: boolean;
  branch: "then" | "else" | "none";
  assertions_added?: number;
  captures_added?: number;
}

/**
 * Renderiza a lista detalhada de avaliações de cenários
 */
export class ScenarioEvaluationsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderEvaluations(props: ScenarioEvaluationsComponentProps): string {
    const { evaluations, stepData } = props;

    if (!evaluations || evaluations.length === 0) {
      return this.renderEmptyEvaluations();
    }

    const cards = evaluations.map((evaluation, index) => {
      return this.html`
        <div class="scenario-card ${
          evaluation.executed ? "executed" : "not-executed"
        }">
          <div class="scenario-card-header">
            <div class="scenario-number">
              <span class="scenario-index">#${evaluation.index}</span>
              <span class="scenario-status-icon">
                ${evaluation.executed ? "🔄" : "⏭️"}
              </span>
            </div>
            <div class="scenario-results">
              <span class="match-result ${
                evaluation.matched ? "matched" : "not-matched"
              }">
                ${evaluation.matched ? "✅ Matched" : "❌ Not Matched"}
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
                <code class="inline-code">${this.escapeHtml(
                  evaluation.condition
                )}</code>
                <button
                  class="copy-condition-btn"
                  onclick="copyToClipboard('${this.escapeHtml(
                    evaluation.condition
                  )}')"
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

  private renderEmptyEvaluations(): string {
    return this.html`
      <div class="empty-evaluations text-center py-lg">
        <span class="text-muted text-sm">No scenario evaluations available</span>
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
      : this.html`<div class="no-actions text-muted text-xs">No actions</div>`;
  }

  private renderScenarioDetails(
    evaluation: ScenarioEvaluation,
    stepData?: any
  ): string {
    if (!evaluation.executed) {
      return this.html`
        <div class="scenario-details">
          <p class="text-muted text-sm">Scenario not executed</p>
        </div>
      `;
    }

    return this.html`
      <div class="scenario-details">
        <div class="execution-info">
          <span class="detail-label">Branch:</span>
          <span class="detail-value">${this.getBranchLabel(
            evaluation.branch
          )}</span>
        </div>

        ${
          evaluation.assertions_added
            ? this.html`
          <div class="execution-info">
            <span class="detail-label">Assertions Added:</span>
            <span class="detail-value">${evaluation.assertions_added}</span>
          </div>
        `
            : ""
        }

        ${
          evaluation.captures_added
            ? this.html`
          <div class="execution-info">
            <span class="detail-label">Captures Added:</span>
            <span class="detail-value">${evaluation.captures_added}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private getBranchLabel(branch: string): string {
    switch (branch) {
      case "then":
        return "✅ Then";
      case "else":
        return "❌ Else";
      case "none":
        return "⚪ None";
      default:
        return branch;
    }
  }
}
