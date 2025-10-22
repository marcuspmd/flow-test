/**
 * @fileoverview Unit tests for CallStepStrategy.
 */

import { CallStepStrategy } from "../call-step.strategy";
import type { StepExecutionContext } from "../step-execution.strategy";
import type { TestStep, TestSuite } from "../../../../types/engine.types";
import type { StepCallResult } from "../../../../types/call.types";

// Mock context builder helper
const createMockContext = (
  overrides?: Partial<StepExecutionContext>
): StepExecutionContext => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockGlobalVariables = {
    getAllVariables: jest.fn(() => ({ existing_var: "value" })),
    interpolate: jest.fn((obj) => obj),
    interpolateString: jest.fn((str) => str),
    setRuntimeVariables: jest.fn(),
    setRuntimeVariable: jest.fn(),
  };

  const mockCallService = {
    executeStepCall: jest.fn().mockResolvedValue({
      success: true,
      propagated_variables: { result: "success" },
    } as StepCallResult),
  };

  const mockConfigManager = {
    getConfig: jest.fn(() => ({
      test_directory: "./tests",
    })),
  };

  const mockHttpService = {};
  const mockAssertionService = {};
  const mockCaptureService = {};
  const mockScenarioService = {};
  const mockInputService = {};
  const mockDynamicExpressionService = {};
  const mockScriptExecutorService = {};
  const mockIterationService = {};

  const step: TestStep = {
    name: "Call Step",
    call: {
      test: "./other-suite.yaml",
      step: "target-step",
    },
  };

  const suite: TestSuite = {
    node_id: "test-suite",
    suite_name: "Test Suite",
    steps: [step],
  };

  return {
    suite,
    step,
    stepIndex: 0,
    identifiers: {
      stepId: "step-1",
      qualifiedStepId: "test-suite.step-1",
      normalizedQualifiedStepId: "test_suite_step_1",
    },
    globalVariables: mockGlobalVariables as any,
    httpService: mockHttpService as any,
    assertionService: mockAssertionService as any,
    captureService: mockCaptureService as any,
    scenarioService: mockScenarioService as any,
    inputService: mockInputService as any,
    dynamicExpressionService: mockDynamicExpressionService as any,
    scriptExecutorService: mockScriptExecutorService as any,
    callService: mockCallService as any,
    iterationService: mockIterationService as any,
    configManager: mockConfigManager as any,
    stepCallStack: [],
    hooks: {},
    logger: mockLogger as any,
    discoveredTest: {
      file_path: "/path/to/test.yaml",
      suite_name: "Test Suite",
      node_id: "test-suite",
    } as any,
    ...overrides,
  };
};

describe("CallStepStrategy", () => {
  let strategy: CallStepStrategy;

  beforeEach(() => {
    strategy = new CallStepStrategy();
  });

  describe("canHandle", () => {
    it("should return true for step with call", () => {
      const step: TestStep = {
        name: "Test",
        call: { test: "./other.yaml", step: "step-1" },
      };

      expect(strategy.canHandle(step)).toBe(true);
    });

    it("should return false for step without call", () => {
      const step: TestStep = {
        name: "Test",
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with call but also request", () => {
      const step: TestStep = {
        name: "Test",
        call: { test: "./other.yaml", step: "step-1" },
        request: { method: "GET", url: "/test" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with call but also iterate", () => {
      const step: TestStep = {
        name: "Test",
        call: { test: "./other.yaml", step: "step-1" },
        iterate: { over: "{{items}}", as: "item" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });
  });

  describe("execute", () => {
    it("should execute simple call step successfully", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.step_name).toBe("Call Step");
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(context.callService.executeStepCall).toHaveBeenCalled();
    });

    it("should interpolate test path and step name", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "{{suite_path}}",
        step: "{{step_name}}",
      };

      (context.globalVariables.interpolateString as jest.Mock)
        .mockReturnValueOnce("./interpolated.yaml")
        .mockReturnValueOnce("interpolated-step");

      await strategy.execute(context);

      expect(context.globalVariables.interpolateString).toHaveBeenCalledWith(
        "{{suite_path}}"
      );
      expect(context.globalVariables.interpolateString).toHaveBeenCalledWith(
        "{{step_name}}"
      );
    });

    it("should propagate variables when call succeeds", async () => {
      const context = createMockContext();
      (context.callService.executeStepCall as jest.Mock).mockResolvedValue({
        success: true,
        propagated_variables: { captured_value: 42 },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.captured_variables).toEqual({ captured_value: 42 });
      expect(context.globalVariables.setRuntimeVariables).toHaveBeenCalledWith({
        captured_value: 42,
      });
    });

    it("should not propagate variables when call fails", async () => {
      const context = createMockContext();
      (context.callService.executeStepCall as jest.Mock).mockResolvedValue({
        success: false,
        error: "Step not found",
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(
        context.globalVariables.setRuntimeVariables
      ).not.toHaveBeenCalled();
    });

    it("should pass variables to called step", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        variables: { param1: "value1", param2: 123 },
      };

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].variables).toEqual({ param1: "value1", param2: 123 });
    });

    it("should interpolate call variables", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        variables: { user_id: "{{current_user}}" },
      };

      (context.globalVariables.interpolate as jest.Mock).mockReturnValue({
        user_id: "123",
      });

      await strategy.execute(context);

      expect(context.globalVariables.interpolate).toHaveBeenCalledWith({
        user_id: "{{current_user}}",
      });
    });

    it("should respect isolate_context setting", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        isolate_context: false,
      };

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].isolate_context).toBe(false);
    });

    it("should default isolate_context to true", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].isolate_context).toBe(true);
    });

    it("should pass timeout configuration", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        timeout: 5000,
      };

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].timeout).toBe(5000);
    });

    it("should pass retry configuration", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        retry: { max_attempts: 3, delay_ms: 1000 },
      };

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].retry).toEqual({ max_attempts: 3, delay_ms: 1000 });
    });

    it("should pass on_error strategy", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        on_error: "continue",
      };

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].on_error).toBe("continue");
    });

    it("should pass path_type configuration", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        path_type: "absolute",
      };

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[0].path_type).toBe("absolute");
    });

    it("should include caller information in options", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      const options = callArgs[1];

      expect(options.callerSuitePath).toBe("/path/to/test.yaml");
      expect(options.callerNodeId).toBe("test-suite");
      expect(options.callerSuiteName).toBe("Test Suite");
    });

    it("should pass call stack for loop detection", async () => {
      const context = createMockContext({
        stepCallStack: ["suite1::step1", "suite2::step2"],
      });

      await strategy.execute(context);

      const callArgs = (context.callService.executeStepCall as jest.Mock).mock
        .calls[0];
      expect(callArgs[1].callStack).toEqual(["suite1::step1", "suite2::step2"]);
    });

    it("should log call initiation", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("📞 Calling step"),
        expect.any(Object)
      );
    });

    it("should log successful call completion", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("✅ Step call"),
        expect.any(Object)
      );
    });

    it("should log warning when call fails", async () => {
      const context = createMockContext();
      (context.callService.executeStepCall as jest.Mock).mockResolvedValue({
        success: false,
        error: "Step not found",
      });

      await strategy.execute(context);

      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("⚠️ Step call"),
        expect.any(Object)
      );
    });

    it("should throw error if step has no call configuration", async () => {
      const context = createMockContext();
      context.step.call = undefined;

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("must have 'call' configuration");
    });

    it("should throw error if no caller suite path", async () => {
      const context = createMockContext({
        discoveredTest: undefined,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("without a caller suite path");
    });

    it("should validate call cannot have request", async () => {
      const context = createMockContext();
      context.step.request = { method: "GET", url: "/test" };

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("cannot define 'call' alongside");
      expect(result.error_message).toContain("request");
    });

    it("should validate call cannot have input", async () => {
      const context = createMockContext();
      context.step.input = { variable: "var", prompt: "Enter:", type: "text" };

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("cannot define 'call' alongside");
      expect(result.error_message).toContain("input");
    });

    it("should validate call cannot have scenarios", async () => {
      const context = createMockContext();
      context.step.scenarios = [{ name: "test", condition: "true", then: {} }];

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("cannot define 'call' alongside");
      expect(result.error_message).toContain("scenarios");
    });

    it("should validate variables must be an object", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        variables: ["array", "not", "allowed"] as any,
      };

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain(
        "must be an object with key/value pairs"
      );
    });

    it("should validate on_error must be valid strategy", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: "step-1",
        on_error: "invalid" as any,
      };

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Invalid call error strategy");
    });

    it("should validate test must be a string", async () => {
      const context = createMockContext();
      context.step.call = {
        test: 123 as any,
        step: "step-1",
      };

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("must define 'test' as string");
    });

    it("should validate step must be a string", async () => {
      const context = createMockContext();
      context.step.call = {
        test: "./other.yaml",
        step: 456 as any,
      };

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("must define 'step' as string");
    });

    it("should handle empty interpolated test path", async () => {
      const context = createMockContext();
      (context.globalVariables.interpolateString as jest.Mock).mockReturnValue(
        ""
      );

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain(
        "both 'test' and 'step' are required"
      );
    });

    it("should filter internal variables from available_variables", async () => {
      const context = createMockContext();
      (context.globalVariables.getAllVariables as jest.Mock).mockReturnValue({
        public_var: "value",
        _internal_var: "hidden",
        another_public: 123,
      });

      const result = await strategy.execute(context);

      expect(result.available_variables).toEqual({
        public_var: "value",
        another_public: 123,
      });
      expect(result.available_variables).not.toHaveProperty("_internal_var");
    });

    it("should track execution duration accurately", async () => {
      const context = createMockContext();

      const startTime = Date.now();
      const result = await strategy.execute(context);
      const endTime = Date.now();

      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.duration_ms).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    it("should handle call service errors gracefully", async () => {
      const context = createMockContext();
      (context.callService.executeStepCall as jest.Mock).mockRejectedValue(
        new Error("Call service error")
      );

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Call service error");
    });

    it("should use default test_directory if configManager missing", async () => {
      const context = createMockContext({
        configManager: undefined,
      });

      await strategy.execute(context);

      // Should not throw, uses "./tests" as default
      expect(context.callService.executeStepCall).toHaveBeenCalled();
    });

    it("should not include captured_variables if empty", async () => {
      const context = createMockContext();
      (context.callService.executeStepCall as jest.Mock).mockResolvedValue({
        success: true,
        propagated_variables: {},
      });

      const result = await strategy.execute(context);

      expect(result.captured_variables).toBeUndefined();
    });

    it("should determine status from call result", async () => {
      const context = createMockContext();
      (context.callService.executeStepCall as jest.Mock).mockResolvedValue({
        success: true,
        status: "skipped",
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("skipped");
    });
  });
});
