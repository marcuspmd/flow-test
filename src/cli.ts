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

import { FlowTestEngine } from "./core/engine";
import {
  EngineExecutionOptions,
  DiscoveredTest,
  SuiteExecutionResult,
} from "./types/config.types";
import { ExecutionStats, TestSuite } from "./types/engine.types";
import {
  SwaggerImportService,
  ImportOptions,
} from "./services/swagger-import.service";
import { handleInitCommand } from "./commands/init";

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
  if (args[0] === 'init') {
    await handleInitCommand(args.slice(1));
    return;
  }

  // Parsing dos argumentos
  const options: EngineExecutionOptions = {
    verbosity: "simple",
  };

  let configFile: string | undefined;
  let showHelp = false;
  let dryRun = false;
  let swaggerImport: string | undefined;
  let swaggerOutput: string | undefined;

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

      case "-h":
      case "--help":
        showHelp = true;
        break;

      case "-v":
      case "--version":
        console.log("Flow Test Engine v1.0.0");
        process.exit(0);
        break;

      default:
        console.error(`❌ Unknown argument: ${arg}`);
        showHelp = true;
        break;
    }
  }

  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  // Handle Swagger import if requested
  if (swaggerImport) {
    await handleSwaggerImport(swaggerImport, swaggerOutput);
    process.exit(0);
  }

  try {
    // Configura opções com arquivo de config se especificado
    const engineOptions = configFile
      ? { ...options, config_file: configFile }
      : options;

    // Cria o engine
    const engine = new FlowTestEngine(engineOptions, {
      onExecutionStart: (stats: ExecutionStats) => {
        if (options.verbosity !== "silent") {
          console.log(
            `🚀 Starting execution of ${stats.tests_discovered} test(s)`
          );
        }
      },
      onTestDiscovered: (test: DiscoveredTest) => {
        if (options.verbosity === "verbose") {
          console.log(
            `📋 Discovered: ${test.node_id} - ${test.suite_name} (${test.priority})`
          );
        }
      },
      onSuiteStart: (suite: TestSuite) => {
        if (
          options.verbosity === "detailed" ||
          options.verbosity === "verbose"
        ) {
          console.log(`▶️  Starting: ${suite.suite_name}`);
        }
      },
      onSuiteEnd: (suite: TestSuite, result: SuiteExecutionResult) => {
        if (
          options.verbosity === "detailed" ||
          options.verbosity === "verbose"
        ) {
          const status = result.status === "success" ? "✅" : "❌";
          console.log(
            `${status} Finished: ${suite.suite_name} (${result.duration_ms}ms)`
          );
        }
      },
      onError: (error: Error) => {
        console.error(`💥 Engine error: ${error.message}`);
        if (options.verbosity === "verbose") {
          console.error(error.stack);
        }
      },
    });

    if (dryRun) {
      // Execução em modo dry-run
      const plan = await engine.dryRun();

      console.log(`\n📊 Execution plan would run ${plan.length} test(s):`);
      plan.forEach((test: DiscoveredTest, index: number) => {
        console.log(
          `  ${index + 1}. ${test.suite_name} (${test.priority || "medium"})`
        );
      });

      process.exit(0);
    } else {
      // Execução normal
      const result = await engine.run();

      // Exit code baseado no resultado
      const exitCode = result.success_rate === 100 ? 0 : 1;

      if (options.verbosity !== "silent") {
        console.log(
          `\n🏁 Execution completed with ${result.success_rate.toFixed(
            1
          )}% success rate`
        );
      }

      process.exit(exitCode);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);

    if (options.verbosity === "verbose") {
      console.error((error as Error).stack);
    }

    process.exit(1);
  }
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
  console.log(`
🚀 Flow Test Engine v1.0.0

USAGE:
  flow-test [COMMAND] [CONFIG_FILE] [OPTIONS]

COMMANDS:
  init                       Initialize configuration file interactively

  (no command)               Run tests with specified options

ARGUMENTS:
  CONFIG_FILE              Path to configuration file (default: flow-test.config.yml)

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

OTHER:
  -h, --help             Show this help message
  -v, --version          Show version information

EXAMPLES:
  # Configuration
  flow-test init                               # Interactive configuration setup
  flow-test init --template basic             # Use basic template
  flow-test init --template performance       # Use performance template
  flow-test init --help                       # Show init command help

  # Running Tests
  flow-test                                    # Run with default config
  flow-test my-config.yml                      # Run with specific config
  flow-test --priority critical,high          # Run only critical and high priority tests
  flow-test --dry-run                         # Show what would be executed
  flow-test --directory ./api-tests --verbose # Run from specific directory with verbose output
  flow-test --environment staging --silent    # Run in staging environment silently
  flow-test --swagger-import api.json         # Import OpenAPI spec and generate tests
  flow-test --swagger-import api.yaml --swagger-output ./tests/api # Import with custom output

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
  console.log(
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
      console.error("❌ Import failed:");
      result.errors.forEach((error) => console.error(`  • ${error}`));
      process.exit(1);
    }

    // Show warnings if any
    if (result.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => console.warn(`  • ${warning}`));
    }

    // Show success summary
    console.log("\n✅ Import completed successfully!");
    console.log(`📁 Output directory: ${result.outputPath}`);
    console.log(`📄 Generated test suites: ${result.generatedSuites}`);

    if (result.generatedDocs > 0) {
      console.log(`📚 Generated documentation files: ${result.generatedDocs}`);
    }

    console.log("\n🚀 Next steps:");
    console.log("  1. Review generated test files");
    console.log("  2. Adjust variables and assertions as needed");
    console.log(`  3. Run tests: flow-test --directory ${result.outputPath}`);
  } catch (error) {
    console.error("❌ Unexpected error during import:", error);
    process.exit(1);
  }
}

// Tratamento de sinais para cleanup graceful
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(130);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(143);
});

// Tratamento de exceções não capturadas
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Executa o CLI
main().catch((error) => {
  console.error("💥 CLI execution failed:", error);
  process.exit(1);
});
