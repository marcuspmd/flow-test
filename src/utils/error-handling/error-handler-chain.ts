import { ErrorHandler } from './error-handler.interface';
import { LoggingErrorHandler } from './handlers/logging-handler';
import { RetryErrorHandler } from './handlers/retry-handler';
import { NotificationErrorHandler } from './handlers/notification-handler';

/**
 * Builder for creating error handler chains
 * Implements fluent interface for composing error handlers
 */
export class ErrorHandlerChain {
  /**
   * Create default error handler chain
   * Default chain: Logging → Retry → Notification
   * 
   * @returns The first handler in the chain
   * 
   * @example
   * ```typescript
   * const errorHandler = ErrorHandlerChain.createDefault();
   * 
   * try {
   *   await someOperation();
   * } catch (error) {
   *   const result = await errorHandler.handle(error as Error, {
   *     service: 'MyService',
   *     operation: 'someOperation',
   *     severity: 'high'
   *   });
   * }
   * ```
   */
  static createDefault(): ErrorHandler {
    const logger = new LoggingErrorHandler();
    const retry = new RetryErrorHandler();
    const notify = new NotificationErrorHandler();

    // Chain: log → retry → notify
    logger.setNext(retry).setNext(notify);

    return logger;
  }

  /**
   * Create custom error handler chain from handlers array
   * Handlers are chained in the order provided
   * 
   * @param handlers - Array of error handlers to chain
   * @returns The first handler in the chain
   * @throws {Error} If no handlers provided
   * 
   * @example
   * ```typescript
   * const chain = ErrorHandlerChain.create(
   *   new LoggingErrorHandler(),
   *   new CustomMetricsHandler(),
   *   new RetryErrorHandler()
   * );
   * ```
   */
  static create(...handlers: ErrorHandler[]): ErrorHandler {
    if (handlers.length === 0) {
      throw new Error('At least one handler is required to create a chain');
    }

    // Chain handlers in order
    for (let i = 0; i < handlers.length - 1; i++) {
      handlers[i].setNext(handlers[i + 1]);
    }

    return handlers[0];
  }

  /**
   * Create chain with only logging (no retry or notification)
   * Useful for non-critical operations
   * 
   * @returns Logging-only handler
   */
  static createLoggingOnly(): ErrorHandler {
    return new LoggingErrorHandler();
  }

  /**
   * Create chain with logging and retry (no notification)
   * Useful for operations that may fail transiently but are not critical
   * 
   * @returns Handler chain with logging and retry
   */
  static createWithRetry(): ErrorHandler {
    const logger = new LoggingErrorHandler();
    const retry = new RetryErrorHandler();
    
    logger.setNext(retry);
    
    return logger;
  }

  /**
   * Create chain with logging and notification (no retry)
   * Useful for operations that should not be retried but need immediate attention
   * 
   * @returns Handler chain with logging and notification
   */
  static createCriticalOnly(): ErrorHandler {
    const logger = new LoggingErrorHandler();
    const notify = new NotificationErrorHandler();
    
    logger.setNext(notify);
    
    return logger;
  }
}

/**
 * Fluent builder for creating customized error handler chains
 * Provides more control over chain composition
 * 
 * @example
 * ```typescript
 * const chain = new ErrorHandlerChainBuilder()
 *   .withLogging()
 *   .withRetry()
 *   .withNotification()
 *   .build();
 * ```
 */
export class ErrorHandlerChainBuilder {
  private handlers: ErrorHandler[] = [];

  /**
   * Add logging handler to chain
   */
  withLogging(): this {
    this.handlers.push(new LoggingErrorHandler());
    return this;
  }

  /**
   * Add retry handler to chain
   */
  withRetry(): this {
    this.handlers.push(new RetryErrorHandler());
    return this;
  }

  /**
   * Add notification handler to chain
   */
  withNotification(): this {
    this.handlers.push(new NotificationErrorHandler());
    return this;
  }

  /**
   * Add custom handler to chain
   */
  withCustom(handler: ErrorHandler): this {
    this.handlers.push(handler);
    return this;
  }

  /**
   * Build the handler chain
   * @throws {Error} If no handlers added
   */
  build(): ErrorHandler {
    if (this.handlers.length === 0) {
      throw new Error('At least one handler must be added before building');
    }

    return ErrorHandlerChain.create(...this.handlers);
  }

  /**
   * Reset builder to empty state
   */
  reset(): this {
    this.handlers = [];
    return this;
  }
}
