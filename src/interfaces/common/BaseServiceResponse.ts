/**
 * @fileoverview Base service response interfaces for standardizing service return types.
 *
 * @remarks
 * This module provides a consistent structure for all service responses across the
 * Flow Test Engine. It promotes maintainability, predictability, and easier error handling.
 *
 * **Design Principles:**
 * - **Consistency**: All services return the same base structure
 * - **Type Safety**: Strong typing with generics for data payloads
 * - **Error Handling**: Standardized error structure with codes and details
 * - **Metadata**: Optional metadata for timing, tracing, and debugging
 *
 * @packageDocumentation
 */

/**
 * Standardized error structure for service failures.
 *
 * @remarks
 * Provides consistent error information across all services, making it easier
 * to handle and log errors in a uniform way.
 *
 * @example
 * ```typescript
 * const error: ServiceError = {
 *   code: 'HTTP_REQUEST_FAILED',
 *   message: 'Failed to connect to API endpoint',
 *   details: {
 *     url: 'https://api.example.com',
 *     statusCode: 500,
 *     retryable: true
 *   }
 * };
 * ```
 */
export interface ServiceError {
  /** Error code for programmatic error handling (e.g., 'HTTP_REQUEST_FAILED', 'ASSERTION_FAILED') */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Optional additional error details (original error, context, etc.) */
  details?: any;

  /** Stack trace if available */
  stack?: string;

  /** Whether this error is retryable */
  retryable?: boolean;
}

/**
 * Metadata about the service operation execution.
 *
 * @remarks
 * Provides contextual information about how the operation was executed,
 * useful for debugging, performance monitoring, and tracing.
 *
 * @example
 * ```typescript
 * const metadata: ResponseMetadata = {
 *   duration_ms: 245,
 *   timestamp: '2025-10-22T22:10:00.000Z',
 *   source: 'HttpService.request',
 *   attempt: 2,
 *   cached: false
 * };
 * ```
 */
export interface ResponseMetadata {
  /** Operation duration in milliseconds */
  duration_ms?: number;

  /** ISO timestamp when operation completed */
  timestamp?: string;

  /** Source service/method that generated this response */
  source?: string;

  /** Attempt number (for retry logic) */
  attempt?: number;

  /** Whether result came from cache */
  cached?: boolean;

  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Base service response structure.
 *
 * @typeParam T - Type of the data payload on success
 *
 * @remarks
 * All services should return responses conforming to this interface.
 * This provides a consistent API across the entire engine.
 *
 * **Usage Patterns:**
 *
 * **Success Response:**
 * ```typescript
 * return {
 *   success: true,
 *   data: { token: 'abc123', expiresIn: 3600 },
 *   metadata: { duration_ms: 150, source: 'AuthService' }
 * };
 * ```
 *
 * **Error Response:**
 * ```typescript
 * return {
 *   success: false,
 *   error: {
 *     code: 'AUTH_FAILED',
 *     message: 'Invalid credentials',
 *     details: { username: 'user@example.com' }
 *   },
 *   metadata: { duration_ms: 50, source: 'AuthService' }
 * };
 * ```
 *
 * **Partial Success (with warnings):**
 * ```typescript
 * return {
 *   success: true,
 *   data: { results: [...], skipped: 2 },
 *   warnings: [
 *     { code: 'PARTIAL_RESULTS', message: 'Some items were skipped' }
 *   ],
 *   metadata: { duration_ms: 300 }
 * };
 * ```
 */
export interface BaseServiceResponse<T = any> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Data payload on success (undefined on failure) */
  data?: T;

  /** Error information on failure (undefined on success) */
  error?: ServiceError;

  /** Non-fatal warnings that occurred during execution */
  warnings?: ServiceError[];

  /** Optional metadata about the operation */
  metadata?: ResponseMetadata;
}

/**
 * Type guard to check if a response is successful.
 *
 * @param response - Service response to check
 * @returns True if response is successful with data
 *
 * @example
 * ```typescript
 * const response = await httpService.request(...);
 *
 * if (isSuccessResponse(response)) {
 *   // TypeScript knows response.data is defined
 *   console.log(response.data.body);
 * } else {
 *   // TypeScript knows response.error is defined
 *   console.error(response.error.message);
 * }
 * ```
 */
export function isSuccessResponse<T>(
  response: BaseServiceResponse<T>
): response is BaseServiceResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

/**
 * Type guard to check if a response is a failure.
 *
 * @param response - Service response to check
 * @returns True if response failed with error
 *
 * @example
 * ```typescript
 * const response = await assertionService.validate(...);
 *
 * if (isErrorResponse(response)) {
 *   // TypeScript knows response.error is defined
 *   throw new Error(response.error.message);
 * }
 * ```
 */
export function isErrorResponse<T>(
  response: BaseServiceResponse<T>
): response is BaseServiceResponse<T> & { error: ServiceError } {
  return !response.success && response.error !== undefined;
}

/**
 * Creates a success response.
 *
 * @typeParam T - Type of the data payload
 * @param data - Data payload
 * @param metadata - Optional metadata
 * @returns Success response
 *
 * @example
 * ```typescript
 * return createSuccessResponse(
 *   { token: 'abc123' },
 *   { duration_ms: 100, source: 'AuthService' }
 * );
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: ResponseMetadata
): BaseServiceResponse<T> {
  return {
    success: true,
    data,
    metadata,
  };
}

/**
 * Creates an error response.
 *
 * @typeParam T - Type of the data payload (usually omitted for errors)
 * @param error - Error information
 * @param metadata - Optional metadata
 * @returns Error response
 *
 * @example
 * ```typescript
 * return createErrorResponse<HttpResponse>(
 *   {
 *     code: 'HTTP_TIMEOUT',
 *     message: 'Request timed out after 5000ms',
 *     details: { url: '/api/endpoint' },
 *     retryable: true
 *   },
 *   { duration_ms: 5000, attempt: 3 }
 * );
 * ```
 */
export function createErrorResponse<T = any>(
  error: ServiceError | string,
  metadata?: ResponseMetadata
): BaseServiceResponse<T> {
  const errorObj: ServiceError =
    typeof error === "string"
      ? { code: "UNKNOWN_ERROR", message: error }
      : error;

  return {
    success: false,
    error: errorObj,
    metadata,
  };
}

/**
 * Creates a success response with warnings.
 *
 * @typeParam T - Type of the data payload
 * @param data - Data payload
 * @param warnings - Array of warnings
 * @param metadata - Optional metadata
 * @returns Success response with warnings
 *
 * @example
 * ```typescript
 * return createSuccessWithWarnings(
 *   { results: [1, 2, 3], skipped: 2 },
 *   [{ code: 'PARTIAL_RESULTS', message: '2 items skipped due to validation errors' }],
 *   { duration_ms: 200 }
 * );
 * ```
 */
export function createSuccessWithWarnings<T>(
  data: T,
  warnings: ServiceError[],
  metadata?: ResponseMetadata
): BaseServiceResponse<T> {
  return {
    success: true,
    data,
    warnings,
    metadata,
  };
}
