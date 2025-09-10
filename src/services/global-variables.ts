import { ConfigManager } from '../core/config';
import { GlobalVariableContext } from '../types/engine.types';

/**
 * Serviço de gerenciamento de variáveis globais com hierarquia e cache
 */
export class GlobalVariablesService {
  private context: GlobalVariableContext;
  private configManager: ConfigManager;
  private interpolationCache: Map<string, string> = new Map();
  private cacheEnabled: boolean = true;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.context = this.initializeContext();
  }

  /**
   * Inicializa o contexto de variáveis
   */
  private initializeContext(): GlobalVariableContext {
    return {
      environment: this.loadEnvironmentVariables(),
      global: this.configManager.getGlobalVariables(),
      suite: {},
      runtime: {}
    };
  }

  /**
   * Carrega variáveis de ambiente relevantes
   */
  private loadEnvironmentVariables(): Record<string, any> {
    const envVars: Record<string, any> = {};

    // Todas as variáveis de ambiente do processo
    Object.keys(process.env).forEach(key => {
      envVars[key] = process.env[key];
    });

    return envVars;
  }

  /**
   * Define variáveis no escopo runtime
   */
  setRuntimeVariables(variables: Record<string, any>): void {
    this.context.runtime = { ...this.context.runtime, ...variables };
    this.clearCache(); // Limpa cache quando variáveis mudam
  }

  /**
   * Define variáveis no escopo suite
   */
  setSuiteVariables(variables: Record<string, any>): void {
    this.context.suite = { ...this.context.suite, ...variables };
    this.clearCache();
  }

  /**
   * Define uma variável específica em runtime
   */
  setVariable(name: string, value: any, scope: keyof GlobalVariableContext = 'runtime'): void {
    this.context[scope][name] = value;
    
    // Remove entradas de cache que podem ser afetadas
    this.invalidateCacheForVariable(name);
  }

  /**
   * Obtém uma variável específica seguindo a hierarquia
   */
  getVariable(name: string): any {
    // Hierarquia: runtime > suite > global > environment
    if (this.context.runtime.hasOwnProperty(name)) {
      return this.context.runtime[name];
    }
    
    if (this.context.suite.hasOwnProperty(name)) {
      return this.context.suite[name];
    }
    
    if (this.context.global.hasOwnProperty(name)) {
      return this.context.global[name];
    }
    
    if (this.context.environment.hasOwnProperty(name)) {
      return this.context.environment[name];
    }
    
    return undefined;
  }

  /**
   * Obtém todas as variáveis mescladas por hierarquia
   */
  getAllVariables(): Record<string, any> {
    return {
      ...this.context.environment,
      ...this.context.global,
      ...this.context.suite,
      ...this.context.runtime
    };
  }

  /**
   * Interpola uma string substituindo {{variavel}} pelos valores
   */
  interpolateString(template: string): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    // Verifica cache primeiro
    if (this.cacheEnabled && this.interpolationCache.has(template)) {
      return this.interpolationCache.get(template)!;
    }

    let result = template;
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      const fullMatch = match[0]; // {{variable_name}}
      const variableName = match[1].trim(); // variable_name
      
      const value = this.resolveVariableExpression(variableName);
      
      if (value !== undefined) {
        result = result.replace(fullMatch, this.convertValueToString(value));
      } else {
        console.warn(`⚠️  Warning: Variable '${variableName}' not found during interpolation`);
        // Mantém a expressão original se variável não encontrada
      }
    }

    // Armazena no cache
    if (this.cacheEnabled) {
      this.interpolationCache.set(template, result);
    }

    return result;
  }

  /**
   * Interpola qualquer objeto (strings, objetos, arrays)
   */
  interpolate<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.interpolateString(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolate(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const result: any = {};
      Object.keys(obj).forEach(key => {
        result[key] = this.interpolate((obj as any)[key]);
      });
      return result as T;
    }

    return obj; // Números, booleans, etc.
  }

  /**
   * Resolve expressões de variáveis com suporte a caminhos
   */
  private resolveVariableExpression(expression: string): any {
    // Suporte a caminhos como: user.name, config.timeout
    const parts = expression.split('.');
    const baseName = parts[0];
    
    let value = this.getVariable(baseName);
    
    // Navega pelo caminho se existir
    for (let i = 1; i < parts.length && value !== undefined; i++) {
      if (typeof value === 'object' && value !== null) {
        value = value[parts[i]];
      } else {
        value = undefined;
        break;
      }
    }

    return value;
  }

  /**
   * Converte qualquer valor para string para interpolação
   */
  private convertValueToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * Obtém contexto completo de variáveis
   */
  getContext(): GlobalVariableContext {
    return { ...this.context };
  }

  /**
   * Obtém variáveis de um escopo específico
   */
  getVariablesByScope(scope: keyof GlobalVariableContext): Record<string, any> {
    return { ...this.context[scope] };
  }

  /**
   * Verifica se uma variável existe
   */
  hasVariable(name: string): boolean {
    return this.getVariable(name) !== undefined;
  }

  /**
   * Lista nomes de todas as variáveis disponíveis
   */
  getAvailableVariableNames(): string[] {
    const allVars = this.getAllVariables();
    return Object.keys(allVars).sort();
  }

  /**
   * Obtém estatísticas do sistema de variáveis
   */
  getStats() {
    return {
      environment_vars: Object.keys(this.context.environment).length,
      global_vars: Object.keys(this.context.global).length,
      suite_vars: Object.keys(this.context.suite).length,
      runtime_vars: Object.keys(this.context.runtime).length,
      cache_size: this.interpolationCache.size,
      cache_enabled: this.cacheEnabled
    };
  }

  /**
   * Limpa o cache de interpolação
   */
  clearCache(): void {
    this.interpolationCache.clear();
  }

  /**
   * Invalida entradas de cache que usam uma variável específica
   */
  private invalidateCacheForVariable(variableName: string): void {
    const pattern = new RegExp(`\\{\\{[^}]*${variableName}[^}]*\\}\\}`);
    
    for (const [template] of this.interpolationCache) {
      if (pattern.test(template)) {
        this.interpolationCache.delete(template);
      }
    }
  }

  /**
   * Habilita/desabilita cache de interpolação
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Exporta estado atual das variáveis para debug
   */
  exportState(): string {
    return JSON.stringify({
      context: this.context,
      cache_stats: {
        size: this.interpolationCache.size,
        enabled: this.cacheEnabled
      },
      available_variables: this.getAvailableVariableNames()
    }, null, 2);
  }

  /**
   * Restaura contexto a partir de um estado exportado
   */
  importState(state: string): void {
    try {
      const parsed = JSON.parse(state);
      if (parsed.context) {
        this.context = parsed.context;
        this.clearCache(); // Limpa cache após importar
      }
    } catch (error) {
      throw new Error(`Failed to import variable state: ${error}`);
    }
  }

  /**
   * Cria um snapshot do estado atual das variáveis
   */
  createSnapshot(): () => void {
    const snapshot = JSON.parse(JSON.stringify(this.context));
    
    return () => {
      this.context = snapshot;
      this.clearCache();
    };
  }

  /**
   * Mergia variáveis de outro contexto
   */
  mergeContext(otherContext: Partial<GlobalVariableContext>): void {
    if (otherContext.environment) {
      this.context.environment = { ...this.context.environment, ...otherContext.environment };
    }
    if (otherContext.global) {
      this.context.global = { ...this.context.global, ...otherContext.global };
    }
    if (otherContext.suite) {
      this.context.suite = { ...this.context.suite, ...otherContext.suite };
    }
    if (otherContext.runtime) {
      this.context.runtime = { ...this.context.runtime, ...otherContext.runtime };
    }
    
    this.clearCache();
  }
}