import axios, { AxiosResponse, AxiosError } from 'axios';
import { RequestDetails, ExecutionResult } from '../types/common.types';

export class HttpService {
  private baseUrl?: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Executa uma requisição HTTP e retorna os detalhes da execução.
   */
  async executeRequest(
    stepName: string,
    request: RequestDetails
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Constrói a URL completa
      const fullUrl = this.buildFullUrl(request.url);
      
      console.log(`  [→] ${request.method} ${fullUrl}`);
      
      // Configura a requisição
      const axiosConfig = {
        method: request.method.toLowerCase() as any,
        url: fullUrl,
        headers: request.headers || {},
        data: request.body,
        timeout: this.timeout,
        validateStatus: () => true // Não rejeita por status HTTP
      };

      // Executa a requisição
      const response: AxiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      // Calcula o tamanho da resposta
      const responseSize = this.calculateResponseSize(response);

      console.log(`  [✓] ${response.status} (${duration}ms)`);

      return {
        step_name: stepName,
        status: 'success',
        duration_ms: duration,
        request_details: request,
        response_details: {
          status_code: response.status,
          headers: this.normalizeHeaders(response.headers),
          body: response.data,
          size_bytes: responseSize
        },
        captured_variables: {},
        assertions_results: []
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.formatError(error);
      
      console.log(`  [✗] Erro: ${errorMessage} (${duration}ms)`);

      return {
        step_name: stepName,
        status: 'failure',
        duration_ms: duration,
        request_details: request,
        error_message: errorMessage,
        captured_variables: {},
        assertions_results: []
      };
    }
  }

  /**
   * Constrói a URL completa combinando base_url e url da requisição.
   */
  private buildFullUrl(url: string): string {
    // Se a URL já é absoluta, retorna como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Se não há base_url, retorna a URL como está
    if (!this.baseUrl) {
      return url;
    }

    // Combina base_url com a URL relativa
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    return `${cleanBaseUrl}${cleanUrl}`;
  }

  /**
   * Calcula o tamanho aproximado da resposta em bytes.
   */
  private calculateResponseSize(response: AxiosResponse): number {
    try {
      if (response.data) {
        if (typeof response.data === 'string') {
          return new Blob([response.data]).size;
        } else {
          return new Blob([JSON.stringify(response.data)]).size;
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Formata erros de requisição HTTP para mensagens legíveis.
   */
  private formatError(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED') {
        return `Timeout após ${this.timeout}ms`;
      }
      
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Conexão recusada pelo servidor';
      }
      
      if (axiosError.code === 'ENOTFOUND') {
        return 'Servidor não encontrado (DNS)';
      }
      
      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      }
      
      if (axiosError.request) {
        return 'Sem resposta do servidor';
      }
    }
    
    return error.message || 'Erro desconhecido';
  }

  /**
   * Define um novo timeout para as requisições.
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Define uma nova base URL.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Normaliza headers do axios para Record<string, string>.
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined && value !== null) {
          normalized[key] = String(value);
        }
      }
    }
    
    return normalized;
  }
}