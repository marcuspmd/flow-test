/**
 * @fileoverview JSON Report Strategy - generates JSON format reports
 */

import fs from "fs";
import path from "path";
import type { AggregatedResult } from "../../../types/engine.types";
import type {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
} from "./ReportStrategy.interface";
import { LoggerService } from "../../logger.service";
import { ReportingUtils } from "../utils/ReportingUtils";

/**
 * Module-level logger instance for JSON report strategy
 */
const logger = new LoggerService();

/**
 * Strategy for generating JSON reports
 */
export class JsonReportStrategy implements ReportStrategy {
  getFormat(): string {
    return "json";
  }

  validate(result: AggregatedResult): boolean {
    return result !== null && result !== undefined;
  }

  async generate(
    result: AggregatedResult,
    context: ReportGenerationContext
  ): Promise<ReportGenerationResult> {
    try {
      const {
        outputDir,
        baseName,
        timestamp,
        generatedAt,
        assets = [],
      } = context;

      // Generate file names
      const fileName = `${baseName}_${timestamp}.json`;
      const filePath = path.join(outputDir, fileName);
      const latestPath = path.join(outputDir, "latest.json");

      // Build report data with metadata
      const reportData = {
        ...result,
        report_metadata: {
          generated_at: generatedAt,
          format: "json",
          version: "1.0.0",
          run_id: timestamp,
          assets: assets.map((asset) => ({
            type: asset.type,
            scope: asset.scope,
            file: asset.relativePath.replace(/\\/g, "/"),
            file_name: asset.fileName,
            suite_name: asset.suite?.suite_name,
            node_id: asset.suite?.node_id,
          })),
        },
      };

      const jsonContent = JSON.stringify(reportData, null, 2);

      // Write timestamped report
      fs.writeFileSync(filePath, jsonContent, "utf8");
      logger.info(`JSON report: ${filePath}`);

      // Write latest snapshot
      fs.writeFileSync(latestPath, jsonContent, "utf8");
      logger.info(`Latest JSON: ${latestPath}`);

      return {
        format: this.getFormat(),
        files: [filePath, latestPath],
        success: true,
      };
    } catch (error) {
      logger.error("Failed to generate JSON report", {
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
}
