import { BaseComponentV2 } from "../../common/base-component-v2";
import { NavigationItem } from "../../../types";

export class CounterComponent extends BaseComponentV2 {
  renderCounter(item: NavigationItem): string {
    if (item.type !== "suite" && item.type !== "group") {
      return "";
    }

    const childCount = item.children?.length || 0;
    if (childCount === 0) return "";

    const successCount = this.countByStatus(item.children, "success");
    const failureCount = this.countByStatus(item.children, [
      "failed",
      "error",
      "failure",
    ]);

    return this.html`
      <div class="flex items-center space-x-1 text-xs">
        ${
          successCount > 0
            ? `<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full">${successCount}</span>`
            : ""
        }
        ${
          failureCount > 0
            ? `<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full">${failureCount}</span>`
            : ""
        }
      </div>
    `;
  }

  private countByStatus(
    items: NavigationItem[] = [],
    status: string | string[]
  ): number {
    const statusArray = Array.isArray(status) ? status : [status];
    return items.reduce((count, item) => {
      const itemCount = statusArray.includes(item.status || "") ? 1 : 0;
      return count + itemCount + this.countByStatus(item.children, status);
    }, 0);
  }

  render(): string {
    return "";
  }
}
