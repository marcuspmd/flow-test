/**
 * @fileoverview Configuration management system for the Flow Test Engine.
 *
 * @remarks
 * This module provides the ConfigManager class which handles all configuration
 * aspects of the Flow Test Engine including file loading, environment variable
 * integration, validation, and runtime overrides with comprehensive error handling.
 *
 * @packageDocumentation
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import * as dotenv from "dotenv";
import { injectable } from "inversify";
import "reflect-metadata";
import {
  EngineConfig,
  EngineExecutionOptions,
  ReportFormat,
} from "../types/engine.types";
import { IConfigManager } from "../interfaces/services/IConfigManager";
import { LoggerService } from "../services/logger.service";

/**
 * Module-level logger instance for config manager
 */
const logger = new LoggerService();

/**
 * Configuration manager for the Flow Test Engine with comprehensive loading and validation.
 *
 * @remarks
 * The ConfigManager is responsible for loading, validating, and managing all engine
 * configurations including global variables, environment settings, execution options,
 * and runtime overrides. It provides a centralized configuration system with support
 * for multiple file formats, environment-specific settings, and runtime parameter overrides.
 *
 * **Key Features:**
 * - **Automatic Discovery**: Searches for configuration files using multiple naming conventions
 * - **Environment Integration**: Supports environment variables with `FLOW_TEST_` prefix
 * - **Runtime Overrides**: Allows execution options to override file-based configurations
 * - **Format Support**: Handles YAML and JSON configuration formats seamlessly
 * - **Validation**: Comprehensive configuration validation with detailed error messages
 * - **Environment Resolution**: Context-aware variable resolution based on execution environment
 *
 * **Configuration Priority Order (highest to lowest):**
 * 1. Runtime execution options passed to constructor
 * 2. Environment variables with `FLOW_TEST_` prefix
 * 3. Configuration file settings
 * 4. Built-in default values
 *
 * **Supported Configuration Files:**
 * - `flow-test.config.yml` (primary)
 * - `flow-test.config.yaml`
 * - `flow-test.config.json`
 * - `.flow-test.yml` (hidden file)
 * - Custom paths via constructor parameter
 *
 * @example Basic configuration management
 * ```typescript
 * import { ConfigManager } from 'flow-test-engine';
 *
 * // Load configuration from default locations
 * const configManager = new ConfigManager();
 * const config = configManager.loadConfig();
 *
 * console.log(`Base URL: ${config.base_url}`);
 * console.log(`Environment: ${config.environment}`);
 * console.log(`Verbosity: ${config.verbosity}`);
 * ```
 *
 * @example Configuration with runtime overrides
 * ```typescript
 * const options: EngineExecutionOptions = {
 *   verbosity: 'verbose',
 *   priority: ['critical', 'high'],
 *   baseUrl: 'https://staging.api.example.com'
 * };
 *
 * const configManager = new ConfigManager('./custom-config.yml', options);
 * const config = configManager.loadConfig();
 *
 * // Runtime options will override file settings
 * ```
 *
 * @example Environment variable integration
 * ```typescript
 * // Set environment variables
 * process.env.FLOW_TEST_BASE_URL = 'https://production.api.example.com';
 * process.env.FLOW_TEST_API_KEY = 'secret-key-123';
 *
 * const configManager = new ConfigManager();
 * const config = configManager.loadConfig();
 *
 * // Environment variables override file settings
 * console.log(config.base_url); // 'https://production.api.example.com'
 * ```
 *
 * @public
 * @since 1.0.0
 */
/**
 * Extended configuration type with runtime-only fields
 * These fields are added at runtime and not part of the configuration file
 */
interface ExtendedConfig extends EngineConfig {
  /** Runtime filters passed via execution options */
  _runtime_filters?: {
    priority?: string[];
    node_ids?: string[];
    suite_names?: string[];
    tags?: string[];
    file_patterns?: string[];
    step_ids?: string[];
  };
}

@injectable()
export class ConfigManager implements IConfigManager {
  /** Configuração completa carregada e processada */
  private config: ExtendedConfig;

  /** Caminho absoluto do arquivo de configuração utilizado */
  private configFilePath: string;

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
  constructor(options: EngineExecutionOptions = {}) {
    this.configFilePath = this.resolveConfigFile(options.config_file);
    this.config = this.loadConfig();
    this.loadEnvFiles(this.config.globals?.env_files);
    this.applyOptionsOverrides(options);
  }

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
  getConfig(): EngineConfig {
    return this.config;
  }

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
  getGlobalVariables(): Record<string, any> {
    const envVars = this.getEnvironmentVariables();
    const configVars = this.config.globals?.variables || {};

    return {
      ...configVars,
      ...envVars,
    };
  }

  /**
   * Checks if the Strategy Pattern refactor feature flag is enabled.
   *
   * @returns `true` if Strategy Pattern execution is enabled, `false` otherwise
   *
   * @remarks
   * This feature flag controls whether the ExecutionService delegates step execution
   * to specialized strategy classes (RequestStepStrategy, InputStepStrategy, etc.)
   * instead of using the monolithic executeStep method.
   *
   * **Priority**: Environment variable > Config file > Default (false)
   *
   * **Status**: EXPERIMENTAL - In development (ADR-001)
   *
   * @example Check if Strategy Pattern is enabled
   * ```typescript
   * const configManager = new ConfigManager();
   *
   * if (configManager.isStrategyPatternEnabled()) {
   *   console.log('Using new Strategy Pattern execution');
   * } else {
   *   console.log('Using legacy executeStep method');
   * }
   * ```
   *
   * @public
   * @since 1.2.0
   */
  isStrategyPatternEnabled(): boolean {
    return this.config.globals?.use_strategy_pattern ?? false;
  }

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
  private resolveConfigFile(configFile?: string): string {
    if (configFile) {
      if (fs.existsSync(configFile)) {
        return path.resolve(configFile);
      }
      throw new Error(`Config file not found: ${configFile}`);
    }

    // Busca por arquivos de configuração padrão
    const possibleFiles = [
      "flow-test.config.yml",
      "flow-test.config.yaml",
      "flow-test.yml",
      "flow-test.yaml",
    ];

    for (const filename of possibleFiles) {
      const fullPath = path.resolve(filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error(
      `No configuration file found. Expected one of: ${possibleFiles.join(
        ", "
      )}`
    );
  }

  /**
   * Carrega e valida a configuração
   */
  private loadConfig(): EngineConfig {
    try {
      const fileContent = fs.readFileSync(this.configFilePath, "utf8");
      const config = yaml.load(fileContent) as EngineConfig;

      return this.validateAndNormalizeConfig(config);
    } catch (error) {
      throw new Error(
        `Failed to load config from ${this.configFilePath}: ${error}`
      );
    }
  }

  /**
   * Valida e normaliza a configuração com valores padrão
   */
  private validateAndNormalizeConfig(config: unknown): EngineConfig {
    if (!config || typeof config !== "object") {
      throw new Error("Configuration must be a valid object");
    }

    // After type guard, assert as Record for property access
    const configObj = config as Record<string, any>;

    if (!configObj.project_name) {
      throw new Error("project_name is required in configuration");
    }

    const reportingEnabled = configObj.reporting?.enabled !== false;
    const allowedReportFormats: string[] = ["json", "html", "qa"];

    let normalizedFormats: ReportFormat[] = [];

    if (reportingEnabled) {
      // Validate reporting formats before filtering
      if (Array.isArray(configObj.reporting?.formats)) {
        const configuredFormats = configObj.reporting!.formats as string[];
        const invalidFormats = configuredFormats.filter(
          (format) => !allowedReportFormats.includes(format)
        );
        if (invalidFormats.length > 0) {
          throw new Error(
            `Invalid reporting formats: ${invalidFormats.join(", ")}`
          );
        }
      }

      const configuredFormats = Array.isArray(configObj.reporting?.formats)
        ? (configObj.reporting!.formats as string[]).filter((format) =>
            allowedReportFormats.includes(format)
          )
        : [];
      normalizedFormats = Array.from(
        new Set(configuredFormats)
      ) as ReportFormat[];
      if (normalizedFormats.length === 0) {
        normalizedFormats.push("json");
      }
    }

    const htmlReportingConfig = configObj.reporting?.html || {};

    const normalized: EngineConfig = {
      project_name: configObj.project_name,
      test_directory: configObj.test_directory || "./tests",
      globals: {
        env_files: configObj.globals?.env_files,
        variables: configObj.globals?.variables || {},
        timeouts: {
          default: configObj.globals?.timeouts?.default || 30000,
          slow_tests: configObj.globals?.timeouts?.slow_tests || 60000,
        },
        base_url: configObj.globals?.base_url,
        // Feature flag: Strategy Pattern refactor (ADR-001)
        // Default: false (disabled), can be overridden by env var FLOW_TEST_USE_STRATEGY_PATTERN
        use_strategy_pattern: this.parseBoolean(
          process.env.FLOW_TEST_USE_STRATEGY_PATTERN,
          configObj.globals?.use_strategy_pattern ?? false
        ),
      },
      discovery: {
        patterns: configObj.discovery?.patterns || [
          "**/*.test.yml",
          "**/*.test.yaml",
        ],
        exclude: configObj.discovery?.exclude || [
          "**/node_modules/**",
          "**/drafts/**",
        ],
        recursive: configObj.discovery?.recursive !== false,
      },
      priorities: {
        levels: configObj.priorities?.levels || [
          "critical",
          "high",
          "medium",
          "low",
        ],
        required: configObj.priorities?.required || ["critical"],
        fail_fast_on_required:
          configObj.priorities?.fail_fast_on_required !== false,
      },
      execution: {
        mode: configObj.execution?.mode || "sequential",
        max_parallel: configObj.execution?.max_parallel || 5,
        timeout: configObj.execution?.timeout || 30000,
        continue_on_failure: configObj.execution?.continue_on_failure || false,
        retry_failed: {
          enabled: configObj.execution?.retry_failed?.enabled || false,
          max_attempts: configObj.execution?.retry_failed?.max_attempts || 3,
          delay_ms: configObj.execution?.retry_failed?.delay_ms || 1000,
        },
      },
      reporting: {
        enabled: reportingEnabled,
        formats: normalizedFormats,
        output_dir: configObj.reporting?.output_dir || "./results",
        aggregate: configObj.reporting?.aggregate !== false,
        include_performance_metrics:
          configObj.reporting?.include_performance_metrics !== false,
        include_variables_state:
          configObj.reporting?.include_variables_state !== false,
        html: {
          aggregate: htmlReportingConfig.aggregate !== false,
          per_suite: htmlReportingConfig.per_suite !== false,
          output_subdir: htmlReportingConfig.output_subdir || "html",
        },
      },
    };

    this.validateConfig(normalized);
    return normalized;
  }

  /**
   * Aplica overrides das opções de execução
   */
  private applyOptionsOverrides(options: EngineExecutionOptions): void {
    if (options.test_directory) {
      this.config.test_directory = options.test_directory;
    }

    if (options.filters) {
      // Armazena filtros para uso posterior
      this.config._runtime_filters = options.filters;
    }

    if (options.reporting) {
      const reportingConfig = this.config.reporting;
      if (reportingConfig) {
        if (typeof options.reporting.enabled === "boolean") {
          reportingConfig.enabled = options.reporting.enabled;
          if (options.reporting.enabled === false) {
            reportingConfig.formats = [];
          } else if (reportingConfig.formats.length === 0) {
            reportingConfig.formats = ["json"] as ReportFormat[];
          }
        }

        if (
          reportingConfig.enabled !== false &&
          options.reporting.formats &&
          options.reporting.formats.length > 0
        ) {
          const allowedFormats: ReportFormat[] = ["json", "html", "qa"];
          const merged = new Set<ReportFormat>(reportingConfig.formats);

          options.reporting.formats.forEach((format) => {
            if (allowedFormats.includes(format)) {
              merged.add(format);
            }
          });

          reportingConfig.formats = allowedFormats.filter((format) =>
            merged.has(format)
          );

          if (reportingConfig.formats.length === 0) {
            reportingConfig.formats = ["json"];
          }
        }

        if (options.reporting.html && reportingConfig.enabled !== false) {
          reportingConfig.html = {
            ...reportingConfig.html,
            ...options.reporting.html,
          };
        }
      }
    }
  }

  /**
   * Obtém variáveis de ambiente relevantes
   */
  private getEnvironmentVariables(): Record<string, any> {
    const envVars: Record<string, any> = {};

    // Busca por variáveis que começam com FLOW_TEST_
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("FLOW_TEST_")) {
        const varName = key.substring("FLOW_TEST_".length).toLowerCase();
        envVars[varName] = process.env[key];
      }
    });

    return envVars;
  }

  /**
   * Loads environment variables from .env files
   *
   * @param envFiles - Array of .env file paths to load
   * @private
   */
  private loadEnvFiles(envFiles?: string[]): void {
    if (!envFiles || envFiles.length === 0) {
      return;
    }

    for (const envFile of envFiles) {
      const envPath = path.resolve(envFile);

      if (!fs.existsSync(envPath)) {
        logger.warn(
          `Environment file not found: ${envFile} (resolved to ${envPath})`
        );
        continue;
      }

      try {
        const result = dotenv.config({ path: envPath });

        if (result.error) {
          logger.warn(
            `Failed to load environment file ${envFile}: ${result.error.message}`
          );
        } else {
          logger.debug(`Loaded environment variables from ${envFile}`);
        }
      } catch (error) {
        logger.warn(`Error loading environment file ${envFile}: ${error}`);
      }
    }
  }

  /**
   * Valida a configuração final
   */
  private validateConfig(config: EngineConfig): void {
    // Valida test_directory
    if (!fs.existsSync(config.test_directory)) {
      throw new Error(
        `Test directory does not exist: ${config.test_directory}`
      );
    }

    // Valida execution mode
    if (!["sequential", "parallel"].includes(config.execution!.mode)) {
      throw new Error(`Invalid execution mode: ${config.execution!.mode}`);
    }

    // Valida max_parallel para modo paralelo
    if (
      config.execution!.mode === "parallel" &&
      config.execution!.max_parallel! <= 0
    ) {
      throw new Error(
        "max_parallel must be greater than 0 for parallel execution"
      );
    }

    // Valida prioridades
    if (config.priorities!.levels.length === 0) {
      throw new Error("At least one priority level must be defined");
    }

    // Valida required priorities
    const invalidRequired = config.priorities!.required!.filter(
      (req) => !config.priorities!.levels.includes(req)
    );
    if (invalidRequired.length > 0) {
      throw new Error(
        `Required priorities not found in levels: ${invalidRequired.join(", ")}`
      );
    }

    if (config.reporting && config.reporting.enabled !== false) {
      // Valida reporting formats
      const validFormats = ["json", "html", "qa"];
      const invalidFormats = config.reporting!.formats.filter(
        (format) => !validFormats.includes(format)
      );
      if (invalidFormats.length > 0) {
        throw new Error(
          `Invalid reporting formats: ${invalidFormats.join(", ")}`
        );
      }

      if (config.reporting!.formats.length === 0) {
        throw new Error("At least one reporting format must be configured");
      }

      // Cria output directory se não existir
      if (!fs.existsSync(config.reporting!.output_dir)) {
        fs.mkdirSync(config.reporting!.output_dir, { recursive: true });
      }
    }
  }

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
  getRuntimeFilters(): NonNullable<ExtendedConfig["_runtime_filters"]> {
    return this.config._runtime_filters || {};
  }

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
  reload(): void {
    this.config = this.loadConfig();
  }

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
  saveDebugConfig(outputPath: string): void {
    const debugConfig = {
      ...this.config,
      _loaded_from: this.configFilePath,
      _loaded_at: new Date().toISOString(),
      _environment_variables: this.getEnvironmentVariables(),
    };

    const yaml = require("js-yaml");
    fs.writeFileSync(outputPath, yaml.dump(debugConfig, { indent: 2 }), "utf8");
  }

  /**
   * Parses a boolean value from string or boolean input.
   *
   * @param envValue - Environment variable value (string or undefined)
   * @param configValue - Configuration file value (boolean)
   * @returns Parsed boolean value
   *
   * @remarks
   * Environment variables take precedence over config file values.
   * Supports common boolean string representations: "true", "1", "yes", "on"
   *
   * @internal
   */
  private parseBoolean(
    envValue: string | undefined,
    configValue: boolean
  ): boolean {
    if (envValue !== undefined) {
      const normalized = envValue.toLowerCase().trim();
      return (
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on"
      );
    }
    return configValue;
  }
}
