/**
 * @fileoverview CLI Command Handler
 *
 * @remarks
 * Handles special CLI commands like swagger import, postman export/import,
 * schema export, and init.
 *
 * @packageDocumentation
 */

import { LoggerService } from "../logger.service";
import { SwaggerImportService, ImportOptions } from "../swagger-import.service";
import { PostmanCollectionService } from "../postman-collection.service";
import { handleInitCommand } from "../../commands/init";
import { handleSchemaCommand, displaySchemaHelp } from "../../commands/schema";

/**
 * Service responsible for handling special CLI commands
 */
export class CLICommandHandler {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Handle init command
   *
   * @param args - Command arguments
   * @returns Exit code
   */
  async handleInit(args: string[]): Promise<number> {
    await handleInitCommand(args);
    return 0;
  }

  /**
   * Handle schema command
   *
   * @param format - Output format
   * @param showHelp - Whether to show help
   * @returns Exit code
   */
  async handleSchema(format?: "json", showHelp = false): Promise<number> {
    if (showHelp) {
      displaySchemaHelp();
      return 0;
    }

    return await handleSchemaCommand({
      format: format || "json",
      pretty: true,
    });
  }

  /**
   * Handle Swagger import
   *
   * @param specFilePath - Path to Swagger/OpenAPI spec
   * @param outputDir - Output directory for generated tests
   * @returns Exit code
   */
  async handleSwaggerImport(
    specFilePath: string,
    outputDir?: string
  ): Promise<number> {
    this.logger.info(
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
        this.logger.error("❌ Import failed:");
        result.errors.forEach((error) => this.logger.error(`  • ${error}`));
        return 1;
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        this.logger.info("\n⚠️  Warnings:");
        result.warnings.forEach((warning) =>
          this.logger.warn(`  • ${warning}`)
        );
      }

      // Show success summary
      this.logger.info("\n✅ Import completed successfully!");
      this.logger.info(`📁 Output directory: ${result.outputPath}`);
      this.logger.info(`📄 Generated test suites: ${result.generatedSuites}`);

      if (result.generatedDocs > 0) {
        this.logger.info(
          `📚 Generated documentation files: ${result.generatedDocs}`
        );
      }

      this.logger.info("\n🚀 Next steps:");
      this.logger.info("  1. Review generated test files");
      this.logger.info("  2. Adjust variables and assertions as needed");
      this.logger.info(
        `  3. Run tests: flow-test --directory ${result.outputPath}`
      );

      return 0;
    } catch (error) {
      this.logger.error("❌ Unexpected error during import:", {
        error: error as Error,
      });
      return 1;
    }
  }

  /**
   * Handle Postman export from results
   */
  async handlePostmanExportFromResults(
    resultsPath: string,
    outputPath?: string
  ): Promise<number> {
    this.logger.info(
      `🔄 Exporting Postman collection from execution results: ${resultsPath}`
    );

    try {
      const service = new PostmanCollectionService();
      const result = await service.exportFromExecutionResults(resultsPath, {
        outputPath,
      });

      if (!result.success) {
        this.logger.error("❌ Export failed:");
        result.errors.forEach((error) => this.logger.error(`  • ${error}`));
        return 1;
      }

      if (result.warnings.length > 0) {
        this.logger.info("\n⚠️  Warnings:");
        result.warnings.forEach((warning) =>
          this.logger.warn(`  • ${warning}`)
        );
      }

      this.logger.info("\n✅ Export completed successfully!");
      result.outputFiles.forEach((file) =>
        this.logger.info(`📄 Generated: ${file}`)
      );

      return 0;
    } catch (error) {
      this.logger.error(
        "❌ Unexpected error during Postman export from results:",
        {
          error: error as Error,
        }
      );
      return 1;
    }
  }

  /**
   * Handle Postman export
   */
  async handlePostmanExport(
    inputPath: string,
    outputPath?: string
  ): Promise<number> {
    this.logger.info(
      `🔄 Exporting Flow Test suite(s) to Postman collection: ${inputPath}`
    );

    try {
      const service = new PostmanCollectionService();
      const result = await service.exportFromPath(inputPath, {
        outputPath,
      });

      if (!result.success) {
        this.logger.error("❌ Export failed:");
        result.errors.forEach((error) => this.logger.error(`  • ${error}`));
        return 1;
      }

      if (result.warnings.length > 0) {
        this.logger.info("\n⚠️  Warnings:");
        result.warnings.forEach((warning) =>
          this.logger.warn(`  • ${warning}`)
        );
      }

      this.logger.info("\n✅ Export completed successfully!");
      result.outputFiles.forEach((file) =>
        this.logger.info(`📄 Generated: ${file}`)
      );

      return 0;
    } catch (error) {
      this.logger.error("❌ Unexpected error during Postman export:", {
        error: error as Error,
      });
      return 1;
    }
  }

  /**
   * Handle Postman import
   */
  async handlePostmanImport(
    collectionPath: string,
    outputDir?: string,
    preserveFolders = false,
    analyzeDeps = false
  ): Promise<number> {
    const mode = preserveFolders
      ? "multi-file with folder structure"
      : "single file";
    this.logger.info(
      `🔄 Importing Postman collection (${mode}): ${collectionPath}`
    );

    if (analyzeDeps && !preserveFolders) {
      this.logger.warn(
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
        this.logger.error("❌ Import failed:");
        result.errors.forEach((error) => this.logger.error(`  • ${error}`));
        return 1;
      }

      if (result.warnings.length > 0) {
        this.logger.info("\n⚠️  Warnings:");
        result.warnings.forEach((warning) =>
          this.logger.warn(`  • ${warning}`)
        );
      }

      this.logger.info("\n✅ Import completed successfully!");
      this.logger.info(`📊 Generated ${result.generatedSuites} suite(s)`);

      if (result.folderStructure) {
        this.logger.info("\n" + result.folderStructure);
      }

      if (result.dependenciesFound && result.dependenciesFound.length > 0) {
        this.logger.info(
          `\n🔗 Dependencies found: ${result.dependenciesFound.length}`
        );
        result.dependenciesFound.forEach((dep) => {
          this.logger.info(
            `  • ${dep.variableName}: captured in ${dep.capturedBy}, used by ${dep.usedBy.length} suite(s)`
          );
        });
      }

      this.logger.info("\n📄 Generated files:");
      result.outputFiles.forEach((file) => this.logger.info(`  • ${file}`));

      return 0;
    } catch (error) {
      this.logger.error("❌ Unexpected error during Postman import:", {
        error: error as Error,
      });
      return 1;
    }
  }
}
