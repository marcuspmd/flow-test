/**
 * Context information for logging
 */
export interface LogContext {
  /** Node ID of the current test node */
  nodeId?: string;
  
  /** Step name being executed */
  stepName?: string;
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** File path for context */
  filePath?: string;
  
  /** Error information */
  error?: Error | string;
}

/**
 * Logging interface with structured context
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/**
 * Console adapter for Logger interface
 */
export class ConsoleLoggerAdapter implements Logger {
  constructor(private verbosity: 'silent' | 'simple' | 'detailed' | 'verbose' = 'simple') {}

  debug(message: string, context?: LogContext): void {
    if (this.verbosity === 'verbose') {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.verbosity !== 'silent') {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.verbosity !== 'silent') {
      this.log('WARN', message, context);
    }
  }

  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
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
    const consoleMethod = level === 'ERROR' ? console.error : 
                         level === 'WARN' ? console.warn : 
                         console.log;
    
    consoleMethod(logMessage);
    
    // In detailed/verbose mode, show additional context
    if ((this.verbosity === 'detailed' || this.verbosity === 'verbose') && context?.metadata) {
      console.log('  Context:', JSON.stringify(context.metadata, null, 2));
    }
    
    // Show error details if present
    if (context?.error) {
      const errorDetails = context.error instanceof Error ? 
        context.error.stack || context.error.message : 
        context.error;
      console.error('  Error:', errorDetails);
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
      const pinoModule = require('pino');
      this.pino = pinoModule({
        level: 'debug',
        formatters: {
          level(label: string) {
            return { level: label };
          }
        },
        ...options
      });
    } catch (error) {
      throw new Error('Pino is not installed. Run: npm install pino');
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
      logObj.error = context.error instanceof Error ? 
        { message: context.error.message, stack: context.error.stack } : 
        context.error;
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
        logger = new ConsoleLoggerAdapter('simple');
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
  type: 'console' | 'pino' = 'console', 
  options: { verbosity?: 'silent' | 'simple' | 'detailed' | 'verbose' } | any = {}
): LoggerService {
  let logger: Logger;
  
  if (type === 'pino') {
    logger = new PinoLoggerAdapter(options);
  } else {
    logger = new ConsoleLoggerAdapter(options.verbosity || 'simple');
  }
  
  LoggerService.setLogger(logger);
  return LoggerService.getInstance();
}