/**
 * @packageDocumentation
 * Componente de detalhes globais dos cenários
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";

export interface ScenarioDetailsComponentProps {
  scenariosMeta: any;
}

/**
 * Renderiza detalhes globais e resumo de execução dos cenários
 */
export class ScenarioDetailsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderDetails(props: ScenarioDetailsComponentProps): string {
    const { scenariosMeta } = props;
    const details: string[] = [];

    // Execution summary
    if (scenariosMeta.executed_count !== undefined) {
      const executionMessage =
        scenariosMeta.executed_count > 0
          ? `${scenariosMeta.executed_count} scenario(s) executed successfully`
          : "No scenarios matched the current conditions";

      details.push(this.html`
        <div class="scenario-detail-section">
          <h6 class="detail-title">Execution Summary</h6>
          <div class="detail-content">
            <p class="execution-summary ${
              scenariosMeta.executed_count > 0 ? "success" : "info"
            }">
              ${executionMessage}
            </p>
          </div>
        </div>
      `);
    }

    // Global metadata
    if (scenariosMeta.has_scenarios) {
      details.push(this.html`
        <div class="scenario-detail-section">
          <h6 class="detail-title">Configuration</h6>
          <div class="detail-content">
            <div class="config-info">
              <span class="config-label">Scenarios Enabled:</span>
              <span class="config-value">✅ Yes</span>
            </div>
            ${
              scenariosMeta.total_defined
                ? this.html`
              <div class="config-info">
                <span class="config-label">Total Defined:</span>
                <span class="config-value">${scenariosMeta.total_defined}</span>
              </div>
            `
                : ""
            }
          </div>
        </div>
      `);
    }

    return details.length > 0
      ? this.html`<div class="scenario-details mt-lg space-y-md">${details.join(
          ""
        )}</div>`
      : "";
  }

  renderNoScenariosState(): string {
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
}
