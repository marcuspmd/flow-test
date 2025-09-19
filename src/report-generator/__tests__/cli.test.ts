import { jest } from "@jest/globals";

const mockGenerateReport = jest.fn();
const mockGenerateFromJSON = jest.fn<() => Promise<string>>();
const mockGetConfig = jest.fn();
const mockReadFileSync = jest.fn();
const mockCopyFileSync = jest.fn();
const mockExistsSync = jest.fn();

jest.mock("../v2/report-generator-v2", () => ({
  ReportGeneratorV2: jest.fn().mockImplementation(() => ({
    generateReport: mockGenerateReport,
  })),
}));

jest.mock("../html-generator", () => ({
  HTMLReportGenerator: jest.fn().mockImplementation(() => ({
    generateFromJSON: mockGenerateFromJSON,
  })),
}));

jest.mock("../../core/config", () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    getConfig: mockGetConfig,
  })),
}));

jest.mock("fs", () => ({
  readFileSync: mockReadFileSync,
  copyFileSync: mockCopyFileSync,
  existsSync: mockExistsSync,
  mkdirSync: jest.fn(),
}));

describe("CLI Report Generator", () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;

  const mockConsoleLog = jest.fn();
  const mockConsoleError = jest.fn();
  const mockProcessExit = jest.fn();

  const sampleResult = {
    project_name: "Demo",
    total_tests: 1,
    successful_tests: 1,
    failed_tests: 0,
    success_rate: 100,
    total_duration_ms: 1000,
    suites_results: [],
  };

  async function runCli(): Promise<void> {
    jest.isolateModules(() => {
      require("../cli");
    });

    await new Promise((resolve) => setImmediate(resolve));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    process.exit = mockProcessExit as any;
    process.argv = ["node", "cli"];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(sampleResult));
    mockGenerateFromJSON.mockResolvedValue("/tmp/report.html");
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  it("uses ReportGeneratorV2 when configured", async () => {
    mockGetConfig.mockReturnValue({
      reporting: { version: "v2", output_dir: "./results" },
    });

    await runCli();

    expect(mockGenerateReport).toHaveBeenCalled();
    expect(mockGenerateFromJSON).not.toHaveBeenCalled();
    expect(mockCopyFileSync).toHaveBeenCalled();
    expect(mockConsoleError).not.toHaveBeenCalled();
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  it("falls back to legacy generator when version is v1", async () => {
    mockGetConfig.mockReturnValue({
      reporting: { version: "v1", output_dir: "./results" },
    });

    await runCli();

    expect(mockGenerateFromJSON).toHaveBeenCalled();
    expect(mockGenerateReport).not.toHaveBeenCalled();
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  it("exits with error when JSON file is missing", async () => {
    mockGetConfig.mockReturnValue({
      reporting: { version: "v2", output_dir: "./results" },
    });
    mockExistsSync.mockReturnValue(false);

    await runCli();

    expect(mockConsoleError).toHaveBeenCalledWith(
      "❌ Error generating HTML report:",
      expect.stringContaining("JSON report not found")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
