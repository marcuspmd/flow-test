/**
 * Custom error hierarchy for Flow Test Engine
 * Provides typed, structured errors with context for better debugging
 */

/**
 * Base error class for all Flow Test Engine errors
 */
export class FlowTestError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when test suite validation fails
 */
export class ValidationError extends FlowTestError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Error thrown when configuration is invalid or missing
 */
export class ConfigurationError extends FlowTestError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }
}

/**
 * Error thrown when dependency resolution fails
 */
export class DependencyResolutionError extends FlowTestError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DEPENDENCY_RESOLUTION_ERROR', context);
  }
}

/**
 * Error thrown when call recursion limit is exceeded
 */
export class CallRecursionError extends FlowTestError {
  public readonly currentDepth: number;
  public readonly maxDepth: number;

  constructor(
    message: string,
    currentDepth: number,
    maxDepth: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'CALL_RECURSION_ERROR', { ...context, currentDepth, maxDepth });
    this.currentDepth = currentDepth;
    this.maxDepth = maxDepth;
  }
}

/**
 * Error thrown when file operations fail
 */
export class FileOperationError extends FlowTestError {
  public readonly filePath?: string;

  constructor(message: string, filePath?: string, context?: Record<string, unknown>) {
    super(message, 'FILE_OPERATION_ERROR', { ...context, filePath });
    this.filePath = filePath;
  }
}

/**
 * Error thrown when path traversal security check fails
 */
export class PathTraversalError extends FlowTestError {
  public readonly attemptedPath: string;
  public readonly allowedRoot: string;

  constructor(
    message: string,
    attemptedPath: string,
    allowedRoot: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'PATH_TRAVERSAL_ERROR', {
      ...context,
      attemptedPath,
      allowedRoot,
    });
    this.attemptedPath = attemptedPath;
    this.allowedRoot = allowedRoot;
  }
}

/**
 * Error thrown when HTTP request fails
 */
export class HTTPRequestError extends FlowTestError {
  public readonly statusCode?: number;
  public readonly url?: string;

  constructor(
    message: string,
    statusCode?: number,
    url?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'HTTP_REQUEST_ERROR', { ...context, statusCode, url });
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * Error thrown when assertion fails
 */
export class AssertionError extends FlowTestError {
  public readonly expected?: unknown;
  public readonly actual?: unknown;
  public readonly operator?: string;

  constructor(
    message: string,
    expected?: unknown,
    actual?: unknown,
    operator?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'ASSERTION_ERROR', { ...context, expected, actual, operator });
    this.expected = expected;
    this.actual = actual;
    this.operator = operator;
  }
}

/**
 * Error thrown when JavaScript execution fails
 */
export class JavaScriptExecutionError extends FlowTestError {
  public readonly expression?: string;

  constructor(message: string, expression?: string, context?: Record<string, unknown>) {
    super(message, 'JAVASCRIPT_EXECUTION_ERROR', { ...context, expression });
    this.expression = expression;
  }
}

/**
 * Error thrown when variable interpolation fails
 */
export class InterpolationError extends FlowTestError {
  public readonly variable?: string;

  constructor(message: string, variable?: string, context?: Record<string, unknown>) {
    super(message, 'INTERPOLATION_ERROR', { ...context, variable });
    this.variable = variable;
  }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends FlowTestError {
  public readonly schemaPath?: string;
  public readonly validationErrors?: unknown[];

  constructor(
    message: string,
    validationErrors?: unknown[],
    schemaPath?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'SCHEMA_VALIDATION_ERROR', {
      ...context,
      validationErrors,
      schemaPath,
    });
    this.validationErrors = validationErrors;
    this.schemaPath = schemaPath;
  }
}

/**
 * Type guard to check if an error is a FlowTestError
 */
export function isFlowTestError(error: unknown): error is FlowTestError {
  return error instanceof FlowTestError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a ConfigurationError
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Type guard to check if an error is a DependencyResolutionError
 */
export function isDependencyResolutionError(
  error: unknown
): error is DependencyResolutionError {
  return error instanceof DependencyResolutionError;
}

/**
 * Helper function to create a safe error object from unknown errors
 */
export function toFlowTestError(error: unknown, fallbackMessage?: string): FlowTestError {
  if (isFlowTestError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new FlowTestError(
      error.message,
      'UNKNOWN_ERROR',
      { originalError: error.name }
    );
  }

  return new FlowTestError(
    fallbackMessage || 'An unknown error occurred',
    'UNKNOWN_ERROR',
    { error: String(error) }
  );
}
