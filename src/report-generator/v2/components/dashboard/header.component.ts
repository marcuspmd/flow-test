/**
 * Componente para exibir header do dashboard com controles
 */
import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig } from "../../types";

export interface DashboardHeaderProps {
  projectName: string;
  totalTests: number;
  successRate: number;
  duration: number;
  timestamp: string;
}

export class DashboardHeaderComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return "";
  }

  renderHeader(props: DashboardHeaderProps): string {
    const { projectName, totalTests, successRate, duration, timestamp } = props;

    const successRateColor =
      successRate >= 95
        ? "text-green-600 dark:text-green-400"
        : successRate >= 80
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

    return this.html`
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              ${this.escapeHtml(projectName)}
            </h1>
            <div class="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span>📊 ${totalTests} testes</span>
              <span class="${successRateColor}">✓ ${successRate}% sucesso</span>
              <span>⏱️ ${duration}ms</span>
              <span>🕒 ${new Date(timestamp).toLocaleString("pt-BR")}</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-4">
            <!-- Theme Toggle -->
            <button
              id="theme-toggle"
              onclick="window.toggleTheme()"
              class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Alternar tema">
              <span class="dark:hidden">🌙</span>
              <span class="hidden dark:inline">☀️</span>
            </button>

            <!-- Export Button -->
            <button
              onclick="window.exportReport()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
              <span>📄</span>
              Exportar
            </button>

            <!-- Refresh Button -->
            <button
              onclick="window.location.reload()"
              class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2">
              <span>🔄</span>
              Atualizar
            </button>
          </div>
        </div>
      </header>
    `;
  }
}
