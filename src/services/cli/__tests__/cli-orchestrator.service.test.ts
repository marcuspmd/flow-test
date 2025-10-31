import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CLIOrchestrator } from "../cli-orchestrator.service";
import type { ParsedCLIArguments } from "../cli-argument-parser.service";

const parserMocks = {
  parse: jest.fn<ParsedCLIArguments, [string[]]>(),
  validate: jest.fn<string[], [ParsedCLIArguments]>(),
};

jest.mock("../cli-argument-parser.service", () => {
  const actual = jest.requireActual("../cli-argument-parser.service");
  return {
    ...actual,
    CLIArgumentParser: jest.fn(() => parserMocks),
  };
});

const inlineExecutorMock = {
  execute: jest.fn<Promise<number>, [any]>(),
};

jest.mock("../inline-yaml-executor.service", () => ({
  InlineYamlExecutor: jest.fn(() => inlineExecutorMock),
}));

const projectResolverMock = {
  resolveProjectRoot: jest.fn<string, [string]>(),
  loadConfiguredTestRoots: jest.fn<string[], [string]>(),
  determineDependencySearchRoots: jest.fn<string[], [string, string, string[]]>(),
};

jest.mock("../project-path-resolver.service", () => ({
  ProjectPathResolver: jest.fn(() => projectResolverMock),
}));

const dependencyDiscoveryMock = {
  autoDiscoverDependencies: jest.fn<Promise<{ nodeIds: string[]; filePaths: string[] }>, [any, string, any]>(),
};

jest.mock("../dependency-discovery.service", () => ({
  DependencyDiscoveryService: jest.fn(() => dependencyDiscoveryMock),
}));

const hookManagerMock = {
  createConsoleHooks: jest.fn(() => ({ onExecutionStart: jest.fn() })),
  createRealtimeHooks: jest.fn(() => [{ onExecutionStart: jest.fn() }, { close: jest.fn() }, "run-1"] as const),
  mergeHooks: jest.fn((a, b) => ({ ...a, ...b })),
};

jest.mock("../hook-manager.service", () => ({
  HookManager: jest.fn(() => hookManagerMock),
}));

const flowEngineMock = {
  run: jest.fn<Promise<any>, []>(),
  dryRun: jest.fn<Promise<any[]>, []>(),
};

jest.mock("../../../core/engine", () => ({
  FlowTestEngine: jest.fn(),
}));

const { FlowTestEngine: FlowTestEngineMock } = jest.requireMock("../../../core/engine") as {
  FlowTestEngine: jest.Mock;
};

FlowTestEngineMock.mockImplementation(() => flowEngineMock);

const logSessionMock = {
  update: jest.fn(),
  end: jest.fn(),
};

const logStreamInstance = {
  beginSession: jest.fn(() => logSessionMock),
};

jest.mock("../../log-streaming.service", () => ({
  LogStreamingService: {
    getInstance: jest.fn(() => logStreamInstance),
  },
}));

const loggerMock = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLoggerAdapter: jest.fn(),
};

jest.mock("../../logger.service", () => ({
  LoggerService: jest.fn(() => loggerMock),
  ConsoleLoggerAdapter: jest.fn(() => ({})),
}));

const createParsedArgs = (overrides: Partial<ParsedCLIArguments> = {}): ParsedCLIArguments => ({
  options: { verbosity: "simple", ...(overrides.options ?? {}) } as any,
  showHelp: false,
  showVersion: false,
  dryRun: false,
  postmanPreserveFolders: false,
  postmanAnalyzeDeps: false,
  runnerInteractiveMode: false,
  disableReporting: false,
  ...overrides,
});

describe("CLIOrchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    parserMocks.parse.mockReset();
    parserMocks.validate.mockReset();
    inlineExecutorMock.execute.mockReset();
    dependencyDiscoveryMock.autoDiscoverDependencies.mockReset();
    projectResolverMock.resolveProjectRoot.mockReset();
    projectResolverMock.loadConfiguredTestRoots.mockReset();
    projectResolverMock.determineDependencySearchRoots.mockReset();
    hookManagerMock.createConsoleHooks.mockClear();
    hookManagerMock.createRealtimeHooks.mockClear();
    hookManagerMock.mergeHooks.mockClear();
    flowEngineMock.run.mockReset();
    flowEngineMock.dryRun.mockReset();
    logStreamInstance.beginSession.mockClear();
    logSessionMock.update.mockReset();
    logSessionMock.end.mockReset();
    FlowTestEngineMock.mockClear();
  });

  it("returns 1 and logs validation errors", async () => {
    const parsed = createParsedArgs();
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue(["bad combo"]);

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(1);
    expect(loggerMock.error).toHaveBeenCalledWith("❌ bad combo");
    expect(FlowTestEngineMock).not.toHaveBeenCalled();
  });

  it("short circuits when help flag is provided", async () => {
    const parsed = createParsedArgs({ showHelp: true });
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(0);
    expect(FlowTestEngineMock).not.toHaveBeenCalled();
  });

  it("delegates inline execution", async () => {
    const parsed = createParsedArgs({
      inlineYamlArg: "node_id: demo",
      inlineBaseDir: "/tmp/base",
      inlineRelativePath: "inline.yaml",
      options: { verbosity: "verbose" } as any,
    });
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);
    inlineExecutorMock.execute.mockResolvedValue(0);

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(0);
    expect(inlineExecutorMock.execute).toHaveBeenCalledWith({
      yamlContent: "node_id: demo",
      baseDir: "/tmp/base",
      relativePath: "inline.yaml",
      options: parsed.options,
      configFile: undefined,
      runnerInteractiveMode: false,
    });
  });

  it("runs dry run flow", async () => {
    const parsed = createParsedArgs({ dryRun: true });
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);
    flowEngineMock.dryRun.mockResolvedValue([
      { suite_name: "Suite A", priority: "high" },
    ]);

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(0);
    expect(flowEngineMock.dryRun).toHaveBeenCalled();
    expect(logSessionMock.update).toHaveBeenCalledWith({
      metadata: {
        planSize: 1,
        suites: ["Suite A"],
      },
    });
    expect(logSessionMock.end).toHaveBeenCalledWith("completed");
  });

  it("runs test execution and logs summary", async () => {
    const parsed = createParsedArgs({
      dryRun: false,
      options: { verbosity: "simple" } as any,
    });
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);
    flowEngineMock.run.mockResolvedValue({
      success_rate: 100,
      failed_tests: 0,
      successful_tests: 3,
      total_tests: 3,
    });

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(0);
    expect(flowEngineMock.run).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining("🏁 Execution completed with 100.0% success rate")
    );
  });

  it("merges realtime hooks and propagates live run metadata", async () => {
    const parsed = createParsedArgs({
      liveEventsPath: "events/live.jsonl",
      options: { reporting: undefined } as any,
    });
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);
    flowEngineMock.run.mockResolvedValue({
      success_rate: 100,
      failed_tests: 0,
      successful_tests: 1,
      total_tests: 1,
    });

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(0);
    expect(hookManagerMock.createRealtimeHooks).toHaveBeenCalledWith(
      "events/live.jsonl",
      expect.objectContaining(parsed.options)
    );
    expect(hookManagerMock.mergeHooks).toHaveBeenCalled();
    expect(logStreamInstance.beginSession).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        label: "CLI execution",
        source: "cli",
      })
    );
  });

  it("returns failure exit code when engine reports failing tests", async () => {
    const parsed = createParsedArgs({
      options: { verbosity: "simple" } as any,
    });
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);
    flowEngineMock.run.mockResolvedValue({
      success_rate: 42,
      failed_tests: 3,
      successful_tests: 2,
      total_tests: 5,
    });

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(1);
    expect(logSessionMock.update).toHaveBeenCalledWith({
      metadata: {
        summary: {
          successRate: 42,
          failedTests: 3,
          successfulTests: 2,
          totalTests: 5,
        },
      },
    });
    expect(logSessionMock.end).toHaveBeenCalledWith("failed");
  });

  it("handles fatal errors by logging and ending the session", async () => {
    const parsed = createParsedArgs();
    parserMocks.parse.mockReturnValue(parsed);
    parserMocks.validate.mockReturnValue([]);
    const fatalError = new Error("engine boom");
    FlowTestEngineMock.mockImplementationOnce(() => {
      throw fatalError;
    });

    const orchestrator = new CLIOrchestrator();
    const exitCode = await orchestrator.execute([]);

    expect(exitCode).toBe(1);
    expect(loggerMock.error).toHaveBeenCalledWith("❌ Fatal error:", {
      error: fatalError,
    });
    expect(logSessionMock.end).toHaveBeenCalledWith(
      "failed",
      expect.objectContaining({
        error: expect.objectContaining({
          message: fatalError.message,
        }),
      })
    );
  });

  it("prepares execution options for node-based test files", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cli-node-"));
    const testFile = path.join(projectRoot, "suite.yaml");
    fs.writeFileSync(
      testFile,
      [
        "node_id: auth-suite",
        "suite_name: Auth Suite",
        "depends:",
        "  - node_id: setup-suite",
      ].join("\n"),
      "utf8"
    );

    parserMocks.parse.mockReturnValue(
      createParsedArgs({ testFile, options: { filters: { file_patterns: [] } } as any })
    );
    parserMocks.validate.mockReturnValue([]);
    projectResolverMock.resolveProjectRoot.mockReturnValue(projectRoot);
    projectResolverMock.loadConfiguredTestRoots.mockReturnValue([]);
    projectResolverMock.determineDependencySearchRoots.mockReturnValue([projectRoot]);
    dependencyDiscoveryMock.autoDiscoverDependencies.mockResolvedValue({
      nodeIds: ["setup-suite"],
      filePaths: [path.join(projectRoot, "setup.yaml")],
    });
    flowEngineMock.run.mockResolvedValue({
      success_rate: 100,
      failed_tests: 0,
      successful_tests: 1,
      total_tests: 1,
    });

    const orchestrator = new CLIOrchestrator();
    await orchestrator.execute([]);

    expect(FlowTestEngineMock).toHaveBeenCalled();
    const engineCall = (FlowTestEngineMock.mock.calls as any[])[FlowTestEngineMock.mock.calls.length - 1];
    const engineOptions = engineCall?.[0];
    expect(engineOptions).toBeDefined();
    expect(engineOptions.filters?.node_ids).toEqual([
      "setup-suite",
      "auth-suite",
    ]);
    expect(engineOptions.filters?.file_patterns).toEqual(
      expect.arrayContaining(["suite.yaml"])
    );
  });
});
