/**
 * Componente para exibir estatísticas principais do dashboard
 */
import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig } from "../../types";

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: "success" | "error" | "warning" | "info";
}

export class StatsCardComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    // Default empty render
    return "";
  }

  renderCard(props: StatsCardProps): string {
    const { title, value, change, icon, color } = props;

    const colorClasses = {
      success:
        "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800",
      error:
        "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800",
      warning:
        "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800",
      info: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800",
    };

    const changeDisplay =
      change !== undefined
        ? `<span class="text-sm ${
            change >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }">
        ${change >= 0 ? "↗" : "↘"} ${Math.abs(change)}%
      </span>`
        : "";

    return this.html`
      <div class="bg-white dark:bg-gray-800 border ${colorClasses[color]} rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">${title}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">${value}</p>
            ${changeDisplay}
          </div>
          <div class="w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center">
            <span class="text-2xl">${icon}</span>
          </div>
        </div>
      </div>
    `;
  }
}
