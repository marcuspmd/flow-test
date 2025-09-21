import type {
  ReportData,
  SuiteResult,
  StepResult,
  MetricsData,
} from "../types/dashboard.types";

export class DataProcessor {
  /**
   * Extrai dados usando JSONPath simples
   */
  static extractByPath(data: any, jsonPath: string): any {
    try {
      // Implementação básica de JSONPath
      if (jsonPath === "$") return data;

      const path = jsonPath.replace(/^\$\.?/, "").split(".");
      let result = data;

      for (const segment of path) {
        if (segment.includes("[") && segment.includes("]")) {
          // Array access: suites_results[0] ou suites_results[*]
          const [key, indexStr] = segment.split("[");
          const index = indexStr.replace("]", "");

          if (key && result[key]) {
            result = result[key];
          }

          if (index === "*") {
            // Return all items
            return result;
          } else if (!isNaN(Number(index))) {
            result = result[Number(index)];
          }
        } else if (result && typeof result === "object") {
          result = result[segment];
        }
      }

      return result;
    } catch (error) {
      console.error("Error extracting data by path:", jsonPath, error);
      return null;
    }
  }

  /**
   * Transforma dados para componentes específicos
   */
  static transformForComponent(data: any, componentType: string): any {
    switch (componentType) {
      case "metrics":
        return this.transformForMetrics(data);
      case "chart":
        return this.transformForChart(data);
      case "table":
        return this.transformForTable(data);
      case "scenarios":
        return this.transformForScenarios(data);
      default:
        return data;
    }
  }

  /**
   * Calcula métricas principais do relatório
   */
  static calculateMetrics(reportData: ReportData): MetricsData {
    const totalDuration = reportData.total_duration_ms;
    const avgDuration = totalDuration / reportData.total_tests;

    const criticalSuites = reportData.suites_results.filter(
      (suite) => suite.priority === "critical"
    );

    return {
      totalTests: reportData.total_tests,
      successRate: reportData.success_rate,
      avgDuration: Math.round(avgDuration),
      criticalTests: criticalSuites.length,
      failedTests: reportData.failed_tests,
      skippedTests: reportData.skipped_tests,
    };
  }

  /**
   * Transforma dados para componente de métricas
   */
  private static transformForMetrics(reportData: ReportData): any[] {
    const metrics = this.calculateMetrics(reportData);

    return [
      {
        label: "Total de Testes",
        value: metrics.totalTests,
        icon: "clipboard-list",
        color: "primary",
      },
      {
        label: "Taxa de Sucesso",
        value: `${metrics.successRate}%`,
        icon: "check-circle",
        color: metrics.successRate >= 90 ? "success" : "warning",
      },
      {
        label: "Duração Média",
        value: `${metrics.avgDuration}ms`,
        icon: "clock",
        color: "info",
      },
      {
        label: "Testes Críticos",
        value: metrics.criticalTests,
        icon: "exclamation-triangle",
        color: "warning",
      },
    ];
  }

  /**
   * Transforma dados para componentes de gráfico
   */
  private static transformForChart(data: SuiteResult[]): any {
    if (!Array.isArray(data)) return { labels: [], datasets: [] };

    const labels = data.map((suite) => suite.suite_name);
    const successRates = data.map((suite) => suite.success_rate);
    const durations = data.map((suite) => suite.duration_ms);

    return {
      labels,
      datasets: [
        {
          label: "Taxa de Sucesso (%)",
          data: successRates,
          backgroundColor: "rgba(34, 197, 94, 0.5)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 2,
        },
        {
          label: "Duração (ms)",
          data: durations,
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2,
        },
      ],
    };
  }

  /**
   * Transforma dados para componentes de tabela
   */
  private static transformForTable(data: SuiteResult[]): any {
    if (!Array.isArray(data)) return { headers: [], rows: [] };

    const headers = [
      { key: "suite_name", label: "Nome da Suite" },
      { key: "priority", label: "Prioridade" },
      { key: "status", label: "Status" },
      { key: "success_rate", label: "Taxa de Sucesso" },
      { key: "duration_ms", label: "Duração (ms)" },
      { key: "steps_executed", label: "Steps" },
    ];

    const rows = data.map((suite) => ({
      id: suite.node_id,
      suite_name: suite.suite_name,
      priority: suite.priority,
      status: suite.status,
      success_rate: `${suite.success_rate}%`,
      duration_ms: suite.duration_ms,
      steps_executed: suite.steps_executed,
    }));

    return { headers, rows };
  }

  /**
   * Transforma dados para componente de cenários
   */
  private static transformForScenarios(data: any[]): any {
    if (!Array.isArray(data)) return [];

    return data
      .filter((item) => item && item.has_scenarios)
      .map((scenariosMeta) => ({
        hasScenarios: scenariosMeta.has_scenarios,
        executedCount: scenariosMeta.executed_count,
        evaluations:
          scenariosMeta.evaluations?.map((evaluation: any) => ({
            index: evaluation.index,
            condition: evaluation.condition,
            matched: evaluation.matched,
            executed: evaluation.executed,
            branch: evaluation.branch,
          })) || [],
      }));
  }

  /**
   * Busca steps com cenários condicionais
   */
  static findStepsWithScenarios(reportData: ReportData): StepResult[] {
    const stepsWithScenarios: StepResult[] = [];

    reportData.suites_results.forEach((suite) => {
      suite.steps_results.forEach((step) => {
        if (step.scenarios_meta?.has_scenarios) {
          stepsWithScenarios.push(step);
        }
      });
    });

    return stepsWithScenarios;
  }

  /**
   * Estatísticas por prioridade
   */
  static getStatsByPriority(reportData: ReportData) {
    const stats = {
      critical: { total: 0, passed: 0 },
      high: { total: 0, passed: 0 },
      medium: { total: 0, passed: 0 },
      low: { total: 0, passed: 0 },
    };

    reportData.suites_results.forEach((suite) => {
      const priority = suite.priority as keyof typeof stats;
      if (stats[priority]) {
        stats[priority].total++;
        if (suite.status === "success") {
          stats[priority].passed++;
        }
      }
    });

    return stats;
  }

  /**
   * Formata duração em formato legível
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }

  /**
   * Obtém cor baseada no status
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      case "skipped":
        return "warning";
      default:
        return "neutral";
    }
  }

  /**
   * Obtém cor baseada na prioridade
   */
  static getPriorityColor(priority: string): string {
    switch (priority) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "success";
      default:
        return "neutral";
    }
  }
}
