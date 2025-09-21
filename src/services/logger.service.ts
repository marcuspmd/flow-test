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

import chalk from "chalk";

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

  /**
   * Display captured variables in a formatted way
   */
  displayCapturedVariables(
    variables: Record<string, any>,
    context?: LogContext
  ): void {
    if (Object.keys(variables).length === 0) return;

    console.log(chalk.blue("\n📥 Variables Captured:"));
    Object.entries(variables).forEach(([key, value]) => {
      const formattedValue = this.formatValue(value);
      console.log(chalk.cyan(`   ${key}: ${formattedValue}`));
    });
  }

  /**
   * Display test metadata in a formatted way
   */
  displayTestMetadata(suite: any): void {
    console.log(chalk.yellow("\n📋 Test Metadata:"));

    if (suite.suite_name) {
      console.log(chalk.white(`   Suite: ${suite.suite_name}`));
    }

    if (suite.node_id) {
      console.log(chalk.gray(`   Node ID: ${suite.node_id}`));
    }

    if (suite.metadata?.priority) {
      const priorityIcon = this.getPriorityIcon(suite.metadata.priority);
      const priorityColor = this.getPriorityColor(suite.metadata.priority);
      console.log(
        priorityColor(`   Priority: ${priorityIcon} ${suite.metadata.priority}`)
      );
    }

    if (suite.metadata?.tags && suite.metadata.tags.length > 0) {
      console.log(chalk.magenta(`   Tags: ${suite.metadata.tags.join(", ")}`));
    }

    if (suite.metadata?.description) {
      console.log(chalk.white(`   Description: ${suite.metadata.description}`));
    }
  }

  /**
   * Display error context with detailed information
   */
  displayErrorContext(
    error: Error,
    context: {
      request?: any;
      response?: any;
      stepName?: string;
      assertion?: any;
    }
  ): void {
    console.log(chalk.red("\n❌ Error Details:"));

    if (context.stepName) {
      console.log(chalk.red(`   Step: ${context.stepName}`));
    }

    console.log(chalk.red(`   Message: ${error.message}`));

    if (context.request) {
      console.log(
        chalk.yellow(
          `   Request: ${context.request.method} ${context.request.url}`
        )
      );
    }

    if (context.response) {
      console.log(
        chalk.yellow(`   Response Status: ${context.response.status_code}`)
      );
    }

    if (context.assertion) {
      console.log(chalk.red(`   Failed Assertion: ${context.assertion.field}`));
      console.log(chalk.red(`     Expected: ${context.assertion.expected}`));
      console.log(chalk.red(`     Actual: ${context.assertion.actual}`));
    }

    if (error.stack) {
      console.log(chalk.gray(`   Stack Trace: ${error.stack}`));
    }
  }

  /**
   * Display test results in Jest-like format
   */
  displayJestStyle(result: any): void {
    const passed = result.steps_successful || 0;
    const failed = result.steps_failed || 0;
    const total = result.steps_executed || 0;

    const status = failed === 0 ? "PASS" : "FAIL";
    const color = failed === 0 ? chalk.green : chalk.red;
    const icon = failed === 0 ? "✓" : "✗";

    console.log(color(`\n${icon} ${result.suite_name || "Test Suite"}`));
    console.log(
      color(`  ${status} ${passed} passed, ${failed} failed, ${total} total`)
    );

    if (failed > 0) {
      console.log(chalk.red("\nFailures:"));
      // Aqui seria listado as falhas específicas se houvesse mais detalhes
    }
  }

  /**
   * Display scenario captures summary
   */
  displayScenarioSummary(
    captures: Array<{
      step: string;
      variables: Record<string, any>;
      timestamp: number;
    }>
  ): void {
    if (captures.length === 0) return;

    console.log(chalk.magenta("\n🎭 Scenario Captures Summary:"));
    captures.forEach((capture, index) => {
      console.log(chalk.magenta(`  Step ${index + 1}: ${capture.step}`));
      Object.entries(capture.variables).forEach(([key, value]) => {
        console.log(chalk.cyan(`    ${key}: ${this.formatValue(value)}`));
      });
    });
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return chalk.gray("null");
    }

    if (typeof value === "string") {
      return chalk.green(`"${value}"`);
    }

    if (typeof value === "number") {
      return chalk.yellow(value.toString());
    }

    if (typeof value === "boolean") {
      return value ? chalk.green("true") : chalk.red("false");
    }

    if (Array.isArray(value)) {
      return chalk.blue(`Array(${value.length})`);
    }

    if (typeof value === "object") {
      return chalk.blue(`Object(${Object.keys(value).length} keys)`);
    }

    return chalk.gray(String(value));
  }

  /**
   * Get priority icon
   */
  private getPriorityIcon(priority: string): string {
    switch (priority.toLowerCase()) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  }

  /**
   * Get priority color
   */
  private getPriorityColor(priority: string): any {
    switch (priority.toLowerCase()) {
      case "critical":
        return chalk.red;
      case "high":
        return chalk.red;
      case "medium":
        return chalk.yellow;
      case "low":
        return chalk.green;
      default:
        return chalk.white;
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

  // Delegate new display methods to the underlying logger if it supports them
  displayCapturedVariables(
    variables: Record<string, any>,
    context?: LogContext
  ): void {
    if (typeof (this.logger as any).displayCapturedVariables === "function") {
      (this.logger as any).displayCapturedVariables(variables, context);
    }
  }

  displayTestMetadata(suite: any): void {
    if (typeof (this.logger as any).displayTestMetadata === "function") {
      (this.logger as any).displayTestMetadata(suite);
    }
  }

  displayErrorContext(
    error: Error,
    context: {
      request?: any;
      response?: any;
      stepName?: string;
      assertion?: any;
    }
  ): void {
    if (typeof (this.logger as any).displayErrorContext === "function") {
      (this.logger as any).displayErrorContext(error, context);
    }
  }

  displayJestStyle(result: any): void {
    if (typeof (this.logger as any).displayJestStyle === "function") {
      (this.logger as any).displayJestStyle(result);
    }
  }

  displayScenarioSummary(
    captures: Array<{
      step: string;
      variables: Record<string, any>;
      timestamp: number;
    }>
  ): void {
    if (typeof (this.logger as any).displayScenarioSummary === "function") {
      (this.logger as any).displayScenarioSummary(captures);
    }
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
