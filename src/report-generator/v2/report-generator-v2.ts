/**
 * @packageDocumentation
 * Report Generator V2 - Gerador principal com layout moderno
 *
 * @remarks
 * Esta é a versão V2 do report generator com arquitetura completamente
 * reformulada, layout inspirado em design systems modernos e componentes
 * mais modulares para fácil customização e extensão.
 */

import * as fs from "fs";
import * as path from "path";
import { AggregatedResult } from "../../types/engine.types";
import {
  ComponentFactoryV2,
  ThemeConfig,
  LayoutConfig,
  NavigationConfig,
  NavigationItem,
  AppState,
  ReportConfigV2,
  defaultTheme,
  generateThemeCSS,
  getTheme,
} from "./index";

/**
 * Interface para dados de entrada do report V2
 */
interface AggregatedResultV2 extends AggregatedResult {
  // Extende o AggregatedResult padrão para compatibilidade
}

interface SuiteResultV2 {
  suite_name: string;
  status: string;
  duration_ms?: number;
  steps_results?: StepResultV2[];
  metadata?: {
    priority?: string;
    tags?: string[];
    description?: string;
  };
}

interface StepResultV2 {
  step_name: string;
  status: string;
  duration_ms?: number;
  assertions_results?: any[];
  request_details?: any;
  response_details?: any;
  curl_command?: string;
  captured_variables?: any[];
  error_context?: any;
}

/**
 * Gerador de relatórios HTML V2 com layout moderno e componentes modulares
 */
export class ReportGeneratorV2 {
  private theme: ThemeConfig;
  private config: ReportConfigV2;
  private componentFactory: ComponentFactoryV2;

  constructor(config?: Partial<ReportConfigV2>) {
    this.theme = config?.layout?.theme || defaultTheme;
    this.componentFactory = new ComponentFactoryV2(this.theme);
    this.config = this.buildDefaultConfig(config);
  }

  /**
   * Gera o relatório HTML V2
   */
  async generateReport(
    data: AggregatedResultV2,
    outputPath: string,
    options?: {
      theme?: string;
      customConfig?: Partial<ReportConfigV2>;
    }
  ): Promise<void> {
    try {
      // Aplicar configurações opcionais
      if (options?.theme) {
        this.theme = getTheme(options.theme);
        this.componentFactory = new ComponentFactoryV2(this.theme);
      }

      if (options?.customConfig) {
        this.config = { ...this.config, ...options.customConfig };
      }

      // Transformar dados para formato V2
      const transformedData = this.transformData(data);

      // Gerar estrutura de navegação
      const navigationItems = this.buildNavigationTree(transformedData);

      // Construir estado da aplicação
      const appState = this.buildAppState(navigationItems, transformedData);

      // Gerar HTML
      const html = this.renderReport(
        appState,
        transformedData,
        navigationItems
      );

      // Salvar arquivo
      await this.saveReport(html, outputPath);

      console.log(`[INFO] Relatório V2 gerado com sucesso em: ${outputPath}`);
    } catch (error) {
      console.error("[ERRO] Falha ao gerar relatório V2:", error);
      throw error;
    }
  }

  /**
   * Transforma os dados de entrada para o formato interno V2
   */
  private transformData(data: AggregatedResult): any {
    console.log('[DEBUG] ReportGeneratorV2.transformData - Input data:', {
      project_name: data.project_name,
      total_tests: data.total_tests,
      suites_count: data.suites_results?.length || 0
    });

    const transformedData = {
      metadata: {
        projectName: data.project_name || "Flow Test Report",
        totalTests: data.total_tests || 0,
        successfulTests: data.successful_tests || 0,
        failedTests: data.failed_tests || 0,
        successRate: data.success_rate || 0,
        totalDuration: data.total_duration_ms || 0,
        generatedAt: new Date().toISOString(),
        version: "2.0.0",
      },
      suites: (data.suites_results || []).map((suite, index) => {
        console.log(`[DEBUG] Processing suite ${index}:`, {
          name: suite.suite_name,
          status: suite.status,
          steps_count: suite.steps_results?.length || 0
        });

        const transformedSuite = {
          id: `suite-${index}`,
          name: suite.suite_name,
          status: suite.status,
          duration: suite.duration_ms || 0,
          metadata: {
            priority: suite.priority,
            tags: [],
            description: suite.suite_name,
          },
          steps: (suite.steps_results || []).map((step, stepIndex) => {
            console.log(`[DEBUG] Processing step ${index}-${stepIndex}:`, {
              name: step.step_name,
              status: step.status,
              has_scenarios: !!(step as any).scenarios_meta,
              has_iterations: !!((step as any).iteration_results?.length)
            });

            return {
              id: `step-${index}-${stepIndex}`,
              name: step.step_name,
              status: step.status,
              duration: step.duration_ms || 0,
              assertions: step.assertions_results || [],
              request: step.request_details,
              response: step.response_details,
              curlCommand: step.request_details?.curl_command || "",
              capturedVariables: step.captured_variables || {},
              captured_variables: step.captured_variables || {}, // Also preserve with underscore for compatibility
              errorContext: step.error_message,
              // Preserve iteration_results for recurring tests
              iteration_results: (step as any).iteration_results || [],
              // Preserve scenarios_meta for conditional scenarios
              scenarios_meta: (step as any).scenarios_meta || null,
            };
          }),
        };

        console.log(`[DEBUG] Transformed suite ${index}:`, {
          id: transformedSuite.id,
          name: transformedSuite.name,
          steps_count: transformedSuite.steps.length,
          steps_ids: transformedSuite.steps.map(s => s.id)
        });

        return transformedSuite;
      }),
    };

    console.log('[DEBUG] ReportGeneratorV2.transformData - Output:', {
      suites_count: transformedData.suites.length,
      total_steps: transformedData.suites.reduce((acc, s) => acc + s.steps.length, 0)
    });

    return transformedData;
  }

  /**
   * Constrói a árvore de navegação hierárquica
   */
  private buildNavigationTree(data: any): NavigationItem[] {
    console.log('[DEBUG] ReportGeneratorV2.buildNavigationTree - Input data:', {
      suites_count: data.suites?.length || 0,
      suites: data.suites?.map((s: any) => ({
        id: s.id,
        name: s.name,
        steps_count: s.steps?.length || 0
      }))
    });

    const navigationItems = data.suites.map((suite: any) => {
      console.log(`[DEBUG] Building navigation for suite ${suite.id}:`, {
        name: suite.name,
        steps_count: suite.steps?.length || 0,
        steps: suite.steps?.map((s: any) => ({ id: s.id, name: s.name }))
      });

      const navigationItem = {
        id: suite.id,
        name: suite.name,
        type: "suite" as const,
        status: suite.status,
        priority: suite.metadata?.priority,
        tags: suite.metadata?.tags,
        expanded: false,
        data: suite,
        children: suite.steps.map((step: any) => {
          console.log(`[DEBUG] Building navigation for step ${step.id}:`, {
            name: step.name,
            status: step.status
          });

          return {
            id: step.id,
            name: step.name,
            type: "step" as const,
            status: step.status,
            data: step,
          };
        }),
      };

      console.log(`[DEBUG] Built navigation item for suite ${suite.id}:`, {
        id: navigationItem.id,
        children_count: navigationItem.children.length,
        children_ids: navigationItem.children.map((c: any) => c.id)
      });

      return navigationItem;
    });

    console.log('[DEBUG] ReportGeneratorV2.buildNavigationTree - Output:', {
      items_count: navigationItems.length,
      total_children: navigationItems.reduce((acc: number, item: any) => acc + item.children.length, 0)
    });

    return navigationItems;
  }

  /**
   * Constrói o estado inicial da aplicação
   */
  private buildAppState(
    navigationItems: NavigationItem[],
    data: any
  ): AppState {
    return {
      selectedItem:
        navigationItems && navigationItems.length > 0
          ? navigationItems[0]
          : undefined,
      layout: this.config.layout,
      testData: data,
      filters: {
        search: "",
        status: [],
        priority: [],
        tags: [],
      },
    };
  }

  /**
   * Renderiza o relatório completo
   */
  private renderReport(
    appState: AppState,
    data: any,
    navigationItems: NavigationItem[]
  ): string {
    const mainLayout = this.componentFactory.createMainLayout();
    const navigation = this.componentFactory.createNavigation();

    const navigationHtml = navigation.renderNavigation({
      items: navigationItems,
      selectedItem: appState.selectedItem,
      config: this.config.layout.navigation,
    });

    const navScript = navigation.renderNavigationScript();

    const mainContent = this.renderMainContent(appState, data, navigationItems);

    return mainLayout.renderLayout({
      appState,
      children: mainContent,
      navigationHtml,
      navigationScript: navScript,
    });
  }

  /**
   * Renderiza o conteúdo principal da aplicação
   */
  private renderMainContent(
    appState: AppState,
    data: any,
    navigationItems: NavigationItem[]
  ): string {
    const detailsPanel = this.componentFactory.createDetailsPanel();
    const summarySection = this.renderSummarySection(data?.metadata);

    return `
      ${summarySection}
      ${detailsPanel.renderDetailsPanel({
        selectedItem: appState.selectedItem,
        navigationItems,
        theme: this.theme,
        testData: data,
      })}

      ${this.renderCustomScripts()}
    `;
  }

  private renderSummarySection(metadata: any): string {
    if (!metadata) {
      return "";
    }

    const summaryItems = [
      {
        label: "Total Tests",
        value: metadata.totalTests ?? 0,
        icon: "📦",
      },
      {
        label: "Sucessos",
        value: metadata.successfulTests ?? 0,
        icon: "✅",
      },
      {
        label: "Falhas",
        value: metadata.failedTests ?? 0,
        icon: "❌",
      },
      {
        label: "Taxa de Sucesso",
        value: this.formatSuccessRate(metadata.successRate),
        icon: "📈",
      },
      {
        label: "Duração Total",
        value: this.formatDuration(metadata.totalDuration),
        icon: "⏱️",
      },
    ];

    return `
      <section class="report-summary" aria-label="Resumo geral dos testes">
        ${summaryItems
          .map(
            (item) => `
              <div class="summary-card">
                <span class="summary-icon">${item.icon}</span>
                <div class="summary-content">
                  <span class="summary-value">${item.value}</span>
                  <span class="summary-label">${item.label}</span>
                </div>
              </div>
            `
          )
          .join("")}
      </section>
    `;
  }

  private formatSuccessRate(value: number | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "-";
    }

    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      return `${numberValue.toFixed(1)}%`;
    }

    return `${value}`;
  }

  private formatDuration(durationMs: number | undefined): string {
    if (!durationMs || durationMs <= 0) {
      return "0ms";
    }

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }

    const seconds = durationMs / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
  }

  /**
   * Renderiza filtros da sidebar
   */
  /**
   * Renderiza scripts customizados adicionais
   */
  private renderCustomScripts(): string {
    return `
      <script>
        (function() {
          window.reportV2State = window.reportV2State || {
            selectedItemId: null,
            theme: '${this.theme.name}',
            sidebarCollapsed: ${this.config.layout.showSidebar ? "false" : "true"}
          };

          function getDetailContainer() {
            return document.getElementById('main-content-area');
          }

          function normalizeDetailSections() {
            const container = getDetailContainer();
            if (!container) return null;

            if (container.dataset.normalized === 'true') {
              return container;
            }

            const sections = document.querySelectorAll('.detail-section');
            sections.forEach(section => {
              if (section.parentElement !== container) {
                container.appendChild(section);
              }
            });

            container.dataset.normalized = 'true';
            return container;
          }

          function getOrderedNavIds() {
            const links = document.querySelectorAll('#navigation-container .nav-link[data-item-link]');
            return Array.from(links)
              .map(link => link.getAttribute('data-item-link'))
              .filter(Boolean);
          }

          function handleKeyboardNavigation(event) {
            if (event.defaultPrevented) return;
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

            const target = event.target;
            const tagName = target?.tagName?.toLowerCase();
            if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
              return;
            }

            const navIds = getOrderedNavIds();
            if (!navIds.length) return;

            const currentId = window.reportV2State?.selectedItemId || navIds[0];
            const currentIndex = navIds.indexOf(currentId);

            let nextId = currentId;
            if (event.key === 'ArrowRight') {
              if (currentIndex === -1) {
                nextId = navIds[0];
              } else if (currentIndex < navIds.length - 1) {
                nextId = navIds[currentIndex + 1];
              }
            } else if (event.key === 'ArrowLeft') {
              if (currentIndex === -1) {
                nextId = navIds[navIds.length - 1];
              } else if (currentIndex > 0) {
                nextId = navIds[currentIndex - 1];
              }
            }

            if (nextId && nextId !== currentId) {
              event.preventDefault();
              if (typeof window.selectNavItem === 'function') {
                window.selectNavItem(nextId, { behavior: 'smooth' });
              }
            }
          }

          function updateMainContent(itemId) {
            const container = normalizeDetailSections() || getDetailContainer();
            if (!container) return;

            container.dataset.activeId = itemId;

            const sections = container.querySelectorAll('.detail-section');
            sections.forEach(section => {
              const isActive = section.dataset.itemId === itemId;
              section.classList.toggle('is-active', isActive);
              section.classList.toggle('is-hidden', !isActive);
              section.setAttribute('aria-hidden', String(!isActive));
            });
          }

          function ensureExpanded(itemId) {
            const link = document.querySelector('.nav-link[data-item-link="' + itemId + '"]');
            if (!link) return;

            let parent = link.closest('.nav-item');
            while (parent) {
              const childrenContainer = parent.querySelector(':scope > .nav-children');
              if (childrenContainer) {
                childrenContainer.classList.add('show');
              }

              const toggleIcon = parent.querySelector(':scope > .nav-item-header .toggle-btn .toggle-icon');
              if (toggleIcon) {
                toggleIcon.textContent = '▼';
              }

              parent = parent.parentElement?.closest('.nav-item') || null;
            }
          }

          window.reportV2UpdateContent = updateMainContent;
          window.reportV2EnsureExpanded = ensureExpanded;

          document.addEventListener('nav-item-selected', function(event) {
            const itemId = event.detail.itemId;
            window.reportV2State.selectedItemId = itemId;
            updateMainContent(itemId);
            ensureExpanded(itemId);

            if (window.innerWidth <= 768 && typeof window.toggleSidebar === 'function') {
              window.toggleSidebar(true);
            }
          });

          document.addEventListener('DOMContentLoaded', function() {
            document.body.className = 'h-full bg-background text-default font-sans';

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
              searchInput.addEventListener('input', function() {
                const term = this.value.toLowerCase();
                document.querySelectorAll('.nav-item').forEach(item => {
                  const text = (item.textContent || '').toLowerCase();
                  item.style.display = !term || text.includes(term) ? '' : 'none';
                });
              });
            }

            const container = normalizeDetailSections() || getDetailContainer();
            const initialId = container?.dataset.activeId;
            const hashId = location.hash ? location.hash.substring(1) : null;
            const startId = hashId || initialId;

            if (startId) {
              // Execute navigation immediately for hash-based navigation
              updateMainContent(startId);
              ensureExpanded(startId);

              try {
                window.history.replaceState({ nav: startId }, '', '#' + startId);
              } catch (err) {
                console.warn('History replace failed', err);
              }

              window.reportV2State.selectedItemId = startId;
            }
          });

          window.addEventListener('popstate', function(event) {
            const stateId = event.state?.nav || (location.hash ? location.hash.substring(1) : null);
            if (stateId) {
              updateMainContent(stateId);
              ensureExpanded(stateId);
            }
          });

          document.addEventListener('keydown', handleKeyboardNavigation);
        })();
      </script>
    `;
  }

  /**
   * Salva o relatório em arquivo
   */
  private async saveReport(html: string, outputPath: string): Promise<void> {
    // Garantir que o diretório existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Adicionar CSS do tema
    const styledHtml = this.injectThemeCSS(html);

    // Salvar arquivo
    fs.writeFileSync(outputPath, styledHtml, "utf8");
  }

  /**
   * Injeta o CSS do tema no HTML
   */
  private injectThemeCSS(html: string): string {
    const themeCSS = generateThemeCSS(this.theme);
    const tailwindCSS = this.getTailwindCSS();

    const cssSection = `<style>${themeCSS}${tailwindCSS}</style>`;

    return html.replace("<style>", cssSection + "<style>");
  }

  /**
   * Retorna CSS do Tailwind (versão simplificada)
   */
  private getTailwindCSS(): string {
    const candidatePaths = [
      path.resolve(__dirname, "../../templates/styles.css"),
      path.resolve(process.cwd(), "dist/templates/styles.css"),
      path.resolve(process.cwd(), "src/templates/styles.css"),
    ];

    for (const cssPath of candidatePaths) {
      try {
        if (fs.existsSync(cssPath)) {
          const content = fs.readFileSync(cssPath, "utf8");
          if (content?.trim()) {
            return content;
          }
        }
      } catch (error) {
        console.warn(`[WARN] Failed to load Tailwind CSS from ${cssPath}:`, error);
      }
    }

    console.warn(
      "[WARN] Tailwind CSS file not found. Falling back to minimal preset."
    );

    return `
      *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}
      body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"}
    `;
  }

  /**
   * Constrói configuração padrão
   */
  private buildDefaultConfig(
    customConfig?: Partial<ReportConfigV2>
  ): ReportConfigV2 {
    const defaultLayoutConfig: LayoutConfig = {
      showSidebar: true,
      sidebarWidth: 320,
      theme: this.theme,
      navigation: {
        autoExpand: false,
        showCounters: true,
        showPriorityIcons: true,
        filters: {},
      },
    };

    return {
      layout: { ...defaultLayoutConfig, ...customConfig?.layout },
      components: {
        header: { enabled: true },
        sidebar: { enabled: true },
        navigation: { enabled: true },
        detailsPanel: { enabled: true },
        summary: { enabled: true },
        footer: { enabled: true },
        ...customConfig?.components,
      },
      metadata: {
        title: "Flow Test Report V2",
        version: "2.0.0",
        generatedAt: new Date().toISOString(),
        ...customConfig?.metadata,
      },
    };
  }
}
