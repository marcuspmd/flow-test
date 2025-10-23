import path from "path";
import { DependencyService } from "../dependency.service";
import { DiscoveredTest, DependencyResult } from "../../types/engine.types";

// Helper function to create mock DependencyResult
function createMockDependencyResult(
  overrides: Partial<DependencyResult> = {}
): DependencyResult {
  return {
    flowPath: "/test.yaml",
    nodeId: "test",
    suiteName: "Test Suite",
    success: true,
    executionTime: 100,
    exportedVariables: {},
    cached: false,
    ...overrides,
  };
}

describe("DependencyService", () => {
  let service: DependencyService;
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    startGroup: jest.fn(),
    endGroup: jest.fn(),
  };

  beforeEach(() => {
    service = new DependencyService(mockLogger as any);
  });

  describe("constructor", () => {
    it("should create instance with empty graph and cache", () => {
      expect(service).toBeInstanceOf(DependencyService);
      expect(service.getDependencyStats().total_tests).toBe(0);
    });
  });

  describe("buildDependencyGraph", () => {
    it("should build graph with simple dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth Flow",
          file_path: "/auth.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(service.getDirectDependencies("user")).toHaveLength(1);
      expect(service.getDirectDependencies("user")[0].node_id).toBe("auth");
      expect(service.getDirectDependencies("auth")).toHaveLength(0);
    });

    it("should handle object format dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth Flow",
          file_path: "/auth.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(service.getDirectDependencies("user")).toHaveLength(1);
      expect(service.getDirectDependencies("user")[0].node_id).toBe("auth");
    });

    it("should handle legacy path format dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth Flow",
          file_path: "/tests/auth.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/tests/user.yaml",
          depends: [{ path: "./auth.yaml" }],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(service.getDirectDependencies("user")).toHaveLength(1);
      expect(service.getDirectDependencies("user")[0].node_id).toBe("auth");
    });

    it("should populate node_id for dependencies declared only by path", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "setup",
          suite_name: "Setup Flow",
          file_path: "/tests/setup.yaml",
          depends: [],
        },
        {
          node_id: "main",
          suite_name: "Main Flow",
          file_path: "/tests/main.yaml",
          depends: [{ path: "./setup.yaml" }],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(tests[1].depends?.[0].node_id).toBe("setup");
      expect(service.getDirectDependencies("main")).toEqual([
        expect.objectContaining({ node_id: "setup" }),
      ]);
    });

    it("should resolve dependency paths across directories", () => {
      const projectRoot = process.cwd();
      const authPath = path.join(projectRoot, "tests", "auth", "auth.yaml");
      const chamadaPath = path.join(
        projectRoot,
        "tests",
        "chamada",
        "test.yaml"
      );
      const reportPath = path.join(
        projectRoot,
        "tests",
        "report",
        "report.yaml"
      );

      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth Flow",
          file_path: authPath,
          depends: [],
        },
        {
          node_id: "chamada",
          suite_name: "Call Flow",
          file_path: chamadaPath,
          depends: [{ path: "../auth/auth.yaml" }],
        },
        {
          node_id: "report",
          suite_name: "Report Flow",
          file_path: reportPath,
          depends: [{ path: "tests/auth/auth.yaml" }],
        },
      ];

      service.buildDependencyGraph(tests);

      const chamadaDeps = service.getDirectDependencies("chamada");
      expect(chamadaDeps).toHaveLength(1);
      expect(chamadaDeps[0].node_id).toBe("auth");

      const reportDeps = service.getDirectDependencies("report");
      expect(reportDeps).toHaveLength(1);
      expect(reportDeps[0].node_id).toBe("auth");
    });

    it("should resolve dependency path when provided node_id does not match", () => {
      const projectRoot = process.cwd();
      const authPath = path.join(
        projectRoot,
        "tests",
        "auth",
        "auth-flow.yaml"
      );
      const fixPath = path.join(
        projectRoot,
        "tests",
        "proposal",
        "fix-agency.yaml"
      );

      const tests: DiscoveredTest[] = [
        {
          node_id: "auth_flow",
          suite_name: "Auth Flow",
          file_path: authPath,
          depends: [],
        },
        {
          node_id: "fix_cip_agency",
          suite_name: "Fix CIP Agency",
          file_path: fixPath,
          depends: [
            {
              node_id: "auth",
              path: "../auth/auth-flow.yaml",
            },
          ],
        },
      ];

      service.buildDependencyGraph(tests);

      const deps = service.getDirectDependencies("fix_cip_agency");
      expect(deps).toHaveLength(1);
      expect(deps[0].node_id).toBe("auth_flow");
      expect(tests[1].depends?.[0].node_id).toBe("auth_flow");
    });

    it("should warn about missing dependencies", () => {
      const loggerWarnSpy = jest
        .spyOn(service["logger"], "warn")
        .mockImplementation();

      const tests: DiscoveredTest[] = [
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/user.yaml",
          depends: [{ node_id: "nonexistent" }],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dependency")
      );

      loggerWarnSpy.mockRestore();
    });

    it("should clear existing graph before building new one", () => {
      const tests1: DiscoveredTest[] = [
        {
          node_id: "test1",
          suite_name: "Test 1",
          file_path: "/test1.yaml",
          depends: [],
        },
      ];

      const tests2: DiscoveredTest[] = [
        {
          node_id: "test2",
          suite_name: "Test 2",
          file_path: "/test2.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests1);
      expect(service.getDependencyStats().total_tests).toBe(1);

      service.buildDependencyGraph(tests2);
      expect(service.getDependencyStats().total_tests).toBe(1);
    });
  });

  describe("extractNodeIdFromPath (private method coverage via path dependencies)", () => {
    it("should extract nodeId from filename when direct path match not found", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth-flow",
          suite_name: "Auth Flow",
          file_path: "/tests/auth-flow.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/tests/user.yaml",
          depends: [{ path: "/tests/auth-flow.yaml" }], // Usar path que contém o file_path do auth-flow
        },
      ];

      service.buildDependencyGraph(tests);

      expect(service.getDirectDependencies("user")).toHaveLength(1);
      expect(service.getDirectDependencies("user")[0].node_id).toBe(
        "auth-flow"
      );
    });

    it("should return null for invalid dependency path", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/user.yaml",
          depends: [{ path: "" }],
        },
      ];

      service.buildDependencyGraph(tests);
      expect(service.getDirectDependencies("user")).toHaveLength(0);
    });

    it("should return null for non-string dependency path", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/user.yaml",
          depends: [{ path: null as any }],
        },
      ];

      service.buildDependencyGraph(tests);
      expect(service.getDirectDependencies("user")).toHaveLength(0);
    });
  });

  describe("detectCircularDependencies", () => {
    it("should detect simple circular dependency", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [{ node_id: "b" }],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const cycles = service.detectCircularDependencies();

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain("a");
      expect(cycles[0]).toContain("b");
    });

    it("should detect complex circular dependency chain", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [{ node_id: "b" }],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "c" }],
        },
        {
          node_id: "c",
          suite_name: "Test C",
          file_path: "/c.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const cycles = service.detectCircularDependencies();

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain("→");
    });

    it("should return empty array when no cycles exist", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const cycles = service.detectCircularDependencies();

      expect(cycles).toHaveLength(0);
    });
  });

  describe("resolveExecutionOrder", () => {
    it("should order tests correctly based on dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "c",
          suite_name: "Test C",
          file_path: "/c.yaml",
          depends: [{ node_id: "a" }, { node_id: "b" }],
        },
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const ordered = service.resolveExecutionOrder(tests);

      expect(ordered).toHaveLength(3);
      expect(ordered[0].node_id).toBe("a");
      expect(ordered[1].node_id).toBe("b");
      expect(ordered[2].node_id).toBe("c");
    });

    it("should throw error for circular dependencies in execution order", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [{ node_id: "b" }],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(() => service.resolveExecutionOrder(tests)).toThrow(
        "Circular dependencies detected"
      );
    });

    it("should handle tests with no dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);
      const ordered = service.resolveExecutionOrder(tests);

      expect(ordered).toHaveLength(2);
    });
  });

  describe("getDirectDependencies", () => {
    it("should return direct dependencies of a test", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth",
          file_path: "/auth.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const deps = service.getDirectDependencies("user");

      expect(deps).toHaveLength(1);
      expect(deps[0].node_id).toBe("auth");
    });

    it("should return empty array for non-existent test", () => {
      const deps = service.getDirectDependencies("nonexistent");
      expect(deps).toHaveLength(0);
    });

    it("should return empty array for test with no dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "standalone",
          suite_name: "Standalone",
          file_path: "/standalone.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);
      const deps = service.getDirectDependencies("standalone");

      expect(deps).toHaveLength(0);
    });
  });

  describe("getTransitiveDependencies", () => {
    it("should return all transitive dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "base",
          suite_name: "Base",
          file_path: "/base.yaml",
          depends: [],
        },
        {
          node_id: "auth",
          suite_name: "Auth",
          file_path: "/auth.yaml",
          depends: [{ node_id: "base" }],
        },
        {
          node_id: "user",
          suite_name: "User",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const transitive = service.getTransitiveDependencies("user");

      expect(transitive).toHaveLength(2);
      expect(transitive.some((t) => t.node_id === "auth")).toBe(true);
      expect(transitive.some((t) => t.node_id === "base")).toBe(true);
    });

    it("should return empty array for test with no dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "standalone",
          suite_name: "Standalone",
          file_path: "/standalone.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);
      const transitive = service.getTransitiveDependencies("standalone");

      expect(transitive).toHaveLength(0);
    });

    it("should handle circular dependencies gracefully", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [{ node_id: "b" }],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const transitive = service.getTransitiveDependencies("a");

      // Should not hang and should return finite result
      // In circular dependency, it should return the other node once
      expect(transitive.length).toBeGreaterThanOrEqual(1);
      expect(transitive.length).toBeLessThanOrEqual(2);
    });
  });

  describe("canExecute", () => {
    it("should return true when all dependencies are resolved", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth",
          file_path: "/auth.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }],
        },
      ];

      service.buildDependencyGraph(tests);

      // Auth has no dependencies, can execute
      expect(service.canExecute("auth")).toBe(true);

      // User depends on auth, cannot execute until auth is resolved
      expect(service.canExecute("user")).toBe(false);

      // Mark auth as resolved
      service.markResolved(
        "auth",
        createMockDependencyResult({
          nodeId: "auth",
          success: true,
          exportedVariables: {},
        })
      );

      // Now user can execute
      expect(service.canExecute("user")).toBe(true);
    });

    it("should return true for non-existent test", () => {
      expect(service.canExecute("nonexistent")).toBe(true);
    });

    it("should return true for test with no dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "standalone",
          suite_name: "Standalone",
          file_path: "/standalone.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);
      expect(service.canExecute("standalone")).toBe(true);
    });
  });

  describe("markResolved and markExecuting", () => {
    it("should mark test as resolved and store result", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      const result = createMockDependencyResult({
        nodeId: "test",
        success: true,
        exportedVariables: { token: "abc123" },
      });

      service.markResolved("test", result);

      // Should now be cached
      const cached = service.getCachedResult("test");
      expect(cached).toBeTruthy();
      expect(cached!.success).toBe(true);
      expect(cached!.cached).toBe(true);
    });

    it("should mark test as executing", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      service.markExecuting("test");

      // Test internal state by checking it cannot execute another dependent
      // (This is an indirect way to test the executing flag)
      expect(service.canExecute("test")).toBe(true); // executing doesn't affect canExecute
    });

    it("should not cache failed results", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      const result = createMockDependencyResult({
        nodeId: "test",
        success: false,
        exportedVariables: {},
      });

      service.markResolved("test", result);

      // Should not be cached since it failed
      const cached = service.getCachedResult("test");
      expect(cached).toBeNull();
    });

    it("should handle marking non-existent test as resolved", () => {
      const result = createMockDependencyResult({
        success: true,
        exportedVariables: {},
      });

      // Should not throw error
      expect(() => service.markResolved("nonexistent", result)).not.toThrow();
    });

    it("should handle marking non-existent test as executing", () => {
      // Should not throw error
      expect(() => service.markExecuting("nonexistent")).not.toThrow();
    });
  });

  describe("cache management", () => {
    it("should return cached result when cache is enabled", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      const result = createMockDependencyResult({
        success: true,
        exportedVariables: { token: "abc123" },
      });

      service.markResolved("test", result as any);

      const cached = service.getCachedResult("test");
      expect(cached).toBeTruthy();
      expect(cached!.cached).toBe(true);
    });

    it("should return null when cache is disabled", () => {
      service.setCacheEnabled(false);

      const cached = service.getCachedResult("test");
      expect(cached).toBeNull();
    });

    it("should clear cache when cache is disabled", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      const result = createMockDependencyResult({
        success: true,
        exportedVariables: {},
      });

      service.markResolved("test", result);
      expect(service.getCachedResult("test")).toBeTruthy();

      service.setCacheEnabled(false);
      expect(service.getCachedResult("test")).toBeNull();
    });

    it("should clear cache manually", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      const result = createMockDependencyResult({
        success: true,
        exportedVariables: {},
      });

      service.markResolved("test", result);
      expect(service.getCachedResult("test")).toBeTruthy();

      service.clearCache();
      expect(service.getCachedResult("test")).toBeNull();
    });
  });

  describe("getDependencyStats", () => {
    it("should return accurate statistics", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "base",
          suite_name: "Base",
          file_path: "/base.yaml",
          depends: [],
        },
        {
          node_id: "auth",
          suite_name: "Auth",
          file_path: "/auth.yaml",
          depends: [{ node_id: "base" }],
        },
        {
          node_id: "user",
          suite_name: "User",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }, { node_id: "base" }],
        },
        {
          node_id: "standalone",
          suite_name: "Standalone",
          file_path: "/standalone.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);
      const stats = service.getDependencyStats();

      expect(stats.total_tests).toBe(4);
      expect(stats.tests_with_dependencies).toBe(2); // auth and user
      expect(stats.tests_with_dependents).toBe(2); // base and auth
      expect(stats.total_dependency_edges).toBe(3); // auth->base, user->auth, user->base
      expect(stats.max_dependency_depth).toBe(2); // user -> auth -> base
    });

    it("should return zero stats for empty graph", () => {
      const stats = service.getDependencyStats();

      expect(stats.total_tests).toBe(0);
      expect(stats.tests_with_dependencies).toBe(0);
      expect(stats.tests_with_dependents).toBe(0);
      expect(stats.max_dependency_depth).toBe(0);
      expect(stats.total_dependency_edges).toBe(0);
    });

    it("should handle circular dependencies in depth calculation", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "a",
          suite_name: "Test A",
          file_path: "/a.yaml",
          depends: [{ node_id: "b" }],
        },
        {
          node_id: "b",
          suite_name: "Test B",
          file_path: "/b.yaml",
          depends: [{ node_id: "a" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const stats = service.getDependencyStats();

      // Circular deps might return non-zero depth but should not be infinite
      expect(stats.max_dependency_depth).toBeGreaterThanOrEqual(0);
      expect(stats.max_dependency_depth).toBeLessThan(10); // Reasonable upper bound
    });
  });

  describe("getGraphVisualization", () => {
    it("should generate visual representation of the graph", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "auth",
          suite_name: "Auth Flow",
          file_path: "/auth.yaml",
          depends: [],
        },
        {
          node_id: "user",
          suite_name: "User Flow",
          file_path: "/user.yaml",
          depends: [{ node_id: "auth" }],
        },
      ];

      service.buildDependencyGraph(tests);
      const visualization = service.getGraphVisualization();

      expect(visualization).toContain("Dependency Graph:");
      expect(visualization).toContain("auth");
      expect(visualization).toContain("user");
      expect(visualization).toContain("Dependencies:");
      expect(visualization).toContain("Dependents:");
    });

    it("should show different status icons", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "resolved",
          suite_name: "Resolved Test",
          file_path: "/resolved.yaml",
          depends: [],
        },
        {
          node_id: "executing",
          suite_name: "Executing Test",
          file_path: "/executing.yaml",
          depends: [],
        },
        {
          node_id: "pending",
          suite_name: "Pending Test",
          file_path: "/pending.yaml",
          depends: [],
        },
      ];

      service.buildDependencyGraph(tests);

      // Set different states
      service.markResolved(
        "resolved",
        createMockDependencyResult({
          nodeId: "resolved",
          success: true,
          exportedVariables: {},
        })
      );
      service.markExecuting("executing");

      const visualization = service.getGraphVisualization();

      expect(visualization).toContain("✅"); // resolved
      expect(visualization).toContain("⏳"); // executing
      expect(visualization).toContain("⏸️"); // pending
    });
  });

  describe("reset", () => {
    it("should reset all node states to initial", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test1",
          suite_name: "Test 1",
          file_path: "/test1.yaml",
          depends: [],
        },
        {
          node_id: "test2",
          suite_name: "Test 2",
          file_path: "/test2.yaml",
          depends: [{ node_id: "test1" }],
        },
      ];

      service.buildDependencyGraph(tests);

      // Set some states
      service.markResolved(
        "test1",
        createMockDependencyResult({
          nodeId: "test1",
          success: true,
          exportedVariables: {},
        })
      );
      service.markExecuting("test2");

      // Reset
      service.reset();

      // Now test2 should not be able to execute since test1 is no longer resolved
      expect(service.canExecute("test2")).toBe(false);
    });

    it("should handle reset on empty graph", () => {
      // Should not throw error
      expect(() => service.reset()).not.toThrow();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle tests with missing node_id", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "",
          suite_name: "Empty Node ID",
          file_path: "/empty.yaml",
          depends: [],
        },
      ];

      expect(() => service.buildDependencyGraph(tests)).not.toThrow();
    });

    it("should handle tests with null/undefined dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: null as any,
        },
      ];

      expect(() => service.buildDependencyGraph(tests)).not.toThrow();
    });

    it("should handle invalid dependency objects", () => {
      const loggerWarnSpy = jest
        .spyOn(service["logger"], "warn")
        .mockImplementation();

      const tests: DiscoveredTest[] = [
        {
          node_id: "test",
          suite_name: "Test",
          file_path: "/test.yaml",
          depends: [{ invalid: "format" } as any],
        },
      ];

      service.buildDependencyGraph(tests);

      expect(loggerWarnSpy).toHaveBeenCalled();
      loggerWarnSpy.mockRestore();
    });

    it("should handle large dependency graphs efficiently", () => {
      const tests: DiscoveredTest[] = [];

      // Create a chain of 100 tests
      for (let i = 0; i < 100; i++) {
        tests.push({
          node_id: `test${i}`,
          suite_name: `Test ${i}`,
          file_path: `/test${i}.yaml`,
          depends: i > 0 ? [{ node_id: `test${i - 1}` }] : [],
        });
      }

      const start = Date.now();
      service.buildDependencyGraph(tests);
      const ordered = service.resolveExecutionOrder(tests);
      const end = Date.now();

      expect(ordered).toHaveLength(100);
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle object dependencies without node_id but with path", () => {
      const baseDep: DiscoveredTest = {
        node_id: "base",
        suite_name: "Base Flow",
        file_path: "base.yaml",
      };
      const userDep: DiscoveredTest = {
        node_id: "user",
        suite_name: "User Flow",
        file_path: "user.yaml",
        depends: [{ path: "base.yaml" }] as any,
      };

      service.buildDependencyGraph([baseDep, userDep]);
      expect(service.getDirectDependencies("user")).toEqual([baseDep]);
    });

    it("should handle extractNodeIdFromPath edge case - exact filename match", () => {
      const baseDep: DiscoveredTest = {
        node_id: "base-test",
        suite_name: "Base Test",
        file_path: "tests/base.yaml",
      };
      const userDep: DiscoveredTest = {
        node_id: "user",
        suite_name: "User Flow",
        file_path: "user.yaml",
        depends: [{ path: "tests/base.yaml" }] as any,
      };

      service.buildDependencyGraph([baseDep, userDep]);
      expect(service.getDirectDependencies("user")).toEqual([baseDep]);
    });

    it("should handle circular dependency in resolveExecutionOrder with self-referencing", () => {
      const dependencies: DiscoveredTest[] = [
        {
          node_id: "self-ref",
          suite_name: "Self Reference",
          file_path: "self.yaml",
          depends: [{ node_id: "self-ref" }],
        },
      ];

      service.buildDependencyGraph(dependencies);
      expect(() => {
        service.resolveExecutionOrder(dependencies);
      }).toThrow("Circular dependencies detected:");
    });

    it("should handle dependency as object with only path property", () => {
      const baseDep: DiscoveredTest = {
        node_id: "base",
        suite_name: "Base Flow",
        file_path: "flows/base-flow.yaml",
      };
      const userDep: DiscoveredTest = {
        node_id: "user",
        suite_name: "User Flow",
        file_path: "user.yaml",
        depends: [{ path: "flows/base-flow.yaml" }] as any,
      };

      service.buildDependencyGraph([baseDep, userDep]);
      expect(service.getDirectDependencies("user")).toEqual([baseDep]);
    });

    it("should handle empty string path in extractNodeIdFromPath", () => {
      const dependencies: DiscoveredTest[] = [
        {
          node_id: "test1",
          suite_name: "Test 1",
          file_path: "test1.yaml",
          depends: [{ path: "" }] as any,
        },
      ];

      // Should not throw and warn about missing dependency
      const loggerWarnSpy = jest
        .spyOn(service["logger"], "warn")
        .mockImplementation();
      service.buildDependencyGraph(dependencies);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dependency \'{"path":""}\' not found')
      );
      loggerWarnSpy.mockRestore();
    });

    it("should handle nodeId calculation from basename of file path", () => {
      const complexDep: DiscoveredTest = {
        node_id: "complex-flow-test",
        suite_name: "Complex Flow Test",
        file_path: "tests/flows/complex-flow-test.yaml",
      };
      const dependentDep: DiscoveredTest = {
        node_id: "dependent-test",
        suite_name: "Dependent Test",
        file_path: "dependent.yaml",
        depends: [{ path: "complex-flow-test.yaml" }] as any,
      };

      service.buildDependencyGraph([complexDep, dependentDep]);
      expect(service.getDirectDependencies("dependent-test")).toEqual([
        complexDep,
      ]);
    });
  });
});
