/**
 * @fileoverview Main Flow Test Engine orchestrator and execution coordinator.
 *
 * @remarks
 * This module contains the FlowTestEngine class, which serves as the primary orchestrator
 * for the Flow Test framework. It manages the complete test execution lifecycle including
 * discovery, filtering, dependency resolution, execution, and reporting.
 *
 * @packageDocumentation
 */

import fs from "fs";
import yaml from "js-yaml";
import { Container } from "inversify";
import { createContainer } from "../di/container";
import { TYPES } from "../di/identifiers";
import { ConfigManager } from "./config";
import { TestDiscovery } from "./discovery";
import { ReportingService } from "../services/reporting";
import { getLogger } from "../services/logger.service";
import type { IConfigManager } from "../interfaces/services/IConfigManager";
import type { IVariableService } from "../interfaces/services/IVariableService";
import type { IPriorityService } from "../interfaces/services/IPriorityService";
import type { IDependencyService } from "../interfaces/services/IDependencyService";
import type { IGlobalRegistryService } from "../interfaces/services/IGlobalRegistryService";
import type { IExecutionService } from "../interfaces/services/IExecutionService";
import type { ILogger } from "../interfaces/services/ILogger";
import {
  EngineExecutionOptions,
  AggregatedResult,
  SuiteExecutionResult,
  EngineHooks,
  ExecutionStats,
  DiscoveredTest,
} from "../types/engine.types";

/**
 * Primary orchestrator for the Flow Test Engine framework.
 *
 * @remarks
 * The FlowTestEngine is the central class responsible for coordinating the entire test execution
 * lifecycle in the Flow Test framework. It manages complex test workflows including multi-directory
 * test discovery, priority-based execution ordering, dependency resolution between flows,
 * global variable management, parallel execution, and comprehensive reporting.
 *
 * **Core Capabilities:**
 * - **Test Discovery**: Scans directories for YAML test files using configurable patterns
 * - **Dependency Management**: Resolves and executes inter-test dependencies
 * - **Priority Execution**: Orders tests by priority levels (critical, high, medium, low)
 * - **Global Variables**: Manages variable sharing between test suites
 * - **Parallel Execution**: Supports concurrent test execution with configurable workers
 * - **Comprehensive Reporting**: Generates HTML and JSON reports with detailed metrics
 * - **Lifecycle Hooks**: Provides monitoring and extension points throughout execution
 *
 * @example Basic test execution
 * ```typescript
 * import { FlowTestEngine } from 'flow-test-engine';
 *
 * const engine = new FlowTestEngine('./flow-test.config.yml');
 * const result = await engine.run();
 *
 * if (result.success_rate >= 95) {
 *   console.log('✅ All tests passed successfully!');
 *   process.exit(0);
 * } else {
 *   console.log(`❌ ${result.failed_tests} tests failed`);
 *   process.exit(1);
 * }
 * ```
 *
 * @example Advanced execution with monitoring hooks
 * ```typescript
 * const engine = new FlowTestEngine('./config.yml', {
 *   onExecutionStart: (stats) => {
 *     console.log(`🚀 Starting ${stats.tests_discovered} test suites`);
 *   },
 *   onSuiteStart: (suite) => {
 *     console.log(`▶️ Executing: ${suite.suite_name}`);
 *   },
 *   onSuiteEnd: (suite, result) => {
 *     const status = result.status === 'success' ? '✅' : '❌';
 *     console.log(`${status} ${suite.suite_name} (${result.duration_ms}ms)`);
 *   },
 *   onExecutionEnd: (result) => {
 *     console.log(`🏁 Completed: ${result.success_rate.toFixed(1)}% success rate`);
 *   }
 * });
 *
 * const result = await engine.run();
 * ```
 *
 * @example Programmatic configuration
 * ```typescript
 * const engine = new FlowTestEngine({
 *   project_name: 'My API Tests',
 *   test_directory: './api-tests',
 *   verbosity: 'verbose',
 *   execution: {
 *     mode: 'parallel',
 *     max_workers: 4,
 *     fail_fast: true
 *   },
 *   filters: {
 *     priorities: ['high', 'critical'],
 *     tags: ['smoke']
 *   }
 * });
 * ```
 *
 * @example Dry run for validation and planning
 * ```typescript
 * const engine = new FlowTestEngine('./config.yml');
 * const discoveredTests = await engine.dryRun();
 *
 * console.log('📋 Execution Plan:');
 * discoveredTests.forEach((test, index) => {
 *   console.log(`${index + 1}. ${test.suite_name} (${test.priority})`);
 *   console.log(`   📁 ${test.file_path}`);
 *   if (test.depends?.length) {
 *     const dependencyNodeIds = test.depends
 *       .map((dependency) => dependency.node_id)
 *       .filter(Boolean)
 *       .join(', ');
 *     console.log(`   🔗 Dependencies: ${dependencyNodeIds}`);
 *   }
 * });
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class FlowTestEngine {
  /** DI Container for service resolution */
  private container: Container;

  /** Configuration manager responsible for loading and validating configurations */
  private configManager: IConfigManager;

  /** Discovery service responsible for locating test files */
  private testDiscovery: TestDiscovery;

  /** Global variables management service for inter-suite communication */
  private globalVariables: IVariableService;

  /** Priority-based sorting and execution service */
  private priorityService: IPriorityService;

  /** Dependency management service for test interdependencies */
  private dependencyService: IDependencyService;

  /** Global registry for exported variables between flows */
  private globalRegistry: IGlobalRegistryService;

  /** Report generation service */
  private reportingService: ReportingService;

  /** Main test execution service */
  private executionService: IExecutionService;

  /** Logger service */
  private logger: ILogger;

  /** Custom hooks for lifecycle events */
  private hooks: EngineHooks;

  /** Real-time execution statistics */
  private stats: ExecutionStats;

  /** Engine execution options */
  private executionOptions: EngineExecutionOptions;

  /**
   * Creates a new FlowTestEngine instance
   *
   * Initializes all necessary services for test execution in the correct dependency order.
   * The constructor sets up the complete testing infrastructure including configuration
   * management, test discovery, variable handling, dependency resolution, and reporting.
   *
   * Services are initialized in dependency order to ensure proper functionality:
   * 1. ConfigManager - loads and validates configuration
   * 2. TestDiscovery - handles test file discovery
   * 3. DependencyService - manages inter-test dependencies
   * 4. GlobalRegistryService - handles global state management
   * 5. GlobalVariablesService - manages variable interpolation
   * 6. PriorityService - handles test ordering
   * 7. ReportingService - generates execution reports
   * 8. ExecutionService - orchestrates test execution
   *
   * @param configFileOrOptions - Path to YAML configuration file or direct options object
   * @param hooks - Optional lifecycle event hooks for monitoring and extending functionality
   *
   * @example Constructor with configuration file
   * ```typescript
   * // Basic usage with config file
   * const engine = new FlowTestEngine('./flow-test.config.yml');
   *
   * // Alternative config file locations
   * const engine2 = new FlowTestEngine('./configs/production.yml');
   * const engine3 = new FlowTestEngine('~/my-project/test-config.yaml');
   * ```
   *
   * @example Constructor with direct configuration object
   * ```typescript
   * const engine = new FlowTestEngine({
   *   project_name: 'E-commerce API Tests',
   *   test_directory: './tests/api',
   *   verbosity: 'verbose',
   *   execution: {
   *     mode: 'parallel',
   *     max_workers: 4,
   *     fail_fast: true,
   *     timeout_ms: 30000
   *   },
   *   reporting: {
   *     formats: ['json'],
   *     output_directory: './test-reports'
   *   },
   *   filters: {
   *     priorities: ['high', 'critical'],
   *     tags: ['smoke', 'regression']
   *   }
   * });
   * ```
   *
   * @example Constructor with comprehensive lifecycle hooks
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml', {
   *   onExecutionStart: (stats) => {
   *     console.log(`🚀 Starting execution of ${stats.tests_discovered} test suites`);
   *     // Initialize monitoring, start timers, etc.
   *   },
   *   onTestDiscovered: (test) => {
   *     console.log(`🔍 Discovered: ${test.suite_name} (${test.file_path})`);
   *   },
   *   onSuiteStart: (suite) => {
   *     console.log(`▶️ Starting suite: ${suite.suite_name}`);
   *     // Log to external monitoring system
   *   },
   *   onSuiteEnd: (suite, result) => {
   *     const emoji = result.status === 'success' ? '✅' : '❌';
   *     console.log(`${emoji} ${suite.suite_name}: ${result.success_rate.toFixed(1)}%`);
   *   },
   *   onExecutionEnd: (result) => {
   *     console.log(`🏁 Execution completed: ${result.success_rate.toFixed(1)}% success`);
   *     // Send results to monitoring/notification systems
   *   },
   *   onError: (error) => {
   *     console.error('💥 Execution failed:', error.message);
   *     // Send error notifications
   *   }
   * });
   * ```
   *
   * @throws {Error} When configuration file is invalid or required services fail to initialize
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
    this.executionOptions = options;

    // Create DI container
    this.container = createContainer();

    // Bind execution options and hooks to container (runtime values)
    this.container.bind<EngineHooks>("EngineHooks").toConstantValue(hooks);
    this.container
      .bind<EngineExecutionOptions>("EngineExecutionOptions")
      .toConstantValue(options);

    // Get logger first
    this.logger = this.container.get<ILogger>(TYPES.ILogger);

    // Override ConfigManager with runtime options
    this.container.unbind(TYPES.IConfigManager);
    this.container
      .bind<IConfigManager>(TYPES.IConfigManager)
      .toConstantValue(new ConfigManager(options));

    // Resolve services from DI container
    this.configManager = this.container.get<IConfigManager>(
      TYPES.IConfigManager
    );
    this.globalRegistry = this.container.get<IGlobalRegistryService>(
      TYPES.IGlobalRegistryService
    );
    this.globalVariables = this.container.get<IVariableService>(
      TYPES.IVariableService
    );
    this.priorityService = this.container.get<IPriorityService>(
      TYPES.IPriorityService
    );
    this.dependencyService = this.container.get<IDependencyService>(
      TYPES.IDependencyService
    );
    this.executionService = this.container.get<IExecutionService>(
      TYPES.IExecutionService
    );

    // Services not yet in DI container
    this.testDiscovery = new TestDiscovery(this.configManager as ConfigManager);
    this.reportingService = new ReportingService(
      this.configManager as ConfigManager
    );

    this.logger.debug("FlowTestEngine initialized with DI container");
  }

  /**
   * Executes all discovered tests in the configured directory
   *
   * This is the primary method for running test suites. It orchestrates the complete
   * test execution lifecycle through well-defined phases, ensuring proper dependency
   * resolution, parallel execution, and comprehensive reporting.
   *
   * **Execution Phases:**
   * 1. **Discovery Phase** - Recursively scans configured directories for YAML test files
   * 2. **Filtering Phase** - Applies runtime filters based on tags, priority, and patterns
   * 3. **Dependency Resolution** - Analyzes and resolves inter-test dependencies
   * 4. **Ordering Phase** - Sorts tests by priority and dependency requirements
   * 5. **Execution Phase** - Runs tests with configured parallelism and worker management
   * 6. **Reporting Phase** - Generates HTML reports and JSON artifacts
   *
   * The method provides comprehensive error handling, real-time progress monitoring through
   * lifecycle hooks, and detailed performance metrics collection.
   *
   * @returns Promise that resolves to aggregated execution results with comprehensive metrics
   * @throws {Error} When critical failures occur during configuration, discovery, or execution
   *
   * @example Basic execution with result handling
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml');
   * const result = await engine.run();
   *
   * console.log(`📊 Execution Summary:`);
   * console.log(`   Duration: ${result.total_duration_ms}ms`);
   * console.log(`   Success Rate: ${result.success_rate.toFixed(1)}%`);
   * console.log(`   Total Tests: ${result.total_tests}`);
   * console.log(`   Successful: ${result.successful_tests}`);
   * console.log(`   Failed: ${result.failed_tests}`);
   *
   * // Exit with appropriate code for CI/CD
   * process.exit(result.failed_tests > 0 ? 1 : 0);
   * ```
   *
   * @example Advanced execution with error handling and monitoring
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml');
   *
   * try {
   *   const result = await engine.run();
   *
   *   // Analyze performance metrics
   *   if (result.performance_summary) {
   *     const perf = result.performance_summary;
   *     console.log(`🚀 Performance Metrics:`);
   *     console.log(`   Total Requests: ${perf.total_requests}`);
   *     console.log(`   Average Response Time: ${perf.average_response_time_ms.toFixed(0)}ms`);
   *     console.log(`   Requests Per Second: ${perf.requests_per_second.toFixed(1)}`);
   *   }
   *
   *   // Check specific suite failures
   *   const failedSuites = result.suites_results.filter(s => s.status === 'failure');
   *   if (failedSuites.length > 0) {
   *     console.log('\n💥 Failed Test Suites:');
   *     failedSuites.forEach(suite => {
   *       console.log(`   • ${suite.suite_name}: ${suite.error_message}`);
   *     });
   *   }
   *
   *   // Access global variables final state
   *   console.log('🔗 Global Variables:', result.global_variables_final_state);
   *
   * } catch (error) {
   *   console.error('❌ Execution failed:', error.message);
   *   process.exit(1);
   * }
   * ```
   *
   * @example Conditional execution based on results
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml');
   * const result = await engine.run();
   *
   * if (result.success_rate >= 95) {
   *   console.log('✅ All tests passed - proceeding with deployment');
   *   await deployApplication();
   * } else if (result.success_rate >= 80) {
   *   console.log('⚠️ Some tests failed - requires review');
   *   await notifyTeam(result);
   * } else {
   *   console.log('❌ Critical test failures - blocking deployment');
   *   throw new Error(`Test success rate too low: ${result.success_rate}%`);
   * }
   * ```
   */
  async run(): Promise<AggregatedResult> {
    const startTime = new Date();
    const config = this.configManager.getConfig();

    try {
      // Trigger execution start hook
      await this.hooks.onExecutionStart?.(this.stats);

      const logger = getLogger();
      logger.info(`\n🚀 Flow Test Engine v1.0`);
      logger.info(`📊 Project: ${config.project_name}`);
      logger.info(`📁 Test Directory: ${config.test_directory}`);
      logger.info(`⚙️  Execution Mode: ${config.execution!.mode}`);

      // 1. Test Discovery Phase
      logger.info(`\n🔍 Discovering tests...`);
      const discoveredTests = await this.discoverTests();

      if (discoveredTests.length === 0) {
        logger.info(`❌ No tests found in ${config.test_directory}`);
        return this.buildEmptyResult(startTime, new Date());
      }

      logger.info(`✅ Found ${discoveredTests.length} test suite(s)`);

      // 2. Apply filters if configured
      const filteredTests = this.applyFilters(discoveredTests);
      if (filteredTests.length !== discoveredTests.length) {
        logger.info(`🔽 Filtered to ${filteredTests.length} test suite(s)`);
      }

      // 3. Ordenar por prioridade
      const orderedTests = this.priorityService.orderTests(filteredTests);

      // 4. Executar testes
      logger.info(`\n▶️  Executing tests...`);
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

      logger.info(`\n📊 Generating reports...`);
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
   *   depends: [
   *     {
   *       node_id: "setup-flow",
   *       required: true
   *     }
   *   ]
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
        if (
          !testTags ||
          !filters.tags.some((tag: string) => testTags.includes(tag))
        ) {
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
      const fileContent = fs.readFileSync(filePath, "utf8");
      const suite = yaml.load(fileContent) as any;

      return suite?.metadata?.tags || [];
    } catch (error) {
      getLogger().warn(
        `Warning: Could not read tags from ${filePath}: ${error}`
      );
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
    suiteResults: SuiteExecutionResult[]
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
    const logger = getLogger();
    logger.info(`\n📋 Execution Summary`);
    logger.info(`════════════════════`);
    logger.info(`⏱️  Duration: ${result.total_duration_ms}ms`);
    logger.info(`📊 Success Rate: ${result.success_rate.toFixed(1)}%`);
    logger.info(`✅ Successful: ${result.successful_tests}`);
    logger.info(`❌ Failed: ${result.failed_tests}`);

    if (result.skipped_tests > 0) {
      logger.info(`⏭️  Skipped: ${result.skipped_tests}`);
    }

    if (result.failed_tests > 0) {
      logger.info(`\n💥 Failed Suites:`);
      result.suites_results
        .filter((suite) => suite.status === "failure")
        .forEach((suite) => {
          logger.info(
            `   • ${suite.suite_name}: ${
              suite.error_message || "Unknown error"
            }`
          );
        });
    }

    // Performance summary
    if (result.performance_summary) {
      const perf = result.performance_summary;
      logger.info(`\n🚀 Performance:`);
      logger.info(`   • Requests: ${perf.total_requests}`);
      logger.info(
        `   • Avg Response: ${perf.average_response_time_ms.toFixed(0)}ms`
      );
      logger.info(`   • RPS: ${perf.requests_per_second.toFixed(1)}`);
    }

    logger.info(``);
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
   * Gets the current engine configuration
   *
   * Returns the complete configuration object including all loaded settings,
   * defaults, and runtime overrides. Useful for debugging and conditional logic.
   *
   * @returns The complete configuration object currently in use
   *
   * @example Inspecting current configuration
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml');
   * const config = engine.getConfig();
   *
   * console.log(`Project: ${config.project_name}`);
   * console.log(`Test Directory: ${config.test_directory}`);
   * console.log(`Execution Mode: ${config.execution?.mode}`);
   * console.log(`Max Workers: ${config.execution?.max_workers}`);
   * ```
   *
   * @public
   */
  getConfig() {
    return this.configManager.getConfig();
  }

  /**
   * Gets current execution statistics
   *
   * Returns real-time statistics about the current or completed test execution,
   * including discovery, completion, success/failure counts, and performance metrics.
   *
   * @returns Copy of current execution statistics
   *
   * @example Monitoring execution progress
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml');
   *
   * // Start execution (non-blocking example)
   * const executionPromise = engine.run();
   *
   * // Monitor progress in separate interval
   * const monitor = setInterval(() => {
   *   const stats = engine.getStats();
   *   console.log(`Progress: ${stats.tests_completed}/${stats.tests_discovered}`);
   *   console.log(`Success Rate: ${(stats.tests_successful/stats.tests_completed * 100).toFixed(1)}%`);
   * }, 1000);
   *
   * await executionPromise;
   * clearInterval(monitor);
   * ```
   *
   * @public
   */
  getStats(): ExecutionStats {
    return { ...this.stats };
  }

  /**
   * Performs a dry run execution (discovery and planning only)
   *
   * Executes only the discovery, filtering, dependency resolution, and ordering phases
   * without actually running HTTP requests. Useful for validating test configuration,
   * checking dependency chains, and previewing execution order.
   *
   * @returns Promise that resolves to array of discovered and ordered tests
   * @throws {Error} When configuration is invalid or test discovery fails
   *
   * @example Validating test configuration
   * ```typescript
   * const engine = new FlowTestEngine('./config.yml');
   * const tests = await engine.dryRun();
   *
   * console.log(`📋 Execution Plan (${tests.length} tests):`);
   * tests.forEach((test, index) => {
   *   console.log(`${index + 1}. ${test.suite_name} (${test.priority || 'medium'})`);
   *   console.log(`   📁 ${test.file_path}`);
   *
   *   const dependencyNodeIds = test.depends
   *     ?.map((dependency) => dependency.node_id)
   *     .filter(Boolean);
   *
   *   if (dependencyNodeIds?.length) {
   *     console.log(`   🔗 Dependencies: ${dependencyNodeIds.join(', ')}`);
   *   }
   *
   *   if (test.tags?.length) {
   *     console.log(`   🏷️  Tags: ${test.tags.join(', ')}`);
   *   }
   * });
   * ```
   *
   * @example Checking dependency chains
   * ```typescript
   * const tests = await engine.dryRun();
   * const dependencyMap = new Map();
   *
   * tests.forEach(test => {
   *   const dependencyNodeIds = test.depends
   *     ?.map((dependency) => dependency.node_id)
   *     .filter(Boolean);
   *
   *   if (dependencyNodeIds?.length) {
   *     dependencyMap.set(test.suite_name, dependencyNodeIds);
   *   }
   * });
   *
   * console.log('🔗 Dependency Analysis:');
   * for (const [suite, deps] of dependencyMap) {
   *   console.log(`${suite} depends on: ${deps.join(', ')}`);
   * }
   * ```
   *
   * @public
   */
  async dryRun(): Promise<DiscoveredTest[]> {
    const logger = getLogger();
    logger.info(`\n🧪 Dry Run Mode - Flow Test Engine v1.0`);
    logger.info(`📊 Project: ${this.configManager.getConfig().project_name}`);

    const discoveredTests = await this.discoverTests();
    const filteredTests = this.applyFilters(discoveredTests);
    const orderedTests = this.priorityService.orderTests(filteredTests);

    logger.info(`\n📋 Execution Plan:`);
    orderedTests.forEach((test, index) => {
      logger.info(
        `${(index + 1).toString().padStart(2)}. ${test.suite_name} (${
          test.priority || "medium"
        })`
      );
      logger.info(`    📁 ${test.file_path}`);
    });

    return orderedTests;
  }
}
