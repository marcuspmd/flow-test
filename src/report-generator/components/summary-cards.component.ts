/**
 * @packageDocumentation
 * This module contains the `SummaryCardsComponent` for the HTML report.
 *
 * @remarks
 * This component is responsible for displaying key metrics of the test report,
 * such as Total Tests, Passed, Failed, and Success Rate, in a visually appealing way.
 * It features a responsive grid layout, SVG icons, and smooth hover effects.
 */

import { BaseComponent } from "./base-component";
import { SummaryCardsProps, SummaryCardData } from "./types";

/**
 * Renders the summary metric cards at the top of the report.
 */
export class SummaryCardsComponent extends BaseComponent {
  /**
   * Retrieves the SVG path for a given icon name.
   * @param iconName - The name of the icon to retrieve.
   * @returns The SVG path string.
   */
  private getIconSvg(iconName: string): string {
    const icons: Record<string, string> = {
      tests: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`,
      success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>`,
      error: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>`,
      warning: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`,
      chart: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`,
    };
    return icons[iconName] || icons.chart;
  }

  /**
   * Gets the Tailwind CSS classes for a given color scheme.
   * @param colorScheme - The color scheme name (e.g., 'primary', 'success').
   * @returns An object with CSS class strings for different elements.
   */
  private getColorClasses(colorScheme: string): {
    bgGradient: string;
    border: string;
    iconBg: string;
    titleColor: string;
    valueColor: string;
  } {
    const colorMap = {
      primary: {
        bgGradient:
          "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
        border: "border-blue-200 dark:border-blue-800",
        iconBg: "bg-blue-500",
        titleColor: "text-blue-600 dark:text-blue-400",
        valueColor: "text-primary",
      },
      success: {
        bgGradient:
          "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
        border: "border-green-200 dark:border-green-800",
        iconBg: "bg-green-500",
        titleColor: "text-green-600 dark:text-green-400",
        valueColor: "text-primary",
      },
      error: {
        bgGradient:
          "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20",
        border: "border-red-200 dark:border-red-800",
        iconBg: "bg-red-500",
        titleColor: "text-red-600 dark:text-red-400",
        valueColor: "text-primary",
      },
      warning: {
        bgGradient:
          "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
        border: "border-amber-200 dark:border-amber-800",
        iconBg: "bg-amber-500",
        titleColor: "text-amber-600 dark:text-amber-400",
        valueColor: "text-primary",
      },
    };

    return colorMap[colorScheme as keyof typeof colorMap] || colorMap.primary;
  }

  /**
   * Renders a single summary card.
   * @param card - The data for the card to render.
   * @returns An HTML string for a single card.
   */
  private renderCard(card: SummaryCardData): string {
    const colors = this.getColorClasses(card.colorScheme);
    const iconSvg = this.getIconSvg(card.icon);

    return this.html`
      <div class="bg-gradient-to-br ${colors.bgGradient} p-6 rounded-xl shadow-md border ${colors.border} hover:shadow-lg transition-all duration-300 group">
        <div class="flex items-center">
          <!-- Icon -->
          <div class="p-3 rounded-full ${colors.iconBg} text-white mr-4 group-hover:scale-110 transition-transform duration-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${iconSvg}
            </svg>
          </div>

          <!-- Card Content -->
          <div class="flex-1">
            <h3 class="text-sm font-medium ${colors.titleColor} uppercase tracking-wide mb-1">
              ${this.escapeHtml(card.title)}
            </h3>
            <p class="text-3xl font-bold ${colors.valueColor} leading-none">
              ${this.escapeHtml(card.value)}
            </p>
          </div>

          <!-- Additional Visual Indicator -->
          <div class="w-1 h-12 ${colors.iconBg} rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-200"></div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the entire summary cards section.
   * @param props - The properties containing the card data.
   * @returns An HTML string for the summary cards section.
   */
  render(props: SummaryCardsProps): string {
    const { cards } = props;

    if (!cards || cards.length === 0) {
      return this.html`
        <div class="text-center p-8 bg-secondary rounded-xl border border-default">
          <p class="text-secondary">No metrics available</p>
        </div>
      `;
    }

    return this.html`
      <section class="mb-8" aria-label="Test metrics summary">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          ${this.renderList(cards, (card) => this.renderCard(card))}
        </div>
      </section>
    `;
  }
}
