/**
 * Componente TestSuite - Container para suítes de teste
 *
 * Responsabilidades:
 * - Exibir informações da suíte (nome, status, duração)
 * - Lista expansível/colapsável de steps
 * - Indicadores visuais de status
 * - Resumo de métricas da suíte
 * - Navegação entre steps
 */

import { BaseComponent } from "./base-component";
import { TestSuiteProps } from "./types";
import { TestStepComponent } from "./test-step.component";

export class TestSuiteComponent extends BaseComponent {
  private stepComponent = new TestStepComponent();

  private getStatusIcon(status: string): string {
    return status === "success" ? "✓" : "✗";
  }

  private getStatusClasses(status: string): {
    border: string;
    bg: string;
    text: string;
    icon: string;
  } {
    if (status === "success") {
      return {
        border: "border-l-green-500",
        bg: "bg-green-50 dark:bg-green-900/10",
        text: "text-green-700 dark:text-green-300",
        icon: "text-green-500",
      };
    }

    return {
      border: "border-l-red-500",
      bg: "bg-red-50 dark:bg-red-900/10",
      text: "text-red-700 dark:text-red-300",
      icon: "text-red-500",
    };
  }

  private getSuiteMetrics(steps: any[]): {
    total: number;
    passed: number;
    failed: number;
    successRate: string;
  } {
    const total = steps.length;
    const passed = steps.filter((step) => step.status === "success").length;
    const failed = total - passed;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";

    return { total, passed, failed, successRate };
  }

  render(props: TestSuiteProps): string {
    const { suiteName, status, duration, steps, suiteId } = props;
    const statusClasses = this.getStatusClasses(status);
    const statusIcon = this.getStatusIcon(status);
    const metrics = this.getSuiteMetrics(steps);

    return this.html`
      <div class="card ${statusClasses.border} mb-4 overflow-hidden">
        <!-- Cabeçalho da suíte -->
        <div
          class="flex justify-between items-center p-4 cursor-pointer hover:${
            statusClasses.bg
          } transition-colors duration-200"
          onclick="toggleSuite('${suiteId}')"
          role="button"
          tabindex="0"
          aria-expanded="false"
          aria-controls="${suiteId}-content"
        >
          <div class="flex items-center space-x-4">
            <!-- Status icon -->
            <div class="flex items-center justify-center w-8 h-8 rounded-full ${
              statusClasses.bg
            }">
              <span class="text-lg font-bold ${statusClasses.icon}">
                ${statusIcon}
              </span>
            </div>

            <!-- Nome da suíte -->
            <div>
              <h2 class="text-lg font-semibold text-primary">
                ${this.escapeHtml(suiteName)}
              </h2>
              <div class="flex items-center space-x-4 text-sm text-secondary">
                <span>${this.formatDuration(duration)}</span>
                <span>•</span>
                <span>${metrics.total} steps</span>
                <span>•</span>
                <span class="text-green-600 dark:text-green-400">${
                  metrics.passed
                } passed</span>
                ${
                  metrics.failed > 0
                    ? this.html`
                  <span>•</span>
                  <span class="text-red-600 dark:text-red-400">${metrics.failed} failed</span>
                `
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- Métricas e controles -->
          <div class="flex items-center space-x-4">
            <!-- Success rate badge -->
            <div class="px-3 py-1 rounded-full text-xs font-medium ${
              parseFloat(metrics.successRate) === 100
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : parseFloat(metrics.successRate) >= 80
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }">
              ${metrics.successRate}% success
            </div>

            <!-- Expand/collapse icon -->
            <span
              id="${suiteId}-icon"
              class="transform transition-transform duration-200 text-secondary"
              aria-hidden="true"
            >
              ▶
            </span>
          </div>
        </div>

        <!-- Conteúdo da suíte (steps) -->
        <div
          id="${suiteId}-content"
          class="hidden border-t border-default"
          aria-labelledby="${suiteId}-header"
        >
          <div class="p-4 space-y-3 bg-tertiary">
            ${
              steps.length > 0
                ? this.html`
              <div class="text-sm text-secondary mb-3">
                <strong>Steps da suíte:</strong>
              </div>
              ${this.renderList(steps, (step, index) =>
                this.stepComponent.render({ step, index })
              )}
            `
                : this.html`
              <div class="text-center p-8 text-secondary">
                <p>Nenhum step encontrado nesta suíte</p>
              </div>
            `
            }
          </div>
        </div>
      </div>
    `;
  }
}
