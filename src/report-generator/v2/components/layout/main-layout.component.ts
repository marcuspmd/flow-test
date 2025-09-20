/**
 * @packageDocumentation
 * Layout principal da aplicação V2 - inspirado em design systems modernos
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { LayoutProps, ThemeConfig } from "../../types";
import { HeaderComponent } from "./header/header.component";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { FooterComponent } from "./footer/footer.component";
import { PageWrapperComponent } from "./page-wrapper/page-wrapper.component";

/**
 * Layout principal com sidebar e área de conteúdo
 */
export class MainLayoutComponent extends BaseComponentV2 {
  private headerComponent: HeaderComponent;
  private sidebarComponent: SidebarComponent;
  private footerComponent: FooterComponent;
  private pageWrapperComponent: PageWrapperComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.headerComponent = new HeaderComponent(theme);
    this.sidebarComponent = new SidebarComponent(theme);
    this.footerComponent = new FooterComponent(theme);
    this.pageWrapperComponent = new PageWrapperComponent(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderLayout(props: LayoutProps): string {
    const { appState, children = "" } = props;
    const { layout } = appState;

    const filtersHtml = props.filtersHtml ?? this.renderDefaultFilters();
    const navigationHtml = props.navigationHtml ?? "";
    const navigationScript = props.navigationScript ?? "";

    const sidebarHtml = this.sidebarComponent.renderSidebar(
      props,
      filtersHtml,
      navigationHtml
    );

    return this.html`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flow Test Report V2</title>
        ${this.renderStyles()}
        ${this.renderScripts()}
      </head>
      <body class="flex flex-col min-h-screen bg-gray-100">
        <div class="flex-shrink-0">
            ${this.headerComponent.renderHeader(props)}
        </div>

        <div class="flex flex-1 overflow-hidden">
          ${sidebarHtml}
          <div class="flex-1 overflow-y-auto">
            ${this.pageWrapperComponent.renderPageWrapper(
              children,
              layout.showSidebar
            )}
          </div>
        </div>

        <div class="flex-shrink-0">
            ${this.footerComponent.render()}
        </div>

        <!-- Modal container -->
        <div id="modal-container" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40"></div>

        <!-- Toast container -->
        <div id="toast-container" class="fixed top-4 right-4 space-y-2 z-50"></div>

        ${navigationScript}
      </body>
      </html>
    `;
  }

  private renderStyles(): string {
    return this.html`
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        :root {
          --font-family: "Inter", sans-serif;
          --font-size-base: 16px;
          --color-text: #1a202c;
          --color-background: #f7fafc;
          --color-primary: #3182ce;
          --color-text-secondary: #718096;
          --color-surface: #ffffff;
        }
        body {
          font-family: var(--font-family);
          font-size: var(--font-size-base);
          color: var(--color-text);
          background-color: var(--color-background);
        }
      </style>
    `;
  }

  private renderScripts(): string {
    // Scripts globais podem ser adicionados aqui
    return "";
  }

  private renderDefaultFilters(): string {
    return '<div class="p-4 bg-gray-200 rounded-lg">Default Filters Placeholder</div>';
  }
}
