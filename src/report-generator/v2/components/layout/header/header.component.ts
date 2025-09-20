import { BaseComponentV2 } from "../../common/base-component-v2";
import { LayoutProps } from "../../../types";

export class HeaderComponent extends BaseComponentV2 {
  renderHeader(props: LayoutProps): string {
    return this.html`
      <header class="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold">Flow Test Report</h1>
        <div><!-- Other header content --></div>
      </header>
    `;
  }

  render(): string {
    return "";
  }
}
