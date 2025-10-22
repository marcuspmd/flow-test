/**
 * @fileoverview Utilities for masking sensitive variable values and reducing output verbosity
 * @packageDocumentation
 */

/**
 * Configuration for object summarization
 */
interface SummarizationConfig {
  maxDepth: number;
  maxObjectSize: number;
  maxArrayLength: number;
  maxStringLength: number;
}

const DEFAULT_CONFIG: SummarizationConfig = {
  maxDepth: 3,
  maxObjectSize: 50, // Max properties in an object before summarizing
  maxArrayLength: 10, // Max array elements before summarizing
  maxStringLength: 500, // Max string length before truncating
};

/**
 * Reduces verbosity of large/complex objects while maintaining readability
 *
 * @param obj - Object to summarize
 * @param config - Summarization configuration
 * @returns Summarized object with reduced verbosity
 * @public
 */
export function reduceVerbosity(
  obj: any,
  config: Partial<SummarizationConfig> = {}
): any {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const seen = new WeakSet();

  function summarize(value: any, depth: number = 0): any {
    // Prevent infinite recursion
    if (value && typeof value === "object" && seen.has(value)) {
      return "[CIRCULAR_REFERENCE]";
    }

    // Max depth reached
    if (depth >= finalConfig.maxDepth) {
      if (Array.isArray(value)) {
        return `[ARRAY_${value.length}_ITEMS_DEPTH_LIMIT]`;
      }
      if (value && typeof value === "object") {
        return "[OBJECT_DEPTH_LIMIT]";
      }
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length > finalConfig.maxArrayLength) {
        const preview = value
          .slice(0, 2)
          .map((item) => summarize(item, depth + 1));
        return [...preview, `[...AND_${value.length - 2}_MORE_ITEMS]`];
      }
      return value.map((item) => summarize(item, depth + 1));
    }

    // Handle objects
    if (value && typeof value === "object") {
      seen.add(value);

      const keys = Object.keys(value);

      // Large object - provide summary
      if (keys.length > finalConfig.maxObjectSize) {
        seen.delete(value);
        return {
          "[LARGE_OBJECT_SUMMARY]": {
            total_properties: keys.length,
            sample_keys: keys.slice(0, 5),
            has_more:
              keys.length > 5 ? `${keys.length - 5} more properties` : false,
          },
        };
      }

      // Normal object - process recursively
      const result: Record<string, any> = {};
      for (const key of keys) {
        result[key] = summarize(value[key], depth + 1);
      }

      seen.delete(value);
      return result;
    }

    // Handle strings
    if (
      typeof value === "string" &&
      value.length > finalConfig.maxStringLength
    ) {
      return `${value.substring(0, 100)}...[TRUNCATED_${value.length}_CHARS]`;
    }

    return value;
  }

  return summarize(obj);
}

/**
 * Masks sensitive variable values for security in output
 *
 * @param variables - Variables object to mask
 * @returns New object with sensitive values masked
 * @public
 */
export function maskSensitiveVariables(
  variables: Record<string, any>
): Record<string, any> {
  const masked: Record<string, any> = {};

  // Patterns for sensitive variable names
  const sensitivePatterns = [
    /password/i,
    /passphrase/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /api_key/i,
    /access_key/i,
    /client_secret/i,
    /private/i,
    /sensitive/i,
    /username/i,
    /user_name/i,
    /login/i,
    /email/i, // Email addresses can be sensitive
    /cert/i, // Certificate paths/content
    /pem/i, // PEM certificate content
  ];

  // Environment variable prefixes that are always sensitive
  const envPrefixes = [
    "FLOW_TEST_",
    "DATABASE_",
    "DB_",
    "REDIS_",
    "MONGO_",
    "AWS_",
    "AZURE_",
    "GCP_",
    "GOOGLE_",
    "GITHUB_",
    "GITLAB_",
    "DOCKER_",
    "KUBERNETES_",
    "K8S_",
  ];

  // System environment variables that are often sensitive
  const systemEnvVars = new Set([
    "PATH",
    "HOME",
    "USER",
    "USERNAME",
    "PASSWORD",
    "PWD",
    "SHELL",
    "TERM",
    "LANG",
    "LC_ALL",
    "SSH_AUTH_SOCK",
    "SSH_AGENT_PID",
  ]);

  for (const [key, value] of Object.entries(variables)) {
    let shouldMask = false;

    // Check if it's a sensitive pattern
    shouldMask = sensitivePatterns.some((pattern) => pattern.test(key));

    // Check if it's an environment variable with sensitive prefix
    if (!shouldMask) {
      shouldMask = envPrefixes.some((prefix) => key.startsWith(prefix));
    }

    // Check if it's a known system environment variable
    if (!shouldMask) {
      shouldMask = systemEnvVars.has(key);
    }

    // Check if it's any environment variable from process.env
    if (!shouldMask) {
      shouldMask = process.env.hasOwnProperty(key);
    }

    if (shouldMask) {
      masked[key] = maskValue(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Masks a single value appropriately based on its type
 *
 * @param value - Value to mask
 * @returns Masked value
 * @private
 */
function maskValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.length <= 3) {
      return "***";
    }

    const firstChar = value.charAt(0);
    const lastChar = value.charAt(value.length - 1);
    // Para uma string de 9 chars, queremos: primeiro + 7 asteriscos + último = 9 total
    const maskedMiddle = "*".repeat(value.length - 2);

    return `${firstChar}${maskedMiddle}${lastChar}`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return "***";
  }

  if (Array.isArray(value)) {
    // Para arrays sensíveis, mascarar cada elemento
    return value.map(() => "***");
  }

  if (value && typeof value === "object") {
    // Para objetos sensíveis, mascarar cada propriedade
    const maskedObj: Record<string, unknown> = {};
    for (const key in value as Record<string, unknown>) {
      maskedObj[key] = "***";
    }
    return maskedObj;
  }

  // Para null/undefined em variáveis sensíveis
  if (value === null || value === undefined) {
    return "***";
  }

  return value;
}

/**
 * Configuration for intelligent variable filtering
 */
export interface VariableFilterConfig {
  /** Show only variables captured in current session */
  recentCapturesOnly?: boolean;
  /** Show only variables used in interpolation within last N steps */
  recentUsageDepth?: number;
  /** Include specific variable patterns regardless of other filters */
  alwaysInclude?: string[];
  /** Exclude specific variable patterns */
  alwaysExclude?: string[];
  /** Maximum number of variables to show per category */
  maxPerCategory?: number;
}

const DEFAULT_FILTER_CONFIG: VariableFilterConfig = {
  recentCapturesOnly: false,
  recentUsageDepth: 3,
  alwaysInclude: ["base_url", "suite_name"],
  alwaysExclude: [],
  maxPerCategory: 10,
};

/**
 * Intelligently filters variables to show only what's relevant for current context
 *
 * @param variables - All available variables
 * @param context - Current execution context information
 * @param config - Filter configuration
 * @returns Filtered variables containing only relevant ones
 * @public
 */
export function filterRelevantVariables(
  variables: Record<string, any>,
  context: {
    stepType?: "request" | "input" | "call" | "scenario" | "iteration";
    stepName?: string;
    recentCaptures?: Set<string>;
    usedInStep?: Set<string>;
    isFirstStep?: boolean;
  } = {},
  config: Partial<VariableFilterConfig> = {}
): Record<string, any> {
  const finalConfig = { ...DEFAULT_FILTER_CONFIG, ...config };
  const relevant: Record<string, any> = {};

  // Categories of variables by relevance
  const categories = {
    alwaysInclude: new Set<string>(),
    recentCaptures: new Set<string>(),
    usedInStep: new Set<string>(),
    contextRelevant: new Set<string>(),
    exported: new Set<string>(),
    environment: new Set<string>(),
  };

  // Categorize all variables
  for (const [key, value] of Object.entries(variables)) {
    // Always include patterns
    if (
      finalConfig.alwaysInclude?.some((pattern) =>
        typeof pattern === "string"
          ? key.includes(pattern)
          : new RegExp(pattern).test(key)
      )
    ) {
      categories.alwaysInclude.add(key);
      continue;
    }

    // Always exclude patterns
    if (
      finalConfig.alwaysExclude?.some((pattern) =>
        typeof pattern === "string"
          ? key.includes(pattern)
          : new RegExp(pattern).test(key)
      )
    ) {
      continue;
    }

    // Recent captures (highest priority)
    if (context.recentCaptures?.has(key)) {
      categories.recentCaptures.add(key);
      continue;
    }

    // Variables used in current step
    if (context.usedInStep?.has(key)) {
      categories.usedInStep.add(key);
      continue;
    }

    // Context-relevant variables based on step type
    if (isContextRelevant(key, context.stepType, context.stepName)) {
      categories.contextRelevant.add(key);
      continue;
    }

    // Exported variables (cross-suite)
    if (key.includes(".")) {
      categories.exported.add(key);
      continue;
    }

    // Environment-like variables (low priority)
    if (isEnvironmentVariable(key)) {
      categories.environment.add(key);
    }
  }

  // Add variables by priority, respecting limits
  const addCategory = (categorySet: Set<string>, limit?: number) => {
    const items = Array.from(categorySet);
    const itemsToAdd = limit ? items.slice(0, limit) : items;

    for (const key of itemsToAdd) {
      if (variables.hasOwnProperty(key)) {
        relevant[key] = variables[key];
      }
    }
  };

  // Priority order: always include > recent captures > used in step > context relevant > exported > environment
  addCategory(categories.alwaysInclude);
  addCategory(categories.recentCaptures, finalConfig.maxPerCategory);
  addCategory(categories.usedInStep, finalConfig.maxPerCategory);
  addCategory(categories.contextRelevant, finalConfig.maxPerCategory);
  addCategory(categories.exported, finalConfig.maxPerCategory);

  // Only add environment variables if nothing else is available or if it's the first step
  if (Object.keys(relevant).length < 5 || context.isFirstStep) {
    addCategory(categories.environment, 5);
  }

  return relevant;
}

/**
 * Determines if a variable is relevant for the current step context
 */
function isContextRelevant(
  key: string,
  stepType?: string,
  stepName?: string
): boolean {
  const contextPatterns: Record<string, RegExp[]> = {
    request: [
      /^(auth|token|api|header|body|url|endpoint)/i,
      /^(request|response|status|http)/i,
    ],
    input: [
      /^(user|input|prompt|default|validation)/i,
      /^(form|field|select|option)/i,
    ],
    call: [/^(call|invoke|external|dependency)/i, /^(suite|flow|step)/i],
    scenario: [
      /^(condition|scenario|branch|if|else)/i,
      /^(test|assert|check)/i,
    ],
    iteration: [
      /^(loop|iter|array|list|index)/i,
      /^(item|element|count|total)/i,
    ],
  };

  if (stepType && contextPatterns[stepType]) {
    return contextPatterns[stepType].some((pattern) => pattern.test(key));
  }

  // Generic patterns always relevant
  const genericPatterns = [
    /^(captured|result|output)/i,
    /^(current|active|selected)/i,
    /timestamp$/i,
    /_id$/i,
  ];

  return genericPatterns.some((pattern) => pattern.test(key));
}

/**
 * Checks if a variable appears to be an environment variable
 */
function isEnvironmentVariable(key: string): boolean {
  return (
    /^(PATH|HOME|USER|LANG|SHELL|PWD|NODE_|npm_|FLOW_TEST_)/i.test(key) ||
    process.env.hasOwnProperty(key)
  );
}

/**
 * Applies both masking and verbosity reduction for optimal output
 *
 * @param variables - Variables object to process
 * @param config - Optional configuration for verbosity reduction
 * @returns Processed object with masked sensitive data and reduced verbosity
 * @public
 */
export function maskAndReduceVerbosity(
  variables: Record<string, any>,
  config: Partial<SummarizationConfig> = {}
): Record<string, any> {
  // First mask sensitive variables
  const masked = maskSensitiveVariables(variables);

  // Then reduce verbosity to prevent massive JSON output
  return reduceVerbosity(masked, config);
}

/**
 * Smart filtering with masking and verbosity reduction combined
 *
 * @param variables - All available variables
 * @param context - Current execution context
 * @param filterConfig - Filter configuration
 * @param summaryConfig - Verbosity reduction configuration
 * @returns Intelligently filtered, masked, and summarized variables
 * @public
 */
export function smartFilterAndMask(
  variables: Record<string, any>,
  context: Parameters<typeof filterRelevantVariables>[1] = {},
  filterConfig: Partial<VariableFilterConfig> = {},
  summaryConfig: Partial<SummarizationConfig> = {}
): Record<string, any> {
  // First filter to show only relevant variables
  const filtered = filterRelevantVariables(variables, context, filterConfig);

  // Then apply masking and verbosity reduction
  return maskAndReduceVerbosity(filtered, summaryConfig);
}

/**
 * Checks if a variable name appears to be sensitive
 *
 * @param key - Variable name to check
 * @returns True if the variable name looks sensitive
 * @public
 */
export function isSensitiveVariableName(key: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /passphrase/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /api_key/i,
    /access_key/i,
    /client_secret/i,
    /private/i,
    /sensitive/i,
    /username/i,
    /user_name/i,
    /login/i,
    /email/i,
    /cert/i,
    /pem/i,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(key));
}
