/**
 * @fileoverview HTTP service interface for dependency injection.
 *
 * @remarks
 * Defines the contract for HTTP request execution services in the Flow Test Engine.
 *
 * @packageDocumentation
 */

import { RequestDetails, StepExecutionResult } from "../../types/engine.types";

/**
 * HTTP service interface
 *
 * @remarks
 * Provides HTTP request execution with timeout management, performance monitoring,
 * and standardized error handling.
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.IHttpService) private httpService: IHttpService) {}
 *
 *   async callAPI(): Promise<void> {
 *     this.httpService.setBaseUrl('https://api.example.com');
 *     this.httpService.setTimeout(30000);
 *
 *     const result = await this.httpService.executeRequest('Get Users', {
 *       method: 'GET',
 *       url: '/users',
 *       headers: { 'Authorization': 'Bearer token' }
 *     });
 *
 *     console.log(`Status: ${result.status_code}`);
 *     console.log(`Response time: ${result.response_time}ms`);
 *   }
 * }
 * ```
 */
export interface IHttpService {
  /**
   * Execute an HTTP request and return the result
   *
   * @param stepName - Descriptive name for the request step
   * @param request - Request configuration (method, URL, headers, body, etc.)
   * @param suiteNodeId - Optional suite node ID for certificate resolution
   * @returns Promise resolving to execution result with response data and metrics
   */
  executeRequest(
    stepName: string,
    request: RequestDetails,
    suiteNodeId?: string
  ): Promise<StepExecutionResult>;

  /**
   * Set the base URL for relative requests
   *
   * @param baseUrl - Base URL to use (e.g., 'https://api.example.com')
   */
  setBaseUrl(baseUrl: string | undefined): void;

  /**
   * Set the default timeout for requests
   *
   * @param timeout - Timeout in milliseconds
   */
  setTimeout(timeout: number): void;

  /**
   * Construct a full URL from base URL and relative path
   *
   * @param url - Relative or absolute URL
   * @returns Complete URL ready for request
   */
  constructUrl(url: string): string;

  /**
   * Get the current base URL
   *
   * @returns Current base URL or undefined if not set
   */
  getBaseUrl(): string | undefined;
}
