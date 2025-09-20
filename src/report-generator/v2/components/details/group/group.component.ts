import { BaseComponentV2 } from "../../common/base-component-v2";
import { NavigationItem, ThemeConfig } from "../../../types";
import { BreadcrumbComponent } from "../common/breadcrumb.component";

export class GroupComponent extends BaseComponentV2 {
  private breadcrumb: BreadcrumbComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.breadcrumb = new BreadcrumbComponent(theme);
  }

  renderGroup(item: NavigationItem): string {
    return `
      <div class="p-6">
        ${this.breadcrumb.renderBreadcrumb([
          { name: "Groups" },
          { name: item.name },
        ])}
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h1 class="text-3xl font-bold">${this.escapeHtml(item.name)}</h1>
          <p class="text-gray-500 mt-2">This is a group of tests.</p>
          <div class="mt-4">
            <h2 class="text-xl font-semibold">Items in this group</h2>
            <ul class="list-disc pl-5 mt-2">
              ${(item.children || [])
                .map(
                  (child) =>
                    `<li><a href="#" onclick="selectNavItem('${
                      child.id
                    }'); return false;" class="text-blue-600 hover:underline">${this.escapeHtml(
                      child.name
                    )}</a></li>`
                )
                .join("")}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  render(): string {
    return "";
  }
}
