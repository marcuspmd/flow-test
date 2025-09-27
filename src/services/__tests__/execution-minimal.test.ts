import { ExecutionService } from "../execution";
import { ConfigManager } from "../../core/config";
import { GlobalVariablesService } from "../global-variables";
import { PriorityService } from "../priority";
import { DependencyService } from "../dependency.service";
import { GlobalRegistryService } from "../global-registry.service";
import { HttpService } from "../http.service";
import { AssertionService } from "../assertion.service";
import { CaptureService } from "../capture.service";
import { ScenarioService } from "../scenario.service";
import { IterationService } from "../iteration.service";
import type { TestStep, TestSuite } from "../../types/engine.types";

// Mock all dependencies
jest.mock("../../core/config");
jest.mock("../global-variables");
jest.mock("../priority");
jest.mock("../dependency.service");
jest.mock("../global-registry.service");
jest.mock("../http.service");
jest.mock("../assertion.service");
jest.mock("../capture.service");
jest.mock("../scenario.service");
jest.mock("../iteration.service");
jest.mock("../logger.service", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe("ExecutionService", () => {
  let executionService: ExecutionService;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockGlobalVariablesService: jest.Mocked<GlobalVariablesService>;
  let mockPriorityService: jest.Mocked<PriorityService>;
  let mockDependencyService: jest.Mocked<DependencyService>;
  let mockGlobalRegistryService: jest.Mocked<GlobalRegistryService>;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockAssertionService: jest.Mocked<AssertionService>;
  let mockCaptureService: jest.Mocked<CaptureService>;
  let mockScenarioService: jest.Mocked<ScenarioService>;
  let mockIterationService: jest.Mocked<IterationService>;

  beforeEach(() => {
    // Create simple mocks
    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        execution: { mode: "sequential" },
        discovery: {},
        reporting: {},
      }),
    } as any;

    mockGlobalVariablesService = {
      getAllVariables: jest.fn().mockReturnValue({}),
      getVariablesByScope: jest.fn().mockReturnValue({}),
      interpolate: jest.fn((value) => value),
      interpolateString: jest.fn((value: string) => value),
      setRuntimeVariable: jest.fn(),
      setRuntimeVariables: jest.fn(),
      setSuiteVariables: jest.fn(),
      setDependencies: jest.fn(),
      clearAllNonGlobalVariables: jest.fn(),
      createSnapshot: jest.fn(() => jest.fn()),
    } as any;
    mockPriorityService = {} as any;
    mockDependencyService = {
      buildDependencyGraph: jest.fn(),
      resolveExecutionOrder: jest.fn().mockImplementation((tests) => tests),
    } as any;
    mockGlobalRegistryService = {
      registerNode: jest.fn(),
      getAllExportedVariables: jest.fn().mockReturnValue({}),
    } as any;
    mockHttpService = {
      executeRequest: jest.fn(),
      getBaseUrl: jest.fn(),
    } as any;
    (HttpService as unknown as jest.Mock).mockImplementation(
      () => mockHttpService
    );
    mockAssertionService = {} as any;
    mockCaptureService = {} as any;
    mockScenarioService = {} as any;
    mockIterationService = {} as any;

    // Create service instance
    executionService = new ExecutionService(
      mockConfigManager,
      mockGlobalVariablesService,
      mockPriorityService,
      mockDependencyService,
      mockGlobalRegistryService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should create ExecutionService instance", () => {
      expect(executionService).toBeInstanceOf(ExecutionService);
    });

    it("should execute empty test list", async () => {
      const tests: any[] = [];

      // Mock the private method
      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      const results = await executionService.executeTests(tests);

      expect(results).toEqual([]);
      expect(mockDependencyService.buildDependencyGraph).toHaveBeenCalledWith(
        tests
      );
      expect(mockDependencyService.resolveExecutionOrder).toHaveBeenCalledWith(
        tests
      );
    });

    it("should handle basic configuration", () => {
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });

    it("should call dependency resolution methods", async () => {
      const tests: any[] = [];

      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      await executionService.executeTests(tests);

      expect(mockDependencyService.buildDependencyGraph).toHaveBeenCalled();
      expect(mockDependencyService.resolveExecutionOrder).toHaveBeenCalled();
    });

    it("should handle dependency resolution errors", async () => {
      const tests: any[] = [];

      mockDependencyService.buildDependencyGraph.mockImplementation(() => {
        throw new Error("Dependency resolution failed");
      });

      await expect(executionService.executeTests(tests)).rejects.toThrow(
        "Dependency resolution failed"
      );
    });
  });

  describe("service registration", () => {
    it("should register suites with exports", async () => {
      const tests = [
        {
          node_id: "test-with-exports",
          suite_name: "Test With Exports",
          file_path: "/test-exports.yaml",
          priority: "high",
          exports: ["auth_token", "user_id"],
          estimated_duration: 2000,
        },
      ];

      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      await executionService.executeTests(tests);

      expect(mockGlobalRegistryService.registerNode).toHaveBeenCalledWith(
        "test-with-exports",
        "Test With Exports",
        ["auth_token", "user_id"],
        "/test-exports.yaml"
      );
    });

    it("should not register suites without exports", async () => {
      const tests = [
        {
          node_id: "test-without-exports",
          suite_name: "Test Without Exports",
          file_path: "/test.yaml",
          priority: "medium",
          exports: [],
          estimated_duration: 1000,
        },
      ];

      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      await executionService.executeTests(tests);

      expect(mockGlobalRegistryService.registerNode).not.toHaveBeenCalled();
    });
  });

  describe("execution modes", () => {
    it("should handle sequential execution mode", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "sequential" },
        discovery: {},
        reporting: {},
      } as any);

      const tests: any[] = [];

      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      await executionService.executeTests(tests);

      expect(executeSpy).toHaveBeenCalled();
    });

    it("should handle parallel execution mode with warning", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "parallel" },
        discovery: {},
        reporting: {},
      } as any);

      const tests: any[] = [];

      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      await executionService.executeTests(tests);

      expect(executeSpy).toHaveBeenCalled();
    });
  });

  describe("stats callback", () => {
    it("should handle stats callback", async () => {
      const tests: any[] = [];
      const onStatsUpdate = jest.fn();

      const executeSpy = jest.spyOn(
        executionService as any,
        "executeTestsWithDependencies"
      );
      executeSpy.mockResolvedValue([]);

      await executionService.executeTests(tests, onStatsUpdate);

      expect(executeSpy).toHaveBeenCalledWith(
        tests,
        expect.objectContaining({
          tests_discovered: 0,
          tests_completed: 0,
          tests_successful: 0,
          tests_failed: 0,
          tests_skipped: 0,
          requests_made: 0,
          total_response_time_ms: 0,
        }),
        onStatsUpdate
      );
    });
  });

  describe("step filtering", () => {
    it("normalizes explicit step identifiers", () => {
      // Arrange
      const computeStepIdentifiers = (
        executionService as any
      ).computeStepIdentifiers.bind(executionService);
      const suite = {
        node_id: "AuthSuite",
        suite_name: "Authentication",
        steps: [],
      } as TestSuite;
      const step = {
        name: "Login User",
        step_id: "Login User",
      } as TestStep;

      // Act
      const identifiers = computeStepIdentifiers(suite, step, 0);

      // Assert
      expect(identifiers.stepId).toBe("login-user");
      expect(identifiers.qualifiedStepId).toBe("AuthSuite::login-user");
      expect(identifiers.normalizedQualifiedStepId).toBe(
        "authsuite::login-user"
      );
    });

    it("matches normalized simple step filters", () => {
      // Arrange
      const compute = (executionService as any).computeStepIdentifiers.bind(
        executionService
      );
      const buildFilter = (executionService as any).buildStepFilter.bind(
        executionService
      );
      const shouldExecute = (
        executionService as any
      ).shouldExecuteStepFilter.bind(executionService);
      const suite = {
        node_id: "AuthSuite",
        suite_name: "Authentication",
        steps: [],
      } as TestSuite;
      const step = {
        name: "Login User",
        step_id: "Login User",
      } as TestStep;
      const identifiers = compute(suite, step, 0);

      // Act
      const filter = buildFilter([" login user "]);
      const matches = shouldExecute(identifiers, filter);

      // Assert
      expect(matches).toBe(true);
    });

    it("matches qualified step filters with node prefix", () => {
      // Arrange
      const compute = (executionService as any).computeStepIdentifiers.bind(
        executionService
      );
      const buildFilter = (executionService as any).buildStepFilter.bind(
        executionService
      );
      const shouldExecute = (
        executionService as any
      ).shouldExecuteStepFilter.bind(executionService);
      const suite = {
        node_id: "AuthSuite",
        suite_name: "Authentication",
        steps: [],
      } as TestSuite;
      const step = {
        name: "Login User",
        step_id: "Login User",
      } as TestStep;
      const identifiers = compute(suite, step, 0);

      // Act
      const filter = buildFilter(["authsuite::LOGIN USER"]);
      const matches = shouldExecute(identifiers, filter);

      // Assert
      expect(matches).toBe(true);
    });

    it("skips step execution when filter does not match", async () => {
      // Arrange
      const compute = (executionService as any).computeStepIdentifiers.bind(
        executionService
      );
      const buildFilter = (executionService as any).buildStepFilter.bind(
        executionService
      );
      const shouldExecute = (
        executionService as any
      ).shouldExecuteStepFilter.bind(executionService);
      const executeStep = (executionService as any).executeStep.bind(
        executionService
      );
      const step: TestStep = {
        name: "Login User",
        step_id: "Login User",
      } as TestStep;
      const suite = {
        node_id: "AuthSuite",
        suite_name: "Authentication",
        steps: [step],
      } as unknown as TestSuite;
      const identifiers = compute(suite, step, 0);
      const filter = buildFilter(["other-step"]);
      const matches = shouldExecute(identifiers, filter);

      // Act
      const result = await executeStep(step, suite, 0, identifiers, matches);

      // Assert
      expect(matches).toBe(false);
      expect(result.status).toBe("skipped");
      expect(result.step_id).toBe("login-user");
      expect(result.qualified_step_id).toBe("AuthSuite::login-user");
      expect(result.available_variables).toEqual({});
    });
  });
});
