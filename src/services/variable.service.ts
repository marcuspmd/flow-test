import { VariableContext } from '../types/common.types';

export class VariableService {
  private context: VariableContext;

  constructor(context: VariableContext) {
    this.context = context;
  }

  /**
   * Interpola variáveis em uma string usando a sintaxe {{variable_name}}.
   * Suporta escopo hierárquico: runtime > suite > imported > global
   */
  interpolate(template: string | any): any {
    if (typeof template === 'string') {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
        const value = this.resolveVariable(variablePath.trim());
        return value !== undefined ? String(value) : match;
      });
    }

    if (Array.isArray(template)) {
      return template.map(item => this.interpolate(item));
    }

    if (template && typeof template === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolate(value);
      }
      return result;
    }

    return template;
  }

  /**
   * Resolve uma variável seguindo a hierarquia de escopo.
   * Suporta notação de ponto para fluxos importados (ex: auth.token).
   */
  private resolveVariable(variablePath: string): any {
    // Primeiro, verifica no runtime se existe a variável exata (incluindo pontos)
    if (this.context.runtime[variablePath] !== undefined) {
      return this.context.runtime[variablePath];
    }

    // Verifica se é uma variável de fluxo importado (ex: auth.token)
    if (variablePath.includes('.')) {
      const [flowName, ...pathParts] = variablePath.split('.');
      const flowVariables = this.context.imported[flowName];
      if (flowVariables) {
        return this.getNestedValue(flowVariables, pathParts.join('.'));
      }
    }

    // Hierarquia de resolução: runtime > suite > imported > global
    const value = 
      this.context.suite[variablePath] ??
      this.findInImported(variablePath) ??
      this.context.global[variablePath];

    return value;
  }

  /**
   * Procura uma variável em todos os fluxos importados.
   */
  private findInImported(variableName: string): any {
    for (const flowVariables of Object.values(this.context.imported)) {
      if (variableName in flowVariables) {
        return flowVariables[variableName];
      }
    }
    return undefined;
  }

  /**
   * Obtém um valor aninhado usando notação de ponto.
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Define uma variável no contexto runtime.
   */
  setVariable(name: string, value: any): void {
    this.context.runtime[name] = value;
  }

  /**
   * Define múltiplas variáveis no contexto runtime.
   */
  setVariables(variables: Record<string, any>): void {
    Object.assign(this.context.runtime, variables);
  }

  /**
   * Adiciona variáveis de um fluxo importado.
   */
  addImportedFlow(flowName: string, variables: Record<string, any>): void {
    this.context.imported[flowName] = { ...variables };
  }

  /**
   * Obtém o estado atual de todas as variáveis.
   */
  getAllVariables(): Record<string, any> {
    return {
      ...this.context.global,
      ...this.findAllImported(),
      ...this.context.suite,
      ...this.context.runtime
    };
  }

  /**
   * Coleta todas as variáveis de fluxos importados.
   */
  private findAllImported(): Record<string, any> {
    const allImported: Record<string, any> = {};
    for (const [flowName, variables] of Object.entries(this.context.imported)) {
      for (const [key, value] of Object.entries(variables)) {
        // Adiciona com prefixo do fluxo e sem prefixo (para compatibilidade)
        allImported[`${flowName}.${key}`] = value;
        if (!(key in allImported)) {
          allImported[key] = value;
        }
      }
    }
    return allImported;
  }
}