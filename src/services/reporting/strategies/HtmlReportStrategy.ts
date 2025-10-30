/**
 * @fileoverview HTML Report Strategy - generates HTML format reports
 */

import fs from "fs";
import path from "path";
import type {
  AggregatedResult,
  SuiteExecutionResult,
} from "../../../types/engine.types";
import type {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
  ReportAsset,
} from "./ReportStrategy.interface";
import { LoggerService } from "../../logger.service";
import { ReportingUtils } from "../utils/ReportingUtils";
import {
  HtmlTemplateRenderer,
  SuiteHtmlEntry,
} from "../templates/HtmlTemplateRenderer";
import { ConfigManager } from "../../../core/config";

/**
 * Module-level logger instance for HTML report strategy
 */
const logger = new LoggerService();

/**
 * Strategy for generating HTML reports (aggregate + per-suite)
 */
export class HtmlReportStrategy implements ReportStrategy {
  private renderer = new HtmlTemplateRenderer();
  private configManager: ConfigManager;
  private logger = logger; // Use module-level logger

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  getFormat(): string {
    return "html";
  }

  validate(result: AggregatedResult): boolean {
    return result !== null && result !== undefined;
  }

  async generate(
    result: AggregatedResult,
    context: ReportGenerationContext
  ): Promise<ReportGenerationResult> {
    try {
      const htmlConfig = this.configManager.getConfig().reporting?.html || {};
      const htmlRoot = path.join(
        context.outputDir,
        htmlConfig.output_subdir || "html"
      );

      // Ensure HTML output directory exists
      if (!fs.existsSync(htmlRoot)) {
        fs.mkdirSync(htmlRoot, { recursive: true });
      }

      const assets: ReportAsset[] = [];
      const suiteEntries: SuiteHtmlEntry[] = [];

      // Generate per-suite HTML files
      if (htmlConfig.per_suite !== false) {
        this.generateSuiteReports(
          result,
          htmlRoot,
          context,
          assets,
          suiteEntries
        );
      }

      // Generate aggregate summary HTML
      if (htmlConfig.aggregate !== false) {
        this.generateAggregateReport(
          result,
          htmlRoot,
          context,
          assets,
          suiteEntries
        );
      }

      // Create "latest" snapshot directory
      this.createLatestSnapshot(htmlRoot, assets);

      return {
        format: this.getFormat(),
        files: assets.map((a) => a.absolutePath),
        assets,
        success: true,
      };
    } catch (error) {
      this.logger.error("Failed to generate HTML reports", {
        metadata: { error: String(error) },
      });

      return {
        format: this.getFormat(),
        files: [],
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Generate individual suite HTML files
   */
  private generateSuiteReports(
    result: AggregatedResult,
    htmlRoot: string,
    context: ReportGenerationContext,
    assets: ReportAsset[],
    suiteEntries: SuiteHtmlEntry[]
  ): void {
    result.suites_results.forEach((suite, index) => {
      const sanitizedName =
        ReportingUtils.sanitizeFileName(suite.node_id || suite.suite_name) ||
        `suite-${index + 1}`;
      const fileName = `${sanitizedName}_${context.timestamp}.html`;
      const filePath = path.join(htmlRoot, fileName);

      // Render suite HTML using template renderer
      const suiteHtml = this.renderer.renderSuitePage(suite, {
        projectName: result.project_name,
        generatedAt: context.generatedAt,
      });

      // Write to file
      fs.writeFileSync(filePath, suiteHtml, "utf8");

      // Track asset
      const asset: ReportAsset = {
        type: "html",
        scope: "suite",
        absolutePath: filePath,
        relativePath: path.relative(context.outputDir, filePath),
        fileName,
        suite: {
          node_id: suite.node_id,
          suite_name: suite.suite_name,
        },
      };

      assets.push(asset);
      suiteEntries.push({ suite, fileName });

      this.logger.info(`HTML report (suite): ${filePath}`);
    });
  }

  /**
   * Generate aggregate summary HTML file
   */
  private generateAggregateReport(
    result: AggregatedResult,
    htmlRoot: string,
    context: ReportGenerationContext,
    assets: ReportAsset[],
    suiteEntries: SuiteHtmlEntry[]
  ): void {
    const baseName =
      ReportingUtils.sanitizeFileName(result.project_name) ||
      "flow-test-report";
    const summaryFileName = `${baseName}-summary_${context.timestamp}.html`;
    const indexFileName = `index_${context.timestamp}.html`;

    const summaryPath = path.join(htmlRoot, summaryFileName);
    const indexPath = path.join(htmlRoot, indexFileName);

    // Render summary HTML using template renderer
    const summaryHtml = this.renderer.renderSummaryPage(result, suiteEntries, {
      projectName: result.project_name,
      generatedAt: context.generatedAt,
      timestamp: context.timestamp,
    });

    // Write index file
    fs.writeFileSync(indexPath, summaryHtml, "utf8");
    this.logger.info(`HTML report (summary): ${indexPath}`);

    // Write summary alias if different
    if (summaryFileName !== indexFileName) {
      fs.writeFileSync(summaryPath, summaryHtml, "utf8");
      this.logger.info(`HTML report (summary alias): ${summaryPath}`);
    }

    // Track aggregate asset
    const aggregateAsset: ReportAsset = {
      type: "html",
      scope: "aggregate",
      absolutePath: indexPath,
      relativePath: path.relative(context.outputDir, indexPath),
      fileName: indexFileName,
    };

    assets.unshift(aggregateAsset);
  }

  /**
   * Create "latest" snapshot directory with copies of all HTML files
   */
  private createLatestSnapshot(htmlRoot: string, assets: ReportAsset[]): void {
    const latestDir = path.join(htmlRoot, "latest");

    // Remove old latest directory
    if (fs.existsSync(latestDir)) {
      fs.rmSync(latestDir, { recursive: true, force: true });
    }

    // Create new latest directory
    fs.mkdirSync(latestDir, { recursive: true });

    // Copy all HTML assets to latest
    for (const asset of assets) {
      const destinationPath = path.join(latestDir, asset.fileName);
      fs.copyFileSync(asset.absolutePath, destinationPath);
    }

    this.logger.debug(`Created latest HTML snapshot in: ${latestDir}`);
  }
}
