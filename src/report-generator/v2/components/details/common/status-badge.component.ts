import { BaseComponentV2 } from "../../common/base-component-v2";

export class StatusBadgeComponent extends BaseComponentV2 {
  renderBadge(status: string | undefined, extraClasses: string = ""): string {
    const statusMap: { [key: string]: string } = {
      success: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      failure: "bg-red-100 text-red-800",
      error: "bg-yellow-100 text-yellow-800",
      skipped: "bg-gray-100 text-gray-800",
    };
    const statusKey = (status || "").toLowerCase();
    const classes = statusMap[statusKey] || "bg-gray-100 text-gray-800";
    const text = status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Unknown";

    return `<span class="px-3 py-1 rounded-full text-sm font-semibold ${classes} ${extraClasses}">${text}</span>`;
  }

  render(): string {
    return "";
  }
}
