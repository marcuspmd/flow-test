import { BaseComponentV2 } from "../../common/base-component-v2";
import { NavigationItem, NavigationProps, ThemeConfig } from "../../../types";
import { StatusIndicatorComponent } from "../status-indicator/status-indicator.component";
import { CounterComponent } from "../counter/counter.component";
import { ToggleButtonComponent } from "../toggle-button/toggle-button.component";

export class NavItemComponent extends BaseComponentV2 {
  private statusIndicator: StatusIndicatorComponent;
  private counter: CounterComponent;
  private toggleButton: ToggleButtonComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.statusIndicator = new StatusIndicatorComponent(theme);
    this.counter = new CounterComponent(theme);
    this.toggleButton = new ToggleButtonComponent(theme);
  }

  renderNavItem(
    item: NavigationItem,
    props: NavigationProps,
    level: number
  ): string {
    const { selectedItem, config } = props;
    const isSelected = selectedItem?.id === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = item.expanded || config.autoExpand;

    const searchTokens = [
      item.name,
      item.priority || "",
      (item.tags || []).join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    const childrenHtml = hasChildren
      ? `<ul class="pl-4 mt-2 ${isExpanded ? "" : "hidden"}">
          ${item.children
            ?.map((child) => this.renderNavItem(child, props, level + 1))
            .join("")}
        </ul>`
      : "";

    return this.html`
      <li data-item-id="${item.id}" data-searchable="${this.escapeHtml(
      searchTokens
    )}">
        <div class="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 ${
          isSelected ? "bg-gray-200" : ""
        }">
          <a href="#" class="flex-1 flex items-center space-x-2" onclick="selectNavItem('${
            item.id
          }'); return false;">
            ${this.statusIndicator.renderStatus(item.status)}
            <span class="truncate">${this.escapeHtml(item.name)}</span>
          </a>
          <div class="flex items-center space-x-2">
            ${this.counter.renderCounter(item)}
            ${
              hasChildren
                ? this.toggleButton.renderToggleButton(item.id, isExpanded)
                : ""
            }
          </div>
        </div>
        ${childrenHtml}
      </li>
    `;
  }

  render(): string {
    return "";
  }
}
