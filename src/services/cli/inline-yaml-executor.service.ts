/**
 * @fileoverview Inline YAML Executor Service
 *
 * @remarks
 * Handles execution of YAML test suites provided inline via CLI.
 *
 * @packageDocumentation
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { FlowTestEngine } from "../../core/engine";
import { EngineExecutionOptions, ReportFormat } from "../../types/config.types";
import { LoggerService, ConsoleLoggerAdapter } from "../logger.service";
import { ProjectPathResolver } from "./project-path-resolver.service";
import { DependencyDiscoveryService } from "./dependency-discovery.service";

/**
 * Parameters for inline YAML execution
 */
export interface InlineExecutionParams {
  yamlContent: string;
  baseDir?: string;
  relativePath?: string;
  options: EngineExecutionOptions;
  configFile?: string;
  runnerInteractiveMode: boolean;
}

/**
 * Service responsible for executing inline YAML test suites
 */
export class InlineYamlExecutor {
  constructor(
    private readonly pathResolver: ProjectPathResolver,
    private readonly dependencyDiscovery: DependencyDiscoveryService,
    private readonly logger: LoggerService
  ) {}

  /**
   * Execute a test suite from inline YAML content
   *
   * @param params - Execution parameters
   * @returns Exit code (0 for success, 1 for failure)
   */
  async execute(params: InlineExecutionParams): Promise<number> {
    const {
      yamlContent,
      baseDir,
      relativePath,
      options,
      configFile,
      runnerInteractiveMode,
    } = params;

    // Parse YAML
    let parsedSuite: unknown;
    try {
      parsedSuite = yaml.load(yamlContent);
    } catch (error) {
      console.error(
        `❌ Failed to parse inline YAML: ${(error as Error).message}`
      );
      return 1;
    }

    if (!parsedSuite || typeof parsedSuite !== "object") {
      console.error("❌ Inline YAML must define a valid test suite object.");
      return 1;
    }

    const suiteObj = parsedSuite as Record<string, unknown>;

    // Validate node_id
    const inlineNodeId =
      typeof suiteObj.node_id === "string"
        ? suiteObj.node_id.trim()
        : undefined;

    if (!inlineNodeId) {
      console.error("❌ Inline YAML must include a 'node_id' property.");
      return 1;
    }

    // Resolve base directory
    const baseDirectory = this.resolveBaseDirectory(
      baseDir,
      options,
      configFile
    );

    if (!baseDirectory) {
      console.error(
        "❌ Unable to determine base directory for inline execution."
      );
      return 1;
    }

    if (
      !fs.existsSync(baseDirectory) ||
      !fs.statSync(baseDirectory).isDirectory()
    ) {
      console.error(`❌ Inline base directory not found: ${baseDirectory}`);
      return 1;
    }

    // Create temporary file
    const targetFilePath = this.createTemporaryFile(
      baseDirectory,
      inlineNodeId,
      relativePath,
      yamlContent
    );

    if (!targetFilePath) {
      return 1;
    }

    let exitCode = 1;

    try {
      // Prepare execution options
      const engineOptions = await this.prepareEngineOptions(
        suiteObj,
        inlineNodeId,
        baseDirectory,
        targetFilePath,
        options,
        configFile,
        runnerInteractiveMode
      );

      // Configure silent logger for inline execution
      this.logger.setLoggerAdapter(new ConsoleLoggerAdapter("silent"));

      // Execute
      const engine = new FlowTestEngine(engineOptions, {});
      const result = await engine.run();

      exitCode = result.success_rate === 100 ? 0 : 1;
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "Unknown");
      console.error(`❌ Failed to execute inline YAML: ${message}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    } finally {
      // Cleanup temporary file
      try {
        fs.unlinkSync(targetFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    return exitCode;
  }

  /**
   * Resolve base directory for inline execution
   */
  private resolveBaseDirectory(
    baseDir?: string,
    options?: EngineExecutionOptions,
    configFile?: string
  ): string | undefined {
    if (baseDir) {
      return path.resolve(baseDir);
    }

    if (options?.test_directory) {
      return path.resolve(options.test_directory);
    }

    let configContextDir: string | undefined;

    if (configFile) {
      const configPath = path.isAbsolute(configFile)
        ? configFile
        : path.resolve(configFile);
      if (fs.existsSync(configPath)) {
        configContextDir = path.dirname(configPath);
      }
    }

    if (!configContextDir) {
      configContextDir = this.pathResolver.resolveProjectRoot(process.cwd());
    }

    const configuredRoots =
      this.pathResolver.loadConfiguredTestRoots(configContextDir);
    if (configuredRoots.length > 0) {
      return configuredRoots.find(
        (dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory()
      );
    }

    return configContextDir;
  }

  /**
   * Create temporary YAML file
   */
  private createTemporaryFile(
    baseDirectory: string,
    nodeId: string,
    relativePath: string | undefined,
    yamlContent: string
  ): string | null {
    const sanitizedBaseName =
      nodeId.replace(/[^A-Za-z0-9_-]+/g, "-") || "inline-suite";
    const uniqueSuffix = Date.now().toString(36);
    const defaultRelativePath = path.join(
      ".flow-inline",
      `${sanitizedBaseName}-${uniqueSuffix}.yaml`
    );
    const normalizedRelativePath = (relativePath || defaultRelativePath)
      .replace(/\\/g, "/")
      .replace(/^\//, "");
    const targetFilePath = path.join(baseDirectory, normalizedRelativePath);
    const targetDir = path.dirname(targetFilePath);

    try {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(targetFilePath, yamlContent, "utf8");
      return targetFilePath;
    } catch (error) {
      console.error(
        `❌ Failed to prepare inline suite file: ${(error as Error).message}`
      );
      return null;
    }
  }

  /**
   * Prepare engine execution options with dependency discovery
   */
  private async prepareEngineOptions(
    suiteObj: Record<string, unknown>,
    inlineNodeId: string,
    baseDirectory: string,
    targetFilePath: string,
    options: EngineExecutionOptions,
    configFile: string | undefined,
    runnerInteractiveMode: boolean
  ): Promise<EngineExecutionOptions> {
    const projectRoot = this.pathResolver.resolveProjectRoot(baseDirectory);
    const configuredRoots =
      this.pathResolver.loadConfiguredTestRoots(projectRoot);
    const searchRootSet = new Set<string>(
      this.pathResolver.determineDependencySearchRoots(
        baseDirectory,
        projectRoot,
        configuredRoots
      )
    );
    searchRootSet.add(path.resolve(baseDirectory));
    searchRootSet.add(path.resolve(path.dirname(targetFilePath)));

    const dependencyContext = {
      projectRoot,
      searchRoots: Array.from(searchRootSet),
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };

    const dependencyDiscovery =
      await this.dependencyDiscovery.autoDiscoverDependencies(
        suiteObj,
        baseDirectory,
        dependencyContext
      );

    const normalizePattern = (filePath: string) =>
      path
        .relative(projectRoot, path.resolve(filePath))
        .split(path.sep)
        .join("/");

    const existingPatterns =
      options.filters && Array.isArray(options.filters.file_patterns)
        ? [...options.filters.file_patterns]
        : [];
    const patternSet = new Set<string>(existingPatterns);
    patternSet.add(normalizePattern(targetFilePath));
    dependencyDiscovery.filePaths.forEach((filePath: string) => {
      patternSet.add(normalizePattern(filePath));
    });

    const nodeIdsToExecute = new Set<string>(dependencyDiscovery.nodeIds);
    nodeIdsToExecute.add(inlineNodeId);

    const baseFilters = { ...(options.filters || {}) };
    const existingNodeIds = Array.isArray(baseFilters.node_ids)
      ? [...baseFilters.node_ids]
      : [];
    const mergedNodeIds = Array.from(
      new Set([...existingNodeIds, ...Array.from(nodeIdsToExecute)])
    );

    const inlineFilters = {
      ...baseFilters,
      node_ids: mergedNodeIds,
      file_patterns: Array.from(patternSet),
    };
    delete inlineFilters.suite_names;

    const engineOptions: EngineExecutionOptions = {
      ...options,
      filters: inlineFilters,
      reporting: options.reporting ? { ...options.reporting } : undefined,
      runner_interactive_mode: runnerInteractiveMode,
      config_file: configFile,
      verbosity: "silent",
      test_directory: options.test_directory
        ? path.resolve(options.test_directory)
        : projectRoot,
    };

    // Configure reporting
    if (engineOptions.reporting?.enabled === false) {
      engineOptions.reporting = {
        ...(engineOptions.reporting || {}),
        enabled: false,
        formats: [],
      };
    } else {
      const existingFormats =
        engineOptions.reporting &&
        Array.isArray(engineOptions.reporting.formats)
          ? [...(engineOptions.reporting.formats as ReportFormat[])]
          : [];
      const reportingFormats = new Set<ReportFormat>(existingFormats);
      reportingFormats.add("json");
      engineOptions.reporting = {
        ...(engineOptions.reporting || {}),
        enabled: true,
        formats: Array.from(reportingFormats),
      };
    }

    return engineOptions;
  }
}
