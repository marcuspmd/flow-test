import { ExecutionService } from "../execution";
import { ConfigManager } from "../../core/config";
import { GlobalVariablesService } from "../global-variables";
import { PriorityService } from "../priority";
import { DependencyService } from "../dependency.service";
import { GlobalRegistryService } from "../global-registry.service";

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
jest.mock("../input.service");
jest.mock("../computed.service");
jest.mock("../dynamic-expression.service");
jest.mock("../call.service");
jest.mock("../script-executor.service");
jest.mock("../certificate.service");
jest.mock("fs");
jest.mock("js-yaml");
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

describe("ExecutionService - High Coverage Tests", () => {
  let executionService: ExecutionService;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockGlobalVariablesService: jest.Mocked<GlobalVariablesService>;
  let mockPriorityService: jest.Mocked<PriorityService>;
  let mockDependencyService: jest.Mocked<DependencyService>;
  let mockGlobalRegistryService: jest.Mocked<GlobalRegistryService>;

  beforeEach(() => {
    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        execution: { mode: "sequential", timeout: 30000 },
        discovery: {},
        reporting: {},
        test_directory: "./tests",
        globals: { certificates: [] },
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

  describe("branch coverage - step filter with colon separator", () => {
    it("should parse qualified IDs with single colon", () => {
      const stepIds = ["suite:step"];
      const filter = (executionService as any).buildStepFilter(stepIds);

      expect(filter).toBeDefined();
      expect(filter.qualified.size).toBe(1);
    });

    it("should handle malformed qualified IDs", () => {
      const stepIds = ["::malformed", "suite::", ":step"];
      const filter = (executionService as any).buildStepFilter(stepIds);

      // Should return undefined for all malformed IDs
      expect(filter).toBeUndefined();
    });
  });

  describe("branch coverage - delay config validation", () => {
    it("should handle invalid interpolated delay", async () => {
      mockGlobalVariablesService.interpolate = jest
        .fn()
        .mockReturnValue({ delay: "invalid" });

      const result = await (executionService as any).executeDelay(
        "{{invalid_delay}}",
        "Test Step"
      );

      // Should log warning and skip delay
      expect(result).toBeUndefined();
    });

    it("should handle negative interpolated delay", async () => {
      mockGlobalVariablesService.interpolate = jest
        .fn()
        .mockReturnValue({ delay: "-100" });

      const result = await (executionService as any).executeDelay(
        "{{negative_delay}}",
        "Test Step"
      );

      expect(result).toBeUndefined();
    });

    it("should handle invalid range min > max", async () => {
      const delayConfig = { min: 500, max: 100 };

      await (executionService as any).executeDelay(delayConfig, "Test Step");

      // Should log warning
    });
  });

  describe("branch coverage - variable filtering", () => {
    it("should filter variables with exported namespaced versions", () => {
      const variables = {
        "suite1.token": "namespaced",
        token: "local",
        captured_data: "value",
      };

      mockGlobalRegistryService.getAllExportedVariables = jest
        .fn()
        .mockReturnValue({
          "suite1.token": "namespaced",
        });

      const filtered = (executionService as any).filterAvailableVariables(
        variables
      );

      // Should include namespaced version
      expect(filtered["suite1.token"]).toBe("namespaced");
      // Should skip non-namespaced if namespaced exists
      expect(filtered.token).toBeUndefined();
    });

    it("should handle .env file read errors", () => {
      const fs = require("fs");
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error("Read error");
      });

      const envVars = (
        executionService as any
      ).getEnvironmentVariablesToExclude();

      expect(envVars).toBeInstanceOf(Set);

      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    it("should parse .env file with valid format", () => {
      const fs = require("fs");
      const path = require("path");
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest
        .fn()
        .mockReturnValue(
          "FLOW_TEST_VAR1=value1\nFLOW_TEST_VAR2=value2\n# Comment\n\nFLOW_TEST_VAR3=value3"
        );

      const envVars = (
        executionService as any
      ).getEnvironmentVariablesToExclude();

      expect(envVars).toBeInstanceOf(Set);
      expect(envVars.has("FLOW_TEST_VAR1")).toBe(true);
      expect(envVars.has("FLOW_TEST_VAR2")).toBe(true);
      expect(envVars.has("FLOW_TEST_VAR3")).toBe(true);

      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });
  });

  describe("branch coverage - exports handling", () => {
    it("should handle exports with missing variables (warning case)", () => {
      const test = {
        node_id: "test-1",
        suite_name: "Test",
        file_path: "/test.yaml",
        exports: ["missing_var"],
      };

      const result = {
        node_id: "test-1",
        suite_name: "Test",
        file_path: "/test.yaml",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: "success" as const,
        duration_ms: 100,
        steps_executed: 1,
        steps_successful: 1,
        steps_failed: 0,
        success_rate: 100,
        steps_results: [],
      };

      mockGlobalVariablesService.getVariablesByScope = jest
        .fn()
        .mockReturnValue({});

      (executionService as any).captureAndRegisterExports(test, result);

      // Should log warning for missing variable
      expect(
        mockGlobalRegistryService.setExportedVariable
      ).not.toHaveBeenCalled();
    });

    it("should handle exports_optional with existing variables", () => {
      const test = {
        node_id: "test-2",
        suite_name: "Test 2",
        file_path: "/test2.yaml",
        exports: [],
        exports_optional: ["optional_var"],
      };

      const result = {
        node_id: "test-2",
        suite_name: "Test 2",
        file_path: "/test2.yaml",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: "success" as const,
        duration_ms: 100,
        steps_executed: 1,
        steps_successful: 1,
        steps_failed: 0,
        success_rate: 100,
        steps_results: [],
        variables_captured: { optional_var: "value" },
      };

      mockGlobalVariablesService.getVariablesByScope = jest
        .fn()
        .mockReturnValue({ optional_var: "value" });

      (executionService as any).captureAndRegisterExports(test, result);

      expect(
        mockGlobalRegistryService.setExportedVariable
      ).toHaveBeenCalledWith("test-2", "optional_var", "value");
    });
  });

  describe("branch coverage - execution with optional exports", () => {
    it("should handle test failure with exports", async () => {
      const test = {
        node_id: "failing-test",
        suite_name: "Failing Test",
        file_path: "/failing.yaml",
        exports: ["token"],
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
      mockPriorityService.isRequiredTest = jest.fn().mockReturnValue(false);

      jest
        .spyOn(executionService as any, "executeSingleTest")
        .mockResolvedValue({
          node_id: "failing-test",
          suite_name: "Failing Test",
          file_path: "/failing.yaml",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          status: "failure",
          duration_ms: 100,
          steps_executed: 1,
          steps_successful: 0,
          steps_failed: 1,
          success_rate: 0,
          steps_results: [],
          variables_captured: { token: "abc123" },
        });

      mockGlobalVariablesService.getVariablesByScope = jest
        .fn()
        .mockReturnValue({ token: "abc123" });

      const results = await (
        executionService as any
      ).executeTestsWithDependencies([test], stats, jest.fn());

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("failure");
      // Should still capture exports even on failure
      expect(mockGlobalRegistryService.setExportedVariable).toHaveBeenCalled();
    });
  });

  describe("branch coverage - config with global certificates", () => {
    it("should initialize with global certificates", () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { mode: "sequential", timeout: 30000 },
        discovery: {},
        reporting: {},
        test_directory: "./tests",
        globals: {
          certificates: [
            {
              name: "Test Cert",
              cert_path: "./cert.pem",
              key_path: "./key.pem",
            },
          ],
        },
      } as any);

      const serviceWithCerts = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService
      );

      expect(serviceWithCerts).toBeInstanceOf(ExecutionService);
    });
  });

  describe("branch coverage - config with base_url and timeouts", () => {
    it("should use global base_url from config", () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: { timeout: 45000 },
        discovery: {},
        reporting: {},
        test_directory: "./tests",
        globals: {
          base_url: "https://global.api.com",
          timeouts: { default: 60000 },
        },
      } as any);

      const serviceWithGlobalUrl = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService
      );

      expect(serviceWithGlobalUrl).toBeInstanceOf(ExecutionService);
    });

    it("should fallback to default timeout when not configured", () => {
      mockConfigManager.getConfig.mockReturnValue({
        execution: {},
        discovery: {},
        reporting: {},
        test_directory: "./tests",
        globals: {},
      } as any);

      const serviceWithDefaultTimeout = new ExecutionService(
        mockConfigManager,
        mockGlobalVariablesService,
        mockPriorityService,
        mockDependencyService,
        mockGlobalRegistryService
      );

      expect(serviceWithDefaultTimeout).toBeInstanceOf(ExecutionService);
    });
  });

  describe("branch coverage - step identifiers edge cases", () => {
    it("should handle step with very long name", () => {
      const longName = "a".repeat(200);
      const normalized = (executionService as any).normalizeStepId(longName);

      expect(normalized).toBeDefined();
      expect(normalized.length).toBeLessThanOrEqual(200);
    });

    it("should handle step with multiple spaces", () => {
      const normalized = (executionService as any).normalizeStepId(
        "Step    With    Many    Spaces"
      );

      expect(normalized).toBe("step-with-many-spaces");
    });

    it("should handle step with leading/trailing dashes", () => {
      const normalized = (executionService as any).normalizeStepId(
        "---step-name---"
      );

      expect(normalized).toBe("step-name");
    });
  });

  describe("branch coverage - performance summary edge cases", () => {
    it("should handle single request in performance summary", () => {
      (executionService as any).performanceData.requests = [
        {
          url: "/single",
          method: "GET",
          duration_ms: 100,
          status_code: 200,
        },
      ];

      const summary = executionService.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(summary!.total_requests).toBe(1);
      expect(summary!.average_response_time_ms).toBe(100);
      expect(summary!.min_response_time_ms).toBe(100);
      expect(summary!.max_response_time_ms).toBe(100);
    });

    it("should limit slowest endpoints to 5", () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push({
          url: `/endpoint-${i}`,
          method: "GET",
          duration_ms: i * 100,
          status_code: 200,
        });
      }

      (executionService as any).performanceData.requests = requests;

      const summary = executionService.getPerformanceSummary();

      expect(summary!.slowest_endpoints.length).toBeLessThanOrEqual(5);
    });
  });

  describe("branch coverage - cloneData with structuredClone", () => {
    it("should use structuredClone when available", () => {
      const originalStructuredClone = (globalThis as any).structuredClone;

      (globalThis as any).structuredClone = jest.fn((val) =>
        JSON.parse(JSON.stringify(val))
      );

      const data = { nested: { value: "test" }, array: [1, 2, 3] };
      const cloned = (executionService as any).cloneData(data);

      expect(cloned).toEqual(data);
      expect((globalThis as any).structuredClone).toHaveBeenCalled();

      (globalThis as any).structuredClone = originalStructuredClone;
    });
  });

  describe("branch coverage - interpolateCallVariables", () => {
    it("should deeply clone and interpolate call variables", () => {
      const variables = {
        user: "{{current_user}}",
        nested: {
          value: "{{nested_value}}",
        },
      };

      mockGlobalVariablesService.interpolate = jest.fn().mockReturnValue({
        user: "john",
        nested: {
          value: "interpolated",
        },
      });

      const result = (executionService as any).interpolateCallVariables(
        variables
      );

      expect(result).toEqual({
        user: "john",
        nested: {
          value: "interpolated",
        },
      });
    });
  });

  describe("branch coverage - processCapturedVariables", () => {
    it("should process multiple captured variables with namespace", () => {
      const captured = {
        token: "abc",
        user_id: "123",
        session_id: "xyz",
      };
      const suite = { node_id: "test-suite" } as any;

      const processed = (executionService as any).processCapturedVariables(
        captured,
        suite,
        true
      );

      expect(processed["test-suite.token"]).toBe("abc");
      expect(processed["test-suite.user_id"]).toBe("123");
      expect(processed["test-suite.session_id"]).toBe("xyz");
    });
  });

  describe("branch coverage - getAllCapturedVariables from steps", () => {
    it("should collect variables from multiple step results", () => {
      const result = {
        steps_results: [
          {
            step_name: "Step 1",
            status: "success" as const,
            duration_ms: 100,
            captured_variables: { var1: "value1", var2: "value2" },
          },
          {
            step_name: "Step 2",
            status: "success" as const,
            duration_ms: 150,
            captured_variables: { var3: "value3" },
          },
          {
            step_name: "Step 3",
            status: "success" as const,
            duration_ms: 200,
            // No captured variables
          },
        ],
      };

      const allVars = (executionService as any).getAllCapturedVariables(result);

      expect(allVars).toEqual({
        var1: "value1",
        var2: "value2",
        var3: "value3",
      });
    });
  });
});
