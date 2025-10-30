/**
 * @fileoverview Tests for QA Report Strategy
 */

import fs from "fs";
import path from "path";
import { QAReportStrategy } from "../QAReportStrategy";
import type { AggregatedResult } from "../../../../types/config.types";
import type { ReportGenerationContext } from "../ReportStrategy.interface";

jest.mock("fs");

describe("QAReportStrategy", () => {
  let strategy: QAReportStrategy;
  let mockResult: AggregatedResult;
  let mockContext: ReportGenerationContext;

  beforeEach(() => {
    strategy = new QAReportStrategy();
    jest.clearAllMocks();

    mockResult = {
      project_name: "Test Project",
      start_time: "2024-01-01T00:00:00.000Z",
      end_time: "2024-01-01T00:00:01.000Z",
      total_duration_ms: 1000,
      total_tests: 1,
      successful_tests: 1,
      failed_tests: 0,
      skipped_tests: 0,
      success_rate: 100,
      suites_results: [],
      global_variables_final_state: {},
    } as AggregatedResult;

    mockContext = {
      outputDir: "/test/output",
      baseName: "test-report",
      timestamp: "20240101_000000",
      generatedAt: "2024-01-01T00:00:00.000Z",
      assets: [],
    };
  });

  describe("getFormat", () => {
    it("should return qa format", () => {
      expect(strategy.getFormat()).toBe("qa");
    });
  });

  describe("validate", () => {
    it("should return true for valid result", () => {
      expect(strategy.validate(mockResult)).toBe(true);
    });

    it("should return false for null result", () => {
      expect(strategy.validate(null as any)).toBe(false);
    });

    it("should return false for undefined result", () => {
      expect(strategy.validate(undefined as any)).toBe(false);
    });
  });

  describe("generate", () => {
    beforeEach(() => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it("should generate QA report successfully", async () => {
      const result = await strategy.generate(mockResult, mockContext);

      expect(result.success).toBe(true);
      expect(result.format).toBe("qa");
      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toBe(
        path.join("/test/output", "test-report_qa_20240101_000000.json")
      );
      expect(result.files[1]).toBe(path.join("/test/output", "latest-qa.json"));
    });

    it("should include QA-specific metadata", async () => {
      await strategy.generate(mockResult, mockContext);

      const firstCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const writtenContent = JSON.parse(firstCall[1]);

      expect(writtenContent.report_metadata).toEqual({
        generated_at: "2024-01-01T00:00:00.000Z",
        format: "qa",
        version: "1.0.0",
        run_id: "20240101_000000",
        description:
          "QA/Tester-friendly report format designed for documentation and HTML/PDF generation",
      });
    });

    it("should handle errors gracefully", async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write failed");
      });

      const result = await strategy.generate(mockResult, mockContext);

      expect(result.success).toBe(false);
      expect(result.files).toEqual([]);
      expect(result.error).toBe("Error: Write failed");
    });

    it("should write to both timestamped and latest files", async () => {
      await strategy.generate(mockResult, mockContext);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      const calls = (fs.writeFileSync as jest.Mock).mock.calls;

      expect(calls[0][0]).toContain("test-report_qa_20240101_000000.json");
      expect(calls[1][0]).toContain("latest-qa.json");
    });
  });
});
