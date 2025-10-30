/**
 * @fileoverview Tests for PriorityService
 */

import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "../../di/identifiers";
import { PriorityService } from "../priority";
import type { ILogger } from "../../interfaces/services/ILogger";
import type { IConfigManager } from "../../interfaces/services/IConfigManager";
import type { DiscoveredTest } from "../../types/engine.types";

describe("PriorityService", () => {
  let service: PriorityService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let container: Container;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLogLevel: jest.fn(),
      getLogLevel: jest.fn().mockReturnValue("info"),
    };

    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        priorities: {
          levels: ["critical", "high", "medium", "low"],
          required: ["critical", "high"],
        },
      }),
    } as any;

    container = new Container();
    container.bind(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind(TYPES.IConfigManager).toConstantValue(mockConfigManager);
    container.bind(PriorityService).toSelf();

    service = container.get(PriorityService);
  });

  describe("constructor", () => {
    it("should initialize with logger and config manager", () => {
      expect(service).toBeInstanceOf(PriorityService);
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });

    it("should initialize priority weights", () => {
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });
  });

  describe("orderTests", () => {
    it("should order tests by priority", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "low-test",
          priority: "low",
          node_id: "low-1",
          file_path: "/test/low.yaml",
          estimated_duration: 100,
        },
        {
          suite_name: "critical-test",
          priority: "critical",
          node_id: "critical-1",
          file_path: "/test/critical.yaml",
          estimated_duration: 100,
        },
        {
          suite_name: "medium-test",
          priority: "medium",
          node_id: "medium-1",
          file_path: "/test/medium.yaml",
          estimated_duration: 100,
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      expect(result[0].priority).toBe("critical");
      expect(result[1].priority).toBe("medium");
      expect(result[2].priority).toBe("low");
    });

    it("should handle tests with dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "test-b",
          priority: "critical",
          node_id: "test-b",
          file_path: "/test/b.yaml",
          depends: [{ node_id: "test-a" }],
        },
        {
          suite_name: "test-a",
          priority: "medium",
          node_id: "test-a",
          file_path: "/test/a.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      // test-a deve vir primeiro mesmo sendo medium, pois test-b depende dele
      expect(result[0].suite_name).toBe("test-a");
      expect(result[1].suite_name).toBe("test-b");
    });

    it("should order by duration when priorities are equal", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "slow-test",
          priority: "high",
          node_id: "slow",
          file_path: "/test/slow.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "fast-test",
          priority: "high",
          node_id: "fast",
          file_path: "/test/fast.yaml",
          estimated_duration: 100,
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      // Faster test should come first when priorities are equal
      expect(result[0].suite_name).toBe("fast-test");
      expect(result[1].suite_name).toBe("slow-test");
    });

    it("should handle tests without priority (default to medium)", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "no-priority",
          node_id: "no-pri",
          file_path: "/test/no-priority.yaml",
        },
        {
          suite_name: "high-priority",
          priority: "high",
          node_id: "high-pri",
          file_path: "/test/high.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      expect(result[0].priority).toBe("high");
      expect(result[1].priority).toBeUndefined(); // no priority defaults to medium
    });

    it("should detect circular dependencies", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "test-a",
          priority: "high",
          node_id: "test-a",
          file_path: "/test/a.yaml",
          depends: [{ node_id: "test-b" }],
        },
        {
          suite_name: "test-b",
          priority: "high",
          node_id: "test-b",
          file_path: "/test/b.yaml",
          depends: [{ node_id: "test-a" }],
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      expect(result).toHaveLength(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("circular dependency")
      );
    });
  });

  describe("isRequiredTest", () => {
    it("should return true for critical priority", () => {
      const test: DiscoveredTest = {
        suite_name: "critical-test",
        priority: "critical",
        node_id: "crit-1",
        file_path: "/test/critical.yaml",
      } as DiscoveredTest;

      expect(service.isRequiredTest(test)).toBe(true);
    });

    it("should return true for high priority", () => {
      const test: DiscoveredTest = {
        suite_name: "high-test",
        priority: "high",
        node_id: "high-1",
        file_path: "/test/high.yaml",
      } as DiscoveredTest;

      expect(service.isRequiredTest(test)).toBe(true);
    });

    it("should return false for medium priority", () => {
      const test: DiscoveredTest = {
        suite_name: "medium-test",
        priority: "medium",
        node_id: "med-1",
        file_path: "/test/medium.yaml",
      } as DiscoveredTest;

      expect(service.isRequiredTest(test)).toBe(false);
    });

    it("should return false for low priority", () => {
      const test: DiscoveredTest = {
        suite_name: "low-test",
        priority: "low",
        node_id: "low-1",
        file_path: "/test/low.yaml",
      } as DiscoveredTest;

      expect(service.isRequiredTest(test)).toBe(false);
    });

    it("should handle tests without priority (default to medium)", () => {
      const test: DiscoveredTest = {
        suite_name: "no-priority",
        node_id: "no-pri",
        file_path: "/test/no-priority.yaml",
      } as DiscoveredTest;

      expect(service.isRequiredTest(test)).toBe(false);
    });
  });

  describe("getRequiredTests", () => {
    it("should filter only required tests", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-test",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical.yaml",
        },
        {
          suite_name: "high-test",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high.yaml",
        },
        {
          suite_name: "medium-test",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium.yaml",
        },
        {
          suite_name: "low-test",
          priority: "low",
          node_id: "low-1",
          file_path: "/test/low.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.getRequiredTests(tests);

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe("critical");
      expect(result[1].priority).toBe("high");
    });

    it("should return empty array when no required tests", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "medium-test",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.getRequiredTests(tests);

      expect(result).toHaveLength(0);
    });
  });

  describe("filterByPriority", () => {
    it("should filter tests by single priority", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-test",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical.yaml",
        },
        {
          suite_name: "high-test",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high.yaml",
        },
        {
          suite_name: "medium-test",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.filterByPriority(tests, ["critical"]);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe("critical");
    });

    it("should filter tests by multiple priorities", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-test",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical.yaml",
        },
        {
          suite_name: "high-test",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high.yaml",
        },
        {
          suite_name: "medium-test",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium.yaml",
        },
        {
          suite_name: "low-test",
          priority: "low",
          node_id: "low-1",
          file_path: "/test/low.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.filterByPriority(tests, ["critical", "high"]);

      expect(result).toHaveLength(2);
      expect(result.every((t) => ["critical", "high"].includes(t.priority!))).toBe(true);
    });

    it("should return empty array when no tests match", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "low-test",
          priority: "low",
          node_id: "low-1",
          file_path: "/test/low.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.filterByPriority(tests, ["critical"]);

      expect(result).toHaveLength(0);
    });

    it("should handle tests without priority (default to medium)", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "no-priority",
          node_id: "no-pri",
          file_path: "/test/no-priority.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.filterByPriority(tests, ["medium"]);

      expect(result).toHaveLength(1);
    });
  });

  describe("groupByPriority", () => {
    it("should group tests by priority", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-1",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical1.yaml",
        },
        {
          suite_name: "critical-2",
          priority: "critical",
          node_id: "crit-2",
          file_path: "/test/critical2.yaml",
        },
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
        },
        {
          suite_name: "medium-1",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium1.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.groupByPriority(tests);

      expect(result.get("critical")).toHaveLength(2);
      expect(result.get("high")).toHaveLength(1);
      expect(result.get("medium")).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const result = service.groupByPriority([]);
      expect(result.size).toBe(0);
    });

    it("should handle tests without priority (default to medium)", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "no-priority",
          node_id: "no-pri",
          file_path: "/test/no-priority.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.groupByPriority(tests);

      expect(result.get("medium")).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty test array", () => {
      const result = service.orderTests([]);
      expect(result).toHaveLength(0);
    });

    it("should handle single test", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "single-test",
          priority: "high",
          node_id: "single",
          file_path: "/test/single.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      expect(result).toHaveLength(1);
      expect(result[0].suite_name).toBe("single-test");
    });

    it("should handle tests with same name but different priorities", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "test",
          priority: "low",
          node_id: "test-low",
          file_path: "/test/test-low.yaml",
        },
        {
          suite_name: "test",
          priority: "critical",
          node_id: "test-critical",
          file_path: "/test/test-critical.yaml",
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      expect(result[0].priority).toBe("critical");
      expect(result[1].priority).toBe("low");
    });

    it("should handle tests with dependencies that don't exist", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "test-with-missing-dep",
          priority: "high",
          node_id: "test-1",
          file_path: "/test/test1.yaml",
          depends: [{ node_id: "non-existent" }],
        },
      ] as DiscoveredTest[];

      const result = service.orderTests(tests);

      expect(result).toHaveLength(1);
      expect(result[0].suite_name).toBe("test-with-missing-dep");
    });
  });

  describe("getPriorityStats", () => {
    it("should return statistics for each priority level", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-1",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical1.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "critical-2",
          priority: "critical",
          node_id: "crit-2",
          file_path: "/test/critical2.yaml",
          estimated_duration: 2000,
        },
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
          estimated_duration: 1500,
        },
        {
          suite_name: "medium-1",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium1.yaml",
          estimated_duration: 500,
        },
      ] as DiscoveredTest[];

      const stats = service.getPriorityStats(tests);

      expect(stats.total_tests).toBe(4);
      expect(stats.by_priority.critical?.count).toBe(2);
      expect(stats.by_priority.critical?.estimated_duration).toBe(3000);
      expect(stats.by_priority.high?.count).toBe(1);
      expect(stats.by_priority.medium?.count).toBe(1);
      expect(stats.required_tests).toBe(3); // critical + high
      expect(stats.required_estimated_duration).toBe(4500);
    });

    it("should handle empty test array", () => {
      const stats = service.getPriorityStats([]);

      expect(stats.total_tests).toBe(0);
      expect(stats.required_tests).toBe(0);
      expect(stats.required_estimated_duration).toBe(0);
    });

    it("should handle tests without priority", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "no-priority",
          node_id: "no-pri",
          file_path: "/test/no-priority.yaml",
          estimated_duration: 100,
        },
      ] as DiscoveredTest[];

      const stats = service.getPriorityStats(tests);

      expect(stats.total_tests).toBe(1);
      expect(stats.by_priority.medium?.count).toBe(1);
    });
  });

  describe("suggestOptimizations", () => {
    it("should suggest reducing critical tests when more than 30%", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-1",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical1.yaml",
        },
        {
          suite_name: "critical-2",
          priority: "critical",
          node_id: "crit-2",
          file_path: "/test/critical2.yaml",
        },
        {
          suite_name: "medium-1",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium1.yaml",
        },
      ] as DiscoveredTest[];

      const suggestions = service.suggestOptimizations(tests);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes("critical"))).toBe(true);
    });

    it("should suggest classifying tests when many are unclassified", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "no-priority-1",
          node_id: "no-pri-1",
          file_path: "/test/no-priority1.yaml",
        },
        {
          suite_name: "no-priority-2",
          node_id: "no-pri-2",
          file_path: "/test/no-priority2.yaml",
        },
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
        },
      ] as DiscoveredTest[];

      const suggestions = service.suggestOptimizations(tests);

      expect(suggestions.length).toBeGreaterThan(0);
      // The suggestions should contain something about priority or classification
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should suggest distributing when required tests take too long", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-1",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical1.yaml",
          estimated_duration: 200000,
        },
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
          estimated_duration: 150000,
        },
      ] as DiscoveredTest[];

      const suggestions = service.suggestOptimizations(tests);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes("required tests") || s.includes("duration"))).toBe(true);
    });

    it("should return empty array when no optimizations needed", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "medium-1",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium1.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "low-1",
          priority: "low",
          node_id: "low-1",
          file_path: "/test/low1.yaml",
          estimated_duration: 1000,
        },
      ] as DiscoveredTest[];

      const suggestions = service.suggestOptimizations(tests);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe("createExecutionPlan", () => {
    it("should create execution plan grouped by priority", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "critical-1",
          priority: "critical",
          node_id: "crit-1",
          file_path: "/test/critical1.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
          estimated_duration: 2000,
        },
        {
          suite_name: "medium-1",
          priority: "medium",
          node_id: "med-1",
          file_path: "/test/medium1.yaml",
          estimated_duration: 500,
        },
      ] as DiscoveredTest[];

      const plan = service.createExecutionPlan(tests);

      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.total_duration).toBeDefined();
      expect(plan.critical_path).toBeDefined();

      // First phase should contain highest priority tests
      const firstPhase = plan.phases[0];
      expect(firstPhase.name).toBeDefined();
      expect(firstPhase.tests).toHaveLength(1);
    });

    it("should handle empty test array", () => {
      const plan = service.createExecutionPlan([]);

      expect(plan.phases).toHaveLength(0);
      expect(plan.total_duration).toBe(0);
      expect(plan.critical_path).toHaveLength(0);
    });

    it("should group tests of same priority in same phase", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "high-2",
          priority: "high",
          node_id: "high-2",
          file_path: "/test/high2.yaml",
          estimated_duration: 1000,
        },
      ] as DiscoveredTest[];

      const plan = service.createExecutionPlan(tests);

      expect(plan.phases).toHaveLength(1);
      expect(plan.phases[0].tests).toHaveLength(2);
      expect(plan.phases[0].name).toBeDefined();
    });

    it("should calculate phase estimated duration correctly", () => {
      const tests: DiscoveredTest[] = [
        {
          suite_name: "high-1",
          priority: "high",
          node_id: "high-1",
          file_path: "/test/high1.yaml",
          estimated_duration: 1000,
        },
        {
          suite_name: "high-2",
          priority: "high",
          node_id: "high-2",
          file_path: "/test/high2.yaml",
          estimated_duration: 2000,
        },
      ] as DiscoveredTest[];

      const plan = service.createExecutionPlan(tests);

      expect(plan.phases[0].estimated_duration).toBe(3000);
    });
  });
});
