/**
 * @packageDocumentation
 * Componente de assertions para test steps V2
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig, AssertionData } from "../../types";

export interface AssertionsComponentProps {
  assertions: AssertionData[];
  stepId: string;
}

/**
 * Renderiza as assertions de um test step de forma compacta e organizada
 */
export class AssertionsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderAssertions(props: AssertionsComponentProps): string {
    const { assertions, stepId } = props;

    if (!assertions || assertions.length === 0) {
      return this.renderEmptyState();
    }

    const assertionItems = assertions
      .map((assertion, index) =>
        this.renderAssertion(assertion, `${stepId}-assertion-${index}`)
      )
      .join("");

    return this.html`
      <div class="assertions-container p-md bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 mb-sm">
          <span class="text-lg">🔍</span>
          <h4 class="text-lg font-semibold text-default">Assertions</h4>
          <span class="text-sm text-muted">(${assertions.length})</span>
        </div>
        <div class="space-y-sm">
          ${assertionItems}
        </div>
      </div>
    `;
  }

  private renderAssertion(assertion: AssertionData, id: string): string {
    const status = assertion.passed ? "success" : "failed";
    const icon = this.getStatusIcon(status);
    const color = this.getStatusColor(status);

    const raw = assertion as unknown as Record<string, unknown>;

    const label =
      assertion.type ||
      (typeof raw.field === "string" ? raw.field : undefined) ||
      (typeof raw.name === "string" ? raw.name : undefined) ||
      (typeof raw.description === "string" ? raw.description : undefined) ||
      "Assertion";

    const operator =
      assertion.operator ||
      (typeof raw.comparison === "string" ? raw.comparison : undefined) ||
      (typeof raw.matcher === "string" ? raw.matcher : undefined) ||
      "";

    return this.html`
      <div id="${id}" class="assertion-item p-sm border rounded ${color} bg-white">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-2 flex-1">
            <span class="text-lg">${icon}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-xs">
                <span class="text-sm font-medium text-default">
                  ${this.escapeHtml(label)}
                </span>
                ${
                  operator
                    ? this.html`
                    <span class="text-xs text-muted">
                      ${this.escapeHtml(operator)}
                    </span>
                  `
                    : ""
                }
              </div>
              ${this.renderAssertionDetails(assertion)}
            </div>
          </div>
          ${this.renderAssertionStatus(assertion)}
        </div>
      </div>
    `;
  }

  private renderAssertionDetails(assertion: AssertionData): string {
    const { expected, actual } = assertion;
    const raw = assertion as unknown as Record<string, unknown>;
    const message = typeof raw.message === "string" ? raw.message : undefined;

    return this.html`
      <div class="assertion-details space-y-xs text-sm">
        ${
          expected !== undefined
            ? this.html`
          <div class="flex space-x-2">
            <span class="text-muted min-w-0 flex-shrink-0">Expected:</span>
            <code class="inline-code text-xs font-mono">
              ${this.escapeHtml(this.formatValue(expected))}
            </code>
          </div>
        `
            : ""
        }
        ${
          actual !== undefined
            ? this.html`
          <div class="flex space-x-2">
            <span class="text-muted min-w-0 flex-shrink-0">Actual:</span>
            <code class="inline-code text-xs font-mono">
              ${this.escapeHtml(this.formatValue(actual))}
            </code>
          </div>
        `
            : ""
        }
        ${
          message
            ? this.html`
          <div class="flex space-x-2">
            <span class="text-muted min-w-0 flex-shrink-0">Message:</span>
            <span class="text-xs text-default">${this.escapeHtml(message)}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderAssertionStatus(assertion: AssertionData): string {
    const status = assertion.passed ? "success" : "failed";

    return this.html`
      <div class="flex-shrink-0">
        ${this.renderStatusBadge(status, "text-xs")}
      </div>
    `;
  }

  private renderEmptyState(): string {
    return this.html`
      <div class="assertions-container p-md bg-surface rounded-lg border">
        <div class="flex items-center space-x-2 mb-sm">
          <span class="text-lg">🔍</span>
          <h4 class="text-lg font-semibold text-default">Assertions</h4>
        </div>
        <div class="text-center py-lg">
          <span class="text-muted text-sm">Nenhuma assertion configurada</span>
        </div>
      </div>
    `;
  }

  private formatValue(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
      return value.length > 50 ? `${value.substring(0, 50)}...` : value;
    }
    if (typeof value === "object") {
      try {
        const json = JSON.stringify(value);
        return json.length > 100 ? `${json.substring(0, 100)}...` : json;
      } catch {
        return String(value);
      }
    }
    return String(value);
  }
}
