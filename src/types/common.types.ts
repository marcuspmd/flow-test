// Este arquivo define o "contrato" da nossa aplicação.
// Garante que o código e o arquivo YAML tenham a mesma estrutura.

/**
 * Detalhes de uma única requisição HTTP
 *
 * Define todos os parâmetros necessários para executar uma requisição HTTP,
 * incluindo método, URL, headers e body da requisição.
 *
 * @example
 * ```yaml
 * request:
 *   method: POST
 *   url: /api/login
 *   headers:
 *     Content-Type: application/json
 *   body:
 *     username: "{{username}}"
 *     password: "{{password}}"
 * ```
 */
export interface RequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Regras de validação para um campo específico
 *
 * Define os operadores disponíveis para validar valores em assertions.
 * Cada operador pode ser usado para validar campos do body, headers, etc.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     status:
 *       equals: "success"
 *     count:
 *       greater_than: 0
 *       less_than: 100
 *     message:
 *       contains: "completed"
 *       regex: "^[A-Z].*$"
 * ```
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
 * O conjunto de validações para uma resposta HTTP
 *
 * Define todas as validações que podem ser aplicadas a uma resposta,
 * incluindo status code, conteúdo do body, headers e tempo de resposta.
 *
 * @example
 * ```yaml
 * assert:
 *   status_code: 200
 *   body:
 *     message:
 *       equals: "success"
 *     data.user.id:
 *       not_equals: null
 *   headers:
 *     content-type:
 *       contains: "application/json"
 *   response_time_ms:
 *     less_than: 1000
 * ```
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
 * Cenários condicionais para happy/sad paths
 *
 * Permite definir validações e capturas condicionais baseadas
 * em expressões JMESPath aplicadas à resposta.
 *
 * @example
 * ```yaml
 * scenarios:
 *   - condition: "body.status == 'success'"
 *     then:
 *       assert:
 *         body.data:
 *           not_equals: null
 *       capture:
 *         user_id: "body.data.user.id"
 *     else:
 *       assert:
 *         body.error:
 *           not_equals: null
 * ```
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
 * Define uma única etapa no fluxo de teste
 *
 * Representa um step individual de um teste, contendo a requisição
 * a ser executada, validações, capturas e cenários condicionais.
 *
 * @example
 * ```yaml
 * steps:
 *   - name: "Login do usuário"
 *     request:
 *       method: POST
 *       url: /auth/login
 *       body:
 *         username: "{{test_user}}"
 *         password: "{{test_password}}"
 *     assert:
 *       status_code: 200
 *       body.token:
 *         not_equals: null
 *     capture:
 *       auth_token: "body.token"
 *     continue_on_failure: false
 * ```
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
  node_id: string;
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
  verbosity: "silent" | "simple" | "detailed" | "verbose";
  output_file?: string;
  format: "console" | "json" | "html";
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
  status: "success" | "failure" | "skipped";
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
  node_id: string;
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
 *
 * @example
 * ```yaml
 * node_id: "auth"                    # Identificador único técnico
 * suite_name: "Authentication Flow"  # Nome descritivo
 * exports: ["token", "user_id"]      # Variáveis exportadas globalmente
 * variables:
 *   username: "test@example.com"     # Variáveis locais privadas
 * steps:
 *   - name: "Login"
 *     capture:
 *       token: "body.access_token"   # Será exportado como "auth.token"
 *       session_id: "body.session"   # Permanece local (não está em exports)
 * ```
 */
export interface TestSuite {
  node_id: string;
  suite_name: string;
  base_url?: string;
  imports?: FlowImport[];
  variables?: Record<string, any>;
  steps: TestStep[];
  reporting?: ReportingConfig;
  exports?: string[];
}

/**
 * Opções de execução passadas via CLI.
 */
export interface ExecutionOptions {
  verbosity?: "silent" | "simple" | "detailed" | "verbose";
  outputFile?: string;
  format?: "console" | "json" | "html";
  continueOnFailure?: boolean;
  timeout?: number;
}

/**
 * Contexto de variáveis com escopo hierárquico.
 */
export interface VariableContext {
  global: Record<string, any>;
  imported: Record<string, Record<string, any>>; // nodeId -> variables
  suite: Record<string, any>;
  runtime: Record<string, any>;
}

/**
 * Configuration for Faker.js integration
 * 
 * @example
 * ```yaml
 * faker:
 *   locale: "pt_BR"
 *   seed: 12345
 * ```
 */
export interface FakerConfig {
  /** Locale for generated data (e.g., 'pt_BR', 'en_US') */
  locale?: string;
  /** Seed for reproducible data generation */
  seed?: number;
}

/**
 * Extended test suite with Faker configuration
 */
export interface TestSuiteWithFaker extends TestSuite {
  /** Faker configuration for this suite */
  faker?: FakerConfig;
}

/**
 * Configuration for JavaScript expressions
 * 
 * @example
 * ```yaml
 * javascript:
 *   timeout: 5000
 *   enableConsole: true
 * ```
 */
export interface JavaScriptConfig {
  /** Execution timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Allow console.log in expressions (default: false) */
  enableConsole?: boolean;
  /** Memory limit in bytes (default: 8MB) */
  maxMemory?: number;
}

/**
 * Extended test suite with JavaScript configuration
 */
export interface TestSuiteWithJavaScript extends TestSuite {
  /** JavaScript configuration for this suite */
  javascript?: JavaScriptConfig;
}
