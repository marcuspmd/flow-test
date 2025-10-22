/**
 * @fileoverview Response context builder utility for standardized context creation.
 *
 * @remarks
 * This utility eliminates code duplication across services that need to build
 * execution context from StepExecutionResult. Previously duplicated in
 * CaptureService and ScenarioService.
 *
 * @packageDocumentation
 */

import { StepExecutionResult } from "../types/config.types";

/**
 * Standardized response context structure used across services.
 *
 * @remarks
 * This interface ensures consistency in how response data is accessed
 * across different services (capture, scenario, assertion, etc.)
 *
 * @public
 */
export interface ResponseContext {
  /** HTTP status code from the response */
  status_code: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body (parsed JSON or raw) */
  body: any;
  /** Request duration in milliseconds */
  duration_ms: number;
  /** Response size in bytes */
  size_bytes?: number;
  /** Step execution status (optional, for scenario evaluation) */
  step_status?: "success" | "failure" | "skipped";
}

/**
 * Options for customizing context building behavior.
 *
 * @public
 */
export interface ResponseContextOptions {
  /** Include step execution status in context */
  includeStepStatus?: boolean;
  /** Include additional custom fields */
  additionalFields?: Record<string, any>;
}

/**
 * Utility class for building standardized response contexts.
 *
 * @remarks
 * Centralizes the logic for extracting response data from StepExecutionResult
 * and creating a consistent context object for use in JMESPath expressions,
 * assertions, and scenario evaluations.
 *
 * **Benefits:**
 * - Eliminates code duplication across services
 * - Ensures consistent context structure
 * - Single source of truth for context building
 * - Easy to extend with new fields
 *
 * @example Basic usage
 * ```typescript
 * const context = ResponseContextBuilder.build(executionResult);
 * // { status_code: 200, headers: {...}, body: {...}, duration_ms: 150 }
 * ```
 *
 * @example With step status
 * ```typescript
 * const context = ResponseContextBuilder.build(executionResult, {
 *   includeStepStatus: true
 * });
 * // { ..., step_status: 'success' }
 * ```
 *
 * @example With additional fields
 * ```typescript
 * const context = ResponseContextBuilder.build(executionResult, {
 *   additionalFields: { request_id: '123' }
 * });
 * // { ..., request_id: '123' }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ResponseContextBuilder {
  /**
   * Builds a standardized response context from execution result.
   *
   * @param result - The step execution result containing response data
   * @param options - Optional configuration for context building
   * @returns Standardized response context object
   * @throws Error if response_details is not available
   *
   * @example
   * ```typescript
   * const result: StepExecutionResult = {
   *   step_name: "Test",
   *   status: "success",
   *   duration_ms: 150,
   *   response_details: {
   *     status_code: 200,
   *     headers: { "content-type": "application/json" },
   *     body: { success: true },
   *     size_bytes: 1024
   *   }
   * };
   *
   * const context = ResponseContextBuilder.build(result);
   * // {
   * //   status_code: 200,
   * //   headers: { "content-type": "application/json" },
   * //   body: { success: true },
   * //   duration_ms: 150,
   * //   size_bytes: 1024
   * // }
   * ```
   */
  static build(
    result: StepExecutionResult,
    options?: ResponseContextOptions
  ): ResponseContext {
    if (!result.response_details) {
      throw new Error(
        "Response details not available for context building. " +
          "Ensure the step has executed and produced a response."
      );
    }

    const response = result.response_details;
    const context: ResponseContext = {
      status_code: response.status_code,
      headers: response.headers || {},
      body: response.body,
      duration_ms: result.duration_ms,
      size_bytes: response.size_bytes,
    };

    // Add optional step status for scenario evaluation
    if (options?.includeStepStatus) {
      context.step_status = result.status;
    }

    // Merge additional custom fields
    if (options?.additionalFields) {
      Object.assign(context, options.additionalFields);
    }

    return context;
  }

  /**
   * Validates if a result has the necessary response details for context building.
   *
   * @param result - The step execution result to validate
   * @returns True if result has valid response details
   *
   * @example
   * ```typescript
   * if (ResponseContextBuilder.hasValidResponse(result)) {
   *   const context = ResponseContextBuilder.build(result);
   * } else {
   *   console.log('No response available');
   * }
   * ```
   */
  static hasValidResponse(result: StepExecutionResult): boolean {
    return Boolean(
      result.response_details &&
        typeof result.response_details.status_code === "number"
    );
  }

  /**
   * Builds a minimal context from partial response data.
   *
   * @remarks
   * Useful when you need a context but some fields might be missing.
   * Provides safe defaults for missing fields.
   *
   * @param result - The step execution result (may have partial data)
   * @param options - Optional configuration
   * @returns Response context with safe defaults
   *
   * @example
   * ```typescript
   * // Works even if response_details is incomplete
   * const context = ResponseContextBuilder.buildSafe(partialResult);
   * ```
   */
  static buildSafe(
    result: StepExecutionResult,
    options?: ResponseContextOptions
  ): Partial<ResponseContext> {
    if (!result.response_details) {
      return {
        duration_ms: result.duration_ms,
        step_status: options?.includeStepStatus ? result.status : undefined,
      };
    }

    return this.build(result, options);
  }

  /**
   * Extracts specific fields from response context.
   *
   * @param result - The step execution result
   * @param fields - Array of field names to extract
   * @returns Object with only specified fields
   *
   * @example
   * ```typescript
   * const { status_code, body } = ResponseContextBuilder.extract(
   *   result,
   *   ['status_code', 'body']
   * );
   * ```
   */
  static extract(
    result: StepExecutionResult,
    fields: Array<keyof ResponseContext>
  ): Partial<ResponseContext> {
    const fullContext = this.build(result);
    const extracted: Partial<ResponseContext> = {};

    for (const field of fields) {
      if (field in fullContext) {
        extracted[field] = fullContext[field];
      }
    }

    return extracted;
  }
}
