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
 * (Será expandido no futuro)
 */
export interface AssertionChecks {
  equals?: any;
}

/**
 * O conjunto de validações para uma resposta.
 */
export interface Assertions {
  status_code?: number;
  body?: Record<string, AssertionChecks>;
}

/**
 * Define uma única etapa no fluxo de teste.
 */
export interface TestStep {
  name: string;
  request: RequestDetails;
  assert?: Assertions;
  capture?: Record<string, string>;
}

/**
 * A estrutura completa do nosso arquivo de suíte de testes.
 */
export interface TestSuite {
  suite_name: string;
  base_url?: string;
  variables?: Record<string, any>;
  steps: TestStep[];
}
