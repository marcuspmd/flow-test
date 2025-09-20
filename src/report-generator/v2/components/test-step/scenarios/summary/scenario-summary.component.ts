/**
 * @packageDocumentation
 * Componente de resumo estatístico dos cenários
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";

export interface ScenarioSummaryComponentProps {
  scenariosMeta: any;
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
 * Renderiza estatísticas resumidas dos cenários (total, matched, executed, rate)
 */
export class ScenarioSummaryComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderSummary(props: ScenarioSummaryComponentProps): string {
    const { scenariosMeta } = props;
    const evaluations = scenariosMeta.evaluations || [];
    const totalScenarios = evaluations.length;
    const matchedScenarios = evaluations.filter(
      (e: ScenarioEvaluation) => e.matched
    ).length;
    const executedScenarios = evaluations.filter(
      (e: ScenarioEvaluation) => e.executed
    ).length;
    const matchRate =
      totalScenarios > 0
        ? ((matchedScenarios / totalScenarios) * 100).toFixed(1)
        : "0";

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
}
