const actualFs = jest.requireActual("fs") as typeof import("fs");

jest.mock("fs", () => ({
  ...actualFs,
  existsSync: jest.fn(actualFs.existsSync.bind(actualFs)),
  statSync: jest.fn(actualFs.statSync.bind(actualFs)),
}));

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ProjectPathResolver } from "../project-path-resolver.service";

const existsSpy = fs.existsSync as jest.MockedFunction<
  typeof actualFs.existsSync
>;
const statSpy = fs.statSync as jest.MockedFunction<typeof actualFs.statSync>;

describe("ProjectPathResolver", () => {
  beforeEach(() => {
    existsSpy.mockImplementation((...args) => actualFs.existsSync(...args));
    statSpy.mockImplementation((...args) => actualFs.statSync(...args));
  });

  afterEach(() => {
    existsSpy.mockReset();
    statSpy.mockReset();
  });

  const createTempDir = (prefix: string) =>
    fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  describe("resolveProjectRoot", () => {
    it("should locate nearest configuration marker", () => {
      const root = createTempDir("flow-root-");
      const nested = path.join(root, "a", "b", "c");
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(root, "flow-test.config.yml"), "tests: []");

      const resolver = new ProjectPathResolver();
      const resolved = resolver.resolveProjectRoot(nested);

      expect(resolved).toBe(root);
    });

    it("should fallback to start directory when no marker found", () => {
      const root = createTempDir("flow-root-");
      const nested = path.join(root, "only");
      fs.mkdirSync(nested, { recursive: true });

      const resolver = new ProjectPathResolver();
      const resolved = resolver.resolveProjectRoot(nested);

      expect(resolved).toBe(path.resolve(nested));
    });
  });

  describe("loadConfiguredTestRoots", () => {
    it("should aggregate directories from multiple config formats", () => {
      const projectRoot = createTempDir("flow-config-");
      const testsDir = path.join(projectRoot, "tests");
      const testsAltDir = path.join(projectRoot, "tests-alt");
      const singleDir = path.join(projectRoot, "single");
      const jsonDir = path.join(projectRoot, "json-tests");
      const errorDir = path.join(projectRoot, "error-dir");
      [
        testsDir,
        testsAltDir,
        singleDir,
        jsonDir,
        errorDir,
        path.join(projectRoot, ".ignored"),
      ].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

      fs.writeFileSync(
        path.join(projectRoot, "flow-test.config.yml"),
        [
          "testDirectories:",
          "  - ./tests",
          "  - ./tests-alt",
          '  - "   "',
          "tests:",
          "  directories:",
          "    - ./tests-alt",
          "test_directory: ./single",
          "testDirectory: ./single",
        ].join("\n"),
        "utf8"
      );

      fs.writeFileSync(
        path.join(projectRoot, "flow-test.config.json"),
        JSON.stringify({
          testDirectories: ["./json-tests", "./error-dir"],
        })
      );

      const logger = { debug: jest.fn() } as any;

      existsSpy.mockImplementation((candidate: any) => {
        if (String(candidate).includes("error-dir")) {
          return true;
        }
        return actualFs.existsSync(candidate);
      });

      statSpy.mockImplementation((candidate: any) => {
        if (String(candidate).includes("error-dir")) {
          throw new Error("stat failure");
        }
        return actualFs.statSync(candidate);
      });

      const resolver = new ProjectPathResolver(logger);
      const roots = resolver.loadConfiguredTestRoots(projectRoot);

      expect(roots).toEqual(
        expect.arrayContaining([
          path.resolve(testsDir),
          path.resolve(testsAltDir),
          path.resolve(singleDir),
          path.resolve(jsonDir),
        ])
      );
      expect(logger.debug).toHaveBeenCalled();
    });

    it("should return empty array when no config present", () => {
      const resolver = new ProjectPathResolver();
      const emptyRoot = createTempDir("flow-empty-");

      const roots = resolver.loadConfiguredTestRoots(emptyRoot);
      expect(roots).toEqual([]);
    });
  });

  describe("determineDependencySearchRoots", () => {
    it("should include start directory parents and configured roots", () => {
      const projectRoot = createTempDir("flow-deps-");
      const nested = path.join(projectRoot, "src", "tests");
      const configured = path.join(projectRoot, "custom-tests");
      const badRoot = path.join(projectRoot, "bad-root");
      fs.mkdirSync(nested, { recursive: true });
      fs.mkdirSync(configured, { recursive: true });

      const logger = { debug: jest.fn() } as any;
      existsSpy.mockImplementation((candidate: any) => {
        if (candidate === badRoot) {
          return true;
        }
        return actualFs.existsSync(candidate);
      });
      statSpy.mockImplementation((candidate: any) => {
        if (candidate === badRoot) {
          throw new Error("stat issue");
        }
        return actualFs.statSync(candidate);
      });

      const resolver = new ProjectPathResolver(logger);
      const roots = resolver.determineDependencySearchRoots(
        nested,
        projectRoot,
        [configured, badRoot]
      );

      expect(roots).toEqual(
        expect.arrayContaining([
          path.resolve(path.join(projectRoot, "src")),
          path.resolve(configured),
          path.resolve(nested),
        ])
      );
      expect(roots).not.toContain(path.resolve(projectRoot));
      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
