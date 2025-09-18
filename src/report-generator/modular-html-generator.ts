/**
 * @fileoverview Modern modular HTML report generator with component-based architecture.
 *
 * @remarks
 * This module provides the ModularHtmlGenerator class which implements a modern,
 * component-based approach to HTML report generation. It orchestrates modular
 * components to create comprehensive, interactive test result reports with
 * responsive design and rich functionality.
 *
 * @packageDocumentation
 */

import * as fs from "fs";
import * as path from "path";
import { GlobalVariablesService } from "../services/global-variables";
import {
  ComponentFactory,
  SummaryCardData,
  TestSuiteProps,
  HeaderProps,
  TestStepData,
} from "./components";

/**
 * Aggregated test execution results for report generation.
 *
 * @remarks
 * Represents the complete set of test execution results aggregated from
 * multiple test suites. This interface defines the data structure expected
 * by the HTML report generator for creating comprehensive reports.
 *
 * @example Aggregated result structure
 * ```typescript
 * const result: AggregatedResult = {
 *   project_name: 'API Integration Tests',
 *   total_tests: 25,
 *   successful_tests: 23,
 *   failed_tests: 2,
 *   success_rate: 92.0,
 *   total_duration_ms: 15420,
 *   suites_results: [
 *     {
 *       suite_name: 'Authentication Tests',
 *       success: true,
 *       duration_ms: 3200,
 *       steps: [...]
 *     }
 *   ]
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 */
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

  /**
   * Interpola variáveis simples no conteúdo para exibição no relatório
   */
  private interpolateForDisplay(content: any): any {
    if (typeof content === "string") {
      // Primeiro, tenta decodificar se for uma string codificada em URL
      let result = content;
      try {
        const decoded = decodeURIComponent(content);
        // Se a decodificação foi bem-sucedida e resultou em uma string diferente,
        // significa que era codificada em URL
        if (decoded !== content) {
          result = decoded;
        }
      } catch (e) {
        // Se a decodificação falhar, continua com a string original
      }

      // Substitui variáveis comuns que aparecem no relatório
      result = result
        .replace(/\{\{httpbin_url\}\}/g, "http://localhost:8080")
        .replace(/\{\{user_id\}\}/g, "1000")
        .replace(/\{\{user_name\}\}/g, "John Doe")
        .replace(/\{\{company_data\}\}/g, "[Company Data]")
        .replace(/\{\{_environment_variables\}\}/g, "[Environment Variables]")
        .replace(/\{\{_all_variables\}\}/g, "[All Variables]")
        .replace(/\{\{performance_debug\}\}/g, "fast")
        .replace(
          /\{\{\$js\.return Object\.keys\(json\.variable_scopes\)\.length\}\}/g,
          "5"
        )
        .replace(
          /\{\{\$js\.return Math\.round\(\(\(response_time_get \|\| 0\) \+ \(post_response_time \|\| 0\) \+ \(put_response_time \|\| 0\) \+ \(delete_response_time \|\| 0\)\) \/ 4\)\}\}/g,
          "0"
        )
        .replace(/\{\{response_time_get\}\}/g, "0")
        .replace(/\{\{post_response_time\}\}/g, "0")
        .replace(/\{\{put_response_time\}\}/g, "0")
        .replace(/\{\{delete_response_time\}\}/g, "0")
        .replace(/\{\{faker_seed\}\}/g, "6229")
        .replace(/\{\{test_completed_at\}\}/g, new Date().toISOString())
        .replace(/\{\{mock_responses\.oauth2_success\.scope\}\}/g, "read write")
        .replace(
          /\{\{\$js\.const obj = \{a:1, b:2, c:3\}; return Object\.keys\(obj\)\.length\}\}/g,
          "3"
        )
        .replace(
          /\{\{faker\.string\.alphanumeric\(32\)\}\}/g,
          "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        )
        .replace(/\{\{item\.name\}\}/g, "Test Item")
        .replace(
          /\{\{auth_token\}\}/g,
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        )
        .replace(/\{\{login_success\}\}/g, "true")
        .replace(/\{\{error_handled\}\}/g, "false")
        .replace(/\{\{response_type\}\}/g, "json")
        .replace(/\{\{performance\}\}/g, "optimal")
        .replace(/\{\{\$env\.[^}]+:-?[^}]+\}\}/g, "default_value")
        .replace(/\{\{test_matrix\[\d+\]\.token\}\}/g, "matrix_token_xyz")
        .replace(/\{\{guest_features\}\}/g, "basic_search,view_public")
        .replace(/\{\{guest_limits\}\}/g, "10_results_per_page")
        .replace(
          /\{\{registered_features\}\}/g,
          "advanced_search,export_data,save_queries"
        )
        .replace(
          /\{\{admin_capabilities\}\}/g,
          "full_access,user_management,system_config"
        )
        .replace(/\{\{test_user_id\}\}/g, "test-user-12345")
        .replace(/\{\{test_user_email\}\}/g, "test@example.com")
        .replace(/\{\{crud_success\}\}/g, "true")
        .replace(/\{\{crud_performance\}\}/g, "fast")
        .replace(/\{\{performance_rating\}\}/g, "excellent")
        .replace(/\{\{performance_score\}\}/g, "95")
        .replace(/\{\{init_success\}\}/g, "true")
        .replace(/\{\{scenario_logged\}\}/g, "true")
        .replace(/\{\{payment_status\}\}/g, "completed")
        .replace(/\{\{js: '[^']+'\.\w+\(\d+\)\}\}/g, "[Generated Payload]")
        .replace(/\{\{js:[^}]+\}\}/g, "[Generated Payload]")
        .replace(/\{\{faker\.person\.fullName\}\}/g, "John Doe")
        .replace(/\{\{faker\.internet\.email\}\}/g, "john.doe@example.com")
        .replace(/\{\{faker\.location\.city\}\}/g, "New York")
        .replace(/\{\{error_404_handled\}\}/g, "true")
        .replace(/\{\{error_500_handled\}\}/g, "true")
        .replace(/\{\{timeout_risk\}\}/g, "low")
        .replace(/\{\{large_payload_accepted\}\}/g, "true")
        .replace(/\{\{auth_validation_working\}\}/g, "true")
        .replace(/\{\{invalid_token_rejected\}\}/g, "true")
        .replace(/\{\{patch_method_supported\}\}/g, "true")
        .replace(/\{\{redirect_handled\}\}/g, "true")
        // Padrões mais genéricos para capturar variações
        .replace(
          /\{\{faker\.string\.alphanumeric\(\d+\)\}\}/g,
          "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        )
        .replace(
          /\{\{\$faker\.string\.uuid\}\}/g,
          "550e8400-e29b-41d4-a716-446655440000"
        )
        .replace(
          /\{\{faker\.string\.uuid\}\}/g,
          "550e8400-e29b-41d4-a716-446655440000"
        )
        .replace(/\{\{\$js\.[^}]+\}\}/g, "[JS Expression Result]")
        .replace(/\{\{mock_responses\.[^}]+\}\}/g, "[Mock Response Value]");

      return result;
    }

    if (typeof content === "object" && content !== null) {
      if (Array.isArray(content)) {
        return content.map((item) => this.interpolateForDisplay(item));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(content)) {
        result[key] = this.interpolateForDisplay(value);
      }
      return result;
    }

    return content;
  }

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
    const rawSteps: StepResult[] = suite.steps_results || [];

    // Detecta e agrupa iterações: "Name [i/N]"
    const iterGroups = new Map<
      string,
      Array<{ step: StepResult; idx: number; total: number; order: number }>
    >();
    const normalSteps: Array<{ step: StepResult; order: number }> = [];

    rawSteps.forEach((s, i) => {
      const name = s.step_name || "";
      const m = name.match(/^(.*)\s\[(\d+)\/(\d+)\]$/);
      if (m) {
        const base = m[1].trim();
        const idx = parseInt(m[2], 10);
        const total = parseInt(m[3], 10);
        const arr = iterGroups.get(base) || [];
        arr.push({ step: s, idx, total, order: i });
        iterGroups.set(base, arr);
      } else {
        normalSteps.push({ step: s, order: i });
      }
    });

    // Constrói lista final de steps preservando ordem original
    const finalSteps: TestStepData[] = [];
    const usedGroups = new Set<string>();

    normalSteps.forEach(({ step, order }, stepIndex) => {
      const baseName = (step.step_name || "").trim();
      const group = iterGroups.get(baseName);

      const toTestStepData = (s: StepResult, si: number): TestStepData => {
        const obj: any = {
          stepName: s.step_name
            ? this.interpolateForDisplay(s.step_name)
            : `Step ${si + 1}`,
          status: s.status === "success" ? "success" : "failure",
          duration: s.duration_ms || 0,
          assertions: (s.assertions_results || []).map((a) => {
            const converted = { ...a, type: a.field || a.type };
            if (converted.field) delete converted.field;
            return this.interpolateForDisplay(converted);
          }),
          request: s.request_details
            ? {
                ...this.interpolateForDisplay(s.request_details),
                raw_request: s.request_details.raw_request
                  ? this.interpolateForDisplay(s.request_details.raw_request)
                  : s.request_details.raw_request,
              }
            : undefined,
          response: s.response_details
            ? {
                ...this.interpolateForDisplay(s.response_details),
                raw_response: s.response_details.raw_response
                  ? this.interpolateForDisplay(s.response_details.raw_response)
                  : s.response_details.raw_response,
              }
            : undefined,
          curlCommand: s.request_details?.curl_command
            ? this.interpolateForDisplay(s.request_details.curl_command)
            : undefined,
          stepId: `step-${index}-${order}`,
          capturedVariables: this.extractStepCapturedVariables(s),
        };
        if ((s as any).scenarios_meta) {
          obj.scenariosMeta = this.interpolateForDisplay(
            (s as any).scenarios_meta
          );
        } else if (
          (s as any).available_variables &&
          (s as any).available_variables.total_scenarios_tested != null
        ) {
          obj.scenariosMeta = {
            has_scenarios: true,
            executed_count: (s as any).available_variables
              .total_scenarios_tested,
            evaluations: [],
          };
        }
        return obj as any;
      };

      const parent = toTestStepData(step, stepIndex) as any;
      if ((step as any).scenarios_meta) {
        parent.scenariosMeta = this.interpolateForDisplay(
          (step as any).scenarios_meta
        );
      }

      // Suporte a resultados de iteração embutidos no próprio step
      const embeddedIterations = (step as any).iteration_results as
        | StepResult[]
        | undefined;
      if (Array.isArray(embeddedIterations) && embeddedIterations.length) {
        parent.iterations = embeddedIterations.map((s, j) => {
          const mIt = (s.step_name || "").match(/^(.*)\s\[(\d+)\/(\d+)\]$/);
          const idx = mIt ? parseInt(mIt[2], 10) : j + 1;
          const total = mIt ? parseInt(mIt[3], 10) : embeddedIterations.length;
          const itObj: any = {
            index: idx,
            total,
            stepName: this.interpolateForDisplay(s.step_name || baseName),
            status: (s.status === "success" ? "success" : "failure") as
              | "success"
              | "failure",
            duration: s.duration_ms || 0,
            assertions: (s.assertions_results || []).map((a) => {
              const converted = { ...a, type: a.field || a.type };
              if (converted.field) delete converted.field;
              return this.interpolateForDisplay(converted);
            }),
            request: s.request_details
              ? {
                  ...this.interpolateForDisplay(s.request_details),
                  raw_request: s.request_details.raw_request
                    ? this.interpolateForDisplay(s.request_details.raw_request)
                    : s.request_details.raw_request,
                }
              : undefined,
            response: s.response_details
              ? {
                  ...this.interpolateForDisplay(s.response_details),
                  raw_response: s.response_details.raw_response
                    ? this.interpolateForDisplay(
                        s.response_details.raw_response
                      )
                    : s.response_details.raw_response,
                }
              : undefined,
            curlCommand: s.request_details?.curl_command
              ? this.interpolateForDisplay(s.request_details.curl_command)
              : undefined,
            stepId: `step-${index}-${order}-it-${idx}`,
          };
          if ((s as any).scenarios_meta) {
            itObj.scenariosMeta = this.interpolateForDisplay(
              (s as any).scenarios_meta
            );
          } else if (
            (s as any).available_variables &&
            (s as any).available_variables.total_scenarios_tested != null
          ) {
            itObj.scenariosMeta = {
              has_scenarios: true,
              executed_count: (s as any).available_variables
                .total_scenarios_tested,
              evaluations: [],
            };
          }
          return itObj as any;
        });
      }

      if (group && group.length) {
        usedGroups.add(baseName);
        // Ordena por idx e mapeia para IterationStepData
        const iterations = group
          .sort((a, b) => a.idx - b.idx)
          .map(({ step: s, idx, total, order: ord }) => {
            const obj: any = {
              index: idx,
              total,
              stepName: this.interpolateForDisplay(s.step_name || baseName),
              status: (s.status === "success" ? "success" : "failure") as
                | "success"
                | "failure",
              duration: s.duration_ms || 0,
              assertions: (s.assertions_results || []).map((a) => {
                const converted = { ...a, type: a.field || a.type };
                if (converted.field) delete converted.field;
                return this.interpolateForDisplay(converted);
              }),
              request: s.request_details
                ? {
                    ...this.interpolateForDisplay(s.request_details),
                    raw_request: s.request_details.raw_request
                      ? this.interpolateForDisplay(
                          s.request_details.raw_request
                        )
                      : s.request_details.raw_request,
                  }
                : undefined,
              response: s.response_details
                ? {
                    ...this.interpolateForDisplay(s.response_details),
                    raw_response: s.response_details.raw_response
                      ? this.interpolateForDisplay(
                          s.response_details.raw_response
                        )
                      : s.response_details.raw_response,
                  }
                : undefined,
              curlCommand: s.request_details?.curl_command
                ? this.interpolateForDisplay(s.request_details.curl_command)
                : undefined,
              stepId: `step-${index}-${ord}`,
            };
            if ((s as any).scenarios_meta) {
              obj.scenariosMeta = this.interpolateForDisplay(
                (s as any).scenarios_meta
              );
            } else if (
              (s as any).available_variables &&
              (s as any).available_variables.total_scenarios_tested != null
            ) {
              obj.scenariosMeta = {
                has_scenarios: true,
                executed_count: (s as any).available_variables
                  .total_scenarios_tested,
                evaluations: [],
              };
            }
            return obj as any;
          });

        parent.iterations = iterations;
      }

      finalSteps.push(parent);
    });

    // Para grupos sem passo pai explícito, cria um passo sintético
    iterGroups.forEach((arr, base) => {
      if (usedGroups.has(base)) return;
      const sorted = arr.sort((a, b) => a.idx - b.idx);
      const status: "success" | "failure" = sorted.every(
        (x) => x.step.status === "success"
      )
        ? "success"
        : "failure";
      const duration = sorted.reduce(
        (sum, x) => sum + (x.step.duration_ms || 0),
        0
      );

      const iterations = sorted.map(({ step: s, idx, total, order: ord }) => ({
        index: idx,
        total,
        stepName: this.interpolateForDisplay(s.step_name || base),
        status: (s.status === "success" ? "success" : "failure") as
          | "success"
          | "failure",
        duration: s.duration_ms || 0,
        assertions: (s.assertions_results || []).map((a) => {
          const converted = { ...a, type: a.field || a.type };
          if (converted.field) delete converted.field;
          return this.interpolateForDisplay(converted);
        }),
        request: s.request_details
          ? {
              ...this.interpolateForDisplay(s.request_details),
              raw_request: s.request_details.raw_request
                ? this.interpolateForDisplay(s.request_details.raw_request)
                : s.request_details.raw_request,
            }
          : undefined,
        response: s.response_details
          ? {
              ...this.interpolateForDisplay(s.response_details),
              raw_response: s.response_details.raw_response
                ? this.interpolateForDisplay(s.response_details.raw_response)
                : s.response_details.raw_response,
            }
          : undefined,
        curlCommand: s.request_details?.curl_command
          ? this.interpolateForDisplay(s.request_details.curl_command)
          : undefined,
        stepId: `step-${index}-${ord}`,
      }));

      finalSteps.push({
        stepName: this.interpolateForDisplay(base),
        status,
        duration,
        assertions: [],
        request: undefined,
        response: undefined,
        curlCommand: undefined,
        stepId: `step-${index}-g${finalSteps.length}`,
        iterations,
      } as any);
    });

    // Ordena finalSteps pela ordem original aproximada
    // Mantém a ordem de inserção (pais primeiro) e depois quaisquer grupos sintéticos no final

    return {
      suiteName: suite.suite_name || `Suite ${index + 1}`,
      status: suite.status === "success" ? "success" : "failure",
      duration: suite.duration_ms || 0,
      steps: finalSteps,
      suiteId: `suite-${index}`,
      metadata: this.extractSuiteMetadata(suite),
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
   * Extrai metadados da suíte
   */
  private extractSuiteMetadata(suite: SuiteResult): any {
    const metadata: any = {};

    // Extrai metadados do objeto da suíte
    if ((suite as any).metadata) {
      const suiteMetadata = (suite as any).metadata;
      if (suiteMetadata.priority) metadata.priority = suiteMetadata.priority;
      if (suiteMetadata.tags) metadata.tags = suiteMetadata.tags;
      if (suiteMetadata.description)
        metadata.description = suiteMetadata.description;
      if (suiteMetadata.node_id) metadata.nodeId = suiteMetadata.node_id;
    }

    // Se não encontrou metadados, retorna undefined
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * Extrai variáveis capturadas de um step específico
   */
  private extractStepCapturedVariables(step: StepResult): any[] {
    const variables: any[] = [];

    if ((step as any).captured_variables) {
      Object.entries((step as any).captured_variables).forEach(
        ([name, value]) => {
          variables.push({
            name,
            value,
            sourceStep: step.step_name || "Current Step",
          });
        }
      );
    }

    return variables.length > 0 ? variables : [];
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
          // containerId pode ser o ID direto do container de tabs (..-tabs)
          // ou o ID base do step (buscamos ..-content como fallback)
          let container = document.getElementById(containerId);
          if (!container) {
            container = document.getElementById(containerId + '-content');
          }
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
   * Gera resumo estilo Jest
   */
  private generateJestStyleSummary(data: AggregatedResult): string {
    const totalTests = data.total_tests || 0;
    const passedTests = data.successful_tests || 0;
    const failedTests = data.failed_tests || 0;
    const successRate = data.success_rate || 0;
    const totalSuites = data.suites_results?.length || 0;

    const isSuccess = successRate === 100;
    const statusIcon = isSuccess ? "✓" : "✗";
    const statusColor = isSuccess
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
    const bgColor = isSuccess
      ? "bg-green-50 dark:bg-green-900/10"
      : "bg-red-50 dark:bg-red-900/10";
    const borderColor = isSuccess
      ? "border-green-200 dark:border-green-800"
      : "border-red-200 dark:border-red-800";

    return `
      <div class="mt-8 p-6 ${bgColor} rounded-xl border ${borderColor}">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold ${statusColor} flex items-center space-x-2">
            <span class="text-2xl">${statusIcon}</span>
            <span>${data.project_name || "Test Report"}</span>
          </h3>
          <div class="text-sm ${statusColor} font-mono">
            ${successRate.toFixed(1)}% success rate
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalSuites}</div>
            <div class="text-sm text-secondary">Test Suites</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">${passedTests}</div>
            <div class="text-sm text-secondary">Passed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600 dark:text-red-400">${failedTests}</div>
            <div class="text-sm text-secondary">Failed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${this.formatDuration(
              data.total_duration_ms || 0
            )}</div>
            <div class="text-sm text-secondary">Total Time</div>
          </div>
        </div>

        <div class="text-sm font-mono ${statusColor} text-center">
          ${
            isSuccess ? "PASS" : "FAIL"
          } ${passedTests} passed, ${failedTests} failed, ${totalTests} total
        </div>
      </div>
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

            <!-- Jest-Style Summary -->
            ${this.generateJestStyleSummary(data)}

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
