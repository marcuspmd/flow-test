/**
 * @fileoverview Centralized error handling utility for consistent error management.
 *
 * @remarks
 * This utility eliminates repetitive try-catch blocks across services and provides
 * standardized error handling patterns with logging integration.
 *
 * Previously duplicated error handling patterns found in:
 * - CaptureService (6 blocks)
 * - CallService (3 blocks)
 * - HttpService (3 blocks)
 * - ScenarioService (2 blocks)
 * - JavaScriptService (4 blocks)
 *
 * @packageDocumentation
 */

import { getLogger } from "../services/logger.service";

/**
 * Logger interface compatible with Flow Test Engine's logger service.
 *
 * @public
 */
export interface Logger {
  error(message: string, context?: { error?: Error; [key: string]: any }): void;
  warn(message: string, context?: any): void;
  info(message: string, context?: any): void;
  debug(message: string, context?: any): void;
}

/**
 * Configuration options for error handling behavior.
 *
 * @public
 */
export interface ErrorHandlerOptions<T = any> {
  /** Logger instance to use for error logging */
  logger?: Logger;
  /** Error message to log */
  message: string;
  /** Whether to rethrow the error after logging */
  rethrow?: boolean;
  /** Default value to return on error (if not rethrowing) */
  defaultValue?: T;
  /** Additional context to include in error logs */
  context?: Record<string, any>;
  /** Error transformation function */
  errorTransform?: (error: Error) => Error;
  /** Custom error class to throw */
  errorClass?: new (message: string) => Error;
}

/**
 * Centralized error handler utility.
 *
 * @remarks
 * Provides consistent error handling patterns across the entire codebase,
 * reducing boilerplate and ensuring all errors are properly logged.
 *
 * **Benefits:**
 * - Eliminates ~100+ lines of duplicated try-catch blocks
 * - Standardizes error logging format
 * - Simplifies error handling logic
 * - Provides type-safe error handling
 * - Easy to add telemetry/monitoring hooks
 *
 * @example Basic error handling with logging
 * ```typescript
 * const result = ErrorHandler.handle(
 *   () => riskyOperation(),
 *   { message: "Operation failed", defaultValue: null }
 * );
 * ```
 *
 * @example Async error handling
 * ```typescript
 * const data = await ErrorHandler.handleAsync(
 *   async () => await fetchData(),
 *   { message: "Failed to fetch data", rethrow: true }
 * );
 * ```
 *
 * @example With custom logger
 * ```typescript
 * const value = ErrorHandler.handle(
 *   () => parseValue(input),
 *   {
 *     logger: customLogger,
 *     message: "Parse failed",
 *     context: { input }
 *   }
 * );
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ErrorHandler {
  private static defaultLogger = getLogger();

  /**
   * Handles synchronous operations with automatic error catching and logging.
   *
   * @param operation - Function to execute with error protection
   * @param options - Error handling configuration
   * @returns Result of operation or default value on error
   * @throws Error if rethrow is true
   *
   * @example Basic usage
   * ```typescript
   * const userId = ErrorHandler.handle(
   *   () => JSON.parse(userJson).id,
   *   { message: "Failed to parse user", defaultValue: -1 }
   * );
   * ```
   *
   * @example With rethrowing
   * ```typescript
   * const config = ErrorHandler.handle(
   *   () => loadConfig(path),
   *   { message: "Config load failed", rethrow: true }
   * );
   * ```
   */
  static handle<T>(
    operation: () => T,
    options: ErrorHandlerOptions<T>
  ): T | undefined {
    const logger = options.logger || this.defaultLogger;

    try {
      return operation();
    } catch (error) {
      const err = error as Error;

      // Log error with context
      logger.error(options.message, {
        error: err,
        ...(options.context || {}),
      });

      // Transform error if specified
      const finalError = options.errorTransform
        ? options.errorTransform(err)
        : err;

      // Rethrow if requested
      if (options.rethrow) {
        if (options.errorClass) {
          throw new options.errorClass(
            `${options.message}: ${finalError.message}`
          );
        }
        throw new Error(`${options.message}: ${finalError.message}`);
      }

      // Return default value
      return options.defaultValue;
    }
  }

  /**
   * Handles asynchronous operations with automatic error catching and logging.
   *
   * @param operation - Async function to execute with error protection
   * @param options - Error handling configuration
   * @returns Promise resolving to operation result or default value
   * @throws Error if rethrow is true
   *
   * @example Async API call
   * ```typescript
   * const user = await ErrorHandler.handleAsync(
   *   async () => await api.getUser(id),
   *   {
   *     message: "Failed to fetch user",
   *     defaultValue: null,
   *     context: { userId: id }
   *   }
   * );
   * ```
   *
   * @example With custom error class
   * ```typescript
   * await ErrorHandler.handleAsync(
   *   async () => await processData(data),
   *   {
   *     message: "Processing failed",
   *     rethrow: true,
   *     errorClass: ProcessingError
   *   }
   * );
   * ```
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions<T>
  ): Promise<T | undefined> {
    const logger = options.logger || this.defaultLogger;

    try {
      return await operation();
    } catch (error) {
      const err = error as Error;

      // Log error with context
      logger.error(options.message, {
        error: err,
        ...(options.context || {}),
      });

      // Transform error if specified
      const finalError = options.errorTransform
        ? options.errorTransform(err)
        : err;

      // Rethrow if requested
      if (options.rethrow) {
        if (options.errorClass) {
          throw new options.errorClass(
            `${options.message}: ${finalError.message}`
          );
        }
        throw new Error(`${options.message}: ${finalError.message}`);
      }

      // Return default value
      return options.defaultValue;
    }
  }

  /**
   * Handles multiple operations, collecting errors instead of failing fast.
   *
   * @remarks
   * Useful for batch operations where you want to attempt all operations
   * even if some fail, then handle errors collectively.
   *
   * @param operations - Array of operations to execute
   * @param options - Error handling configuration
   * @returns Array of results (successful operations) and array of errors
   *
   * @example
   * ```typescript
   * const { results, errors } = ErrorHandler.handleBatch(
   *   items.map(item => () => processItem(item)),
   *   { message: "Batch processing" }
   * );
   *
   * console.log(`Processed ${results.length} items`);
   * console.log(`Failed ${errors.length} items`);
   * ```
   */
  static handleBatch<T>(
    operations: Array<() => T>,
    options: Omit<ErrorHandlerOptions<T>, "rethrow" | "defaultValue">
  ): { results: T[]; errors: Error[] } {
    const logger = options.logger || this.defaultLogger;
    const results: T[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        results.push(operations[i]());
      } catch (error) {
        const err = error as Error;
        errors.push(err);

        logger.error(`${options.message} [${i}]`, {
          error: err,
          index: i,
          ...(options.context || {}),
        });
      }
    }

    return { results, errors };
  }

  /**
   * Async version of handleBatch for parallel operations.
   *
   * @param operations - Array of async operations to execute
   * @param options - Error handling configuration
   * @returns Promise with results and errors
   *
   * @example
   * ```typescript
   * const { results, errors } = await ErrorHandler.handleBatchAsync(
   *   urls.map(url => async () => await fetch(url)),
   *   { message: "Batch fetch" }
   * );
   * ```
   */
  static async handleBatchAsync<T>(
    operations: Array<() => Promise<T>>,
    options: Omit<ErrorHandlerOptions<T>, "rethrow" | "defaultValue">
  ): Promise<{ results: T[]; errors: Error[] }> {
    const logger = options.logger || this.defaultLogger;
    const results: T[] = [];
    const errors: Error[] = [];

    await Promise.allSettled(operations.map((op) => op())).then((outcomes) => {
      outcomes.forEach((outcome, i) => {
        if (outcome.status === "fulfilled") {
          results.push(outcome.value);
        } else {
          const err = outcome.reason as Error;
          errors.push(err);

          logger.error(`${options.message} [${i}]`, {
            error: err,
            index: i,
            ...(options.context || {}),
          });
        }
      });
    });

    return { results, errors };
  }

  /**
   * Wraps an operation with retry logic and error handling.
   *
   * @param operation - Function to execute with retries
   * @param options - Error handling and retry configuration
   * @returns Result of operation or default value
   *
   * @example
   * ```typescript
   * const data = await ErrorHandler.withRetry(
   *   async () => await unstableApi.fetch(),
   *   {
   *     message: "API fetch failed",
   *     retries: 3,
   *     retryDelay: 1000,
   *     defaultValue: null
   *   }
   * );
   * ```
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions<T> & {
      retries?: number;
      retryDelay?: number;
      shouldRetry?: (error: Error, attempt: number) => boolean;
    }
  ): Promise<T | undefined> {
    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;
    const logger = options.logger || this.defaultLogger;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        const shouldRetry = options.shouldRetry
          ? options.shouldRetry(lastError, attempt)
          : attempt < maxRetries;

        if (!shouldRetry) {
          break;
        }

        logger.warn(`${options.message} - Retry ${attempt + 1}/${maxRetries}`, {
          error: lastError,
          metadata: {
            attempt: attempt + 1,
            maxRetries,
            ...(options.context || {}),
          },
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    // All retries failed
    if (lastError) {
      logger.error(`${options.message} - All retries exhausted`, {
        error: lastError,
        metadata: {
          attempts: maxRetries + 1,
          ...(options.context || {}),
        },
      });

      if (options.rethrow) {
        throw new Error(`${options.message}: ${lastError.message}`);
      }
    }

    return options.defaultValue;
  }

  /**
   * Creates a wrapped version of a function with built-in error handling.
   *
   * @param fn - Function to wrap
   * @param options - Error handling configuration
   * @returns Wrapped function with error handling
   *
   * @example
   * ```typescript
   * const safeParseJson = ErrorHandler.wrap(
   *   JSON.parse,
   *   { message: "JSON parse failed", defaultValue: {} }
   * );
   *
   * const data = safeParseJson(jsonString); // Never throws
   * ```
   */
  static wrap<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    options: Omit<ErrorHandlerOptions<TReturn>, "context">
  ): (...args: TArgs) => TReturn | undefined {
    return (...args: TArgs) => {
      return this.handle(() => fn(...args), {
        ...options,
        context: { args },
      });
    };
  }

  /**
   * Creates a wrapped async function with built-in error handling.
   *
   * @param fn - Async function to wrap
   * @param options - Error handling configuration
   * @returns Wrapped async function with error handling
   *
   * @example
   * ```typescript
   * const safeFetch = ErrorHandler.wrapAsync(
   *   fetch,
   *   { message: "Fetch failed", defaultValue: null }
   * );
   *
   * const data = await safeFetch(url); // Never throws
   * ```
   */
  static wrapAsync<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: Omit<ErrorHandlerOptions<TReturn>, "context">
  ): (...args: TArgs) => Promise<TReturn | undefined> {
    return async (...args: TArgs) => {
      return this.handleAsync(() => fn(...args), {
        ...options,
        context: { args },
      });
    };
  }
}
