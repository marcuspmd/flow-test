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
          ${layout.showSidebar ? this.renderSidebar(props) : ""}
          <div id="main">
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
          --sidebar-width: 300px;
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
          background-color: var(--color-surface);
          border-right: 1px solid rgba(15, 23, 42, 0.08);
          padding: 32px 24px;
          flex-shrink: 0;
        }

        #main {
          flex: 1;
          padding: 40px 48px;
          background-color: var(--color-background);
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

        .nav-link {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
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
          font-size: 12px;
          flex-shrink: 0;
          color: var(--color-text-secondary);
          margin-top: 0;
        }

        .nav-label {
          flex: 1;
          overflow: hidden;
          white-space: normal;
          word-break: break-word;
          line-height: 1.4;
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
          #container {
            flex-direction: column;
          }

          #sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          }

          #main {
            padding: 28px 20px 40px;
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
        @media (max-width: 768px) {
          #sidebar {
            position: static;
            width: 100%;
            height: auto;
            margin-top: 0;
          }

          #main {
            margin-left: 0;
          }

          #header {
            position: static;
            height: auto;
          }

          #container {
            margin-top: 0;
          }
        }

        /* Header styles */
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          height: 60px;
        }

        .header-left h1 {
          font-size: 24px;
          font-weight: bold;
          color: var(--color-text);
          margin: 0;
        }

        .breadcrumbs {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 5px;
        }

        .breadcrumbs a {
          color: var(--color-primary);
          text-decoration: none;
        }

        .header-right {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        /* Footer styles */
        .footer-content {
          text-align: center;
          font-size: 12px;
          color: var(--color-text-secondary);
        }
      </style>
    `;
  }

  private renderScripts(): string {
    return this.html`
      <script>
        // Estado global da aplicação
        window.appState = {
          selectedItem: null,
          sidebarOpen: true,
          theme: 'default'
        };

        // Função para mostrar tabs
        function showTab(containerId, tabName) {
          const trigger = document.getElementById(containerId);
          if (!trigger) return;

          const container = trigger.classList.contains('tabs-container')
            ? trigger
            : trigger.closest('.tabs-container');

          if (!container) return;

          // Esconder todas as abas
          const tabContents = container.querySelectorAll('.tab-content');
          const tabButtons = container.querySelectorAll('.tab-button');

          tabContents.forEach(content => {
            content.classList.remove('active');
            content.classList.add('hidden');
          });

          tabButtons.forEach(button => {
            button.classList.remove('active');
          });

          // Mostrar aba selecionada
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

        // Função para copiar para clipboard
        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('Copiado para o clipboard!', 'success');
          }).catch(() => {
            showToast('Erro ao copiar', 'error');
          });
        }

        // Sistema de toast notifications
        function showToast(message, type = 'info', duration = 3000) {
          const container = document.getElementById('toast-container');
          const toast = document.createElement('div');

          const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-black',
            info: 'bg-blue-500 text-white'
          };

          toast.className = \`px-4 py-2 rounded shadow-lg \${colors[type] || colors.info} transform transition-transform duration-300 translate-x-full\`;
          toast.textContent = message;

          container.appendChild(toast);

          // Animar entrada
          setTimeout(() => {
            toast.classList.remove('translate-x-full');
          }, 10);

          // Remover após duração
          setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
              container.removeChild(toast);
            }, 300);
          }, duration);
        }

        // Toggle sidebar (mobile)
        function toggleSidebar() {
          const sidebar = document.querySelector('.sidebar');
          sidebar.classList.toggle('open');
          window.appState.sidebarOpen = !window.appState.sidebarOpen;
        }

        // Expandir/colapsar seções
        function toggleSection(elementId) {
          const element = document.getElementById(elementId);
          const isExpanded = !element.classList.contains('hidden');

          if (isExpanded) {
            element.classList.add('hidden');
          } else {
            element.classList.remove('hidden');
          }

          // Atualizar ícone se existir
          const toggleButton = document.querySelector(\`[data-toggle="\${elementId}"]\`);
          if (toggleButton) {
            const icon = toggleButton.querySelector('.toggle-icon');
            if (icon) {
              icon.textContent = isExpanded ? '▶' : '▼';
            }
          }
        }

        // Filtros e busca
        function applyFilters() {
          const searchTerm = document.getElementById('search-input')?.value?.toLowerCase() || '';
          const items = document.querySelectorAll('[data-filterable]');

          items.forEach(item => {
            const text = (item.textContent || '').toLowerCase();
            const matchesSearch = !searchTerm || text.includes(searchTerm);
            item.style.display = matchesSearch ? '' : 'none';
          });
        }

        // Navegação por teclado
        document.addEventListener('keydown', function(e) {
          // Esc para fechar modals/sidebars
          if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.open');
            if (modal) {
              modal.classList.remove('open');
            }

            if (window.innerWidth < 768) {
              const sidebar = document.querySelector('.sidebar.open');
              if (sidebar) {
                sidebar.classList.remove('open');
              }
            }
          }
        });

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
          // Aplicar tema inicial
          document.body.className = 'h-full bg-background text-default font-sans';

          // Setup de listeners
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
          }

          applyFilters();
        });
      </script>
    `;
  }

  private renderSidebar(props: LayoutProps): string {
    return this.html`
      <div id="sidebar">
        <div class="sidebar-section">
          <h3>Test Suites</h3>
          ${this.renderFilters()}
          ${this.renderNavigation(props)}
        </div>
      </div>
    `;
  }

  private renderFilters(): string {
    return this.html`
      <div class="sidebar-section">
        <h3>Filters</h3>
        <input
          type="text"
          id="search-input"
          placeholder="Search tests..."
          class="filter-input"
        />
      </div>
    `;
  }

  private renderNavigation(props: LayoutProps): string {
    return this.html`
      <div class="sidebar-section">
        <h3>Navigation</h3>
        <ul class="nav-tree" id="navigation-container">
          <!-- Navigation will be inserted here by NavigationComponent -->
        </ul>
      </div>
    `;
  }

  private renderHeader(props: LayoutProps): string {
    return this.html`
      <div class="header-content">
        <div class="header-left">
          <h1>Flow Test Report V2</h1>
          <div class="breadcrumbs">
            <a href="#home">Home</a> &gt; <span>Test Report</span>
          </div>
        </div>
        <div class="header-right">
          <span class="timestamp">Generated: ${this.formatTimestamp(
            new Date()
          )}</span>
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
