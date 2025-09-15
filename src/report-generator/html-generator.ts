/**
 * @fileoverview Legacy-compatible HTML report generator with modern modular backend.
 *
 * @remarks
 * This module provides the HtmlGenerator class which maintains compatibility with the
 * original report generation API while delegating actual report generation to the
 * new modular component system. It supports multiple themes, customizable output
 * options, and comprehensive test result visualization.
 *
 * @packageDocumentation
 */

import * as fs from "fs";
import * as path from "path";
import { ModularHtmlGenerator } from "./modular-html-generator";

/**
 * Configuration options for HTML report generation.
 *
 * @remarks
 * HTMLGeneratorOptions provides comprehensive customization capabilities for
 * HTML report output including theming, content inclusion, and output directory
 * configuration. These options control both the visual presentation and the
 * level of detail included in generated reports.
 *
 * @example Basic configuration
 * ```typescript
 * const options: HTMLGeneratorOptions = {
 *   outputDir: './reports',
 *   theme: 'dark',
 *   includeCurlCommands: true,
 *   includeRawData: false
 * };
 *
 * const generator = new HtmlGenerator(options);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export interface HTMLGeneratorOptions {
  /** Directory path for custom templates (optional override) */
  templateDir?: string;

  /** Output directory for generated HTML reports */
  outputDir?: string;

  /** Whether to include cURL command examples in the report */
  includeCurlCommands?: boolean;

  /** Whether to include raw JSON data sections in the report */
  includeRawData?: boolean;

  /** Visual theme for the HTML report */
  theme?: "light" | "dark" | "auto";
}

/**
 * Legacy-compatible HTML report generator with modern modular architecture.
 *
 * @remarks
 * The HtmlGenerator class provides a backward-compatible interface for HTML report
 * generation while leveraging the new modular component system internally. It
 * maintains the original API for existing integrations while offering enhanced
 * features and improved maintainability through modern architecture.
 *
 * **Key Features:**
 * - **Legacy Compatibility**: Maintains original API for seamless migration
 * - **Modern Architecture**: Uses modular component system internally
 * - **Theme Support**: Light, dark, and auto themes with responsive design
 * - **Customizable Content**: Configurable inclusion of cURL commands and raw data
 * - **File Management**: Automatic directory creation and file handling
 * - **Error Handling**: Comprehensive error reporting and recovery
 *
 * **Report Content:**
 * - **Executive Summary**: Overall test execution statistics and metrics
 * - **Step Details**: Individual test step results with timing and assertions
 * - **Error Analysis**: Detailed failure information with stack traces
 * - **Performance Metrics**: Response times, throughput, and resource usage
 * - **cURL Examples**: Copy-paste ready command examples for manual testing
 * - **Raw Data**: Complete JSON payload inspection capabilities
 *
 * @example Basic report generation
 * ```typescript
 * const generator = new HtmlGenerator({
 *   outputDir: './test-reports',
 *   theme: 'auto',
 *   includeCurlCommands: true
 * });
 *
 * const testResults = {
 *   summary: { total: 10, passed: 8, failed: 2 },
 *   steps: [...] // Test step results
 * };
 *
 * await generator.generateReport(testResults, './test-reports/results.html');
 * console.log('Report generated successfully');
 * ```
 *
 * @example Advanced configuration with custom templates
 * ```typescript
 * const generator = new HtmlGenerator({
 *   templateDir: './custom-templates',
 *   outputDir: './reports',
 *   theme: 'dark',
 *   includeCurlCommands: false,
 *   includeRawData: true
 * });
 *
 * await generator.generateReport(results, './reports/api-test-results.html');
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class HtmlGenerator {
  /** Modern modular HTML generator instance */
  private modularGenerator: ModularHtmlGenerator;

  /** Configuration options for report generation */
  private options: HTMLGeneratorOptions;

  /**
   * Creates a new HtmlGenerator instance with specified configuration.
   *
   * @param options - Configuration options for HTML report generation
   *
   * @remarks
   * The constructor initializes the generator with default options and creates
   * an internal ModularHtmlGenerator instance for actual report generation.
   * Default options provide sensible values for common use cases.
   *
   * @example
   * ```typescript
   * // Use default configuration
   * const generator = new HtmlGenerator();
   *
   * // Custom configuration
   * const generator = new HtmlGenerator({
   *   outputDir: './custom-reports',
   *   theme: 'dark',
   *   includeCurlCommands: false
   * });
   * ```
   */
  constructor(options: HTMLGeneratorOptions = {}) {
    this.modularGenerator = new ModularHtmlGenerator();
    this.options = {
      outputDir: "./results",
      includeCurlCommands: true,
      includeRawData: true,
      theme: "auto",
      ...options,
    };
  }

  /**
   * Generates an HTML report from test execution data.
   *
   * @param data - Test execution results and metadata to include in the report
   * @param outputPath - File path where the HTML report should be saved
   * @returns Promise that resolves when the report is successfully generated
   *
   * @remarks
   * This method maintains compatibility with the original API while leveraging
   * the modern modular generator internally. It handles file system operations
   * including directory creation and provides comprehensive error handling.
   *
   * The generated HTML report includes:
   * - Interactive test result summary with filtering capabilities
   * - Detailed step-by-step execution information
   * - Performance metrics and timing analysis
   * - Error details with stack traces and debugging information
   * - Optional cURL command examples for manual testing
   * - Raw JSON data inspection panels
   *
   * @throws Will throw an error if file writing fails or data is invalid
   *
   * @example Basic report generation
   * ```typescript
   * const results = {
   *   summary: {
   *     total: 25,
   *     passed: 23,
   *     failed: 2,
   *     duration: 15420
   *   },
   *   steps: [
   *     {
   *       name: 'User Login',
   *       status: 'passed',
   *       duration: 234,
   *       assertions: [...]
   *     }
   *   ]
   * };
   *
   * await generator.generateReport(results, './reports/test-results.html');
   * ```
   *
   * @example Error handling
   * ```typescript
   * try {
   *   await generator.generateReport(testData, outputPath);
   *   console.log('Report generated successfully');
   * } catch (error) {
   *   console.error('Failed to generate report:', error.message);
   * }
   * ```
   */
  async generateReport(data: any, outputPath: string): Promise<void> {
    try {
      const htmlContent = this.modularGenerator.generate(data);

      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Escrever arquivo
      fs.writeFileSync(outputPath, htmlContent, "utf8");

      console.log(`[INFO] Relatório HTML gerado: ${outputPath}`);
    } catch (error) {
      console.error("[ERRO] Falha ao gerar relatório HTML:", error);
      throw error;
    }
  }

  /**
   * Método para gerar HTML sem salvar (usado por outros métodos)
   */
  generateHTML(data: any, outputPath?: string): Promise<string> {
    const htmlContent = this.modularGenerator.generate(data);

    if (outputPath) {
      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Escrever arquivo
      fs.writeFileSync(outputPath, htmlContent, "utf8");

      // Também criar latest.html
      const latestPath = path.join(path.dirname(outputPath), "latest.html");
      fs.writeFileSync(latestPath, htmlContent, "utf8");

      console.log(`[INFO] Relatório HTML gerado: ${outputPath}`);

      return Promise.resolve(outputPath);
    }

    // Se não há outputPath, retorna o conteúdo HTML
    return Promise.resolve(htmlContent);
  }

  /**
   * Método para gerar de JSON (compatibilidade com CLI)
   */
  async generateFromJSON(
    jsonPath: string,
    outputPath?: string
  ): Promise<string> {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      if (!outputPath) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const baseName = path.basename(jsonPath, path.extname(jsonPath));
        outputPath = path.join(
          this.options.outputDir || "./results",
          `${baseName}_${timestamp}.html`
        );
      }

      await this.generateHTML(jsonData, outputPath);
      return outputPath;
    } catch (error) {
      console.error("[ERRO] Falha ao gerar relatório de JSON:", error);
      throw error;
    }
  }
}

// Classe principal exportada para compatibilidade
export class HTMLReportGenerator extends HtmlGenerator {
  constructor(options: HTMLGeneratorOptions = {}) {
    super(options);
  }
}
