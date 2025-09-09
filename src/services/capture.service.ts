import * as jmespath from 'jmespath';
import { ExecutionResult } from '../types/common.types';

export class CaptureService {
  
  /**
   * Captura variáveis da resposta HTTP usando JMESPath.
   */
  captureVariables(
    captureConfig: Record<string, string>,
    result: ExecutionResult
  ): Record<string, any> {
    const capturedVariables: Record<string, any> = {};

    if (!result.response_details) {
      console.log('    [⚠] Não foi possível capturar variáveis: resposta não disponível');
      return capturedVariables;
    }

    for (const [variableName, jmesPath] of Object.entries(captureConfig)) {
      try {
        const value = this.extractValue(jmesPath, result);
        
        if (value !== undefined) {
          capturedVariables[variableName] = value;
          console.log(`    [📥] Capturado: ${variableName} = ${this.formatValue(value)}`);
        } else {
          console.log(`    [⚠] Não foi possível capturar: ${variableName} (caminho: ${jmesPath})`);
        }
      } catch (error) {
        console.log(`    [✗] Erro ao capturar ${variableName}: ${error}`);
      }
    }

    return capturedVariables;
  }

  /**
   * Extrai um valor da resposta usando JMESPath.
   */
  private extractValue(jmesPath: string, result: ExecutionResult): any {
    // Prepara o contexto completo para JMESPath
    const context = this.buildContext(result);
    
    try {
      return jmespath.search(context, jmesPath);
    } catch (error) {
      throw new Error(`JMESPath inválido '${jmesPath}': ${error}`);
    }
  }

  /**
   * Constrói o contexto completo para extração de dados.
   */
  private buildContext(result: ExecutionResult): any {
    const response = result.response_details!;
    
    return {
      status_code: response.status_code,
      headers: response.headers,
      body: response.body,
      duration_ms: result.duration_ms,
      size_bytes: response.size_bytes
    };
  }

  /**
   * Formata um valor para exibição no console.
   */
  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      return value.length > 100 ? `"${value.substring(0, 100)}..."` : `"${value}"`;
    }
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      return str.length > 100 ? `${str.substring(0, 100)}...` : str;
    }
    return String(value);
  }

  /**
   * Valida se um conjunto de paths JMESPath são válidos.
   */
  validateCapturePaths(capturePaths: Record<string, string>): string[] {
    const errors: string[] = [];
    
    for (const [variableName, path] of Object.entries(capturePaths)) {
      try {
        // Tenta avaliar o path JMESPath com um objeto de teste
        jmespath.search({}, path);
      } catch (error) {
        errors.push(`Variável '${variableName}': ${error}`);
      }
    }
    
    return errors;
  }

  /**
   * Lista todos os caminhos disponíveis em um objeto para debug.
   */
  listAvailablePaths(obj: any, prefix = '', maxDepth = 3): string[] {
    if (maxDepth <= 0 || obj === null || typeof obj !== 'object') {
      return [];
    }

    const paths: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      paths.push(currentPath);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...this.listAvailablePaths(value, currentPath, maxDepth - 1));
      }
    }
    
    return paths;
  }

  /**
   * Sugere possíveis paths JMESPath baseado no conteúdo da resposta.
   */
  suggestCapturePaths(result: ExecutionResult): string[] {
    if (!result.response_details) {
      return [];
    }

    const context = this.buildContext(result);
    const suggestions: string[] = [];
    
    // Paths básicos sempre disponíveis
    suggestions.push('status_code', 'duration_ms', 'size_bytes');
    
    // Headers comuns
    if (context.headers) {
      const commonHeaders = ['content-type', 'authorization', 'location', 'set-cookie'];
      for (const header of commonHeaders) {
        if (context.headers[header] || context.headers[header.toLowerCase()]) {
          suggestions.push(`headers."${header}"`);
        }
      }
    }
    
    // Paths do body (limitado a 2 níveis)
    if (context.body && typeof context.body === 'object') {
      const bodyPaths = this.listAvailablePaths(context.body, 'body', 2);
      suggestions.push(...bodyPaths);
    }
    
    return suggestions;
  }
}