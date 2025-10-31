/**
 * @fileoverview CLI Argument Parser Service
 *
 * @remarks
 * Responsible for parsing command-line arguments and converting them
 * into structured options for the Flow Test Engine.
 *
 * @packageDocumentation
 */

import { injectable } from "inversify";
import { EngineExecutionOptions, ReportFormat } from "../../types/config.types";

/**
 * Parsed CLI arguments structure
 */
export interface ParsedCLIArguments {
  options: EngineExecutionOptions;
  configFile?: string;
  testFile?: string;
  showHelp: boolean;
  showVersion: boolean;
  dryRun: boolean;
  swaggerImport?: string;
  swaggerOutput?: string;
  postmanExport?: string;
  postmanExportOutput?: string;
  postmanExportFromResults?: string;
  postmanImport?: string;
  postmanImportOutput?: string;
  postmanPreserveFolders: boolean;
  postmanAnalyzeDeps: boolean;
  liveEventsPath?: string;
  runnerInteractiveMode: boolean;
  disableReporting: boolean;
  inlineYamlArg?: string;
  inlineBaseDir?: string;
  inlineRelativePath?: string;
  command?: "init" | "schema";
  schemaFormat?: "json";
}

/**
 * Service responsible for parsing CLI arguments
 */
@injectable()
export class CLIArgumentParser {
  /**
   * Parse command-line arguments
   *
   * @param args - Raw command-line arguments (typically process.argv.slice(2))
   * @returns Parsed arguments structure
   */
  parse(args: string[]): ParsedCLIArguments {
    const result: ParsedCLIArguments = {
      options: {
        verbosity: "simple",
      },
      showHelp: false,
      showVersion: false,
      dryRun: false,
      postmanPreserveFolders: false,
      postmanAnalyzeDeps: false,
      runnerInteractiveMode: false,
      disableReporting: false,
    };

    // Handle commands first
    if (args[0] === "init") {
      result.command = "init";
      return result;
    }

    if (args[0] === "schema") {
      result.command = "schema";
      const restArgs = args.slice(1);

      // Parse format option for schema command
      const formatIndex = restArgs.indexOf("--format");
      if (formatIndex !== -1 && formatIndex + 1 < restArgs.length) {
        const requestedFormat = restArgs[formatIndex + 1];
        if (requestedFormat === "json") {
          result.schemaFormat = "json";
        }
      }

      return result;
    }

    // Parse options
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case "-c":
        case "--config":
          if (i + 1 < args.length) {
            result.configFile = args[++i];
          }
          break;

        case "-d":
        case "--directory":
          if (i + 1 < args.length) {
            result.options.test_directory = args[++i];
          }
          break;

        case "-e":
        case "--environment":
          if (i + 1 < args.length) {
            result.options.environment = args[++i];
          }
          break;

        case "--verbose":
          result.options.verbosity = "verbose";
          break;

        case "--detailed":
          result.options.verbosity = "detailed";
          break;

        case "--simple":
          result.options.verbosity = "simple";
          break;

        case "--silent":
          result.options.verbosity = "silent";
          break;

        case "--priority":
          if (i + 1 < args.length) {
            const priorities = args[++i].split(",");
            result.options.filters = {
              ...result.options.filters,
              priority: priorities,
            };
          }
          break;

        case "--suite":
          if (i + 1 < args.length) {
            const suites = args[++i].split(",");
            result.options.filters = {
              ...result.options.filters,
              suite_names: suites,
            };
          }
          break;

        case "--node":
          if (i + 1 < args.length) {
            const nodeIds = args[++i].split(",");
            result.options.filters = {
              ...result.options.filters,
              node_ids: nodeIds,
            };
          }
          break;

        case "--step":
        case "--step-id":
          if (i + 1 < args.length) {
            const stepIds = args[++i].split(",");
            result.options.filters = {
              ...result.options.filters,
              step_ids: stepIds,
            };
          }
          break;

        case "--tag":
        case "--tags":
          if (i + 1 < args.length) {
            const tags = args[++i].split(",");
            result.options.filters = { ...result.options.filters, tags };
          }
          break;

        case "--no-log":
          result.options.logging = { enabled: false };
          break;

        case "--no-report":
          result.disableReporting = true;
          break;

        case "-f":
        case "--format":
          if (i + 1 < args.length) {
            const formats = args[++i]
              .split(",")
              .map((f) => f.trim()) as ReportFormat[];
            const reportingOptions = (result.options.reporting =
              result.options.reporting ?? {});
            reportingOptions.formats = formats;
          }
          break;

        case "--dry-run":
          result.dryRun = true;
          break;

        case "--swagger-import":
          if (i + 1 < args.length) {
            result.swaggerImport = args[++i];
          }
          break;

        case "--swagger-output":
          if (i + 1 < args.length) {
            result.swaggerOutput = args[++i];
          }
          break;

        case "--postman-export":
          if (i + 1 < args.length) {
            result.postmanExport = args[++i];
          }
          break;

        case "--postman-export-from-results":
          if (i + 1 < args.length) {
            result.postmanExportFromResults = args[++i];
          }
          break;

        case "--postman-export-output":
        case "--postman-output":
          if (i + 1 < args.length) {
            result.postmanExportOutput = args[++i];
          }
          break;

        case "--live-events":
          if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
            result.liveEventsPath = args[++i];
          } else {
            result.liveEventsPath = "results/live-events.jsonl";
          }
          break;

        case "--runner-interactive-inputs":
          result.runnerInteractiveMode = true;
          break;

        case "--inline-yaml":
          if (i + 1 < args.length) {
            result.inlineYamlArg = args[++i];
          }
          break;

        case "--inline-base":
          if (i + 1 < args.length) {
            result.inlineBaseDir = args[++i];
          }
          break;

        case "--inline-path":
          if (i + 1 < args.length) {
            result.inlineRelativePath = args[++i];
          }
          break;

        case "--html-output": {
          const nextArg = args[i + 1];
          const hasValue = nextArg && !nextArg.startsWith("-");
          if (hasValue) {
            i += 1;
          }

          if (hasValue) {
            const reportingOptions = (result.options.reporting =
              result.options.reporting ?? {});
            reportingOptions.html = {
              ...reportingOptions.html,
              output_subdir: nextArg,
            };
          }

          const reportingOptions = (result.options.reporting =
            result.options.reporting ?? {});
          const formats = new Set<ReportFormat>(reportingOptions.formats ?? []);
          formats.add("json");
          formats.add("html");
          reportingOptions.formats = Array.from(formats);
          break;
        }

        case "--postman-import":
          if (i + 1 < args.length) {
            result.postmanImport = args[++i];
          }
          break;

        case "--postman-import-output":
          if (i + 1 < args.length) {
            result.postmanImportOutput = args[++i];
          }
          break;

        case "--postman-preserve-folders":
          result.postmanPreserveFolders = true;
          break;

        case "--postman-analyze-deps":
          result.postmanAnalyzeDeps = true;
          break;

        case "-h":
        case "--help":
          result.showHelp = true;
          break;

        case "-v":
        case "--version":
          result.showVersion = true;
          break;

        default:
          // Treat as test file if not a flag
          if (!arg.startsWith("-") && !result.testFile) {
            result.testFile = arg;
          }
          break;
      }
    }

    return result;
  }

  /**
   * Validate parsed arguments for conflicts
   *
   * @param parsed - Parsed CLI arguments
   * @returns Array of validation error messages (empty if valid)
   */
  validate(parsed: ParsedCLIArguments): string[] {
    const errors: string[] = [];

    if (parsed.postmanExport && parsed.postmanImport) {
      errors.push(
        "Cannot use --postman-export and --postman-import in the same command."
      );
    }

    if (
      parsed.postmanExportFromResults &&
      (parsed.postmanExport || parsed.postmanImport)
    ) {
      errors.push(
        "Cannot use --postman-export-from-results with other postman export/import commands."
      );
    }

    if (parsed.inlineYamlArg && parsed.dryRun) {
      errors.push("Inline YAML execution does not support --dry-run mode.");
    }

    if (
      parsed.inlineYamlArg &&
      (parsed.postmanExport ||
        parsed.postmanImport ||
        parsed.postmanExportFromResults)
    ) {
      errors.push(
        "Inline YAML execution cannot be combined with Postman import/export commands."
      );
    }

    return errors;
  }
}
