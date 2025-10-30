/**
 * @fileoverview QA Report Strategy - generates QA/tester-friendly JSON reports
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { AggregatedResult } from "../../../types/engine.types";
import type {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
} from "./ReportStrategy.interface";
import { LoggerService } from "../../logger.service";
import { QAReportService } from "../../qa-report.service";

/**
 * Module-level logger instance for QA report strategy
 */
const logger = new LoggerService();

/**
 * Strategy for generating QA/tester-friendly reports
 */
export class QAReportStrategy implements ReportStrategy {
  private qaReportService = new QAReportService();

  getFormat(): string {
    return "qa";
  }

  validate(result: AggregatedResult): boolean {
    return result !== null && result !== undefined;
  }

  async generate(
    result: AggregatedResult,
    context: ReportGenerationContext
  ): Promise<ReportGenerationResult> {
    try {
      const { outputDir, baseName, timestamp, generatedAt } = context;

      // Generate file names
      const fileName = `${baseName}_qa_${timestamp}.json`;
      const filePath = path.join(outputDir, fileName);
      const latestPath = path.join(outputDir, "latest-qa.json");

      // Transform to QA-friendly format
      const qaReport = this.qaReportService.transformToQAReport(result);

      const qaReportData = {
        ...qaReport,
        report_metadata: {
          generated_at: generatedAt,
          format: "qa",
          version: "1.0.0",
          run_id: timestamp,
          description:
            "QA/Tester-friendly report format designed for documentation and HTML/PDF generation",
        },
      };

      const jsonContent = JSON.stringify(qaReportData, null, 2);

      // Write timestamped report
      fs.writeFileSync(filePath, jsonContent, "utf8");
      logger.info(`QA report: ${filePath}`);
      console.log(chalk.green(`   ✓ QA report saved: ${chalk.cyan(filePath)}`));

      // Write latest snapshot
      fs.writeFileSync(latestPath, jsonContent, "utf8");
      logger.info(`Latest QA report: ${latestPath}`);
      console.log(
        chalk.green(`   ✓ Latest QA snapshot: ${chalk.cyan(latestPath)}`)
      );

      return {
        format: this.getFormat(),
        files: [filePath, latestPath],
        success: true,
      };
    } catch (error) {
      logger.error("Failed to generate QA report", {
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
