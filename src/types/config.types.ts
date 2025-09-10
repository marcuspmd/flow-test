/**
 * Configuração global do Flow Test Engine
 */
export interface EngineConfig {
  project_name: string;
  test_directory: string;
  globals?: GlobalConfig;
  discovery?: DiscoveryConfig;
  priorities?: PriorityConfig;
  execution?: ExecutionConfig;
  reporting?: ReportingConfig;
}

/**
 * Configurações globais (variáveis, timeouts, etc.)
 */
export interface GlobalConfig {
  variables?: Record<string, any>;
  timeouts?: {
    default?: number;
    slow_tests?: number;
  };
  base_url?: string;
}

/**
 * Configuração de descoberta de testes
 */
export interface DiscoveryConfig {
  patterns: string[];
  exclude?: string[];
  recursive?: boolean;
}

/**
 * Sistema de prioridades
 */
export interface PriorityConfig {
  levels: string[];
  required?: string[];
  fail_fast_on_required?: boolean;
}

/**
 * Configuração de execução
 */
export interface ExecutionConfig {
  mode: 'sequential' | 'parallel';
  max_parallel?: number;
  timeout?: number;
  continue_on_failure?: boolean;
  retry_failed?: {
    enabled: boolean;
    max_attempts: number;
    delay_ms: number;
  };
}

/**
 * Configuração de relatórios
 */
export interface ReportingConfig {
  formats: ReportFormat[];
  output_dir: string;
  aggregate: boolean;
  include_performance_metrics?: boolean;
  include_variables_state?: boolean;
}

export type ReportFormat = 'json' | 'junit' | 'html' | 'console';

/**
 * Contexto de variáveis hierárquico
 */
export interface GlobalVariableContext {
  environment: Record<string, any>;
  global: Record<string, any>;
  suite: Record<string, any>;
  runtime: Record<string, any>;
}

/**
 * Teste descoberto com metadados
 */
export interface DiscoveredTest {
  file_path: string;
  suite_name: string;
  priority?: string;
  dependencies?: string[];
  estimated_duration?: number;
}

/**
 * Resultado agregado de execução
 */
export interface AggregatedResult {
  project_name: string;
  start_time: string;
  end_time: string;
  total_duration_ms: number;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  skipped_tests: number;
  success_rate: number;
  suites_results: SuiteExecutionResult[];
  global_variables_final_state: Record<string, any>;
  performance_summary?: PerformanceSummary;
}

/**
 * Resultado de execução de uma suíte individual
 */
export interface SuiteExecutionResult {
  suite_name: string;
  file_path: string;
  priority?: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: 'success' | 'failure' | 'skipped';
  steps_executed: number;
  steps_successful: number;
  steps_failed: number;
  success_rate: number;
  steps_results: StepExecutionResult[];
  error_message?: string;
  variables_captured: Record<string, any>;
}

/**
 * Resultado de execução de um step individual
 */
export interface StepExecutionResult {
  step_name: string;
  status: 'success' | 'failure' | 'skipped';
  duration_ms: number;
  request_details?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response_details?: {
    status_code: number;
    headers: Record<string, string>;
    body: any;
    size_bytes: number;
  };
  assertions_results?: AssertionResult[];
  captured_variables?: Record<string, any>;
  error_message?: string;
}

/**
 * Resultado de uma assertion
 */
export interface AssertionResult {
  field: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

/**
 * Resumo de performance
 */
export interface PerformanceSummary {
  total_requests: number;
  average_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  requests_per_second: number;
  slowest_endpoints: Array<{
    url: string;
    average_time_ms: number;
    call_count: number;
  }>;
}

/**
 * Opções de execução do engine
 */
export interface EngineExecutionOptions {
  config_file?: string;
  test_directory?: string;
  environment?: string;
  verbosity?: 'silent' | 'simple' | 'detailed' | 'verbose';
  filters?: {
    priority?: string[];
    suite_names?: string[];
    tags?: string[];
  };
  dry_run?: boolean;
}