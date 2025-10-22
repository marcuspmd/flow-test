/**
 * @fileoverview Report Strategy interface defining the contract for different report formats
 */

import type { AggregatedResult } from "../../../types/engine.types";

/**
 * Context information for report generation
 */
export interface ReportGenerationContext {
  outputDir: string;
  baseName: string;
  timestamp: string;
  generatedAt: string;
  assets?: ReportAsset[];
}

/**
 * Asset metadata for cross-referencing between reports
 */
export interface ReportAsset {
  type: "html" | "json" | "qa";
  scope: "aggregate" | "suite";
  absolutePath: string;
  relativePath: string;
  fileName: string;
  suite?: {
    node_id: string;
    suite_name: string;
  };
}

/**
 * Result of report generation
 */
export interface ReportGenerationResult {
  format: string;
  files: string[];
  assets?: ReportAsset[];
  success: boolean;
  error?: string;
}

/**
 * Strategy interface for different report formats (JSON, HTML, QA, etc.)
 */
export interface ReportStrategy {
  /**
   * Get the format identifier for this strategy
   */
  getFormat(): string;

  /**
   * Generate the report
   * @param result - Aggregated test execution result
   * @param context - Generation context with paths and metadata
   * @returns Generation result with file paths and assets
   */
  generate(
    result: AggregatedResult,
    context: ReportGenerationContext
  ): Promise<ReportGenerationResult>;

  /**
   * Validate if the strategy can generate report with current configuration
   * @param result - Aggregated result to validate
   * @returns true if can generate, false otherwise
   */
  validate(result: AggregatedResult): boolean;
}
