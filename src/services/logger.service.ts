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
import { injectable } from "inversify";
import { LogStreamingService, LogLevel } from "./log-streaming.service";
import { ILogger } from "../interfaces/services/ILogger";
import { JSONValue } from "../types/common.types";
import {
  TestSuite,
  RequestDetails,
  AssertionResult,
} from "../types/engine.types";
import { SuiteExecutionResult } from "../types/config.types";

/**
 * Structured logging interface compatible with ILogger.
 *
 * @remarks
 * The Logger interface defines the contract for all logging implementations in the
 * Flow Test Engine. It provides standard log levels with variadic arguments
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
 *   debug(message: string, ...args: any[]): void {
 *     console.log(`[DEBUG] ${message}`, ...args);
 *   }
 *
 *   info(message: string, ...args: any[]): void {
 *     console.log(`[INFO] ${message}`, ...args);
 *   }
 *
 *   warn(message: string, ...args: any[]): void {
 *     console.warn(`[WARN] ${message}`, ...args);
 *   }
 *
 *   error(message: string, ...args: any[]): void {
 *     console.error(`[ERROR] ${message}`, ...args);
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
   * @param args - Optional additional arguments for context
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Logs informational messages about normal system operation.
   *
   * @param message - The informational message to log
   * @param args - Optional additional arguments for context
   */
  info(message: string, ...args: any[]): void;

  /**
   * Logs warning messages about potential issues or unexpected conditions.
   *
   * @param message - The warning message to log
   * @param args - Optional additional arguments for context
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Logs error messages for exception handling and failure reporting.
   *
   * @param message - The error message to log
   * @param args - Optional additional arguments for context
   */
  error(message: string, ...args: any[]): void;
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

  debug(message: string, ...args: any[]): void {
    if (this.verbosity === "verbose") {
      this.log("DEBUG", message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.verbosity !== "silent") {
      this.log("INFO", message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.verbosity !== "silent") {
      this.log("WARN", message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.verbosity !== "silent") {
      this.log("ERROR", message, ...args);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const context = args[0] as Record<string, any> | undefined;
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
  displayCapturedVariables(variables: Record<string, any>): void {
    if (this.verbosity === "silent") {
      return;
    }
    if (Object.keys(variables).length === 0) return;

    console.log(chalk.blue("\n📥 Variables Captured:"));
    Object.entries(variables).forEach(([key, value]) => {
      const maskedValue = this.maskSensitiveValue(key, value);
      const formattedValue = this.formatValue(maskedValue);
      console.log(chalk.cyan(`   ${key}: ${formattedValue}`));
    });
  }

  /**
   * Display test metadata in a formatted way
   */
  displayTestMetadata(suite: TestSuite): void {
    if (this.verbosity === "silent") {
      return;
    }
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

    if (suite.description) {
      console.log(chalk.white(`   Description: ${suite.description}`));
    }
  }

  /**
   * Display error context with detailed information
   */
  displayErrorContext(
    error: Error,
    context: {
      request?: RequestDetails;
      response?: { status_code?: number; body?: JSONValue };
      stepName?: string;
      assertion?: AssertionResult;
    }
  ): void {
    if (this.verbosity === "silent") {
      return;
    }
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
  displayJestStyle(result: SuiteExecutionResult): void {
    if (this.verbosity === "silent") {
      return;
    }
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
    if (this.verbosity === "silent") {
      return;
    }
    if (captures.length === 0) return;

    console.log(chalk.magenta("\n🎭 Scenario Captures Summary:"));
    captures.forEach((capture, index) => {
      console.log(chalk.magenta(`  Step ${index + 1}: ${capture.step}`));
      Object.entries(capture.variables).forEach(([key, value]) => {
        console.log(chalk.cyan(`    ${key}: ${this.formatValue(value)}`));
      });
    });
  }

  displayRawHttpResponse(raw: string): void {
    if (this.verbosity === "silent") {
      return;
    }
    console.log(chalk.gray("\n🔍 Raw HTTP Response:"));
    console.log(chalk.gray(raw));
  }

  /**
   * Format value for display
   */
  private formatValue(value: unknown): string {
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

  private maskSensitiveValue(key: string, value: unknown): unknown {
    if (!key) {
      return value;
    }

    const lowered = key.toLowerCase();
    const patterns: RegExp[] = [
      /password/,
      /passphrase/,
      /secret/,
      /sensitive/,
      /token/,
      /api[-_]?key/,
      /access[-_]?key/,
      /secret[-_]?key/,
      /client[-_]?secret/,
      /credential/,
    ];
    const isSensitive = patterns.some((pattern) => pattern.test(lowered));

    if (!isSensitive) {
      return value;
    }

    if (typeof value === "string") {
      return "***";
    }

    if (Array.isArray(value)) {
      return value.map(() => "***");
    }

    if (typeof value === "object" && value !== null) {
      return Object.keys(value).reduce((masked, currentKey) => {
        masked[currentKey] = this.maskSensitiveValue(
          currentKey,
          (value as Record<string, unknown>)[currentKey]
        );
        return masked;
      }, {} as Record<string, unknown>);
    }

    return "***";
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
  private getPriorityColor(priority: string): typeof chalk.red {
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
  private pino: unknown;

  constructor(options: Record<string, unknown> = {}) {
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

  debug(message: string, ...args: any[]): void {
    (this.pino as any).debug(this.buildLogObject(args[0]), message);
  }

  info(message: string, ...args: any[]): void {
    (this.pino as any).info(this.buildLogObject(args[0]), message);
  }

  warn(message: string, ...args: any[]): void {
    (this.pino as any).warn(this.buildLogObject(args[0]), message);
  }

  error(message: string, ...args: any[]): void {
    (this.pino as any).error(this.buildLogObject(args[0]), message);
  }

  private buildLogObject(
    context?: Record<string, any>
  ): Record<string, JSONValue> {
    if (!context) return {};

    const logObj: Record<string, JSONValue> = {};

    if (context.nodeId) logObj.nodeId = context.nodeId;
    if (context.stepName) logObj.stepName = context.stepName;
    if (context.duration !== undefined) logObj.duration = context.duration;
    if (context.filePath) logObj.filePath = context.filePath;
    if (context.metadata) logObj.metadata = context.metadata;
    if (context.error) {
      logObj.error =
        context.error instanceof Error
          ? { message: context.error.message, stack: context.error.stack || "" }
          : context.error;
    }

    return logObj;
  }
}

/**
 * Simple Jest-style console logger adapter for Flow Test Engine
 *
 * @remarks
 * This logger provides Jest-like output formatting with clean, readable
 * test results. Designed for simple console output with test status indicators.
 *
 * @example Jest-style output
 * ```
 * PASS src/services/dependency.service.test.ts (5.623 s)
 *   DependencyService
 *     constructor
 *       ✓ should create instance with empty graph (4 ms)
 *       ✓ should handle simple dependencies (1 ms)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class JestStyleLoggerAdapter implements Logger {
  private verbosity: "silent" | "simple" | "detailed" | "verbose" = "simple";
  private currentSuite: string = "";
  private suiteStartTime: number = 0;
  private passCount: number = 0;
  private failCount: number = 0;
  private totalSuites: number = 0;
  private totalStartTime: number = 0;
  private currentSteps: string[] = []; // Store steps for correct ordering

  constructor(
    verbosity: "silent" | "simple" | "detailed" | "verbose" = "simple"
  ) {
    this.verbosity = verbosity;
    this.totalStartTime = Date.now();
  }

  debug(message: string, ...args: any[]): void {
    if (this.verbosity === "verbose") {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    const context = args[0] as Record<string, any> | undefined;
    if (this.verbosity === "silent") {
      return;
    }
    // Filter out internal messages in simple mode
    if (this.verbosity === "simple" && context?.metadata?.internal) {
      return;
    }

    // For simple mode, we handle test results specially
    if (context?.metadata?.type === "suite_start") {
      this.handleSuiteStart(message, context);
    } else if (context?.metadata?.type === "suite_complete") {
      this.handleSuiteComplete(message, context);
    } else if (context?.metadata?.type === "step_result") {
      this.handleStepResult(message, context);
    } else if (context?.metadata?.type === "execution_summary") {
      this.handleExecutionSummary(context.metadata);
    } else {
      console.log(message);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.verbosity === "silent") {
      return;
    }
    console.warn(chalk.yellow(`⚠️  ${message}`), ...args);
  }

  error(message: string, ...args: any[]): void {
    if (this.verbosity === "silent") {
      return;
    }
    const context = args[0] as Record<string, any> | undefined;
    console.error(chalk.red(`❌ ${message}`), ...args.slice(1));
    if (context?.error) {
      const errorDetails =
        context.error instanceof Error
          ? context.error.stack || context.error.message
          : context.error;
      console.error(chalk.red(`   ${errorDetails}`));
    }
  }

  private handleSuiteStart(
    message: string,
    context: Record<string, any>
  ): void {
    this.currentSuite = String(context.metadata?.suite_name || "Unknown Suite");
    this.suiteStartTime = Date.now();
    this.currentSteps = []; // Reset steps for new suite
  }

  private handleSuiteComplete(
    message: string,
    context: Record<string, any>
  ): void {
    const duration = ((Date.now() - this.suiteStartTime) / 1000).toFixed(3);
    const status = context.metadata?.success ? "PASS" : "FAIL";
    const statusColor = context.metadata?.success ? chalk.green : chalk.red;

    // Format file path to look more like jest
    const filePath = context.metadata?.file_path || this.currentSuite;
    const formattedPath = `tests/${filePath}.yaml`;

    // Show PASS/FAIL first (Jest order)
    console.log(`${statusColor(status)} ${formattedPath} (${duration} s)`);
    console.log(`  ${this.currentSuite}`);

    // Then show all accumulated steps
    this.currentSteps.forEach((step) => console.log(step));

    if (context.metadata?.success) {
      this.passCount++;
    } else {
      this.failCount++;
    }
    this.totalSuites++;
  }

  private handleStepResult(
    message: string,
    context: Record<string, any>
  ): void {
    const status = context.metadata?.success ? "✓" : "✗";
    const statusColor = context.metadata?.success ? chalk.green : chalk.red;
    const stepName = context.stepName || message;
    const duration = context.duration ? ` (${context.duration} ms)` : "";

    // Store step instead of immediately printing
    const stepLine = `    ${statusColor(status)} ${stepName}${chalk.gray(
      duration
    )}`;
    this.currentSteps.push(stepLine);
  }

  private handleExecutionSummary(metadata: Record<string, JSONValue>): void {
    const totalTime = ((Date.now() - this.totalStartTime) / 1000).toFixed(3);

    console.log("");
    if (this.failCount > 0) {
      console.log(
        chalk.red(
          `Test Suites: ${this.failCount} failed, ${this.passCount} passed, ${this.totalSuites} total`
        )
      );
    } else {
      console.log(
        chalk.green(
          `Test Suites: ${this.passCount} passed, ${this.totalSuites} total`
        )
      );
    }

    // Use the actual executed tests count instead of total discovered
    const successfulTests = Number(metadata.successful_tests || 0);
    const failedTests = Number(metadata.failed_tests || 0);
    const actualExecutedTests = successfulTests + failedTests;
    if (failedTests > 0) {
      console.log(
        chalk.red(
          `Tests: ${failedTests} failed, ${successfulTests} passed, ${actualExecutedTests} total`
        )
      );
    } else {
      console.log(
        chalk.green(
          `Tests: ${actualExecutedTests} passed, ${actualExecutedTests} total`
        )
      );
    }

    console.log(`Time: ${totalTime} s`);
    console.log("");
  }

  displayCapturedVariables(variables: Record<string, any>): void {
    if (this.verbosity === "verbose" && Object.keys(variables).length > 0) {
      console.log(chalk.blue("\n📥 Variables Captured:"));
      Object.entries(variables).forEach(([key, value]) => {
        const formattedValue =
          typeof value === "object" ? JSON.stringify(value) : String(value);
        console.log(chalk.cyan(`   ${key}: ${formattedValue}`));
      });
    }
  }

  displayTestMetadata(suite: TestSuite): void {
    if (this.verbosity === "verbose") {
      console.log(chalk.yellow(`\n📋 ${suite.suite_name || "Test Suite"}`));
      if (suite.metadata?.priority) {
        console.log(chalk.gray(`   Priority: ${suite.metadata.priority}`));
      }
    }
  }
}

/**
 * Logger service with configurable adapter and DI support
 *
 * @remarks
 * Provides logging capabilities with support for both dependency injection
 * and the legacy singleton pattern for backward compatibility.
 *
 * @example DI usage (recommended)
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.ILogger) private logger: ILogger) {}
 *
 *   doSomething(): void {
 *     this.logger.info('Operation started');
 *   }
 * }
 * ```
 *
 * @example Legacy singleton usage (deprecated)
 * ```typescript
 * const logger = getLogger();
 * logger.info('Legacy usage');
 * ```
 */
@injectable()
export class LoggerService implements ILogger {
  private logger: Logger;
  private logStream: LogStreamingService;
  private currentLogLevel: "debug" | "info" | "warn" | "error" | "silent" = "info";

  constructor() {
    // Default logger for DI
    this.logger = new ConsoleLoggerAdapter("simple");
    this.logStream = LogStreamingService.getInstance();
  }

  /**
   * Set a custom logger adapter (for advanced use cases)
   * @param logger - Logger adapter to use
   */
  setLoggerAdapter(logger: Logger): void {
    this.logger = logger;
  }

  debug(message: string, ...args: any[]): void {
    this.logger.debug(message, ...args);
    this.forward("debug", message, args[0]);
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(message, ...args);
    this.forward("info", message, args[0]);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(message, ...args);
    this.forward("warn", message, args[0]);
  }

  error(message: string, ...args: any[]): void {
    this.logger.error(message, ...args);
    this.forward("error", message, args[0]);
  }

  private forward(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    try {
      this.logStream.publish({
        level,
        message,
        context,
        origin: "logger",
      });
    } catch {
      // Não propagamos erros de streaming para não interromper o fluxo principal de logs
    }
  }

  // ========================================
  // ILogger Interface Implementation
  // ========================================

  /**
   * Set the log level
   * @param level - The log level to set
   */
  setLogLevel(level: "debug" | "info" | "warn" | "error" | "silent"): void {
    this.currentLogLevel = level;

    // Map to verbosity for ConsoleLoggerAdapter
    const verbosityMap: Record<string, any> = {
      debug: "verbose",
      info: "simple",
      warn: "simple",
      error: "simple", // Error level should still show errors
      silent: "silent",
    };

    if (this.logger instanceof ConsoleLoggerAdapter) {
      // Create new adapter with appropriate verbosity
      this.logger = new ConsoleLoggerAdapter(verbosityMap[level] || "simple");
    }
  }

  /**
   * Get current log level
   * @returns Current log level as string
   */
  getLogLevel(): string {
    return this.currentLogLevel;
  }

  // ========================================
  // Legacy Display Methods
  // ========================================

  // Delegate new display methods to the underlying logger if it supports them
  displayCapturedVariables(variables: Record<string, any>): void {
    if (typeof (this.logger as any).displayCapturedVariables === "function") {
      (this.logger as any).displayCapturedVariables(variables);
    }
  }

  displayTestMetadata(suite: TestSuite): void {
    if (
      typeof (this.logger as LoggerService).displayTestMetadata === "function"
    ) {
      (this.logger as LoggerService).displayTestMetadata(suite);
    }
  }

  displayErrorContext(
    error: Error,
    context: {
      request?: RequestDetails;
      response?: { status_code?: number; body?: JSONValue };
      stepName?: string;
      assertion?: AssertionResult;
    }
  ): void {
    if (
      typeof (this.logger as LoggerService).displayErrorContext === "function"
    ) {
      (this.logger as LoggerService).displayErrorContext(error, context);
    }
  }

  displayJestStyle(result: SuiteExecutionResult): void {
    if (typeof (this.logger as LoggerService).displayJestStyle === "function") {
      (this.logger as LoggerService).displayJestStyle(result);
    }
  }

  displayScenarioSummary(
    captures: Array<{
      step: string;
      variables: Record<string, JSONValue>;
      timestamp: number;
    }>
  ): void {
    if (
      typeof (this.logger as LoggerService).displayScenarioSummary ===
      "function"
    ) {
      (this.logger as LoggerService).displayScenarioSummary(captures);
    }
  }

  displayRawHttpResponse(raw: string): void {
    if (
      typeof (this.logger as LoggerService).displayRawHttpResponse ===
      "function"
    ) {
      (this.logger as LoggerService).displayRawHttpResponse(raw);
    }
  }
}
