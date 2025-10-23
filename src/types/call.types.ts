/**
 * Tipos para step call cross-suite (TASK_015)
 */

import type { TestStep, TestSuite } from "./engine.types";

export type StepCallErrorStrategy = "fail" | "continue" | "warn";

export interface StepCallConfig {
  /** Caminho para o arquivo de teste alvo */
  test: string;
  /**
   * Path resolution strategy
   * - "relative": Path is relative to the current file (default)
   * - "absolute": Path is relative to test_directory root
   */
  path_type?: "relative" | "absolute";
  /** Nome do step a ser chamado no arquivo alvo */
  step: string;
  /** Variáveis a serem passadas para o contexto do step chamado */
  variables?: Record<string, any>;
  /**
   * Alias para prefixar variáveis capturadas (opcional)
   * - Se definido: variáveis serão prefixadas com "alias." (ex: "auth.access_token")
   * - Se não definido: variáveis serão prefixadas com "node_id." (ex: "func_auth.access_token")
   * - Útil para evitar prefixos longos e melhorar legibilidade
   */
  alias?: string;
  /** Executa em contexto isolado (default: true) */
  isolate_context?: boolean;
  /** Estratégia de erro: fail | continue | warn (default: fail) */
  on_error?: StepCallErrorStrategy;
  /** Timeout em ms (opcional) */
  timeout?: number;
  /** Configuração de retry (opcional) */
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
}

export interface StepCallRequest {
  test: string;
  path_type?: "relative" | "absolute";
  step: string;
  variables?: Record<string, any>;
  alias?: string;
  isolate_context?: boolean;
  timeout?: number;
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
  on_error?: StepCallErrorStrategy;
}

export interface StepCallResult {
  success: boolean;
  error?: string;
  captured_variables?: Record<string, any>;
  /** Variáveis prontas para serem propagadas ao chamador (após ajustes de namespace). */
  propagated_variables?: Record<string, any>;
  available_variables?: Record<string, any>;
  executionTime?: number;
  step_name?: string;
  suite_name?: string;
  suite_node_id?: string;
  status?: "success" | "failure" | "skipped";
  /** Detalhes da requisição HTTP executada (se houver) */
  request_details?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    full_url?: string;
    curl_command?: string;
    raw_request?: string;
    raw_url?: string;
    base_url?: string;
  };
  /** Detalhes da resposta HTTP recebida (se houver) */
  response_details?: {
    status_code: number;
    headers: Record<string, string>;
    body: any;
    size_bytes: number;
    raw_response?: string;
  };
  /** Resultados das assertions executadas */
  assertions_results?: import("./config.types").AssertionResult[];
  /** Steps aninhados executados dentro desta call (para calls recursivos) */
  nested_steps?: import("./config.types").StepExecutionResult[];
}

export interface StepCallExecutionOptions {
  /** Caminho absoluto do arquivo que originou a chamada */
  callerSuitePath: string;
  /** Identificador único (node_id) do suite atual */
  callerNodeId?: string;
  /** Nome amigável da suite atual */
  callerSuiteName?: string;
  /** Diretório raiz permitido para resolução de suites (sanitização). */
  allowedRoot?: string;
  /** Pilha de chamadas para detecção de loops */
  callStack?: string[];
  /** Profundidade máxima permitida */
  maxDepth?: number;
  /** Handler para executar o step resolvido */
  stepExecutionHandler?: StepExecutionHandler;
}

export interface ResolvedStepCall {
  suite: TestSuite;
  step: TestStep;
  suitePath: string;
  stepIndex: number;
  identifier: string;
}

export interface StepExecutionHandlerInput {
  resolved: ResolvedStepCall;
  request: StepCallRequest;
  options: StepCallExecutionOptions;
}

export type StepExecutionHandler = (
  input: StepExecutionHandlerInput
) => Promise<StepCallResult>;
