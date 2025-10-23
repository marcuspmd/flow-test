import { ErrorContext } from "./error-context";
import { ErrorHandlingResult } from "./error-result";

/**
 * Base interface for error handlers in the Chain of Responsibility pattern
 * Each handler can process an error and optionally pass it to the next handler
 */
export interface ErrorHandler {
  /**
   * Set the next handler in the chain
   * @param handler - Next error handler
   * @returns The handler that was set (for chaining)
   */
  setNext(handler: ErrorHandler): ErrorHandler;

  /**
   * Handle an error with given context
   * @param error - The error to handle
   * @param context - Context information about the error
   * @returns Promise resolving to the handling result
   */
  handle(error: Error, context: ErrorContext): Promise<ErrorHandlingResult>;
}

/**
 * Abstract base class for error handlers
 * Provides default implementation of chain management
 */
export abstract class BaseErrorHandler implements ErrorHandler {
  private nextHandler?: ErrorHandler;

  /**
   * Set the next handler in the chain
   */
  setNext(handler: ErrorHandler): ErrorHandler {
    this.nextHandler = handler;
    return handler;
  }

  /**
   * Get the next handler (for subclasses)
   */
  protected getNext(): ErrorHandler | undefined {
    return this.nextHandler;
  }

  /**
   * Handle error - must be implemented by subclasses
   */
  abstract handle(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorHandlingResult>;

  /**
   * Pass error to next handler in chain
   */
  protected async passToNext(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    if (this.nextHandler) {
      return this.nextHandler.handle(error, context);
    }

    // No next handler - return unhandled result
    return {
      handled: false,
      action: "rethrow",
      message: "No handler in chain could handle this error",
    };
  }
}
