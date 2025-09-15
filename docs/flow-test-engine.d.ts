/**
 * Resultado agregado de execução
 */
export declare interface AggregatedResult {
    project_name: string;
    start_time: string;
    end_time: string;
    total_duration_ms: number;
    total_tests: number;
    successful_tests: number;
    failed_tests: number;
    skipped_tests: number;
    success_rate: number;
    suites_results: SuiteExecutionResult[];
    global_variables_final_state: Record<string, any>;
    performance_summary?: PerformanceSummary;
}

/**
 * Configuration for array iteration in test steps
 *
 * @example
 * ```yaml
 * iterate:
 *   over: "{{test_cases}}"
 *   as: "item"
 * ```
 */
export declare interface ArrayIterationConfig {
    /** JMESPath expression or variable name pointing to the array to iterate over */
    over: string;
    /** Variable name to use for the current item in each iteration */
    as: string;
}

/**
 * Regras de validação estendidas para um campo específico
 *
 * Versão aprimorada das regras de assertion incluindo validações de tipo,
 * existência, comprimento e outras verificações avançadas.
 *
 * @example
 * ```yaml
 * assert:
 *   body:
 *     user_id:
 *       type: number
 *       greater_than: 0
 *     email:
 *       exists: true
 *       regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
 *     items:
 *       length:
 *         greater_than: 0
 *         less_than: 100
 * ```
 */
export declare interface AssertionChecks {
    equals?: any;
    contains?: any;
    not_equals?: any;
    greater_than?: number;
    less_than?: number;
    regex?: string;
    exists?: boolean;
    type?: "string" | "number" | "boolean" | "object" | "array";
    length?: {
        equals?: number;
        greater_than?: number;
        less_than?: number;
    };
}

/**
 * Resultado de uma assertion
 */
export declare interface AssertionResult {
    field: string;
    expected: any;
    actual: any;
    passed: boolean;
    message?: string;
}

/**
 * Conjunto completo de validações para uma resposta HTTP
 *
 * Define todas as validações que podem ser aplicadas a uma resposta,
 * incluindo assertions customizadas e validações de tempo de resposta
 * com limites superior e inferior.
 *
 * @example
 * ```yaml
 * assert:
 *   status_code: 200
 *   body:
 *     success:
 *       equals: true
 *     data:
 *       type: object
 *       exists: true
 *   headers:
 *     content-type:
 *       contains: "application/json"
 *   response_time_ms:
 *     less_than: 2000
 *     greater_than: 10
 *   custom:
 *     - name: "Valid user ID format"
 *       condition: "body.user.id && type(body.user.id) == 'number'"
 *       message: "User ID must be a number"
 * ```
 */
export declare interface Assertions {
    status_code?: number | AssertionChecks;
    body?: Record<string, AssertionChecks>;
    headers?: Record<string, AssertionChecks>;
    response_time_ms?: {
        less_than?: number;
        greater_than?: number;
    };
    custom?: Array<{
        name: string;
        condition: string;
        message?: string;
    }>;
}

/**
 * Service responsible for validating assertions in HTTP responses
 *
 * The AssertionService provides comprehensive assertion validation capabilities
 * for HTTP responses including status codes, headers, response bodies, and timing
 * validations. It supports multiple assertion syntaxes and operators, JMESPath
 * expressions for complex data extraction, and detailed error reporting.
 *
 * **Supported Assertion Types:**
 * - **Status Code**: Direct value comparison or complex checks
 * - **Headers**: Key-value validation with multiple operators
 * - **Response Body**: Deep object validation using JMESPath expressions
 * - **Response Time**: Performance assertion validation
 * - **Custom Fields**: Extensible assertion system
 *
 * **Assertion Operators:**
 * - `equals`: Exact value comparison
 * - `not_equals`: Value inequality check
 * - `contains`: String/array containment check
 * - `not_contains`: String/array non-containment check
 * - `greater_than`: Numeric comparison (>)
 * - `less_than`: Numeric comparison (<)
 * - `greater_than_or_equal`: Numeric comparison (>=)
 * - `less_than_or_equal`: Numeric comparison (<=)
 * - `regex`: Regular expression pattern matching
 * - `not_null`: Null/undefined validation
 * - `is_null`: Null validation
 * - `length_equals`: Array/string length validation
 * - `starts_with`: String prefix validation
 * - `ends_with`: String suffix validation
 *
 * **Assertion Syntax Support:**
 * - Flat syntax: `'body.user.id': { not_null: true }`
 * - Structured syntax: `body: { user: { id: { not_null: true } } }`
 * - Direct value: `status_code: 200`
 * - JMESPath expressions: `'body.items[0].name': { equals: 'Product 1' }`
 *
 * @example Basic assertion validation
 * ```typescript
 * import { AssertionService } from 'flow-test-engine';
 *
 * const assertionService = new AssertionService();
 * const results = assertionService.validateAssertions({
 *   status_code: 200,
 *   'headers.content-type': { contains: 'application/json' },
 *   'body.success': true,
 *   'body.data.id': { not_null: true }
 * }, executionResult);
 *
 * results.forEach(result => {
 *   const status = result.passed ? '✅ PASS' : '❌ FAIL';
 *   console.log(`${status} ${result.field}: ${result.message || result.actual}`);
 * });
 * ```
 *
 * @example Advanced assertion patterns
 * ```typescript
 * const complexAssertions = {
 *   // Status code validation
 *   status_code: { greater_than_or_equal: 200, less_than: 300 },
 *
 *   // Header validations
 *   'headers.authorization': { starts_with: 'Bearer ' },
 *   'headers.content-length': { greater_than: 0 },
 *
 *   // Complex body validations using JMESPath
 *   'body.users[*].email': { regex: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$' },
 *   'body.pagination.total': { greater_than: 0 },
 *   'body.data': { length_equals: 10 },
 *
 *   // Performance assertions
 *   response_time: { less_than: 1000 }
 * };
 *
 * const results = assertionService.validateAssertions(complexAssertions, result);
 * const failures = results.filter(r => !r.passed);
 *
 * if (failures.length > 0) {
 *   console.error(`${failures.length} assertion failures:`);
 *   failures.forEach(failure => {
 *     console.error(`  • ${failure.field}: ${failure.message}`);
 *   });
 * }
 * ```
 *
 * @example Structured vs flat assertion syntax
 * ```typescript
 * // These are equivalent assertion definitions:
 *
 * // Flat syntax (dot notation)
 * const flatAssertions = {
 *   'body.user.profile.name': { not_null: true },
 *   'body.user.profile.age': { greater_than: 0 },
 *   'body.user.roles[0]': { equals: 'admin' }
 * };
 *
 * // Structured syntax (nested objects)
 * const structuredAssertions = {
 *   body: {
 *     user: {
 *       profile: {
 *         name: { not_null: true },
 *         age: { greater_than: 0 }
 *       },
 *       'roles[0]': { equals: 'admin' } // JMESPath expressions still work
 *     }
 *   }
 * };
 *
 * // Both produce the same validation results
 * ```
 *
 * @public
 * @since 1.0.0
 */
export declare class AssertionService {
    private logger;
    /**
     * Validates all assertions against an HTTP response
     *
     * This is the main entry point for assertion validation. It processes all configured
     * assertions and returns detailed results for each validation, including success/failure
     * status, expected vs actual values, and descriptive error messages.
     *
     * The method handles multiple assertion formats and automatically preprocesses
     * both flat dot-notation and structured assertion definitions into a unified format
     * for consistent validation processing.
     *
     * **Validation Process:**
     * 1. **Preprocessing**: Normalizes flat and structured assertion syntax
     * 2. **Status Code Validation**: Validates HTTP status codes with multiple operators
     * 3. **Header Validation**: Checks response headers with various assertion types
     * 4. **Body Validation**: Deep validation of response body using JMESPath expressions
     * 5. **Custom Field Validation**: Processes any additional custom assertions
     *
     * @param assertions - Object containing assertions to validate (supports flat and structured syntax)
     * @param result - HTTP execution result containing response details, timing, and metadata
     * @returns Array of detailed assertion results with pass/fail status and diagnostic information
     *
     * @example Basic status and body validation
     * ```typescript
     * const assertionService = new AssertionService();
     * const results = assertionService.validateAssertions({
     *   status_code: 200,
     *   'body.success': true,
     *   'body.data.id': { not_null: true },
     *   'headers.content-type': { contains: 'application/json' }
     * }, executionResult);
     *
     * // Process results
     * const passed = results.filter(r => r.passed).length;
     * const failed = results.filter(r => !r.passed).length;
     * console.log(`Assertions: ${passed} passed, ${failed} failed`);
     *
     * // Show failures
     * results.filter(r => !r.passed).forEach(failure => {
     *   console.error(`❌ ${failure.field}: Expected ${failure.expected}, got ${failure.actual}`);
     * });
     * ```
     *
     * @example Complex validation with multiple operators
     * ```typescript
     * const complexAssertions = {
     *   status_code: { greater_than_or_equal: 200, less_than: 300 },
     *   'body.items': { length_equals: 5 },
     *   'body.users[*].email': { regex: '^.+@.+\\..+$' },
     *   'headers.x-ratelimit-remaining': { greater_than: 0 },
     *   response_time: { less_than: 500 }
     * };
     *
     * const results = assertionService.validateAssertions(complexAssertions, result);
     *
     * // Group results by type
     * const resultsByType = results.reduce((acc, result) => {
     *   const type = result.field.split('.')[0];
     *   if (!acc[type]) acc[type] = [];
     *   acc[type].push(result);
     *   return acc;
     * }, {} as Record<string, typeof results>);
     *
     * console.log('Validation Results by Type:', resultsByType);
     * ```
     *
     * @example Handling validation errors and edge cases
     * ```typescript
     * // Handle case where response is not available
     * if (!executionResult.response_details) {
     *   console.log('No response to validate');
     *   return;
     * }
     *
     * const results = assertionService.validateAssertions(assertions, executionResult);
     *
     * // Check for validation system errors (not assertion failures)
     * const systemErrors = results.filter(r =>
     *   r.message?.includes('Response not available') ||
     *   r.message?.includes('Invalid JMESPath')
     * );
     *
     * if (systemErrors.length > 0) {
     *   console.error('System validation errors:', systemErrors);
     * }
     *
     * // Process normal assertion results
     * const normalResults = results.filter(r => !systemErrors.includes(r));
     * console.log(`Normal assertions: ${normalResults.length}`);
     * ```
     *
     * @public
     */
    validateAssertions(assertions: Assertions, result: StepExecutionResult): AssertionResult[];
    /**
     * Pre-processes assertions to support flat and structured syntax
     *
     * Converts flat assertions (like 'body.status') into hierarchical structure
     * for uniform processing. Also processes 'headers.header-name'.
     *
     * @param assertions - Object with assertions in mixed format
     * @returns Normalized object with hierarchical structure
     * @private
     *
     * @example
     * ```typescript
     * // Input: { 'body.status': 'success', 'headers.auth': 'Bearer xyz' }
     * // Output: {
     * //   body: { status: 'success' },
     * //   headers: { auth: 'Bearer xyz' }
     * // }
     * ```
     */
    private preprocessAssertions;
    /**
     * Validates the response status code.
     */
    private validateStatusCode;
    /**
     * Validates the response headers.
     */
    private validateHeaders;
    /**
     * Validates the response body using JMESPath.
     */
    private validateBody;
    /**
     * Validates the response time.
     */
    private validateResponseTime;
    /**
     * Validates custom JavaScript-based assertions.
     */
    private validateCustomAssertions;
    /**
     * Validates a set of checks for a specific field.
     */
    private validateFieldChecks;
    /**
     * Checks if two values are deeply equal with type-tolerant comparison.
     */
    private deepEqual;
    /**
     * Checks if a value contains another (for strings, arrays, or objects).
     */
    private contains;
    /**
     * Checks if a value matches a regular expression.
     */
    private matchesRegex;
    /**
     * Creates a standardized assertion result.
     */
    private createAssertionResult;
    /**
     * Gets the type of a value for type assertions.
     */
    private getValueType;
    /**
     * Gets the length of a value for length assertions.
     * Returns -1 if the value doesn't have a length property.
     */
    private getValueLength;
}

/**
 * Configuração de cache
 */
export declare interface CacheConfig {
    enabled: boolean;
    variable_interpolation: boolean;
    response_cache?: {
        enabled: boolean;
        ttl_ms: number;
        key_strategy: "url" | "url_and_headers" | "custom";
    };
}

/**
 * Service responsible for capturing variables from HTTP responses
 *
 * Uses JMESPath expressions to extract specific values from HTTP responses
 * and store them as variables for use in subsequent steps.
 *
 * @example
 * ```typescript
 * const captureService = new CaptureService();
 *
 * const captured = captureService.captureVariables({
 *   user_id: 'body.data.user.id',
 *   token: 'body.access_token',
 *   status: 'status_code'
 * }, executionResult);
 *
 * console.log(captured.user_id); // Value extracted from body.data.user.id
 * ```
 */
export declare class CaptureService {
    private logger;
    /**
     * Captures variables from HTTP response using JMESPath expressions
     *
     * Processes a map of captures where the key is the variable name
     * to be created and the value is the JMESPath expression to extract the data.
     *
     * @param captureConfig - Map of variable_name -> jmespath_expression
     * @param result - HTTP execution result containing the response
     * @param variableContext - Current variable context for JavaScript expressions
     * @returns Object with captured variables
     *
     * @example
     * ```typescript
     * const captured = captureService.captureVariables({
     *   user_id: 'body.user.id',
     *   auth_token: 'body.token',
     *   response_time: 'duration_ms'
     * }, executionResult, currentVariables);
     * ```
     */
    captureVariables(captureConfig: Record<string, string>, result: StepExecutionResult, variableContext?: Record<string, any>): Record<string, any>;
    /**
     * Extracts a value from the response using JMESPath or evaluates expressions
     *
     * @param expression - JMESPath expression, JavaScript expression, or direct value
     * @param result - Execution result
     * @param variableContext - Current variable context for JavaScript expressions
     * @returns Extracted value
     * @throws Error if expression is invalid
     * @private
     */
    private extractValue;
    /**
     * Builds the complete context for data extraction via JMESPath
     *
     * Creates an object containing all available data from the HTTP response
     * that can be accessed via JMESPath expressions.
     *
     * @param result - HTTP execution result
     * @returns Structured context for JMESPath
     * @private
     *
     * @example
     * ```typescript
     * // Returned context:
     * {
     *   status_code: 200,
     *   headers: { 'content-type': 'application/json' },
     *   body: { user: { id: 123 } },
     *   duration_ms: 250,
     *   size_bytes: 1024
     * }
     * ```
     */
    private buildContext;
    /**
     * Formats a value for readable console display
     *
     * Truncates long strings and objects to avoid visual clutter
     * in variable capture logs.
     *
     * @param value - Value to be formatted
     * @returns Formatted string for display
     * @private
     */
    private formatValue;
    /**
     * Validates if a set of JMESPath are valid.
     */
    validateCapturePaths(capturePaths: Record<string, string>): string[];
    /**
     * Lists all available paths in an object for debugging.
     */
    listAvailablePaths(obj: any, prefix?: string, maxDepth?: number): string[];
    /**
     * Suggests possible JMESPath based on response content.
     */
    suggestCapturePaths(result: StepExecutionResult): string[];
}

/**
 * Conditional scenarios for happy/sad path testing
 *
 * @example
 * ```typescript
 * const scenario: ConditionalScenario = {
 *   name: "Check user role",
 *   condition: "body.user.role == 'admin'",
 *   then: {
 *     assert: { status_code: 200 },
 *     capture: { admin_id: "body.user.id" }
 *   },
 *   else: {
 *     assert: { status_code: 403 },
 *     variables: { is_admin: false }
 *   }
 * };
 * ```
 */
export declare interface ConditionalScenario {
    /** Optional name for the scenario */
    name?: string;
    /** JMESPath expression to evaluate condition */
    condition: string;
    /** Actions to execute if condition is true */
    then?: {
        assert?: Assertions;
        capture?: Record<string, string>;
        variables?: Record<string, any>;
    };
    /** Actions to execute if condition is false */
    else?: {
        assert?: Assertions;
        capture?: Record<string, string>;
        variables?: Record<string, any>;
    };
}

/**
 * Configuration manager for the Flow Test Engine
 *
 * The ConfigManager is responsible for loading, validating, and managing all engine
 * configurations including global variables, environment settings, execution options,
 * and runtime overrides. It provides a centralized configuration system with support
 * for multiple file formats, environment-specific settings, and runtime parameter overrides.
 *
 * **Key Features:**
 * - Automatic configuration file discovery with multiple naming conventions
 * - Environment variable integration with `FLOW_TEST_` prefix support
 * - Runtime configuration overrides through execution options
 * - Comprehensive validation with helpful error messages
 * - Support for YAML and JSON configuration formats
 * - Environment-specific variable resolution
 *
 * **Configuration Priority Order (highest to lowest):**
 * 1. Runtime execution options passed to constructor
 * 2. Environment variables with `FLOW_TEST_` prefix
 * 3. Configuration file settings
 * 4. Default values
 *
 * @example Basic configuration management
 * ```typescript
 * import { ConfigManager } from 'flow-test-engine';
 *
 * // Load from default config file locations
 * const configManager = new ConfigManager();
 * const config = configManager.getConfig();
 *
 * console.log(`Project: ${config.project_name}`);
 * console.log(`Test Directory: ${config.test_directory}`);
 * ```
 *
 * @example Configuration with runtime overrides
 * ```typescript
 * const configManager = new ConfigManager({
 *   config_file: './configs/production.yml',
 *   test_directory: './integration-tests',
 *   verbosity: 'verbose',
 *   filters: {
 *     priorities: ['high', 'critical'],
 *     tags: ['smoke']
 *   }
 * });
 *
 * const config = configManager.getConfig();
 * const globalVars = configManager.getGlobalVariables();
 * ```
 *
 * @example Environment-specific configuration
 * ```typescript
 * // Set environment variables
 * process.env.FLOW_TEST_API_URL = 'https://staging-api.example.com';
 * process.env.FLOW_TEST_TIMEOUT = '60000';
 *
 * const configManager = new ConfigManager();
 * const globalVars = configManager.getGlobalVariables();
 *
 * // globalVars will include { api_url: 'https://staging-api.example.com', timeout: '60000' }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export declare class ConfigManager {
    /** Configuração completa carregada e processada */
    private config;
    /** Caminho absoluto do arquivo de configuração utilizado */
    private configFilePath;
    /**
     * Creates a new ConfigManager instance
     *
     * Initializes the configuration system by loading settings from various sources
     * in priority order, applying validation, and preparing the final configuration
     * object for use by the Flow Test Engine.
     *
     * **Initialization Process:**
     * 1. Resolve configuration file path (explicit or automatic discovery)
     * 2. Load and parse YAML/JSON configuration file
     * 3. Apply default values for missing configuration sections
     * 4. Merge environment variables with `FLOW_TEST_` prefix
     * 5. Apply runtime execution option overrides
     * 6. Validate final configuration for consistency and requirements
     *
     * @param options - Optional execution options that override file-based configuration
     *
     * @example Constructor with default file discovery
     * ```typescript
     * // Automatically searches for flow-test.config.yml, flow-test.config.yaml, etc.
     * const configManager = new ConfigManager();
     * ```
     *
     * @example Constructor with specific configuration file
     * ```typescript
     * const configManager = new ConfigManager({
     *   config_file: './configs/staging.yml'
     * });
     * ```
     *
     * @example Constructor with comprehensive runtime overrides
     * ```typescript
     * const configManager = new ConfigManager({
     *   config_file: './base-config.yml',
     *   test_directory: './e2e-tests',
     *   verbosity: 'verbose',
     *   filters: {
     *     priorities: ['critical', 'high'],
     *     tags: ['smoke', 'regression'],
     *     exclude_tags: ['slow']
     *   }
     * });
     * ```
     *
     * @throws {Error} When configuration file is not found or contains invalid YAML/JSON
     * @throws {Error} When required configuration properties are missing
     * @throws {Error} When configuration validation fails
     */
    constructor(options?: EngineExecutionOptions);
    /**
     * Gets the complete processed configuration
     *
     * Returns the final configuration object after applying all overrides,
     * environment variable resolution, default value assignment, and validation.
     * This configuration object is used throughout the Flow Test Engine execution.
     *
     * @returns Complete engine configuration with all settings resolved
     *
     * @example Accessing configuration properties
     * ```typescript
     * const config = configManager.getConfig();
     *
     * console.log(`Project: ${config.project_name}`);
     * console.log(`Test Directory: ${config.test_directory}`);
     * console.log(`Execution Mode: ${config.execution.mode}`);
     * console.log(`Max Parallel: ${config.execution.max_parallel}`);
     * console.log(`Output Directory: ${config.reporting.output_dir}`);
     * ```
     *
     * @public
     */
    getConfig(): EngineConfig;
    /**
     * Gets combined global variables from configuration and environment
     *
     * Merges variables defined in the configuration file with environment-specific
     * variables, giving precedence to environment variables. This provides a flexible
     * way to override configuration values for different deployment environments.
     *
     * **Variable Resolution Priority (highest to lowest):**
     * 1. Environment variables with `FLOW_TEST_` prefix
     * 2. Configuration file global variables
     *
     * @returns Object containing all available global variables
     *
     * @example Configuration file and environment variable combination
     * ```typescript
     * // config.yml contains:
     * // globals:
     * //   variables:
     * //     api_url: 'http://localhost:3000'
     * //     timeout: 30000
     *
     * // Environment variables:
     * process.env.FLOW_TEST_API_URL = 'https://staging-api.example.com';
     * process.env.FLOW_TEST_AUTH_TOKEN = 'staging-token-123';
     *
     * const globalVars = configManager.getGlobalVariables();
     * // Result: {
     * //   api_url: 'https://staging-api.example.com', // overridden by env var
     * //   timeout: 30000,                             // from config file
     * //   auth_token: 'staging-token-123'             // from env var only
     * // }
     * ```
     *
     * @example Using global variables in test execution
     * ```typescript
     * const globalVars = configManager.getGlobalVariables();
     *
     * // These variables can be used in YAML test files as {{api_url}}, {{timeout}}, etc.
     * console.log('Available template variables:');
     * Object.keys(globalVars).forEach(key => {
     *   console.log(`  {{${key}}} = ${globalVars[key]}`);
     * });
     * ```
     *
     * @public
     */
    getGlobalVariables(): Record<string, any>;
    /**
     * Resolve o caminho do arquivo de configuração a ser usado
     *
     * Se um arquivo específico for fornecido, valida sua existência.
     * Caso contrário, procura por arquivos de configuração padrão
     * na ordem de precedência.
     *
     * @param configFile - Caminho opcional para arquivo específico
     * @returns Caminho absoluto do arquivo de configuração
     * @throws Error se arquivo especificado não for encontrado
     * @private
     */
    private resolveConfigFile;
    /**
     * Carrega e valida a configuração
     */
    private loadConfig;
    /**
     * Valida e normaliza a configuração com valores padrão
     */
    private validateAndNormalizeConfig;
    /**
     * Aplica overrides das opções de execução
     */
    private applyOptionsOverrides;
    /**
     * Obtém variáveis de ambiente relevantes
     */
    private getEnvironmentVariables;
    /**
     * Valida a configuração final
     */
    private validateConfig;
    /**
     * Gets runtime filters applied during execution
     *
     * Returns filters that were specified through execution options and stored
     * for later use during test discovery and filtering phases. These filters
     * override any default filtering configuration.
     *
     * @returns Runtime filter configuration object
     *
     * @example Accessing applied runtime filters
     * ```typescript
     * const configManager = new ConfigManager({
     *   filters: {
     *     priorities: ['high', 'critical'],
     *     tags: ['smoke'],
     *     exclude_tags: ['slow']
     *   }
     * });
     *
     * const filters = configManager.getRuntimeFilters();
     * console.log('Runtime filters:', filters);
     * // Output: {
     * //   priorities: ['high', 'critical'],
     * //   tags: ['smoke'],
     * //   exclude_tags: ['slow']
     * // }
     * ```
     *
     * @public
     */
    getRuntimeFilters(): any;
    /**
     * Reloads configuration from the file system
     *
     * Re-reads and re-processes the configuration file, applying validation
     * and normalization. Useful for picking up configuration changes during
     * long-running processes or development scenarios.
     *
     * @throws {Error} When configuration file cannot be read or contains invalid data
     *
     * @example Reloading configuration during development
     * ```typescript
     * const configManager = new ConfigManager('./config.yml');
     *
     * // Initial configuration
     * console.log('Initial timeout:', configManager.getConfig().execution.timeout);
     *
     * // ... modify config.yml file externally ...
     *
     * // Reload to pick up changes
     * configManager.reload();
     * console.log('Updated timeout:', configManager.getConfig().execution.timeout);
     * ```
     *
     * @public
     */
    reload(): void;
    /**
     * Saves current configuration with debug information
     *
     * Exports the complete resolved configuration along with debugging metadata
     * to a YAML file. Useful for troubleshooting configuration issues, verifying
     * variable resolution, and understanding the final computed configuration state.
     *
     * The saved file includes:
     * - Complete resolved configuration
     * - Source file path used for loading
     * - Timestamp of configuration loading
     * - Environment variables that were applied
     *
     * @param outputPath - File path where debug configuration should be saved
     *
     * @throws {Error} When output file cannot be written
     *
     * @example Saving debug configuration for troubleshooting
     * ```typescript
     * const configManager = new ConfigManager('./config.yml');
     *
     * // Save complete configuration state for debugging
     * configManager.saveDebugConfig('./debug-config.yml');
     *
     * // The saved file will contain:
     * // - All resolved configuration values
     * // - _loaded_from: '/absolute/path/to/config.yml'
     * // - _loaded_at: '2024-01-15T10:30:00.000Z'
     * // - _environment_variables: { api_url: '...', timeout: '...' }
     * ```
     *
     * @example Using debug config in CI/CD for troubleshooting
     * ```typescript
     * // In CI/CD pipeline
     * const configManager = new ConfigManager();
     *
     * // Save debug info for build artifacts
     * configManager.saveDebugConfig('./artifacts/resolved-config.yml');
     *
     * // Continue with test execution
     * const result = await engine.run();
     * ```
     *
     * @public
     */
    saveDebugConfig(outputPath: string): void;
}

/**
 * Convenience function for quick engine creation
 *
 * Creates a FlowTestEngine instance with minimal configuration,
 * ideal for use in scripts or simple integrations where you need
 * a pre-configured engine instance.
 *
 * @param configPath - Optional path to configuration file
 * @returns New configured FlowTestEngine instance
 *
 * @example Creating an engine with default configuration
 * ```typescript
 * const engine = createEngine('./my-config.yml');
 * const result = await engine.run();
 *
 * console.log(`Executed ${result.total_tests} tests`);
 * console.log(`Success rate: ${result.success_rate}%`);
 * ```
 *
 * @example Creating an engine without explicit config file
 * ```typescript
 * // Uses default config file discovery (flow-test.config.yml, etc.)
 * const engine = createEngine();
 * const result = await engine.run();
 * ```
 *
 * @public
 */
export declare function createEngine(configPath?: string): any;

/**
 * Result of dependency execution
 *
 * @example
 * ```typescript
 * const result: DependencyResult = {
 *   flowPath: "./auth/setup-auth.yaml",
 *   suiteName: "Authentication Setup",
 *   success: true,
 *   executionTime: 1250,
 *   exportedVariables: {
 *     auth_token: "abc123",
 *     user_id: "user_456"
 *   },
 *   cached: false
 * };
 * ```
 */
export declare interface DependencyResult {
    /** Path to the executed dependency flow */
    flowPath: string;
    /** Node ID of the executed dependency */
    nodeId: string;
    /** Name of the executed suite */
    suiteName: string;
    /** Whether the dependency executed successfully */
    success: boolean;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Variables exported by the dependency */
    exportedVariables: Record<string, any>;
    /** Whether the result was retrieved from cache */
    cached: boolean;
    /** Error message if execution failed */
    error?: string;
}

/**
 * Service for managing dependencies
 */
declare class DependencyService {
    private graph;
    private cache;
    private cacheEnabled;
    constructor();
    /**
     * Builds the dependency graph from discovered tests
     */
    buildDependencyGraph(tests: DiscoveredTest[]): void;
    /**
     * Extracts the nodeId from the dependency file path
     */
    private extractNodeIdFromPath;
    /**
     * Detects circular dependencies using DFS
     */
    detectCircularDependencies(): string[];
    /**
     * Resolves execution order using topological sorting
     */
    resolveExecutionOrder(tests: DiscoveredTest[]): DiscoveredTest[];
    /**
     * Gets direct dependencies of a test
     */
    getDirectDependencies(nodeId: string): DiscoveredTest[];
    /**
     * Gets all transitive dependencies of a test
     */
    getTransitiveDependencies(nodeId: string): DiscoveredTest[];
    /**
     * Checks if a test can be executed (all its dependencies have been resolved)
     */
    canExecute(nodeId: string): boolean;
    /**
     * Marks a test as resolved and stores its result
     */
    markResolved(nodeId: string, result: DependencyResult): void;
    /**
     * Marks a test as executing
     */
    markExecuting(nodeId: string): void;
    /**
     * Checks if there is a cached result for a test
     */
    getCachedResult(nodeId: string): DependencyResult | null;
    /**
     * Gets statistics of the dependency graph
     */
    getDependencyStats(): {
        total_tests: number;
        tests_with_dependencies: number;
        tests_with_dependents: number;
        max_dependency_depth: number;
        total_dependency_edges: number;
    };
    /**
     * Calculates the maximum depth of dependencies of a test
     */
    private calculateDependencyDepth;
    /**
     * Clears the dependency cache
     */
    clearCache(): void;
    /**
     * Enables/disables the cache
     */
    setCacheEnabled(enabled: boolean): void;
    /**
     * Gets visual representation of the graph (useful for debugging)
     */
    getGraphVisualization(): string;
    /**
     * Reset of the graph state (useful for new execution)
     */
    reset(): void;
}

/**
 * Teste descoberto com metadados
 */
export declare interface DiscoveredTest {
    file_path: string;
    node_id: string;
    suite_name: string;
    priority?: string;
    dependencies?: string[];
    depends?: FlowDependency[];
    exports?: string[];
    estimated_duration?: number;
}

/**
 * Configuração de descoberta de testes
 */
export declare interface DiscoveryConfig {
    patterns: string[];
    exclude?: string[];
    recursive?: boolean;
}

/**
 * Configuração global do Flow Test Engine
 */
export declare interface EngineConfig {
    project_name: string;
    test_directory: string;
    globals?: GlobalConfig;
    discovery?: DiscoveryConfig;
    priorities?: PriorityConfig;
    execution?: ExecutionConfig;
    reporting?: ReportingConfig;
}

/**
 * Opções de execução do engine
 */
export declare interface EngineExecutionOptions {
    config_file?: string;
    test_directory?: string;
    environment?: string;
    verbosity?: "silent" | "simple" | "detailed" | "verbose";
    filters?: {
        priority?: string[];
        node_ids?: string[];
        suite_names?: string[];
        tags?: string[];
    };
    logging?: {
        enabled?: boolean;
    };
    dry_run?: boolean;
}

/**
 * Engine lifecycle hooks for monitoring and extending test execution
 *
 * Provides callback functions that are triggered at different stages of test execution,
 * allowing for custom logging, monitoring, reporting, and integration with external systems.
 * All hooks are optional and can be async functions.
 *
 * @example
 * ```typescript
 * const hooks: EngineHooks = {
 *   onTestDiscovered: async (test) => {
 *     console.log(`📋 Discovered: ${test.suite_name}`);
 *     await analyticsTracker.trackTestDiscovered(test);
 *   },
 *
 *   onSuiteStart: async (suite) => {
 *     console.log(`🚀 Starting suite: ${suite.suite_name}`);
 *     await notificationService.notifySuiteStart(suite);
 *   },
 *
 *   onStepStart: async (step, context) => {
 *     console.log(`▶️ Step: ${step.name}`);
 *     await monitoring.startStepTimer(step.name);
 *   },
 *
 *   onStepEnd: async (step, result, context) => {
 *     const status = result.status === 'success' ? '✅' : '❌';
 *     console.log(`${status} ${step.name} (${result.duration_ms}ms)`);
 *     await monitoring.recordStepResult(step.name, result);
 *   },
 *
 *   onSuiteEnd: async (suite, result) => {
 *     const rate = (result.successful_steps / result.total_steps * 100).toFixed(1);
 *     console.log(`📊 Suite ${suite.suite_name}: ${rate}% success rate`);
 *     await reportingService.saveSuiteResult(suite, result);
 *   },
 *
 *   onExecutionStart: async (stats) => {
 *     console.log(`🎯 Starting execution of ${stats.tests_discovered} test(s)`);
 *     await dashboard.updateExecutionStatus('running');
 *   },
 *
 *   onExecutionEnd: async (result) => {
 *     console.log(`✨ Execution completed: ${result.success_rate}% success rate`);
 *     await dashboard.updateExecutionStatus('completed', result);
 *     await slackNotifier.sendSummary(result);
 *   },
 *
 *   onError: async (error, context) => {
 *     console.error(`💥 Error occurred: ${error.message}`);
 *     await errorTracker.reportError(error, context);
 *     await alertingService.sendAlert(error);
 *   }
 * };
 *
 * const engine = new FlowTestEngine('./config.yml', hooks);
 * ```
 *
 * @since 1.0.0
 */
export declare interface EngineHooks {
    /**
     * Called when a test suite is discovered during the discovery phase
     *
     * @param test - The discovered test with metadata (suite name, priority, file path, etc.)
     * @example
     * ```typescript
     * onTestDiscovered: async (test) => {
     *   logger.info(`Found test: ${test.suite_name} (priority: ${test.priority})`);
     *   await testRegistry.register(test);
     * }
     * ```
     */
    onTestDiscovered?: (test: any) => void | Promise<void>;
    /**
     * Called when a test suite execution begins
     *
     * @param suite - The test suite about to be executed
     * @example
     * ```typescript
     * onSuiteStart: async (suite) => {
     *   console.log(`🚀 Starting ${suite.suite_name} with ${suite.steps.length} steps`);
     *   await metrics.startTimer(`suite.${suite.suite_name}`);
     * }
     * ```
     */
    onSuiteStart?: (suite: TestSuite) => void | Promise<void>;
    /**
     * Called when a test suite execution completes (success or failure)
     *
     * @param suite - The test suite that was executed
     * @param result - The execution result containing status, metrics, and details
     * @example
     * ```typescript
     * onSuiteEnd: async (suite, result) => {
     *   const duration = await metrics.endTimer(`suite.${suite.suite_name}`);
     *   await reportDB.saveSuiteResult({
     *     suiteName: suite.suite_name,
     *     status: result.status,
     *     duration,
     *     steps: result.steps_results
     *   });
     * }
     * ```
     */
    onSuiteEnd?: (suite: TestSuite, result: any) => void | Promise<void>;
    /**
     * Called before each test step execution
     *
     * @param step - The test step about to be executed
     * @param context - Current execution context with variables and metadata
     * @example
     * ```typescript
     * onStepStart: async (step, context) => {
     *   console.log(`▶️ Executing: ${step.name}`);
     *   console.log(`Variables: ${Object.keys(context.runtime_variables).join(', ')}`);
     *   await tracing.startSpan(`step.${step.name}`);
     * }
     * ```
     */
    onStepStart?: (step: TestStep, context: ExecutionContext) => void | Promise<void>;
    /**
     * Called after each test step execution completes
     *
     * @param step - The test step that was executed
     * @param result - The step execution result
     * @param context - Current execution context
     * @example
     * ```typescript
     * onStepEnd: async (step, result, context) => {
     *   const emoji = result.status === 'success' ? '✅' : '❌';
     *   console.log(`${emoji} ${step.name}: ${result.duration_ms}ms`);
     *
     *   if (result.status === 'failure') {
     *     await bugTracker.createIssue({
     *       title: `Test failed: ${step.name}`,
     *       description: result.error_message,
     *       suite: context.suite.suite_name
     *     });
     *   }
     *
     *   await tracing.endSpan(`step.${step.name}`, {
     *     status: result.status,
     *     duration: result.duration_ms
     *   });
     * }
     * ```
     */
    onStepEnd?: (step: TestStep, result: any, context: ExecutionContext) => void | Promise<void>;
    /**
     * Called at the beginning of the entire test execution
     *
     * @param stats - Initial execution statistics
     * @example
     * ```typescript
     * onExecutionStart: async (stats) => {
     *   console.log(`🎯 Starting execution of ${stats.tests_discovered} test suite(s)`);
     *   await ciSystem.updateBuildStatus('running');
     *   await slack.notify(`Test execution started: ${stats.tests_discovered} suites`);
     * }
     * ```
     */
    onExecutionStart?: (stats: ExecutionStats) => void | Promise<void>;
    /**
     * Called when the entire test execution completes
     *
     * @param result - Final aggregated results of all test executions
     * @example
     * ```typescript
     * onExecutionEnd: async (result) => {
     *   const rate = result.success_rate.toFixed(1);
     *   console.log(`✨ Execution completed: ${rate}% success rate`);
     *
     *   // Update CI system
     *   const status = result.failed_tests === 0 ? 'passed' : 'failed';
     *   await ciSystem.updateBuildStatus(status);
     *
     *   // Send notifications
     *   await emailService.sendExecutionSummary({
     *     successRate: result.success_rate,
     *     totalTests: result.total_tests,
     *     duration: result.total_duration_ms,
     *     reportUrl: `${process.env.REPORT_URL}/latest.html`
     *   });
     * }
     * ```
     */
    onExecutionEnd?: (result: any) => void | Promise<void>;
    /**
     * Called when any error occurs during execution
     *
     * @param error - The error that occurred
     * @param context - Optional context information about where the error occurred
     * @example
     * ```typescript
     * onError: async (error, context) => {
     *   console.error(`💥 Error in ${context?.suite_name || 'unknown'}: ${error.message}`);
     *
     *   // Log to monitoring system
     *   await errorTracking.reportError(error, {
     *     suite: context?.suite_name,
     *     step: context?.current_step,
     *     timestamp: new Date().toISOString(),
     *     stack: error.stack
     *   });
     *
     *   // Alert if critical
     *   if (error.message.includes('CRITICAL')) {
     *     await pagerDuty.triggerAlert({
     *       title: 'Critical test failure',
     *       description: error.message,
     *       severity: 'high'
     *     });
     *   }
     * }
     * ```
     */
    onError?: (error: Error, context?: any) => void | Promise<void>;
}

/**
 * Configuração de execução
 */
export declare interface ExecutionConfig {
    mode: "sequential" | "parallel";
    max_parallel?: number;
    timeout?: number;
    continue_on_failure?: boolean;
    retry_failed?: {
        enabled: boolean;
        max_attempts: number;
        delay_ms: number;
    };
}

/**
 * Execution context for a running test
 *
 * Contains all runtime information and state for the currently executing test,
 * including suite definition, variable scopes, and execution metadata.
 *
 * @example
 * ```typescript
 * const context: ExecutionContext = {
 *   suite: {
 *     suite_name: "User API Tests",
 *     steps: [...]
 *   },
 *   global_variables: {
 *     api_base_url: "https://api.example.com",
 *     auth_token: "abc123"
 *   },
 *   runtime_variables: {
 *     user_id: "user_456",
 *     test_timestamp: "2024-01-01T12:00:00Z"
 *   },
 *   step_index: 2,
 *   total_steps: 5,
 *   start_time: new Date("2024-01-01T12:00:00Z"),
 *   execution_id: "exec_789"
 * };
 * ```
 */
export declare interface ExecutionContext {
    /** The test suite being executed */
    suite: TestSuite;
    /** Variables shared across all tests */
    global_variables: Record<string, any>;
    /** Variables specific to current execution */
    runtime_variables: Record<string, any>;
    /** Current step index (0-based) */
    step_index: number;
    /** Total number of steps in suite */
    total_steps: number;
    /** When execution started */
    start_time: Date;
    /** Unique identifier for this execution */
    execution_id: string;
}

/**
 * Filtros de execução
 */
export declare interface ExecutionFilters {
    priorities?: string[];
    node_ids?: string[];
    suite_names?: string[];
    tags?: string[];
    file_patterns?: string[];
    exclude_patterns?: string[];
    max_duration_ms?: number;
}

/**
 * Test execution service
 */
export declare class ExecutionService {
    private configManager;
    private globalVariables;
    private priorityService;
    private dependencyService;
    private globalRegistry;
    private hooks;
    private logger;
    private httpService;
    private assertionService;
    private captureService;
    private scenarioService;
    private iterationService;
    private performanceData;
    constructor(configManager: ConfigManager, globalVariables: GlobalVariablesService, priorityService: PriorityService, dependencyService: DependencyService, globalRegistry: GlobalRegistryService, hooks?: EngineHooks);
    /**
     * Executes list of discovered tests with dependency-aware execution
     */
    executeTests(tests: DiscoveredTest[], onStatsUpdate?: (stats: ExecutionStats) => void): Promise<SuiteExecutionResult[]>;
    /**
     * Registers suites that have exports in the Global Registry
     */
    private registerSuitesWithExports;
    /**
     * Executes tests respecting dependencies
     */
    private executeTestsWithDependencies;
    /**
     * Executes tests sequentially
     */
    private executeTestsSequentially;
    /**
     * Executes tests in parallel (simplified implementation)
     */
    private executeTestsInParallel;
    /**
     * Executes a single test
     */
    private executeSingleTest;
    /**
     * Filters out environment variables and shows only relevant variables
     */
    private filterAvailableVariables;
    /**
     * Gets all environment variables that should be excluded from available variables
     */
    private getEnvironmentVariablesToExclude;
    /**
     * Executes a step that has scenarios (conditional execution)
     */
    private executeScenarioStep;
    /**
     * Evaluates a scenario condition using current variables
     */
    private evaluateScenarioCondition;
    /**
     * Executes an individual step
     */
    private executeStep;
    /**
     * Loads a test suite from file
     */
    private loadTestSuite;
    /**
     * Captures and registers exported variables in Global Registry
     */
    private captureAndRegisterExports;
    /**
     * Gets only the variables that should be exported for a test
     */
    private getExportedVariables;
    /**
     * Processes captured variables, optionally applying namespace for exported variables
     */
    private processCapturedVariables;
    /**
     * Restores exported variables from cache
     */
    private restoreExportedVariables;
    /**
     * Builds suite result based on cache
     */
    private buildCachedSuiteResult;
    /**
     * Builds error result for a suite
     */
    private buildErrorSuiteResult;
    /**
     * Records performance data
     */
    private recordPerformanceData;
    /**
     * Generates performance summary
     */
    getPerformanceSummary(): PerformanceSummary | undefined;
    /**
     * Executes a step with iteration configuration multiple times
     */
    private executeIteratedStep;
}

/**
 * Real-time execution statistics and metrics
 *
 * Provides comprehensive metrics about the current execution state,
 * including counts, timing, and performance data.
 *
 * @example
 * ```typescript
 * const stats: ExecutionStats = {
 *   tests_discovered: 15,
 *   tests_completed: 10,
 *   tests_successful: 8,
 *   tests_failed: 2,
 *   tests_skipped: 0,
 *   current_test: "User Authentication Tests",
 *   estimated_time_remaining_ms: 45000,
 *   requests_made: 127,
 *   total_response_time_ms: 12500
 * };
 * ```
 */
export declare interface ExecutionStats {
    /** Total number of test suites discovered */
    tests_discovered: number;
    /** Number of test suites completed */
    tests_completed: number;
    /** Number of test suites that passed */
    tests_successful: number;
    /** Number of test suites that failed */
    tests_failed: number;
    /** Number of test suites that were skipped */
    tests_skipped: number;
    /** Name of currently executing test */
    current_test?: string;
    /** Estimated time remaining in milliseconds */
    estimated_time_remaining_ms?: number;
    /** Total HTTP requests made */
    requests_made: number;
    /** Cumulative response time across all requests */
    total_response_time_ms: number;
}

/**
 * Flow dependency configuration
 *
 * @example
 * ```typescript
 * const dependency: FlowDependency = {
 *   path: "./auth/setup-auth.yaml",
 *   required: true,
 *   cache: 300, // 5 minutes TTL
 *   condition: "environment == 'test'",
 *   variables: {
 *     test_mode: true
 *   },
 *   retry: {
 *     max_attempts: 2,
 *     delay_ms: 1000
 *   }
 * };
 * ```
 */
export declare interface FlowDependency {
    /** Path to the dependency flow or node_id for direct reference */
    path?: string;
    /** Node ID for direct reference to another test suite */
    node_id?: string;
    /** Whether this dependency is required for execution */
    required?: boolean;
    /** Cache configuration: true, false, or TTL in seconds */
    cache?: boolean | number;
    /** JMESPath condition for conditional execution */
    condition?: string;
    /** Variables to override in the dependency */
    variables?: Record<string, any>;
    /** Retry configuration for failed dependencies */
    retry?: {
        max_attempts: number;
        delay_ms: number;
    };
}

/**
 * Main Flow Test Engine orchestrator
 *
 * The FlowTestEngine is the primary class responsible for orchestrating the entire test execution
 * lifecycle in the Flow Test framework. It coordinates discovery, filtering, dependency resolution,
 * execution, and reporting of API test suites defined in YAML configuration files.
 *
 * The engine manages complex test workflows including:
 * - Multi-directory test discovery with configurable patterns
 * - Priority-based test ordering and execution
 * - Dependency resolution between test flows
 * - Global variable management and inter-test communication
 * - Parallel execution with configurable workers
 * - Comprehensive HTML and JSON report generation
 * - Real-time execution monitoring through lifecycle hooks
 *
 * @example Basic usage with configuration file
 * ```typescript
 * import { FlowTestEngine } from 'flow-test-engine';
 *
 * const engine = new FlowTestEngine('./flow-test.config.yml');
 * const result = await engine.run();
 *
 * if (result.success_rate >= 95) {
 *   console.log('✅ All tests passed successfully!');
 *   process.exit(0);
 * } else {
 *   console.log('❌ Some tests failed');
 *   process.exit(1);
 * }
 * ```
 *
 * @example Advanced usage with hooks and monitoring
 * ```typescript
 * const engine = new FlowTestEngine('./config.yml', {
 *   onExecutionStart: (stats) => {
 *     console.log(`🚀 Starting execution of ${stats.tests_discovered} test suites`);
 *   },
 *   onSuiteStart: (suite) => {
 *     console.log(`▶️ Executing: ${suite.suite_name}`);
 *   },
 *   onSuiteEnd: (suite, result) => {
 *     const status = result.status === 'success' ? '✅' : '❌';
 *     console.log(`${status} ${suite.suite_name} - ${result.total_duration_ms}ms`);
 *   },
 *   onExecutionEnd: (result) => {
 *     console.log(`🏁 Execution completed - ${result.success_rate.toFixed(1)}% success rate`);
 *   }
 * });
 *
 * const result = await engine.run();
 * ```
 *
 * @example Programmatic configuration without config file
 * ```typescript
 * const engine = new FlowTestEngine({
 *   project_name: 'My API Tests',
 *   test_directory: './api-tests',
 *   verbosity: 'verbose',
 *   execution: {
 *     mode: 'parallel',
 *     max_workers: 4,
 *     fail_fast: true
 *   },
 *   filters: {
 *     priorities: ['high', 'critical'],
 *     tags: ['smoke']
 *   }
 * });
 *
 * const result = await engine.run();
 * ```
 *
 * @example Dry run for test validation
 * ```typescript
 * const engine = new FlowTestEngine('./config.yml');
 * const discoveredTests = await engine.dryRun();
 *
 * console.log('📋 Execution Plan:');
 * discoveredTests.forEach((test, index) => {
 *   console.log(`${index + 1}. ${test.suite_name} (${test.priority})`);
 *   console.log(`   📁 ${test.file_path}`);
 *   if (test.dependencies?.length) {
 *     console.log(`   🔗 Dependencies: ${test.dependencies.join(', ')}`);
 *   }
 * });
 * ```
 *
 * @public
 * @since 1.0.0
 */
export declare class FlowTestEngine {
    /** Configuration manager responsible for loading and validating configurations */
    private configManager;
    /** Discovery service responsible for locating test files */
    private testDiscovery;
    /** Global variables management service for inter-suite communication */
    private globalVariables;
    /** Priority-based sorting and execution service */
    private priorityService;
    /** Dependency management service for test interdependencies */
    private dependencyService;
    /** Global registry for exported variables between flows */
    private globalRegistry;
    /** Report generation service */
    private reportingService;
    /** Main test execution service */
    private executionService;
    /** Custom hooks for lifecycle events */
    private hooks;
    /** Real-time execution statistics */
    private stats;
    /**
     * Creates a new FlowTestEngine instance
     *
     * Initializes all necessary services for test execution in the correct dependency order.
     * The constructor sets up the complete testing infrastructure including configuration
     * management, test discovery, variable handling, dependency resolution, and reporting.
     *
     * Services are initialized in dependency order to ensure proper functionality:
     * 1. ConfigManager - loads and validates configuration
     * 2. TestDiscovery - handles test file discovery
     * 3. DependencyService - manages inter-test dependencies
     * 4. GlobalRegistryService - handles global state management
     * 5. GlobalVariablesService - manages variable interpolation
     * 6. PriorityService - handles test ordering
     * 7. ReportingService - generates execution reports
     * 8. ExecutionService - orchestrates test execution
     *
     * @param configFileOrOptions - Path to YAML configuration file or direct options object
     * @param hooks - Optional lifecycle event hooks for monitoring and extending functionality
     *
     * @example Constructor with configuration file
     * ```typescript
     * // Basic usage with config file
     * const engine = new FlowTestEngine('./flow-test.config.yml');
     *
     * // Alternative config file locations
     * const engine2 = new FlowTestEngine('./configs/production.yml');
     * const engine3 = new FlowTestEngine('~/my-project/test-config.yaml');
     * ```
     *
     * @example Constructor with direct configuration object
     * ```typescript
     * const engine = new FlowTestEngine({
     *   project_name: 'E-commerce API Tests',
     *   test_directory: './tests/api',
     *   verbosity: 'verbose',
     *   execution: {
     *     mode: 'parallel',
     *     max_workers: 4,
     *     fail_fast: true,
     *     timeout_ms: 30000
     *   },
     *   reporting: {
     *     formats: ['html', 'json'],
     *     output_directory: './test-reports'
     *   },
     *   filters: {
     *     priorities: ['high', 'critical'],
     *     tags: ['smoke', 'regression']
     *   }
     * });
     * ```
     *
     * @example Constructor with comprehensive lifecycle hooks
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml', {
     *   onExecutionStart: (stats) => {
     *     console.log(`🚀 Starting execution of ${stats.tests_discovered} test suites`);
     *     // Initialize monitoring, start timers, etc.
     *   },
     *   onTestDiscovered: (test) => {
     *     console.log(`🔍 Discovered: ${test.suite_name} (${test.file_path})`);
     *   },
     *   onSuiteStart: (suite) => {
     *     console.log(`▶️ Starting suite: ${suite.suite_name}`);
     *     // Log to external monitoring system
     *   },
     *   onSuiteEnd: (suite, result) => {
     *     const emoji = result.status === 'success' ? '✅' : '❌';
     *     console.log(`${emoji} ${suite.suite_name}: ${result.success_rate.toFixed(1)}%`);
     *   },
     *   onExecutionEnd: (result) => {
     *     console.log(`🏁 Execution completed: ${result.success_rate.toFixed(1)}% success`);
     *     // Send results to monitoring/notification systems
     *   },
     *   onError: (error) => {
     *     console.error('💥 Execution failed:', error.message);
     *     // Send error notifications
     *   }
     * });
     * ```
     *
     * @throws {Error} When configuration file is invalid or required services fail to initialize
     */
    constructor(configFileOrOptions?: string | EngineExecutionOptions, hooks?: EngineHooks);
    /**
     * Executes all discovered tests in the configured directory
     *
     * This is the primary method for running test suites. It orchestrates the complete
     * test execution lifecycle through well-defined phases, ensuring proper dependency
     * resolution, parallel execution, and comprehensive reporting.
     *
     * **Execution Phases:**
     * 1. **Discovery Phase** - Recursively scans configured directories for YAML test files
     * 2. **Filtering Phase** - Applies runtime filters based on tags, priority, and patterns
     * 3. **Dependency Resolution** - Analyzes and resolves inter-test dependencies
     * 4. **Ordering Phase** - Sorts tests by priority and dependency requirements
     * 5. **Execution Phase** - Runs tests with configured parallelism and worker management
     * 6. **Reporting Phase** - Generates HTML reports and JSON artifacts
     *
     * The method provides comprehensive error handling, real-time progress monitoring through
     * lifecycle hooks, and detailed performance metrics collection.
     *
     * @returns Promise that resolves to aggregated execution results with comprehensive metrics
     * @throws {Error} When critical failures occur during configuration, discovery, or execution
     *
     * @example Basic execution with result handling
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml');
     * const result = await engine.run();
     *
     * console.log(`📊 Execution Summary:`);
     * console.log(`   Duration: ${result.total_duration_ms}ms`);
     * console.log(`   Success Rate: ${result.success_rate.toFixed(1)}%`);
     * console.log(`   Total Tests: ${result.total_tests}`);
     * console.log(`   Successful: ${result.successful_tests}`);
     * console.log(`   Failed: ${result.failed_tests}`);
     *
     * // Exit with appropriate code for CI/CD
     * process.exit(result.failed_tests > 0 ? 1 : 0);
     * ```
     *
     * @example Advanced execution with error handling and monitoring
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml');
     *
     * try {
     *   const result = await engine.run();
     *
     *   // Analyze performance metrics
     *   if (result.performance_summary) {
     *     const perf = result.performance_summary;
     *     console.log(`🚀 Performance Metrics:`);
     *     console.log(`   Total Requests: ${perf.total_requests}`);
     *     console.log(`   Average Response Time: ${perf.average_response_time_ms.toFixed(0)}ms`);
     *     console.log(`   Requests Per Second: ${perf.requests_per_second.toFixed(1)}`);
     *   }
     *
     *   // Check specific suite failures
     *   const failedSuites = result.suites_results.filter(s => s.status === 'failure');
     *   if (failedSuites.length > 0) {
     *     console.log('\n💥 Failed Test Suites:');
     *     failedSuites.forEach(suite => {
     *       console.log(`   • ${suite.suite_name}: ${suite.error_message}`);
     *     });
     *   }
     *
     *   // Access global variables final state
     *   console.log('🔗 Global Variables:', result.global_variables_final_state);
     *
     * } catch (error) {
     *   console.error('❌ Execution failed:', error.message);
     *   process.exit(1);
     * }
     * ```
     *
     * @example Conditional execution based on results
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml');
     * const result = await engine.run();
     *
     * if (result.success_rate >= 95) {
     *   console.log('✅ All tests passed - proceeding with deployment');
     *   await deployApplication();
     * } else if (result.success_rate >= 80) {
     *   console.log('⚠️ Some tests failed - requires review');
     *   await notifyTeam(result);
     * } else {
     *   console.log('❌ Critical test failures - blocking deployment');
     *   throw new Error(`Test success rate too low: ${result.success_rate}%`);
     * }
     * ```
     */
    run(): Promise<AggregatedResult>;
    /**
     * Performs test discovery in the configured directory
     *
     * Recursively searches for YAML files containing test suites and registers
     * each discovered test through configured hooks. Supports multiple file
     * patterns and excludes configured directories.
     *
     * @returns Promise that resolves to array of discovered test metadata
     * @private
     *
     * @example
     * ```typescript
     * // Example discovered test structure
     * const discoveredTest = {
     *   file_path: "./flows/auth/login-flow.yaml",
     *   suite_name: "User Authentication Tests",
     *   priority: "high",
     *   tags: ["auth", "smoke"],
     *   estimated_duration: 5000,
     *   dependencies: ["setup-flow.yaml"]
     * };
     * ```
     */
    private discoverTests;
    /**
     * Applies configured filters to discovered tests
     *
     * Filters tests based on criteria defined in configuration such as priority,
     * suite names, tags, file patterns, and custom conditions. Supports complex
     * filtering logic with AND/OR operations.
     *
     * @param tests - Array of discovered tests to filter
     * @returns Filtered array of tests that meet the configured criteria
     * @private
     *
     * @example
     * ```typescript
     * // Filtering by priority and tags
     * const filters = {
     *   priority: ["high", "critical"],
     *   tags: ["smoke"],
     *   exclude_tags: ["slow"]
     * };
     * const filteredTests = this.applyFilters(discoveredTests);
     * ```
     */
    private applyFilters;
    /**
     * Obtém as tags de um teste a partir de seu arquivo YAML
     */
    private getTestTags;
    /**
     * Atualiza estatísticas de execução em tempo real
     *
     * Recebe atualizações das estatísticas durante a execução dos testes
     * e mantém o estado consolidado das métricas de performance.
     *
     * @param newStats - Objeto parcial com novas estatísticas para merge
     * @private
     */
    private updateStats;
    /**
     * Constrói resultado agregado final com todas as métricas e estatísticas
     *
     * Consolida os resultados de todas as suítes executadas e calcula
     * métricas agregadas como taxa de sucesso, duração total, etc.
     *
     * @param startTime - Timestamp de início da execução
     * @param endTime - Timestamp de fim da execução
     * @param totalDiscovered - Número total de testes descobertos
     * @param suiteResults - Array com resultados de cada suíte executada
     * @returns Resultado agregado final
     * @private
     */
    private buildAggregatedResult;
    /**
     * Constrói resultado vazio quando nenhum teste é encontrado
     *
     * Retorna um resultado padrão com métricas zeradas para casos
     * onde não há testes para executar no diretório especificado.
     *
     * @param startTime - Timestamp de início da tentativa de execução
     * @param endTime - Timestamp de fim da tentativa de execução
     * @returns Resultado agregado com métricas zeradas
     * @private
     */
    private buildEmptyResult;
    /**
     * Imprime resumo da execução
     */
    private printExecutionSummary;
    /**
     * Inicializa estatísticas de execução
     */
    private initializeStats;
    /**
     * Gets the current engine configuration
     *
     * Returns the complete configuration object including all loaded settings,
     * defaults, and runtime overrides. Useful for debugging and conditional logic.
     *
     * @returns The complete configuration object currently in use
     *
     * @example Inspecting current configuration
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml');
     * const config = engine.getConfig();
     *
     * console.log(`Project: ${config.project_name}`);
     * console.log(`Test Directory: ${config.test_directory}`);
     * console.log(`Execution Mode: ${config.execution?.mode}`);
     * console.log(`Max Workers: ${config.execution?.max_workers}`);
     * ```
     *
     * @public
     */
    getConfig(): EngineConfig;
    /**
     * Gets current execution statistics
     *
     * Returns real-time statistics about the current or completed test execution,
     * including discovery, completion, success/failure counts, and performance metrics.
     *
     * @returns Copy of current execution statistics
     *
     * @example Monitoring execution progress
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml');
     *
     * // Start execution (non-blocking example)
     * const executionPromise = engine.run();
     *
     * // Monitor progress in separate interval
     * const monitor = setInterval(() => {
     *   const stats = engine.getStats();
     *   console.log(`Progress: ${stats.tests_completed}/${stats.tests_discovered}`);
     *   console.log(`Success Rate: ${(stats.tests_successful/stats.tests_completed * 100).toFixed(1)}%`);
     * }, 1000);
     *
     * await executionPromise;
     * clearInterval(monitor);
     * ```
     *
     * @public
     */
    getStats(): ExecutionStats;
    /**
     * Performs a dry run execution (discovery and planning only)
     *
     * Executes only the discovery, filtering, dependency resolution, and ordering phases
     * without actually running HTTP requests. Useful for validating test configuration,
     * checking dependency chains, and previewing execution order.
     *
     * @returns Promise that resolves to array of discovered and ordered tests
     * @throws {Error} When configuration is invalid or test discovery fails
     *
     * @example Validating test configuration
     * ```typescript
     * const engine = new FlowTestEngine('./config.yml');
     * const tests = await engine.dryRun();
     *
     * console.log(`📋 Execution Plan (${tests.length} tests):`);
     * tests.forEach((test, index) => {
     *   console.log(`${index + 1}. ${test.suite_name} (${test.priority || 'medium'})`);
     *   console.log(`   📁 ${test.file_path}`);
     *
     *   if (test.dependencies?.length) {
     *     console.log(`   🔗 Dependencies: ${test.dependencies.join(', ')}`);
     *   }
     *
     *   if (test.tags?.length) {
     *     console.log(`   🏷️  Tags: ${test.tags.join(', ')}`);
     *   }
     * });
     * ```
     *
     * @example Checking dependency chains
     * ```typescript
     * const tests = await engine.dryRun();
     * const dependencyMap = new Map();
     *
     * tests.forEach(test => {
     *   if (test.dependencies?.length) {
     *     dependencyMap.set(test.suite_name, test.dependencies);
     *   }
     * });
     *
     * console.log('🔗 Dependency Analysis:');
     * for (const [suite, deps] of dependencyMap) {
     *   console.log(`${suite} depends on: ${deps.join(', ')}`);
     * }
     * ```
     *
     * @public
     */
    dryRun(): Promise<DiscoveredTest[]>;
}

/**
 * Configurações globais (variáveis, timeouts, etc.)
 */
export declare interface GlobalConfig {
    variables?: Record<string, any>;
    timeouts?: {
        default?: number;
        slow_tests?: number;
    };
    base_url?: string;
}

/**
 * Global registry service for variables exported between flows
 *
 * Manages variable sharing between different test nodes,
 * allowing one node to export variables that can be consumed
 * by other nodes using the notation `nodeId.variable_name`.
 *
 * @example
 * ```typescript
 * const registry = new GlobalRegistryService();
 *
 * // Register node that exports variables
 * registry.registerNode('auth', 'Authentication Flow', ['user_token', 'user_id'], './auth.yaml');
 *
 * // Set values of exported variables
 * registry.setExportedVariable('auth', 'user_token', 'abc123');
 * registry.setExportedVariable('auth', 'user_id', 'user-456');
 *
 * // Consume variables in other nodes
 * const token = registry.getExportedVariable('auth.user_token');
 * const userId = registry.getExportedVariable('auth.user_id');
 * ```
 */
declare class GlobalRegistryService {
    /** Main registry mapping node ID to its namespace */
    private registry;
    /** Fast search index mapping full name (nodeId.variable) to node ID */
    private variableIndex;
    private logger;
    /**
     * GlobalRegistryService constructor
     *
     * Initializes internal data structures for the registry.
     */
    constructor();
    /**
     * Registers a node and its exported variables
     *
     * Creates a namespace for the node in the global registry and configures
     * which variables this node intends to export to others.
     *
     * @param nodeId - Unique node identifier
     * @param suiteName - Descriptive name of the suite (for display)
     * @param exports - Array with names of variables to be exported
     * @param filePath - Path of the suite file for reference
     *
     * @example
     * ```typescript
     * // Register node that exports token and user_id
     * registry.registerNode('auth', 'Authentication Flow', ['token', 'user_id'], './flows/auth.yaml');
     * ```
     */
    registerNode(nodeId: string, suiteName: string, exports: string[], filePath: string): void;
    /**
     * Sets an exported variable for a node
     */
    setExportedVariable(nodeId: string, variableName: string, value: any): void;
    /**
     * Gets an exported variable using the nodeId.variable pattern
     */
    getExportedVariable(fullName: string): any;
    /**
     * Checks if an exported variable exists
     */
    hasExportedVariable(fullName: string): boolean;
    /**
     * Gets all exported variables from a node
     */
    getNodeVariables(nodeId: string): Record<string, any>;
    /**
     * Gets all exported variables with full namespace
     */
    getAllExportedVariables(): Record<string, any>;
    /**
     * Lists all available variable names
     */
    getAvailableVariableNames(): string[];
    /**
     * Lists all registered nodes
     */
    getRegisteredNodes(): string[];
    /**
     * Gets detailed information of a node
     */
    getNodeInfo(nodeId: string): {
        nodeId: string;
        suiteName: string;
        exports: string[];
        filePath: string;
        variableCount: number;
        lastUpdated: Date;
    } | null;
    /**
     * Removes a node from the registry
     */
    unregisterNode(nodeId: string): void;
    /**
     * Clears all exported variables from a node
     */
    clearNodeVariables(nodeId: string): void;
    /**
     * Clears the entire registry
     */
    clearAll(): void;
    /**
     * Gets registry statistics
     */
    getStats(): {
        total_nodes: number;
        total_exported_variables: number;
        nodes_with_variables: number;
        average_variables_per_node: number;
        most_recent_update: Date | null;
    };
    /**
     * Exports registry state for debugging
     */
    exportState(): string;
    /**
     * Creates snapshot of current state
     */
    createSnapshot(): () => void;
    /**
     * Validates registry integrity
     */
    validateIntegrity(): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Determines if a variable name is likely a runtime variable that gets cleaned between nodes
     * Used to reduce warning noise for expected cleanup behavior
     */
    private isLikelyRuntimeVariable;
    /**
     * Formats a value for display
     */
    private formatValue;
}

/**
 * Contexto de variáveis hierárquico
 */
export declare interface GlobalVariableContext {
    environment: Record<string, any>;
    global: Record<string, any>;
    suite: Record<string, any>;
    runtime: Record<string, any>;
    imported: Record<string, Record<string, any>>;
}

/**
 * Service for managing global variables with hierarchical scoping and intelligent caching
 *
 * The GlobalVariablesService provides a sophisticated variable management system that supports
 * multi-level variable scoping, template interpolation, dependency resolution, and performance
 * optimization through caching. It integrates with Faker.js for test data generation and
 * JavaScript expressions for dynamic value computation.
 *
 * **Variable Hierarchy (highest to lowest priority):**
 * 1. **Runtime Variables**: Set during test execution (highest priority)
 * 2. **Imported Variables**: Variables imported from dependent flows
 * 3. **Suite Variables**: Variables defined at the test suite level
 * 4. **Global Variables**: Variables from configuration files
 * 5. **Environment Variables**: System environment variables (lowest priority)
 *
 * **Supported Variable Sources:**
 * - Configuration file global variables
 * - System environment variables (all process.env)
 * - Test suite-specific variables
 * - Runtime-computed variables
 * - Variables imported from dependent test flows
 * - Faker.js generated test data ({{faker.name.firstName}})
 * - JavaScript expressions ({{js:new Date().toISOString()}})
 *
 * @example Basic variable management
 * ```typescript
 * import { GlobalVariablesService, ConfigManager } from 'flow-test-engine';
 *
 * const configManager = new ConfigManager();
 * const variableService = new GlobalVariablesService(configManager);
 *
 * // Set suite-level variables
 * variableService.setSuiteVariables({
 *   api_base: 'https://api.example.com',
 *   version: 'v1'
 * });
 *
 * // Set runtime variables (highest priority)
 * variableService.setVariable('user_id', '12345');
 * variableService.setVariable('session_token', 'abc123xyz');
 *
 * // Interpolate template strings
 * const url = variableService.interpolate('{{api_base}}/{{version}}/users/{{user_id}}');
 * // Result: 'https://api.example.com/v1/users/12345'
 * ```
 *
 * @example Advanced template interpolation with Faker and JavaScript
 * ```typescript
 * const variableService = new GlobalVariablesService(configManager);
 *
 * // Templates with Faker.js integration
 * const email = variableService.interpolate('{{faker.internet.email}}');
 * const userName = variableService.interpolate('{{faker.person.firstName}}');
 *
 * // JavaScript expression evaluation
 * const timestamp = variableService.interpolate('{{js:Date.now()}}');
 * const uuid = variableService.interpolate('{{js:require("crypto").randomUUID()}}');
 *
 * // Complex template combining multiple sources
 * const complexTemplate = variableService.interpolate(`
 *   {
 *     "user": {
 *       "name": "{{faker.person.fullName}}",
 *       "email": "{{faker.internet.email}}",
 *       "created_at": "{{js:new Date().toISOString()}}",
 *       "api_key": "{{api_key_prefix}}-{{js:Math.random().toString(36).substr(2, 9)}}"
 *     }
 *   }
 * `);
 * ```
 *
 * @example Dependency management and variable importing
 * ```typescript
 * const variableService = new GlobalVariablesService(configManager, globalRegistry);
 *
 * // Set flow dependencies
 * variableService.setDependencies(['auth-flow', 'setup-flow']);
 *
 * // Variables from dependent flows are automatically available
 * const template = variableService.interpolate('Authorization: Bearer {{auth_token}}');
 * // auth_token was exported by the 'auth-flow' dependency
 *
 * // Check variable availability
 * const allVars = variableService.getAllVariables();
 * console.log('Available variables:', Object.keys(allVars));
 * ```
 *
 * @example Performance optimization with caching
 * ```typescript
 * const variableService = new GlobalVariablesService(configManager);
 *
 * // Enable/disable caching (enabled by default)
 * variableService.enableCache();
 *
 * // First interpolation - computed and cached
 * const result1 = variableService.interpolate('{{complex_template_with_js}}');
 *
 * // Second interpolation - served from cache (much faster)
 * const result2 = variableService.interpolate('{{complex_template_with_js}}');
 *
 * // Clear cache when variables change
 * variableService.setVariable('base_url', 'https://new-api.com');
 * // Cache is automatically cleared
 *
 * // Force cache clear
 * variableService.clearCache();
 * ```
 *
 * @public
 * @since 1.0.0
 */
export declare class GlobalVariablesService {
    private context;
    private configManager;
    private globalRegistry;
    private interpolationCache;
    private cacheEnabled;
    private dependencies;
    private currentExecutionContext;
    constructor(configManager: ConfigManager, globalRegistry?: GlobalRegistryService);
    /**
     * Sets the Global Registry for resolution of exported variables
     */
    setGlobalRegistry(globalRegistry: GlobalRegistryService): void;
    /**
     * Sets the dependencies for this flow (node_ids of dependent flows)
     */
    setDependencies(dependencies: string[]): void;
    /**
     * Updates the current execution context for JavaScript expressions
     */
    setExecutionContext(context: Partial<JavaScriptExecutionContext>): void;
    /**
     * Initializes the variable context
     */
    private initializeContext;
    /**
     * Loads relevant environment variables
     */
    private loadEnvironmentVariables;
    /**
     * Sets variables in runtime scope
     */
    setRuntimeVariables(variables: Record<string, any>): void;
    /**
     * Sets a single variable in runtime scope
     */
    setRuntimeVariable(name: string, value: any): void;
    /**
     * Sets variables in suite scope
     */
    setSuiteVariables(variables: Record<string, any>): void;
    /**
     * Clears runtime variables (used when switching between nodes)
     * Preserves environment, global, and suite variables
     */
    clearRuntimeVariables(): void;
    /**
     * Clears suite-specific variables (used when switching between test suites)
     * Preserves environment and global variables, clears runtime variables
     */
    clearSuiteVariables(): void;
    /**
     * Clears all non-global variables (used when starting a new test suite)
     * Preserves only environment and global variables
     */
    clearAllNonGlobalVariables(): void;
    /**
     * Sets a specific variable in runtime
     */
    setVariable(name: string, value: any, scope?: keyof GlobalVariableContext): void;
    /**
     * Gets a specific variable following the hierarchy
     */
    getVariable(name: string): any;
    /**
     * Gets all variables merged by hierarchy
     */
    getAllVariables(): Record<string, any>;
    /**
     * Interpolates a string replacing {{variable}} with values
     */
    interpolateString(template: string): string;
    /**
     * Interpolates any object (strings, objects, arrays)
     */
    interpolate<T>(obj: T): T;
    /**
     * Resolves variable expressions with support for paths and exported variables
     */
    private resolveVariableExpression;
    /**
     * Converts any value to string for interpolation
     */
    private convertValueToString;
    /**
     * Gets complete variable context
     */
    getContext(): GlobalVariableContext;
    /**
     * Gets variables from a specific scope
     */
    getVariablesByScope(scope: keyof GlobalVariableContext): Record<string, any>;
    /**
     * Checks if a variable exists
     */
    hasVariable(name: string): boolean;
    /**
     * Lists names of all available variables
     */
    getAvailableVariableNames(): string[];
    /**
     * Gets statistics of the variable system
     */
    getStats(): {
        environment_vars: number;
        global_vars: number;
        suite_vars: number;
        runtime_vars: number;
        cache_size: number;
        cache_enabled: boolean;
    };
    /**
     * Clears the interpolation cache
     */
    clearCache(): void;
    /**
     * Invalidates cache entries that use a specific variable
     */
    private invalidateCacheForVariable;
    /**
     * Enables/disables interpolation cache
     */
    setCacheEnabled(enabled: boolean): void;
    /**
     * Exports current variable state for debug
     */
    exportState(): string;
    /**
     * Restores context from an exported state
     */
    importState(state: string): void;
    /**
     * Creates a snapshot of the current variable state
     */
    createSnapshot(): () => void;
    /**
     * Merges variables from another context
     */
    mergeContext(otherContext: Partial<GlobalVariableContext>): void;
    /**
     * Determines if a variable name is likely a runtime variable that gets cleaned between nodes
     * Used to reduce warning noise for expected cleanup behavior
     */
    private isLikelyRuntimeVariable;
}

/**
 * HTTP Service responsible for executing requests and processing responses
 *
 * This service encapsulates HTTP request execution logic using axios,
 * including URL construction, error handling, performance measurement,
 * and response normalization for the Flow Test Engine.
 *
 * @remarks
 * The HttpService automatically handles:
 * - URL construction from base URL and relative paths
 * - Request timeout management
 * - Response time measurement
 * - Error normalization and logging
 * - Header and body processing
 *
 * @example Basic HTTP request execution
 * ```typescript
 * const httpService = new HttpService('https://api.example.com', 30000);
 * const result = await httpService.executeRequest('Login', {
 *   method: 'POST',
 *   url: '/auth/login',
 *   body: { username: 'user', password: 'pass' }
 * });
 *
 * console.log(`Request completed in ${result.response_time}ms`);
 * console.log(`Status: ${result.status_code}`);
 * ```
 *
 * @example Request with custom headers
 * ```typescript
 * const result = await httpService.executeRequest('GetUser', {
 *   method: 'GET',
 *   url: '/users/123',
 *   headers: {
 *     'Authorization': 'Bearer token',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * ```
 *
 * @public
 * @since 1.0.0
 */
export declare class HttpService {
    /** Base URL for constructing complete URLs from relative paths */
    private baseUrl?;
    /** Timeout in milliseconds for HTTP requests */
    private timeout;
    private logger;
    /**
     * Creates a new HttpService instance
     *
     * @param baseUrl - Optional base URL to prefix relative request URLs
     * @param timeout - Request timeout in milliseconds
     *
     * @defaultValue timeout - 60000ms (60 seconds)
     *
     * @example Constructor with base URL
     * ```typescript
     * const service = new HttpService('https://api.example.com');
     * ```
     *
     * @example Constructor with custom timeout
     * ```typescript
     * const service = new HttpService('https://api.example.com', 60000);
     * ```
     *
     * @example Constructor without base URL (absolute URLs only)
     * ```typescript
     * const service = new HttpService();
     * ```
     */
    constructor(baseUrl?: string, timeout?: number);
    /**
     * Executes an HTTP request and returns the execution details
     *
     * Main method for executing HTTP requests. Automatically measures
     * response time, handles errors appropriately and normalizes the response
     * in a standardized format.
     *
     * @param stepName - Step name for identification in logs and results
     * @param request - HTTP request details to be executed
     * @returns Promise that resolves to the execution result
     *
     * @example
     * ```typescript
     * const result = await httpService.executeRequest('Get User', {
     *   method: 'GET',
     *   url: '/users/123',
     *   headers: { 'Authorization': 'Bearer token' }
     * });
     *
     * if (result.status === 'success') {
     *   console.log('Status:', result.response_details?.status_code);
     *   console.log('Body:', result.response_details?.body);
     * }
     * ```
     */
    executeRequest(stepName: string, request: RequestDetails): Promise<StepExecutionResult>;
    /**
     * Builds the complete URL by combining base_url and request URL
     *
     * If the request URL is absolute (contains http/https), returns as is.
     * Otherwise, combines with the baseUrl configured in the constructor.
     *
     * @param url - Request URL (absolute or relative)
     * @returns Complete URL for the request
     * @private
     *
     * @example
     * ```typescript
     * // With baseUrl = 'https://api.example.com'
     * buildFullUrl('/users') // returns 'https://api.example.com/users'
     * buildFullUrl('https://other.com/api') // returns 'https://other.com/api'
     * ```
     */
    private buildFullUrl;
    /**
     * Calculates the approximate response size in bytes.
     */
    private calculateResponseSize;
    /**
     * Formats HTTP request errors for readable messages.
     */
    private formatError;
    /**
     * Sets a new timeout for requests.
     */
    setTimeout(timeout: number): void;
    /**
     * Sets a new base URL.
     */
    setBaseUrl(baseUrl: string | undefined): void;
    /**
     * Sanitizes headers to remove invalid characters
     * @private
     */
    private sanitizeHeaders;
    /**
     * Normalizes axios headers to Record<string, string>.
     */
    private normalizeHeaders;
    /**
     * Generates a complete cURL command for the request
     */
    private generateCurlCommand;
    /**
     * Generates raw HTTP request text
     */
    private generateRawRequest;
    /**
     * Generates raw HTTP response text
     */
    private generateRawResponse;
}

/**
 * Unified iteration configuration
 *
 * Supports both array iteration and range iteration patterns.
 */
export declare type IterationConfig = ArrayIterationConfig | RangeIterationConfig;

/**
 * Context for a single iteration execution
 */
export declare interface IterationContext {
    /** Current iteration index (0-based) */
    index: number;
    /** Current item (for array iteration) or current value (for range iteration) */
    value: any;
    /** Variable name to bind the value to */
    variableName: string;
    /** Whether this is the first iteration */
    isFirst: boolean;
    /** Whether this is the last iteration */
    isLast: boolean;
}

/**
 * Context available in JavaScript expressions
 */
declare interface JavaScriptExecutionContext {
    response?: {
        body?: any;
        headers?: Record<string, string>;
        status?: number;
        statusText?: string;
    };
    variables?: Record<string, any>;
    captured?: Record<string, any>;
    request?: {
        body?: any;
        headers?: Record<string, string>;
        method?: string;
        url?: string;
    };
    utils?: {
        Date: DateConstructor;
        Math: Math;
        JSON: JSON;
    };
}

/**
 * Package information and metadata
 *
 * Metadata about the Flow Test Engine including name, version, and description.
 * Useful for integration with tools that need to identify the version or
 * display package information.
 *
 * @example Displaying package information
 * ```typescript
 * import { PACKAGE_INFO } from 'flow-test-engine';
 *
 * console.log(`Using ${PACKAGE_INFO.name} v${PACKAGE_INFO.version}`);
 * console.log(`Description: ${PACKAGE_INFO.description}`);
 * ```
 *
 * @example Version checking in CI/CD
 * ```typescript
 * if (PACKAGE_INFO.version.startsWith('1.')) {
 *   console.log('Using stable v1.x release');
 * } else {
 *   console.warn('Using pre-release version');
 * }
 * ```
 *
 * @public
 */
export declare const PACKAGE_INFO: {
    readonly name: "flow-test-engine";
    readonly version: "1.0.0";
    readonly description: "A comprehensive API testing engine with directory-based execution, global variables, and priority-driven test management.";
};

/**
 * Resumo de performance
 */
export declare interface PerformanceSummary {
    total_requests: number;
    average_response_time_ms: number;
    min_response_time_ms: number;
    max_response_time_ms: number;
    requests_per_second: number;
    slowest_endpoints: Array<{
        url: string;
        average_time_ms: number;
        call_count: number;
    }>;
}

/**
 * Function for dry-run execution (discovery and planning only)
 *
 * Executes only the discovery and planning phases without making actual HTTP requests.
 * This is useful for validating configuration, visualizing execution plans, checking
 * test dependencies, and estimating execution time without running the actual tests.
 *
 * The dry-run process includes:
 * - Test file discovery and parsing
 * - Dependency resolution and validation
 * - Priority-based test ordering
 * - Execution plan generation
 *
 * @param configPath - Optional path to configuration file
 * @returns Promise that resolves to array of discovered and ordered test information
 * @throws {Error} When configuration is invalid or test discovery fails
 *
 * @example Basic dry-run for configuration validation
 * ```typescript
 * import { planTests } from 'flow-test-engine';
 *
 * const plan = await planTests('./config.yml');
 * console.log(`📋 Execution Plan: ${plan.length} tests discovered`);
 *
 * plan.forEach((test, index) => {
 *   console.log(`${index + 1}. ${test.suite_name} (${test.priority})`);
 *   console.log(`   📁 ${test.file_path}`);
 *   console.log(`   ⏱️  Est. Duration: ${test.estimated_duration}ms`);
 * });
 * ```
 *
 * @example Dependency analysis with dry-run
 * ```typescript
 * const tests = await planTests('./config.yml');
 *
 * // Analyze dependencies
 * const testsWithDeps = tests.filter(t => t.dependencies?.length > 0);
 * console.log(`\n🔗 Dependency Analysis (${testsWithDeps.length} tests have dependencies):`);
 *
 * testsWithDeps.forEach(test => {
 *   console.log(`${test.suite_name}:`);
 *   test.dependencies.forEach(dep => {
 *     const depTest = tests.find(t => t.node_id === dep);
 *     if (depTest) {
 *       console.log(`  ↳ depends on: ${depTest.suite_name}`);
 *     } else {
 *       console.log(`  ⚠️  missing dependency: ${dep}`);
 *     }
 *   });
 * });
 * ```
 *
 * @example Execution time estimation
 * ```typescript
 * const plan = await planTests('./config.yml');
 *
 * const totalEstimatedTime = plan.reduce((sum, test) => {
 *   return sum + (test.estimated_duration || 0);
 * }, 0);
 *
 * console.log(`⏱️  Estimated execution time: ${(totalEstimatedTime / 1000).toFixed(1)}s`);
 *
 * const priorityBreakdown = plan.reduce((acc, test) => {
 *   const priority = test.priority || 'medium';
 *   acc[priority] = (acc[priority] || 0) + 1;
 *   return acc;
 * }, {} as Record<string, number>);
 *
 * console.log('🏷️  Priority breakdown:', priorityBreakdown);
 * ```
 *
 * @public
 */
export declare function planTests(configPath?: string): Promise<any>;

/**
 * Sistema de prioridades
 */
export declare interface PriorityConfig {
    levels: string[];
    required?: string[];
    fail_fast_on_required?: boolean;
}

/**
 * Service for managing priorities and test ordering
 */
export declare class PriorityService {
    private configManager;
    private priorityWeights;
    constructor(configManager: ConfigManager);
    /**
     * Inicializa os pesos de prioridade baseado na configuração
     */
    private initializePriorityWeights;
    /**
     * Orders tests by priority and dependencies
     */
    orderTests(tests: DiscoveredTest[]): DiscoveredTest[];
    /**
     * Orders tests only by priority
     */
    private sortByPriority;
    /**
     * Resolves execution order considering dependencies
     */
    private resolveExecutionOrder;
    /**
     * Seleciona o teste de maior prioridade de uma lista
     */
    private selectHighestPriority;
    /**
     * Obtém o peso de uma prioridade
     */
    private getPriorityWeight;
    /**
     * Checks if a test is considered required
     */
    isRequiredTest(test: DiscoveredTest): boolean;
    /**
     * Filtra apenas testes obrigatórios
     */
    getRequiredTests(tests: DiscoveredTest[]): DiscoveredTest[];
    /**
     * Filtra testes por nível de prioridade
     */
    filterByPriority(tests: DiscoveredTest[], priorities: string[]): DiscoveredTest[];
    /**
     * Groups tests by priority
     */
    groupByPriority(tests: DiscoveredTest[]): Map<string, DiscoveredTest[]>;
    /**
     * Calculates priority statistics
     */
    getPriorityStats(tests: DiscoveredTest[]): {
        total_tests: number;
        required_tests: number;
        by_priority: Record<string, {
            count: number;
            percentage: number;
            estimated_duration: number;
        }>;
        total_estimated_duration: number;
        required_estimated_duration: number;
    };
    /**
     * Checks if a priority is required
     */
    private isRequiredPriority;
    /**
     * Suggests optimizations in priority distribution
     */
    suggestOptimizations(tests: DiscoveredTest[]): string[];
    /**
     * Creates a detailed execution plan
     */
    createExecutionPlan(tests: DiscoveredTest[]): {
        phases: Array<{
            name: string;
            tests: DiscoveredTest[];
            estimated_duration: number;
            is_required: boolean;
        }>;
        total_duration: number;
        critical_path: string[];
    };
    /**
     * Identifies the critical path of dependencies
     */
    private identifyCriticalPath;
}

/**
 * Configuration for range iteration in test steps
 *
 * @example
 * ```yaml
 * iterate:
 *   range: "1..5"
 *   as: "index"
 * ```
 */
export declare interface RangeIterationConfig {
    /** Range specification in format "start..end" (inclusive) */
    range: string;
    /** Variable name to use for the current index in each iteration */
    as: string;
}

export declare type ReportFormat = "json" | "junit" | "html" | "console";

/**
 * Configuração de relatórios
 */
export declare interface ReportingConfig {
    formats: ReportFormat[];
    output_dir: string;
    aggregate: boolean;
    include_performance_metrics?: boolean;
    include_variables_state?: boolean;
}

/**
 * Service for generating reports in multiple formats
 */
export declare class ReportingService {
    private configManager;
    private logger;
    constructor(configManager: ConfigManager);
    /**
     * Generates all configured reports
     */
    generateReports(result: AggregatedResult): Promise<void>;
    /**
     * Generates a specific report
     */
    private generateReport;
    /**
     * Generates JSON report
     */
    private generateJsonReport;
    /**
     * Generates JUnit XML report
     */
    private generateJunitReport;
    /**
     * Generates HTML report using the new HTML generator
     */
    private generateHtmlReport;
    /**
     * Generates console report
     */
    private generateConsoleReport;
    /**
     * Builds XML in JUnit format
     */
    private buildJunitXml;
    /**
     * Builds HTML report
     */
    private buildHtmlReport;
    /**
     * Builds performance section for HTML
     */
    private buildPerformanceSection;
    /**
     * Builds step section for HTML
     */
    private buildStepSection;
    /**
     * Builds request section for HTML
     */
    private buildRequestSection;
    /**
     * Builds response section for HTML
     */
    private buildResponseSection;
    /**
     * Builds assertions section for HTML
     */
    private buildAssertionsSection;
    /**
     * Builds variables section for HTML
     */
    private buildVariablesSection;
    /**
     * Builds available variables section for HTML
     */
    private buildAvailableVariablesSection;
    /**
     * Builds suite section for HTML
     */
    private buildSuiteSection;
    /**
     * Formatting utilities
     */
    private formatDuration;
    private generateTimestamp;
    private sanitizeFileName;
    private escapeXml;
    private escapeHtml;
}

/**
 * Definições de tipos específicas para o motor de testes
 *
 * Este módulo contém as definições de tipos da arquitetura v1.0 do Flow Test Engine.
 * Estende e substitui common.types.ts com nova arquitetura aprimorada,
 * incluindo suporte a metadados, hooks, filtros avançados e estatísticas detalhadas.
 *
 * @since 1.0.0
 */
/**
 * Detalhes de uma requisição HTTP com suporte estendido
 *
 * Versão aprimorada que inclui timeout configurável e métodos HTTP adicionais
 * como HEAD e OPTIONS para casos de uso avançados.
 */
export declare interface RequestDetails {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
    url: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, any>;
    timeout?: number;
}

/**
 * Reusable flow definition
 *
 * @example
 * ```typescript
 * const reusableFlow: ReusableFlow = {
 *   flow_name: "User Registration Flow",
 *   description: "Complete user registration with validation",
 *   variables: {
 *     base_url: "https://api.example.com",
 *     test_email: "test@example.com"
 *   },
 *   steps: [
 *     {
 *       name: "Create user account",
 *       request: {
 *         method: "POST",
 *         url: "/users",
 *         body: { email: "{{test_email}}" }
 *       }
 *     }
 *   ]
 * };
 * ```
 */
export declare interface ReusableFlow {
    /** Name of the reusable flow */
    flow_name: string;
    /** Description of what this flow does */
    description?: string;
    /** Default variables for the flow */
    variables?: Record<string, any>;
    /** Test steps that comprise the flow */
    steps: TestStep[];
    /** Variables to export to global scope after execution */
    exports?: string[];
    /** Flow dependencies that must be executed first */
    depends?: FlowDependency[];
    /** Additional metadata for flow execution */
    metadata?: {
        priority?: string;
        tags?: string[];
        estimated_duration_ms?: number;
    };
}

/**
 * Convenience function for one-shot test execution
 *
 * Creates an engine, executes all tests, and returns the aggregated results.
 * This is ideal for automation, CI/CD pipelines, and simple test execution
 * scenarios where you want everything handled automatically.
 *
 * The function handles the complete lifecycle: engine creation, configuration
 * loading, test discovery, execution, and result aggregation.
 *
 * @param configPath - Optional path to configuration file
 * @returns Promise that resolves to the aggregated execution results
 * @throws {Error} When configuration is invalid or critical execution failure occurs
 *
 * @example Simple test execution
 * ```typescript
 * import { runTests } from 'flow-test-engine';
 *
 * // Execute with default configuration
 * const result = await runTests();
 * console.log(`Success rate: ${result.success_rate.toFixed(1)}%`);
 * console.log(`Duration: ${result.total_duration_ms}ms`);
 *
 * // Exit with appropriate code for CI/CD
 * process.exit(result.failed_tests > 0 ? 1 : 0);
 * ```
 *
 * @example Production environment execution
 * ```typescript
 * const result = await runTests('./configs/production.yml');
 *
 * if (result.success_rate < 95) {
 *   console.error(`Test success rate too low: ${result.success_rate}%`);
 *   console.error(`Failed tests: ${result.failed_tests}`);
 *   process.exit(1);
 * }
 *
 * console.log('✅ All tests passed - deployment ready');
 * ```
 *
 * @example Error handling and reporting
 * ```typescript
 * try {
 *   const result = await runTests('./config.yml');
 *
 *   // Generate summary report
 *   console.log('\n📊 Test Execution Summary:');
 *   console.log(`   Total Tests: ${result.total_tests}`);
 *   console.log(`   Successful: ${result.successful_tests}`);
 *   console.log(`   Failed: ${result.failed_tests}`);
 *   console.log(`   Skipped: ${result.skipped_tests}`);
 *   console.log(`   Duration: ${(result.total_duration_ms / 1000).toFixed(1)}s`);
 *
 * } catch (error) {
 *   console.error('❌ Test execution failed:', error.message);
 *   process.exit(2); // Different exit code for execution errors
 * }
 * ```
 *
 * @public
 */
export declare function runTests(configPath?: string): Promise<any>;

export declare interface ScenarioEvaluation {
    index: number;
    condition: string;
    matched: boolean;
    executed: boolean;
    branch: "then" | "else" | "none";
    assertions_added?: number;
    captures_added?: number;
}

export declare interface ScenarioMeta {
    has_scenarios: boolean;
    executed_count: number;
    evaluations: ScenarioEvaluation[];
}

/**
 * Resultado de execução de um step individual
 */
export declare interface StepExecutionResult {
    step_name: string;
    status: "success" | "failure" | "skipped";
    duration_ms: number;
    request_details?: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: any;
        full_url?: string;
        curl_command?: string;
        raw_request?: string;
    };
    response_details?: {
        status_code: number;
        headers: Record<string, string>;
        body: any;
        size_bytes: number;
        raw_response?: string;
    };
    assertions_results?: AssertionResult[];
    captured_variables?: Record<string, any>;
    available_variables?: Record<string, any>;
    iteration_results?: StepExecutionResult[];
    scenarios_meta?: ScenarioMeta;
    error_message?: string;
}

/**
 * Resultado de execução de uma suíte individual
 */
export declare interface SuiteExecutionResult {
    node_id: string;
    suite_name: string;
    file_path: string;
    priority?: string;
    start_time: string;
    end_time: string;
    duration_ms: number;
    status: "success" | "failure" | "skipped";
    steps_executed: number;
    steps_successful: number;
    steps_failed: number;
    success_rate: number;
    steps_results: StepExecutionResult[];
    error_message?: string;
    variables_captured: Record<string, any>;
    available_variables?: Record<string, any>;
}

/**
 * Test discovery service responsible for finding and loading test files
 *
 * This service scans directories for YAML test files, validates their structure,
 * and resolves dependencies between different test suites. It supports filtering
 * by priority, tags, and file patterns.
 *
 * @example
 * ```typescript
 * const configManager = new ConfigManager();
 * const discovery = new TestDiscovery(configManager);
 *
 * // Discover all tests in directory
 * const tests = await discovery.discoverTests();
 *
 * // Filter by priority and tags
 * const filtered = discovery.filterTests(tests, {
 *   priorities: ['critical', 'high'],
 *   tags: ['smoke', 'api']
 * });
 * ```
 *
 * @public
 */
export declare class TestDiscovery {
    private configManager;
    constructor(configManager: ConfigManager);
    /**
     * Discovers all test files in the configured directory
     *
     * Scans the test directory recursively for YAML files, validates their structure
     * as valid test suites, and returns an array of discovered tests with metadata.
     *
     * @returns Promise resolving to array of discovered test configurations
     * @throws Error if test directory doesn't exist or YAML files are invalid
     *
     * @example
     * ```typescript
     * const tests = await discovery.discoverTests();
     * console.log(`Found ${tests.length} test suites`);
     *
     * tests.forEach(test => {
     *   console.log(`- ${test.suite.suite_name} (${test.filePath})`);
     * });
     * ```
     */
    discoverTests(): Promise<DiscoveredTest[]>;
    /**
     * Analisa um arquivo de teste individual
     */
    private parseTestFile;
    /**
     * Infere prioridade baseada no nome da suíte
     */
    private inferPriorityFromName;
    /**
     * Extrai dependências de uma suíte de testes (FORMATO LEGADO - REMOVIDO)
     * Agora usa apenas o campo 'depends' com node_id
     */
    private extractDependencies;
    /**
     * Extrai dependências de fluxo no novo formato
     */
    private extractFlowDependencies;
    /**
     * Extrai lista de variáveis exportadas
     */
    private extractExports;
    /**
     * Estima duração baseada no número de steps
     */
    private estimateDuration;
    /**
     * Remove testes duplicados baseado no caminho do arquivo
     */
    private removeDuplicates;
    /**
     * Resolve dependências entre testes
     */
    private resolveDependencies;
    /**
     * Obtém estatísticas da descoberta
     */
    getDiscoveryStats(tests: DiscoveredTest[]): {
        total_tests: number;
        by_priority: Record<string, number>;
        total_estimated_duration: number;
        with_dependencies: number;
        files_scanned: number;
    };
    /**
     * Valida se um arquivo é um teste válido sem carregá-lo completamente
     */
    isValidTestFile(filePath: string): Promise<boolean>;
    /**
     * Descobre e organiza testes em grupos lógicos
     */
    discoverTestGroups(): Promise<Map<string, DiscoveredTest[]>>;
    /**
     * Detecta testes órfãos (sem dependências e que ninguém depende)
     */
    findOrphanTests(tests: DiscoveredTest[]): DiscoveredTest[];
}

/**
 * Complete test step definition with extended metadata
 *
 * @example
 * ```typescript
 * const step: TestStep = {
 *   name: "Create new user account",
 *   request: {
 *     method: "POST",
 *     url: "/api/users",
 *     headers: { "Content-Type": "application/json" },
 *     body: {
 *       username: "{{test_username}}",
 *       email: "{{test_email}}"
 *     }
 *   },
 *   assert: {
 *     status_code: 201,
 *     body: {
 *       "id": { exists: true },
 *       "username": { equals: "{{test_username}}" }
 *     }
 *   },
 *   capture: {
 *     user_id: "body.id",
 *     created_at: "body.created_at"
 *   },
 *   continue_on_failure: false,
 *   metadata: {
 *     priority: "high",
 *     tags: ["user-management", "regression"],
 *     timeout: 10000
 *   }
 * };
 * ```
 */
export declare interface TestStep {
    /** Descriptive name for the test step */
    name: string;
    /** HTTP request configuration */
    request: RequestDetails;
    /** Response assertions to validate */
    assert?: Assertions;
    /** Data extraction from response */
    capture?: Record<string, string>;
    /** Conditional scenarios for complex flows */
    scenarios?: ConditionalScenario[];
    /** Iteration configuration for repeating the step multiple times */
    iterate?: IterationConfig;
    /** Whether to continue execution if this step fails */
    continue_on_failure?: boolean;
    /** Additional metadata for step configuration */
    metadata?: TestStepMetadata;
}

/**
 * Metadata for test step configuration and behavior
 *
 * @example
 * ```typescript
 * const metadata: TestStepMetadata = {
 *   priority: "high",
 *   tags: ["auth", "smoke"],
 *   timeout: 5000,
 *   retry: {
 *     max_attempts: 3,
 *     delay_ms: 1000
 *   },
 *   depends_on: ["login_step"],
 *   description: "Validates user authentication token"
 * };
 * ```
 */
export declare interface TestStepMetadata {
    /** Execution priority (high, medium, low) */
    priority?: string;
    /** Tags for categorization and filtering */
    tags?: string[];
    /** Maximum execution time in milliseconds */
    timeout?: number;
    /** Retry configuration for failed steps */
    retry?: {
        max_attempts: number;
        delay_ms: number;
    };
    /** Array of step names this step depends on */
    depends_on?: string[];
    /** Human-readable description of the step */
    description?: string;
}

/**
 * Complete test suite definition with extended metadata
 *
 * @example
 * ```typescript
 * const testSuite: TestSuite = {
 *   node_id: "user-mgmt-e2e",
 *   suite_name: "E2E User Management Tests",
 *   description: "Complete end-to-end testing of user management features",
 *   base_url: "https://api.example.com",
 *   // Flow dependencies replaced by 'depends' field
 *   variables: {
 *     test_user_email: "test@example.com",
 *     api_version: "v1"
 *   },
 *   steps: [
 *     {
 *       name: "Create user",
 *       request: {
 *         method: "POST",
 *         url: "/users",
 *         body: { email: "{{test_user_email}}" }
 *       }
 *     }
 *   ],
 *   exports: ["created_user_id", "auth_token"],
 *   depends: [
 *     {
 *       node_id: "database_setup",
 *       required: true
 *     }
 *   ],
 *   metadata: {
 *     priority: "high",
 *     tags: ["e2e", "user-management", "regression"],
 *     timeout: 30000,
 *     estimated_duration_ms: 15000
 *   }
 * };
 * ```
 */
export declare interface TestSuite {
    /** Unique node identifier for this test suite */
    node_id: string;
    /** Name of the test suite */
    suite_name: string;
    /** Description of what this suite tests */
    description?: string;
    /** Base URL for all requests in this suite */
    base_url?: string;
    /** Variables available to all steps */
    variables?: Record<string, any>;
    /** Test steps to execute */
    steps: TestStep[];
    /** Variables to export to global scope */
    exports?: string[];
    /** Dependencies that must be satisfied before execution */
    depends?: FlowDependency[];
    /** Extended metadata for suite configuration */
    metadata?: {
        priority?: string;
        tags?: string[];
        timeout?: number;
        estimated_duration_ms?: number;
    };
}

/**
 * Package version
 *
 * Current version of the Flow Test Engine, following semantic versioning.
 *
 * @public
 */
export declare const VERSION = "1.0.0";

export { }
