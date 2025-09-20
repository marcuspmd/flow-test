import { BaseComponentV2 } from "../../common/base-component-v2";
import { NavigationItem, ThemeConfig } from "../../../types";
import { BreadcrumbComponent } from "../common/breadcrumb.component";
import { StatusBadgeComponent } from "../common/status-badge.component";

export class SuiteComponent extends BaseComponentV2 {
  private breadcrumb: BreadcrumbComponent;
  private statusBadge: StatusBadgeComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.breadcrumb = new BreadcrumbComponent(theme);
    this.statusBadge = new StatusBadgeComponent(theme);
  }

  renderSuite(item: NavigationItem, suiteData: any): string {
    if (!suiteData) {
      return "<p>Suite data not found.</p>";
    }

    const stats = this.calculateSuiteStats(item);

    return `
      <div class="p-6">
        ${this.breadcrumb.renderBreadcrumb([
          { name: "Suites" },
          { name: item.name },
        ])}
        <div class="bg-white p-6 rounded-lg shadow-md">
          <header class="flex justify-between items-start mb-4">
            <div>
              <h1 class="text-3xl font-bold">${this.escapeHtml(item.name)}</h1>
              <p class="text-gray-500">Test Suite</p>
            </div>
            ${this.statusBadge.renderBadge(item.status, "text-base")}
          </header>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
            <div><div class="text-2xl font-bold">${
              stats.totalSteps
            }</div><div class="text-sm text-gray-500">Total Steps</div></div>
            <div><div class="text-2xl font-bold text-green-600">${
              stats.successSteps
            }</div><div class="text-sm text-gray-500">Passed</div></div>
            <div><div class="text-2xl font-bold text-red-600">${
              stats.failedSteps
            }</div><div class="text-sm text-gray-500">Failed</div></div>
            <div><div class="text-2xl font-bold">${this.formatDuration(
              stats.duration
            )}</div><div class="text-sm text-gray-500">Duration</div></div>
          </div>
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">Steps</h2>
            <div class="space-y-2">
              ${(item.children || [])
                .map((step) => this.renderStepLink(step))
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private calculateSuiteStats(item: NavigationItem): any {
    const children = item.children || [];
    return {
      totalSteps: children.length,
      successSteps: children.filter((c) => c.status === "success").length,
      failedSteps: children.filter((c) =>
        ["failed", "error", "failure"].includes(c.status || "")
      ).length,
      duration: item.data?.duration || 0,
    };
  }

  private renderStepLink(step: NavigationItem): string {
    return `
      <a href="#" onclick="selectNavItem('${
        step.id
      }'); return false;" class="flex p-4 bg-gray-50 rounded-md hover:bg-gray-100 justify-between items-center">
        <div>
          <span class="font-semibold">${this.escapeHtml(step.name)}</span>
        </div>
        ${this.statusBadge.renderBadge(step.status)}
      </a>
    `;
  }

  render(): string {
    return "";
  }
}
