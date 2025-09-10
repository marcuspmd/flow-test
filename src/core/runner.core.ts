import fs from "fs";
import yaml from "js-yaml";
import {
  TestSuite,
  TestStep,
  ExecutionResult,
  SuiteResult,
  VariableContext,
  ExecutionOptions,
} from "../types/common.types";
import { VariableService } from "../services/variable.service";
import { HttpService } from "../services/http.service";
import { AssertionService } from "../services/assertion.service";
import { CaptureService } from "../services/capture.service";
import { FlowManager } from "../services/flow.service";
import { ScenarioService } from "../services/scenario.service";
import { getLogger } from "../services/logger.service";

class Runner {
  private readonly suite: TestSuite;
  private readonly options: ExecutionOptions;
  private readonly variableService: VariableService;
  private readonly httpService: HttpService;
  private readonly assertionService: AssertionService;
  private readonly captureService: CaptureService;
  private readonly flowManager: FlowManager;
  private readonly scenarioService: ScenarioService;
  private readonly results: ExecutionResult[] = [];
  private readonly filePath: string;
  private allSteps: TestStep[] = [];
  private readonly logger = getLogger();

  /**
   * Carrega e inicializa a suíte de testes a partir de um arquivo.
   * @param filePath O caminho para o arquivo .yaml ou .yml da suíte de testes.
   * @param options Opções de execução.
   */
  constructor(filePath: string, options: ExecutionOptions = {}) {
    try {
      this.filePath = filePath;
      this.options = {
        verbosity: "simple",
        format: "console",
        continueOnFailure: false,
        timeout: 30000,
        ...options,
      };

      this.logger.info("Carregando suíte de testes", { filePath });

      const fileContent = fs.readFileSync(filePath, "utf8");
      this.suite = yaml.load(fileContent) as TestSuite;

      // Inicializa os serviços
      const variableContext: VariableContext = {
        global: {},
        imported: {},
        suite: this.suite.variables || {},
        runtime: {},
      };

      this.variableService = new VariableService(variableContext);
      this.httpService = new HttpService(
        this.suite.base_url,
        this.options.timeout
      );
      this.assertionService = new AssertionService();
      this.captureService = new CaptureService();
      this.flowManager = new FlowManager(
        this.variableService,
        this.options.verbosity
      );
      this.scenarioService = new ScenarioService();

      this.logger.info("Suíte carregada com sucesso", {
        metadata: {
          suiteName: this.suite.suite_name,
          nodeId: this.suite.node_id,
        },
      });
    } catch (error) {
      this.logger.error("Falha ao carregar ou interpretar o arquivo de teste", {
        error: error as Error,
        filePath,
      });
      process.exit(1);
    }
  }

  /**
   * Executa todas as etapas da suíte de testes em sequência.
   */
  public async run(): Promise<SuiteResult> {
    const startTime = new Date();

    this.logger.info("Iniciando execução da suíte", {
      metadata: {
        suiteName: this.suite.suite_name,
        nodeId: this.suite.node_id,
      },
    });

    // Processa importações de fluxos
    await this.processFlowImports();

    // Combina etapas importadas com etapas da suíte
    this.allSteps = [...this.allSteps, ...this.suite.steps];

    for (const [index, step] of this.allSteps.entries()) {
      if (
        this.options.verbosity === "simple" ||
        this.options.verbosity === "detailed" ||
        this.options.verbosity === "verbose"
      ) {
        this.logger.info(
          `[ETAPA ${index + 1}/${this.allSteps.length}] ${step.name}`
        );
      }

      const result = await this.executeStep(step);
      this.results.push(result);

      if (
        result.status === "failure" &&
        !this.options.continueOnFailure &&
        !step.continue_on_failure
      ) {
        if (this.options.verbosity !== "silent") {
          this.logger.error("Execução interrompida devido a falha na etapa.");
        }
        break;
      }
    }

    const endTime = new Date();
    const suiteResult = this.buildSuiteResult(startTime, endTime);

    if (this.options.verbosity !== "silent") {
      this.printSummary(suiteResult);
    }

    if (this.options.outputFile) {
      this.saveResults(suiteResult);
    }

    return suiteResult;
  }

  /**
   * Processa as importações de fluxos.
   */
  private async processFlowImports(): Promise<void> {
    if (!this.suite.imports || this.suite.imports.length === 0) {
      return;
    }

    try {
      const importedSteps = await this.flowManager.loadImports(
        this.suite.imports,
        this.filePath
      );
      this.allSteps = importedSteps;

      if (
        this.options.verbosity === "detailed" ||
        this.options.verbosity === "verbose"
      ) {
        this.logger.info(
          `${importedSteps.length} etapa(s) importada(s) de ${this.suite.imports.length} fluxo(s)`
        );
      }
    } catch (error) {
      this.logger.error("Falha ao processar importações de fluxos", {
        error: error as Error,
      });
      process.exit(1);
    }
  }

  /**
   * Executa uma única etapa de teste.
   */
  private async executeStep(step: TestStep): Promise<ExecutionResult> {
    try {
      // 1. Interpolar variáveis na requisição
      const interpolatedRequest = this.variableService.interpolate(
        step.request
      );

      if (this.options.verbosity === "verbose") {
        this.logger.debug("Requisição interpolada", {
          metadata: { interpolatedRequest },
        });
      }

      // 2. Executar a requisição HTTP
      const result = await this.httpService.executeRequest(
        step.name,
        interpolatedRequest
      );

      if (
        this.options.verbosity === "detailed" ||
        this.options.verbosity === "verbose"
      ) {
        this.logRequestResponse(result);
      }

      // 3. Executar as asserções na resposta
      if (step.assert && result.response_details) {
        const assertionResults = this.assertionService.validateAssertions(
          step.assert,
          result
        );
        result.assertions_results = assertionResults;

        const failedAssertions = assertionResults.filter((a) => !a.passed);
        if (failedAssertions.length > 0) {
          result.status = "failure";
          result.error_message = `${failedAssertions.length} assertion(s) falharam`;

          if (
            this.options.verbosity === "simple" ||
            this.options.verbosity === "detailed" ||
            this.options.verbosity === "verbose"
          ) {
            this.logger.error("Assertions falharam");
            failedAssertions.forEach((assertion) => {
              this.logger.error(`- ${assertion.field}: ${assertion.message}`);
            });
          }
        } else if (
          this.options.verbosity === "detailed" ||
          this.options.verbosity === "verbose"
        ) {
          this.logger.info(
            `Todas as ${assertionResults.length} assertion(s) passaram`
          );
        }
      }

      // 4. Capturar novas variáveis da resposta
      if (step.capture && result.response_details) {
        const capturedVariables = this.captureService.captureVariables(
          step.capture,
          result
        );
        result.captured_variables = capturedVariables;
        this.variableService.setVariables(capturedVariables);

        if (
          this.options.verbosity === "verbose" &&
          Object.keys(capturedVariables).length === 0
        ) {
          this.logger.info("Nenhuma variável foi capturada");
        }
      }

      // 5. Processar cenários condicionais (happy/sad path)
      if (
        step.scenarios &&
        step.scenarios.length > 0 &&
        result.response_details
      ) {
        if (this.options.verbosity === "verbose") {
          this.logger.info(
            `Processando ${step.scenarios.length} cenário(s) condicional(is)`
          );
        }

        this.scenarioService.processScenarios(
          step.scenarios,
          result,
          this.options.verbosity || "simple"
        );

        // Atualiza variáveis se novos captures foram feitos pelos cenários
        if (result.captured_variables) {
          this.variableService.setVariables(result.captured_variables);
        }
      }

      return result;
    } catch (error) {
      return {
        step_name: step.name,
        status: "failure",
        duration_ms: 0,
        error_message: `Erro inesperado: ${error}`,
        captured_variables: {},
        assertions_results: [],
      };
    }
  }

  /**
   * Exibe detalhes da requisição e resposta para verbosity alta.
   */
  private logRequestResponse(result: ExecutionResult): void {
    if (result.request_details) {
      this.logger.debug("Request details", {
        metadata: {
          method: result.request_details.method,
          url: result.request_details.url,
          headers: result.request_details.headers,
          body: result.request_details.body,
        },
      });
    }

    if (result.response_details) {
      this.logger.debug("Response details", {
        metadata: {
          status: result.response_details.status_code,
          size: result.response_details.size_bytes,
          headers: result.response_details.headers,
          body: result.response_details.body,
        },
      });
    }
  }

  /**
   * Constrói o resultado final da suíte.
   */
  private buildSuiteResult(startTime: Date, endTime: Date): SuiteResult {
    const totalDuration = endTime.getTime() - startTime.getTime();
    const successfulSteps = this.results.filter(
      (r) => r.status === "success"
    ).length;
    const successRate =
      this.results.length > 0
        ? (successfulSteps / this.results.length) * 100
        : 0;

    return {
      node_id: this.suite.node_id,
      suite_name: this.suite.suite_name,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_duration_ms: totalDuration,
      steps_results: this.results,
      success_rate: Math.round(successRate * 100) / 100,
      variables_final_state: this.variableService.getAllVariables(),
      imported_flows: this.suite.imports?.map((imp) => imp.name) || [],
    };
  }

  /**
   * Exibe o resumo final da execução.
   */
  private printSummary(suiteResult: SuiteResult): void {
    this.logger.info("\n--- Resumo da Execução ---");
    this.logger.info(`Suíte: ${suiteResult.suite_name}`);
    this.logger.info(`Duração total: ${suiteResult.total_duration_ms}ms`);
    this.logger.info(`Etapas executadas: ${suiteResult.steps_results.length}`);
    this.logger.info(`Taxa de sucesso: ${suiteResult.success_rate}%`);

    const failedSteps = suiteResult.steps_results.filter(
      (r) => r.status === "failure"
    );
    if (failedSteps.length > 0) {
      this.logger.error("Etapas que falharam:");
      failedSteps.forEach((step) => {
        this.logger.error(`  - ${step.step_name}: ${step.error_message}`);
      });
    }

    if (this.options.verbosity === "verbose") {
      this.logger.debug("Variáveis finais", {
        metadata: { variables: suiteResult.variables_final_state },
      });
    }

    this.logger.info("Execução da suíte concluída");
  }

  /**
   * Salva os resultados em arquivo.
   */
  private saveResults(suiteResult: SuiteResult): void {
    try {
      const output =
        this.options.format === "json"
          ? JSON.stringify(suiteResult, null, 2)
          : this.formatAsText(suiteResult);

      fs.writeFileSync(this.options.outputFile!, output, "utf8");
      this.logger.info(`Resultados salvos em: ${this.options.outputFile}`);
    } catch (error) {
      this.logger.error(`Falha ao salvar resultados`, {
        error: error as Error,
      });
    }
  }

  /**
   * Formata os resultados como texto legível.
   */
  private formatAsText(suiteResult: SuiteResult): string {
    let output = `Relatório de Teste - ${suiteResult.suite_name}\n`;
    output += `=`.repeat(50) + "\n\n";
    output += `Início: ${suiteResult.start_time}\n`;
    output += `Fim: ${suiteResult.end_time}\n`;
    output += `Duração: ${suiteResult.total_duration_ms}ms\n`;
    output += `Taxa de sucesso: ${suiteResult.success_rate}%\n\n`;

    output += "Detalhes das Etapas:\n";
    output += "-".repeat(30) + "\n";

    suiteResult.steps_results.forEach((step, index) => {
      output += `${index + 1}. ${step.step_name}\n`;
      output += `   Status: ${step.status === "success" ? "✓" : "✗"} ${
        step.status
      }\n`;
      output += `   Duração: ${step.duration_ms}ms\n`;
      if (step.error_message) {
        output += `   Erro: ${step.error_message}\n`;
      }
      output += "\n";
    });

    return output;
  }
}

export { Runner };
