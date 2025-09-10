import fs from 'fs';
import yaml from 'js-yaml';
import { ConfigManager } from '../core/config';
import { GlobalVariablesService } from './global-variables';
import { PriorityService } from './priority';
import { HttpService } from './http.service';
import { AssertionService } from './assertion.service';
import { CaptureService } from './capture.service';
import { 
  DiscoveredTest, 
  TestSuite, 
  SuiteExecutionResult, 
  StepExecutionResult,
  ExecutionStats,
  EngineHooks,
  PerformanceSummary
} from '../types/engine.types';

/**
 * Serviço de execução de testes
 */
export class ExecutionService {
  private configManager: ConfigManager;
  private globalVariables: GlobalVariablesService;
  private priorityService: PriorityService;
  private hooks: EngineHooks;
  
  // Serviços reutilizados da versão anterior
  private httpService: HttpService;
  private assertionService: AssertionService;
  private captureService: CaptureService;

  // Estatísticas de performance
  private performanceData: {
    requests: Array<{
      url: string;
      method: string;
      duration_ms: number;
      status_code: number;
    }>;
    start_time: number;
  };

  constructor(
    configManager: ConfigManager,
    globalVariables: GlobalVariablesService,
    priorityService: PriorityService,
    hooks: EngineHooks = {}
  ) {
    this.configManager = configManager;
    this.globalVariables = globalVariables;
    this.priorityService = priorityService;
    this.hooks = hooks;

    const config = configManager.getConfig();
    
    // Inicializa serviços HTTP com configuração global
    this.httpService = new HttpService(
      config.globals?.base_url,
      config.execution?.timeout || config.globals?.timeouts?.default || 30000
    );
    this.assertionService = new AssertionService();
    this.captureService = new CaptureService();

    this.performanceData = {
      requests: [],
      start_time: Date.now()
    };
  }

  /**
   * Executa lista de testes descobertos
   */
  async executeTests(
    tests: DiscoveredTest[],
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const config = this.configManager.getConfig();
    const results: SuiteExecutionResult[] = [];
    
    let stats: ExecutionStats = {
      tests_discovered: tests.length,
      tests_completed: 0,
      tests_successful: 0,
      tests_failed: 0,
      tests_skipped: 0,
      requests_made: 0,
      total_response_time_ms: 0
    };

    // Execução sequencial ou paralela baseada na configuração
    if (config.execution!.mode === 'parallel') {
      const parallelResults = await this.executeTestsInParallel(tests, stats, onStatsUpdate);
      results.push(...parallelResults);
    } else {
      const sequentialResults = await this.executeTestsSequentially(tests, stats, onStatsUpdate);
      results.push(...sequentialResults);
    }

    return results;
  }

  /**
   * Executa testes sequencialmente
   */
  private async executeTestsSequentially(
    tests: DiscoveredTest[],
    stats: ExecutionStats,
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const config = this.configManager.getConfig();
    const results: SuiteExecutionResult[] = [];

    for (const test of tests) {
      stats.current_test = test.suite_name;
      onStatsUpdate?.(stats);

      try {
        const result = await this.executeSingleTest(test);
        results.push(result);

        // Atualiza estatísticas
        stats.tests_completed++;
        if (result.status === 'success') {
          stats.tests_successful++;
        } else if (result.status === 'failure') {
          stats.tests_failed++;
          
          // Verifica se deve parar em falha de teste obrigatório
          if (this.priorityService.isRequiredTest(test) && config.priorities!.fail_fast_on_required) {
            console.log(`🛑 Stopping execution due to failure in required test: ${test.suite_name}`);
            break;
          }
        } else {
          stats.tests_skipped++;
        }

        onStatsUpdate?.(stats);

      } catch (error) {
        console.error(`💥 Unexpected error executing ${test.suite_name}: ${error}`);
        
        const errorResult: SuiteExecutionResult = {
          suite_name: test.suite_name,
          file_path: test.file_path,
          priority: test.priority,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: 0,
          status: 'failure',
          steps_executed: 0,
          steps_successful: 0,
          steps_failed: 1,
          success_rate: 0,
          steps_results: [],
          error_message: `Unexpected error: ${error}`,
          variables_captured: {}
        };

        results.push(errorResult);
        stats.tests_completed++;
        stats.tests_failed++;
        onStatsUpdate?.(stats);
      }
    }

    return results;
  }

  /**
   * Executa testes em paralelo (implementação simplificada)
   */
  private async executeTestsInParallel(
    tests: DiscoveredTest[],
    stats: ExecutionStats,
    onStatsUpdate?: (stats: ExecutionStats) => void
  ): Promise<SuiteExecutionResult[]> {
    const config = this.configManager.getConfig();
    const maxParallel = config.execution!.max_parallel || 5;
    
    // Agrupa testes em batches para execução paralela
    const batches: DiscoveredTest[][] = [];
    for (let i = 0; i < tests.length; i += maxParallel) {
      batches.push(tests.slice(i, i + maxParallel));
    }

    const results: SuiteExecutionResult[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(test => this.executeSingleTest(test));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const test = batch[index];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
          
          stats.tests_completed++;
          if (result.value.status === 'success') {
            stats.tests_successful++;
          } else if (result.value.status === 'failure') {
            stats.tests_failed++;
          } else {
            stats.tests_skipped++;
          }
        } else {
          // Tratamento de erro na execução paralela
          const errorResult: SuiteExecutionResult = {
            suite_name: test.suite_name,
            file_path: test.file_path,
            priority: test.priority,
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            duration_ms: 0,
            status: 'failure',
            steps_executed: 0,
            steps_successful: 0,
            steps_failed: 1,
            success_rate: 0,
            steps_results: [],
            error_message: `Parallel execution error: ${result.reason}`,
            variables_captured: {}
          };

          results.push(errorResult);
          stats.tests_completed++;
          stats.tests_failed++;
        }
      });

      onStatsUpdate?.(stats);
    }

    return results;
  }

  /**
   * Executa um único teste
   */
  private async executeSingleTest(discoveredTest: DiscoveredTest): Promise<SuiteExecutionResult> {
    const startTime = new Date();

    try {
      // Carrega a suíte de teste
      const suite = await this.loadTestSuite(discoveredTest.file_path);
      
      // Dispara hook de início da suíte
      await this.hooks.onSuiteStart?.(suite);

      // Configura variáveis da suíte
      if (suite.variables) {
        this.globalVariables.setSuiteVariables(suite.variables);
      }

      // Interpola e configura base_url da suíte se especificado
      if (suite.base_url) {
        const interpolatedBaseUrl = this.globalVariables.interpolateString(suite.base_url);
        this.httpService = new HttpService(
          interpolatedBaseUrl,
          this.configManager.getConfig().execution?.timeout || 30000
        );
      }

      // Executa todos os steps
      const stepResults: StepExecutionResult[] = [];
      let successfulSteps = 0;
      let failedSteps = 0;

      for (let i = 0; i < suite.steps.length; i++) {
        const step = suite.steps[i];
        
        try {
          const stepResult = await this.executeStep(step, suite, i);
          stepResults.push(stepResult);

          if (stepResult.status === 'success') {
            successfulSteps++;
          } else if (stepResult.status === 'failure') {
            failedSteps++;
            
            // Verifica se deve continuar após falha
            if (!step.continue_on_failure && !this.configManager.getConfig().execution!.continue_on_failure) {
              break;
            }
          }

          // Atualiza variáveis capturadas globalmente
          if (stepResult.captured_variables) {
            this.globalVariables.setRuntimeVariables(stepResult.captured_variables);
          }

        } catch (error) {
          console.error(`💥 Error in step '${step.name}': ${error}`);
          
          const errorStepResult: StepExecutionResult = {
            step_name: step.name,
            status: 'failure',
            duration_ms: 0,
            error_message: `Step execution error: ${error}`,
            captured_variables: {}
          };
          
          stepResults.push(errorStepResult);
          failedSteps++;
          
          if (!step.continue_on_failure && !this.configManager.getConfig().execution!.continue_on_failure) {
            break;
          }
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const totalSteps = stepResults.length;
      const successRate = totalSteps > 0 ? (successfulSteps / totalSteps) * 100 : 0;

      const result: SuiteExecutionResult = {
        suite_name: suite.suite_name,
        file_path: discoveredTest.file_path,
        priority: discoveredTest.priority,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: duration,
        status: failedSteps === 0 ? 'success' : 'failure',
        steps_executed: totalSteps,
        steps_successful: successfulSteps,
        steps_failed: failedSteps,
        success_rate: Math.round(successRate * 100) / 100,
        steps_results: stepResults,
        variables_captured: this.globalVariables.getVariablesByScope('runtime')
      };

      // Dispara hook de fim da suíte
      await this.hooks.onSuiteEnd?.(suite, result);

      return result;

    } catch (error) {
      const endTime = new Date();
      
      const errorResult: SuiteExecutionResult = {
        suite_name: discoveredTest.suite_name,
        file_path: discoveredTest.file_path,
        priority: discoveredTest.priority,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: endTime.getTime() - startTime.getTime(),
        status: 'failure',
        steps_executed: 0,
        steps_successful: 0,
        steps_failed: 1,
        success_rate: 0,
        steps_results: [],
        error_message: `Suite loading error: ${error}`,
        variables_captured: {}
      };

      return errorResult;
    }
  }

  /**
   * Executa um step individual
   */
  private async executeStep(
    step: any,
    suite: TestSuite,
    stepIndex: number
  ): Promise<StepExecutionResult> {
    const stepStartTime = Date.now();

    // Dispara hook de início do step
    const context = {
      suite,
      global_variables: this.globalVariables.getAllVariables(),
      runtime_variables: this.globalVariables.getVariablesByScope('runtime'),
      step_index: stepIndex,
      total_steps: suite.steps.length,
      start_time: new Date(),
      execution_id: `${suite.suite_name}_${stepIndex}`
    };

    await this.hooks.onStepStart?.(step, context);

    try {
      // 1. Interpola variáveis na requisição
      const interpolatedRequest = this.globalVariables.interpolate(step.request);

      // 2. Executa requisição HTTP
      const httpResult = await this.httpService.executeRequest(step.name, interpolatedRequest);
      
      // Registra dados de performance
      this.recordPerformanceData(interpolatedRequest, httpResult);

      // 3. Executa assertions
      let assertionResults: any[] = [];
      if (step.assert && httpResult.response_details) {
        assertionResults = this.assertionService.validateAssertions(step.assert, httpResult);
        httpResult.assertions_results = assertionResults;

        const failedAssertions = assertionResults.filter(a => !a.passed);
        if (failedAssertions.length > 0) {
          httpResult.status = 'failure';
          httpResult.error_message = `${failedAssertions.length} assertion(s) failed`;
        }
      }

      // 4. Captura variáveis
      let capturedVariables: Record<string, any> = {};
      if (step.capture && httpResult.response_details) {
        capturedVariables = this.captureService.captureVariables(step.capture, httpResult);
        httpResult.captured_variables = capturedVariables;
      }

      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      const stepResult: StepExecutionResult = {
        step_name: step.name,
        status: httpResult.status,
        duration_ms: stepDuration,
        request_details: httpResult.request_details,
        response_details: httpResult.response_details,
        assertions_results: assertionResults,
        captured_variables: capturedVariables,
        error_message: httpResult.error_message
      };

      // Dispara hook de fim do step
      await this.hooks.onStepEnd?.(step, stepResult, context);

      return stepResult;

    } catch (error) {
      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      const errorResult: StepExecutionResult = {
        step_name: step.name,
        status: 'failure',
        duration_ms: stepDuration,
        error_message: `Step execution error: ${error}`,
        captured_variables: {}
      };

      // Dispara hook de fim do step mesmo com erro
      await this.hooks.onStepEnd?.(step, errorResult, context);

      return errorResult;
    }
  }

  /**
   * Carrega uma suíte de teste a partir do arquivo
   */
  private async loadTestSuite(filePath: string): Promise<TestSuite> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const suite = yaml.load(fileContent) as TestSuite;
      
      if (!suite || !suite.suite_name) {
        throw new Error('Invalid test suite: missing suite_name');
      }

      return suite;
    } catch (error) {
      throw new Error(`Failed to load test suite from ${filePath}: ${error}`);
    }
  }

  /**
   * Registra dados de performance
   */
  private recordPerformanceData(request: any, result: any): void {
    if (result.response_details) {
      this.performanceData.requests.push({
        url: request.url,
        method: request.method,
        duration_ms: result.duration_ms || 0,
        status_code: result.response_details.status_code
      });
    }
  }

  /**
   * Gera resumo de performance
   */
  getPerformanceSummary(): PerformanceSummary | undefined {
    const requests = this.performanceData.requests;
    
    if (requests.length === 0) {
      return undefined;
    }

    const totalTime = requests.reduce((sum, req) => sum + req.duration_ms, 0);
    const avgTime = totalTime / requests.length;
    const minTime = Math.min(...requests.map(r => r.duration_ms));
    const maxTime = Math.max(...requests.map(r => r.duration_ms));
    
    const totalExecutionTime = Date.now() - this.performanceData.start_time;
    const rps = (requests.length / totalExecutionTime) * 1000;

    // Calcula endpoints mais lentos
    const endpointStats = new Map<string, { total: number; count: number }>();
    requests.forEach(req => {
      const key = `${req.method} ${req.url}`;
      const current = endpointStats.get(key) || { total: 0, count: 0 };
      current.total += req.duration_ms;
      current.count += 1;
      endpointStats.set(key, current);
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([url, stats]) => ({
        url,
        average_time_ms: stats.total / stats.count,
        call_count: stats.count
      }))
      .sort((a, b) => b.average_time_ms - a.average_time_ms)
      .slice(0, 5);

    return {
      total_requests: requests.length,
      average_response_time_ms: Math.round(avgTime * 100) / 100,
      min_response_time_ms: minTime,
      max_response_time_ms: maxTime,
      requests_per_second: Math.round(rps * 100) / 100,
      slowest_endpoints: slowestEndpoints
    };
  }
}