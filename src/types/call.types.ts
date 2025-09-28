/**
 * Tipos para step call cross-suite (TASK_015)
 */

import type { TestStep, TestSuite } from "./engine.types";

export type StepCallErrorStrategy = "fail" | "continue" | "warn";

export interface StepCallConfig {
  /** Caminho relativo para o arquivo de teste alvo */
  test: string;
  /** Nome do step a ser chamado no arquivo alvo */
  step: string;
  /** Variáveis a serem passadas para o contexto do step chamado */
  variables?: Record<string, any>;
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
  step: string;
  variables?: Record<string, any>;
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
