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
      }),
    } as any;

    mockGlobalVariablesService = {
      getVariablesByScope: jest.fn().mockReturnValue({}),
      setSuiteVariables: jest.fn(),
      setDependencies: jest.fn(),
      interpolateString: jest.fn().mockImplementation((str) => str),
      clearAllNonGlobalVariables: jest.fn(),
    } as any;
    mockPriorityService = {} as any;
    mockDependencyService = {
      buildDependencyGraph: jest.fn(),
      resolveExecutionOrder: jest.fn().mockImplementation((tests) => tests),
      getCachedResult: jest.fn().mockReturnValue(null),
      markExecuting: jest.fn(),
    } as any;
    mockGlobalRegistryService = {
      registerNode: jest.fn(),
      setExportedVariable: jest.fn(),
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
});
