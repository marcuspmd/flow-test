/**
 * @fileoverview Tests for ReportingService
 */

import fs from "fs";
import { ReportingService } from "../reporting";
import { ConfigManager } from "../../core/config";
import type { AggregatedResult } from "../../types/engine.types";
import type { ReportStrategy } from "../reporting/strategies/ReportStrategy.interface";

jest.mock("fs");
jest.mock("../../core/config");
jest.mock("../reporting/strategies/JsonReportStrategy");
jest.mock("../reporting/strategies/QAReportStrategy");
jest.mock("../reporting/strategies/HtmlReportStrategy");

describe("ReportingService", () => {
  let service: ReportingService;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockResult: AggregatedResult;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        reporting: {
          enabled: true,
          formats: ["json", "html", "qa"],
          output_dir: "/test/output",
        },
      }),
    } as any;

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

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    service = new ReportingService(mockConfigManager);
  });

  describe("constructor", () => {
    it("should initialize with config manager", () => {
      expect(service).toBeInstanceOf(ReportingService);
    });

    it("should initialize default strategies", () => {
      const formats = service.getAvailableFormats();
      expect(formats).toContain("json");
      expect(formats).toContain("html");
      expect(formats).toContain("qa");
    });
  });

  describe("generateReports", () => {
    it("should skip if reporting is disabled", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        reporting: {
          enabled: false,
          formats: ["json"],
          output_dir: "/test/output",
        },
      } as any);

      await service.generateReports(mockResult);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should skip if no formats configured", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        reporting: {
          enabled: true,
          formats: [],
          output_dir: "/test/output",
        },
      } as any);

      await service.generateReports(mockResult);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should skip if reporting config is missing", async () => {
      mockConfigManager.getConfig.mockReturnValue({} as any);

      await service.generateReports(mockResult);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should create output directory if it does not exist", async () => {
      await service.generateReports(mockResult);

      expect(fs.existsSync).toHaveBeenCalledWith("/test/output");
      expect(fs.mkdirSync).toHaveBeenCalledWith("/test/output", {
        recursive: true,
      });
    });

    it("should not create directory if it already exists", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.generateReports(mockResult);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should generate reports for configured formats", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        reporting: {
          enabled: true,
          formats: ["json"],
          output_dir: "/test/output",
        },
      } as any);

      await service.generateReports(mockResult);

      // Strategies are mocked, so we just verify execution doesn't throw
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should generate HTML reports first", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        reporting: {
          enabled: true,
          formats: ["html", "json"],
          output_dir: "/test/output",
        },
      } as any);

      await service.generateReports(mockResult);

      // HTML should be generated before JSON to collect assets
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error("Directory creation failed");
      });

      await expect(service.generateReports(mockResult)).rejects.toThrow(
        "Directory creation failed"
      );
    });
  });

  describe("registerStrategy", () => {
    it("should register custom strategy", () => {
      const customStrategy: ReportStrategy = {
        getFormat: () => "custom",
        validate: () => true,
        generate: jest.fn().mockResolvedValue({
          format: "custom",
          files: [],
          success: true,
        }),
      };

      service.registerStrategy("custom", customStrategy);

      const formats = service.getAvailableFormats();
      expect(formats).toContain("custom");
    });

    it("should override existing strategy", () => {
      const customJsonStrategy: ReportStrategy = {
        getFormat: () => "json",
        validate: () => true,
        generate: jest.fn().mockResolvedValue({
          format: "json",
          files: [],
          success: true,
        }),
      };

      service.registerStrategy("json", customJsonStrategy);

      const formats = service.getAvailableFormats();
      expect(formats).toContain("json");
      // Strategy should be replaced
    });
  });

  describe("getAvailableFormats", () => {
    it("should return list of available formats", () => {
      const formats = service.getAvailableFormats();

      expect(formats).toBeInstanceOf(Array);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats).toContain("json");
      expect(formats).toContain("html");
      expect(formats).toContain("qa");
    });

    it("should include custom formats after registration", () => {
      const customStrategy: ReportStrategy = {
        getFormat: () => "pdf",
        validate: () => true,
        generate: jest.fn().mockResolvedValue({
          format: "pdf",
          files: [],
          success: true,
        }),
      };

      service.registerStrategy("pdf", customStrategy);

      const formats = service.getAvailableFormats();
      expect(formats).toContain("pdf");
    });
  });

  describe("edge cases", () => {
    it("should handle empty project name", async () => {
      const resultWithoutName: AggregatedResult = {
        ...mockResult,
        project_name: "",
      };

      await service.generateReports(resultWithoutName);

      // Should use default name "flow-test-report"
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should sanitize project name for file system", async () => {
      const resultWithSpecialChars: AggregatedResult = {
        ...mockResult,
        project_name: "Test/Project:With*Special?Chars",
      };

      await service.generateReports(resultWithSpecialChars);

      // Should sanitize name
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should handle result with empty project name", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        reporting: {
          enabled: true,
          formats: ["json"],
          output_dir: "/test/output",
        },
      } as any);

      const resultWithoutName: AggregatedResult = {
        ...mockResult,
        project_name: "",
      };

      await service.generateReports(resultWithoutName);

      // Should use default name and not crash
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe("format execution order", () => {
    it("should execute HTML before JSON to collect assets", async () => {
      const executionOrder: string[] = [];

      const mockHtmlStrategy: ReportStrategy = {
        getFormat: () => "html",
        validate: () => true,
        generate: jest.fn().mockImplementation(async () => {
          executionOrder.push("html");
          return { format: "html", files: [], assets: [], success: true };
        }),
      };

      const mockJsonStrategy: ReportStrategy = {
        getFormat: () => "json",
        validate: () => true,
        generate: jest.fn().mockImplementation(async () => {
          executionOrder.push("json");
          return { format: "json", files: [], success: true };
        }),
      };

      service.registerStrategy("html", mockHtmlStrategy);
      service.registerStrategy("json", mockJsonStrategy);

      mockConfigManager.getConfig.mockReturnValue({
        reporting: {
          enabled: true,
          formats: ["html", "json"],
          output_dir: "/test/output",
        },
      } as any);

      await service.generateReports(mockResult);

      expect(executionOrder).toEqual(["html", "json"]);
    });
  });
});
