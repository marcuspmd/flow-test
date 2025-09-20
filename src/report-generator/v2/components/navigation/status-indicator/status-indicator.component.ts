import { BaseComponentV2 } from "../../common/base-component-v2";

type StatusConfig = { icon: string; className: string };

export class StatusIndicatorComponent extends BaseComponentV2 {
  renderStatus(status: string | undefined): string {
    const statusMap: { [key: string]: StatusConfig } = {
      success: { icon: "✓", className: "text-green-500" },
      failed: { icon: "✗", className: "text-red-500" },
      failure: { icon: "✗", className: "text-red-500" },
      error: { icon: "!", className: "text-yellow-500" },
      skipped: { icon: "·", className: "text-gray-500" },
    };

    const statusKey = (status || "").toLowerCase();
    const config = statusMap[statusKey];

    if (!config) {
      return '<span class="w-4"></span>';
    }

    return this.html`
      <span class="${config.className} w-4">${config.icon}</span>
    `;
  }

  render(): string {
    return "";
  }
}
