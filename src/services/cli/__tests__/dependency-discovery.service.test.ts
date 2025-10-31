const actualFsDep = jest.requireActual("fs") as typeof import("fs");

jest.mock("fs", () => ({
  ...actualFsDep,
  readFileSync: jest.fn(actualFsDep.readFileSync.bind(actualFsDep)),
}));

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { DependencyDiscoveryService } from "../dependency-discovery.service";
import { ProjectPathResolver } from "../project-path-resolver.service";

const createTempDir = (prefix: string) =>
  fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const writeSuite = (
  filePath: string,
  nodeId: string,
  depends: Array<Record<string, unknown>> = []
) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [
      `node_id: ${nodeId}`,
      depends.length > 0 ? "depends:" : "",
      ...depends.map((dep) => `  - ${JSON.stringify(dep)}`),
    ]
      .filter(Boolean)
      .join("\n"),
    "utf8"
  );
};

const readSpy = fs.readFileSync as jest.MockedFunction<
  typeof actualFsDep.readFileSync
>;

describe("DependencyDiscoveryService", () => {
  afterEach(() => {
    readSpy.mockReset();
  });

  beforeEach(() => {
    readSpy.mockImplementation((...args) => actualFsDep.readFileSync(...args));
  });

  const createLogger = () => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  it("should return empty results when no dependencies declared", async () => {
    const pathResolver = {} as ProjectPathResolver;
    const logger = createLogger();
    const service = new DependencyDiscoveryService(pathResolver, logger as any);

    const result = await service.autoDiscoverDependencies({}, "/tmp");
    expect(result).toEqual({ nodeIds: [], filePaths: [] });
  });

  it("should discover dependencies recursively and log findings", async () => {
    const root = createTempDir("dep-service-");
    const testsDir = path.join(root, "tests");

    writeSuite(path.join(testsDir, "dep-a.yaml"), "dep-a", [
      { node_id: "dep-b" },
    ]);
    writeSuite(path.join(testsDir, "dep-b.yaml"), "dep-b", [
      { node_id: "dep-c" },
    ]);
    writeSuite(path.join(testsDir, "dep-c.yaml"), "dep-c");

    const logger = createLogger();
    const pathResolver = {
      resolveProjectRoot: jest.fn().mockReturnValue(root),
      loadConfiguredTestRoots: jest.fn().mockReturnValue([]),
      determineDependencySearchRoots: jest.fn().mockReturnValue([testsDir]),
    } as unknown as ProjectPathResolver;

    const service = new DependencyDiscoveryService(pathResolver, logger as any);

    const result = await service.autoDiscoverDependencies(
      {
        node_id: "main",
        depends: [{ node_id: "dep-a" }],
      },
      testsDir
    );

    expect(result.nodeIds).toEqual(["dep-a", "dep-b", "dep-c"]);
    expect(result.filePaths).toHaveLength(3);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("✅ Found dependency")
    );
  });

  it("should resolve dependencies by path and perform fallback search", async () => {
    const root = createTempDir("dep-fallback-");
    const startDir = path.join(root, "work");
    const primarySearch = path.join(root, "search");
    const fallbackFile = path.join(root, "fallback", "dep-root.yaml");
    const pathDependency = path.join(primarySearch, "dep-path.yaml");

    writeSuite(pathDependency, "dep-path");
    writeSuite(fallbackFile, "dep-root");

    const context = {
      projectRoot: root,
      searchRoots: [primarySearch],
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };

    const logger = createLogger();
    const pathResolver = {} as ProjectPathResolver;
    const service = new DependencyDiscoveryService(pathResolver, logger as any);

    const result = await service.autoDiscoverDependencies(
      {
        node_id: "main",
        depends: [
          { node_id: "dep-root" },
          { path: "../search/dep-path.yaml" },
        ],
      },
      startDir,
      context
    );

    expect(result.nodeIds).toEqual(["dep-root", "dep-path"]);
    expect(result.filePaths).toEqual(
      expect.arrayContaining([fallbackFile, pathDependency])
    );
    expect(context.fallbackSearchPerformed).toBe(true);
  });

  it("should warn when dependency cannot be resolved", async () => {
    const root = createTempDir("dep-warn-");
    const startDir = path.join(root, "suite");
    const context = {
      projectRoot: root,
      searchRoots: [],
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };

    const logger = createLogger();
    const pathResolver = {} as ProjectPathResolver;
    const service = new DependencyDiscoveryService(pathResolver, logger as any);

    const result = await service.autoDiscoverDependencies(
      {
        node_id: "main",
        depends: [{ node_id: "missing" }, { path: "./unknown.yaml" }],
      },
      startDir,
      context
    );

    expect(result).toEqual({ nodeIds: [], filePaths: [] });
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should handle errors during dependency parsing and discovery", async () => {
    const root = createTempDir("dep-errors-");
    const searchDir = path.join(root, "search");
    fs.mkdirSync(searchDir, { recursive: true });

    // Invalid YAML to trigger parse errors and debug logging
    const invalidFile = path.join(searchDir, "invalid.yaml");
    fs.writeFileSync(invalidFile, ":::", "utf8");
    const dependencyFile = path.join(searchDir, "dep-a.yaml");
    writeSuite(dependencyFile, "dep-a", [{ node_id: "dep-b" }]);
    const transitiveFile = path.join(searchDir, "dep-b.yaml");
    writeSuite(transitiveFile, "dep-b");

    let firstRead = true;
    readSpy.mockImplementation((file, options) => {
      if (String(file) === invalidFile) {
        throw new Error("invalid yaml");
      }
      if (String(file) === dependencyFile) {
        if (firstRead) {
          firstRead = false;
          return actualFsDep.readFileSync(file, options as any);
        }
        throw new Error("forced failure");
      }
      return actualFsDep.readFileSync(file, options as any);
    });

    const context = {
      projectRoot: root,
      searchRoots: [searchDir],
      nodeIdToFileMap: new Map<string, string>(),
      processedFiles: new Set<string>(),
      visitedDependencyFiles: new Set<string>(),
      fallbackSearchPerformed: false,
    };

    const logger = createLogger();
    const pathResolver = {} as ProjectPathResolver;
    const service = new DependencyDiscoveryService(pathResolver, logger as any);

    const result = await service.autoDiscoverDependencies(
      {
        node_id: "main",
        depends: [{ node_id: "dep-a" }],
      },
      searchDir,
      context
    );

    expect(result.nodeIds).toEqual(["dep-a"]);
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Could not read dependency file")
    );
  });
});
