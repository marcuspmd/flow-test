/**
 * Componente para exibir cards de suites de teste
 */
import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig } from "../../types";

export interface SuiteCardProps {
  suiteName: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration: number;
  status: "success" | "error" | "warning";
  priority?: string;
  tags?: string[];
}

export class SuiteCardComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return "";
  }

  renderCard(props: SuiteCardProps): string {
    const {
      suiteName,
      totalSteps,
      passedSteps,
      failedSteps,
      duration,
      status,
      priority,
      tags,
    } = props;

    const statusClasses = {
      success:
        "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
      error: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
      warning:
        "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20",
    };

    const statusIcons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
    };

    const progressPercent =
      totalSteps > 0 ? (passedSteps / totalSteps) * 100 : 0;

    return this.html`
      <div class="bg-white dark:bg-gray-800 border ${
        statusClasses[status]
      } rounded-lg p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
           onclick="window.toggleSuiteDetails('${this.escapeHtml(suiteName)}')">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl">${statusIcons[status]}</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">${this.escapeHtml(
                suiteName
              )}</h3>
            </div>
            ${
              priority
                ? `<span class="inline-block px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30 rounded-full">${this.escapeHtml(
                    priority
                  )}</span>`
                : ""
            }
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">${duration}ms</div>
        </div>

        <!-- Progress bar -->
        <div class="mb-4">
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Progresso</span>
            <span>${passedSteps}/${totalSteps}</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div class="bg-green-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-lg font-bold text-gray-900 dark:text-white">${totalSteps}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <div>
            <div class="text-lg font-bold text-green-600 dark:text-green-400">${passedSteps}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Passou</div>
          </div>
          <div>
            <div class="text-lg font-bold text-red-600 dark:text-red-400">${failedSteps}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Falhou</div>
          </div>
        </div>

        ${
          tags && tags.length > 0
            ? `
          <div class="mt-4 flex flex-wrap gap-1">
            ${tags
              .map(
                (tag) =>
                  `<span class="inline-block px-2 py-1 text-xs text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 rounded">${this.escapeHtml(
                    tag
                  )}</span>`
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }
}
