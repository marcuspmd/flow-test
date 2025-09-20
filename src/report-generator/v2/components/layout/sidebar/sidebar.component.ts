import { BaseComponentV2 } from "../../common/base-component-v2";
import { LayoutProps } from "../../../types";

export class SidebarComponent extends BaseComponentV2 {
  renderSidebar(
    props: LayoutProps,
    filtersHtml: string,
    navigationHtml: string
  ): string {
    const { layout } = props.appState;
    if (!layout.showSidebar) {
      return "";
    }

    return this.html`
      <aside class="w-80 bg-gray-50 p-4 border-r border-gray-200">
        ${filtersHtml}
        ${navigationHtml}
      </aside>
    `;
  }

  render(): string {
    return "";
  }
}
