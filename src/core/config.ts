import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { EngineConfig, EngineExecutionOptions } from "../types/engine.types";

/**
 * Gerenciador de configuração do Flow Test Engine
 *
 * Responsável por carregar, validar e gerenciar todas as configurações
 * do engine, incluindo variáveis globais, configurações de ambiente
 * e opções de execução. Suporta sobrescrita via parâmetros de runtime.
 *
 * @example
 * ```typescript
 * const configManager = new ConfigManager({
 *   config_file: './flow-test.config.yml',
 *   environment: 'staging',
 *   verbosity: 'verbose'
 * });
 *
 * const config = configManager.getConfig();
 * const globalVars = configManager.getGlobalVariables();
 * ```
 */
export class ConfigManager {
  /** Configuração completa carregada e processada */
  private config: EngineConfig;

  /** Caminho absoluto do arquivo de configuração utilizado */
  private configFilePath: string;

  /**
   * Construtor do ConfigManager
   *
   * Carrega configuração de arquivo e aplica sobrescritas das opções de execução.
   *
   * @param options - Opções de execução que podem sobrescrever configurações do arquivo
   *
   * @example
   * ```typescript
   * // Com arquivo específico
   * const manager = new ConfigManager({ config_file: './custom.yml' });
   *
   * // Com sobrescritas
   * const manager = new ConfigManager({
   *   test_directory: './tests',
   *   environment: 'production'
   * });
   * ```
   */
  constructor(options: EngineExecutionOptions = {}) {
    this.configFilePath = this.resolveConfigFile(options.config_file);
    this.config = this.loadConfig();
    this.applyOptionsOverrides(options);
  }

  /**
   * Obtém a configuração completa processada
   *
   * Retorna a configuração final após aplicar todas as sobrescritas
   * e resoluções de variáveis de ambiente.
   *
   * @returns Configuração completa do engine
   */
  getConfig(): EngineConfig {
    return this.config;
  }

  /**
   * Obtém variáveis globais combinadas de configuração e ambiente
   *
   * Combina variáveis definidas no arquivo de configuração com
   * variáveis específicas do ambiente ativo, dando precedência
   * às variáveis de ambiente.
   *
   * @returns Objeto com todas as variáveis globais disponíveis
   *
   * @example
   * ```typescript
   * // Se config tem: { api_url: 'http://localhost' }
   * // E ambiente 'prod' tem: { api_url: 'https://api.prod.com' }
   * // O resultado será: { api_url: 'https://api.prod.com' }
   * ```
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
  private validateAndNormalizeConfig(config: any): EngineConfig {
    if (!config || typeof config !== "object") {
      throw new Error("Configuration must be a valid object");
    }

    if (!config.project_name) {
      throw new Error("project_name is required in configuration");
    }

    const normalized: EngineConfig = {
      project_name: config.project_name,
      test_directory: config.test_directory || "./tests",
      globals: {
        variables: config.globals?.variables || {},
        timeouts: {
          default: config.globals?.timeouts?.default || 30000,
          slow_tests: config.globals?.timeouts?.slow_tests || 60000,
        },
        base_url: config.globals?.base_url,
      },
      discovery: {
        patterns: config.discovery?.patterns || [
          "**/*.test.yml",
          "**/*.test.yaml",
        ],
        exclude: config.discovery?.exclude || [
          "**/node_modules/**",
          "**/drafts/**",
        ],
        recursive: config.discovery?.recursive !== false,
      },
      priorities: {
        levels: config.priorities?.levels || [
          "critical",
          "high",
          "medium",
          "low",
        ],
        required: config.priorities?.required || ["critical"],
        fail_fast_on_required:
          config.priorities?.fail_fast_on_required !== false,
      },
      execution: {
        mode: config.execution?.mode || "sequential",
        max_parallel: config.execution?.max_parallel || 5,
        timeout: config.execution?.timeout || 30000,
        continue_on_failure: config.execution?.continue_on_failure || false,
        retry_failed: {
          enabled: config.execution?.retry_failed?.enabled || false,
          max_attempts: config.execution?.retry_failed?.max_attempts || 3,
          delay_ms: config.execution?.retry_failed?.delay_ms || 1000,
        },
      },
      reporting: {
        formats: config.reporting?.formats || ["json", "console"],
        output_dir: config.reporting?.output_dir || "./results",
        aggregate: config.reporting?.aggregate !== false,
        include_performance_metrics:
          config.reporting?.include_performance_metrics !== false,
        include_variables_state:
          config.reporting?.include_variables_state !== false,
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

    if (options.verbosity && this.config.reporting) {
      // Ajusta formatos baseado na verbosidade
      if (options.verbosity === "silent") {
        this.config.reporting.formats = this.config.reporting.formats.filter(
          (f) => f !== "console"
        );
      }
    }

    if (options.filters) {
      // Armazena filtros para uso posterior
      (this.config as any)._runtime_filters = options.filters;
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

    // Valida reporting formats
    const validFormats = ["json", "junit", "html", "console"];
    const invalidFormats = config.reporting!.formats.filter(
      (format) => !validFormats.includes(format)
    );
    if (invalidFormats.length > 0) {
      throw new Error(
        `Invalid reporting formats: ${invalidFormats.join(", ")}`
      );
    }

    // Cria output directory se não existir
    if (!fs.existsSync(config.reporting!.output_dir)) {
      fs.mkdirSync(config.reporting!.output_dir, { recursive: true });
    }
  }

  /**
   * Obtém filtros de runtime aplicados
   */
  getRuntimeFilters(): any {
    return (this.config as any)._runtime_filters || {};
  }

  /**
   * Recarrega a configuração do arquivo
   */
  reload(): void {
    this.config = this.loadConfig();
  }

  /**
   * Salva a configuração atual (útil para debugging)
   */
  saveDebugConfig(outputPath: string): void {
    const debugConfig = {
      ...this.config,
      _loaded_from: this.configFilePath,
      _loaded_at: new Date().toISOString(),
      _environment_variables: this.getEnvironmentVariables(),
    };

    fs.writeFileSync(outputPath, yaml.dump(debugConfig, { indent: 2 }), "utf8");
  }
}
