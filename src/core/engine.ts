import { ConfigManager } from './config';
import { TestDiscovery } from './discovery';
import { GlobalVariablesService } from '../services/global-variables';
import { PriorityService } from '../services/priority';
import { ReportingService } from '../services/reporting';
import { ExecutionService } from '../services/execution';
import { 
  EngineExecutionOptions, 
  AggregatedResult, 
  EngineHooks, 
  ExecutionStats,
  DiscoveredTest 
} from '../types/engine.types';

/**
 * Motor principal do Flow Test Engine
 */
export class FlowTestEngine {
  private configManager: ConfigManager;
  private testDiscovery: TestDiscovery;
  private globalVariables: GlobalVariablesService;
  private priorityService: PriorityService;
  private reportingService: ReportingService;
  private executionService: ExecutionService;
  private hooks: EngineHooks;
  private stats: ExecutionStats;

  constructor(
    configFileOrOptions?: string | EngineExecutionOptions,
    hooks: EngineHooks = {}
  ) {
    // Normaliza parâmetros
    const options: EngineExecutionOptions = typeof configFileOrOptions === 'string' 
      ? { config_file: configFileOrOptions }
      : configFileOrOptions || {};

    this.hooks = hooks;
    this.stats = this.initializeStats();

    // Inicializa serviços em ordem de dependência
    this.configManager = new ConfigManager(options);
    this.testDiscovery = new TestDiscovery(this.configManager);
    this.globalVariables = new GlobalVariablesService(this.configManager);
    this.priorityService = new PriorityService(this.configManager);
    this.reportingService = new ReportingService(this.configManager);
    this.executionService = new ExecutionService(
      this.configManager,
      this.globalVariables,
      this.priorityService,
      this.hooks
    );
  }

  /**
   * Executa todos os testes descobertos
   */
  async run(): Promise<AggregatedResult> {
    const startTime = new Date();
    const config = this.configManager.getConfig();

    try {
      // Dispara hook de início
      await this.hooks.onExecutionStart?.(this.stats);

      console.log(`\n🚀 Flow Test Engine v2.0`);
      console.log(`📊 Project: ${config.project_name}`);
      console.log(`📁 Test Directory: ${config.test_directory}`);
      console.log(`⚙️  Execution Mode: ${config.execution!.mode}`);

      // 1. Descoberta de testes
      console.log(`\n🔍 Discovering tests...`);
      const discoveredTests = await this.discoverTests();
      
      if (discoveredTests.length === 0) {
        console.log(`❌ No tests found in ${config.test_directory}`);
        return this.buildEmptyResult(startTime, new Date());
      }

      console.log(`✅ Found ${discoveredTests.length} test suite(s)`);

      // 2. Aplicar filtros se houver
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

      // 5. Gerar relatórios
      const endTime = new Date();
      const aggregatedResult = this.buildAggregatedResult(
        startTime, 
        endTime, 
        discoveredTests.length,
        results
      );

      console.log(`\n📊 Generating reports...`);
      await this.reportingService.generateReports(aggregatedResult);

      // 6. Imprimir resumo
      this.printExecutionSummary(aggregatedResult);

      // Dispara hook de fim
      await this.hooks.onExecutionEnd?.(aggregatedResult);

      return aggregatedResult;

    } catch (error) {
      await this.hooks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Executa descoberta de testes
   */
  private async discoverTests(): Promise<DiscoveredTest[]> {
    const tests = await this.testDiscovery.discoverTests();
    
    // Dispara hook para cada teste descoberto
    for (const test of tests) {
      await this.hooks.onTestDiscovered?.(test);
    }

    this.stats.tests_discovered = tests.length;
    return tests;
  }

  /**
   * Aplica filtros configurados
   */
  private applyFilters(tests: DiscoveredTest[]): DiscoveredTest[] {
    const filters = this.configManager.getRuntimeFilters();
    
    if (!filters || Object.keys(filters).length === 0) {
      return tests;
    }

    return tests.filter(test => {
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

      // Outros filtros podem ser adicionados aqui

      return true;
    });
  }

  /**
   * Atualiza estatísticas de execução
   */
  private updateStats(newStats: Partial<ExecutionStats>): void {
    this.stats = { ...this.stats, ...newStats };
  }

  /**
   * Constrói resultado agregado
   */
  private buildAggregatedResult(
    startTime: Date,
    endTime: Date,
    totalDiscovered: number,
    suiteResults: any[]
  ): AggregatedResult {
    const totalDuration = endTime.getTime() - startTime.getTime();
    const successful = suiteResults.filter(r => r.status === 'success').length;
    const failed = suiteResults.filter(r => r.status === 'failure').length;
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
      success_rate: totalDiscovered > 0 ? (successful / totalDiscovered) * 100 : 0,
      suites_results: suiteResults,
      global_variables_final_state: this.globalVariables.getAllVariables(),
      performance_summary: this.executionService.getPerformanceSummary()
    };
  }

  /**
   * Constrói resultado vazio quando nenhum teste é encontrado
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
      global_variables_final_state: this.globalVariables.getAllVariables()
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
        .filter(suite => suite.status === 'failure')
        .forEach(suite => {
          console.log(`   • ${suite.suite_name}: ${suite.error_message || 'Unknown error'}`);
        });
    }

    // Performance summary
    if (result.performance_summary) {
      const perf = result.performance_summary;
      console.log(`\n🚀 Performance:`);
      console.log(`   • Requests: ${perf.total_requests}`);
      console.log(`   • Avg Response: ${perf.average_response_time_ms.toFixed(0)}ms`);
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
      total_response_time_ms: 0
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
    console.log(`\n🧪 Dry Run Mode - Flow Test Engine v2.0`);
    console.log(`📊 Project: ${this.configManager.getConfig().project_name}`);
    
    const discoveredTests = await this.discoverTests();
    const filteredTests = this.applyFilters(discoveredTests);
    const orderedTests = this.priorityService.orderTests(filteredTests);

    console.log(`\n📋 Execution Plan:`);
    orderedTests.forEach((test, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${test.suite_name} (${test.priority || 'medium'})`);
      console.log(`    📁 ${test.file_path}`);
    });

    return orderedTests;
  }
}