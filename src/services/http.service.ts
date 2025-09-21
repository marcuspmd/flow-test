/**
 * @fileoverview HTTP service for executing API requests with comprehensive error handling and performance monitoring.
 *
 * @remarks
 * This module provides the HttpService class which handles all HTTP communication for the Flow Test Engine.
 * It includes request execution, response processing, error handling, and performance measurement capabilities.
 *
 * @packageDocumentation
 */

import axios, { AxiosResponse, AxiosError } from "axios";
import { RequestDetails } from "../types/engine.types";
import { StepExecutionResult } from "../types/config.types";
import { getLogger } from "./logger.service";

/**
 * HTTP service for executing API requests with comprehensive monitoring and error handling.
 *
 * @remarks
 * The HttpService is responsible for all HTTP communication within the Flow Test Engine.
 * It provides robust request execution with automatic URL construction, timeout management,
 * performance monitoring, and standardized error handling.
 *
 * **Key Features:**
 * - **Automatic URL Construction**: Combines base URLs with relative paths intelligently
 * - **Timeout Management**: Configurable timeouts with fallback to service defaults
 * - **Performance Monitoring**: Accurate response time measurement for all requests
 * - **Error Standardization**: Consistent error format across all HTTP operations
 * - **Request/Response Logging**: Detailed logging for debugging and monitoring
 * - **Content Type Handling**: Automatic JSON serialization and deserialization
 *
 * @example Basic request execution
 * ```typescript
 * const httpService = new HttpService('https://api.example.com', 30000);
 * const result = await httpService.executeRequest('User Login', {
 *   method: 'POST',
 *   url: '/auth/login',
 *   body: { username: 'testuser', password: 'secret123' }
 * });
 *
 * console.log(`Request completed in ${result.response_time}ms`);
 * console.log(`Status: ${result.status_code}`);
 * console.log(`Response:`, result.body);
 * ```
 *
 * @example Request with authentication and custom headers
 * ```typescript
 * const result = await httpService.executeRequest('Get User Profile', {
 *   method: 'GET',
 *   url: '/users/profile',
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *     'Content-Type': 'application/json',
 *     'X-Client-Version': '1.0.0'
 *   }
 * });
 * ```
 *
 * @example Request with query parameters
 * ```typescript
 * const result = await httpService.executeRequest('Search Users', {
 *   method: 'GET',
 *   url: '/users/search',
 *   params: {
 *     q: 'john',
 *     limit: 10,
 *     offset: 0
 *   }
 * });
 * ```
 *
 * @example Request with custom timeout
 * ```typescript
 * const result = await httpService.executeRequest('Upload File', {
 *   method: 'POST',
 *   url: '/files/upload',
 *   body: formData,
 *   timeout: 60000  // 60 second timeout for file upload
 * });
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class HttpService {
  /** Base URL for constructing complete URLs from relative paths */
  private baseUrl?: string;

  /** Timeout in milliseconds for HTTP requests */
  private timeout: number;

  private logger = getLogger();

  /**
   * Creates a new HttpService instance
   *
   * @param baseUrl - Optional base URL to prefix relative request URLs
   * @param timeout - Request timeout in milliseconds
   *
   * @defaultValue timeout - 60000ms (60 seconds)
   *
   * @example Constructor with base URL
   * ```typescript
   * const service = new HttpService('https://api.example.com');
   * ```
   *
   * @example Constructor with custom timeout
   * ```typescript
   * const service = new HttpService('https://api.example.com', 60000);
   * ```
   *
   * @example Constructor without base URL (absolute URLs only)
   * ```typescript
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

      this.logger.info(`${request.method} ${fullUrl}`, {
        stepName,
        metadata: { type: "http_request", internal: true },
      });

      // Configures the request
      const axiosConfig = {
        method: request.method.toLowerCase() as any,
        url: fullUrl,
        headers: this.sanitizeHeaders(request.headers || {}),
        data: request.body,
        params: request.params,
        timeout: this.timeout,
        validateStatus: () => true, // Does not reject by HTTP status
      };

      // Executes the request
      const response: AxiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      // Calculates response size
      const responseSize = this.calculateResponseSize(response);

      this.logger.info(`${response.status}`, {
        stepName,
        duration,
        metadata: { type: "http_response", internal: true },
      });

      return {
        step_name: stepName,
        status: "success",
        duration_ms: duration,
        request_details: {
          ...request,
          base_url: this.baseUrl,
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
      const errorMessage = this.formatError(error);

      this.logger.error(`Error: ${errorMessage}`, {
        stepName,
        duration,
        error: error as Error,
      });

      const fullUrl = this.buildFullUrl(request.url);

      return {
        step_name: stepName,
        status: "failure",
        duration_ms: duration,
        request_details: {
          ...request,
          base_url: this.baseUrl,
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

    // If there's no base_url or it's not a string, return the URL as is
    if (!this.baseUrl || typeof this.baseUrl !== "string") {
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
  setBaseUrl(baseUrl: string | undefined): void {
    this.baseUrl = baseUrl && typeof baseUrl === "string" ? baseUrl : undefined;
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

  /**
   * Generates a complete cURL command for the request
   */
  private generateCurlCommand(url: string, request: RequestDetails): string {
    const parts = [`curl -X ${request.method}`];

    // Add headers
    const headers = request.headers || {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        const stringValue = String(value);
        // Skip empty headers or headers with only whitespace
        if (stringValue.trim() === "") {
          continue;
        }
        // Escape single quotes and wrap in single quotes for cURL
        const escapedValue = stringValue.replace(/'/g, "\\'");
        parts.push(`-H '${key}: ${escapedValue}'`);
      }
    }

    // Add body for methods that support it
    if (request.body && ["POST", "PUT", "PATCH"].includes(request.method)) {
      const bodyStr =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
      // Escape single quotes for shell
      const escapedBody = bodyStr.replace(/'/g, "\\'");
      parts.push(`-d '${escapedBody}'`);
    }

    // Add URL (always last)
    parts.push(`"${url}"`);

    return parts.join(" ");
  }

  /**
   * Generates raw HTTP request text
   */
  private generateRawRequest(url: string, request: RequestDetails): string {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;

    let rawRequest = `${request.method} ${path} HTTP/1.1\r\n`;
    rawRequest += `Host: ${urlObj.host}\r\n`;

    // Add headers
    const headers = request.headers || {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        rawRequest += `${key}: ${String(value)}\r\n`;
      }
    }

    // Add content-length for body requests
    if (request.body && ["POST", "PUT", "PATCH"].includes(request.method)) {
      const bodyStr =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
      rawRequest += `Content-Length: ${Buffer.byteLength(bodyStr, "utf8")}\r\n`;
    }

    rawRequest += "\r\n";

    // Add body
    if (request.body && ["POST", "PUT", "PATCH"].includes(request.method)) {
      const bodyStr =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
      rawRequest += bodyStr;
    }

    return rawRequest;
  }

  /**
   * Generates raw HTTP response text
   */
  private generateRawResponse(response: AxiosResponse): string {
    let rawResponse = `HTTP/1.1 ${response.status} ${response.statusText}\r\n`;

    // Add response headers
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined && value !== null) {
        rawResponse += `${key}: ${String(value)}\r\n`;
      }
    }

    rawResponse += "\r\n";

    // Add response body
    if (response.data) {
      const bodyStr =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data, null, 2);
      rawResponse += bodyStr;
    }

    return rawResponse;
  }

  /**
   * Returns the configured base URL (if any)
   */
  getBaseUrl(): string | undefined {
    return this.baseUrl;
  }
}
