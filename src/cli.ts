#!/usr/bin/env node

/**
 * @fileoverview Command Line Interface for the Flow Test Engine v1.0.
 *
 * @remarks
 * Provides a comprehensive CLI for executing API tests with support for
 * configuration files, filtering, verbosity levels, dry-run planning,
 * and Swagger import functionality.
 *
 * @example Basic usage
 * ```bash
 * # Execute tests with default configuration
 * flow-test
 *
 * # Use specific configuration file
 * flow-test -c ./config/production.yml
 *
 * # Filter by priority and enable verbose output
 * flow-test --priority critical,high --verbose
 *
 * # Dry run to plan execution without running tests
 * flow-test --dry-run --detailed
 *
 * # Import tests from Swagger specification
 * flow-test --swagger-import ./api-spec.json --swagger-output ./tests/
 * ```
 *
 * @packageDocumentation
 */

import path from "path";
import { FlowTestEngine } from "./core/engine";
import {
  EngineExecutionOptions,
  DiscoveredTest,
  ReportFormat,
} from "./types/config.types";
import { EngineHooks, ExecutionStats, TestSuite } from "./types/engine.types";
import {
  SwaggerImportService,
  ImportOptions,
} from "./services/swagger-import.service";
import { handleInitCommand } from "./commands/init";
import { handleGraphCommand } from "./commands/graph";
import { PostmanCollectionService } from "./services/postman-collection.service";
import {
  setupLogger,
  LoggerService,
  getLogger,
} from "./services/logger.service";
import { RealtimeReporter } from "./services/realtime-reporter";
import { createConsoleHooks } from "./services/hook-factory";
import {
  LogStreamingService,
  LogSessionHandle,
} from "./services/log-streaming.service";

const HOOK_KEYS: (keyof EngineHooks)[] = [
  "onTestDiscovered",
  "onSuiteStart",
  "onSuiteEnd",
  "onStepStart",
  "onStepEnd",
  "onExecutionStart",
  "onExecutionEnd",
  "onError",
];

function resolveProjectRoot(startDir: string): string {
  const fs = require("fs");
  const path = require("path");

  let current = path.resolve(startDir);

  while (true) {
    if (
      fs.existsSync(path.join(current, "flow-test.config.yml")) ||
      fs.existsSync(path.join(current, "flow-test.config.yaml")) ||
      fs.existsSync(path.join(current, "package.json")) ||
      fs.existsSync(path.join(current, ".git"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

function loadConfiguredTestRoots(projectRoot: string): string[] {
  const fs = require("fs");
  const path = require("path");
  const yaml = require("js-yaml");

  const candidates = [
    path.join(projectRoot, "flow-test.config.yml"),
    path.join(projectRoot, "flow-test.config.yaml"),
    path.join(projectRoot, "flow-test.config.json"),
  ];

  const roots = new Set<string>();

  const pushRoot = (candidatePath: unknown) => {
    if (typeof candidatePath !== "string") {
      return;
    }

    const trimmed = candidatePath.trim();
    if (!trimmed) {
      return;
    }

    const absolutePath = path.isAbsolute(trimmed)
      ? path.normalize(trimmed)
      : path.resolve(projectRoot, trimmed);

    try {
      if (
        fs.existsSync(absolutePath) &&
        fs.statSync(absolutePath).isDirectory()
      ) {
        roots.add(absolutePath);
      }
    } catch (error) {
      getLogger().debug(
        `⚠️  Skipping configured test root '${absolutePath}': ${error}`
      );
    }
  };

  for (const configPath of candidates) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(configPath, "utf8");
      const config = configPath.endsWith(".json")
        ? JSON.parse(raw)
        : yaml.load(raw);

      if (config) {
        const directoryLists = [
          (config as any).testDirectories,
          (config as any).test_directories,
          (config as any).tests?.directories,
        ];

        for (const list of directoryLists) {
          if (Array.isArray(list)) {
            list.forEach(pushRoot);
          }
        }

        pushRoot((config as any).test_directory);
        pushRoot((config as any).testDirectory);
      }
    } catch (error) {
      getLogger().debug(
        `⚠️  Could not load configured test roots from '${configPath}': ${error}`
      );
    }
  }

  return Array.from(roots);
}

function determineDependencySearchRoots(
  startDir: string,
  projectRoot: string,
  configuredRoots: string[]
): string[] {
  const fs = require("fs");
  const path = require("path");

  const normalizedProjectRoot = path.resolve(projectRoot);
  const roots = new Set<string>();

  const addIfDir = (candidate: string) => {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        roots.add(path.resolve(candidate));
      }
    } catch (error) {
      getLogger().debug(
        `⚠️  Skipping dependency search root '${candidate}': ${error}`
      );
    }
  };

  let current = path.resolve(startDir);
  addIfDir(current);

  while (true) {
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    addIfDir(parent);

    if (path.resolve(parent) === normalizedProjectRoot) {
      break;
    }

    current = parent;
  }

  configuredRoots.forEach(addIfDir);

  const result = Array.from(roots);

  if (
    result.length > 1 &&
    result.some((root) => path.resolve(root) === normalizedProjectRoot)
  ) {
    return result.filter(
      (root) => path.resolve(root) !== normalizedProjectRoot
    );
  }

  return result;
}

function mergeHooks(...hooks: Array<EngineHooks | undefined>): EngineHooks {
  const merged: EngineHooks = {};

  for (const hookName of HOOK_KEYS) {
    const callbacks = hooks
      .filter(Boolean)
      .map((hook) => hook![hookName])
      .filter(
        (callback): callback is (...args: any[]) => any =>
          typeof callback === "function"
      );

    if (callbacks.length > 0) {
      (merged as any)[hookName] = async (...args: any[]) => {
        for (const callback of callbacks) {
          await callback(...args);
        }
      };
    }
  }

  return merged;
}

/**
 * Main CLI entry point function.
 *
 * @remarks
 * Processes command line arguments, configures the Flow Test Engine,
 * and executes tests or performs other operations like Swagger import
 * or dry-run planning based on the provided options.
 *
 * @example Programmatic CLI usage
 * ```typescript
 * // Simulate CLI call
 * process.argv = ['node', 'cli.js', '--config', './test-config.yml', '--verbose'];
 * await main();
 * ```
 *
 * @returns Promise that resolves when CLI execution completes
 *
 * @public
 */
async function main() {
  const args = process.argv.slice(2);
  let logSession: LogSessionHandle | undefined;

  // Handle init command first
  if (args[0] === "init") {
    await handleInitCommand(args.slice(1));
    return;
  }

  if (args[0] === "graph") {
    await handleGraphCommand(args.slice(1));
    return;
  }

  // Parsing dos argumentos
  const options: EngineExecutionOptions = {
    verbosity: "simple",
  };

  let configFile: string | undefined;
  let testFile: string | undefined;
  let showHelp = false;
  let dryRun = false;
  let swaggerImport: string | undefined;
  let swaggerOutput: string | undefined;
  let postmanExport: string | undefined;
  let postmanExportOutput: string | undefined;
  let postmanExportFromResults: string | undefined;
  let postmanImport: string | undefined;
  let postmanImportOutput: string | undefined;
  let postmanPreserveFolders = false;
  let postmanAnalyzeDeps = false;
  let dashboardCommand: string | undefined;
  let liveEventsPath: string | undefined;
  let runnerInteractiveMode = false;
  let inlineYamlArg: string | undefined;
  let inlineBaseDir: string | undefined;
  let inlineRelativePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-c":
      case "--config":
        if (i + 1 < args.length) {
          configFile = args[++i];
        }
        break;

      case "-d":
      case "--directory":
        if (i + 1 < args.length) {
          options.test_directory = args[++i];
        }
        break;

      case "-e":
      case "--environment":
        if (i + 1 < args.length) {
          options.environment = args[++i];
        }
        break;

      case "--verbose":
        options.verbosity = "verbose";
        break;

      case "--detailed":
        options.verbosity = "detailed";
        break;

      case "--simple":
        options.verbosity = "simple";
        break;

      case "--silent":
        options.verbosity = "silent";
        break;

      case "--priority":
        if (i + 1 < args.length) {
          const priorities = args[++i].split(",");
          options.filters = { ...options.filters, priority: priorities };
        }
        break;

      case "--suite":
        if (i + 1 < args.length) {
          const suites = args[++i].split(",");
          options.filters = { ...options.filters, suite_names: suites };
        }
        break;

      case "--node":
        if (i + 1 < args.length) {
          const nodeIds = args[++i].split(",");
          options.filters = { ...options.filters, node_ids: nodeIds };
        }
        break;

      case "--step":
      case "--step-id":
        if (i + 1 < args.length) {
          const stepIds = args[++i].split(",");
          options.filters = { ...options.filters, step_ids: stepIds };
        }
        break;

      case "--tag":
      case "--tags":
        if (i + 1 < args.length) {
          const tags = args[++i].split(",");
          options.filters = { ...options.filters, tags };
        }
        break;

      case "--no-log":
        options.logging = { enabled: false };
        break;

      case "--dry-run":
        dryRun = true;
        break;

      case "--swagger-import":
        if (i + 1 < args.length) {
          swaggerImport = args[++i];
        }
        break;

      case "--swagger-output":
        if (i + 1 < args.length) {
          swaggerOutput = args[++i];
        }
        break;

      case "--postman-export":
        if (i + 1 < args.length) {
          postmanExport = args[++i];
        }
        break;

      case "--postman-export-from-results":
        if (i + 1 < args.length) {
          postmanExportFromResults = args[++i];
        }
        break;

      case "--postman-export-output":
      case "--postman-output":
        if (i + 1 < args.length) {
          postmanExportOutput = args[++i];
        }
        break;

      case "--live-events":
        if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          liveEventsPath = args[++i];
        } else {
          liveEventsPath = path.join("results", "live-events.jsonl");
        }
        break;

      case "--runner-interactive-inputs":
        runnerInteractiveMode = true;
        break;

      case "--inline-yaml":
        if (i + 1 < args.length) {
          inlineYamlArg = args[++i];
        } else {
          getLogger().error("❌ Missing value for --inline-yaml");
          showHelp = true;
        }
        break;

      case "--inline-base":
        if (i + 1 < args.length) {
          inlineBaseDir = args[++i];
        } else {
          getLogger().error("❌ Missing value for --inline-base");
          showHelp = true;
        }
        break;

      case "--inline-path":
        if (i + 1 < args.length) {
          inlineRelativePath = args[++i];
        } else {
          getLogger().error("❌ Missing value for --inline-path");
          showHelp = true;
        }
        break;

      case "--html-output": {
        const nextArg = args[i + 1];
        const hasValue = nextArg && !nextArg.startsWith("-");
        if (hasValue) {
          i += 1;
        }

        if (hasValue) {
          const reportingOptions = (options.reporting =
            options.reporting ?? {});
          reportingOptions.html = {
            ...reportingOptions.html,
            output_subdir: nextArg,
          };
        }

        const reportingOptions = (options.reporting = options.reporting ?? {});
        const formats = new Set<ReportFormat>(reportingOptions.formats ?? []);
        formats.add("json");
        formats.add("html");
        reportingOptions.formats = Array.from(formats);

        getLogger().info(
          "🧾 HTML reporting enabled. A Postman-inspired report will be written alongside the JSON artifacts."
        );

        break;
      }

      case "--postman-import":
        if (i + 1 < args.length) {
          postmanImport = args[++i];
        }
        break;

      case "--postman-import-output":
        if (i + 1 < args.length) {
          postmanImportOutput = args[++i];
        }
        break;

      case "--postman-preserve-folders":
        postmanPreserveFolders = true;
        break;

      case "--postman-analyze-deps":
        postmanAnalyzeDeps = true;
        break;

      case "dashboard":
        if (i + 1 < args.length) {
          dashboardCommand = args[++i];
        } else {
          getLogger().error(
            "❌ Dashboard command requires a subcommand: install, dev, build, preview, serve"
          );
          process.exit(1);
        }
        break;

      case "-h":
      case "--help":
        showHelp = true;
        break;

      case "-v":
      case "--version":
        try {
          const fs = require("fs");
          const path = require("path");
          const packagePath = path.join(__dirname, "..", "package.json");
          const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
          getLogger().info(`Flow Test Engine v${packageJson.version}`);
        } catch (error) {
          getLogger().info("Flow Test Engine v1.1.12");
        }
        process.exit(0);
        break;

      default:
        // Se não é uma flag e não foi processado ainda, trata como arquivo de teste
        if (!arg.startsWith("-") && !testFile) {
          testFile = arg;
        } else {
          getLogger().error(`❌ Unknown argument: ${arg}`);
          showHelp = true;
        }
        break;
    }
  }

  if (postmanExport && postmanImport) {
    getLogger().error(
      "❌ Cannot use --postman-export and --postman-import in the same command."
    );
    process.exit(1);
  }

  if (postmanExportFromResults && (postmanExport || postmanImport)) {
    getLogger().error(
      "❌ Cannot use --postman-export-from-results with other postman export/import commands."
    );
    process.exit(1);
  }

  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  let inlineYamlContent: string | undefined;
  if (inlineYamlArg !== undefined) {
    if (inlineYamlArg === "-" || inlineYamlArg === "--") {
      inlineYamlContent = await readFromStdin();
    } else {
      inlineYamlContent = inlineYamlArg;
    }

    if (!inlineYamlContent || !inlineYamlContent.trim()) {
      getLogger().error("❌ Provided inline YAML content is empty.");
      process.exit(1);
    }
  }

  // Handle dashboard commands if requested
  if (dashboardCommand) {
    await handleDashboardCommand(dashboardCommand);
    process.exit(0);
  }

  // Handle Postman export from results if requested
  if (postmanExportFromResults) {
    await handlePostmanExportFromResults(
      postmanExportFromResults,
      postmanExportOutput
    );
    process.exit(0);
  }

  // Handle Postman export if requested
  if (postmanExport) {
    await handlePostmanExport(postmanExport, postmanExportOutput);
    process.exit(0);
  }

  if (postmanImport) {
    await handlePostmanImport(
      postmanImport,
      postmanImportOutput,
      postmanPreserveFolders,
      postmanAnalyzeDeps
    );
    process.exit(0);
  }

  if (swaggerImport) {
    await handleSwaggerImport(swaggerImport, swaggerOutput);
    process.exit(0);
  }

  if (inlineYamlContent !== undefined) {
    if (dryRun) {
      getLogger().error(
        "❌ Inline YAML execution does not support --dry-run mode."
      );
      process.exit(1);
    }

    if (postmanExport || postmanImport || postmanExportFromResults) {
      getLogger().error(
        "❌ Inline YAML execution cannot be combined with Postman import/export commands."
      );
      process.exit(1);
    }

    const exitCode = await handleInlineYamlExecution({
      yamlContent: inlineYamlContent,
      baseDir: inlineBaseDir,
      relativePath: inlineRelativePath,
      options,
      configFile,
      runnerInteractiveMode,
    });
    process.exit(exitCode);
  }

  try {
    // Configura opções baseado no tipo de arquivo especificado
    let engineOptions: EngineExecutionOptions;

    if (configFile) {
      // Modo configuração: -c config.yaml
      engineOptions = {
        ...options,
        config_file: configFile,
        runner_interactive_mode: runnerInteractiveMode,
      };
    } else if (testFile) {
      // Modo teste específico: flow-test nome-teste.yaml
      const path = require("path");
      const fs = require("fs");
      const resolvedPath = path.resolve(testFile);

      // Verifica se o arquivo existe
      if (!fs.existsSync(resolvedPath)) {
        getLogger().error(`❌ Test file not found: ${testFile}`);
        process.exit(1);
      }

      // Cria um diretório temporário com apenas o arquivo específico
      const tempDir = path.dirname(resolvedPath);
      const projectRoot = resolveProjectRoot(tempDir);

      // Para teste específico, vamos ler o arquivo e extrair o node_id
      try {
        const fileContent = fs.readFileSync(resolvedPath, "utf8");
        const yaml = require("js-yaml");
        const testData = yaml.load(fileContent);

        const configuredRoots = loadConfiguredTestRoots(projectRoot);
        const dependencyContext: DependencyDiscoveryContext = {
          projectRoot,
          searchRoots: determineDependencySearchRoots(
            tempDir,
            projectRoot,
            configuredRoots
          ),
          nodeIdToFileMap: new Map<string, string>(),
          processedFiles: new Set<string>(),
          visitedDependencyFiles: new Set<string>(),
          fallbackSearchPerformed: false,
        };

        if (testData && testData.node_id) {
          // Auto-discover dependencies for single file execution
          const dependencyDiscovery = await autoDiscoverDependencies(
            testData,
            tempDir,
            dependencyContext
          );
          const nodeIdsToExecute = [
            ...dependencyDiscovery.nodeIds,
            testData.node_id,
          ];

          const patternSet = new Set<string>();
          const normalizePattern = (filePath: string) =>
            path
              .relative(projectRoot, path.resolve(filePath))
              .split(path.sep)
              .join("/");

          if (options.filters?.file_patterns) {
            options.filters.file_patterns.forEach((pattern: string) =>
              patternSet.add(pattern)
            );
          }

          patternSet.add(normalizePattern(resolvedPath));
          dependencyDiscovery.filePaths.forEach((filePath: string) => {
            patternSet.add(normalizePattern(filePath));
          });

          getLogger().info(
            `🔍 Auto-discovered ${dependencyDiscovery.nodeIds.length} dependencies`
          );
          if (dependencyDiscovery.nodeIds.length > 0) {
            getLogger().info(
              `📋 Execution order: ${nodeIdsToExecute.join(" → ")}`
            );
          }

          engineOptions = {
            ...options,
            test_directory: projectRoot,
            filters: {
              ...options.filters,
              node_ids: nodeIdsToExecute,
              file_patterns: Array.from(patternSet),
            },
            runner_interactive_mode: runnerInteractiveMode,
          };
        } else if (testData && testData.suite_name) {
          // Auto-discover dependencies for single file execution
          const dependencyDiscovery = await autoDiscoverDependencies(
            testData,
            tempDir,
            dependencyContext
          );
          const suiteNamesToExecute = [
            ...dependencyDiscovery.nodeIds,
            testData.suite_name,
          ];

          const patternSet = new Set<string>();
          const normalizePattern = (filePath: string) =>
            path
              .relative(projectRoot, path.resolve(filePath))
              .split(path.sep)
              .join("/");

          if (options.filters?.file_patterns) {
            options.filters.file_patterns.forEach((pattern: string) =>
              patternSet.add(pattern)
            );
          }

          patternSet.add(normalizePattern(resolvedPath));
          dependencyDiscovery.filePaths.forEach((filePath: string) => {
            patternSet.add(normalizePattern(filePath));
          });

          getLogger().info(
            `🔍 Auto-discovered ${dependencyDiscovery.nodeIds.length} dependencies`
          );
          if (dependencyDiscovery.nodeIds.length > 0) {
            getLogger().info(
              `📋 Execution order: ${suiteNamesToExecute.join(" → ")}`
            );
          }

          engineOptions = {
            ...options,
            test_directory: projectRoot,
            filters: {
              ...options.filters,
              suite_names: suiteNamesToExecute,
              file_patterns: Array.from(patternSet),
            },
            runner_interactive_mode: runnerInteractiveMode,
          };
        } else {
          getLogger().error(`❌ Invalid test file format: ${testFile}`);
          process.exit(1);
        }
      } catch (error) {
        getLogger().error(`❌ Error reading test file: ${error}`);
        process.exit(1);
      }
    } else {
      // Modo padrão
      engineOptions = {
        ...options,
        runner_interactive_mode: runnerInteractiveMode,
      };
    }

    // Configura logger conforme a verbosidade escolhida
    setupLogger("console", { verbosity: options.verbosity || "simple" });
    const logger = LoggerService.getInstance();
    const logStream = LogStreamingService.getInstance();
    const baseHooks = createConsoleHooks(logger);

    let liveReporter: RealtimeReporter | undefined;
    let liveReporterRunId: string | null = null;
    let engineHooks: EngineHooks = baseHooks;

    if (!dryRun && liveEventsPath) {
      const resolvedPath = path.isAbsolute(liveEventsPath)
        ? liveEventsPath
        : path.join(process.cwd(), liveEventsPath);

      liveReporter = new RealtimeReporter(resolvedPath);
      liveReporterRunId = liveReporter.beginRun({
        source: "cli",
        label: "CLI execution",
        options: engineOptions,
      });

      const reporterHooks = liveReporter.createHooks(liveReporterRunId);
      engineHooks = mergeHooks(baseHooks, reporterHooks);
    }

    const engine = new FlowTestEngine(engineOptions, engineHooks);

    const currentLogSession = logStream.beginSession({
      runId: liveReporterRunId ?? undefined,
      source: "cli",
      label: dryRun ? "CLI dry run" : "CLI execution",
      metadata: {
        options: engineOptions,
        dryRun,
      },
      status: "running",
    });
    logSession = currentLogSession;

    if (dryRun) {
      // Execução em modo dry-run
      const plan = await engine.dryRun();

      getLogger().info(`\n📊 Execution plan would run ${plan.length} test(s):`);
      plan.forEach((test: DiscoveredTest, index: number) => {
        getLogger().info(
          `  ${index + 1}. ${test.suite_name} (${test.priority || "medium"})`
        );
      });

      currentLogSession.update({
        metadata: {
          planSize: plan.length,
          suites: plan.map((test) => test.suite_name),
        },
      });
      currentLogSession.end("completed");

      process.exit(0);
    } else {
      // Execução normal
      const result = await engine.run();

      // Log final summary for Jest-style logger
      logger.info(`Execution summary`, {
        metadata: {
          type: "execution_summary",
          successful_tests: result.successful_tests,
          failed_tests: result.failed_tests,
          total_tests: result.total_tests,
          success_rate: result.success_rate,
        },
      });

      // Exit code baseado no resultado
      const exitCode = result.success_rate === 100 ? 0 : 1;

      getLogger().info(
        `\n🏁 Execution completed with ${result.success_rate.toFixed(
          1
        )}% success rate`
      );

      currentLogSession.update({
        metadata: {
          summary: {
            successRate: result.success_rate,
            failedTests: result.failed_tests,
            successfulTests: result.successful_tests,
            totalTests: result.total_tests,
          },
        },
      });
      currentLogSession.end(result.failed_tests > 0 ? "failed" : "success");

      process.exit(exitCode);
    }
  } catch (error) {
    getLogger().error("❌ Fatal error:", {
      error: error as Error,
    });

    logSession?.end("failed", {
      error: {
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    });

    process.exit(1);
  }
}

/**
 * Auto-discovers dependencies for a test suite by analyzing its depends field
 * and searching for corresponding files in the test directory.
 *
 * @param testData - The parsed YAML test data
 * @param testDirectory - The directory to search for dependency files
 * @returns Array of node_ids that need to be executed before the main test
 */
interface InlineExecutionParams {
  yamlContent: string;
  baseDir?: string;
  relativePath?: string;
  options: EngineExecutionOptions;
  configFile?: string;
  runnerInteractiveMode: boolean;
}

interface DependencyDiscoveryResult {
  nodeIds: string[];
  filePaths: string[];
}

interface DependencyDiscoveryContext {
  projectRoot: string;
  searchRoots: string[];
  nodeIdToFileMap: Map<string, string>;
  processedFiles: Set<string>;
  visitedDependencyFiles: Set<string>;
  fallbackSearchPerformed: boolean;
}

async function handleInlineYamlExecution(
  params: InlineExecutionParams
): Promise<number> {
  const fs = require("fs");
  const path = require("path");
  const yaml = require("js-yaml");

  const {
    yamlContent,
    baseDir,
    relativePath,
    options,
    configFile,
    runnerInteractiveMode,
  } = params;

  let parsedSuite: any;
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

  const inlineNodeId =
    typeof parsedSuite.node_id === "string"
      ? parsedSuite.node_id.trim()
      : undefined;

  if (!inlineNodeId) {
    console.error("❌ Inline YAML must include a 'node_id' property.");
    return 1;
  }

  let baseDirectory: string | undefined;

  if (baseDir) {
    baseDirectory = path.resolve(baseDir);
  } else if (options.test_directory) {
    baseDirectory = path.resolve(options.test_directory);
  } else {
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
      configContextDir = resolveProjectRoot(process.cwd());
    }

    const configuredRoots = loadConfiguredTestRoots(configContextDir);
    if (configuredRoots.length > 0) {
      baseDirectory = configuredRoots.find(
        (dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory()
      );
    }

    baseDirectory = baseDirectory || configContextDir;
  }

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

  const sanitizedBaseName =
    inlineNodeId.replace(/[^A-Za-z0-9_-]+/g, "-") || "inline-suite";
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
  } catch (error) {
    console.error(
      `❌ Failed to prepare inline suite file: ${(error as Error).message}`
    );
    return 1;
  }

  let exitCode = 1;

  try {
    const projectRoot = resolveProjectRoot(baseDirectory);
    const configuredRoots = loadConfiguredTestRoots(projectRoot);
    const searchRootSet = new Set<string>(
      determineDependencySearchRoots(
        baseDirectory,
        projectRoot,
        configuredRoots
      )
    );
    searchRootSet.add(path.resolve(baseDirectory));
    searchRootSet.add(path.resolve(targetDir));

    const dependencyContext: DependencyDiscoveryContext = {
      projectRoot,
      searchRoots: Array.from(searchRootSet),
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };

    const dependencyDiscovery = await autoDiscoverDependencies(
      parsedSuite,
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

    const inlineOptions: EngineExecutionOptions = {
      ...options,
      filters: inlineFilters,
      reporting: options.reporting ? { ...options.reporting } : undefined,
      runner_interactive_mode: runnerInteractiveMode,
      config_file: configFile,
    };

    inlineOptions.verbosity = "silent";
    inlineOptions.test_directory = options.test_directory
      ? path.resolve(options.test_directory)
      : projectRoot;

    const existingFormats =
      inlineOptions.reporting && Array.isArray(inlineOptions.reporting.formats)
        ? [...(inlineOptions.reporting.formats as ReportFormat[])]
        : [];
    const reportingFormats = new Set<ReportFormat>(existingFormats);
    reportingFormats.add("json");
    inlineOptions.reporting = {
      ...(inlineOptions.reporting || {}),
      formats: Array.from(reportingFormats),
    };

    setupLogger("console", { verbosity: "silent" });

    const engine = new FlowTestEngine(inlineOptions, {});
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
    try {
      fs.unlinkSync(targetFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }

  return exitCode;
}

async function autoDiscoverDependencies(
  testData: any,
  testDirectory: string,
  context?: DependencyDiscoveryContext
): Promise<DependencyDiscoveryResult> {
  const fs = require("fs");
  const path = require("path");
  const yaml = require("js-yaml");
  const fg = require("fast-glob");

  const dependencyNodeIds: string[] = [];
  const dependencyFilePaths: string[] = [];

  // Check if the test has dependencies early to avoid unnecessary I/O
  if (!testData?.depends || !Array.isArray(testData.depends)) {
    return { nodeIds: dependencyNodeIds, filePaths: dependencyFilePaths };
  }

  const normalizedStartDir = path.resolve(testDirectory);
  let discoveryContext = context;

  if (!discoveryContext) {
    const projectRoot = resolveProjectRoot(normalizedStartDir);
    const configuredRoots = loadConfiguredTestRoots(projectRoot);
    const searchRoots = determineDependencySearchRoots(
      normalizedStartDir,
      projectRoot,
      configuredRoots
    );

    discoveryContext = {
      projectRoot,
      searchRoots,
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };
  }

  const buildDependencyIndex = async (roots: string[]) => {
    for (const root of roots) {
      if (!root) {
        continue;
      }

      try {
        const files = await fg(["**/*.yaml", "**/*.yml"], {
          cwd: root,
          absolute: true,
          ignore: ["node_modules/**", ".git/**", "results/**", "dist/**"],
          followSymbolicLinks: true,
        });

        for (const file of files) {
          const absolutePath = path.resolve(file);

          if (discoveryContext!.processedFiles.has(absolutePath)) {
            continue;
          }

          discoveryContext!.processedFiles.add(absolutePath);

          try {
            const fileContent = fs.readFileSync(absolutePath, "utf8");
            const fileData = yaml.load(fileContent);

            if (fileData && fileData.node_id) {
              if (!discoveryContext!.nodeIdToFileMap.has(fileData.node_id)) {
                discoveryContext!.nodeIdToFileMap.set(
                  fileData.node_id,
                  absolutePath
                );
              }
            }
          } catch (error) {
            getLogger().debug(
              `⚠️ Could not parse YAML file during dependency discovery: ${absolutePath}`
            );
          }
        }
      } catch (error) {
        getLogger().debug(
          `⚠️ Skipping dependency discovery in '${root}': ${error}`
        );
      }
    }
  };

  const ensureNodeIndexed = async (nodeId: string) => {
    if (!nodeId) {
      return;
    }

    if (!discoveryContext!.nodeIdToFileMap.has(nodeId)) {
      if (!discoveryContext!.fallbackSearchPerformed) {
        discoveryContext!.fallbackSearchPerformed = true;
        await buildDependencyIndex([discoveryContext!.projectRoot]);
      }
    }
  };

  if (discoveryContext.nodeIdToFileMap.size === 0) {
    await buildDependencyIndex(discoveryContext.searchRoots);
  }

  for (const dependency of testData.depends) {
    let resolvedNodeId: string | null =
      typeof dependency?.node_id === "string" ? dependency.node_id : null;
    let dependencyFilePath: string | null = null;

    if (resolvedNodeId) {
      await ensureNodeIndexed(resolvedNodeId);
      dependencyFilePath =
        discoveryContext.nodeIdToFileMap.get(resolvedNodeId) ?? null;
    }

    const dependencyPathCandidate =
      typeof dependency?.path === "string" ? dependency.path.trim() : null;

    if (!dependencyFilePath && dependencyPathCandidate) {
      const dependencyPath = path.resolve(
        normalizedStartDir,
        dependencyPathCandidate
      );

      if (
        fs.existsSync(dependencyPath) &&
        fs.statSync(dependencyPath).isFile()
      ) {
        dependencyFilePath = dependencyPath;
      } else {
        for (const [nodeId, filePath] of discoveryContext.nodeIdToFileMap) {
          if (
            filePath.includes(dependencyPathCandidate) ||
            dependencyPathCandidate.includes(
              path.basename(filePath, path.extname(filePath))
            )
          ) {
            resolvedNodeId = nodeId;
            dependencyFilePath = filePath;
            break;
          }
        }
      }
    }

    if (dependencyFilePath && !resolvedNodeId) {
      try {
        const depFileContent = fs.readFileSync(dependencyFilePath, "utf8");
        const depData = yaml.load(depFileContent);
        if (depData && depData.node_id) {
          resolvedNodeId = depData.node_id;
          discoveryContext.nodeIdToFileMap.set(
            resolvedNodeId as string,
            dependencyFilePath
          );
        }
      } catch (error) {
        getLogger().warn(
          `⚠️ Could not resolve dependency node_id for file: ${dependencyFilePath}`
        );
      }
    }

    if (resolvedNodeId) {
      await ensureNodeIndexed(resolvedNodeId);
      dependencyFilePath =
        dependencyFilePath ??
        discoveryContext.nodeIdToFileMap.get(resolvedNodeId) ??
        dependencyFilePath;
    }

    if (!resolvedNodeId || !dependencyFilePath) {
      getLogger().warn(
        `⚠️ Could not resolve dependency: ${JSON.stringify(dependency)}`
      );
      continue;
    }

    if (!discoveryContext.nodeIdToFileMap.has(resolvedNodeId)) {
      discoveryContext.nodeIdToFileMap.set(
        resolvedNodeId as string,
        dependencyFilePath
      );
    }

    if (!dependencyNodeIds.includes(resolvedNodeId)) {
      dependencyNodeIds.push(resolvedNodeId);
      getLogger().info(
        `✅ Found dependency: ${resolvedNodeId} (${path.basename(
          dependencyFilePath
        )})`
      );
    }

    if (!dependencyFilePaths.includes(dependencyFilePath)) {
      dependencyFilePaths.push(dependencyFilePath);
    }

    if (discoveryContext.visitedDependencyFiles.has(dependencyFilePath)) {
      continue;
    }

    discoveryContext.visitedDependencyFiles.add(dependencyFilePath);

    try {
      const depFileContent = fs.readFileSync(dependencyFilePath, "utf8");
      const depData = yaml.load(depFileContent);

      const transitiveDependencies = await autoDiscoverDependencies(
        depData,
        path.dirname(dependencyFilePath),
        discoveryContext
      );

      for (const transitiveDep of transitiveDependencies.nodeIds) {
        if (!dependencyNodeIds.includes(transitiveDep)) {
          dependencyNodeIds.push(transitiveDep);
        }
      }

      for (const transitivePath of transitiveDependencies.filePaths) {
        if (!dependencyFilePaths.includes(transitivePath)) {
          dependencyFilePaths.push(transitivePath);
        }
      }
    } catch (error) {
      getLogger().warn(
        `⚠️ Could not read dependency file: ${dependencyFilePath}`
      );
    }
  }

  return { nodeIds: dependencyNodeIds, filePaths: dependencyFilePaths };
}

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8"))
    );
    process.stdin.on("error", (error) => reject(error));
  });
}

/**
 * Exibe a mensagem de ajuda do CLI
 *
 * Mostra todas as opções disponíveis, exemplos de uso
 * e informações sobre arquivos de configuração.
 *
 * @example
 * ```bash
 * flow-test --help
 * # ou
 * flow-test -h
 * ```
 */
function printHelp() {
  let version = "1.1.12";
  try {
    const fs = require("fs");
    const path = require("path");
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    version = packageJson.version;
  } catch (error) {
    // Fallback version if package.json can't be read
  }

  getLogger().info(`
🚀 Flow Test Engine v${version}

USAGE:
  fest [COMMAND] [TEST_FILE | -c CONFIG_FILE] [OPTIONS]
  flow-test-engine [COMMAND] [TEST_FILE | -c CONFIG_FILE] [OPTIONS]

COMMANDS:
  init                       Initialize configuration file interactively
  dashboard <subcommand>     Manage report dashboard (install, dev, build, preview, serve)
  graph [format]             Generate discovery graphs (Mermaid) from test discovery

  (no command)               Run tests with specified options

ARGUMENTS:
  TEST_FILE                Path to specific test file (e.g., my-test.yaml)
  -c CONFIG_FILE           Path to configuration file (default: flow-test.config.yml)

OPTIONS:
  -c, --config <file>      Configuration file path
  -d, --directory <dir>    Test directory override
  -e, --environment <env>  Environment name for variable resolution

VERBOSITY:
  --verbose               Show detailed output including request/response data
  --detailed              Show detailed progress without full request/response
  --simple                Show basic progress (default)
  --silent                Silent execution, errors only

FILTERING:
  --priority <levels>     Run only tests with specified priorities (comma-separated)
                         Example: --priority critical,high
  --suite <names>         Run only specified test suites (comma-separated)
                         Example: --suite "login,checkout"
  --node <ids>           Run only specified test nodes (comma-separated)
                         Example: --node auth-tests,api-tests
  --step <ids>           Run only specific step IDs (comma-separated).
                         Accepts simple IDs or qualified values like node_id::step_id
                         Supports "node_id::step_id" for suite scoping
  --tag <tags>           Run only tests with specified tags (comma-separated)
                         Example: --tag smoke,regression

EXECUTION:
  --dry-run              Show execution plan without running tests
  --no-log               Disable automatic log file generation

INLINE EXECUTION:
  --inline-yaml <string|->  Execute a suite from an inline YAML string (use '-' to read from stdin)
  --inline-base <dir>       Base directory used to resolve dependencies for inline execution
  --inline-path <path>      Relative path (inside base dir) for the temporary inline YAML file

REPORTING:
  --html-output [dir]    Generate Postman-style HTML alongside JSON (optional subdirectory name)

SWAGGER IMPORT:
  --swagger-import <file>    Import OpenAPI/Swagger spec and generate test files
  --swagger-output <dir>     Output directory for generated tests (default: ./tests/imported)

POSTMAN COLLECTIONS:
  --postman-export <path>    Export a Flow Test suite file or directory to a Postman collection
  --postman-export-from-results <file> Export from execution results (results/latest.json) with real data
  --postman-output <path>    Output file or directory for the exported collection (default: alongside input)
  --postman-import <file>    Import a Postman collection JSON file and generate Flow Test suite(s)
  --postman-import-output <dir> Output directory for generated suites (default: alongside input)
  --postman-preserve-folders Preserve folder structure, creating multiple YAML files (one per folder)
  --postman-analyze-deps     Analyze and add 'depends' directives based on variable dependencies

GRAPH GENERATION:
  graph mermaid [options]    Print a Mermaid graph of discovered suites to stdout
    --direction <dir>        Choose layout direction (TD, LR, BT, RL)
    --priority <list>        Filter suites by priority levels
    --tag <list>             Filter suites by metadata tags
    --suite <list>           Filter suites by suite names
    --node <list>            Filter suites by node IDs
    --output <file>          Write the generated graph to a file
    --no-orphans             Disable orphan node highlighting

OTHER:
  -h, --help             Show this help message
  -v, --version          Show version information

EXAMPLES:
  # Configuration
  fest init                               # Interactive configuration setup (short form)
  flow-test-engine init                   # Interactive configuration setup (full form)
  fest init --template basic             # Use basic template
  fest init --help                       # Show init command help

  # Dashboard Management
  fest dashboard install                  # Install dashboard dependencies
  fest dashboard dev                      # Start dashboard in development mode
  fest dashboard build                    # Build dashboard for production
  fest dashboard preview                  # Preview built dashboard
  fest dashboard serve                    # Build and serve dashboard

  # Running Tests
  fest                                    # Run with default config (short form)
  fest my-test.yaml                       # Run specific test file
  fest -c my-config.yml                   # Run with specific config file
  fest --priority critical,high          # Run only critical and high priority tests
  fest --dry-run                         # Show what would be executed
  fest --directory ./api-tests --verbose # Run from specific directory with verbose output
  fest --environment staging --silent    # Run in staging environment silently
  fest --swagger-import api.json         # Import OpenAPI spec and generate tests
  fest --swagger-import api.yaml --swagger-output ./tests/api # Import with custom output
  fest --postman-export tests/auth-flows-test.yaml --postman-output ./exports/auth.postman_collection.json
  fest --postman-export-from-results results/latest.json --postman-output ./exports/
  fest --postman-import ./postman/collection.json --postman-import-output ./tests/imported-postman
  fest --postman-import ./postman/api.json --postman-preserve-folders --postman-analyze-deps --postman-import-output ./tests/api
  fest graph mermaid --output discovery.mmd     # Generate Mermaid graph for documentation

CONFIGURATION:
  The engine looks for configuration files in this order:
  1. Specified via --config or as argument
  2. flow-test.config.yml
  3. flow-test.config.yaml
  4. flow-test.yml
  5. flow-test.yaml

  For configuration file format and options, see documentation.
`);
}

/**
 * Manipula importação de especificação Swagger/OpenAPI
 */
async function handleSwaggerImport(
  specFilePath: string,
  outputDir?: string
): Promise<void> {
  getLogger().info(
    `🔄 Importing Swagger/OpenAPI specification from: ${specFilePath}`
  );

  try {
    const importService = new SwaggerImportService();
    const options: ImportOptions = {
      groupByTags: true,
      generateDocs: true,
      includeExamples: true,
      useFakerForData: true,
    };

    const result = await importService.importSpec(
      specFilePath,
      outputDir || "./tests/imported",
      options
    );

    if (!result.success) {
      getLogger().error("❌ Import failed:");
      result.errors.forEach((error) => getLogger().error(`  • ${error}`));
      process.exit(1);
    }

    // Show warnings if any
    if (result.warnings.length > 0) {
      getLogger().info("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => getLogger().warn(`  • ${warning}`));
    }

    // Show success summary
    getLogger().info("\n✅ Import completed successfully!");
    getLogger().info(`📁 Output directory: ${result.outputPath}`);
    getLogger().info(`📄 Generated test suites: ${result.generatedSuites}`);

    if (result.generatedDocs > 0) {
      getLogger().info(
        `📚 Generated documentation files: ${result.generatedDocs}`
      );
    }

    getLogger().info("\n🚀 Next steps:");
    getLogger().info("  1. Review generated test files");
    getLogger().info("  2. Adjust variables and assertions as needed");
    getLogger().info(
      `  3. Run tests: flow-test --directory ${result.outputPath}`
    );
  } catch (error) {
    getLogger().error("❌ Unexpected error during import:", {
      error: error as Error,
    });
    process.exit(1);
  }
}

async function handlePostmanExportFromResults(
  resultsPath: string,
  outputPath?: string
): Promise<void> {
  getLogger().info(
    `🔄 Exporting Postman collection from execution results: ${resultsPath}`
  );

  try {
    const service = new PostmanCollectionService();
    const result = await service.exportFromExecutionResults(resultsPath, {
      outputPath,
    });

    if (!result.success) {
      getLogger().error("❌ Export failed:");
      result.errors.forEach((error) => getLogger().error(`  • ${error}`));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      getLogger().info("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => getLogger().warn(`  • ${warning}`));
    }

    getLogger().info("\n✅ Export completed successfully!");
    result.outputFiles.forEach((file) =>
      getLogger().info(`📄 Generated: ${file}`)
    );
  } catch (error) {
    getLogger().error(
      "❌ Unexpected error during Postman export from results:",
      { error: error as Error }
    );
    process.exit(1);
  }
}

async function handlePostmanExport(
  inputPath: string,
  outputPath?: string
): Promise<void> {
  getLogger().info(
    `🔄 Exporting Flow Test suite(s) to Postman collection: ${inputPath}`
  );

  try {
    const service = new PostmanCollectionService();
    const result = await service.exportFromPath(inputPath, {
      outputPath,
    });

    if (!result.success) {
      getLogger().error("❌ Export failed:");
      result.errors.forEach((error) => getLogger().error(`  • ${error}`));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      getLogger().info("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => getLogger().warn(`  • ${warning}`));
    }

    getLogger().info("\n✅ Export completed successfully!");
    result.outputFiles.forEach((file) =>
      getLogger().info(`📄 Generated: ${file}`)
    );
  } catch (error) {
    getLogger().error("❌ Unexpected error during Postman export:", {
      error: error as Error,
    });
    process.exit(1);
  }
}

async function handlePostmanImport(
  collectionPath: string,
  outputDir?: string,
  preserveFolders = false,
  analyzeDeps = false
): Promise<void> {
  const mode = preserveFolders
    ? "multi-file with folder structure"
    : "single file";
  getLogger().info(
    `🔄 Importing Postman collection (${mode}): ${collectionPath}`
  );

  if (analyzeDeps && !preserveFolders) {
    getLogger().warn(
      "⚠️  --postman-analyze-deps requires --postman-preserve-folders, ignoring..."
    );
    analyzeDeps = false;
  }

  try {
    const service = new PostmanCollectionService();
    const result = await service.importFromFile(collectionPath, {
      outputDir,
      preserveFolderStructure: preserveFolders,
      analyzeDependencies: analyzeDeps,
    });

    if (!result.success) {
      getLogger().error("❌ Import failed:");
      result.errors.forEach((error) => getLogger().error(`  • ${error}`));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      getLogger().info("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => getLogger().warn(`  • ${warning}`));
    }

    getLogger().info("\n✅ Import completed successfully!");
    getLogger().info(`📊 Generated ${result.generatedSuites} suite(s)`);

    if (result.folderStructure) {
      getLogger().info("\n" + result.folderStructure);
    }

    if (result.dependenciesFound && result.dependenciesFound.length > 0) {
      getLogger().info(
        `\n🔗 Dependencies found: ${result.dependenciesFound.length}`
      );
      result.dependenciesFound.forEach((dep) => {
        getLogger().info(
          `  • ${dep.variableName}: captured in ${dep.capturedBy}, used by ${dep.usedBy.length} suite(s)`
        );
      });
    }

    getLogger().info("\n📄 Generated files:");
    result.outputFiles.forEach((file) => getLogger().info(`  • ${file}`));
  } catch (error) {
    getLogger().error("❌ Unexpected error during Postman import:", {
      error: error as Error,
    });
    process.exit(1);
  }
}

async function handleDashboardCommand(command: string): Promise<void> {
  const { spawn } = require("child_process");
  const path = require("path");

  // Get the directory where the CLI is installed
  const cliDir = path.dirname(path.dirname(__filename));
  const dashboardDir = path.join(cliDir, "report-dashboard");

  // Get the current project directory (where flow-test was called from)
  const projectDir = process.cwd();

  getLogger().info(`🎯 Running dashboard command: ${command}`);

  let npmCommand: string;
  let args: string[] = [];

  switch (command) {
    case "install":
      npmCommand = "npm";
      args = ["install"];
      break;
    case "dev":
      npmCommand = "npm";
      args = ["run", "dev"];
      break;
    case "build":
      npmCommand = "npm";
      args = ["run", "build"];
      break;
    case "preview":
      // Preview needs build first, so we build and then preview
      npmCommand = "npm";
      args = ["run", "build"];
      break;
    case "serve":
      npmCommand = "npm";
      args = ["run", "build"];
      break;
    default:
      getLogger().error(`❌ Unknown dashboard command: ${command}`);
      getLogger().error(
        "Available commands: install, dev, build, preview, serve"
      );
      process.exit(1);
  }

  try {
    // Check if dashboard directory exists
    const fs = require("fs");
    if (!fs.existsSync(dashboardDir)) {
      getLogger().error(`❌ Dashboard directory not found: ${dashboardDir}`);
      getLogger().error(
        "Make sure the report-dashboard is included in the package."
      );
      process.exit(1);
    }

    getLogger().info(`📁 Working directory: ${dashboardDir}`);
    getLogger().info(`📍 Project directory: ${projectDir}`);

    // Set environment variable so dashboard can find project results
    const env = {
      ...process.env,
      FLOW_TEST_PROJECT_DIR: projectDir,
      FLOW_TEST_CLI_DIR: cliDir, // Add CLI directory for finding guides
      ...(command === "preview" && { FLOW_TEST_PREVIEW: "true" }), // Add preview flag
    };

    const child = spawn(npmCommand, args, {
      cwd: dashboardDir,
      stdio: "inherit",
      env: env,
    });

    child.on("error", (error: Error) => {
      getLogger().error(
        `❌ Failed to start dashboard command: ${error.message}`
      );
      process.exit(1);
    });

    child.on("close", (code: number | null) => {
      if (command === "serve" && code === 0) {
        // After build succeeds, start the serve command
        getLogger().info("🚀 Starting server...");
        const serveChild = spawn("npx", ["serve", "dist", "--single"], {
          cwd: dashboardDir,
          stdio: "inherit",
          env: env,
        });

        serveChild.on("error", (error: Error) => {
          getLogger().error(`❌ Failed to start server: ${error.message}`);
          process.exit(1);
        });
      } else if (command === "preview" && code === 0) {
        // After build succeeds, start the preview command
        getLogger().info("🚀 Starting preview server...");
        const previewChild = spawn("npm", ["run", "preview"], {
          cwd: dashboardDir,
          stdio: "inherit",
          env: env,
        });

        previewChild.on("error", (error: Error) => {
          getLogger().error(`❌ Failed to start preview: ${error.message}`);
          process.exit(1);
        });
      } else if (code !== 0) {
        getLogger().error(`❌ Dashboard command failed with exit code ${code}`);
        process.exit(code || 1);
      } else {
        getLogger().info(
          `✅ Dashboard command '${command}' completed successfully`
        );
      }
    });
  } catch (error) {
    getLogger().error(`❌ Error executing dashboard command: ${error}`);
    process.exit(1);
  }
}

// Tratamento de sinais para cleanup graceful
process.on("SIGINT", () => {
  getLogger().info("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(130);
});

process.on("SIGTERM", () => {
  getLogger().info("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(143);
});

// Tratamento de exceções não capturadas
process.on("uncaughtException", (error) => {
  getLogger().error("💥 Uncaught Exception:", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  getLogger().error("💥 Unhandled Rejection at:", {
    metadata: { promise, reason },
  });
  process.exit(1);
});

// Executa o CLI
main().catch((error) => {
  getLogger().error("💥 CLI execution failed:", { error });
  process.exit(1);
});
