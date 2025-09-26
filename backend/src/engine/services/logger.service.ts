import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export interface LogContext {
  nodeId?: string;
  stepName?: string;
  duration?: number;
  metadata?: Record<string, any>;
  filePath?: string;
  error?: Error;
  expression?: string;
  value?: any;
  suiteId?: string;
  status?: string;
  stepIndex?: number;
  context?: string;
  runId?: string;
  availableVariables?: string[];
  totalSteps?: number;
  passed?: number;
  failed?: number;
  method?: string;
  url?: string;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private isVerbose = process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'verbose';

  log(message: string, context?: LogContext): void {
    this.info(message, context);
  }

  error(message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'error',
      timestamp,
      message,
      ...context,
    };

    if (this.isVerbose) {
      console.error(`[ERROR] ${timestamp} ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }

    // Write to structured log for production
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logEntry));
    }
  }

  warn(message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'warn',
      timestamp,
      message,
      ...context,
    };

    if (this.isVerbose) {
      console.warn(`[WARN] ${timestamp} ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }

    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify(logEntry));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isVerbose) return;

    const timestamp = new Date().toISOString();
    console.debug(`[DEBUG] ${timestamp} ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  verbose(message: string, context?: LogContext): void {
    if (!this.isVerbose) return;

    const timestamp = new Date().toISOString();
    console.log(`[VERBOSE] ${timestamp} ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  info(message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'info',
      timestamp,
      message,
      ...context,
    };

    if (this.isVerbose) {
      console.log(`[INFO] ${timestamp} ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    }
  }

  setVerbose(verbose: boolean): void {
    this.isVerbose = verbose;
  }

  isVerboseEnabled(): boolean {
    return this.isVerbose;
  }
}