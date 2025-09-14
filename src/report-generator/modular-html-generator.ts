/**
 * Novo HTML Generator - Versão modular e limpa
 *
 * Responsabilidades:
 * - Orquestrar componentes modulares
 * - Gerar HTML final do relatório
 * - Carregar CSS e JavaScript necessário
 * - Manter compatibilidade com dados existentes
 */

import * as fs from "fs";
import * as path from "path";
import {
  ComponentFactory,
  SummaryCardData,
  TestSuiteProps,
  HeaderProps,
} from "./components";

// Tipos para os dados do relatório
interface AggregatedResult {
  project_name?: string;
  total_tests?: number;
  successful_tests?: number;
  failed_tests?: number;
  success_rate?: number;
  total_duration_ms?: number;
  suites_results?: SuiteResult[];
}

interface SuiteResult {
  suite_name?: string;
  status?: string;
  duration_ms?: number;
  steps_results?: StepResult[];
}

interface StepResult {
  step_name?: string;
  status?: string;
  duration_ms?: number;
  assertions_results?: any[];
  request_details?: any;
  response_details?: any;
}

export class ModularHtmlGenerator {
  private components = new ComponentFactory();
  private logoBase64: string = "";
  private themeCSS: string = "";

  constructor() {
    this.loadAssets();
  }

  private loadAssets(): void {
    try {
      // Carregar logo
      const logoPath = path.join(__dirname, "../../public/assets/flow.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        this.logoBase64 = `data:image/png;base64,${logoBuffer.toString(
          "base64"
        )}`;
      }

      // Carregar CSS do Tailwind compilado
      const tailwindCssPath = path.join(__dirname, "../templates/styles.css");
      let tailwindCSS = "";

      if (fs.existsSync(tailwindCssPath)) {
        tailwindCSS = fs.readFileSync(tailwindCssPath, "utf8");
      }

      // Carregar nossas variáveis customizadas
      const customCssPath = path.join(__dirname, "components/theme.css");
      let customCSS = "";

      if (fs.existsSync(customCssPath)) {
        customCSS = fs.readFileSync(customCssPath, "utf8");
      }

      // Combinar os CSS: Tailwind primeiro, depois nossas customizações
      this.themeCSS =
        tailwindCSS + "\n\n/* Custom Theme Variables */\n" + customCSS;
    } catch (error) {
      console.warn("Erro ao carregar assets:", error);
    }
  }

  /**
   * Converte dados agregados em props para SummaryCards
   */
  private buildSummaryCardsData(data: AggregatedResult): SummaryCardData[] {
    const successRate = data.success_rate || 0;

    return [
      {
        title: "Total Tests",
        value: data.total_tests?.toString() || "0",
        icon: "tests",
        colorScheme: "primary",
      },
      {
        title: "Passed",
        value: data.successful_tests?.toString() || "0",
        icon: "success",
        colorScheme: "success",
      },
      {
        title: "Failed",
        value: data.failed_tests?.toString() || "0",
        icon: "error",
        colorScheme: "error",
      },
      {
        title: "Success Rate",
        value: `${successRate.toFixed(1)}%`,
        icon: "chart",
        colorScheme:
          successRate === 100
            ? "success"
            : successRate >= 80
            ? "warning"
            : "error",
      },
    ];
  }

  /**
   * Converte dados de suíte em props para TestSuite
   */
  private buildTestSuiteProps(
    suite: SuiteResult,
    index: number
  ): TestSuiteProps {
    return {
      suiteName: suite.suite_name || `Suite ${index + 1}`,
      status: suite.status === "success" ? "success" : "failure",
      duration: suite.duration_ms || 0,
      steps: (suite.steps_results || []).map(
        (step: StepResult, stepIndex: number) => ({
          stepName: step.step_name || `Step ${stepIndex + 1}`,
          status: step.status === "success" ? "success" : "failure",
          duration: step.duration_ms || 0,
          assertions: step.assertions_results || [],
          request: step.request_details,
          response: step.response_details,
          curlCommand: step.request_details?.curl_command,
          stepId: `step-${index}-${stepIndex}`,
        })
      ),
      suiteId: `suite-${index}`,
    };
  }

  /**
   * Determina classe de status geral
   */
  private getOverallStatusClass(data: AggregatedResult): string {
    const successRate = data.success_rate || 0;
    if (successRate === 100) return "bg-green-500";
    if (successRate >= 80) return "bg-yellow-500";
    return "bg-red-500";
  }

  /**
   * Gera JavaScript para interatividade
   */
  private generateJavaScript(): string {
    return `
      <script>
        // Toggle de suítes
        function toggleSuite(suiteId) {
          const content = document.getElementById(suiteId + '-content');
          const icon = document.getElementById(suiteId + '-icon');
          const button = content.previousElementSibling;

          if (content && icon) {
            const isHidden = content.classList.contains('hidden');
            content.classList.toggle('hidden');
            icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
            button.setAttribute('aria-expanded', isHidden.toString());
          }
        }

        // Toggle de steps
        function toggleStep(stepId) {
          const content = document.getElementById(stepId + '-content');
          const icon = document.getElementById(stepId + '-icon');
          const button = content.previousElementSibling;

          if (content && icon) {
            const isHidden = content.classList.contains('hidden');
            content.classList.toggle('hidden');
            icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
            button.setAttribute('aria-expanded', isHidden.toString());
          }
        }

        // Sistema de tabs
        function switchTab(containerId, targetTabId) {
          const container = document.getElementById(containerId + '-content');
          if (!container) return;

          // Remover ativo de todos os botões
          container.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            btn.classList.add('border-transparent', 'text-secondary');
            btn.setAttribute('aria-selected', 'false');
          });

          // Esconder todo conteúdo
          container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
          });

          // Ativar tab clicada
          const targetButton = container.querySelector(\`[onclick*="\${targetTabId}"]\`);
          const targetContent = document.getElementById(targetTabId);

          if (targetButton && targetContent) {
            targetButton.classList.remove('border-transparent', 'text-secondary');
            targetButton.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            targetButton.setAttribute('aria-selected', 'true');
            targetContent.classList.remove('hidden');
          }
        }

        // Toggle de tema
        function toggleTheme() {
          const html = document.documentElement;
          const isDark = html.classList.contains('dark');

          if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
          } else {
            html.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
          }

          updateThemeIcons();
        }

        // Atualizar ícones do tema
        function updateThemeIcons() {
          const darkIcon = document.getElementById('theme-toggle-dark-icon');
          const lightIcon = document.getElementById('theme-toggle-light-icon');
          const isDark = document.documentElement.classList.contains('dark');

          if (darkIcon && lightIcon) {
            if (isDark) {
              darkIcon.classList.add('hidden');
              lightIcon.classList.remove('hidden');
            } else {
              darkIcon.classList.remove('hidden');
              lightIcon.classList.add('hidden');
            }
          }
        }

        // Inicializar tema
        function initTheme() {
          const savedTheme = localStorage.getItem('color-theme');
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

          if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }

          updateThemeIcons();
        }

        // Setup do evento de toggle
        document.addEventListener('DOMContentLoaded', function() {
          initTheme();

          const themeToggle = document.getElementById('theme-toggle');
          if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
          }
        });

        // Acessibilidade - suporte ao teclado
        document.addEventListener('keydown', function(e) {
          if (e.target.getAttribute('role') === 'button' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.target.click();
          }
        });
      </script>
    `;
  }

  /**
   * Gera HTML completo do relatório
   */
  public generate(data: AggregatedResult): string {
    const headerProps: HeaderProps = {
      projectName: data.project_name || "Test Report",
      logoBase64: this.logoBase64,
      statusClass: this.getOverallStatusClass(data),
    };

    const summaryCardsData = this.buildSummaryCardsData(data);

    const suites = (data.suites_results || []).map(
      (suite: SuiteResult, index: number) =>
        this.buildTestSuiteProps(suite, index)
    );

    return `<!DOCTYPE html>
<html lang="pt-BR" class="">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flow Test Report - ${data.project_name || "Test Report"}</title>
    <meta name="description" content="Relatório automatizado de testes gerado pelo Flow Test Engine">
    <style>${this.themeCSS}</style>
</head>
<body class="bg-primary text-primary transition-all duration-300">
    <div class="min-h-screen">
        <!-- Container principal -->
        <div class="container mx-auto px-4 py-6 max-w-7xl">

            <!-- Header -->
            ${this.components.header.render(headerProps)}

            <!-- Summary Cards -->
            ${this.components.summaryCards.render({ cards: summaryCardsData })}

            <!-- Test Suites -->
            <section class="space-y-4" aria-label="Suítes de teste">
                ${
                  suites.length > 0
                    ? suites
                        .map((suite: TestSuiteProps) =>
                          this.components.testSuite.render(suite)
                        )
                        .join("")
                    : '<div class="text-center p-8 bg-secondary rounded-xl border border-default"><p class="text-secondary">Nenhuma suíte de teste encontrada</p></div>'
                }
            </section>

            <!-- Footer -->
            <footer class="text-center mt-12 pt-8 border-t border-default text-secondary">
                <div class="space-y-2">
                    <p class="text-sm">
                        Gerado em ${new Date().toLocaleString("pt-BR")} •
                        Duração total: ${this.formatDuration(
                          data.total_duration_ms || 0
                        )}
                    </p>
                    <p class="text-xs">
                        <strong>Flow Test Engine</strong> - Relatórios automatizados de teste
                    </p>
                </div>
            </footer>

        </div>
    </div>

    ${this.generateJavaScript()}
</body>
</html>`;
  }

  /**
   * Formatar duração
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}
