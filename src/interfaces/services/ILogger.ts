/**
 * @fileoverview Logger service interface for dependency injection.
 *
 * @remarks
 * Defines the contract for logging services in the Flow Test Engine.
 * All services that need logging should depend on this interface rather
 * than the concrete LoggerService implementation.
 *
 * @packageDocumentation
 */

/**
 * Logging service interface
 *
 * @remarks
 * Provides structured logging capabilities with multiple severity levels.
 * Implementations must support debug, info, warn, and error logging with
 * configurable log levels.
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.ILogger) private logger: ILogger) {}
 *
 *   doSomething(): void {
 *     this.logger.info('Starting operation');
 *     try {
 *       // ... operation
 *       this.logger.debug('Operation details:', { data });
 *     } catch (error) {
 *       this.logger.error('Operation failed:', error);
 *     }
 *   }
 * }
 * ```
 */
export interface ILogger {
  /**
   * Log a debug message (lowest priority)
   * Only shown when log level is set to 'debug'
   *
   * @param message - The debug message
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log an informational message
   * Shown when log level is 'info', 'warn', or 'error'
   *
   * @param message - The info message
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log a warning message
   * Shown when log level is 'warn' or 'error'
   *
   * @param message - The warning message
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log an error message (highest priority)
   * Always shown regardless of log level
   *
   * @param message - The error message
   * @param args - Additional arguments to log (typically Error objects)
   */
  error(message: string, ...args: any[]): void;

  /**
   * Set the minimum log level
   *
   * @param level - The log level ('debug', 'info', 'warn', 'error', 'silent')
   */
  setLogLevel(level: "debug" | "info" | "warn" | "error" | "silent"): void;

  /**
   * Get the current log level
   *
   * @returns The current log level as a string
   */
  getLogLevel(): string;
}
