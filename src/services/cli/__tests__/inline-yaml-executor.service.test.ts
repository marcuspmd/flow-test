const actualFsInline = jest.requireActual("fs") as typeof import("fs");

jest.mock("fs", () => ({
  ...actualFsInline,
  unlinkSync: jest.fn(actualFsInline.unlinkSync.bind(actualFsInline)),
}));

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { InlineYamlExecutor } from "../inline-yaml-executor.service";
import { ProjectPathResolver } from "../project-path-resolver.service";
import { DependencyDiscoveryService } from "../dependency-discovery.service";

jest.mock("../../../core/engine", () => {
  const runMock = jest.fn();
  const dryRunMock = jest.fn();
  const FlowTestEngine = jest.fn().mockImplementation(() => ({
    run: runMock,
    dryRun: dryRunMock,
  }));
  return { FlowTestEngine, __runMock: runMock, __dryRunMock: dryRunMock };
});

const {
  FlowTestEngine,
  __runMock: engineRunMock,
} = jest.requireMock("../../../core/engine") as {
  FlowTestEngine: jest.Mock;
  __runMock: jest.Mock;
};

const createTempDir = (prefix: string) =>
  fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const unlinkSpy = fs.unlinkSync as jest.MockedFunction<
  typeof actualFsInline.unlinkSync
>;

describe("InlineYamlExecutor", () => {
  let pathResolver: jest.Mocked<ProjectPathResolver>;
  let dependencyDiscovery: jest.Mocked<DependencyDiscoveryService>;
  let logger: { setLoggerAdapter: jest.Mock };
  let executor: InlineYamlExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    pathResolver = {
      resolveProjectRoot: jest.fn(),
      loadConfiguredTestRoots: jest.fn(),
      determineDependencySearchRoots: jest.fn(),
    } as any;

    dependencyDiscovery = {
      autoDiscoverDependencies: jest.fn(),
    } as any;

    logger = {
      setLoggerAdapter: jest.fn(),
    };

    executor = new InlineYamlExecutor(
      pathResolver,
      dependencyDiscovery,
      logger as any
    );

    engineRunMock.mockReset();
    unlinkSpy.mockImplementation((...args) =>
      actualFsInline.unlinkSync(...args)
    );
  });

  afterEach(() => {
    unlinkSpy.mockReset();
  });

  const baseParams = () => ({
    yamlContent: "node_id: inline-test\nsuite_name: Inline",
    options: {
      filters: {},
    } as any,
    runnerInteractiveMode: false,
  });

  it("should fail when YAML cannot be parsed", async () => {
    const params = baseParams();
    params.yamlContent = "foo: [";
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const exitCode = await executor.execute(params as any);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse inline YAML")
    );
    consoleSpy.mockRestore();
  });

  it("should fail when parsed content is not an object", async () => {
    const params = baseParams();
    params.yamlContent = "null";
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const exitCode = await executor.execute(params as any);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "❌ Inline YAML must define a valid test suite object."
    );
    consoleSpy.mockRestore();
  });

  it("should fail when node_id is missing", async () => {
    const params = baseParams();
    params.yamlContent = "suite_name: Inline";
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const exitCode = await executor.execute(params as any);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "❌ Inline YAML must include a 'node_id' property."
    );
    consoleSpy.mockRestore();
  });

  it("should fail when base directory cannot be resolved", async () => {
    pathResolver.resolveProjectRoot.mockReturnValue(undefined as any);
    pathResolver.loadConfiguredTestRoots.mockReturnValue([]);

    const params = {
      ...baseParams(),
      options: {},
    };

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const exitCode = await executor.execute(params as any);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "❌ Unable to determine base directory for inline execution."
    );
    consoleSpy.mockRestore();
  });

  it("should fail when base directory does not exist", async () => {
    const params = {
      ...baseParams(),
      baseDir: path.join(os.tmpdir(), "missing-dir"),
    };

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const exitCode = await executor.execute(params as any);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Inline base directory not found")
    );
    consoleSpy.mockRestore();
  });

  it("should fail when temporary file cannot be created", async () => {
    const baseDir = createTempDir("inline-fail-");
    fs.writeFileSync(path.join(baseDir, ".flow-inline"), "block", "utf8");

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const exitCode = await executor.execute({
      ...baseParams(),
      baseDir,
    } as any);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to prepare inline suite file")
    );
    consoleSpy.mockRestore();
  });

  it("should execute inline suite with reporting disabled", async () => {
    const projectRoot = createTempDir("inline-success-");
    const dependencyFile = path.join(projectRoot, "deps", "dep-1.yaml");
    fs.mkdirSync(path.dirname(dependencyFile), { recursive: true });
    fs.writeFileSync(dependencyFile, "node_id: dep-1\nsuite_name: Dep", "utf8");

    pathResolver.resolveProjectRoot.mockReturnValue(projectRoot);
    pathResolver.loadConfiguredTestRoots.mockReturnValue([]);
    pathResolver.determineDependencySearchRoots.mockReturnValue([
      projectRoot,
    ]);

    dependencyDiscovery.autoDiscoverDependencies.mockResolvedValue({
      nodeIds: ["dep-1"],
      filePaths: [dependencyFile],
    });

    engineRunMock.mockResolvedValue({
      success_rate: 100,
      failed_tests: 0,
      successful_tests: 1,
      total_tests: 1,
    });

    const stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const exitCode = await executor.execute({
      ...baseParams(),
      baseDir: projectRoot,
      options: {
        filters: {
          node_ids: ["existing"],
          file_patterns: ["existing.yaml"],
          suite_names: ["remove-me"],
        },
        reporting: { enabled: false, formats: ["json"] },
      } as any,
      configFile: path.join(projectRoot, "flow-test.config.yml"),
    } as any);

    expect(exitCode).toBe(0);
    expect(logger.setLoggerAdapter).toHaveBeenCalled();
    expect(dependencyDiscovery.autoDiscoverDependencies).toHaveBeenCalled();
    expect(FlowTestEngine).toHaveBeenCalled();
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"success_rate":100')
    );
    expect(unlinkSpy).toHaveBeenCalled();

    const [engineOptions] = FlowTestEngine.mock.calls[0];
    expect(engineOptions.filters?.node_ids).toEqual(
      expect.arrayContaining(["existing", "inline-test", "dep-1"])
    );
    expect(engineOptions.filters?.file_patterns).toEqual(
      expect.arrayContaining(["deps/dep-1.yaml"])
    );
    expect(engineOptions.filters?.suite_names).toBeUndefined();
    expect(engineOptions.reporting).toEqual({
      enabled: false,
      formats: [],
    });

    stdoutSpy.mockRestore();
  });

  it("should execute inline suite with automatic reporting configuration", async () => {
    const projectRoot = createTempDir("inline-success-2-");
    pathResolver.resolveProjectRoot.mockReturnValue(projectRoot);
    pathResolver.loadConfiguredTestRoots.mockReturnValue([]);
    pathResolver.determineDependencySearchRoots.mockReturnValue([projectRoot]);

    dependencyDiscovery.autoDiscoverDependencies.mockResolvedValue({
      nodeIds: [],
      filePaths: [],
    });

    engineRunMock.mockResolvedValue({
      success_rate: 80,
      failed_tests: 1,
      successful_tests: 4,
      total_tests: 5,
    });

    const stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const exitCode = await executor.execute({
      ...baseParams(),
      baseDir: projectRoot,
      options: {
        filters: {
          node_ids: [],
          file_patterns: [],
        },
      } as any,
    } as any);

    expect(exitCode).toBe(1);
    const [engineOptions] = FlowTestEngine.mock.calls.slice(-1)[0];
    expect(engineOptions.reporting?.enabled).toBe(true);
    expect(engineOptions.reporting?.formats).toEqual(
      expect.arrayContaining(["json"])
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"success_rate":80')
    );

    stdoutSpy.mockRestore();
  });
});
