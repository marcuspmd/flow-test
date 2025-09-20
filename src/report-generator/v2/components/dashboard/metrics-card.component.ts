import { BaseComponentV2 } from "../common/base-component-v2";

export interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  size?: "sm" | "md" | "lg";
}

export class MetricsCardComponent extends BaseComponentV2 {
  renderCard(props: MetricCardProps): string {
    const {
      icon,
      label,
      value,
      trend = "neutral",
      trendValue,
      color = "blue",
      size = "md",
    } = props;

    const colorClasses = this.getColorClasses(color);
    const sizeClasses = this.getSizeClasses(size);
    const trendIcon = this.getTrendIcon(trend);

    return this.html`
      <div class="metric-card ${
        sizeClasses.container
      } bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
        <div class="p-4 md:p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="${colorClasses.iconBg} ${
      sizeClasses.icon
    } rounded-lg flex items-center justify-center">
                <span class="text-white text-lg">${icon}</span>
              </div>
              <h3 class="${
                sizeClasses.label
              } font-medium text-gray-900 dark:text-gray-100">${label}</h3>
            </div>
            ${
              trendValue
                ? this.html`
              <div class="flex items-center space-x-1 ${this.getTrendColor(
                trend
              )} text-sm">
                <span>${trendIcon}</span>
                <span>${trendValue}</span>
              </div>
            `
                : ""
            }
          </div>

          <!-- Value -->
          <div class="${sizeClasses.value} font-bold ${
      colorClasses.text
    } dark:text-gray-100">
            ${value}
          </div>
        </div>
      </div>
    `;
  }

  renderMultipleCards(cards: MetricCardProps[]): string {
    return this.html`
      <div class="metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${cards.map((card) => this.renderCard(card)).join("")}
      </div>
    `;
  }

  private getColorClasses(color: string) {
    const colorMap: Record<
      string,
      { iconBg: string; text: string; border: string }
    > = {
      blue: {
        iconBg: "bg-blue-500",
        text: "text-blue-600",
        border: "border-blue-200",
      },
      green: {
        iconBg: "bg-green-500",
        text: "text-green-600",
        border: "border-green-200",
      },
      red: {
        iconBg: "bg-red-500",
        text: "text-red-600",
        border: "border-red-200",
      },
      yellow: {
        iconBg: "bg-yellow-500",
        text: "text-yellow-600",
        border: "border-yellow-200",
      },
      purple: {
        iconBg: "bg-purple-500",
        text: "text-purple-600",
        border: "border-purple-200",
      },
      gray: {
        iconBg: "bg-gray-500",
        text: "text-gray-600",
        border: "border-gray-200",
      },
    };
    return colorMap[color] || colorMap.blue;
  }

  private getSizeClasses(size: string) {
    const sizeMap: Record<
      string,
      { container: string; icon: string; label: string; value: string }
    > = {
      sm: {
        container: "min-h-24",
        icon: "w-8 h-8",
        label: "text-sm",
        value: "text-xl",
      },
      md: {
        container: "min-h-32",
        icon: "w-10 h-10",
        label: "text-sm",
        value: "text-2xl",
      },
      lg: {
        container: "min-h-40",
        icon: "w-12 h-12",
        label: "text-base",
        value: "text-3xl",
      },
    };
    return sizeMap[size] || sizeMap.md;
  }

  private getTrendIcon(trend: string): string {
    const trendMap: Record<string, string> = {
      up: "↗",
      down: "↘",
      neutral: "→",
    };
    return trendMap[trend] || trendMap.neutral;
  }

  private getTrendColor(trend: string): string {
    const colorMap: Record<string, string> = {
      up: "text-green-600",
      down: "text-red-600",
      neutral: "text-gray-500",
    };
    return colorMap[trend] || colorMap.neutral;
  }

  render(): string {
    return "";
  }
}
