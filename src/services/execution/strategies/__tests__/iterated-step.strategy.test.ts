/**
 * @fileoverview Unit tests for IteratedStepStrategy.
 */

import { IteratedStepStrategy } from "../iterated-step.strategy";
import { StepStrategyFactory } from "../step-strategy.factory";
import type { StepExecutionContext } from "../step-execution.strategy";
import type { TestStep, TestSuite } from "../../../../types/engine.types";
import type { StepExecutionResult } from "../../../../types/config.types";

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
    getAllVariables: jest.fn(() => ({ test_users: [{ id: 1 }, { id: 2 }] })),
    interpolate: jest.fn((obj) => obj),
    interpolateString: jest.fn((str) => str),
    setRuntimeVariables: jest.fn(),
    setRuntimeVariable: jest.fn(),
    createSnapshot: jest.fn(() => jest.fn()), // Returns restore function
  };

  const mockIterationService = {
    validateIteration: jest.fn(() => []), // No errors
    expandIteration: jest.fn(() => [
      { variableName: "user", value: { id: 1 } },
      { variableName: "user", value: { id: 2 } },
    ]),
  };

  const mockHttpService = {};
  const mockAssertionService = {};
  const mockCaptureService = {};
  const mockScenarioService = {};
  const mockInputService = {};
  const mockDynamicExpressionService = {};
  const mockScriptExecutorService = {};
  const mockCallService = {};
  const mockConfigManager = {};

  const step: TestStep = {
    name: "Iterated Step",
    iterate: {
      over: "{{test_users}}",
      as: "user",
    },
    request: {
      method: "GET",
      url: "/users/{{user.id}}",
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

describe("IteratedStepStrategy", () => {
  let strategy: IteratedStepStrategy;
  let factory: StepStrategyFactory;

  beforeEach(() => {
    strategy = new IteratedStepStrategy();
    factory = new StepStrategyFactory();

    // Create a mock strategy that returns success results
    const mockStrategy = {
      canHandle: jest.fn(() => true),
      execute: jest.fn().mockResolvedValue({
        step_id: "step-1",
        qualified_step_id: "test-suite.step-1",
        step_name: "Test Step",
        status: "success",
        duration_ms: 100,
        captured_variables: { result: "success" },
        assertions_results: [],
        available_variables: {},
      }),
    };

    factory.registerStrategy(mockStrategy);
    strategy.setFactory(factory);
  });

  describe("canHandle", () => {
    it("should return true for step with iterate", () => {
      const step: TestStep = {
        name: "Test",
        iterate: { over: "{{items}}", as: "item" },
      };

      expect(strategy.canHandle(step)).toBe(true);
    });

    it("should return false for step without iterate", () => {
      const step: TestStep = {
        name: "Test",
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return true even if iterate is with other properties", () => {
      const step: TestStep = {
        name: "Test",
        iterate: { over: "{{items}}", as: "item" },
        request: { method: "GET", url: "/test" },
      };

      expect(strategy.canHandle(step)).toBe(true);
    });
  });

  describe("execute", () => {
    it("should execute simple iteration successfully", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.step_name).toBe("Iterated Step");
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should validate iteration configuration", async () => {
      const context = createMockContext();
      (context.iterationService.validateIteration as jest.Mock).mockReturnValue(
        ["Invalid config"]
      );

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Invalid iteration configuration");
    });

    it("should expand iterations using iterationService", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.iterationService.expandIteration).toHaveBeenCalledWith(
        context.step.iterate,
        expect.any(Object)
      );
    });

    it("should handle empty iterations gracefully", async () => {
      const context = createMockContext();
      (context.iterationService.expandIteration as jest.Mock).mockReturnValue(
        []
      );

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No iterations to execute")
      );
    });

    it("should execute each iteration with correct context", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.globalVariables.setRuntimeVariable).toHaveBeenCalledWith(
        "user",
        { id: 1 }
      );
      expect(context.globalVariables.setRuntimeVariable).toHaveBeenCalledWith(
        "user",
        { id: 2 }
      );
    });

    it("should set iteration metadata (_iteration variable)", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      // First iteration
      expect(context.globalVariables.setRuntimeVariable).toHaveBeenCalledWith(
        "_iteration",
        expect.objectContaining({
          index: 0,
          total: 2,
          isFirst: true,
          isLast: false,
        })
      );

      // Second iteration
      expect(context.globalVariables.setRuntimeVariable).toHaveBeenCalledWith(
        "_iteration",
        expect.objectContaining({
          index: 1,
          total: 2,
          isFirst: false,
          isLast: true,
        })
      );
    });

    it("should remove iterate property from iteration step", async () => {
      const context = createMockContext();
      const mockExecute = jest.fn().mockResolvedValue({
        status: "success",
        duration_ms: 100,
      });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      await strategy.execute(context);

      const executedStep = mockExecute.mock.calls[0][0].step;
      expect(executedStep.iterate).toBeUndefined();
    });

    it("should create unique identifiers for each iteration", async () => {
      const context = createMockContext();
      const mockExecute = jest.fn().mockResolvedValue({
        status: "success",
        duration_ms: 100,
      });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      await strategy.execute(context);

      const firstIterationContext = mockExecute.mock.calls[0][0];
      const secondIterationContext = mockExecute.mock.calls[1][0];

      expect(firstIterationContext.identifiers.stepId).toBe("step-1-iter-1");
      expect(secondIterationContext.identifiers.stepId).toBe("step-1-iter-2");
    });

    it("should restore variable snapshot after each iteration", async () => {
      const context = createMockContext();
      const restoreFn = jest.fn();
      (context.globalVariables.createSnapshot as jest.Mock).mockReturnValue(
        restoreFn
      );

      await strategy.execute(context);

      expect(restoreFn).toHaveBeenCalledTimes(2); // Once per iteration
    });

    it("should combine captured variables from all iterations", async () => {
      const context = createMockContext();

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          captured_variables: { result: "first" },
        })
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          captured_variables: { result: "second" },
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      const result = await strategy.execute(context);

      expect(result.captured_variables).toEqual({
        result_iteration_0: "first",
        result_iteration_1: "second",
      });
    });

    it("should combine assertions from all iterations", async () => {
      const context = createMockContext();

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          assertions_results: [{ field: "status", passed: true }],
        })
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          assertions_results: [{ field: "body", passed: true }],
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      const result = await strategy.execute(context);

      expect(result.assertions_results).toHaveLength(2);
    });

    it("should mark as failure if any iteration fails", async () => {
      const context = createMockContext();

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
        })
        .mockResolvedValueOnce({
          status: "failure",
          duration_ms: 100,
          error_message: "Request failed",
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
    });

    it("should stop on first failure by default", async () => {
      const context = createMockContext();

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "failure",
          duration_ms: 100,
          error_message: "First failed",
        })
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      await strategy.execute(context);

      // Should only execute once (first iteration that failed)
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("should continue on failure when continue_on_failure is true", async () => {
      const context = createMockContext();
      context.step.continue_on_failure = true;

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "failure",
          duration_ms: 100,
          error_message: "First failed",
        })
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      await strategy.execute(context);

      // Should execute both iterations
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it("should include iteration results in response", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.iteration_results).toBeDefined();
      expect(result.iteration_results).toHaveLength(2);
    });

    it("should use request_details from first iteration", async () => {
      const context = createMockContext();

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          request_details: { method: "GET", url: "/first" },
        })
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          request_details: { method: "GET", url: "/second" },
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      const result = await strategy.execute(context);

      expect(result.request_details).toEqual({ method: "GET", url: "/first" });
    });

    it("should use response_details from last iteration", async () => {
      const context = createMockContext();

      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          response_details: { status: 200, body: "first" },
        })
        .mockResolvedValueOnce({
          status: "success",
          duration_ms: 100,
          response_details: { status: 200, body: "last" },
        });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      const result = await strategy.execute(context);

      expect(result.response_details).toEqual({ status: 200, body: "last" });
    });

    it("should throw error if step has no iterate configuration", async () => {
      const context = createMockContext({
        step: {
          name: "Test Step",
          request: { method: "GET", url: "/test" },
        } as TestStep,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain(
        "must have 'iterate' configuration"
      );
    });

    it("should throw error if factory is not set", async () => {
      const context = createMockContext();
      const strategyWithoutFactory = new IteratedStepStrategy();

      const result = await strategyWithoutFactory.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Factory not set");
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

    it("should track total execution duration accurately", async () => {
      const context = createMockContext();

      const startTime = Date.now();
      const result = await strategy.execute(context);
      const endTime = Date.now();

      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.duration_ms).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    it("should handle iteration service errors gracefully", async () => {
      const context = createMockContext();
      (
        context.iterationService.expandIteration as jest.Mock
      ).mockImplementation(() => {
        throw new Error("Expansion failed");
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Expansion failed");
    });

    it("should log iteration progress", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting iteration 1 of 2")
      );
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting iteration 2 of 2")
      );
    });

    it("should log successful iteration completion", async () => {
      const context = createMockContext();

      await strategy.execute(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Iteration 1 completed successfully")
      );
    });

    it("should log iteration failure", async () => {
      const context = createMockContext();

      const mockExecute = jest.fn().mockResolvedValue({
        status: "failure",
        duration_ms: 100,
        error_message: "Test error",
      });

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      await strategy.execute(context);

      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Iteration 1 failed")
      );
    });

    it("should restore variables even if iteration throws error", async () => {
      const context = createMockContext();
      const restoreFn = jest.fn();
      (context.globalVariables.createSnapshot as jest.Mock).mockReturnValue(
        restoreFn
      );

      const mockExecute = jest
        .fn()
        .mockRejectedValue(new Error("Iteration error"));

      factory = new StepStrategyFactory();
      factory.registerStrategy({
        canHandle: () => true,
        execute: mockExecute,
      });
      strategy.setFactory(factory);

      await strategy.execute(context);

      // Snapshot restore should be called even on error
      expect(restoreFn).toHaveBeenCalled();
    });
  });
});
