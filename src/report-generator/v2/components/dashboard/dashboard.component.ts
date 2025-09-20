/**
 * Componente principal do dashboard moderno
 */
import { BaseComponentV2 } from "../common/base-component-v2";
import { ThemeConfig } from "../../types";
import { StatsCardComponent, StatsCardProps } from "./stats-card.component";
import { SuiteCardComponent, SuiteCardProps } from "./suite-card.component";
import { DashboardHeaderComponent, DashboardHeaderProps } from "./header.component";

export interface DashboardData {
  project_name: string;
  start_time: string;
  end_time: string;
  total_duration_ms: number;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  success_rate: number;
  suites_results: Array<{
    suite_name: string;
    status: string;
    duration_ms: number;
    steps_executed: number;
    steps_successful: number;
    steps_failed: number;
    priority?: string;
    steps_results: Array<{
      step_name: string;
      status: string;
      duration_ms: number;
    }>;
  }>;
}

export class DashboardComponent extends BaseComponentV2 {
  private statsCard: StatsCardComponent;
  private suiteCard: SuiteCardComponent;
  private headerComponent: DashboardHeaderComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.statsCard = new StatsCardComponent(theme);
    this.suiteCard = new SuiteCardComponent(theme);
    this.headerComponent = new DashboardHeaderComponent(theme);
  }

  render(): string {
    return '';
  }

  renderDashboard(data: DashboardData): string {
    const headerProps: DashboardHeaderProps = {
      projectName: data.project_name,
      totalTests: data.total_tests,
      successRate: data.success_rate,
      duration: data.total_duration_ms,
      timestamp: data.end_time
    };

    const statsCards: StatsCardProps[] = [
      {
        title: 'Total de Testes',
        value: data.total_tests,
        icon: '📊',
        color: 'info'
      },
      {
        title: 'Testes Bem-sucedidos',
        value: data.successful_tests,
        icon: '✅',
        color: 'success'
      },
      {
        title: 'Testes Falharam',
        value: data.failed_tests,
        icon: '❌',
        color: 'error'
      },
      {
        title: 'Taxa de Sucesso',
        value: `${data.success_rate}%`,
        icon: '📈',
        color: data.success_rate >= 95 ? 'success' : data.success_rate >= 80 ? 'warning' : 'error'
      }
    ];

    const suiteCards: SuiteCardProps[] = data.suites_results.map(suite => ({
      suiteName: suite.suite_name,
      totalSteps: suite.steps_executed,
      passedSteps: suite.steps_successful,
      failedSteps: suite.steps_failed,
      duration: suite.duration_ms,
      status: suite.status as 'success' | 'error' | 'warning',
      priority: suite.priority
    }));

    return this.html`
      <!DOCTYPE html>
      <html lang="pt-BR" class="h-full">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flow Test Dashboard - ${this.escapeHtml(data.project_name)}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                animation: {
                  'fade-in': 'fadeIn 0.5s ease-in-out',
                  'slide-in': 'slideIn 0.3s ease-out'
                }
              }
            }
          }
        </script>
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .suite-details {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
          }

          .suite-details.open {
            max-height: 500px;
          }
        </style>
      </head>
      <body class="h-full bg-gray-50 dark:bg-gray-900 transition-colors">
        <!-- Dashboard Header -->
        ${this.headerComponent.renderHeader(headerProps)}

        <!-- Main Content -->
        <main class="p-6">
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            ${statsCards.map(card => this.statsCard.renderCard(card)).join('')}
          </div>

          <!-- Suites Section -->
          <div class="mb-8">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Suites de Teste</h2>
              <div class="flex items-center gap-4">
                <select 
                  id="filter-status" 
                  onchange="window.filterSuites && window.filterSuites(this.value)"
                  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="">Todos os status</option>
                  <option value="success">Sucesso</option>
                  <option value="error">Erro</option>
                  <option value="warning">Aviso</option>
                </select>
                <select 
                  id="filter-priority" 
                  onchange="window.filterSuites && window.filterSuites()"
                  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="">Todas as prioridades</option>
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Médio</option>
                  <option value="low">Baixo</option>
                </select>
              </div>
            </div>
            
            <div id="suites-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${suiteCards.map(suite => this.suiteCard.renderCard(suite)).join('')}
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Atividade Recente</h2>
            <div class="space-y-3">
              ${this.renderRecentActivity(data)}
            </div>
          </div>
        </main>

        <!-- Scripts -->
        <script>
          (function() {
            var globalWindow = window;

            globalWindow.toggleTheme = function() {
              var html = document.documentElement;
              var isDark = html.classList.contains('dark');
              if (isDark) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
              } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
              }
            };

            (function() {
              var savedTheme = localStorage.getItem('theme');
              var prefersDark = globalWindow.matchMedia('(prefers-color-scheme: dark)').matches;
              if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.documentElement.classList.add('dark');
              }
            })();

            globalWindow.filterSuites = function(statusFilter) {
              var priorityFilterEl = document.getElementById('filter-priority');
              var priorityFilter = priorityFilterEl ? priorityFilterEl.value : '';
              var suiteCards = document.querySelectorAll('#suites-grid > div');
              suiteCards.forEach(function(card) {
                var classes = card.className;
                var hasStatus = !statusFilter || classes.includes(statusFilter);
                var hasPriority = !priorityFilter || card.textContent.includes(priorityFilter);
                if (hasStatus && hasPriority) {
                  card.style.display = 'block';
                  card.classList.add('animate-fade-in');
                } else {
                  card.style.display = 'none';
                }
              });
            };

            globalWindow.toggleSuiteDetails = function(suiteName) {
              console.log('Toggling suite details for:', suiteName);
            };

            globalWindow.exportReport = function() {
              var reportData = ${JSON.stringify(data)};
              var blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = 'flow-test-report.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            };
          })();
        </script>
      </body>
      </html>
    `;
  }

  private renderRecentActivity(data: DashboardData): string {
    const recentSteps = data.suites_results
      .flatMap(suite => suite.steps_results.map(step => ({
        ...step,
        suite_name: suite.suite_name
      })))
      .sort((a, b) => b.duration_ms - a.duration_ms)
      .slice(0, 5);

    return recentSteps.map(step => {
      const statusIcon = step.status === 'success' ? '✅' : '❌';
      const statusColor = step.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
      
      return this.html`
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex items-center gap-3">
            <span class="text-lg">${statusIcon}</span>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(step.step_name)}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">${this.escapeHtml(step.suite_name)}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="${statusColor} font-medium">${step.status.toUpperCase()}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">${step.duration_ms}ms</div>
          </div>
        </div>
      `;
    }).join('');
  }
}