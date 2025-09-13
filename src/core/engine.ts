import fs from "fs";
import yaml from "js-yaml";
import { ConfigManager } from "./config";
import { TestDiscovery } from "./discovery";
import { GlobalVariablesService } from "../services/global-variables";
import { PriorityService } from "../services/priority";
import { DependencyService } from "../services/dependency.service";
import { GlobalRegistryService } from "../services/global-registry.service";
import { ReportingService } from "../services/reporting";
import { ExecutionService } from "../services/execution";
import {
  EngineExecutionOptions,
  AggregatedResult,
  EngineHooks,
  ExecutionStats,
  DiscoveredTest,
} from "../types/engine.types";

/**
 * Main Flow Test Engine orchestrator
 *
 * This class is responsible for orchestrating the entire test execution process,
 * from discovery to report generation. It coordinates all the necessary services
 * to execute test suites defined in YAML files.
 *
 * @example
 * ```typescript
 * const engine = new FlowTestEngine('./config.yaml');
 *
 * // Configure hooks for monitoring
 * const hooks = {
 *   onSuiteStart: (suite) => console.log(`▶️ Starting ${suite.suite_name}`),
 *   onSuiteEnd: (suite, result) => console.log(`✅ Completed ${suite.suite_name}`)
 * };
 *
 * // Execute tests with filters
 * const result = await engine.run({
 *   filters: {
 *     tags: ["smoke", "regression"],
 *     priority: "high"
 *   },
 *   hooks,
 *   parallel: true
 * });
 *
 * console.log(`Executed ${result.total_suites} test suites`);
 * console.log(`Success rate: ${result.success_rate}%`);
 * ```
 *
 * @since 1.0.0
 */
export class FlowTestEngine {
  /** Configuration manager responsible for loading and validating configurations */
  private configManager: ConfigManager;

  /** Discovery service responsible for locating test files */
  private testDiscovery: TestDiscovery;

  /** Global variables management service for inter-suite communication */
  private globalVariables: GlobalVariablesService;

  /** Priority-based sorting and execution service */
  private priorityService: PriorityService;

  /** Dependency management service for test interdependencies */
  private dependencyService: DependencyService;

  /** Global registry for exported variables between flows */
  private globalRegistry: GlobalRegistryService;

  /** Report generation service */
  private reportingService: ReportingService;

  /** Main test execution service */
  private executionService: ExecutionService;

  /** Custom hooks for lifecycle events */
  private hooks: EngineHooks;

  /** Real-time execution statistics */
  private stats: ExecutionStats;

  /**
   * Flow Test Engine constructor
   *
   * Initializes all necessary services for test execution in the correct
   * dependency order. Services are initialized according to their interdependencies.
   *
   * @param configFileOrOptions - Path to config file or direct options object
   * @param hooks - Optional lifecycle event hooks for monitoring and extending functionality
   *
   * @example
   * ```typescript
   * // With configuration file
   * const engine = new FlowTestEngine('./flow-test.config.yml');
   *
   * // With direct options
   * const engine = new FlowTestEngine({
   *   test_directory: './tests',
   *   verbosity: 'verbose',
   *   parallel_execution: true,
   *   max_workers: 4
   * });
   *
   * // With lifecycle hooks for monitoring
   * const engine = new FlowTestEngine('./config.yml', {
   *   onExecutionStart: (stats) => {
   *     console.log(`🚀 Starting execution of ${stats.tests_discovered} test suites`);
   *     startTimer();
   *   },
   *   onSuiteStart: (suite) => {
   *     logger.info(`▶️ Executing: ${suite.suite_name}`);
   *   },
   *   onExecutionEnd: (result) => {
   *     const duration = stopTimer();
   *     console.log(`✨ Execution completed in ${duration}ms`);
   *     console.log(`Success rate: ${result.success_rate.toFixed(1)}%`);
   *   }
   * });
   * ```
   */
  constructor(
    configFileOrOptions?: string | EngineExecutionOptions,
    hooks: EngineHooks = {}
  ) {
    // Normalize constructor parameters
    const options: EngineExecutionOptions =
      typeof configFileOrOptions === "string"
        ? { config_file: configFileOrOptions }
        : configFileOrOptions || {};

    this.hooks = hooks;
    this.stats = this.initializeStats();

    // Initialize services in dependency order
    this.configManager = new ConfigManager(options);
    this.testDiscovery = new TestDiscovery(this.configManager);
    this.dependencyService = new DependencyService();
    this.globalRegistry = new GlobalRegistryService();
    this.globalVariables = new GlobalVariablesService(
      this.configManager,
      this.globalRegistry
    );
    this.priorityService = new PriorityService(this.configManager);
    this.reportingService = new ReportingService(this.configManager);
    this.executionService = new ExecutionService(
      this.configManager,
      this.globalVariables,
      this.priorityService,
      this.dependencyService,
      this.globalRegistry,
      this.hooks
    );
  }

  /**
   * Executes all discovered tests in the configured directory
   *
   * This method is the main entry point for test execution. It performs the complete
   * lifecycle: discovery, filtering, sorting, execution, and report generation.
   * The execution follows these phases:
   * 1. Test Discovery - Scans for YAML test files
   * 2. Filtering - Applies configured filters (tags, priority, etc.)
   * 3. Dependency Resolution - Resolves inter-test dependencies
   * 4. Execution - Runs tests with configured parallelism
   * 5. Reporting - Generates HTML and JSON reports
   *
   * @returns Promise that resolves to aggregated results of all executed tests
   * @throws Error if there's a critical failure during execution
   *
   * @example
   * ```typescript
   * // Basic execution
   * const result = await engine.run();
   * if (result.overall_status === 'success') {
   *   console.log('All tests passed!');
   *   console.log(`Success rate: ${result.success_rate}%`);
   * }
   *
   * // Check detailed results
   * console.log(`Total suites: ${result.total_suites}`);
   * console.log(`Passed: ${result.passed_suites}`);
   * console.log(`Failed: ${result.failed_suites}`);
   * console.log(`Skipped: ${result.skipped_suites}`);
   * console.log(`Execution time: ${result.total_execution_time}ms`);
   * ```
   */
  async run(): Promise<AggregatedResult> {
    const startTime = new Date();
    const config = this.configManager.getConfig();

    try {
      // Trigger execution start hook
      await this.hooks.onExecutionStart?.(this.stats);

      console.log(`\n🚀 Flow Test Engine v1.0`);
      console.log(`📊 Project: ${config.project_name}`);
      console.log(`📁 Test Directory: ${config.test_directory}`);
      console.log(`⚙️  Execution Mode: ${config.execution!.mode}`);

      // 1. Test Discovery Phase
      console.log(`\n🔍 Discovering tests...`);
      const discoveredTests = await this.discoverTests();

      if (discoveredTests.length === 0) {
        console.log(`❌ No tests found in ${config.test_directory}`);
        return this.buildEmptyResult(startTime, new Date());
      }

      console.log(`✅ Found ${discoveredTests.length} test suite(s)`);

      // 2. Apply filters if configured
      const filteredTests = this.applyFilters(discoveredTests);
      if (filteredTests.length !== discoveredTests.length) {
        console.log(`🔽 Filtered to ${filteredTests.length} test suite(s)`);
      }

      // 3. Ordenar por prioridade
      const orderedTests = this.priorityService.orderTests(filteredTests);

      // 4. Executar testes
      console.log(`\n▶️  Executing tests...`);
      const results = await this.executionService.executeTests(
        orderedTests,
        (stats) => this.updateStats(stats)
      );

      // 5. Generate comprehensive reports
      const endTime = new Date();
      const aggregatedResult = this.buildAggregatedResult(
        startTime,
        endTime,
        discoveredTests.length,
        results
      );

      console.log(`\n📊 Generating reports...`);
      await this.reportingService.generateReports(aggregatedResult);

      // 6. Print execution summary
      this.printExecutionSummary(aggregatedResult);

      // Trigger execution end hook
      await this.hooks.onExecutionEnd?.(aggregatedResult);

      return aggregatedResult;
    } catch (error) {
      await this.hooks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Performs test discovery in the configured directory
   *
   * Recursively searches for YAML files containing test suites and registers
   * each discovered test through configured hooks. Supports multiple file
   * patterns and excludes configured directories.
   *
   * @returns Promise that resolves to array of discovered test metadata
   * @private
   *
   * @example
   * ```typescript
   * // Example discovered test structure
   * const discoveredTest = {
   *   file_path: "./flows/auth/login-flow.yaml",
   *   suite_name: "User Authentication Tests",
   *   priority: "high",
   *   tags: ["auth", "smoke"],
   *   estimated_duration: 5000,
   *   dependencies: ["setup-flow.yaml"]
   * };
   * ```
   */
  private async discoverTests(): Promise<DiscoveredTest[]> {
    const tests = await this.testDiscovery.discoverTests();

    // Trigger hook for each discovered test
    for (const test of tests) {
      await this.hooks.onTestDiscovered?.(test);
    }

    this.stats.tests_discovered = tests.length;
    return tests;
  }

  /**
   * Applies configured filters to discovered tests
   *
   * Filters tests based on criteria defined in configuration such as priority,
   * suite names, tags, file patterns, and custom conditions. Supports complex
   * filtering logic with AND/OR operations.
   *
   * @param tests - Array of discovered tests to filter
   * @returns Filtered array of tests that meet the configured criteria
   * @private
   *
   * @example
   * ```typescript
   * // Filtering by priority and tags
   * const filters = {
   *   priority: ["high", "critical"],
   *   tags: ["smoke"],
   *   exclude_tags: ["slow"]
   * };
   * const filteredTests = this.applyFilters(discoveredTests);
   * ```
   */
  private applyFilters(tests: DiscoveredTest[]): DiscoveredTest[] {
    const filters = this.configManager.getRuntimeFilters();

    if (!filters || Object.keys(filters).length === 0) {
      return tests;
    }

    return tests.filter((test) => {
      // Filtro por prioridade
      if (filters.priorities && filters.priorities.length > 0) {
        if (!test.priority || !filters.priorities.includes(test.priority)) {
          return false;
        }
      }

      // Filtro por nome da suíte
      if (filters.suite_names && filters.suite_names.length > 0) {
        if (!filters.suite_names.includes(test.suite_name)) {
          return false;
        }
      }

      // Filtro por node_id
      if (filters.node_ids && filters.node_ids.length > 0) {
        if (!filters.node_ids.includes(test.node_id)) {
          return false;
        }
      }

      // Filtro por tags (precisa ler o arquivo YAML para obter as tags dos metadados)
      if (filters.tags && filters.tags.length > 0) {
        const testTags = this.getTestTags(test.file_path);
        if (!testTags || !filters.tags.some((tag: string) => testTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Obtém as tags de um teste a partir de seu arquivo YAML
   */
  private getTestTags(filePath: string): string[] {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const suite = yaml.load(fileContent) as any;

      return suite?.metadata?.tags || [];
    } catch (error) {
      console.warn(`Warning: Could not read tags from ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * Atualiza estatísticas de execução em tempo real
   *
   * Recebe atualizações das estatísticas durante a execução dos testes
   * e mantém o estado consolidado das métricas de performance.
   *
   * @param newStats - Objeto parcial com novas estatísticas para merge
   * @private
   */
  private updateStats(newStats: Partial<ExecutionStats>): void {
    this.stats = { ...this.stats, ...newStats };
  }

  /**
   * Constrói resultado agregado final com todas as métricas e estatísticas
   *
   * Consolida os resultados de todas as suítes executadas e calcula
   * métricas agregadas como taxa de sucesso, duração total, etc.
   *
   * @param startTime - Timestamp de início da execução
   * @param endTime - Timestamp de fim da execução
   * @param totalDiscovered - Número total de testes descobertos
   * @param suiteResults - Array com resultados de cada suíte executada
   * @returns Resultado agregado final
   * @private
   */
  private buildAggregatedResult(
    startTime: Date,
    endTime: Date,
    totalDiscovered: number,
    suiteResults: any[]
  ): AggregatedResult {
    const totalDuration = endTime.getTime() - startTime.getTime();
    const successful = suiteResults.filter(
      (r) => r.status === "success"
    ).length;
    const failed = suiteResults.filter((r) => r.status === "failure").length;
    const skipped = totalDiscovered - suiteResults.length;

    return {
      project_name: this.configManager.getConfig().project_name,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_duration_ms: totalDuration,
      total_tests: totalDiscovered,
      successful_tests: successful,
      failed_tests: failed,
      skipped_tests: skipped,
      success_rate:
        totalDiscovered > 0 ? (successful / totalDiscovered) * 100 : 0,
      suites_results: suiteResults,
      global_variables_final_state: this.globalVariables.getAllVariables(),
      performance_summary: this.executionService.getPerformanceSummary(),
    };
  }

  /**
   * Constrói resultado vazio quando nenhum teste é encontrado
   *
   * Retorna um resultado padrão com métricas zeradas para casos
   * onde não há testes para executar no diretório especificado.
   *
   * @param startTime - Timestamp de início da tentativa de execução
   * @param endTime - Timestamp de fim da tentativa de execução
   * @returns Resultado agregado com métricas zeradas
   * @private
   */
  private buildEmptyResult(startTime: Date, endTime: Date): AggregatedResult {
    return {
      project_name: this.configManager.getConfig().project_name,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_duration_ms: endTime.getTime() - startTime.getTime(),
      total_tests: 0,
      successful_tests: 0,
      failed_tests: 0,
      skipped_tests: 0,
      success_rate: 0,
      suites_results: [],
      global_variables_final_state: this.globalVariables.getAllVariables(),
    };
  }

  /**
   * Imprime resumo da execução
   */
  private printExecutionSummary(result: AggregatedResult): void {
    console.log(`\n📋 Execution Summary`);
    console.log(`════════════════════`);
    console.log(`⏱️  Duration: ${result.total_duration_ms}ms`);
    console.log(`📊 Success Rate: ${result.success_rate.toFixed(1)}%`);
    console.log(`✅ Successful: ${result.successful_tests}`);
    console.log(`❌ Failed: ${result.failed_tests}`);

    if (result.skipped_tests > 0) {
      console.log(`⏭️  Skipped: ${result.skipped_tests}`);
    }

    if (result.failed_tests > 0) {
      console.log(`\n💥 Failed Suites:`);
      result.suites_results
        .filter((suite) => suite.status === "failure")
        .forEach((suite) => {
          console.log(
            `   • ${suite.suite_name}: ${
              suite.error_message || "Unknown error"
            }`
          );
        });
    }

    // Performance summary
    if (result.performance_summary) {
      const perf = result.performance_summary;
      console.log(`\n🚀 Performance:`);
      console.log(`   • Requests: ${perf.total_requests}`);
      console.log(
        `   • Avg Response: ${perf.average_response_time_ms.toFixed(0)}ms`
      );
      console.log(`   • RPS: ${perf.requests_per_second.toFixed(1)}`);
    }

    console.log(``);
  }

  /**
   * Inicializa estatísticas de execução
   */
  private initializeStats(): ExecutionStats {
    return {
      tests_discovered: 0,
      tests_completed: 0,
      tests_successful: 0,
      tests_failed: 0,
      tests_skipped: 0,
      requests_made: 0,
      total_response_time_ms: 0,
    };
  }

  /**
   * Obtém configuração atual
   */
  getConfig() {
    return this.configManager.getConfig();
  }

  /**
   * Obtém estatísticas atuais
   */
  getStats(): ExecutionStats {
    return { ...this.stats };
  }

  /**
   * Execução em modo dry-run (apenas descoberta e ordenação)
   */
  async dryRun(): Promise<DiscoveredTest[]> {
    console.log(`\n🧪 Dry Run Mode - Flow Test Engine v1.0`);
    console.log(`📊 Project: ${this.configManager.getConfig().project_name}`);

    const discoveredTests = await this.discoverTests();
    const filteredTests = this.applyFilters(discoveredTests);
    const orderedTests = this.priorityService.orderTests(filteredTests);

    console.log(`\n📋 Execution Plan:`);
    orderedTests.forEach((test, index) => {
      console.log(
        `${(index + 1).toString().padStart(2)}. ${test.suite_name} (${
          test.priority || "medium"
        })`
      );
      console.log(`    📁 ${test.file_path}`);
    });

    return orderedTests;
  }
}
