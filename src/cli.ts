#!/usr/bin/env node
import { LoggerService } from "./services/logger.service";
import {
  CLIArgumentParser,
  CLICommandHandler,
  CLIHelpService,
  CLIOrchestrator,
} from "./services/cli";

const cliLogger = new LoggerService();

async function main() {
  const args = process.argv.slice(2);
  const argumentParser = new CLIArgumentParser();
  const commandHandler = new CLICommandHandler(cliLogger);
  const helpService = new CLIHelpService(cliLogger);
  const orchestrator = new CLIOrchestrator();
  const parsed = argumentParser.parse(args);

  try {
    if (parsed.command === "init") {
      const exitCode = await commandHandler.handleInit(args.slice(1));
      process.exit(exitCode);
    }
    if (parsed.command === "schema") {
      const showHelp =
        args.slice(1).includes("--help") || args.slice(1).includes("-h");
      const exitCode = await commandHandler.handleSchema(
        parsed.schemaFormat,
        showHelp
      );
      process.exit(exitCode);
    }
    if (parsed.showVersion) {
      process.exit(helpService.displayVersion());
    }
    if (parsed.showHelp) {
      process.exit(helpService.displayHelp());
    }
    if (parsed.postmanExportFromResults) {
      const exitCode = await commandHandler.handlePostmanExportFromResults(
        parsed.postmanExportFromResults,
        parsed.postmanExportOutput
      );
      process.exit(exitCode);
    }
    if (parsed.postmanExport) {
      const exitCode = await commandHandler.handlePostmanExport(
        parsed.postmanExport,
        parsed.postmanExportOutput
      );
      process.exit(exitCode);
    }
    if (parsed.postmanImport) {
      const exitCode = await commandHandler.handlePostmanImport(
        parsed.postmanImport,
        parsed.postmanImportOutput,
        parsed.postmanPreserveFolders,
        parsed.postmanAnalyzeDeps
      );
      process.exit(exitCode);
    }
    if (parsed.swaggerImport) {
      const exitCode = await commandHandler.handleSwaggerImport(
        parsed.swaggerImport,
        parsed.swaggerOutput
      );
      process.exit(exitCode);
    }
    if (parsed.disableReporting) {
      parsed.options.reporting = {
        ...(parsed.options.reporting || {}),
        enabled: false,
        formats: [],
      };
    }
    if (parsed.options.reporting?.formats?.includes("html")) {
      cliLogger.info("HTML reporting enabled");
    }
    const exitCode = await orchestrator.execute(args);
    process.exit(exitCode);
  } catch (error) {
    cliLogger.error("CLI execution failed:", { error: error as Error });
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  cliLogger.info("Shutting down...");
  process.exit(130);
});
process.on("SIGTERM", () => {
  cliLogger.info("Shutting down...");
  process.exit(143);
});
process.on("uncaughtException", (error) => {
  cliLogger.error("Uncaught Exception:", { error });
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  cliLogger.error("Unhandled Rejection at:", {
    metadata: { promise: String(promise), reason: String(reason) },
  });
  process.exit(1);
});

main().catch((error) => {
  cliLogger.error("CLI failed:", { error });
  process.exit(1);
});
