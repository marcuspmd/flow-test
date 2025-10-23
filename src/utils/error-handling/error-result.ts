/**
 * Action to take after error handling
 */
export type ErrorAction = "retry" | "skip" | "rethrow" | "abort";

/**
 * Result of error handling operation
 * Indicates how the error was handled and what action should be taken
 */
export interface ErrorHandlingResult {
  /** Whether the error was successfully handled */
  handled: boolean;

  /** Action to take next */
  action?: ErrorAction;

  /** Delay in milliseconds before retry (if action is 'retry') */
  delay?: number;

  /** Severity level determined by handler */
  severity?: "low" | "medium" | "high" | "critical";

  /** Custom message from handler */
  message?: string;

  /** Additional metadata from handler */
  metadata?: Record<string, any>;

  /** Whether the error should propagate to next handler */
  shouldPropagate?: boolean;

  /** Transformed or wrapped error (if handler modified it) */
  transformedError?: Error;
}
