import axios, { AxiosResponse, AxiosError } from "axios";
import { RequestDetails } from "../types/engine.types";
import { StepExecutionResult } from "../types/config.types";
import { getLogger } from "./logger.service";

/**
 * Serviço HTTP responsável por executar requisições e processar respostas
 *
 * Este serviço encapsula a lógica de execução de requisições HTTP usando axios,
 * incluindo construção de URLs, tratamento de erros, medição de performance
 * e normalização de respostas.
 *
 * @example
 * ```typescript
 * const httpService = new HttpService('https://api.exemplo.com', 30000);
 * const result = await httpService.executeRequest('Login', {
 *   method: 'POST',
 *   url: '/auth/login',
 *   body: { username: 'user', password: 'pass' }
 * });
 * ```
 */
export class HttpService {
  /** URL base para construção de URLs completas */
  private baseUrl?: string;

  /** Timeout em milissegundos para requisições HTTP */
  private timeout: number;

  private logger = getLogger();

  /**
   * Construtor do HttpService
   *
   * @param baseUrl - URL base opcional para prefixar requisições relativas
   * @param timeout - Timeout em milissegundos (padrão: 30000ms)
   *
   * @example
   * ```typescript
   * // Com URL base
   * const service = new HttpService('https://api.exemplo.com');
   *
   * // Com timeout customizado
   * const service = new HttpService('https://api.exemplo.com', 60000);
   *
   * // Sem URL base (URLs absolutas only)
   * const service = new HttpService();
   * ```
   */
  constructor(baseUrl?: string, timeout: number = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Executes an HTTP request and returns the execution details
   *
   * Main method for executing HTTP requests. Automatically measures
   * response time, handles errors appropriately and normalizes the response
   * in a standardized format.
   *
   * @param stepName - Step name for identification in logs and results
   * @param request - HTTP request details to be executed
   * @returns Promise that resolves to the execution result
   *
   * @example
   * ```typescript
   * const result = await httpService.executeRequest('Get User', {
   *   method: 'GET',
   *   url: '/users/123',
   *   headers: { 'Authorization': 'Bearer token' }
   * });
   *
   * if (result.status === 'success') {
   *   console.log('Status:', result.response_details?.status_code);
   *   console.log('Body:', result.response_details?.body);
   * }
   * ```
   */
  async executeRequest(
    stepName: string,
    request: RequestDetails
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    try {
      // Builds the complete URL
      const fullUrl = this.buildFullUrl(request.url);

      this.logger.info(`${request.method} ${fullUrl}`, { stepName });

      // Configures the request
      const axiosConfig = {
        method: request.method.toLowerCase() as any,
        url: fullUrl,
        headers: this.sanitizeHeaders(request.headers || {}),
        data: request.body,
        timeout: this.timeout,
        validateStatus: () => true, // Does not reject by HTTP status
      };

      // Executes the request
      const response: AxiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      // Calculates response size
      const responseSize = this.calculateResponseSize(response);

      this.logger.info(`${response.status}`, { stepName, duration });

      return {
        step_name: stepName,
        status: "success",
        duration_ms: duration,
        request_details: request,
        response_details: {
          status_code: response.status,
          headers: this.normalizeHeaders(response.headers),
          body: response.data,
          size_bytes: responseSize,
        },
        captured_variables: {},
        assertions_results: [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.formatError(error);

      this.logger.error(`Error: ${errorMessage}`, {
        stepName,
        duration,
        error: error as Error,
      });

      return {
        step_name: stepName,
        status: "failure",
        duration_ms: duration,
        request_details: request,
        error_message: errorMessage,
        captured_variables: {},
        assertions_results: [],
      };
    }
  }

  /**
   * Builds the complete URL by combining base_url and request URL
   *
   * If the request URL is absolute (contains http/https), returns as is.
   * Otherwise, combines with the baseUrl configured in the constructor.
   *
   * @param url - Request URL (absolute or relative)
   * @returns Complete URL for the request
   * @private
   *
   * @example
   * ```typescript
   * // With baseUrl = 'https://api.example.com'
   * buildFullUrl('/users') // returns 'https://api.example.com/users'
   * buildFullUrl('https://other.com/api') // returns 'https://other.com/api'
   * ```
   */
  private buildFullUrl(url: string): string {
    // If the URL is already absolute, return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // If there's no base_url, return the URL as is
    if (!this.baseUrl) {
      return url;
    }

    // Combines base_url with the relative URL
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, "");
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;

    return `${cleanBaseUrl}${cleanUrl}`;
  }

  /**
   * Calculates the approximate response size in bytes.
   */
  private calculateResponseSize(response: AxiosResponse): number {
    try {
      if (response.data) {
        if (typeof response.data === "string") {
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
   * Formats HTTP request errors for readable messages.
   */
  private formatError(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === "ECONNABORTED") {
        return `Timeout after ${this.timeout}ms`;
      }

      if (axiosError.code === "ECONNREFUSED") {
        return "Connection refused by server";
      }

      if (axiosError.code === "ENOTFOUND") {
        return "Server not found (DNS)";
      }

      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      }

      if (axiosError.request) {
        return "No response from server";
      }
    }

    return error.message || "Unknown error";
  }

  /**
   * Sets a new timeout for requests.
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Sets a new base URL.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Sanitizes headers to remove invalid characters
   * @private
   */
  private sanitizeHeaders(
    headers: Record<string, any>
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        // Remove invalid characters from header values (non-ASCII characters)
        const sanitizedValue = String(value).replace(/[^\x20-\x7E]/g, "");
        const sanitizedKey = key.replace(/[^\x20-\x7E]/g, "");

        if (sanitizedKey && sanitizedValue) {
          sanitized[sanitizedKey] = sanitizedValue;
        }
      }
    }

    return sanitized;
  }

  /**
   * Normalizes axios headers to Record<string, string>.
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (headers && typeof headers === "object") {
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined && value !== null) {
          normalized[key] = String(value);
        }
      }
    }

    return normalized;
  }
}
