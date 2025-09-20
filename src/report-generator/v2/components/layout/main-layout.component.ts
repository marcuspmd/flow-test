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
import { FiltersPanelComponent } from "../dashboard/filters-panel.component";

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
        /* Light theme (default) */
        :root {
          --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          --font-size-base: 16px;

          /* Light theme colors */
          --color-text: #1a202c;
          --color-text-secondary: #718096;
          --color-background: #f7fafc;
          --color-surface: #ffffff;
          --color-surface-elevated: #ffffff;
          --color-border: #e2e8f0;
          --color-border-light: #f1f5f9;

          /* Primary colors */
          --color-primary: #3182ce;
          --color-primary-hover: #2c5aa0;
          --color-secondary: #718096;

          /* Status colors */
          --color-success: #38a169;
          --color-warning: #d69e2e;
          --color-error: #e53e3e;
          --color-info: #3182ce;

          /* Component specific */
          --sidebar-bg: #f8fafc;
          --header-bg: #ffffff;
          --card-bg: #ffffff;
          --card-border: #e2e8f0;
          --input-bg: #ffffff;
          --input-border: #d1d5db;

          /* Shadows */
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        /* Dark theme */
        [data-theme="dark"] {
          --color-text: #f7fafc;
          --color-text-secondary: #a0aec0;
          --color-background: #1a202c;
          --color-surface: #2d3748;
          --color-surface-elevated: #4a5568;
          --color-border: #4a5568;
          --color-border-light: #2d3748;

          /* Primary colors for dark */
          --color-primary: #63b3ed;
          --color-primary-hover: #4299e1;
          --color-secondary: #a0aec0;

          /* Status colors for dark */
          --color-success: #68d391;
          --color-warning: #f6e05e;
          --color-error: #fc8181;
          --color-info: #63b3ed;

          /* Component specific dark */
          --sidebar-bg: #2d3748;
          --header-bg: #2d3748;
          --card-bg: #2d3748;
          --card-border: #4a5568;
          --input-bg: #4a5568;
          --input-border: #718096;

          /* Dark shadows */
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.2);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3);
        }

        /* Base styles */
        * {
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }

        body {
          font-family: var(--font-family);
          font-size: var(--font-size-base);
          color: var(--color-text);
          background-color: var(--color-background);
          margin: 0;
          padding: 0;
        }

        /* Custom component styles using CSS variables */
        .metric-card {
          background-color: var(--card-bg);
          border-color: var(--card-border);
          box-shadow: var(--shadow-sm);
        }

        .metric-card:hover {
          box-shadow: var(--shadow-md);
        }

        .filters-panel {
          background-color: var(--card-bg);
          border-color: var(--card-border);
        }

        .nav-item:hover {
          background-color: var(--color-surface-elevated);
        }

        /* Input styles */
        input, select, textarea {
          background-color: var(--input-bg);
          border-color: var(--input-border);
          color: var(--color-text);
        }

        input:focus, select:focus, textarea:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgb(99 179 237 / 0.1);
        }

        /* Button styles */
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }

        .btn-primary:hover {
          background-color: var(--color-primary-hover);
        }

        /* Override Tailwind dark mode for specific elements */
        .dark\\:bg-gray-800 {
          background-color: var(--color-surface) !important;
        }

        .dark\\:bg-gray-700 {
          background-color: var(--color-surface-elevated) !important;
        }

        .dark\\:text-gray-100 {
          color: var(--color-text) !important;
        }

        .dark\\:text-gray-300 {
          color: var(--color-text-secondary) !important;
        }

        .dark\\:border-gray-700 {
          border-color: var(--color-border) !important;
        }

        .dark\\:border-gray-600 {
          border-color: var(--color-border-light) !important;
        }

        /* Animation for theme toggle */
        @media (prefers-reduced-motion: no-preference) {
          * {
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
          }
        }
      </style>
    `;
  }

  private renderScripts(): string {
    // Scripts globais podem ser adicionados aqui
    return "";
  }

  private renderDefaultFilters(): string {
    const filtersPanel = new FiltersPanelComponent(this.theme);
    return filtersPanel.renderDefaultFilters();
  }
}
