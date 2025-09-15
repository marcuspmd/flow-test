/**
 * @fileoverview Comprehensive logging service with structured context and configurable verbosity levels.
 *
 * @remarks
 * This module provides the logging infrastructure for the Flow Test Engine with support for
 * structured logging, contextual information, and multiple verbosity levels. It includes
 * interfaces for structured logging and adapters for different output targets.
 *
 * @packageDocumentation
 */

/**
 * Context information for structured logging operations.
 *
 * @remarks
 * LogContext provides additional metadata that can be attached to log messages
 * to enhance debugging, monitoring, and analysis capabilities. This structured
 * approach ensures consistent logging across the entire Flow Test Engine.
 *
 * @example Basic context usage
 * ```typescript
 * const context: LogContext = {
 *   nodeId: 'test-node-1',
 *   stepName: 'User Login',
 *   duration: 150,
 *   metadata: { userId: 123, action: 'authentication' }
 * };
 *
 * logger.info('Login successful', context);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export interface LogContext {
  /** Node ID of the current test node for tracking execution flow */
  nodeId?: string;

  /** Step name being executed for contextual identification */
  stepName?: string;

  /** Duration in milliseconds for performance monitoring */
  duration?: number;

  /** Additional metadata for enhanced debugging and analysis */
  metadata?: Record<string, any>;

  /** File path for context and source tracking */
  filePath?: string;

  /** Error information for exception handling and debugging */
  error?: Error | string;
}

/**
 * Structured logging interface with contextual information support.
 *
 * @remarks
 * The Logger interface defines the contract for all logging implementations in the
 * Flow Test Engine. It provides standard log levels with optional structured context
 * to enhance debugging, monitoring, and operational visibility.
 *
 * **Log Levels:**
 * - **debug**: Detailed diagnostic information for development and troubleshooting
 * - **info**: General informational messages about system operation
 * - **warn**: Warning messages about potential issues or unexpected conditions
 * - **error**: Error messages for exception handling and failure reporting
 *
 * @example Custom logger implementation
 * ```typescript
 * class CustomLogger implements Logger {
 *   debug(message: string, context?: LogContext): void {
 *     // Custom debug implementation
 *   }
 *
 *   info(message: string, context?: LogContext): void {
 *     console.log(`[INFO] ${message}`, context);
 *   }
 *
 *   warn(message: string, context?: LogContext): void {
 *     console.warn(`[WARN] ${message}`, context);
 *   }
 *
 *   error(message: string, context?: LogContext): void {
 *     console.error(`[ERROR] ${message}`, context);
 *   }
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export interface Logger {
  /**
   * Logs debug-level messages for detailed diagnostic information.
   *
   * @param message - The debug message to log
   * @param context - Optional contextual information for structured logging
   *
   * @remarks
   * Debug messages are typically used for detailed diagnostic information
   * that is only useful during development and troubleshooting.
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Logs informational messages about normal system operation.
   *
   * @param message - The informational message to log
   * @param context - Optional contextual information for structured logging
   *
   * @remarks
   * Info messages provide general information about system operation
   * and are typically visible in production environments.
   */
  info(message: string, context?: LogContext): void;

  /**
   * Logs warning messages about potential issues or unexpected conditions.
   *
   * @param message - The warning message to log
   * @param context - Optional contextual information for structured logging
   *
   * @remarks
   * Warning messages indicate potential issues that don't prevent
   * system operation but may require attention.
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Logs error messages for exception handling and failure reporting.
   *
   * @param message - The error message to log
   * @param context - Optional contextual information for structured logging
   *
   * @remarks
   * Error messages indicate failures or exceptions that prevent
   * normal system operation and require immediate attention.
   */
  error(message: string, context?: LogContext): void;
}

/**
 * Console-based implementation of the Logger interface with configurable verbosity.
 *
 * @remarks
 * ConsoleLoggerAdapter provides a console-based logging implementation with support
 * for different verbosity levels. It formats log messages with timestamps, context
 * information, and appropriate styling for console output.
 *
 * **Verbosity Levels:**
 * - **silent**: No output (all messages suppressed)
 * - **simple**: Basic info, warn, and error messages
 * - **detailed**: Includes formatted context information
 * - **verbose**: All messages including debug output
 *
 * @example Creating a console logger
 * ```typescript
 * const logger = new ConsoleLoggerAdapter('detailed');
 *
 * logger.info('Test execution started', {
 *   nodeId: 'test-1',
 *   stepName: 'User Registration',
 *   metadata: { environment: 'staging' }
 * });
 *
 * logger.error('Authentication failed', {
 *   error: new Error('Invalid credentials'),
 *   duration: 150
 * });
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ConsoleLoggerAdapter implements Logger {
  /**
   * Creates a new ConsoleLoggerAdapter instance.
   *
   * @param verbosity - The verbosity level controlling which messages are displayed
   * @defaultValue 'simple'
   *
   * @remarks
   * The verbosity level determines which log messages are output to the console:
   * - 'silent': No messages are displayed
   * - 'simple': Only info, warn, and error messages
   * - 'detailed': Includes context formatting
   * - 'verbose': All messages including debug output
   */
  constructor(
    private verbosity: "silent" | "simple" | "detailed" | "verbose" = "simple"
  ) {}

  debug(message: string, context?: LogContext): void {
    if (this.verbosity === "verbose") {
      this.log("DEBUG", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.verbosity !== "silent") {
      this.log("INFO", message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.verbosity !== "silent") {
      this.log("WARN", message, context);
    }
  }

  error(message: string, context?: LogContext): void {
    this.log("ERROR", message, context);
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}]`;

    if (context?.nodeId) {
      logMessage += ` [${context.nodeId}]`;
    }

    if (context?.stepName) {
      logMessage += ` [${context.stepName}]`;
    }

    logMessage += ` ${message}`;

    if (context?.duration !== undefined) {
      logMessage += ` (${context.duration}ms)`;
    }

    // Output to appropriate console method
    const consoleMethod =
      level === "ERROR"
        ? console.error
        : level === "WARN"
        ? console.warn
        : console.log;

    consoleMethod(logMessage);

    // In detailed/verbose mode, show additional context
    if (
      (this.verbosity === "detailed" || this.verbosity === "verbose") &&
      context?.metadata
    ) {
      console.log("  Context:", JSON.stringify(context.metadata, null, 2));
    }

    // Show error details if present
    if (context?.error) {
      const errorDetails =
        context.error instanceof Error
          ? context.error.stack || context.error.message
          : context.error;
      console.error("  Error:", errorDetails);
    }
  }
}

/**
 * Pino adapter for Logger interface (structured JSON logging)
 */
export class PinoLoggerAdapter implements Logger {
  private pino: any;

  constructor(options: any = {}) {
    try {
      const pinoModule = require("pino");
      this.pino = pinoModule({
        level: "debug",
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
        ...options,
      });
    } catch (error) {
      throw new Error("Pino is not installed. Run: npm install pino");
    }
  }

  debug(message: string, context?: LogContext): void {
    this.pino.debug(this.buildLogObject(context), message);
  }

  info(message: string, context?: LogContext): void {
    this.pino.info(this.buildLogObject(context), message);
  }

  warn(message: string, context?: LogContext): void {
    this.pino.warn(this.buildLogObject(context), message);
  }

  error(message: string, context?: LogContext): void {
    this.pino.error(this.buildLogObject(context), message);
  }

  private buildLogObject(context?: LogContext): any {
    if (!context) return {};

    const logObj: any = {};

    if (context.nodeId) logObj.nodeId = context.nodeId;
    if (context.stepName) logObj.stepName = context.stepName;
    if (context.duration !== undefined) logObj.duration = context.duration;
    if (context.filePath) logObj.filePath = context.filePath;
    if (context.metadata) logObj.metadata = context.metadata;
    if (context.error) {
      logObj.error =
        context.error instanceof Error
          ? { message: context.error.message, stack: context.error.stack }
          : context.error;
    }

    return logObj;
  }
}

/**
 * Logger service with configurable adapter
 */
export class LoggerService {
  private static instance: LoggerService;
  private logger: Logger;

  private constructor(logger: Logger) {
    this.logger = logger;
  }

  static getInstance(logger?: Logger): LoggerService {
    if (!LoggerService.instance) {
      if (!logger) {
        // Default to console logger with 'simple' verbosity
        logger = new ConsoleLoggerAdapter("simple");
      }
      LoggerService.instance = new LoggerService(logger);
    }
    return LoggerService.instance;
  }

  static setLogger(logger: Logger): void {
    if (LoggerService.instance) {
      LoggerService.instance.logger = logger;
    } else {
      LoggerService.instance = new LoggerService(logger);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }
}

// Export convenience function for getting logger instance
export function getLogger(): LoggerService {
  return LoggerService.getInstance();
}

// Export convenience function for setting up logger with options
export function setupLogger(
  type: "console" | "pino" = "console",
  options:
    | { verbosity?: "silent" | "simple" | "detailed" | "verbose" }
    | any = {}
): LoggerService {
  let logger: Logger;

  if (type === "pino") {
    logger = new PinoLoggerAdapter(options);
  } else {
    logger = new ConsoleLoggerAdapter(options.verbosity || "simple");
  }

  LoggerService.setLogger(logger);
  return LoggerService.getInstance();
}
