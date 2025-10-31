/**
 * @fileoverview CLI Orchestrator
 *
 * @remarks
 * Main orchestrator that coordinates all CLI services and execution flows.
 *
 * @packageDocumentation
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { FlowTestEngine } from "../../core/engine";
import { EngineExecutionOptions } from "../../types/config.types";
import { LoggerService, ConsoleLoggerAdapter } from "../logger.service";
import {
  LogStreamingService,
  LogSessionHandle,
} from "../log-streaming.service";
import {
  CLIArgumentParser,
  ParsedCLIArguments,
} from "./cli-argument-parser.service";
import { ProjectPathResolver } from "./project-path-resolver.service";
import { DependencyDiscoveryService } from "./dependency-discovery.service";
import { InlineYamlExecutor } from "./inline-yaml-executor.service";
import { HookManager } from "./hook-manager.service";

/**
 * Main CLI orchestrator service
 */
export class CLIOrchestrator {
  private readonly argumentParser: CLIArgumentParser;
  private readonly pathResolver: ProjectPathResolver;
  private readonly dependencyDiscovery: DependencyDiscoveryService;
  private readonly inlineExecutor: InlineYamlExecutor;
  private readonly hookManager: HookManager;
  private readonly logger: LoggerService;
  private readonly logStream: LogStreamingService;

  constructor() {
    this.logger = new LoggerService();
    this.logStream = LogStreamingService.getInstance();
    this.argumentParser = new CLIArgumentParser();
    this.pathResolver = new ProjectPathResolver(this.logger);
    this.dependencyDiscovery = new DependencyDiscoveryService(
      this.pathResolver,
      this.logger
    );
    this.inlineExecutor = new InlineYamlExecutor(
      this.pathResolver,
      this.dependencyDiscovery,
      this.logger
    );
    this.hookManager = new HookManager();
  }

  /**
   * Execute CLI with provided arguments
   *
   * @param args - Command-line arguments
   * @returns Exit code
   */
  async execute(args: string[]): Promise<number> {
    // Parse arguments
    const parsed = this.argumentParser.parse(args);

    // Validate arguments
    const validationErrors = this.argumentParser.validate(parsed);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => this.logger.error(`❌ ${error}`));
      return 1;
    }

    // Handle help
    if (parsed.showHelp) {
      return 0; // Help is printed by caller
    }

    // Handle version
    if (parsed.showVersion) {
      return 0; // Version is printed by caller
    }

    // Handle inline YAML
    if (parsed.inlineYamlArg !== undefined) {
      return await this.handleInlineYaml(parsed);
    }

    // Configure logger verbosity
    this.configureLogger(parsed.options.verbosity || "simple");

    // Prepare engine options
    const engineOptions = await this.prepareEngineOptions(parsed);

    // Setup hooks
    const { hooks, logSession } = this.setupHooks(
      parsed.dryRun,
      parsed.liveEventsPath,
      engineOptions
    );

    try {
      const engine = new FlowTestEngine(engineOptions, hooks);

      if (parsed.dryRun) {
        return await this.executeDryRun(engine, logSession);
      } else {
        return await this.executeTests(engine, logSession);
      }
    } catch (error) {
      this.logger.error("❌ Fatal error:", { error: error as Error });
      logSession?.end("failed", {
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
      });
      return 1;
    }
  }

  /**
   * Handle inline YAML execution
   */
  private async handleInlineYaml(parsed: ParsedCLIArguments): Promise<number> {
    let inlineYamlContent: string;

    if (parsed.inlineYamlArg === "-" || parsed.inlineYamlArg === "--") {
      inlineYamlContent = await this.readFromStdin();
    } else {
      inlineYamlContent = parsed.inlineYamlArg!;
    }

    if (!inlineYamlContent || !inlineYamlContent.trim()) {
      this.logger.error("❌ Provided inline YAML content is empty.");
      return 1;
    }

    return await this.inlineExecutor.execute({
      yamlContent: inlineYamlContent,
      baseDir: parsed.inlineBaseDir,
      relativePath: parsed.inlineRelativePath,
      options: parsed.options,
      configFile: parsed.configFile,
      runnerInteractiveMode: parsed.runnerInteractiveMode,
    });
  }

  /**
   * Prepare engine execution options
   */
  private async prepareEngineOptions(
    parsed: ParsedCLIArguments
  ): Promise<EngineExecutionOptions> {
    if (parsed.configFile) {
      // Configuration file mode
      return {
        ...parsed.options,
        config_file: parsed.configFile,
        runner_interactive_mode: parsed.runnerInteractiveMode,
      };
    } else if (parsed.testFile) {
      // Specific test file mode
      return await this.prepareTestFileOptions(parsed);
    } else {
      // Default mode
      return {
        ...parsed.options,
        runner_interactive_mode: parsed.runnerInteractiveMode,
      };
    }
  }

  /**
   * Prepare options for test file execution
   */
  private async prepareTestFileOptions(
    parsed: ParsedCLIArguments
  ): Promise<EngineExecutionOptions> {
    const resolvedPath = path.resolve(parsed.testFile!);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Test file not found: ${parsed.testFile}`);
    }

    const fileContent = fs.readFileSync(resolvedPath, "utf8");
    const testData = yaml.load(fileContent) as Record<string, unknown>;

    const tempDir = path.dirname(resolvedPath);
    const projectRoot = this.pathResolver.resolveProjectRoot(tempDir);
    const configuredRoots =
      this.pathResolver.loadConfiguredTestRoots(projectRoot);

    const dependencyContext = {
      projectRoot,
      searchRoots: this.pathResolver.determineDependencySearchRoots(
        tempDir,
        projectRoot,
        configuredRoots
      ),
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };

    const dependencyDiscovery =
      await this.dependencyDiscovery.autoDiscoverDependencies(
        testData,
        tempDir,
        dependencyContext
      );

    const normalizePattern = (filePath: string) =>
      path
        .relative(projectRoot, path.resolve(filePath))
        .split(path.sep)
        .join("/");

    const patternSet = new Set<string>();
    if (parsed.options.filters?.file_patterns) {
      parsed.options.filters.file_patterns.forEach((pattern: string) =>
        patternSet.add(pattern)
      );
    }

    patternSet.add(normalizePattern(resolvedPath));
    dependencyDiscovery.filePaths.forEach((filePath: string) => {
      patternSet.add(normalizePattern(filePath));
    });

    if (testData.node_id) {
      const nodeIdsToExecute = [
        ...dependencyDiscovery.nodeIds,
        testData.node_id as string,
      ];

      this.logger.info(
        `🔍 Auto-discovered ${dependencyDiscovery.nodeIds.length} dependencies`
      );
      if (dependencyDiscovery.nodeIds.length > 0) {
        this.logger.info(`📋 Execution order: ${nodeIdsToExecute.join(" → ")}`);
      }

      return {
        ...parsed.options,
        test_directory: projectRoot,
        filters: {
          ...parsed.options.filters,
          node_ids: nodeIdsToExecute,
          file_patterns: Array.from(patternSet),
        },
        runner_interactive_mode: parsed.runnerInteractiveMode,
        reporting: parsed.options.reporting
          ? { ...parsed.options.reporting }
          : undefined,
      };
    } else if (testData.suite_name) {
      const suiteNamesToExecute = [
        ...dependencyDiscovery.nodeIds,
        testData.suite_name as string,
      ];

      this.logger.info(
        `🔍 Auto-discovered ${dependencyDiscovery.nodeIds.length} dependencies`
      );
      if (dependencyDiscovery.nodeIds.length > 0) {
        this.logger.info(
          `📋 Execution order: ${suiteNamesToExecute.join(" → ")}`
        );
      }

      return {
        ...parsed.options,
        test_directory: projectRoot,
        filters: {
          ...parsed.options.filters,
          suite_names: suiteNamesToExecute,
          file_patterns: Array.from(patternSet),
        },
        runner_interactive_mode: parsed.runnerInteractiveMode,
        reporting: parsed.options.reporting
          ? { ...parsed.options.reporting }
          : undefined,
      };
    } else {
      throw new Error(`Invalid test file format: ${parsed.testFile}`);
    }
  }

  /**
   * Setup hooks for execution
   */
  private setupHooks(
    dryRun: boolean,
    liveEventsPath: string | undefined,
    options: EngineExecutionOptions
  ): { hooks: any; logSession: LogSessionHandle | undefined } {
    const baseHooks = this.hookManager.createConsoleHooks(this.logger);
    let hooks = baseHooks;
    let liveReporterRunId: string | null = null;
    let logSession: LogSessionHandle | undefined;

    if (!dryRun && liveEventsPath) {
      const [realtimeHooks, , runId] = this.hookManager.createRealtimeHooks(
        liveEventsPath,
        options
      );
      hooks = this.hookManager.mergeHooks(baseHooks, realtimeHooks);
      liveReporterRunId = runId;
    }

    logSession = this.logStream.beginSession({
      runId: liveReporterRunId ?? undefined,
      source: "cli",
      label: dryRun ? "CLI dry run" : "CLI execution",
      metadata: {
        options,
        dryRun,
      },
      status: "running",
    });

    return { hooks, logSession };
  }

  /**
   * Execute dry run
   */
  private async executeDryRun(
    engine: FlowTestEngine,
    logSession: LogSessionHandle | undefined
  ): Promise<number> {
    const plan = await engine.dryRun();

    this.logger.info(`\n📊 Execution plan would run ${plan.length} test(s):`);
    plan.forEach((test, index) => {
      this.logger.info(
        `  ${index + 1}. ${test.suite_name} (${test.priority || "medium"})`
      );
    });

    logSession?.update({
      metadata: {
        planSize: plan.length,
        suites: plan.map((test) => test.suite_name),
      },
    });
    logSession?.end("completed");

    return 0;
  }

  /**
   * Execute tests
   */
  private async executeTests(
    engine: FlowTestEngine,
    logSession: LogSessionHandle | undefined
  ): Promise<number> {
    const result = await engine.run();

    this.logger.info(`Execution summary`, {
      metadata: {
        type: "execution_summary",
        successful_tests: result.successful_tests,
        failed_tests: result.failed_tests,
        total_tests: result.total_tests,
        success_rate: result.success_rate,
      },
    });

    const exitCode = result.success_rate === 100 ? 0 : 1;

    this.logger.info(
      `\n🏁 Execution completed with ${result.success_rate.toFixed(
        1
      )}% success rate`
    );

    logSession?.update({
      metadata: {
        summary: {
          successRate: result.success_rate,
          failedTests: result.failed_tests,
          successfulTests: result.successful_tests,
          totalTests: result.total_tests,
        },
      },
    });
    logSession?.end(result.failed_tests > 0 ? "failed" : "success");

    return exitCode;
  }

  /**
   * Configure logger verbosity
   */
  private configureLogger(verbosity: string): void {
    if (verbosity === "simple") {
      this.logger.setLoggerAdapter(new ConsoleLoggerAdapter("simple"));
    } else {
      this.logger.setLoggerAdapter(new ConsoleLoggerAdapter(verbosity as any));
    }
  }

  /**
   * Read content from stdin
   */
  private async readFromStdin(): Promise<string> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      process.stdin.on("end", () =>
        resolve(Buffer.concat(chunks).toString("utf8"))
      );
      process.stdin.on("error", (error) => reject(error));
    });
  }
}
