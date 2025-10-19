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
import type { StepCallExecutionOptions } from "../../types/call.types";
import path from "path";

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
        test_directory: process.cwd(),
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

  describe("step call integration", () => {
    beforeEach(() => {
      mockGlobalVariablesService.setRuntimeVariables.mockClear();
      mockGlobalVariablesService.clearAllNonGlobalVariables.mockClear();
      mockGlobalVariablesService.setSuiteVariables.mockClear();
      mockGlobalVariablesService.createSnapshot.mockClear();
    });

    it("should execute step call and propagate variables", async () => {
      const step: TestStep = {
        name: "Call remote step",
        call: {
          test: "./flows/login.yaml",
          step: "perform-login",
        },
      } as TestStep;

      const suite: TestSuite = {
        node_id: "main-suite",
        suite_name: "Main Suite",
        steps: [step],
      } as TestSuite;

      const identifiers = (executionService as any).computeStepIdentifiers(
        suite,
        step,
        0
      );

      const discoveredTest = {
        file_path: path.join(process.cwd(), "tests", "main.yaml"),
        node_id: suite.node_id,
        suite_name: suite.suite_name,
      };

      const propagatedVariables = {
        "called-suite.token": "abc123",
      };

      const callResult = {
        success: true,
        status: "success",
        propagated_variables: propagatedVariables,
        captured_variables: { token: "abc123" },
      };

      const callSpy = jest
        .spyOn((executionService as any).callService, "executeStepCall")
        .mockResolvedValue(callResult as any);

      mockGlobalVariablesService.setRuntimeVariables.mockClear();

      const result = await (executionService as any).executeStep(
        step,
        suite,
        0,
        identifiers,
        true,
        discoveredTest
      );

      expect(result.status).toBe("success");
      expect(result.captured_variables).toEqual(propagatedVariables);
      expect(
        mockGlobalVariablesService.setRuntimeVariables
      ).toHaveBeenCalledWith(propagatedVariables);

      const callOptions = callSpy.mock.calls[0][1] as StepCallExecutionOptions;
      expect(callOptions.allowedRoot).toBe(path.resolve(process.cwd()));
      expect(callOptions.callerSuitePath).toBe(discoveredTest.file_path);

      callSpy.mockRestore();
    });

    it("should respect continue strategy and mark step as skipped", async () => {
      const step: TestStep = {
        name: "Optional call",
        call: {
          test: "./flows/optional.yaml",
          step: "optional-step",
          on_error: "continue",
        },
      } as TestStep;

      const suite: TestSuite = {
        node_id: "main-suite",
        suite_name: "Main Suite",
        steps: [step],
      } as TestSuite;

      const identifiers = (executionService as any).computeStepIdentifiers(
        suite,
        step,
        0
      );

      const discoveredTest = {
        file_path: path.join(process.cwd(), "tests", "optional.yaml"),
        node_id: suite.node_id,
        suite_name: suite.suite_name,
      };

      const callResult = {
        success: false,
        status: "skipped",
        error: "Target not available",
      };

      const callSpy = jest
        .spyOn((executionService as any).callService, "executeStepCall")
        .mockResolvedValue(callResult as any);

      mockGlobalVariablesService.setRuntimeVariables.mockClear();

      const result = await (executionService as any).executeStep(
        step,
        suite,
        0,
        identifiers,
        true,
        discoveredTest
      );

      expect(result.status).toBe("skipped");
      expect(result.error_message).toBe(callResult.error);
      expect(
        mockGlobalVariablesService.setRuntimeVariables
      ).not.toHaveBeenCalled();

      callSpy.mockRestore();
    });

    it("should return failure when call path is absolute", async () => {
      const absolutePath = path.join(process.cwd(), "flows", "target.yaml");
      const step: TestStep = {
        name: "Invalid call",
        call: {
          test: absolutePath,
          step: "target-step",
        },
      } as TestStep;

      const suite: TestSuite = {
        node_id: "main-suite",
        suite_name: "Main Suite",
        steps: [step],
      } as TestSuite;

      const identifiers = (executionService as any).computeStepIdentifiers(
        suite,
        step,
        0
      );

      const discoveredTest = {
        file_path: path.join(process.cwd(), "tests", "main.yaml"),
        node_id: suite.node_id,
        suite_name: suite.suite_name,
      };

      const result = await (executionService as any).executeStep(
        step,
        suite,
        0,
        identifiers,
        true,
        discoveredTest
      );

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain(
        "Call configuration with path_type 'relative' must use relative paths"
      );
    });
  });

  describe("executeResolvedStepCall", () => {
    it("should isolate context and namespace captured variables", async () => {
      const restoreMock = jest.fn();
      mockGlobalVariablesService.createSnapshot.mockReturnValueOnce(
        restoreMock
      );
      mockGlobalVariablesService.setRuntimeVariables.mockClear();
      mockGlobalVariablesService.setSuiteVariables.mockClear();
      mockGlobalVariablesService.clearAllNonGlobalVariables.mockClear();

      const targetStep: TestStep = {
        name: "Target Step",
        step_id: "target-step",
      } as TestStep;

      const resolved = {
        suite: {
          node_id: "called-suite",
          suite_name: "Called Suite",
          steps: [targetStep],
          variables: { greeting: "hello" },
        } as TestSuite,
        suitePath: "/tmp/called.yaml",
        step: targetStep,
        stepIndex: 0,
        identifier: "/tmp/called.yaml::target-step",
      };

      const request = {
        test: "./called.yaml",
        step: "target-step",
        variables: { input: "value" },
        isolate_context: true,
      };

      const stepResultMock = {
        step_name: "Target Step",
        status: "success",
        duration_ms: 5,
        captured_variables: { token: "abc" },
        available_variables: { token: "abc" },
      };

      const executeSpy = jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue(stepResultMock);

      const result = await (executionService as any).executeResolvedStepCall({
        resolved,
        request,
        options: {
          callerSuitePath: "/tmp/caller.yaml",
          allowedRoot: process.cwd(),
          callStack: [],
        },
      });

      expect(
        mockGlobalVariablesService.clearAllNonGlobalVariables
      ).toHaveBeenCalledTimes(1);
      expect(
        mockGlobalVariablesService.setRuntimeVariables
      ).toHaveBeenCalledWith(request.variables);
      expect(mockGlobalVariablesService.setSuiteVariables).toHaveBeenCalledWith(
        resolved.suite.variables
      );
      expect(result.propagated_variables).toEqual({
        "called-suite.token": "abc",
      });
      expect(restoreMock).toHaveBeenCalled();

      executeSpy.mockRestore();
    });
  });
});
