/**
 * Flow Test Engine v2.0
 * 
 * API principal do package para uso programático
 */

// Exporta a classe principal do engine
export { FlowTestEngine } from './core/engine';
export { ConfigManager } from './core/config';
export { TestDiscovery } from './core/discovery';

// Exporta serviços para uso avançado
export { GlobalVariablesService } from './services/global-variables';
export { PriorityService } from './services/priority';
export { ReportingService } from './services/reporting';
export { ExecutionService } from './services/execution';

// Exporta todos os tipos
export * from './types/engine.types';
export * from './types/config.types';

// Exporta serviços legados compatíveis (para migration)
export { HttpService } from './services/http.service';
export { AssertionService } from './services/assertion.service';
export { CaptureService } from './services/capture.service';

/**
 * Função de conveniência para criação rápida do engine
 */
export function createEngine(configPath?: string) {
  const { FlowTestEngine } = require('./core/engine');
  return new FlowTestEngine(configPath);
}

/**
 * Função de conveniência para execução one-shot
 */
export async function runTests(configPath?: string) {
  const { FlowTestEngine } = require('./core/engine');
  const engine = new FlowTestEngine(configPath);
  return await engine.run();
}

/**
 * Função para dry-run (apenas descoberta e planejamento)
 */
export async function planTests(configPath?: string) {
  const { FlowTestEngine } = require('./core/engine');
  const engine = new FlowTestEngine(configPath);
  return await engine.dryRun();
}

/**
 * Versão do package
 */
export const VERSION = '2.0.0';

/**
 * Informações do package
 */
export const PACKAGE_INFO = {
  name: 'flow-test-engine',
  version: VERSION,
  description: 'A comprehensive API testing engine with directory-based execution, global variables, and priority-driven test management.'
} as const;