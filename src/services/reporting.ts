/**
 * @fileoverview Reporting service responsible for persisting execution results using Strategy Pattern.
 *
 * @remarks
 * This service orchestrates different report generation strategies (JSON, HTML, QA) based on
 * configuration. It follows the Strategy Pattern to promote maintainability and extensibility.
 *
 * The previous monolithic implementation (~2600 lines) has been refactored into:
 * - Reusable strategies (JsonReportStrategy, HtmlReportStrategy, QAReportStrategy)
 * - Shared utilities (ReportingUtils)
 * - Dedicated HTML template renderer (HtmlTemplateRenderer)
 */

import fs from "fs";
import { ConfigManager } from "../core/config";
import type { AggregatedResult } from "../types/engine.types";
import { getLogger } from "./logger.service";
import {
  ReportStrategy,
  ReportGenerationContext,
  ReportAsset,
} from "./reporting/strategies/ReportStrategy.interface";
import { JsonReportStrategy } from "./reporting/strategies/JsonReportStrategy";
import { QAReportStrategy } from "./reporting/strategies/QAReportStrategy";
import { HtmlReportStrategy } from "./reporting/strategies/HtmlReportStrategy";
import { ReportingUtils } from "./reporting/utils/ReportingUtils";

/**
 * Main reporting service that orchestrates different report generation strategies
 */
export class ReportingService {
  private configManager: ConfigManager;
  private logger = getLogger();
  private strategies: Map<string, ReportStrategy> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.initializeStrategies();
  }

  /**
   * Initialize available report strategies
   */
  private initializeStrategies(): void {
    this.strategies.set("json", new JsonReportStrategy());
    this.strategies.set("qa", new QAReportStrategy());
    this.strategies.set("html", new HtmlReportStrategy(this.configManager));
  }

  /**
   * Generates all configured reports using the appropriate strategies
   *
   * @param result - Aggregated test execution result
   */
  async generateReports(result: AggregatedResult): Promise<void> {
    const config = this.configManager.getConfig();
    const reportingConfig = config.reporting;

    // Validate reporting configuration
    if (
      !reportingConfig ||
      reportingConfig.enabled === false ||
      !reportingConfig.formats ||
      reportingConfig.formats.length === 0
    ) {
      this.logger.debug("Reporting disabled or no formats configured", {
        metadata: { type: "reporting_skipped" },
      });
      return;
    }

    const outputDir = reportingConfig.output_dir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Prepare generation context
    const timestamp = ReportingUtils.generateTimestamp();
    const generatedAt = new Date().toISOString();
    const baseName =
      ReportingUtils.sanitizeFileName(result.project_name) || "flow-test-report";

    const formats = reportingConfig.formats || ["json"];

    // Assets collection (shared across strategies)
    const assets: ReportAsset[] = [];

    // Generate HTML reports first (to collect assets for JSON metadata)
    if (formats.includes("html")) {
      await this.executeStrategy(
        "html",
        result,
        {
          outputDir,
          baseName,
          timestamp,
          generatedAt,
          assets,
        },
        assets
      );
    }

    // Generate JSON report with HTML assets metadata
    if (formats.includes("json")) {
      await this.executeStrategy("json", result, {
        outputDir,
        baseName,
        timestamp,
        generatedAt,
        assets,
      });
    }

    // Generate QA report
    if (formats.includes("qa")) {
      await this.executeStrategy("qa", result, {
        outputDir,
        baseName,
        timestamp,
        generatedAt,
      });
    }
  }

  /**
   * Execute a specific report generation strategy
   */
  private async executeStrategy(
    format: string,
    result: AggregatedResult,
    context: ReportGenerationContext,
    assetsAccumulator?: ReportAsset[]
  ): Promise<void> {
    const strategy = this.strategies.get(format);

    if (!strategy) {
      this.logger.warn(`No strategy found for format: ${format}`);
      return;
    }

    if (!strategy.validate(result)) {
      this.logger.warn(`Strategy validation failed for format: ${format}`);
      return;
    }

    try {
      const generationResult = await strategy.generate(result, context);

      if (generationResult.success) {
        this.logger.debug(`Successfully generated ${format} report`, {
          metadata: {
            format,
            files: generationResult.files.length,
          },
        });

        // Accumulate assets if provided
        if (assetsAccumulator && generationResult.assets) {
          assetsAccumulator.push(...generationResult.assets);
        }
      } else {
        this.logger.error(`Failed to generate ${format} report`, {
          metadata: {
            format,
            error: generationResult.error || "Unknown error",
          },
        });
      }
    } catch (error) {
      this.logger.error(`Exception during ${format} report generation`, {
        metadata: {
          format,
          error: String(error),
        },
      });
    }
  }

  /**
   * Register a custom report strategy
   *
   * @param format - Format identifier
   * @param strategy - Strategy implementation
   */
  registerStrategy(format: string, strategy: ReportStrategy): void {
    this.strategies.set(format, strategy);
    this.logger.debug(`Registered custom strategy for format: ${format}`);
  }

  /**
   * Get list of available report formats
   */
  getAvailableFormats(): string[] {
    return Array.from(this.strategies.keys());
  }
}
