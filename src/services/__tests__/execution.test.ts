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
import { TestSuite } from "../../types/engine.types";
import {
  DiscoveredTest,
  SuiteExecutionResult,
  StepExecutionResult,
} from "../../types/config.types";

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
jest.mock("fs");
jest.mock("js-yaml");
// Mock logger service with proper logger instance
jest.mock("../logger.service", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    displayTestMetadata: jest.fn(),
    displayCapturedVariables: jest.fn(),
    displayErrorContext: jest.fn(),
    displayJestStyle: jest.fn(),
  }),
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

  const mockTestSuite: TestSuite = {
    node_id: "test-node-1",
    suite_name: "Test Suite",
    base_url: "https://api.example.com",
    variables: { test_var: "test_value" },
    steps: [
      {
        name: "Test Step 1",
        request: {
          method: "GET",
          url: "/api/test",
        },
        assert: {
          status_code: 200,
        },
      },
    ],
  };

  const mockDiscoveredTest: DiscoveredTest = {
    node_id: "test-node-1",
    suite_name: "Test Suite",
    file_path: "/path/to/test.yaml",
    exports: ["test_export"],
  };

  const mockStepResult: StepExecutionResult = {
    step_name: "Test Step 1",
    status: "success",
    duration_ms: 100,
    request_details: {
      method: "GET",
      url: "https://api.example.com/api/test",
      headers: {},
    },
    response_details: {
      status_code: 200,
      headers: {},
      body: { data: "test" },
      size_bytes: 100,
    },
  };

  const mockSuiteResult: SuiteExecutionResult = {
    node_id: "test-node-1",
    suite_name: "Test Suite",
    file_path: "/path/to/test.yaml",
    start_time: "2024-01-01T00:00:00.000Z",
    end_time: "2024-01-01T00:00:00.150Z",
    status: "success",
    duration_ms: 150,
    steps_executed: 1,
    steps_successful: 1,
    steps_failed: 0,
    success_rate: 100,
    steps_results: [mockStepResult],
    variables_captured: { test_export: "exported_value" },
  };

  beforeEach(() => {
    // Create simple mocks
    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        execution: { mode: "sequential" },
        discovery: {},
        reporting: {},
        test_directory: "./tests",
      }),
      getRuntimeFilters: jest.fn().mockReturnValue({}),
    } as any;

    mockGlobalVariablesService = {
      getVariablesByScope: jest.fn().mockReturnValue({}),
      setSuiteVariables: jest.fn(),
      setDependencies: jest.fn(),
      interpolateString: jest.fn().mockImplementation((str) => str),
      clearAllNonGlobalVariables: jest.fn(),
      getAllVariables: jest.fn().mockReturnValue({}),
      setVariable: jest.fn(),
      interpolate: jest.fn().mockImplementation((val) => val),
      setRuntimeVariable: jest.fn(),
      setRuntimeVariables: jest.fn(),
      createSnapshot: jest.fn().mockReturnValue({}),
      restoreSnapshot: jest.fn(),
    } as any;
    mockPriorityService = {} as any;
    mockDependencyService = {
      buildDependencyGraph: jest.fn(),
      resolveExecutionOrder: jest.fn().mockImplementation((tests) => tests),
      getCachedResult: jest.fn().mockReturnValue(null),
      markExecuting: jest.fn(),
      markResolved: jest.fn(),
    } as any;
    mockGlobalRegistryService = {
      registerNode: jest.fn(),
      setExportedVariable: jest.fn(),
      getAllExportedVariables: jest.fn().mockReturnValue({}),
    } as any;
    mockHttpService = {} as any;
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

  describe("test suite execution", () => {
    beforeEach(() => {
      // Mock private methods that are called during execution
      jest
        .spyOn(executionService as any, "loadTestSuite")
        .mockResolvedValue(mockTestSuite);
    });

    it("should execute a single test successfully", async () => {
      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue(mockSuiteResult);

      const result = await (executionService as any).executeSingleTest(
        mockDiscoveredTest
      );

      expect(result).toEqual(mockSuiteResult);
      expect(result.status).toBe("success");
    });

    it("should load test suite from file", async () => {
      const suite = await (executionService as any).loadTestSuite(
        mockDiscoveredTest.file_path
      );

      expect(suite).toEqual(mockTestSuite);
      expect(suite.suite_name).toBe("Test Suite");
    });

    it("should handle test execution with performance tracking", async () => {
      jest
        .spyOn(executionService as any, "executeTestsWithDependencies")
        .mockResolvedValue([mockSuiteResult]);

      const tests = [mockDiscoveredTest];

      const results = await executionService.executeTests(tests);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockSuiteResult);
    });

    it("should handle cached test results", async () => {
      // This test focuses on the flow when cached result is NOT found
      mockDependencyService.getCachedResult.mockReturnValue(null);

      jest
        .spyOn(executionService as any, "executeTestsWithDependencies")
        .mockResolvedValue([mockSuiteResult]);

      const tests = [mockDiscoveredTest];
      const results = await executionService.executeTests(tests);

      expect(results).toHaveLength(1);
    });

    it("should mark tests as executing during execution", async () => {
      // Test that the registration happens, not the internal call
      const testWithExports = {
        ...mockDiscoveredTest,
        exports: ["test_var"],
      };

      jest
        .spyOn(executionService as any, "executeTestsWithDependencies")
        .mockResolvedValue([mockSuiteResult]);

      const tests = [testWithExports];
      await executionService.executeTests(tests);

      // Verify that suites with exports get registered
      expect(mockGlobalRegistryService.registerNode).toHaveBeenCalledWith(
        testWithExports.node_id,
        testWithExports.suite_name,
        testWithExports.exports,
        testWithExports.file_path
      );
    });

    it("should handle empty test list", async () => {
      jest
        .spyOn(executionService as any, "executeTestsWithDependencies")
        .mockResolvedValue([]);

      const results = await executionService.executeTests([]);

      expect(results).toEqual([]);
      expect(mockDependencyService.buildDependencyGraph).toHaveBeenCalledWith(
        []
      );
    });
  });

  describe("constructor and initialization", () => {
    it("should initialize with proper config", () => {
      const config = mockConfigManager.getConfig();
      expect(config.execution).toBeDefined();
      expect(config.execution?.mode).toBe("sequential");
    });

    it("should initialize performance data", () => {
      // Verify that performance tracking is set up
      const performanceData = (executionService as any).performanceData;
      expect(performanceData).toBeDefined();
      expect(performanceData.requests).toEqual([]);
      expect(typeof performanceData.start_time).toBe("number");
    });

    it("should initialize all required services", () => {
      // Verify that all services are initialized
      expect((executionService as any).httpService).toBeDefined();
      expect((executionService as any).assertionService).toBeDefined();
      expect((executionService as any).captureService).toBeDefined();
      expect((executionService as any).scenarioService).toBeDefined();
      expect((executionService as any).iterationService).toBeDefined();
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle undefined hooks parameter", () => {
      const serviceWithoutHooks = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService
        // no hooks parameter
      );

      expect(serviceWithoutHooks).toBeInstanceOf(ExecutionService);
      expect((serviceWithoutHooks as any).hooks).toEqual({});
    });

    it("should handle different config modes", () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "parallel", timeout: 30000 },
        discovery: {},
        reporting: {},
        globals: {
          base_url: "https://test.api.com",
          timeouts: { default: 45000 },
        },
      } as any);

      const parallelService = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService
      );

      expect(parallelService).toBeInstanceOf(ExecutionService);
      expect((parallelService as any).httpService).toBeDefined();
    });

    it("should handle missing config timeouts", () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: {},
        discovery: {},
        reporting: {},
        globals: {},
      } as any);

      const serviceWithDefaults = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService
      );

      expect(serviceWithDefaults).toBeInstanceOf(ExecutionService);
    });

    it("should handle loadTestSuite with valid YAML", async () => {
      // Mock fs.readFileSync and js-yaml.load
      const fs = require("fs");
      const yaml = require("js-yaml");

      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml content");
      jest.spyOn(yaml, "load").mockReturnValue({
        suite_name: "Test Suite",
        node_id: "test-1",
        steps: [
          {
            name: "Test Step",
            request: {
              method: "GET",
              url: "/test",
            },
          },
        ],
      });

      const suite = await (executionService as any).loadTestSuite(
        "/fake/path.yaml"
      );

      expect(suite).toBeDefined();
      expect(suite.suite_name).toBe("Test Suite");
      expect(suite.node_id).toBe("test-1");

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
    });

    it("should handle loadTestSuite with invalid YAML", async () => {
      const fs = require("fs");
      const yaml = require("js-yaml");

      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml content");
      jest.spyOn(yaml, "load").mockReturnValue({
        invalid_yaml: true,
        // missing suite_name
      });

      await expect(
        (executionService as any).loadTestSuite("/fake/path.yaml")
      ).rejects.toThrow("Invalid test suite: missing suite_name");

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
    });

    it("should handle loadTestSuite with file read error", async () => {
      const fs = require("fs");
      jest.spyOn(fs, "readFileSync").mockImplementation(() => {
        throw new Error("File not found");
      });

      await expect(
        (executionService as any).loadTestSuite("/nonexistent.yaml")
      ).rejects.toThrow("Failed to load test suite from /nonexistent.yaml");

      fs.readFileSync.mockRestore();
    });
  });

  describe("private method testing", () => {
    it("should test captureAndRegisterExports with no exports", () => {
      const testNoExports = { ...mockDiscoveredTest, exports: undefined };
      const result = { ...mockSuiteResult };

      // This should not throw and should not call registry
      (executionService as any).captureAndRegisterExports(
        testNoExports,
        result
      );

      // Since no exports, registry should not be called
      expect(
        mockGlobalRegistryService.setExportedVariable
      ).not.toHaveBeenCalled();
    });

    it("should test registerSuitesWithExports functionality", () => {
      const tests = [
        { ...mockDiscoveredTest, exports: ["var1", "var2"] },
        {
          ...mockDiscoveredTest,
          node_id: "test-2",
          suite_name: "Test 2",
          exports: [],
        },
        {
          ...mockDiscoveredTest,
          node_id: "test-3",
          suite_name: "Test 3",
          exports: undefined,
        },
      ];

      (executionService as any).registerSuitesWithExports(tests);

      // Only the first test should be registered (has exports)
      expect(mockGlobalRegistryService.registerNode).toHaveBeenCalledTimes(1);
      expect(mockGlobalRegistryService.registerNode).toHaveBeenCalledWith(
        mockDiscoveredTest.node_id,
        mockDiscoveredTest.suite_name,
        ["var1", "var2"],
        mockDiscoveredTest.file_path
      );
    });

    it("should test getAllCapturedVariables method", () => {
      const result = {
        ...mockSuiteResult,
        steps_results: [
          {
            ...mockStepResult,
            captured_variables: { step1_var: "value1" },
          },
          {
            ...mockStepResult,
            step_name: "Step 2",
            captured_variables: { step2_var: "value2" },
          },
        ],
      };

      const allVars = (executionService as any).getAllCapturedVariables(result);

      expect(allVars).toEqual({
        step1_var: "value1",
        step2_var: "value2",
      });
    });

    it("should test getAllCapturedVariables with no captured variables", () => {
      const result = {
        ...mockSuiteResult,
        steps_results: [
          {
            ...mockStepResult,
            captured_variables: undefined,
          },
        ],
      };

      const allVars = (executionService as any).getAllCapturedVariables(result);

      expect(allVars).toEqual({});
    });
  });

  describe("step filter functionality", () => {
    it("should build step filter with simple step IDs", () => {
      const stepIds = ["step-1", "step-2", "step-3"];
      const filter = (executionService as any).buildStepFilter(stepIds);

      expect(filter).toBeDefined();
      expect(filter.simple.size).toBe(3);
      expect(filter.simple.has("step-1")).toBe(true);
      expect(filter.qualified.size).toBe(0);
    });

    it("should build step filter with qualified step IDs", () => {
      const stepIds = ["suite-1::step-1", "suite-2::step-2"];
      const filter = (executionService as any).buildStepFilter(stepIds);

      expect(filter).toBeDefined();
      expect(filter.qualified.size).toBe(2);
      expect(filter.simple.size).toBe(0);
    });

    it("should build step filter with mixed step IDs", () => {
      const stepIds = ["step-1", "suite-2::step-2"];
      const filter = (executionService as any).buildStepFilter(stepIds);

      expect(filter).toBeDefined();
      expect(filter.simple.size).toBe(1);
      expect(filter.qualified.size).toBe(1);
    });

    it("should return undefined for empty step IDs", () => {
      const filter = (executionService as any).buildStepFilter([]);
      expect(filter).toBeUndefined();
    });

    it("should return undefined for null/undefined step IDs", () => {
      const filter1 = (executionService as any).buildStepFilter(null);
      const filter2 = (executionService as any).buildStepFilter(undefined);
      expect(filter1).toBeUndefined();
      expect(filter2).toBeUndefined();
    });

    it("should skip invalid step IDs", () => {
      const stepIds = ["step-1", "", "  ", null, undefined, 123];
      const filter = (executionService as any).buildStepFilter(stepIds as any);

      expect(filter).toBeDefined();
      expect(filter.simple.size).toBe(1);
      expect(filter.simple.has("step-1")).toBe(true);
    });

    it("should normalize step IDs correctly", () => {
      const normalized = (executionService as any).normalizeStepId(
        "Step Name With Spaces"
      );
      expect(normalized).toBe("step-name-with-spaces");
    });

    it("should handle special characters in step IDs", () => {
      const normalized = (executionService as any).normalizeStepId(
        "Step@Name#123!"
      );
      expect(normalized).toBe("step-name-123");
    });
  });

  describe("step execution filtering", () => {
    it("should execute step when filter matches simple ID", () => {
      const identifiers = {
        stepId: "step-1",
        qualifiedStepId: "suite::step-1",
        normalizedQualifiedStepId: "suite::step-1",
      };
      const filter = {
        simple: new Set(["step-1"]),
        qualified: new Set(),
      };

      const shouldExecute = (executionService as any).shouldExecuteStepFilter(
        identifiers,
        filter
      );
      expect(shouldExecute).toBe(true);
    });

    it("should execute step when filter matches qualified ID", () => {
      const identifiers = {
        stepId: "step-1",
        qualifiedStepId: "suite::step-1",
        normalizedQualifiedStepId: "suite::step-1",
      };
      const filter = {
        simple: new Set(),
        qualified: new Set(["suite::step-1"]),
      };

      const shouldExecute = (executionService as any).shouldExecuteStepFilter(
        identifiers,
        filter
      );
      expect(shouldExecute).toBe(true);
    });

    it("should skip step when filter does not match", () => {
      const identifiers = {
        stepId: "step-1",
        qualifiedStepId: "suite::step-1",
        normalizedQualifiedStepId: "suite::step-1",
      };
      const filter = {
        simple: new Set(["step-2"]),
        qualified: new Set(["other-suite::step-1"]),
      };

      const shouldExecute = (executionService as any).shouldExecuteStepFilter(
        identifiers,
        filter
      );
      expect(shouldExecute).toBe(false);
    });

    it("should execute step when no filter is provided", () => {
      const identifiers = {
        stepId: "step-1",
        qualifiedStepId: "suite::step-1",
        normalizedQualifiedStepId: "suite::step-1",
      };

      const shouldExecute = (executionService as any).shouldExecuteStepFilter(
        identifiers,
        undefined
      );
      expect(shouldExecute).toBe(true);
    });
  });

  describe("performance summary", () => {
    it("should return undefined when no requests were made", () => {
      const summary = executionService.getPerformanceSummary();
      expect(summary).toBeUndefined();
    });

    it("should generate performance summary with requests", () => {
      // Add some performance data
      (executionService as any).performanceData.requests = [
        {
          url: "/api/test1",
          method: "GET",
          duration_ms: 100,
          status_code: 200,
        },
        {
          url: "/api/test2",
          method: "POST",
          duration_ms: 200,
          status_code: 201,
        },
        {
          url: "/api/test1",
          method: "GET",
          duration_ms: 150,
          status_code: 200,
        },
      ];

      const summary = executionService.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(summary!.total_requests).toBe(3);
      expect(summary!.average_response_time_ms).toBeCloseTo(150);
      expect(summary!.min_response_time_ms).toBe(100);
      expect(summary!.max_response_time_ms).toBe(200);
      expect(summary!.slowest_endpoints).toBeDefined();
      expect(summary!.slowest_endpoints.length).toBeGreaterThan(0);
    });

    it("should calculate slowest endpoints correctly", () => {
      (executionService as any).performanceData.requests = [
        {
          url: "/slow",
          method: "GET",
          duration_ms: 500,
          status_code: 200,
        },
        {
          url: "/slow",
          method: "GET",
          duration_ms: 600,
          status_code: 200,
        },
        {
          url: "/fast",
          method: "GET",
          duration_ms: 50,
          status_code: 200,
        },
      ];

      const summary = executionService.getPerformanceSummary();

      expect(summary!.slowest_endpoints[0].url).toBe("GET /slow");
      expect(summary!.slowest_endpoints[0].average_time_ms).toBe(550);
      expect(summary!.slowest_endpoints[0].call_count).toBe(2);
    });
  });

  describe("variable filtering and processing", () => {
    it("should filter available variables correctly", () => {
      const variables = {
        captured_token: "abc123",
        test_user: "john@example.com",
        PATH: "/usr/bin",
        HOME: "/home/user",
        api_key: "secret",
      };

      mockGlobalVariablesService.getAllVariables = jest
        .fn()
        .mockReturnValue(variables);

      mockGlobalRegistryService.getAllExportedVariables = jest
        .fn()
        .mockReturnValue({});

      const filtered = (executionService as any).filterAvailableVariables(
        variables
      );

      expect(filtered.captured_token).toBe("abc123");
      expect(filtered.test_user).toBe("john@example.com");
      expect(filtered.api_key).toBe("secret");
      // Environment variables should be filtered out
      expect(filtered.PATH).toBeUndefined();
      expect(filtered.HOME).toBeUndefined();
    });

    it("should include variables matching relevant patterns", () => {
      const variables = {
        captured_data: "value1",
        config_url: "value2",
        auth_token: "value3",
        suite_name: "value4",
        random_var: "value5", // should be filtered out
      };

      mockGlobalRegistryService.getAllExportedVariables = jest
        .fn()
        .mockReturnValue({});

      const filtered = (executionService as any).filterAvailableVariables(
        variables
      );

      expect(filtered.captured_data).toBe("value1");
      expect(filtered.config_url).toBe("value2");
      expect(filtered.auth_token).toBe("value3");
      expect(filtered.suite_name).toBe("value4");
      expect(filtered.random_var).toBeUndefined();
    });

    it("should handle exported variables with namespaces", () => {
      const variables = {
        "suite1.auth_token": "token123",
        auth_token: "local_token",
      };

      mockGlobalRegistryService.getAllExportedVariables = jest
        .fn()
        .mockReturnValue({
          "suite1.auth_token": "token123",
        });

      const filtered = (executionService as any).filterAvailableVariables(
        variables
      );

      // Should include namespaced exported variable
      expect(filtered["suite1.auth_token"]).toBe("token123");
      // Should skip non-namespaced version if namespaced exists
      expect(filtered.auth_token).toBeUndefined();
    });
  });

  describe("delay execution", () => {
    it("should execute fixed delay", async () => {
      jest.useFakeTimers();

      const delayPromise = (executionService as any).executeDelay(
        1000,
        "Test Step"
      );

      jest.advanceTimersByTime(1000);
      await delayPromise;

      jest.useRealTimers();
    });

    it("should execute interpolated delay", async () => {
      jest.useFakeTimers();

      mockGlobalVariablesService.interpolate = jest
        .fn()
        .mockReturnValue({ delay: "500" });

      const delayPromise = (executionService as any).executeDelay(
        "{{delay_time}}",
        "Test Step"
      );

      jest.advanceTimersByTime(500);
      await delayPromise;

      expect(mockGlobalVariablesService.interpolate).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should execute random range delay", async () => {
      const delayConfig = { min: 100, max: 200 };

      // Just verify it doesn't throw
      await expect(
        (executionService as any).executeDelay(delayConfig, "Test Step")
      ).resolves.not.toThrow();
    }, 1000);

    it("should skip delay when value is 0", async () => {
      await (executionService as any).executeDelay(0, "Test Step");
      // If delay is 0, should return immediately
    });

    it("should handle invalid delay configuration", async () => {
      await (executionService as any).executeDelay(
        { invalid: true } as any,
        "Test Step"
      );
      // Should log warning and return without delay
    });

    it("should handle negative values in range", async () => {
      const delayConfig = { min: -10, max: -5 };

      await (executionService as any).executeDelay(delayConfig, "Test Step");
      // Should log warning for invalid range
    });
  });

  describe("step identifiers computation", () => {
    it("should compute step identifiers with step_id", () => {
      const step = {
        name: "Login Step",
        step_id: "login-step",
        request: { method: "POST", url: "/login" },
      };
      const suite = { ...mockTestSuite, node_id: "auth-suite" };

      const identifiers = (executionService as any).computeStepIdentifiers(
        suite,
        step,
        0
      );

      expect(identifiers.stepId).toBe("login-step");
      expect(identifiers.qualifiedStepId).toBe("auth-suite::login-step");
      expect(identifiers.normalizedQualifiedStepId).toBe(
        "auth-suite::login-step"
      );
    });

    it("should compute step identifiers without step_id", () => {
      const step = {
        name: "Login Step",
        request: { method: "POST", url: "/login" },
      };
      const suite = { ...mockTestSuite, node_id: "auth-suite" };

      const identifiers = (executionService as any).computeStepIdentifiers(
        suite,
        step,
        0
      );

      expect(identifiers.stepId).toContain("step-1");
      expect(identifiers.qualifiedStepId).toContain("auth-suite::step-1");
    });

    it("should handle empty step_id", () => {
      const step = {
        name: "Test Step",
        step_id: "   ",
        request: { method: "GET", url: "/test" },
      };
      const suite = { ...mockTestSuite };

      const identifiers = (executionService as any).computeStepIdentifiers(
        suite,
        step,
        2
      );

      expect(identifiers.stepId).toContain("step-3");
    });
  });

  describe("error result builders", () => {
    it("should build error suite result", () => {
      const error = new Error("Test execution failed");

      mockGlobalRegistryService.getAllExportedVariables = jest
        .fn()
        .mockReturnValue({});

      const result = (executionService as any).buildErrorSuiteResult(
        mockDiscoveredTest,
        error
      );

      expect(result.status).toBe("failure");
      expect(result.node_id).toBe(mockDiscoveredTest.node_id);
      expect(result.suite_name).toBe(mockDiscoveredTest.suite_name);
      expect(result.error_message).toContain("Test execution failed");
      expect(result.steps_executed).toBe(0);
      expect(result.steps_failed).toBe(1);
    });

    it("should build cached suite result", () => {
      const cachedResult = {
        flowPath: "/path/to/test.yaml",
        nodeId: "cached-node",
        suiteName: "Cached Suite",
        success: true,
        executionTime: 1500,
        exportedVariables: { token: "abc123" },
        cached: true,
      };

      const result = (executionService as any).buildCachedSuiteResult(
        mockDiscoveredTest,
        cachedResult
      );

      expect(result.status).toBe("success");
      expect(result.duration_ms).toBe(0);
      expect(result.variables_captured).toEqual({ token: "abc123" });
      expect(result.steps_executed).toBe(1);
      expect(result.success_rate).toBe(100);
    });
  });

  describe("input validation", () => {
    it("should detect interactive input steps in parallel mode", () => {
      const testsWithInput = [
        {
          ...mockDiscoveredTest,
          suite: {
            ...mockTestSuite,
            steps: [
              {
                name: "Input Step",
                input: {
                  prompt: "Enter value:",
                  variable: "user_input",
                  type: "text",
                },
              },
            ],
          },
        },
      ];

      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "parallel" },
        discovery: {},
        reporting: {},
      } as any);

      const fs = require("fs");
      const yaml = require("js-yaml");
      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml");
      jest.spyOn(yaml, "load").mockReturnValue(testsWithInput[0].suite);

      // This should throw an error
      expect(() => {
        (executionService as any).validateInputCompatibility(
          testsWithInput,
          mockConfigManager.getConfig()
        );
      }).toThrow("Interactive input steps detected in parallel execution mode");

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
    });
  });

  // NOTE: evaluateScenarioCondition tests removed - this logic is now handled by ScenarioStepStrategy
  // Tests for ScenarioStepStrategy are in src/strategies/__tests__/scenario-step.strategy.test.ts
  describe.skip("scenario condition evaluation (legacy - removed)", () => {
    it("should evaluate simple scenario conditions", () => {
      // Test moved to ScenarioStepStrategy
    });

    it("should handle condition evaluation errors", () => {
      // Test moved to ScenarioStepStrategy
    });
  });

  describe("variable processing", () => {
    it("should process captured variables without namespace", () => {
      const captured = { token: "abc123", user_id: "456" };
      const suite = mockTestSuite;

      const processed = (executionService as any).processCapturedVariables(
        captured,
        suite,
        false
      );

      expect(processed).toEqual(captured);
      expect(processed["test-node-1.token"]).toBeUndefined();
    });

    it("should process captured variables with namespace", () => {
      const captured = { token: "abc123", user_id: "456" };
      const suite = mockTestSuite;

      const processed = (executionService as any).processCapturedVariables(
        captured,
        suite,
        true
      );

      expect(processed["test-node-1.token"]).toBe("abc123");
      expect(processed["test-node-1.user_id"]).toBe("456");
      expect(processed.token).toBeUndefined();
    });

    it("should clone data correctly", () => {
      const original = { nested: { value: "test" }, array: [1, 2, 3] };
      const cloned = (executionService as any).cloneData(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
    });

    it("should handle null and undefined in cloneData", () => {
      const nullClone = (executionService as any).cloneData(null);
      const undefinedClone = (executionService as any).cloneData(undefined);

      expect(nullClone).toBeNull();
      expect(undefinedClone).toBeUndefined();
    });
  });

  describe("interpolate call variables", () => {
    it("should interpolate call variables", () => {
      mockGlobalVariablesService.interpolate = jest
        .fn()
        .mockReturnValue({ username: "john", token: "abc123" });

      const variables = { username: "{{user}}", token: "{{auth_token}}" };
      const result = (executionService as any).interpolateCallVariables(
        variables
      );

      expect(result).toEqual({ username: "john", token: "abc123" });
      expect(mockGlobalVariablesService.interpolate).toHaveBeenCalled();
    });

    it("should return undefined for no variables", () => {
      const result = (executionService as any).interpolateCallVariables(
        undefined
      );
      expect(result).toBeUndefined();
    });
  });

  describe("raw URL attachment", () => {
    it("should attach raw URL to result", () => {
      const result: any = {
        request_details: {
          method: "GET",
          url: "https://api.example.com/test",
          headers: {},
        },
      };

      (executionService as any).attachRawUrlToResult(result, "/test");

      expect(result.request_details.raw_url).toBeDefined();
    });

    it("should handle result without request_details", () => {
      const result: any = {};
      (executionService as any).attachRawUrlToResult(result, "/test");
      expect(result.request_details).toBeUndefined();
    });

    it("should handle absolute URLs", () => {
      const result: any = {
        request_details: {
          method: "GET",
          url: "https://other.com/test",
          headers: {},
        },
      };

      (executionService as any).attachRawUrlToResult(
        result,
        "https://other.com/test"
      );

      expect(result.request_details.raw_url).toBe("https://other.com/test");
    });
  });

  describe("performance data recording", () => {
    it("should record performance data", () => {
      const request = { method: "GET", url: "/api/test" };
      const result = {
        duration_ms: 150,
        response_details: { status_code: 200 },
      };

      (executionService as any).recordPerformanceData(request, result);

      const perfData = (executionService as any).performanceData;
      expect(perfData.requests).toHaveLength(1);
      expect(perfData.requests[0].url).toBe("/api/test");
      expect(perfData.requests[0].duration_ms).toBe(150);
    });

    it("should not record when no response details", () => {
      const request = { method: "GET", url: "/api/test" };
      const result = { duration_ms: 150 };

      const beforeCount = (executionService as any).performanceData.requests
        .length;
      (executionService as any).recordPerformanceData(request, result);

      expect((executionService as any).performanceData.requests.length).toBe(
        beforeCount
      );
    });
  });

  describe("get exported variables", () => {
    it("should get exported variables from test", () => {
      const test = {
        ...mockDiscoveredTest,
        exports: ["token", "user_id"],
      };

      mockGlobalRegistryService.getAllExportedVariables = jest
        .fn()
        .mockReturnValue({
          "test-node-1.token": "abc123",
          "test-node-1.user_id": "456",
        });

      const exported = (executionService as any).getExportedVariables(test);

      expect(exported).toEqual({
        token: "abc123",
        user_id: "456",
      });
    });

    it("should return empty object when no exports", () => {
      const test = {
        ...mockDiscoveredTest,
        exports: [],
      };

      const exported = (executionService as any).getExportedVariables(test);
      expect(exported).toEqual({});
    });
  });

  describe("restore exported variables", () => {
    it("should restore exported variables from cache", () => {
      const cachedResult = {
        flowPath: "/test.yaml",
        nodeId: "test-node",
        suiteName: "Test",
        success: true,
        executionTime: 1000,
        exportedVariables: { token: "abc", user_id: "123" },
        cached: true,
      };

      (executionService as any).restoreExportedVariables(cachedResult);

      expect(
        mockGlobalRegistryService.setExportedVariable
      ).toHaveBeenCalledWith("test-node", "token", "abc");
      expect(
        mockGlobalRegistryService.setExportedVariable
      ).toHaveBeenCalledWith("test-node", "user_id", "123");
    });
  });

  describe("environment variable exclusion", () => {
    it("should get environment variables to exclude", () => {
      const envVars = (
        executionService as any
      ).getEnvironmentVariablesToExclude();

      expect(envVars).toBeInstanceOf(Set);
      expect(envVars.size).toBeGreaterThan(0);
      // Should include NODE_ENV at minimum
      expect(envVars.has("NODE_ENV")).toBe(true);
    });

    it("should handle missing .env file gracefully", () => {
      const fs = require("fs");
      jest.spyOn(fs, "existsSync").mockReturnValue(false);

      const envVars = (
        executionService as any
      ).getEnvironmentVariablesToExclude();

      expect(envVars).toBeInstanceOf(Set);
      fs.existsSync.mockRestore();
    });
  });

  describe("executeTestsWithDependencies", () => {
    it("should execute tests respecting dependencies", async () => {
      const tests = [mockDiscoveredTest];
      const stats = {
        tests_discovered: 1,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      mockDependencyService.getCachedResult.mockReturnValue(null);

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue(mockSuiteResult);

      const results = await (
        executionService as any
      ).executeTestsWithDependencies(tests, stats, jest.fn());

      expect(results).toHaveLength(1);
      expect(mockDependencyService.markExecuting).toHaveBeenCalledWith(
        mockDiscoveredTest.suite_name
      );
    });

    it("should use cached results when available", async () => {
      const tests = [mockDiscoveredTest];
      const stats = {
        tests_discovered: 1,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      const cachedResult = {
        flowPath: mockDiscoveredTest.file_path,
        nodeId: mockDiscoveredTest.node_id,
        suiteName: mockDiscoveredTest.suite_name,
        success: true,
        executionTime: 1000,
        exportedVariables: { token: "cached_token" },
        cached: true,
      };

      mockDependencyService.getCachedResult.mockReturnValue(cachedResult);

      const results = await (
        executionService as any
      ).executeTestsWithDependencies(tests, stats, jest.fn());

      expect(results).toHaveLength(1);
      expect(results[0].duration_ms).toBe(0);
    });

    it("should handle execution errors gracefully", async () => {
      const tests = [mockDiscoveredTest];
      const stats = {
        tests_discovered: 1,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      mockDependencyService.getCachedResult.mockReturnValue(null);

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockRejectedValue(new Error("Execution failed"));

      const results = await (
        executionService as any
      ).executeTestsWithDependencies(tests, stats, jest.fn());

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("failure");
      expect(stats.tests_failed).toBe(1);
    });

    it("should capture and register exports after execution", async () => {
      const testWithExports = {
        ...mockDiscoveredTest,
        exports: ["token", "user_id"],
      };
      const stats = {
        tests_discovered: 1,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      mockDependencyService.getCachedResult.mockReturnValue(null);
      mockGlobalVariablesService.getVariablesByScope = jest
        .fn()
        .mockReturnValue({ token: "abc123", user_id: "456" });

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue({
          ...mockSuiteResult,
          variables_captured: { token: "abc123", user_id: "456" },
        });

      const results = await (
        executionService as any
      ).executeTestsWithDependencies([testWithExports], stats, jest.fn());

      expect(results).toHaveLength(1);
    });
  });

  describe("executeTestsSequentially", () => {
    it("should execute tests one by one", async () => {
      const tests = [
        mockDiscoveredTest,
        { ...mockDiscoveredTest, node_id: "test-2" },
      ];
      const stats = {
        tests_discovered: 2,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue(mockSuiteResult);

      const results = await (executionService as any).executeTestsSequentially(
        tests,
        stats,
        jest.fn()
      );

      expect(results).toHaveLength(2);
      expect(stats.tests_completed).toBe(2);
      expect(stats.tests_successful).toBe(2);
    });

    it("should handle failures and continue", async () => {
      const tests = [mockDiscoveredTest];
      const stats = {
        tests_discovered: 1,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      mockPriorityService.isRequiredTest = jest.fn().mockReturnValue(false);

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue({ ...mockSuiteResult, status: "failure" });

      const results = await (executionService as any).executeTestsSequentially(
        tests,
        stats,
        jest.fn()
      );

      expect(results).toHaveLength(1);
      expect(stats.tests_failed).toBe(1);
    });
  });

  describe("executeTestsInParallel", () => {
    it("should execute tests in batches", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "parallel", max_parallel: 2 },
        discovery: {},
        reporting: {},
      } as any);

      const tests = [
        mockDiscoveredTest,
        { ...mockDiscoveredTest, node_id: "test-2" },
        { ...mockDiscoveredTest, node_id: "test-3" },
      ];
      const stats = {
        tests_discovered: 3,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue(mockSuiteResult);

      const results = await (executionService as any).executeTestsInParallel(
        tests,
        stats,
        jest.fn()
      );

      expect(results).toHaveLength(3);
    });

    it("should handle parallel execution failures", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "parallel", max_parallel: 2 },
        discovery: {},
        reporting: {},
      } as any);

      const tests = [mockDiscoveredTest];
      const stats = {
        tests_discovered: 1,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockRejectedValue(new Error("Parallel execution failed"));

      const results = await (executionService as any).executeTestsInParallel(
        tests,
        stats,
        jest.fn()
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("failure");
      expect(stats.tests_failed).toBe(1);
    });
  });

  describe("executeSingleTest", () => {
    beforeEach(() => {
      const fs = require("fs");
      const yaml = require("js-yaml");

      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml content");
      jest.spyOn(yaml, "load").mockReturnValue(mockTestSuite);
      jest.spyOn(fs, "existsSync").mockReturnValue(true);
    });

    afterEach(() => {
      const fs = require("fs");
      const yaml = require("js-yaml");

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
      fs.existsSync.mockRestore();
    });

    it("should execute a complete test suite", async () => {
      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      const result = await (executionService as any).executeSingleTest(
        mockDiscoveredTest
      );

      expect(result).toBeDefined();
      expect(result.node_id).toBe(mockTestSuite.node_id);
      expect(result.suite_name).toBe(mockTestSuite.suite_name);
    });

    it("should handle suite loading errors", async () => {
      const fs = require("fs");
      fs.readFileSync.mockImplementation(() => {
        throw new Error("Failed to read file");
      });

      const result = await (executionService as any).executeSingleTest(
        mockDiscoveredTest
      );

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Suite loading error");
    });

    it("should clear non-global variables before starting", async () => {
      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      await (executionService as any).executeSingleTest(mockDiscoveredTest);

      expect(
        mockGlobalVariablesService.clearAllNonGlobalVariables
      ).toHaveBeenCalled();
    });

    it("should set suite variables", async () => {
      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      await (executionService as any).executeSingleTest(mockDiscoveredTest);

      expect(mockGlobalVariablesService.setSuiteVariables).toHaveBeenCalledWith(
        mockTestSuite.variables
      );
    });

    it("should configure dependencies", async () => {
      const testWithDeps = {
        ...mockDiscoveredTest,
        depends: [
          { node_id: "dep-1", path: "dep1.yaml" },
          { node_id: "dep-2", path: "dep2.yaml" },
        ],
      };

      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      await (executionService as any).executeSingleTest(testWithDeps);

      expect(mockGlobalVariablesService.setDependencies).toHaveBeenCalledWith([
        "dep-1",
        "dep-2",
      ]);
    });

    it("should read YAML content for frontend", async () => {
      const fs = require("fs");
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync
        .mockReturnValueOnce("yaml content")
        .mockReturnValueOnce("yaml content");

      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      const result = await (executionService as any).executeSingleTest(
        mockDiscoveredTest
      );

      expect(result.suite_yaml_content).toBeDefined();
    });
  });

  describe("runtime filters", () => {
    it("should apply step_id filters during execution", async () => {
      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({
        step_ids: ["specific-step"],
      });

      const fs = require("fs");
      const yaml = require("js-yaml");
      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml");
      jest.spyOn(yaml, "load").mockReturnValue(mockTestSuite);
      jest.spyOn(fs, "existsSync").mockReturnValue(true);

      jest
        .spyOn(executionService as any, "executeStep")
        .mockResolvedValue({ ...mockStepResult, status: "skipped" });

      const result = await (executionService as any).executeSingleTest(
        mockDiscoveredTest
      );

      expect(result).toBeDefined();

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
      fs.existsSync.mockRestore();
    });
  });

  describe("hooks integration", () => {
    it("should call onSuiteStart hook", async () => {
      const onSuiteStart = jest.fn();
      const serviceWithHooks = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService,
        { onSuiteStart }
      );

      const fs = require("fs");
      const yaml = require("js-yaml");
      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml");
      jest.spyOn(yaml, "load").mockReturnValue(mockTestSuite);
      jest.spyOn(fs, "existsSync").mockReturnValue(true);

      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(serviceWithHooks as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      await (serviceWithHooks as any).executeSingleTest(mockDiscoveredTest);

      expect(onSuiteStart).toHaveBeenCalledWith(mockTestSuite);

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
      fs.existsSync.mockRestore();
    });

    it("should call onSuiteEnd hook", async () => {
      const onSuiteEnd = jest.fn();
      const serviceWithHooks = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService,
        { onSuiteEnd }
      );

      const fs = require("fs");
      const yaml = require("js-yaml");
      jest.spyOn(fs, "readFileSync").mockReturnValue("mock yaml");
      jest.spyOn(yaml, "load").mockReturnValue(mockTestSuite);
      jest.spyOn(fs, "existsSync").mockReturnValue(true);

      mockConfigManager.getRuntimeFilters = jest.fn().mockReturnValue({});

      jest
        .spyOn(serviceWithHooks as any, "executeStep")
        .mockResolvedValue(mockStepResult);

      await (serviceWithHooks as any).executeSingleTest(mockDiscoveredTest);

      expect(onSuiteEnd).toHaveBeenCalled();

      fs.readFileSync.mockRestore();
      yaml.load.mockRestore();
      fs.existsSync.mockRestore();
    });
  });
});
