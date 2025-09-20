import { BaseComponentV2 } from "../../common/base-component-v2";

export class ToggleButtonComponent extends BaseComponentV2 {
  renderToggleButton(itemId: string, isExpanded: boolean): string {
    return this.html`
      <button type="button" class="p-1 rounded-md hover:bg-gray-200" onclick="toggleNavItem('${itemId}'); return false;">
        <svg class="w-4 h-4 transform ${
          isExpanded ? "rotate-90" : ""
        }" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    `;
  }

  render(): string {
    return "";
  }
}
