import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, AxiosError } from 'axios';
import { RequestDetails, StepExecutionResult } from '../types/engine.types';
import { LoggerService } from './logger.service';

@Injectable()
export class HttpEngineService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {}

  async executeRequest(
    stepName: string,
    request: RequestDetails,
    baseUrl?: string,
    timeout: number = 60000,
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    try {
      const fullUrl = this.buildFullUrl(request.url, baseUrl);

      this.logger.info(`${request.method} ${fullUrl}`, {
        stepName,
        metadata: { type: 'http_request', internal: true },
      });

      const axiosConfig = {
        method: request.method.toLowerCase() as any,
        url: fullUrl,
        headers: this.sanitizeHeaders(request.headers || {}),
        data: request.body,
        params: request.params,
        timeout: request.timeout || timeout,
        validateStatus: () => true, // Don't reject by HTTP status
      };

      const response: AxiosResponse = await this.httpService
        .axiosRef(axiosConfig);

      const duration = Date.now() - startTime;
      const responseSize = this.calculateResponseSize(response);

      this.logger.info(`${response.status}`, {
        stepName,
        duration,
        metadata: { type: 'http_response', internal: true },
      });

      return {
        step_name: stepName,
        status: 'success',
        duration_ms: duration,
        request_details: {
          ...request,
          base_url: baseUrl,
          full_url: fullUrl,
          curl_command: this.generateCurlCommand(fullUrl, request),
          raw_request: this.generateRawRequest(fullUrl, request),
        },
        response_details: {
          status_code: response.status,
          headers: this.normalizeHeaders(response.headers),
          body: response.data,
          size_bytes: responseSize,
          raw_response: this.generateRawResponse(response),
        },
        captured_variables: {},
        assertions_results: [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.formatError(error, timeout);

      this.logger.error(`Error: ${errorMessage}`, {
        stepName,
        duration,
        error: error as Error,
      });

      const fullUrl = this.buildFullUrl(request.url, baseUrl);

      return {
        step_name: stepName,
        status: 'failure',
        duration_ms: duration,
        request_details: {
          ...request,
          base_url: baseUrl,
          full_url: fullUrl,
          curl_command: this.generateCurlCommand(fullUrl, request),
          raw_request: this.generateRawRequest(fullUrl, request),
        },
        error_message: errorMessage,
        captured_variables: {},
        assertions_results: [],
      };
    }
  }

  private buildFullUrl(url: string, baseUrl?: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      return url;
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;

    return `${cleanBaseUrl}${cleanUrl}`;
  }

  private calculateResponseSize(response: AxiosResponse): number {
    try {
      if (response.data) {
        if (typeof response.data === 'string') {
          return Buffer.byteLength(response.data, 'utf8');
        } else {
          return Buffer.byteLength(JSON.stringify(response.data), 'utf8');
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private formatError(error: any, timeout: number): string {
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNABORTED') {
        return `Timeout after ${timeout}ms`;
      }

      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused by server';
      }

      if (axiosError.code === 'ENOTFOUND') {
        return 'Server not found (DNS)';
      }

      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      }

      if (axiosError.request) {
        return 'No response from server';
      }
    }

    return error.message || 'Unknown error';
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        const sanitizedValue = String(value).replace(/[^\x20-\x7E]/g, '');
        const sanitizedKey = key.replace(/[^\x20-\x7E]/g, '');

        if (sanitizedKey && sanitizedValue) {
          sanitized[sanitizedKey] = sanitizedValue;
        }
      }
    }

    return sanitized;
  }

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

  private generateCurlCommand(url: string, request: RequestDetails): string {
    const parts = [`curl -X ${request.method}`];

    const headers = request.headers || {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        const stringValue = String(value);
        if (stringValue.trim() === '') {
          continue;
        }
        const escapedValue = stringValue.replace(/'/g, "\\'");
        parts.push(`-H '${key}: ${escapedValue}'`);
      }
    }

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyStr =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      const escapedBody = bodyStr.replace(/'/g, "\\'");
      parts.push(`-d '${escapedBody}'`);
    }

    parts.push(`"${url}"`);
    return parts.join(' ');
  }

  private generateRawRequest(url: string, request: RequestDetails): string {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;

    let rawRequest = `${request.method} ${path} HTTP/1.1\r\n`;
    rawRequest += `Host: ${urlObj.host}\r\n`;

    const headers = request.headers || {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        rawRequest += `${key}: ${String(value)}\r\n`;
      }
    }

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyStr =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      rawRequest += `Content-Length: ${Buffer.byteLength(bodyStr, 'utf8')}\r\n`;
    }

    rawRequest += '\r\n';

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyStr =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      rawRequest += bodyStr;
    }

    return rawRequest;
  }

  private generateRawResponse(response: AxiosResponse): string {
    let rawResponse = `HTTP/1.1 ${response.status} ${response.statusText}\r\n`;

    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined && value !== null) {
        rawResponse += `${key}: ${String(value)}\r\n`;
      }
    }

    rawResponse += '\r\n';

    if (response.data) {
      const bodyStr =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data, null, 2);
      rawResponse += bodyStr;
    }

    return rawResponse;
  }
}