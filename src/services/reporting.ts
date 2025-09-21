/**
 * @fileoverview Reporting service responsible for persisting execution results as JSON.
 *
 * @remarks
 * With the introduction of the standalone report dashboard, the core engine now
 * focuses solely on producing the canonical JSON artifact. Consumers that need
 * HTML or other visualizations should rely on the dashboard project to transform
 * the generated JSON file.
 */

import fs from "fs";
import path from "path";
import { ConfigManager } from "../core/config";
import { AggregatedResult } from "../types/engine.types";
import { getLogger } from "./logger.service";

export class ReportingService {
  private configManager: ConfigManager;
  private logger = getLogger();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Generates all configured reports. The only supported format is JSON.
   */
  async generateReports(result: AggregatedResult): Promise<void> {
    const config = this.configManager.getConfig();
    const outputDir = config.reporting!.output_dir;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = this.generateTimestamp();
    const baseName = this.sanitizeFileName(result.project_name);

    await this.generateJsonReport(result, outputDir, baseName, timestamp);
  }

  /**
   * Persists the aggregated result as JSON and keeps a copy named `latest.json`.
   */
  private async generateJsonReport(
    result: AggregatedResult,
    outputDir: string,
    baseName: string,
    timestamp: string
  ): Promise<void> {
    const fileName = `${baseName}_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);
    const latestPath = path.join(outputDir, "latest.json");

    const reportData = {
      ...result,
      report_metadata: {
        generated_at: new Date().toISOString(),
        format: "json",
        version: "1.0.0",
      },
    };

    const jsonContent = JSON.stringify(reportData, null, 2);

    fs.writeFileSync(filePath, jsonContent, "utf8");
    this.logger.info(`JSON report: ${filePath}`);

    fs.writeFileSync(latestPath, jsonContent, "utf8");
    this.logger.info(`Latest JSON: ${latestPath}`);
  }

  private generateTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace(/T/, "_")
      .slice(0, 19);
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
