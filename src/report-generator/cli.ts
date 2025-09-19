/**
 * @fileoverview Command-line interface for HTML report generation.
 *
 * @remarks
 * This module provides a command-line utility for generating HTML reports from
 * JSON test results. It serves as a standalone tool for report generation
 * and can be used independently of the main test execution flow.
 *
 * @packageDocumentation
 */

import fs from "fs";
import path from "path";
import { HTMLReportGenerator } from "./html-generator";
import { ReportGeneratorV2 } from "./v2/report-generator-v2";
import { ConfigManager } from "../core/config";
import { AggregatedResult } from "../types/engine.types";

/**
 * Main CLI function for generating HTML reports from JSON test results.
 *
 * @remarks
 * This function serves as the entry point for the HTML report generation CLI.
 * It reads JSON test results from the default location and generates an
 * interactive HTML report with comprehensive error handling and user feedback.
 *
 * **Process Flow:**
 * 1. Initialize HTML report generator
 * 2. Locate JSON results file (defaults to `results/latest.json`)
 * 3. Generate HTML report from JSON data
 * 4. Provide user feedback with file paths and browser instructions
 * 5. Handle errors gracefully with detailed error messages
 *
 * **Output Locations:**
 * - Input: `results/latest.json` (default JSON results)
 * - Output: Generated HTML file in results directory
 * - Browser: Ready-to-open file URL for immediate viewing
 *
 * @example CLI usage
 * ```bash
 * # Generate report from default location
 * npm run report:html
 *
 * # Direct node execution
 * node dist/report-generator/cli.js
 * ```
 *
 * @example Programmatic usage
 * ```typescript
 * // This function can also be called programmatically
 * import { main } from './cli';
 *
 * try {
 *   await main();
 *   console.log('Report generation completed');
 * } catch (error) {
 *   console.error('Report generation failed:', error);
 * }
 * ```
 *
 * @throws Will throw an error if JSON file is not found or invalid
 * @throws Will throw an error if HTML generation fails
 * @throws Will throw an error if file system operations fail
 *
 * @returns Promise that resolves when report generation is complete
 *
 * @public
 * @since 1.0.0
  */
async function main(): Promise<void> {
  try {
    console.log("Generating HTML report viewer...");
    const jsonPath = path.resolve(
      process.cwd(),
      process.argv[2] || "results/latest.json"
    );

    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    const reportVersion = config.reporting?.version || "v1";

    let outputPath: string;

    if (reportVersion === "v2") {
      if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON report not found at ${jsonPath}`);
      }

      const rawData = fs.readFileSync(jsonPath, "utf8");
      const aggregatedResult = JSON.parse(rawData) as AggregatedResult;

      const outputDir = config.reporting?.output_dir
        ? path.resolve(process.cwd(), config.reporting.output_dir)
        : path.join(process.cwd(), "results");

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const baseName = path.basename(jsonPath, path.extname(jsonPath));
      outputPath = path.join(outputDir, `${baseName}_${timestamp}.html`);

      const generator = new ReportGeneratorV2();
      await generator.generateReport(aggregatedResult, outputPath);

      // Atualiza atalho latest.html para referência rápida
      const latestPath = path.join(outputDir, "latest.html");
      fs.copyFileSync(outputPath, latestPath);
    } else {
      const generator = new HTMLReportGenerator({
        outputDir: config.reporting?.output_dir || "./results",
      });
      outputPath = await generator.generateFromJSON(jsonPath);
    }

    console.log(`✅ HTML report viewer generated successfully!`);
    console.log(`📄 Report: ${outputPath}`);
    console.log(`🌐 Open in browser: file://${outputPath}`);
  } catch (error) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as Error).message
        : error;
    console.error(`❌ Error generating HTML report:`, errorMessage);
    process.exit(1);
  }
}

main();
