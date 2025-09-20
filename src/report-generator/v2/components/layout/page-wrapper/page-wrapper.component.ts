import { BaseComponentV2 } from "../../common/base-component-v2";

export class PageWrapperComponent extends BaseComponentV2 {
  renderPageWrapper(children: string, showSidebar: boolean): string {
    // Remove margin-left since flexbox layout already handles spacing
    // Add responsive padding and better mobile support
    return this.html`
      <main id="main" class="p-4 md:p-6 lg:p-8 min-h-full">
        <div id="main-content-area" class="max-w-none">
          ${children}
        </div>
      </main>
    `;
  }

  render(): string {
    return "";
  }
}
