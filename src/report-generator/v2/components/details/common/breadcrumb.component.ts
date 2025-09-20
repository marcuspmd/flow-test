import { BaseComponentV2 } from "../../common/base-component-v2";

export class BreadcrumbComponent extends BaseComponentV2 {
  renderBreadcrumb(items: Array<{ name: string; url?: string }>): string {
    const breadcrumbItems = items.map((item, index) => {
      const isLast = index === items.length - 1;
      if (isLast) {
        return `<span class="text-gray-500">${this.escapeHtml(
          item.name
        )}</span>`;
      }
      return `<a href="${
        item.url || "#"
      }" class="text-blue-600 hover:underline">${this.escapeHtml(
        item.name
      )}</a>`;
    });

    return `
      <nav class="text-sm mb-4">
        <div class="flex items-center space-x-2">
          ${breadcrumbItems.join('<span class="text-gray-400">/</span>')}
        </div>
      </nav>
    `;
  }

  render(): string {
    return "";
  }
}
