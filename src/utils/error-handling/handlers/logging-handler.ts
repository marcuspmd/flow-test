import { BaseErrorHandler } from '../error-handler.interface';
import { ErrorContext } from '../error-context';
import { ErrorHandlingResult } from '../error-result';
import { LoggerService } from '../../../services/logger.service';
import { TYPES } from '../../../di/identifiers';
import { container } from '../../../di/container';

/**
 * Error handler that logs errors with structured context
 * Part of Chain of Responsibility pattern for error handling
 */
export class LoggingErrorHandler extends BaseErrorHandler {
  private logger: LoggerService;

  constructor() {
    super();
    // Get logger from DI container
    this.logger = container.get<LoggerService>(TYPES.ILogger);
  }

  /**
   * Handle error by logging with structured context
   */
  async handle(error: Error, context: ErrorContext): Promise<ErrorHandlingResult> {
    const logLevel = this.getLogLevel(context.severity);
    const logMessage = this.formatLogMessage(error, context);

    // Structured logging with context
    const logContext = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        service: context.service,
        operation: context.operation,
        metadata: context.metadata,
        timestamp: context.timestamp || Date.now(),
        attemptCount: context.attemptCount,
        maxRetries: context.maxRetries,
        severity: context.severity,
      }
    };

    // Log based on severity
    switch (logLevel) {
      case 'error':
        this.logger.error(logMessage, logContext);
        break;
      case 'warn':
        this.logger.warn(logMessage, logContext);
        break;
      case 'info':
        this.logger.info(logMessage, logContext);
        break;
      case 'debug':
        this.logger.debug(logMessage, logContext);
        break;
    }

    // Pass to next handler in chain
    return this.passToNext(error, context);
  }

  /**
   * Format error message with context
   */
  private formatLogMessage(error: Error, context: ErrorContext): string {
    const parts = [
      `[${context.service}]`,
      context.operation,
      'failed:',
      error.message
    ];

    if (context.attemptCount && context.maxRetries) {
      parts.push(`(attempt ${context.attemptCount}/${context.maxRetries})`);
    }

    return parts.join(' ');
  }

  /**
   * Determine log level based on error severity
   */
  private getLogLevel(severity?: string): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }
}
