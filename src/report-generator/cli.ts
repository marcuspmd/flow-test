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

import { HTMLReportGenerator } from "./html-generator";
import path from "path";

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
    const generator = new HTMLReportGenerator();
    const jsonPath = path.resolve(process.cwd(), "results/latest.json");
    const outputPath = await generator.generateFromJSON(jsonPath);
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
