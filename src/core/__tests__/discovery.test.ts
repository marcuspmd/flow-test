import fs from "fs";
import path from "path";
import fg from "fast-glob";
import yaml from "js-yaml";
import { TestDiscovery } from "../discovery";
import { ConfigManager } from "../config";
import type {
  TestSuite,
  DiscoveredTest,
  FlowDependency,
} from "../../types/engine.types";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("fast-glob", () => jest.fn());
jest.mock("js-yaml");
jest.mock("../config");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockFg = fg as jest.MockedFunction<typeof fg>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const MockConfigManager = ConfigManager as jest.MockedClass<
  typeof ConfigManager
>;

describe("TestDiscovery", () => {
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let testDiscovery: TestDiscovery;

  const mockConfig = {
    test_directory: "./tests",
    discovery: {
      patterns: ["**/*.test.yml", "**/*.test.yaml"],
      exclude: ["**/node_modules/**", "**/drafts/**"],
      recursive: true,
    },
  };

  const validTestSuite: TestSuite = {
    node_id: "test-001",
    suite_name: "Authentication Flow",
    steps: [
      {
        name: "Login",
        request: {
          method: "POST",
          url: "/auth/login",
        },
      },
    ],
    metadata: {
      priority: "high",
      estimated_duration_ms: 2000,
    },
    exports: ["auth_token"],
    depends: [
      {
        node_id: "setup-001",
        required: true,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup ConfigManager mock
    mockConfigManager = new MockConfigManager() as jest.Mocked<ConfigManager>;
    mockConfigManager.getConfig.mockReturnValue(mockConfig as any);

    // Setup path mocks
    mockPath.resolve.mockReturnValue("/resolved/tests");
    mockPath.join.mockImplementation((...args) => args.join("/"));
    mockPath.dirname.mockReturnValue("/tests/auth");
    mockPath.basename.mockReturnValue("auth");
    mockPath.normalize.mockImplementation((value: string) => value);

    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("yaml content");

    // Setup yaml mock - Now ensure the mock returns the correct suite
    mockYaml.load.mockReturnValue(validTestSuite);

    // Setup fast-glob mock
    mockFg.mockResolvedValue(["/tests/auth/login.test.yml"]);

    testDiscovery = new TestDiscovery(mockConfigManager);
  });

  describe("constructor", () => {
    it("should create instance with config manager", () => {
      expect(testDiscovery).toBeInstanceOf(TestDiscovery);
      expect(mockConfigManager).toBeDefined();
    });
  });

  describe("discoverTests", () => {
    it("should discover tests from configured directory", async () => {
      const setupSuite: TestSuite = {
        node_id: "setup-001",
        suite_name: "Setup Flow",
        steps: [
          {
            name: "Initialize environment",
            request: { method: "GET" as const, url: "/health" },
          },
        ],
      };

      mockFg.mockResolvedValue([
        "/tests/setup/setup.test.yml",
        "/tests/auth/login.test.yml",
      ]);

      mockYaml.load
        .mockReturnValueOnce(setupSuite)
        .mockReturnValueOnce(validTestSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(2);

      const loginTest = tests.find((test) => test.node_id === "test-001");
      expect(loginTest).toBeDefined();

      expect(loginTest).toEqual(
        expect.objectContaining({
          file_path: "/tests/auth/login.test.yml",
          node_id: "test-001",
          suite_name: "Authentication Flow",
          priority: "high",
          estimated_duration: 2000,
          exports: ["auth_token"],
          depends: expect.arrayContaining([
            expect.objectContaining({ node_id: "setup-001" }),
          ]),
        })
      );

      // Test dependencies separately since the mock setup seems to have issues
      // The important thing is that depends is correctly populated
      expect(loginTest?.depends).toEqual([
        { node_id: "setup-001", required: true },
      ]);
    });

    it("should throw error if test directory does not exist", async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(testDiscovery.discoverTests()).rejects.toThrow(
        "Test directory does not exist: /resolved/tests"
      );
    });

    it("should handle multiple discovery patterns", async () => {
      mockFg
        .mockResolvedValueOnce(["/tests/auth/login.test.yml"])
        .mockResolvedValueOnce(["/tests/api/users.test.yaml"]);

      const tests = await testDiscovery.discoverTests();

      expect(mockFg).toHaveBeenCalledTimes(2);
      expect(mockFg).toHaveBeenCalledWith(
        "/resolved/tests/**/*.test.yml",
        expect.any(Object)
      );
      expect(mockFg).toHaveBeenCalledWith(
        "/resolved/tests/**/*.test.yaml",
        expect.any(Object)
      );
    });

    it("should use configured exclude patterns", async () => {
      await testDiscovery.discoverTests();

      expect(mockFg).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ignore: ["**/node_modules/**", "**/drafts/**"],
        })
      );
    });

    it("should handle invalid test files gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockYaml.load.mockImplementation(() => {
        throw new Error("Invalid YAML");
      });

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Failed to parse test file")
      );

      consoleSpy.mockRestore();
    });

    it("should remove duplicate tests based on file path", async () => {
      mockFg.mockResolvedValue([
        "/tests/auth/login.test.yml",
        "/tests/auth/login.test.yml", // duplicate
      ]);

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(1);
    });

    it("should parse JSON test files", async () => {
      const jsonTestSuite: TestSuite = {
        node_id: "json-test-001",
        suite_name: "JSON Test Suite",
        steps: [
          {
            name: "Test Step",
            request: {
              method: "GET",
              url: "/api/test",
            },
          },
        ],
        metadata: {
          priority: "medium",
        },
      };

      mockFg.mockResolvedValue(["/tests/api/test.json"]);
      mockPath.join.mockImplementation((...args) => args.join("/"));
      
      // Mock JSON.parse to be called instead of yaml.load for .json files
      const originalParse = JSON.parse;
      global.JSON.parse = jest.fn().mockReturnValue(jsonTestSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(1);
      expect(tests[0]).toEqual(
        expect.objectContaining({
          file_path: "/tests/api/test.json",
          node_id: "json-test-001",
          suite_name: "JSON Test Suite",
          priority: "medium",
        })
      );

      // Restore original JSON.parse
      global.JSON.parse = originalParse;
    });

    it("should parse both YAML and JSON test files in same discovery", async () => {
      const jsonTestSuite: TestSuite = {
        node_id: "json-test-002",
        suite_name: "JSON Test Suite 2",
        steps: [
          {
            name: "JSON Test Step",
            request: { method: "POST", url: "/api/json" },
          },
        ],
      };

      const yamlTestSuite: TestSuite = {
        node_id: "yaml-test-001",
        suite_name: "YAML Test Suite",
        steps: [
          {
            name: "YAML Test Step",
            request: { method: "GET", url: "/api/yaml" },
          },
        ],
      };

      mockFg.mockResolvedValue([
        "/tests/api/test.json",
        "/tests/api/test.yaml",
      ]);

      const originalParse = JSON.parse;
      global.JSON.parse = jest.fn().mockReturnValue(jsonTestSuite);
      // For the YAML file, only yaml.load should be called
      mockYaml.load.mockReturnValue(yamlTestSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(2);
      expect(tests.find(t => t.node_id === "json-test-002")).toBeDefined();
      expect(tests.find(t => t.node_id === "yaml-test-001")).toBeDefined();

      global.JSON.parse = originalParse;
    });

    it("should warn about missing dependencies", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const tests = await testDiscovery.discoverTests();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Dependency 'setup-001' not found")
      );

      consoleSpy.mockRestore();
    });

    it("should filter valid dependencies", async () => {
      // Add a second test that the first one depends on
      const setupSuite: TestSuite = {
        node_id: "setup-001",
        suite_name: "Setup",
        steps: [
          {
            name: "Bootstrap",
            request: { method: "GET" as const, url: "/setup" },
          },
        ],
      };

      mockFg.mockResolvedValue([
        "/tests/setup/setup.test.yml",
        "/tests/auth/login.test.yml",
      ]);

      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(setupSuite))
        .mockReturnValueOnce(JSON.stringify(validTestSuite));

      mockYaml.load
        .mockReturnValueOnce(setupSuite)
        .mockReturnValueOnce(validTestSuite);

      const tests = await testDiscovery.discoverTests();

      const authTest = tests.find((t) => t.node_id === "test-001");
      expect(
        authTest?.depends?.map((dep: FlowDependency) => dep.node_id)
      ).toEqual(["setup-001"]);
    });
  });

  describe("parseTestFile", () => {
    it("should skip invalid test suites without suite_name", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const invalidSuite = {
        node_id: "test-001",
        steps: [
          {
            name: "Dummy",
            request: { method: "GET" as const, url: "/dummy" },
          },
        ],
      };
      mockYaml.load.mockReturnValue(invalidSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Invalid test suite")
      );

      consoleSpy.mockRestore();
    });

    it("should skip invalid test suites without node_id", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const invalidSuite = {
        suite_name: "Test",
        steps: [
          {
            name: "Dummy",
            request: { method: "GET" as const, url: "/dummy" },
          },
        ],
      };
      mockYaml.load.mockReturnValue(invalidSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Invalid test suite")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("priority inference", () => {
    it("should infer critical priority for smoke tests", async () => {
      const smokeSuite = {
        ...validTestSuite,
        suite_name: "Smoke Test Suite",
        metadata: {}, // no explicit priority
      };
      mockYaml.load.mockReturnValue(smokeSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].priority).toBe("critical");
    });

    it("should infer critical priority for health checks", async () => {
      const healthSuite = {
        ...validTestSuite,
        suite_name: "Health Check",
        metadata: {},
      };
      mockYaml.load.mockReturnValue(healthSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].priority).toBe("critical");
    });

    it("should infer high priority for auth tests", async () => {
      const authSuite = {
        ...validTestSuite,
        suite_name: "User Authentication",
        metadata: {},
      };
      mockYaml.load.mockReturnValue(authSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].priority).toBe("high");
    });

    it("should infer low priority for edge case tests", async () => {
      const edgeSuite = {
        ...validTestSuite,
        suite_name: "Edge Case Scenarios",
        metadata: {},
      };
      mockYaml.load.mockReturnValue(edgeSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].priority).toBe("low");
    });

    it("should default to medium priority", async () => {
      const regularSuite = {
        ...validTestSuite,
        suite_name: "Regular API Test",
        metadata: {},
      };
      mockYaml.load.mockReturnValue(regularSuite);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].priority).toBe("medium");
    });

    it("should use explicit priority over inferred", async () => {
      const tests = await testDiscovery.discoverTests();

      expect(tests[0].priority).toBe("high"); // from metadata, not inferred
    });
  });

  describe("duration estimation", () => {
    it("should use explicit duration from metadata", async () => {
      const tests = await testDiscovery.discoverTests();

      expect(tests[0].estimated_duration).toBe(2000);
    });

    it("should estimate duration based on step count", async () => {
      const suiteWithSteps = {
        ...validTestSuite,
        steps: [
          { name: "Step 1", request: { method: "GET", url: "/api/1" } },
          { name: "Step 2", request: { method: "GET", url: "/api/2" } },
          { name: "Step 3", request: { method: "GET", url: "/api/3" } },
        ],
        metadata: {}, // no explicit duration
      };
      mockYaml.load.mockReturnValue(suiteWithSteps);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].estimated_duration).toBe(1500); // 3 steps * 500ms
    });
  });

  describe("getDiscoveryStats", () => {
    const createTestWithPriority = (
      priority: string,
      nodeId: string
    ): DiscoveredTest => ({
      file_path: `/tests/${nodeId}.yml`,
      node_id: nodeId,
      suite_name: `Test ${nodeId}`,
      priority,
      estimated_duration: 1000,
      depends:
        priority === "high"
          ? [
              {
                node_id: "setup",
              },
            ]
          : [],
      exports: [],
    });

    it("should calculate correct statistics", () => {
      const tests = [
        createTestWithPriority("critical", "test-1"),
        createTestWithPriority("high", "test-2"),
        createTestWithPriority("medium", "test-3"),
        createTestWithPriority("low", "test-4"),
      ];

      const stats = testDiscovery.getDiscoveryStats(tests);

      expect(stats).toEqual({
        total_tests: 4,
        by_priority: {
          critical: 1,
          high: 1,
          medium: 1,
          low: 1,
        },
        total_estimated_duration: 4000,
        with_dependencies: 1,
        files_scanned: 0,
      });
    });

    it("should handle missing priority and duration", () => {
      const tests = [
        {
          file_path: "/test.yml",
          node_id: "test-1",
          suite_name: "Test",
          depends: [],
          exports: [],
        } as DiscoveredTest,
      ];

      const stats = testDiscovery.getDiscoveryStats(tests);

      expect(stats.by_priority.medium).toBe(1);
      expect(stats.total_estimated_duration).toBe(0);
    });
  });

  describe("isValidTestFile", () => {
    it("should return true for valid test files", async () => {
      const testContent = "suite_name: Test\nsteps:\n  - name: step1";
      mockFs.readFileSync.mockReturnValue(testContent);

      const isValid = await testDiscovery.isValidTestFile("/test.yml");

      expect(isValid).toBe(true);
    });

    it("should return false for invalid test files", async () => {
      const invalidContent = "some: other\ncontent: here";
      mockFs.readFileSync.mockReturnValue(invalidContent);

      const isValid = await testDiscovery.isValidTestFile("/invalid.yml");

      expect(isValid).toBe(false);
    });

    it("should return false for files that cannot be read", async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const isValid = await testDiscovery.isValidTestFile("/missing.yml");

      expect(isValid).toBe(false);
    });
  });

  describe("discoverTestGroups", () => {
    it("should group tests by directory", async () => {
      mockFg.mockResolvedValue([
        "/tests/auth/login.test.yml",
        "/tests/auth/logout.test.yml",
        "/tests/api/users.test.yml",
      ]);

      const authSuite = { ...validTestSuite, node_id: "auth-login" };
      const logoutSuite = {
        ...validTestSuite,
        node_id: "auth-logout",
        suite_name: "Logout",
      };
      const usersSuite = {
        ...validTestSuite,
        node_id: "api-users",
        suite_name: "Users API",
      };

      mockYaml.load
        .mockReturnValueOnce(authSuite)
        .mockReturnValueOnce(logoutSuite)
        .mockReturnValueOnce(usersSuite);

      mockPath.dirname
        .mockReturnValueOnce("/tests/auth")
        .mockReturnValueOnce("/tests/auth")
        .mockReturnValueOnce("/tests/api");

      mockPath.basename
        .mockReturnValueOnce("auth")
        .mockReturnValueOnce("auth")
        .mockReturnValueOnce("api");

      const groups = await testDiscovery.discoverTestGroups();

      expect(groups.size).toBe(2);
      expect(groups.get("auth")).toHaveLength(2);
      expect(groups.get("api")).toHaveLength(1);
    });
  });

  describe("findOrphanTests", () => {
    it("should find tests with no dependencies and no dependents", () => {
      const tests: DiscoveredTest[] = [
        {
          file_path: "/orphan.yml",
          node_id: "orphan-1",
          suite_name: "Orphan Test",
          depends: [],
          exports: [],
        },
        {
          file_path: "/depender.yml",
          node_id: "depender-1",
          suite_name: "Depender Test",
          depends: [{ node_id: "setup-1" }],
          exports: [],
        },
        {
          file_path: "/setup.yml",
          node_id: "setup-1",
          suite_name: "Setup Test",
          depends: [],
          exports: ["token"],
        },
      ];

      const orphans = testDiscovery.findOrphanTests(tests);

      expect(orphans).toHaveLength(1);
      expect(orphans[0].node_id).toBe("orphan-1");
    });

    it("should not consider tests as orphans if they have dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          file_path: "/test.yml",
          node_id: "test-1",
          suite_name: "Test",
          depends: [{ node_id: "setup-1" }],
          exports: [],
        },
      ];

      const orphans = testDiscovery.findOrphanTests(tests);

      expect(orphans).toHaveLength(0);
    });

    it("should not consider tests as orphans if other tests depend on them", () => {
      const tests: DiscoveredTest[] = [
        {
          file_path: "/setup.yml",
          node_id: "setup-1",
          suite_name: "Setup",
          depends: [],
          exports: ["token"],
        },
        {
          file_path: "/test.yml",
          node_id: "test-1",
          suite_name: "Test",
          depends: [{ node_id: "setup-1" }],
          exports: [],
        },
      ];

      const orphans = testDiscovery.findOrphanTests(tests);

      expect(orphans).toHaveLength(0);
    });

    it("should handle tests with undefined dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          file_path: "/test.yml",
          node_id: "test-1",
          suite_name: "Test",
          exports: [],
        } as DiscoveredTest,
      ];

      const orphans = testDiscovery.findOrphanTests(tests);

      expect(orphans).toHaveLength(1);
    });
  });

  describe("dependency extraction", () => {
    it("should extract dependencies from depends field", async () => {
      const suiteWithDeps = {
        node_id: "test-002",
        suite_name: "Test with Dependencies",
        steps: [
          {
            name: "Test step",
            request: { method: "GET" as const, url: "/test" },
          },
        ],
        depends: [{ node_id: "dep-1" }, { node_id: "dep-2" }],
      };

      mockFs.readFileSync.mockReturnValue("yaml content");
      mockYaml.load.mockReturnValue(suiteWithDeps);

      // Test parseTestFile directly
      const result = await (testDiscovery as any).parseTestFile(
        "/tests/test.yaml"
      );

      expect(
        result?.depends?.map((dep: FlowDependency) => dep.node_id)
      ).toEqual(["dep-1", "dep-2"]);
    });

    it("should keep dependencies referenced only by path", async () => {
      const suiteWithPathDependency = {
        node_id: "test-003",
        suite_name: "Test with Path Dependency",
        steps: [
          {
            name: "Test step",
            request: { method: "GET" as const, url: "/test" },
          },
        ],
        depends: [{ path: "./some-path.yml" }, { node_id: "valid-dep" }],
      };

      mockFs.readFileSync.mockReturnValue("yaml content");
      mockYaml.load.mockReturnValue(suiteWithPathDependency);

      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await (testDiscovery as any).parseTestFile(
        "/tests/test.yaml"
      );

      expect(result?.depends).toEqual([
        { path: "./some-path.yml" },
        { node_id: "valid-dep" },
      ]);

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Dependency without node_id")
      );

      warnSpy.mockRestore();
    });

    it("should remove duplicate dependencies", async () => {
      const suiteWithDuplicates = {
        node_id: "test-004",
        suite_name: "Test with Duplicate Dependencies",
        steps: [
          {
            name: "Test step",
            request: { method: "GET" as const, url: "/test" },
          },
        ],
        depends: [
          { node_id: "dep-1" },
          { node_id: "dep-1" }, // duplicate
          { node_id: "dep-2" },
        ],
      };

      mockFs.readFileSync.mockReturnValue("yaml content");
      mockYaml.load.mockReturnValue(suiteWithDuplicates);

      // Test parseTestFile directly
      const result = await (testDiscovery as any).parseTestFile(
        "/tests/test.yaml"
      );

      expect(
        result?.depends?.map((dep: FlowDependency) => dep.node_id)
      ).toEqual(["dep-1", "dep-2"]);
    });

    it("should deduplicate dependencies declared only by path", async () => {
      const suiteWithDuplicatePaths = {
        node_id: "test-005",
        suite_name: "Test with Duplicate Path Dependencies",
        steps: [
          {
            name: "Test step",
            request: { method: "GET" as const, url: "/test" },
          },
        ],
        depends: [
          { path: "./setup.yml" },
          { path: "./setup.yml" },
          { path: "../shared/setup.yml" },
        ],
      };

      mockFs.readFileSync.mockReturnValue("yaml content");
      mockYaml.load.mockReturnValue(suiteWithDuplicatePaths);

      const result = await (testDiscovery as any).parseTestFile(
        "/tests/path/test.yaml"
      );

      expect(result?.depends).toEqual([
        { path: "./setup.yml" },
        { path: "../shared/setup.yml" },
      ]);
    });

    it("should handle suites without depends field", async () => {
      const suiteWithoutDeps = {
        node_id: "test-001",
        suite_name: "Simple Test",
        steps: [
          {
            name: "Simple",
            request: { method: "GET" as const, url: "/simple" },
          },
        ],
      };
      mockFs.readFileSync.mockReturnValue("yaml content");
      mockYaml.load.mockReturnValue(suiteWithoutDeps);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].depends).toEqual([]);
    });
  });

  describe("exports extraction", () => {
    it("should extract exports from suite", async () => {
      const tests = await testDiscovery.discoverTests();

      expect(tests[0].exports).toEqual(["auth_token"]);
    });

    it("should handle suites without exports", async () => {
      const suiteWithoutExports = {
        ...validTestSuite,
        exports: undefined,
      };
      mockYaml.load.mockReturnValue(suiteWithoutExports);

      const tests = await testDiscovery.discoverTests();

      expect(tests[0].exports).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should handle YAML parsing errors", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockYaml.load.mockImplementation(() => {
        throw new Error("YAML parsing failed");
      });

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Failed to parse test file")
      );

      consoleSpy.mockRestore();
    });

    it("should handle file reading errors", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File reading failed");
      });

      const tests = await testDiscovery.discoverTests();

      expect(tests).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Failed to parse test file")
      );

      consoleSpy.mockRestore();
    });

    it("should handle fast-glob errors", async () => {
      mockFg.mockRejectedValue(new Error("Glob pattern failed"));

      await expect(testDiscovery.discoverTests()).rejects.toThrow(
        "Glob pattern failed"
      );
    });
  });
});
