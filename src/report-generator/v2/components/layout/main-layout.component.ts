/**
 * @packageDocumentation
 * Layout principal da aplicação V2 - inspirado em design systems modernos
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { LayoutProps, ThemeConfig } from "../../types";

/**
 * Layout principal com sidebar e área de conteúdo
 */
export class MainLayoutComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
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

    const sidebarHtml = layout.showSidebar
      ? this.renderSidebar(props, filtersHtml, navigationHtml)
      : "";

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
      <body>
        <div id="header">
          ${this.renderHeader(props)}
        </div>

        <div id="container">
          ${sidebarHtml}
          <div id="main" class="${layout.showSidebar ? "" : "sidebar-collapsed"}">
            ${children}
          </div>
        </div>

        <div id="footer">
          ${this.renderFooter()}
        </div>

        <!-- Modal container -->
        <div id="modal-container" class="hidden"></div>

        <!-- Toast container -->
        <div id="toast-container" class="fixed top-4 right-4 space-y-2 z-50"></div>

        ${navigationScript}
      </body>
      </html>
    `;
  }

  private renderStyles(): string {
    return this.html`
      <style>
        /* Reset e base styles */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: var(--font-family);
          font-size: var(--font-size-base);
          line-height: 1.5;
          color: var(--color-text);
          background-color: var(--color-background);
        }

        :root {
          --sidebar-width: 340px;
        }

        /* Layout principal */
        #header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background-color: var(--color-surface);
          border-bottom: 1px solid #ddd;
          z-index: 100;
        }

        #container {
          margin-top: 60px;
          min-height: calc(100vh - 60px);
          display: flex;
          align-items: flex-start;
          background-color: var(--color-background);
        }

        #sidebar {
          width: var(--sidebar-width);
          height: calc(100vh - 60px);
          background-color: var(--color-surface);
          border-right: 1px solid rgba(15, 23, 42, 0.08);
          padding: 32px 24px;
          flex-shrink: 0;
          overflow-y: auto;
          position: fixed;
          top: 60px;
          left: 0;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          z-index: 90;
        }

        #sidebar.is-collapsed {
          transform: translateX(calc(-1 * var(--sidebar-width)));
          box-shadow: none;
        }

        #main {
          flex: 1;
          padding: 40px 48px;
          background-color: var(--color-background);
          margin-left: var(--sidebar-width);
          transition: margin-left 0.3s ease;
        }

        #main.sidebar-collapsed {
          margin-left: 0;
        }

        .report-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 18px;
          margin-bottom: 32px;
        }

        .summary-card {
          background-color: var(--color-surface);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        }

        .summary-icon {
          font-size: 28px;
          line-height: 1;
        }

        .summary-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--color-text);
        }

        .summary-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
        }

        #footer {
          clear: both;
          background-color: var(--color-surface);
          border-top: 1px solid #ddd;
          padding: 10px 20px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        /* Sidebar styles */
        .sidebar-section {
          margin-bottom: 28px;
        }

        .sidebar-section h3 {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .sidebar-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .sidebar-section-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sidebar-actions {
          display: inline-flex;
          gap: 8px;
        }

        .sidebar-action {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(15, 23, 42, 0.04);
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .sidebar-action:hover {
          background-color: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.4);
          color: var(--color-primary);
        }

        .sidebar-navigation {
          max-height: none;
          overflow-y: visible;
          padding-right: 6px;
        }

        .navigation-shortcuts {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .navigation-shortcuts .shortcut-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 6px;
          border-radius: 6px;
          border: 1px solid rgba(15, 23, 42, 0.18);
          background-color: rgba(15, 23, 42, 0.06);
          font-family: "SFMono-Regular", Menlo, Monaco, "Courier New", monospace;
          font-size: 11px;
          color: var(--color-text);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        @media (min-width: 1200px) {
          .filters-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .filter-control {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
        }

        .filter-input,
        .filter-select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background-color: rgba(255, 255, 255, 0.92);
          color: var(--color-text);
          font-size: 13px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.7);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
        }

        .nav-empty-state {
          list-style: none;
        }

        .nav-tree {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-item-header {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          border-radius: 12px;
          transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }

        .nav-item-tools {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 6px 8px 0;
        }

        .nav-link {
          flex: 1;
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          text-decoration: none;
          color: var(--color-text);
          font-size: var(--font-size-sm);
          border-radius: inherit;
          transition: inherit;
        }

        .nav-link:hover {
          background-color: rgba(59, 130, 246, 0.1);
          color: var(--color-primary);
        }

        .nav-link.active {
          background-color: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }

        .nav-link.active .nav-status {
          color: inherit;
        }

        .nav-status {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .nav-label {
          overflow: hidden;
          white-space: normal;
          word-break: break-word;
          line-height: 1.4;
        }

        .nav-counter {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .nav-counter .success-count {
          background-color: rgba(16, 185, 129, 0.18);
          color: #047857;
          border-radius: 6px;
          padding: 2px 6px;
        }

        .nav-counter .failure-count {
          background-color: rgba(239, 68, 68, 0.2);
          color: #b91c1c;
          border-radius: 6px;
          padding: 2px 6px;
        }

        .nav-status.status-success {
          color: #22c55e;
        }

        .nav-status.status-failed {
          color: #ef4444;
        }

        .nav-status.status-error {
          color: #f97316;
        }

        .nav-status.status-skipped {
          color: #94a3b8;
        }

        .toggle-btn {
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .toggle-btn:hover {
          background-color: rgba(15, 23, 42, 0.08);
          color: var(--color-text);
        }

        .nav-children {
          margin-left: 0;
          margin-top: 6px;
          border-left: 1px solid rgba(15, 23, 42, 0.08);
          padding-left: 16px;
          display: none;
          flex-direction: column;
          gap: 6px;
        }

        .nav-children.show {
          display: flex;
        }

        .detail-container {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .detail-wrapper {
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
        }

        .detail-card {
          background-color: var(--color-surface);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-card-header {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .detail-card-icon {
          font-size: 44px;
          line-height: 1;
          color: var(--color-primary);
        }

        .detail-card-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }

        .detail-card-subtitle {
          font-size: 16px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }

        .detail-section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text);
        }

        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .suite-summary,
        .step-summary,
        .group-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 18px;
        }

        .stat-card {
          background-color: rgba(15, 23, 42, 0.03);
          border-radius: 14px;
          padding: 18px;
          border: 1px solid rgba(15, 23, 42, 0.06);
        }

        .suite-metadata {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 18px;
          font-size: 14px;
        }

        .step-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .summary-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background-color: rgba(15, 23, 42, 0.02);
        }

        .summary-icon {
          font-size: 24px;
          line-height: 1;
        }

        .summary-value {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text);
        }

        .summary-label {
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .detail-execution-grid {
          display: grid;
          gap: 24px;
        }

        .tabs-container {
          display: flex;
          flex-direction: column;
        }

        .tabs-container [role="tablist"] {
          display: inline-flex;
          align-self: flex-start;
          background-color: rgba(15, 23, 42, 0.04);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 16px;
        }

        .tab-button {
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .tab-button.active {
          background-color: #ffffff;
          color: var(--color-primary);
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.12);
        }

        .tab-button:hover {
          color: var(--color-primary);
        }

        .tab-contents {
          background-color: rgba(15, 23, 42, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .url-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .url-details .url-label {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          margin-bottom: 2px;
        }

        .url-details .url {
          max-width: 520px;
        }

        pre.code-block {
          background-color: #1f1f24;
          color: #d6d8df;
          border-radius: 12px;
          padding: 16px;
          font-family: "Fira Code", "Source Code Pro", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
          line-height: 1.55;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.18);
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
        }

        pre.code-block code {
          color: inherit;
          font-family: inherit;
          display: block;
        }

        pre.code-block.code-block--command {
          background-color: #0f172a;
          color: #c7f9ff;
          border-color: rgba(148, 163, 184, 0.3);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
        }

        code.inline-code {
          background-color: rgba(15, 23, 42, 0.08);
          color: var(--color-text);
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 12px;
          font-family: "SFMono-Regular", Menlo, Monaco, "Courier New", monospace;
          word-break: break-word;
        }

        .suite-steps .step-card {
          border: 1px solid rgba(15, 23, 42, 0.12);
          background-color: rgba(15, 23, 42, 0.02);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .suite-steps .step-card:hover {
          border-color: rgba(59, 130, 246, 0.25);
          box-shadow: 0 12px 22px rgba(59, 130, 246, 0.12);
        }

        .step-additional-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .captured-variables,
        .error-context {
          border-radius: 14px;
          border-width: 1px;
        }

        .captured-variables {
          background-color: rgba(34, 197, 94, 0.08);
          border-color: rgba(34, 197, 94, 0.18);
        }

        .error-context {
          background-color: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.22);
        }

        .detail-section {
          display: none;
        }

        .detail-section.is-active {
          display: block;
          animation: fade-in 0.25s ease;
        }

        .detail-section.is-hidden {
          display: none;
        }

        .missing-data-card {
          max-width: 420px;
          margin: 0 auto;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 960px) {
          #main {
            padding: 32px 22px;
          }
        }

        /* Main content styles */
        .content-section {
          margin-bottom: 40px;
        }

        .content-section h1,
        .content-section h2,
        .content-section h3 {
          color: var(--color-text);
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }

        .content-section h1 {
          font-size: 28px;
          margin-bottom: 30px;
        }

        .content-section h2 {
          font-size: 24px;
        }

        .content-section h3 {
          font-size: 20px;
        }

        /* Form elements */
        .filter-input,
        .filter-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          margin-bottom: 10px;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        /* Status indicators */
        .status-success {
          color: var(--color-success);
          background-color: rgba(40, 167, 69, 0.1);
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
        }

        .status-error {
          color: var(--color-error);
          background-color: rgba(220, 53, 69, 0.1);
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
        }

        .status-warning {
          color: var(--color-warning);
          background-color: rgba(255, 193, 7, 0.1);
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          :root {
            --sidebar-width: 320px;
          }

          #sidebar {
            box-shadow: 12px 0 32px rgba(15, 23, 42, 0.1);
          }

          #main {
            padding: 32px 24px;
          }
        }

        @media (max-width: 768px) {
          :root {
            --sidebar-width: 280px;
          }

          #header {
            position: fixed;
          }

          #container {
            flex-direction: column;
          }

          #sidebar {
            transform: translateX(0);
            box-shadow: 12px 0 32px rgba(15, 23, 42, 0.18);
          }

          #main {
            margin-left: 0;
            padding: 28px 20px;
          }

          #main.sidebar-expanded {
            margin-left: var(--sidebar-width);
          }
        }

        /* Header styles */
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          height: auto;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .header-left h1 {
          font-size: 26px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }

        .breadcrumbs {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }

        .sidebar-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background-color: rgba(15, 23, 42, 0.04);
          color: var(--color-text);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .sidebar-toggle:hover {
          background-color: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.4);
          color: var(--color-primary);
        }

        .sidebar-toggle.is-active {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }

        .sidebar-toggle .toggle-icon {
          font-size: 18px;
          line-height: 1;
        }

        .sidebar-toggle .toggle-label {
          font-size: 13px;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .sidebar-toggle {
            padding: 8px 10px;
          }

          .sidebar-toggle .toggle-label {
            display: none;
          }

          .header-content {
            align-items: center;
          }
        }

        .breadcrumbs a {
          color: var(--color-primary);
          text-decoration: none;
        }

        .breadcrumbs a:hover {
          text-decoration: underline;
        }

        .header-right {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .header-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .timestamp {
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .success-chip {
          background: rgba(16, 185, 129, 0.14);
          color: #047857;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }

        /* Footer styles */
        .footer-content {
          text-align: center;
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        /* Iterations Component Styles */
        .iterations-container {
          margin-bottom: 24px;
        }

        .iteration-stats {
          margin-bottom: 20px;
        }

        /* Carousel Styles */
        .carousel-container {
          margin-bottom: 16px;
        }

        .carousel-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding: 12px 16px;
          background-color: rgba(15, 23, 42, 0.04);
          border-radius: 12px;
        }

        .carousel-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          background-color: var(--color-primary);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .carousel-btn:hover:not(:disabled) {
          background-color: var(--color-primary);
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .carousel-btn:disabled {
          background-color: #cbd5e1;
          color: #64748b;
          cursor: not-allowed;
          transform: none;
        }

        .carousel-indicators {
          display: flex;
          gap: 8px;
        }

        .indicator {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          background-color: rgba(15, 23, 42, 0.1);
          color: var(--color-text-secondary);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .indicator.active {
          background-color: var(--color-primary);
          color: white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        .indicator:hover:not(.active) {
          background-color: rgba(15, 23, 42, 0.15);
        }

        .carousel-content {
          position: relative;
          min-height: 300px;
        }

        .carousel-item {
          display: none;
          animation: fadeIn 0.3s ease-in-out;
        }

        .carousel-item.active {
          display: block;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Iteration Cards Grid */
        .iteration-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .detail-card {
          background-color: rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .detail-card:hover {
          border-color: rgba(59, 130, 246, 0.2);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: rgba(15, 23, 42, 0.04);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .card-icon {
          font-size: 16px;
          margin-right: 8px;
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
          display: flex;
          align-items: center;
        }

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: var(--color-text-secondary);
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .copy-btn:hover {
          background-color: rgba(15, 23, 42, 0.1);
          color: var(--color-primary);
        }

        .card-content {
          padding: 16px;
        }

        /* Request Card Styles */
        .request-line {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .method-badge {
          background-color: var(--color-primary);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .url-path {
          font-family: monospace;
          font-size: 12px;
          color: var(--color-text-secondary);
          word-break: break-all;
        }

        .section-subtitle {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 8px;
          display: block;
        }

        .headers-list {
          font-size: 11px;
          margin-bottom: 12px;
        }

        .header-item {
          display: flex;
          margin-bottom: 4px;
        }

        .header-item.more {
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .header-key {
          font-weight: 600;
          margin-right: 8px;
          min-width: 120px;
          color: var(--color-primary);
        }

        .header-value {
          color: var(--color-text-secondary);
          word-break: break-word;
        }

        .body-content {
          background-color: #1f1f24;
          color: #d6d8df;
          border-radius: 6px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.4;
          max-height: 200px;
          overflow-y: auto;
        }

        /* Response Card Styles */
        .response-status {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .status-code {
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .response-time,
        .response-size {
          font-size: 11px;
          color: var(--color-text-secondary);
          background-color: rgba(15, 23, 42, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
        }

        /* cURL Card Styles */
        .curl-command {
          background-color: #0f172a;
          color: #c7f9ff;
          border-radius: 6px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.4;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Assertions Card Styles */
        .assertions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .assertion-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
        }

        .assertion-item.passed {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .assertion-item.failed {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .assertion-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .assertion-details {
          flex: 1;
        }

        .assertion-field {
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 2px;
        }

        .assertion-message {
          color: var(--color-text-secondary);
          font-size: 11px;
        }

        /* Variables Card Styles */
        .variables-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .variable-item {
          display: flex;
          gap: 8px;
          font-size: 12px;
          padding: 6px;
          background-color: rgba(15, 23, 42, 0.03);
          border-radius: 4px;
        }

        .variable-key {
          font-weight: 600;
          color: var(--color-primary);
          font-family: monospace;
          flex-shrink: 0;
        }

        .variable-value {
          color: var(--color-text-secondary);
          font-family: monospace;
          word-break: break-word;
        }

        /* Meta Card Styles */
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(15, 23, 42, 0.05);
        }

        .meta-item:last-child {
          border-bottom: none;
        }

        .meta-item.error-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .meta-label {
          font-weight: 600;
          color: var(--color-text);
        }

        .meta-value {
          color: var(--color-text-secondary);
        }

        .meta-value.error-message {
          color: var(--color-error);
          font-size: 11px;
          font-family: monospace;
          background-color: rgba(239, 68, 68, 0.1);
          padding: 4px 6px;
          border-radius: 4px;
          word-break: break-word;
        }

        .meta-value.status-success {
          color: var(--color-success);
          font-weight: 600;
        }

        .meta-value.status-failed,
        .meta-value.status-failure,
        .meta-value.status-error {
          color: var(--color-error);
          font-weight: 600;
        }

        .iteration-section {
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text);
        }

        .section-content {
          font-size: 13px;
        }

        .method-badge {
          background-color: var(--color-primary);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .url-preview {
          color: var(--color-text-secondary);
          font-family: monospace;
          font-size: 11px;
        }

        .variable-item {
          margin-bottom: 4px;
        }

        .variable-name {
          color: var(--color-primary);
          font-weight: 600;
        }

        .variable-value {
          color: var(--color-text-secondary);
          margin-left: 4px;
        }

        /* Scenarios Component Styles */
        .scenarios-container {
          margin-bottom: 24px;
        }

        .scenarios-summary {
          margin-bottom: 20px;
        }

        /* Scenario Cards Grid */
        .scenarios-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .scenario-card {
          background-color: rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .scenario-card:hover {
          border-color: rgba(59, 130, 246, 0.2);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        .scenario-card.executed {
          border-color: rgba(34, 197, 94, 0.3);
          background-color: rgba(34, 197, 94, 0.02);
        }

        .scenario-card.not-executed {
          border-color: rgba(148, 163, 184, 0.3);
          background-color: rgba(148, 163, 184, 0.02);
        }

        .scenario-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background-color: rgba(15, 23, 42, 0.04);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .scenario-number {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scenario-index {
          font-weight: 600;
          font-size: 14px;
          color: var(--color-text);
        }

        .scenario-status-icon {
          font-size: 16px;
        }

        .scenario-results {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .match-result {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .match-result.matched {
          background-color: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .match-result.not-matched {
          background-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .branch-result {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .scenario-card-body {
          padding: 16px;
        }

        .condition-section {
          margin-bottom: 16px;
        }

        .condition-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 8px;
          display: block;
        }

        .condition-code {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background-color: rgba(15, 23, 42, 0.05);
          padding: 8px;
          border-radius: 6px;
        }

        .condition-code .inline-code {
          flex: 1;
          background: none;
          padding: 0;
          font-size: 12px;
          line-height: 1.4;
          word-break: break-word;
        }

        .copy-condition-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: var(--color-text-secondary);
          padding: 2px;
          border-radius: 3px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .copy-condition-btn:hover {
          background-color: rgba(15, 23, 42, 0.1);
          color: var(--color-primary);
        }

        .scenario-detail-content {
          margin-bottom: 16px;
        }

        .execution-details,
        .skip-details,
        .condition-breakdown {
          margin-bottom: 12px;
        }

        .detail-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 6px;
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .execution-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .execution-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          padding: 4px 0;
        }

        .execution-label {
          color: var(--color-text-secondary);
        }

        .execution-value {
          color: var(--color-text);
          font-weight: 500;
        }

        .execution-value.branch-then {
          color: #22c55e;
        }

        .execution-value.branch-else {
          color: #ef4444;
        }

        .execution-value.branch-none {
          color: #94a3b8;
        }

        .skip-reason {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-style: italic;
          padding: 8px;
          background-color: rgba(148, 163, 184, 0.1);
          border-radius: 6px;
        }

        .breakdown-content {
          background-color: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 6px;
          padding: 8px;
        }

        .condition-explanation {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .explanation-text {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .explanation-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-primary);
          font-family: monospace;
        }

        .scenario-actions {
          border-top: 1px solid rgba(15, 23, 42, 0.08);
          padding-top: 12px;
        }

        /* Captured Variables Section in Scenarios */
        .captured-variables-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(15, 23, 42, 0.06);
        }

        .captured-variables-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }

        .captured-variable-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 6px 8px;
          background-color: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 6px;
          font-size: 11px;
        }

        .captured-variable-item .variable-name {
          font-weight: 600;
          color: var(--color-primary);
          font-family: monospace;
          min-width: 120px;
          flex-shrink: 0;
        }

        .captured-variable-item .variable-value {
          flex: 1;
          word-break: break-word;
        }

        .captured-variables-info {
          margin-top: 8px;
        }

        .no-variables-info {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-style: italic;
          padding: 8px;
          background-color: rgba(148, 163, 184, 0.1);
          border-radius: 6px;
        }

        /* Variable Value Styles */
        .null-value {
          color: #94a3b8;
          font-style: italic;
        }

        .string-value {
          color: #22c55e;
        }

        .primitive-value {
          color: #3b82f6;
          font-weight: 500;
        }

        .object-value {
          background-color: #1f1f24;
          color: #d6d8df;
          border-radius: 4px;
          padding: 6px;
          font-size: 10px;
          line-height: 1.3;
          max-height: 100px;
          overflow-y: auto;
          margin: 0;
        }

        .branch-indicator {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .branch-indicator.branch-then {
          background-color: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .branch-indicator.branch-else {
          background-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .branch-indicator.branch-none {
          background-color: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }

        .action-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          margin-right: 4px;
        }

        .action-badge.assertions {
          background-color: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .action-badge.captures {
          background-color: rgba(168, 85, 247, 0.15);
          color: #a855f7;
        }

        .scenario-detail-section {
          margin-bottom: 16px;
        }

        .detail-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text);
        }

        .detail-content {
          font-size: 13px;
        }

        .execution-summary.success {
          color: #22c55e;
          font-weight: 600;
        }

        .execution-summary.info {
          color: #6b7280;
        }

        .executed-scenario-detail {
          margin-bottom: 12px;
          padding: 8px;
          background-color: rgba(15, 23, 42, 0.02);
          border-radius: 6px;
        }

        .scenario-condition-label {
          margin-bottom: 4px;
        }

        .scenario-result-info {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .scenarios-summary-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .scenarios-badge-success {
          background-color: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .scenarios-badge-info {
          background-color: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .scenarios-inline-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Enhanced step summary styles */
        .step-enhanced-info {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .enhanced-info-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .iterations-badge {
          background-color: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        /* Additional color utilities */
        .text-info {
          color: #3b82f6;
        }

        .text-purple {
          color: #a855f7;
        }
      </style>
    `;
  }

  private renderScripts(): string {
    return this.html`
      <script>
        (function() {
          function fallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
              document.execCommand('copy');
              showToast('Copiado para o clipboard!', 'success');
            } catch (err) {
              console.error('Fallback copy failed: ', err);
              showToast('Erro ao copiar', 'error');
            }

            document.body.removeChild(textArea);
          }

          function copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text)
                .then(() => showToast('Copiado para o clipboard!', 'success'))
                .catch(() => fallbackCopy(text));
            } else {
              fallbackCopy(text);
            }
          }

          function showToast(message, type = 'info', duration = 3000) {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const colors = {
              success: 'bg-green-500 text-white',
              error: 'bg-red-500 text-white',
              warning: 'bg-yellow-500 text-black',
              info: 'bg-blue-500 text-white'
            };

            const toast = document.createElement('div');
            toast.className = "px-4 py-2 rounded shadow-lg " + (colors[type] || colors.info) + " transform transition-transform duration-300 translate-x-full";
            toast.textContent = message;
            container.appendChild(toast);

            requestAnimationFrame(() => {
              toast.classList.remove('translate-x-full');
            });

            setTimeout(() => {
              toast.classList.add('translate-x-full');
              setTimeout(() => container.removeChild(toast), 280);
            }, duration);
          }

          function showTab(containerId, tabName) {
            const trigger = document.getElementById(containerId);
            if (!trigger) return;

            const container = trigger.classList.contains('tabs-container')
              ? trigger
              : trigger.closest('.tabs-container');

            if (!container) return;

            const tabContents = container.querySelectorAll('.tab-content');
            const tabButtons = container.querySelectorAll('.tab-button');

            tabContents.forEach(content => {
              content.classList.remove('active');
              content.classList.add('hidden');
            });

            tabButtons.forEach(button => {
              button.classList.remove('active');
            });

            const selectedContent = document.getElementById(containerId + '-' + tabName);
            const selectedButton = container.querySelector('[data-tab="' + tabName + '"]');

            if (selectedContent) {
              selectedContent.classList.add('active');
              selectedContent.classList.remove('hidden');
            }

            if (selectedButton) {
              selectedButton.classList.add('active');
            }
          }

          function toggleSection(elementId) {
            const element = document.getElementById(elementId);
            if (!element) return;

            const isExpanded = !element.classList.contains('hidden');
            element.classList.toggle('hidden', isExpanded);

            const toggleButton = document.querySelector('[data-toggle="' + elementId + '"]');
            if (toggleButton) {
              const icon = toggleButton.querySelector('.toggle-icon');
              if (icon) {
                icon.textContent = isExpanded ? '▶' : '▼';
              }
            }
          }

          function getFilterValue(id) {
            const element = document.getElementById(id);
            if (!element) return '';
            return String(element.value || '').toLowerCase();
          }

          function applyFilters() {
            const searchTerm = getFilterValue('search-input');
            const statusFilter = getFilterValue('status-filter');
            const priorityFilter = getFilterValue('priority-filter');

            document.querySelectorAll('[data-filterable]').forEach(item => {
              const text = (item.dataset.searchable || item.textContent || '').toLowerCase();
              const itemStatus = (item.getAttribute('data-status') || '').toLowerCase();
              const itemPriority = (item.getAttribute('data-priority') || '').toLowerCase();

              const matchesSearch = !searchTerm || text.includes(searchTerm);
              const matchesStatus = !statusFilter || itemStatus === statusFilter;
              const matchesPriority = !priorityFilter || itemPriority === priorityFilter;

              const isVisible = matchesSearch && matchesStatus && matchesPriority;
              item.style.display = isVisible ? '' : 'none';
            });
          }

          function registerFilters() {
            const filterElements = [
              document.getElementById('search-input'),
              document.getElementById('status-filter'),
              document.getElementById('priority-filter')
            ];

            filterElements.forEach(element => {
              if (!element) return;
              const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
              element.addEventListener(eventName, applyFilters);
            });
          }

          function applySidebarState(collapsed) {
            const sidebar = document.getElementById('sidebar');
            const main = document.getElementById('main');
            if (!sidebar || !main) return;

            const toggleButtons = document.querySelectorAll('[data-toggle-sidebar]');

            sidebar.classList.toggle('is-collapsed', collapsed);
            sidebar.setAttribute('aria-hidden', String(collapsed));
            main.classList.toggle('sidebar-collapsed', collapsed);
            main.classList.toggle('sidebar-expanded', !collapsed);

            toggleButtons.forEach(button => {
              button.setAttribute('aria-expanded', String(!collapsed));
              button.classList.toggle('is-active', !collapsed);
            });
          }

          function toggleSidebar(force) {
            const currentState = !!(window.reportV2State && window.reportV2State.sidebarCollapsed);
            const collapsed = typeof force === 'boolean' ? force : !currentState;

            if (window.reportV2State) {
              window.reportV2State.sidebarCollapsed = collapsed;
            }

            applySidebarState(collapsed);
          }

          document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;

            const modal = document.querySelector('.modal.open');
            if (modal) {
              modal.classList.remove('open');
            }
          });

          document.addEventListener('DOMContentLoaded', () => {
            document.body.className = 'h-full bg-background text-default font-sans';

            registerFilters();
            applyFilters();

            const autoCollapse = window.innerWidth <= 768;
            const initialState = typeof window.reportV2State?.sidebarCollapsed === 'boolean'
              ? (autoCollapse ? true : window.reportV2State.sidebarCollapsed)
              : autoCollapse;

            if (window.reportV2State) {
              window.reportV2State.sidebarCollapsed = initialState;
            }

            applySidebarState(initialState);

            document.querySelectorAll('[data-toggle-sidebar]').forEach(button => {
              button.addEventListener('click', () => toggleSidebar());
            });

            const mq = window.matchMedia('(max-width: 768px)');
            const handleMqChange = event => {
              if (event.matches) {
                toggleSidebar(true);
              } else {
                toggleSidebar(false);
              }
            };

            if (mq.addEventListener) {
              mq.addEventListener('change', handleMqChange);
            } else if (mq.addListener) {
              mq.addListener(handleMqChange);
            }
          });

          window.copyToClipboard = copyToClipboard;
          window.showTab = showTab;
          window.toggleSection = toggleSection;
          window.applyFilters = applyFilters;
          window.showToast = showToast;
          window.toggleSidebar = toggleSidebar;
        })();
      </script>
    `;
  }

  private renderSidebar(
    props: LayoutProps,
    filtersHtml: string,
    navigationHtml: string
  ): string {
    const navigationContent = navigationHtml?.trim()
      ? navigationHtml
      : this.renderEmptyNavigationState();
    const isSidebarVisible = props.appState.layout?.showSidebar !== false;

    return this.html`
      <aside
        id="sidebar"
        class="${isSidebarVisible ? "" : "is-collapsed"}"
        aria-label="Navegação de suites e steps"
      >
        <div class="sidebar-section sidebar-section--filters">
          <div class="sidebar-section-header">
            <h3>Filtros rápidos</h3>
          </div>
          <div class="sidebar-section-content">
            ${filtersHtml}
          </div>
        </div>

        <div class="sidebar-section sidebar-section--navigation">
          <div class="sidebar-section-header">
            <h3>Suites & Steps</h3>
            <div class="sidebar-actions" role="group" aria-label="Ações da navegação">
              <button type="button" class="sidebar-action" onclick="expandAllNavItems()">
                Expandir
              </button>
              <button type="button" class="sidebar-action" onclick="collapseAllNavItems()">
                Recolher
              </button>
            </div>
          </div>

          <p class="navigation-shortcuts" role="note" aria-label="Atalho de navegação">
            <span>Atalho:</span>
            <span class="shortcut-key" aria-hidden="true">←</span>
            <span class="shortcut-key" aria-hidden="true">→</span>
            <span>para trocar de item</span>
          </p>

          <nav class="sidebar-navigation" aria-label="Suites e steps">
            <ul class="nav-tree" id="navigation-container">
              ${navigationContent}
            </ul>
          </nav>
        </div>
      </aside>
    `;
  }

  private renderDefaultFilters(): string {
    return this.html`
      <div class="filters-grid">
        <label class="filter-control">
          <span class="filter-label">Buscar</span>
          <input
            type="text"
            id="search-input"
            placeholder="Buscar por nome ou descrição"
            class="filter-input"
            aria-label="Buscar suites ou steps"
          />
        </label>

        <label class="filter-control">
          <span class="filter-label">Status</span>
          <select
            id="status-filter"
            class="filter-select"
            aria-label="Filtrar por status"
          >
            <option value="">Todos</option>
            <option value="success">Sucesso</option>
            <option value="failed">Falhou</option>
            <option value="error">Erro</option>
            <option value="skipped">Ignorado</option>
          </select>
        </label>

        <label class="filter-control">
          <span class="filter-label">Prioridade</span>
          <select
            id="priority-filter"
            class="filter-select"
            aria-label="Filtrar por prioridade"
          >
            <option value="">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </label>
      </div>
    `;
  }

  private renderEmptyNavigationState(): string {
    return this.html`
      <li class="nav-empty-state">
        <div class="empty-navigation text-center py-lg">
          <div class="text-4xl mb-md">📭</div>
          <p class="text-sm text-muted">Nenhuma suite de teste encontrada.</p>
        </div>
      </li>
    `;
  }

  private renderHeader(props: LayoutProps): string {
    const metadata = props.appState.testData?.metadata || {};
    const projectName = metadata.projectName || "Flow Test Report";
    const generatedAt = metadata.generatedAt
      ? this.formatTimestamp(metadata.generatedAt)
      : this.formatTimestamp(new Date());
    const successRate =
      metadata.successRate !== undefined && metadata.successRate !== null
        ? Number(metadata.successRate).toFixed(1)
        : null;
    const isSidebarVisible = props.appState.layout?.showSidebar !== false;

    return this.html`
      <div class="header-content">
        <div class="header-left">
          <button
            type="button"
            class="sidebar-toggle ${isSidebarVisible ? "is-active" : ""}"
            data-toggle-sidebar
            aria-label="Alternar navegação"
            aria-expanded="${isSidebarVisible ? "true" : "false"}"
          >
            <span class="toggle-icon">☰</span>
            <span class="toggle-label">Menu</span>
          </button>
          <h1>${this.escapeHtml(projectName)}</h1>
          <div class="breadcrumbs">
            <a href="#home">Home</a>
            <span aria-hidden="true">&nbsp;›&nbsp;</span>
            <span>Test Report</span>
          </div>
        </div>

        <div class="header-right">
          <div class="header-meta">
            <span class="timestamp" aria-label="Gerado em">Gerado: ${generatedAt}</span>
            ${successRate !== null
              ? this.html`<span class="success-chip">Taxa de sucesso: ${successRate}%</span>`
              : ""}
          </div>
        </div>
      </div>
    `;
  }

  private renderFooter(): string {
    return this.html`
      <div class="footer-content">
        <p>Flow Test Report Generator V2 - Documentation generated by Flow Test Engine</p>
      </div>
    `;
  }
}
