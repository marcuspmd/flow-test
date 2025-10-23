import { BaseErrorHandler } from "../error-handler.interface";
import { ErrorContext } from "../error-context";
import { ErrorHandlingResult } from "../error-result";

/**
 * Error handler that implements retry logic with exponential backoff
 * Retries on transient errors like network failures, timeouts
 */
export class RetryErrorHandler extends BaseErrorHandler {
  private retryableErrors = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "NetworkError",
    "TimeoutError",
    "RequestError",
  ]);

  /**
   * Handle error by determining if retry is appropriate
   */
  async handle(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    const attemptCount = context.attemptCount || 1;
    const maxRetries = context.maxRetries || 3;

    // Check if should retry
    if (this.shouldRetry(error, attemptCount, maxRetries)) {
      const delay = this.calculateBackoff(attemptCount);

      return {
        handled: true,
        action: "retry",
        delay,
        message: `Retrying in ${delay}ms (attempt ${attemptCount}/${maxRetries})`,
        metadata: {
          attemptCount,
          maxRetries,
          backoffDelay: delay,
        },
      };
    }

    // Not retryable or max attempts exceeded - pass to next handler
    return this.passToNext(error, context);
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(
    error: Error,
    attemptCount: number,
    maxRetries: number
  ): boolean {
    // Don't retry if max attempts reached
    if (attemptCount >= maxRetries) {
      return false;
    }

    // Check if error is retryable by name
    if (this.retryableErrors.has(error.name)) {
      return true;
    }

    // Check if error has a retryable code
    const errorCode = (error as any).code;
    if (errorCode && this.retryableErrors.has(errorCode)) {
      return true;
    }

    // Check for network-related errors in message
    const networkKeywords = [
      "network",
      "timeout",
      "connection",
      "refused",
      "reset",
    ];
    const errorMessage = error.message.toLowerCase();
    return networkKeywords.some((keyword) => errorMessage.includes(keyword));
  }

  /**
   * Calculate exponential backoff delay
   * Formula: min(baseDelay * 2^(attempt-1), maxDelay)
   */
  private calculateBackoff(attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds

    // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped)
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);

    return Math.round(delay + jitter);
  }

  /**
   * Add a custom retryable error type
   */
  addRetryableError(errorName: string): void {
    this.retryableErrors.add(errorName);
  }

  /**
   * Remove a retryable error type
   */
  removeRetryableError(errorName: string): void {
    this.retryableErrors.delete(errorName);
  }
}
