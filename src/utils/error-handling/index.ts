/**
 * Error Handling Chain
 *
 * Centralized error handling using Chain of Responsibility pattern.
 * Provides standardized error logging, retry logic, and notifications.
 */

export { ErrorHandler, BaseErrorHandler } from "./error-handler.interface";
export { ErrorContext } from "./error-context";
export { ErrorHandlingResult, ErrorAction } from "./error-result";
export { LoggingErrorHandler } from "./handlers/logging-handler";
export { RetryErrorHandler } from "./handlers/retry-handler";
export { NotificationErrorHandler } from "./handlers/notification-handler";
export {
  ErrorHandlerChain,
  ErrorHandlerChainBuilder,
} from "./error-handler-chain";
