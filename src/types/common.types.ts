// Este arquivo define o "contrato" da nossa aplicação.
// Garante que o código e o arquivo YAML tenham a mesma estrutura.

/**
 * Detalhes de uma única requisição HTTP.
 */
export interface RequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Regras de validação para um campo específico.
 */
export interface AssertionChecks {
  equals?: any;
  contains?: any;
  not_equals?: any;
  greater_than?: number;
  less_than?: number;
  regex?: string;
}

/**
 * O conjunto de validações para uma resposta.
 */
export interface Assertions {
  status_code?: number;
  body?: Record<string, AssertionChecks>;
  headers?: Record<string, AssertionChecks>;
  response_time_ms?: {
    less_than?: number;
    greater_than?: number;
  };
}

/**
 * Cenários condicionais para happy/sad paths.
 */
export interface ConditionalScenario {
  condition: string; // JMESPath expression
  then?: {
    assert?: Assertions;
    capture?: Record<string, string>;
  };
  else?: {
    assert?: Assertions;
    capture?: Record<string, string>;
  };
}

/**
 * Define uma única etapa no fluxo de teste.
 */
export interface TestStep {
  name: string;
  request: RequestDetails;
  assert?: Assertions;
  capture?: Record<string, string>;
  scenarios?: ConditionalScenario[];
  continue_on_failure?: boolean;
}

/**
 * Importação de fluxo reutilizável.
 */
export interface FlowImport {
  name: string;
  path: string;
  variables?: Record<string, any>;
}

/**
 * Estrutura de um fluxo reutilizável.
 */
export interface ReusableFlow {
  flow_name: string;
  description?: string;
  variables?: Record<string, any>;
  steps: TestStep[];
  exports?: string[];
}

/**
 * Configuração de relatórios e verbosidade.
 */
export interface ReportingConfig {
  verbosity: 'silent' | 'simple' | 'detailed' | 'verbose';
  output_file?: string;
  format: 'console' | 'json' | 'html';
  include_request_response: boolean;
  include_variables: boolean;
}

/**
 * Resultado de uma assertion individual.
 */
export interface AssertionResult {
  field: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

/**
 * Resultado da execução de uma etapa.
 */
export interface ExecutionResult {
  step_name: string;
  status: 'success' | 'failure' | 'skipped';
  duration_ms: number;
  request_details?: RequestDetails;
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
 * Resultado da execução de uma suíte completa.
 */
export interface SuiteResult {
  suite_name: string;
  start_time: string;
  end_time: string;
  total_duration_ms: number;
  steps_results: ExecutionResult[];
  success_rate: number;
  variables_final_state: Record<string, any>;
  imported_flows?: string[];
}

/**
 * A estrutura completa do nosso arquivo de suíte de testes.
 */
export interface TestSuite {
  suite_name: string;
  base_url?: string;
  imports?: FlowImport[];
  variables?: Record<string, any>;
  steps: TestStep[];
  reporting?: ReportingConfig;
}

/**
 * Opções de execução passadas via CLI.
 */
export interface ExecutionOptions {
  verbosity?: 'silent' | 'simple' | 'detailed' | 'verbose';
  outputFile?: string;
  format?: 'console' | 'json' | 'html';
  continueOnFailure?: boolean;
  timeout?: number;
}

/**
 * Contexto de variáveis com escopo hierárquico.
 */
export interface VariableContext {
  global: Record<string, any>;
  imported: Record<string, Record<string, any>>; // flow_name -> variables
  suite: Record<string, any>;
  runtime: Record<string, any>;
}
