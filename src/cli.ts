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
import { EngineExecutionOptions, DiscoveredTest } from "./types/config.types";
import { EngineHooks, ExecutionStats, TestSuite } from "./types/engine.types";
import {
  SwaggerImportService,
  ImportOptions,
} from "./services/swagger-import.service";
import { handleInitCommand } from "./commands/init";
import { PostmanCollectionService } from "./services/postman-collection.service";
import {
  setupLogger,
  LoggerService,
  getLogger,
} from "./services/logger.service";
import { RealtimeReporter } from "./services/realtime-reporter";
import { createConsoleHooks } from "./services/hook-factory";

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

function mergeHooks(...hooks: Array<EngineHooks | undefined>): EngineHooks {
  const merged: EngineHooks = {};

  for (const hookName of HOOK_KEYS) {
    const callbacks = hooks
      .filter(Boolean)
      .map((hook) => hook![hookName])
      .filter((callback): callback is (...args: any[]) => any =>
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

  // Handle init command first
  if (args[0] === "init") {
    await handleInitCommand(args.slice(1));
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
  let dashboardCommand: string | undefined;
  let liveEventsPath: string | undefined;

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
    await handlePostmanImport(postmanImport, postmanImportOutput);
    process.exit(0);
  }

  if (swaggerImport) {
    await handleSwaggerImport(swaggerImport, swaggerOutput);
    process.exit(0);
  }

  try {
    // Configura opções baseado no tipo de arquivo especificado
    let engineOptions: EngineExecutionOptions;

    if (configFile) {
      // Modo configuração: -c config.yaml
      engineOptions = { ...options, config_file: configFile };
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
      const fileName = path.basename(resolvedPath, path.extname(resolvedPath));

      // Para teste específico, vamos ler o arquivo e extrair o node_id
      try {
        const fileContent = fs.readFileSync(resolvedPath, "utf8");
        const yaml = require("js-yaml");
        const testData = yaml.load(fileContent);

        if (testData && testData.node_id) {
          // Auto-discover dependencies for single file execution
          const dependencyNodeIds = await autoDiscoverDependencies(
            testData,
            tempDir
          );
          const nodeIdsToExecute = [...dependencyNodeIds, testData.node_id];

          getLogger().info(
            `🔍 Auto-discovered ${dependencyNodeIds.length} dependencies`
          );
          if (dependencyNodeIds.length > 0) {
            getLogger().info(
              `📋 Execution order: ${nodeIdsToExecute.join(" → ")}`
            );
          }

          engineOptions = {
            ...options,
            test_directory: tempDir,
            filters: {
              ...options.filters,
              node_ids: nodeIdsToExecute,
            },
          };
        } else if (testData && testData.suite_name) {
          // Auto-discover dependencies for single file execution
          const dependencyNodeIds = await autoDiscoverDependencies(
            testData,
            tempDir
          );
          const suiteNamesToExecute = [
            ...dependencyNodeIds,
            testData.suite_name,
          ];

          getLogger().info(
            `🔍 Auto-discovered ${dependencyNodeIds.length} dependencies`
          );
          if (dependencyNodeIds.length > 0) {
            getLogger().info(
              `📋 Execution order: ${suiteNamesToExecute.join(" → ")}`
            );
          }

          engineOptions = {
            ...options,
            test_directory: tempDir,
            filters: {
              ...options.filters,
              suite_names: suiteNamesToExecute,
            },
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
      engineOptions = options;
    }

    // Configura logger conforme a verbosidade escolhida
    setupLogger("console", { verbosity: options.verbosity || "simple" });
    const logger = LoggerService.getInstance();
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

    if (dryRun) {
      // Execução em modo dry-run
      const plan = await engine.dryRun();

      getLogger().info(`\n📊 Execution plan would run ${plan.length} test(s):`);
      plan.forEach((test: DiscoveredTest, index: number) => {
        getLogger().info(
          `  ${index + 1}. ${test.suite_name} (${test.priority || "medium"})`
        );
      });

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

      process.exit(exitCode);
    }
  } catch (error) {
    getLogger().error("❌ Fatal error:", {
      error: error as Error,
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
async function autoDiscoverDependencies(
  testData: any,
  testDirectory: string
): Promise<string[]> {
  const fs = require("fs");
  const path = require("path");
  const yaml = require("js-yaml");
  const fg = require("fast-glob");

  const dependencyNodeIds: string[] = [];

  // Check if the test has dependencies
  if (!testData.depends || !Array.isArray(testData.depends)) {
    return dependencyNodeIds;
  }

  // Search for YAML files in the test directory
  const yamlFiles = await fg(["**/*.yaml", "**/*.yml"], {
    cwd: testDirectory,
    absolute: true,
    ignore: ["node_modules/**", ".git/**"],
  });

  // Create a map of node_id to file path for quick lookup
  const nodeIdToFileMap: Map<string, string> = new Map();

  for (const filePath of yamlFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const fileData = yaml.load(fileContent);

      if (fileData && fileData.node_id) {
        nodeIdToFileMap.set(fileData.node_id, filePath);
      }
    } catch (error) {
      // Skip invalid YAML files
      getLogger().debug(`⚠️ Could not parse YAML file: ${filePath}`);
    }
  }

  // Process each dependency
  for (const dependency of testData.depends) {
    let resolvedNodeId: string | null = null;

    if (dependency.node_id) {
      // Direct node_id reference
      resolvedNodeId = dependency.node_id;
    } else if (dependency.path) {
      // Try to resolve by path
      const dependencyPath = path.resolve(testDirectory, dependency.path);

      if (fs.existsSync(dependencyPath)) {
        try {
          const depFileContent = fs.readFileSync(dependencyPath, "utf8");
          const depData = yaml.load(depFileContent);

          if (depData && depData.node_id) {
            resolvedNodeId = depData.node_id;
          }
        } catch (error) {
          getLogger().warn(
            `⚠️ Could not read dependency file: ${dependency.path}`
          );
        }
      } else {
        // Try to find file by partial path match
        for (const [nodeId, filePath] of nodeIdToFileMap) {
          if (
            filePath.includes(dependency.path) ||
            dependency.path.includes(
              path.basename(filePath, path.extname(filePath))
            )
          ) {
            resolvedNodeId = nodeId;
            break;
          }
        }
      }
    }

    if (resolvedNodeId && nodeIdToFileMap.has(resolvedNodeId)) {
      // Recursively resolve dependencies of dependencies
      const depFilePath = nodeIdToFileMap.get(resolvedNodeId)!;
      const depFileContent = fs.readFileSync(depFilePath, "utf8");
      const depData = yaml.load(depFileContent);

      const transitiveDependencies = await autoDiscoverDependencies(
        depData,
        testDirectory
      );

      // Add transitive dependencies first
      for (const transitiveDep of transitiveDependencies) {
        if (!dependencyNodeIds.includes(transitiveDep)) {
          dependencyNodeIds.push(transitiveDep);
        }
      }

      // Add direct dependency
      if (!dependencyNodeIds.includes(resolvedNodeId)) {
        dependencyNodeIds.push(resolvedNodeId);
        getLogger().info(
          `✅ Found dependency: ${resolvedNodeId} (${path.basename(
            nodeIdToFileMap.get(resolvedNodeId)!
          )})`
        );
      }
    } else {
      getLogger().warn(
        `⚠️ Could not resolve dependency: ${JSON.stringify(dependency)}`
      );
    }
  }

  return dependencyNodeIds;
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
  --tag <tags>           Run only tests with specified tags (comma-separated)
                         Example: --tag smoke,regression

EXECUTION:
  --dry-run              Show execution plan without running tests
  --no-log               Disable automatic log file generation

SWAGGER IMPORT:
  --swagger-import <file>    Import OpenAPI/Swagger spec and generate test files
  --swagger-output <dir>     Output directory for generated tests (default: ./tests/imported)

POSTMAN COLLECTIONS:
  --postman-export <path>    Export a Flow Test suite file or directory to a Postman collection
  --postman-export-from-results <file> Export from execution results (results/latest.json) with real data
  --postman-output <path>    Output file or directory for the exported collection (default: alongside input)
  --postman-import <file>    Import a Postman collection JSON file and generate Flow Test suite(s)
  --postman-import-output <dir> Output directory for generated suites (default: alongside input)

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
  outputDir?: string
): Promise<void> {
  getLogger().info(
    `🔄 Importing Postman collection into Flow Test suite(s): ${collectionPath}`
  );

  try {
    const service = new PostmanCollectionService();
    const result = await service.importFromFile(collectionPath, {
      outputDir,
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
    result.outputFiles.forEach((file) =>
      getLogger().info(`📄 Generated: ${file}`)
    );
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
