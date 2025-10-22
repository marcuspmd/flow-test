/**
 * @fileoverview Unit tests for InputStepStrategy.
 */

import { InputStepStrategy } from "../input-step.strategy";
import type { StepExecutionContext } from "../step-execution.strategy";
import type {
  TestStep,
  TestSuite,
  InputResult,
} from "../../types/engine.types";

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
    setRuntimeVariable: jest.fn(),
    setVariable: jest.fn(),
    setRuntimeVariables: jest.fn(),
  };

  const mockInputService = {
    promptUser: jest.fn().mockResolvedValue({
      variable: "user_input",
      value: "test_value",
      validation_passed: true,
      used_default: false,
      timed_out: false,
      input_time_ms: 1000,
    }),
    setExecutionContext: jest.fn(),
  };

  const mockDynamicExpressionService = {
    processInputDynamics: jest.fn(() => ({
      assignments: [],
      registeredDefinitions: [],
    })),
    reevaluate: jest.fn(() => []),
    registerDefinitions: jest.fn(),
  };

  const mockHttpService = {};
  const mockAssertionService = {};
  const mockCaptureService = {};
  const mockScenarioService = {};
  const mockScriptExecutorService = {};
  const mockCallService = {};
  const mockIterationService = {};

  const step: TestStep = {
    name: "Input Step",
    input: {
      variable: "user_input",
      prompt: "Enter value:",
      type: "text",
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

describe("InputStepStrategy", () => {
  let strategy: InputStepStrategy;

  beforeEach(() => {
    strategy = new InputStepStrategy();
  });

  describe("canHandle", () => {
    it("should return true for step with only input", () => {
      const step: TestStep = {
        name: "Test",
        input: { variable: "var", prompt: "Enter:", type: "text" },
      };

      expect(strategy.canHandle(step)).toBe(true);
    });

    it("should return false for step without input", () => {
      const step: TestStep = {
        name: "Test",
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with input but also request", () => {
      const step: TestStep = {
        name: "Test",
        input: { variable: "var", prompt: "Enter:", type: "text" },
        request: { method: "GET", url: "/test" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with input but also call", () => {
      const step: TestStep = {
        name: "Test",
        input: { variable: "var", prompt: "Enter:", type: "text" },
        call: { test: "other.yaml", step: "step-1" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with input but also iterate", () => {
      const step: TestStep = {
        name: "Test",
        input: { variable: "var", prompt: "Enter:", type: "text" },
        iterate: { over: "{{items}}", as: "item" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });
  });

  describe("execute", () => {
    it("should execute simple input step successfully", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.step_name).toBe("Input Step");
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(context.inputService.promptUser).toHaveBeenCalled();
    });

    it("should set execution context before prompting", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.inputService.setExecutionContext).toHaveBeenCalledWith(
        expect.objectContaining({
          suite_name: "Test Suite",
          step_name: "Input Step",
          step_index: 0,
        })
      );
    });

    it("should capture input variable when validation passes", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.captured_variables).toEqual({
        user_input: "test_value",
      });
      expect(context.globalVariables.setRuntimeVariable).toHaveBeenCalledWith(
        "user_input",
        "test_value"
      );
    });

    it("should include input results in response", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.input_results).toBeDefined();
      expect(result.input_results?.length).toBe(1);
      expect(result.input_results?.[0].variable).toBe("user_input");
      expect(result.input_results?.[0].value).toBe("test_value");
    });

    it("should handle multiple inputs", async () => {
      const context = createMockContext();
      context.step.input = [
        { variable: "input1", prompt: "Enter 1:", type: "text" },
        { variable: "input2", prompt: "Enter 2:", type: "text" },
      ];

      (context.inputService.promptUser as jest.Mock).mockResolvedValue([
        {
          variable: "input1",
          value: "value1",
          validation_passed: true,
          used_default: false,
          timed_out: false,
          input_time_ms: 500,
        },
        {
          variable: "input2",
          value: "value2",
          validation_passed: true,
          used_default: false,
          timed_out: false,
          input_time_ms: 600,
        },
      ]);

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.input_results?.length).toBe(2);
      expect(result.captured_variables).toEqual({
        input1: "value1",
        input2: "value2",
      });
    });

    it("should log input capture success", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Input captured: user_input")
      );
    });

    it("should log when default value is used", async () => {
      const context = createMockContext();
      (context.inputService.promptUser as jest.Mock).mockResolvedValue({
        variable: "user_input",
        value: "default_value",
        validation_passed: true,
        used_default: true,
        timed_out: false,
        input_time_ms: 100,
      });

      await strategy.execute(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("(default)")
      );
    });

    it("should process dynamic expressions when configured", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: {
          scope: "runtime",
          computed: { derived: "value * 2" },
        },
      };

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockReturnValue({
        assignments: [
          {
            name: "derived",
            value: "computed_value",
            scope: "runtime",
            source_type: "computed",
          },
        ],
        registeredDefinitions: [],
      });

      const result = await strategy.execute(context);

      expect(
        context.dynamicExpressionService.processInputDynamics
      ).toHaveBeenCalled();
      expect(result.dynamic_assignments).toBeDefined();
      expect(result.dynamic_assignments?.length).toBe(1);
    });

    it("should apply runtime scope dynamic assignments", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: {
          scope: "runtime",
          computed: { derived: "value * 2" },
        },
      };

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockReturnValue({
        assignments: [
          {
            name: "derived_var",
            value: 42,
            scope: "runtime",
            source_type: "computed",
          },
        ],
        registeredDefinitions: [],
      });

      await strategy.execute(context);

      expect(context.globalVariables.setRuntimeVariable).toHaveBeenCalledWith(
        "derived_var",
        42
      );
    });

    it("should apply suite scope dynamic assignments", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: {
          scope: "suite",
          computed: { derived: "value * 2" },
        },
      };

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockReturnValue({
        assignments: [
          {
            name: "suite_var",
            value: "suite_value",
            scope: "suite",
            source_type: "computed",
          },
        ],
        registeredDefinitions: [],
      });

      await strategy.execute(context);

      expect(context.suite.variables).toEqual({
        suite_var: "suite_value",
      });
    });

    it("should apply global scope dynamic assignments", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: {
          scope: "global",
          computed: { derived: "value * 2" },
        },
      };

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockReturnValue({
        assignments: [
          {
            name: "global_var",
            value: "global_value",
            scope: "global",
            source_type: "computed",
          },
        ],
        registeredDefinitions: [],
      });

      await strategy.execute(context);

      expect(context.globalVariables.setVariable).toHaveBeenCalledWith(
        "test-suite.global_var",
        "global_value"
      );
    });

    it("should register dynamic definitions", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: {
          reevaluate: [
            {
              name: "derived",
              expression: "user_input * 2",
              type: "computed" as const,
            },
          ],
        },
      };

      const mockDefinitions = [
        {
          name: "derived",
          expression: "user_input * 2",
          type: "computed" as const,
        },
      ];

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockReturnValue({
        assignments: [],
        registeredDefinitions: mockDefinitions,
      });

      await strategy.execute(context);

      expect(
        context.dynamicExpressionService.registerDefinitions
      ).toHaveBeenCalledWith(mockDefinitions);
    });

    it("should reevaluate dependent variables", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: {
          reevaluate: [
            {
              name: "derived",
              expression: "user_input * 2",
              type: "computed" as const,
            },
          ],
        },
      };

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockReturnValue({
        assignments: [],
        registeredDefinitions: [],
      });

      (
        context.dynamicExpressionService.reevaluate as jest.Mock
      ).mockReturnValue([
        {
          name: "reevaluated_var",
          value: "reevaluated_value",
          scope: "runtime",
          source_type: "reevaluated",
        },
      ]);

      const result = await strategy.execute(context);

      expect(context.dynamicExpressionService.reevaluate).toHaveBeenCalled();
      expect(result.captured_variables?.reevaluated_var).toBe(
        "reevaluated_value"
      );
    });

    it("should handle input validation failure gracefully", async () => {
      const context = createMockContext();
      (context.inputService.promptUser as jest.Mock).mockResolvedValue({
        variable: "user_input",
        value: "",
        validation_passed: false,
        validation_error: "Value is required",
        used_default: false,
        timed_out: false,
        input_time_ms: 100,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success"); // Continue despite validation failure
      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Input validation failed")
      );
    });

    it("should throw error if step has no input configuration", async () => {
      const context = createMockContext();
      context.step.input = undefined;

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("must have 'input' configuration");
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

    it("should handle promptUser rejection with failure result", async () => {
      const context = createMockContext();
      (context.inputService.promptUser as jest.Mock).mockRejectedValue(
        new Error("Input timeout")
      );

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Input timeout");
    });

    it("should handle dynamic expression processing errors gracefully", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: { computed: { bad: "invalid.expression" } },
      };

      (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mockImplementation(() => {
        throw new Error("Expression evaluation failed");
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Expression evaluation failed");
    });

    it("should not include dynamic_assignments when empty", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.dynamic_assignments).toBeUndefined();
    });

    it("should build dynamic context correctly", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
        dynamic: { computed: { derived: "value" } },
      };

      await strategy.execute(context);

      const processCall = (
        context.dynamicExpressionService.processInputDynamics as jest.Mock
      ).mock.calls[0];
      const dynamicContext = processCall[2];

      expect(dynamicContext.suite.node_id).toBe("test-suite");
      expect(dynamicContext.step.name).toBe("Input Step");
      expect(dynamicContext.response).toBeUndefined();
      expect(dynamicContext.request).toBeUndefined();
    });
  });
});
