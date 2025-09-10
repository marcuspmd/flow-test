/**
 * Definições de tipos específicas para o motor de testes
 * Estende e substitui common.types.ts com nova arquitetura
 */

/**
 * Detalhes de uma requisição HTTP
 */
export interface RequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Regras de validação para um campo específico
 */
export interface AssertionChecks {
  equals?: any;
  contains?: any;
  not_equals?: any;
  greater_than?: number;
  less_than?: number;
  regex?: string;
  exists?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  length?: {
    equals?: number;
    greater_than?: number;
    less_than?: number;
  };
}

/**
 * Conjunto de validações para uma resposta
 */
export interface Assertions {
  status_code?: number | AssertionChecks;
  body?: Record<string, AssertionChecks>;
  headers?: Record<string, AssertionChecks>;
  response_time_ms?: {
    less_than?: number;
    greater_than?: number;
  };
  custom?: Array<{
    name: string;
    condition: string; // JMESPath expression
    message?: string;
  }>;
}

/**
 * Cenários condicionais para happy/sad paths
 */
export interface ConditionalScenario {
  name?: string;
  condition: string; // JMESPath expression
  then?: {
    assert?: Assertions;
    capture?: Record<string, string>;
    variables?: Record<string, any>;
  };
  else?: {
    assert?: Assertions;
    capture?: Record<string, string>;
    variables?: Record<string, any>;
  };
}

/**
 * Metadados de um step de teste
 */
export interface TestStepMetadata {
  priority?: string;
  tags?: string[];
  timeout?: number;
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
  depends_on?: string[];
  description?: string;
}

/**
 * Step de teste com metadados estendidos
 */
export interface TestStep {
  name: string;
  request: RequestDetails;
  assert?: Assertions;
  capture?: Record<string, string>;
  scenarios?: ConditionalScenario[];
  continue_on_failure?: boolean;
  metadata?: TestStepMetadata;
}

/**
 * Importação de fluxo reutilizável
 */
export interface FlowImport {
  name: string;
  path: string;
  variables?: Record<string, any>;
  priority?: string;
  enabled?: boolean;
}

/**
 * Fluxo reutilizável
 */
export interface ReusableFlow {
  flow_name: string;
  description?: string;
  variables?: Record<string, any>;
  steps: TestStep[];
  exports?: string[];
  metadata?: {
    priority?: string;
    tags?: string[];
    estimated_duration_ms?: number;
  };
}

/**
 * Suíte de testes com metadados estendidos
 */
export interface TestSuite {
  suite_name: string;
  description?: string;
  base_url?: string;
  imports?: FlowImport[];
  variables?: Record<string, any>;
  steps: TestStep[];
  metadata?: {
    priority?: string;
    tags?: string[];
    timeout?: number;
    requires?: string[];
    estimated_duration_ms?: number;
  };
}

/**
 * Contexto de execução de um teste
 */
export interface ExecutionContext {
  suite: TestSuite;
  global_variables: Record<string, any>;
  runtime_variables: Record<string, any>;
  step_index: number;
  total_steps: number;
  start_time: Date;
  execution_id: string;
}

/**
 * Estatísticas de execução em tempo real
 */
export interface ExecutionStats {
  tests_discovered: number;
  tests_completed: number;
  tests_successful: number;
  tests_failed: number;
  tests_skipped: number;
  current_test?: string;
  estimated_time_remaining_ms?: number;
  requests_made: number;
  total_response_time_ms: number;
}

/**
 * Hook de eventos do engine
 */
export interface EngineHooks {
  onTestDiscovered?: (test: any) => void | Promise<void>;
  onSuiteStart?: (suite: TestSuite) => void | Promise<void>;
  onSuiteEnd?: (suite: TestSuite, result: any) => void | Promise<void>;
  onStepStart?: (step: TestStep, context: ExecutionContext) => void | Promise<void>;
  onStepEnd?: (step: TestStep, result: any, context: ExecutionContext) => void | Promise<void>;
  onExecutionStart?: (stats: ExecutionStats) => void | Promise<void>;
  onExecutionEnd?: (result: any) => void | Promise<void>;
  onError?: (error: Error, context?: any) => void | Promise<void>;
}

/**
 * Filtros de execução
 */
export interface ExecutionFilters {
  priorities?: string[];
  suite_names?: string[];
  tags?: string[];
  file_patterns?: string[];
  exclude_patterns?: string[];
  max_duration_ms?: number;
}

/**
 * Configuração de cache
 */
export interface CacheConfig {
  enabled: boolean;
  variable_interpolation: boolean;
  response_cache?: {
    enabled: boolean;
    ttl_ms: number;
    key_strategy: 'url' | 'url_and_headers' | 'custom';
  };
}

/**
 * Re-export dos tipos de configuração
 */
export * from './config.types';