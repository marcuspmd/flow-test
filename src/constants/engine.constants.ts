/**
 * @fileoverview Engine constants to replace magic numbers and strings.
 *
 * @remarks
 * Centralized constants for the Flow Test Engine.
 * Replace hardcoded values throughout the codebase with these constants.
 *
 * @packageDocumentation
 */

/**
 * Engine-wide constants for configuration, limits, and defaults.
 */
export const ENGINE_CONSTANTS = {
  /**
   * Maximum depth for cross-suite step calls (prevents infinite recursion).
   * Used in call.service.ts
   */
  MAX_CALL_DEPTH: 10,

  /**
   * Default HTTP request timeout in milliseconds.
   * Used in http.service.ts
   */
  DEFAULT_TIMEOUT_MS: 60000,

  /**
   * Default estimated duration per test step (for progress calculation).
   * Used in discovery.ts
   */
  DEFAULT_STEP_DURATION_MS: 500,

  /**
   * Environment variable prefix for Flow Test configuration.
   * Variables starting with this prefix are automatically loaded.
   */
  ENV_VAR_PREFIX: "FLOW_TEST_",

  /**
   * Cache time-to-live defaults.
   */
  CACHE: {
    /** Default cache TTL in milliseconds (5 minutes) */
    TTL_DEFAULT_MS: 300000,

    /** Delay before clearing interpolation cache (debounce) */
    INTERPOLATION_CLEAR_DELAY_MS: 5000,
  },

  /**
   * File and directory patterns for test discovery.
   */
  FILE_PATTERNS: {
    /** Default test file patterns */
    TEST_FILES: ["**/*.test.yml", "**/*.test.yaml", "**/*-test.yml", "**/*-test.yaml"],

    /** Config file names to search for */
    CONFIG_FILES: ["flow-test.config.yml", "flow-test.config.yaml", ".flow-test.yml", ".flow-test.yaml"],

    /** Patterns to exclude from test discovery */
    EXCLUDE_PATTERNS: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/drafts/**",
      "**/*.draft.yml",
      "**/*.draft.yaml",
      "**/.*", // Hidden files/directories
    ],
  },

  /**
   * HTTP defaults and limits.
   */
  HTTP: {
    /** Default maximum redirects to follow */
    MAX_REDIRECTS: 5,

    /** Default headers for all requests */
    DEFAULT_HEADERS: {
      "User-Agent": "Flow-Test-Engine/2.0",
    },

    /** Response size limits */
    MAX_RESPONSE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  },

  /**
   * Logging and reporting.
   */
  LOGGING: {
    /** Maximum log message length before truncation */
    MAX_LOG_LENGTH: 10000,

    /** Maximum depth for object logging */
    MAX_OBJECT_DEPTH: 5,
  },

  /**
   * Test execution defaults.
   */
  EXECUTION: {
    /** Default parallel worker count */
    DEFAULT_WORKERS: 4,

    /** Maximum parallel workers allowed */
    MAX_WORKERS: 16,

    /** Retry configuration */
    RETRY: {
      /** Default max retry attempts */
      DEFAULT_MAX_ATTEMPTS: 3,

      /** Default delay between retries (ms) */
      DEFAULT_DELAY_MS: 1000,

      /** Backoff multiplier for exponential backoff */
      BACKOFF_MULTIPLIER: 2,
    },
  },

  /**
   * Variable interpolation.
   */
  INTERPOLATION: {
    /** Pattern for variable placeholders */
    VARIABLE_PATTERN: /\{\{([^}]+)\}\}/g,

    /** Special variable prefixes */
    PREFIXES: {
      FAKER: "$faker",
      JAVASCRIPT: "$js",
      ENVIRONMENT: "$env",
      JMESPATH: "$jmespath",
    },
  },

  /**
   * Input/Interactive testing.
   */
  INPUT: {
    /** Default timeout for user input (ms) */
    DEFAULT_TIMEOUT_MS: 300000, // 5 minutes

    /** Maximum input length */
    MAX_INPUT_LENGTH: 10000,
  },

  /**
   * Priority levels for test execution.
   */
  PRIORITY: {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  } as const,

  /**
   * Test result statuses.
   */
  STATUS: {
    SUCCESS: "success",
    FAILURE: "failure",
    SKIPPED: "skipped",
    ERROR: "error",
    PENDING: "pending",
  } as const,

  /**
   * File extensions.
   */
  EXTENSIONS: {
    YAML: [".yml", ".yaml"],
    JSON: [".json"],
    JAVASCRIPT: [".js", ".mjs"],
  },

  /**
   * Report generation.
   */
  REPORTS: {
    /** Default output directory for reports */
    DEFAULT_OUTPUT_DIR: "results",

    /** Report file names */
    FILES: {
      LATEST: "latest.json",
      HTML: "report.html",
      JUNIT: "junit.xml",
    },
  },
} as const;

/**
 * HTTP status code ranges for quick checks.
 */
export const HTTP_STATUS = {
  /** 1xx Informational */
  INFORMATIONAL: { min: 100, max: 199 },

  /** 2xx Success */
  SUCCESS: { min: 200, max: 299 },

  /** 3xx Redirection */
  REDIRECTION: { min: 300, max: 399 },

  /** 4xx Client Error */
  CLIENT_ERROR: { min: 400, max: 499 },

  /** 5xx Server Error */
  SERVER_ERROR: { min: 500, max: 599 },
} as const;

/**
 * Common HTTP status codes.
 */
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error messages and templates.
 */
export const ERROR_MESSAGES = {
  NETWORK: {
    TIMEOUT: "Request timed out after {timeout}ms",
    CONNECTION_REFUSED: "Connection refused to {url}",
    DNS_LOOKUP_FAILED: "DNS lookup failed for {hostname}",
  },
  VALIDATION: {
    ASSERTION_FAILED: "Assertion failed: {field} {operator} {expected}, got {actual}",
    SCHEMA_INVALID: "Schema validation failed: {errors}",
    VARIABLE_NOT_FOUND: "Variable '{{name}}' not found in context",
  },
  FILE: {
    NOT_FOUND: "File not found: {path}",
    INVALID_YAML: "Invalid YAML syntax in {path}: {error}",
    PERMISSION_DENIED: "Permission denied accessing {path}",
  },
  DEPENDENCY: {
    CIRCULAR: "Circular dependency detected: {path}",
    NOT_FOUND: "Dependency not found: {nodeId}",
    MAX_DEPTH_EXCEEDED: "Maximum call depth ({depth}) exceeded",
  },
} as const;

/**
 * Helper to check if HTTP status is successful (2xx).
 */
export function isSuccessStatus(status: number): boolean {
  return status >= HTTP_STATUS.SUCCESS.min && status <= HTTP_STATUS.SUCCESS.max;
}

/**
 * Helper to check if HTTP status is client error (4xx).
 */
export function isClientError(status: number): boolean {
  return (
    status >= HTTP_STATUS.CLIENT_ERROR.min && status <= HTTP_STATUS.CLIENT_ERROR.max
  );
}

/**
 * Helper to check if HTTP status is server error (5xx).
 */
export function isServerError(status: number): boolean {
  return (
    status >= HTTP_STATUS.SERVER_ERROR.min && status <= HTTP_STATUS.SERVER_ERROR.max
  );
}
