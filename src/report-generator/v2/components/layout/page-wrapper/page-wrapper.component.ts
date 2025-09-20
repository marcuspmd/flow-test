import { BaseComponentV2 } from "../../common/base-component-v2";

export class PageWrapperComponent extends BaseComponentV2 {
  renderPageWrapper(children: string, showSidebar: boolean): string {
    const mainClasses = showSidebar ? "ml-80" : "";
    return this.html`
      <main id="main" class="${mainClasses} p-4">
        ${children}
      </main>
    `;
  }

  render(): string {
    return "";
  }
}
