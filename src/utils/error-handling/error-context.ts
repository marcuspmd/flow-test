/**
 * Context information for error handling
 * Provides metadata about where and how an error occurred
 */
export interface ErrorContext {
  /** Service where the error occurred */
  service: string;

  /** Operation being executed when error happened */
  operation: string;

  /** Additional metadata about the error context */
  metadata?: Record<string, any>;

  /** Current attempt number (for retry logic) */
  attemptCount?: number;

  /** Maximum number of retry attempts allowed */
  maxRetries?: number;

  /** Severity level of the error */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** Timestamp when error occurred (unix timestamp in ms) */
  timestamp?: number;

  /** Original error object for reference */
  originalError?: Error;

  /** User-facing error message (if different from technical message) */
  userMessage?: string;

  /** Whether this error should be reported to external services */
  reportable?: boolean;
}
