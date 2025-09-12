/**
 * Flow Test Engine v1.0
 *
 * API principal do package para uso programático.
 *
 * Este módulo exporta todas as classes, tipos e funções necessárias
 * para integrar o Flow Test Engine em aplicações ou scripts personalizados.
 *
 * @example
 * ```typescript
 * import { FlowTestEngine, createEngine, runTests } from 'flow-test-engine';
 *
 * // Uso direto da classe
 * const engine = new FlowTestEngine('./config.yml');
 * const result = await engine.run();
 *
 * // Usando função de conveniência
 * const result2 = await runTests('./config.yml');
 *
 * // Criação simplificada
 * const engine2 = createEngine('./config.yml');
 * ```
 */

// Exporta a classe principal do engine
export { FlowTestEngine } from "./core/engine";
export { ConfigManager } from "./core/config";
export { TestDiscovery } from "./core/discovery";

// Exporta serviços para uso avançado
export { GlobalVariablesService } from "./services/global-variables";
export { PriorityService } from "./services/priority";
export { ReportingService } from "./services/reporting";
export { ExecutionService } from "./services/execution";

// Exporta todos os tipos
export * from "./types/engine.types";
export * from "./types/config.types";

// Exporta serviços legados compatíveis (para migration)
export { HttpService } from "./services/http.service";
export { AssertionService } from "./services/assertion.service";
export { CaptureService } from "./services/capture.service";

/**
 * Função de conveniência para criação rápida do engine
 *
 * Cria uma instância do FlowTestEngine com configuração mínima,
 * ideal para uso em scripts ou integração simples.
 *
 * @param configPath - Caminho opcional para arquivo de configuração
 * @returns Nova instância do FlowTestEngine configurada
 *
 * @example
 * ```typescript
 * const engine = createEngine('./my-config.yml');
 * const result = await engine.run();
 * ```
 */
export function createEngine(configPath?: string) {
  const { FlowTestEngine } = require("./core/engine");
  return new FlowTestEngine(configPath);
}

/**
 * Função de conveniência para execução one-shot
 *
 * Cria um engine, executa todos os testes e retorna o resultado.
 * Ideal para automação e integração em pipelines de CI/CD.
 *
 * @param configPath - Caminho opcional para arquivo de configuração
 * @returns Promise que resolve para o resultado agregado da execução
 *
 * @example
 * ```typescript
 * // Execução simples
 * const result = await runTests();
 * console.log(`Success rate: ${result.success_rate}%`);
 *
 * // Com configuração específica
 * const result2 = await runTests('./prod-config.yml');
 * if (result2.failed_tests > 0) {
 *   process.exit(1);
 * }
 * ```
 */
export async function runTests(configPath?: string) {
  const { FlowTestEngine } = require("./core/engine");
  const engine = new FlowTestEngine(configPath);
  return await engine.run();
}

/**
 * Função para dry-run (apenas descoberta e planejamento)
 *
 * Executa apenas a fase de descoberta e planejamento dos testes
 * sem executar as requisições HTTP. Útil para validar configuração
 * e visualizar o plano de execução.
 *
 * @param configPath - Caminho opcional para arquivo de configuração
 * @returns Promise que resolve para informações sobre testes descobertos
 *
 * @example
 * ```typescript
 * const plan = await planTests('./config.yml');
 * console.log(`Found ${plan.total_tests} tests to execute`);
 * plan.suites_results.forEach(suite => {
 *   console.log(`- ${suite.suite_name} (${suite.total_steps} steps)`);
 * });
 * ```
 */
export async function planTests(configPath?: string) {
  const { FlowTestEngine } = require("./core/engine");
  const engine = new FlowTestEngine(configPath);
  return await engine.dryRun();
}

/**
 * Versão do package
 *
 * Versão atual do Flow Test Engine, seguindo semantic versioning.
 */
export const VERSION = "1.0.0";

/**
 * Informações do package
 *
 * Metadados sobre o Flow Test Engine incluindo nome, versão e descrição.
 * Útil para integração em ferramentas que precisam identificar a versão.
 *
 * @example
 * ```typescript
 * console.log(`Using ${PACKAGE_INFO.name} v${PACKAGE_INFO.version}`);
 * ```
 */
export const PACKAGE_INFO = {
  name: "flow-test-engine",
  version: VERSION,
  description:
    "A comprehensive API testing engine with directory-based execution, global variables, and priority-driven test management.",
} as const;
