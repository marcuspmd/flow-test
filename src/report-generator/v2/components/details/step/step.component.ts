import { BaseComponentV2 } from "../../common/base-component-v2";
import { NavigationItem, ThemeConfig } from "../../../types";
import { BreadcrumbComponent } from "../common/breadcrumb.component";
import { StatusBadgeComponent } from "../common/status-badge.component";
import { AssertionsComponent } from "../../test-step/assertions.component";
import { RequestResponseComponent } from "../../test-step/request-response.component";

export class StepComponent extends BaseComponentV2 {
  private breadcrumb: BreadcrumbComponent;
  private statusBadge: StatusBadgeComponent;
  private assertions: AssertionsComponent;
  private reqres: RequestResponseComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.breadcrumb = new BreadcrumbComponent(theme);
    this.statusBadge = new StatusBadgeComponent(theme);
    this.assertions = new AssertionsComponent(theme);
    this.reqres = new RequestResponseComponent(theme);
  }

  renderStep(item: NavigationItem, stepData: any, suiteName: string): string {
    if (!stepData) {
      return "<p>Step data not found.</p>";
    }

    return `
      <div class="p-6">
        ${this.breadcrumb.renderBreadcrumb([
          { name: "Suites" },
          { name: suiteName },
          { name: item.name },
        ])}
        <div class="bg-white p-6 rounded-lg shadow-md">
          <header class="flex justify-between items-start mb-4">
            <div>
              <h1 class="text-3xl font-bold">${this.escapeHtml(item.name)}</h1>
              <p class="text-gray-500">Test Step</p>
            </div>
            ${this.statusBadge.renderBadge(item.status, "text-base")}
          </header>

          <div class="mt-6">
            ${this.reqres.renderRequestResponse({
              request: stepData.request,
              response: stepData.response,
              curlCommand: stepData.curlCommand,
              stepId: item.id,
            })}
          </div>

          <div class="mt-6">
            ${this.assertions.renderAssertions({
              assertions: stepData.assertions,
              stepId: item.id,
            })}
          </div>
        </div>
      </div>
    `;
  }

  render(): string {
    return "";
  }
}
