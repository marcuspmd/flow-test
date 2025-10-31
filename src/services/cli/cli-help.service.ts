/**
 * @fileoverview CLI Help and Version Service
 *
 * @remarks
 * Handles display of help message and version information.
 *
 * @packageDocumentation
 */

import * as fs from "fs";
import * as path from "path";
import { LoggerService } from "../logger.service";

/**
 * Service responsible for displaying help and version information
 */
export class CLIHelpService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Display version information
   *
   * @returns Exit code
   */
  displayVersion(): number {
    const version = this.getVersion();
    this.logger.info(`Flow Test Engine v${version}`);
    return 0;
  }

  /**
   * Display help message
   *
   * @returns Exit code
   */
  displayHelp(): number {
    const version = this.getVersion();

    this.logger.info(`
🚀 Flow Test Engine v${version}

USAGE:
  flow-test-engine [COMMAND] [TEST_FILE | -c CONFIG_FILE] [OPTIONS]

COMMANDS:
  init                       Initialize configuration file interactively
  schema [--format json]     Export engine schema catalog for IDE extensions

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
  -f, --format <formats> Report formats to generate (comma-separated: json,html,qa)
                         Example: --format qa or --format json,html,qa
  --html-output [dir]    Generate Postman-style HTML alongside JSON (optional subdirectory name)
  --no-report           Skip generating report artifacts (JSON/HTML)

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


OTHER:
  -h, --help             Show this help message
  -v, --version          Show version information

EXAMPLES:
  # Configuration
  flow-test-engine init                   # Interactive configuration setup (full form)
  flow-test-engine init --template basic             # Use basic template
  flow-test-engine init --help                       # Show init command help

  # Schema Export
  flow-test-engine schema --format json              # Export schema catalog to stdout
  flow-test-engine schema > flow-test-engine.schema.json  # Save schema to file

  # Running Tests
  flow-test-engine                                    # Run with default config (short form)
  flow-test-engine my-test.yaml                       # Run specific test file
  flow-test-engine -c my-config.yml                   # Run with specific config file
  flow-test-engine --priority critical,high          # Run only critical and high priority tests
  flow-test-engine --dry-run                         # Show what would be executed
  flow-test-engine --directory ./api-tests --verbose # Run from specific directory with verbose output
  flow-test-engine --environment staging --silent    # Run in staging environment silently
  flow-test-engine --format qa                       # Generate QA-friendly report
  flow-test-engine --format json,html,qa             # Generate all report formats
  flow-test-engine --swagger-import api.json         # Import OpenAPI spec and generate tests
  flow-test-engine --swagger-import api.yaml --swagger-output ./tests/api # Import with custom output
  flow-test-engine --postman-export tests/auth-flows-test.yaml --postman-output ./exports/auth.postman_collection.json
  flow-test-engine --postman-export-from-results results/latest.json --postman-output ./exports/
  flow-test-engine --postman-import ./postman/collection.json --postman-import-output ./tests/imported-postman
  flow-test-engine --postman-import ./postman/api.json --postman-preserve-folders --postman-analyze-deps --postman-import-output ./tests/api

CONFIGURATION:
  The engine looks for configuration files in this order:
  1. Specified via --config or as argument
  2. flow-test.config.yml
  3. flow-test.config.yaml
  4. flow-test.yml
  5. flow-test.yaml

  For configuration file format and options, see documentation.
`);

    return 0;
  }

  /**
   * Get engine version
   */
  private getVersion(): string {
    try {
      const packagePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "package.json"
      );
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      return packageJson.version;
    } catch (error) {
      return "1.1.12"; // Fallback version
    }
  }
}
