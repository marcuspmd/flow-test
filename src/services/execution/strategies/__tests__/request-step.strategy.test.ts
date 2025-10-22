/**
 * @fileoverview Unit tests for RequestStepStrategy.
 */

import { RequestStepStrategy } from "../request-step.strategy";
import type { StepExecutionContext } from "../step-execution.strategy";
import type {
  TestStep,
  TestSuite,
  StepExecutionResult,
} from "../../../../types/engine.types";

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
    getAllVariables: jest.fn(() => ({ test_var: "value" })),
    interpolate: jest.fn((obj) => obj),
    setRuntimeVariables: jest.fn(),
  };

  const mockHttpService = {
    executeRequest: jest.fn().mockResolvedValue({
      status: "success",
      request_details: {
        method: "GET",
        url: "/test",
      },
      response_details: {
        status: 200,
        headers: {},
        body: { success: true },
      },
      response_time: 100,
    }),
    getBaseUrl: jest.fn(() => "https://api.example.com"),
  };

  const mockAssertionService = {
    validateAssertions: jest.fn(() => []),
  };

  const mockCaptureService = {
    captureVariables: jest.fn(() => ({})),
    captureFromObject: jest.fn(() => ({})),
  };

  const mockScenarioService = {
    processScenarios: jest.fn(),
  };

  const mockInputService = {
    promptMultipleInputs: jest.fn().mockResolvedValue([]),
  };

  const mockScriptExecutorService = {
    executePreRequestScript: jest.fn().mockResolvedValue({
      variables: {},
      console_output: [],
    }),
    executePostRequestScript: jest.fn().mockResolvedValue({
      variables: {},
      console_output: [],
    }),
  };

  const mockDynamicExpressionService = {
    evaluate: jest.fn(),
  };

  const mockCallService = {};
  const mockIterationService = {};

  const step: TestStep = {
    name: "Test Step",
    request: { method: "GET", url: "/test" },
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
    ...overrides,
  };
};

describe("RequestStepStrategy", () => {
  let strategy: RequestStepStrategy;

  beforeEach(() => {
    strategy = new RequestStepStrategy();
  });

  describe("canHandle", () => {
    it("should return true for step with request", () => {
      const step: TestStep = {
        name: "Test",
        request: { method: "GET", url: "/test" },
      };

      expect(strategy.canHandle(step)).toBe(true);
    });

    it("should return false for step without request", () => {
      const step: TestStep = {
        name: "Test",
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with request but also iterate", () => {
      const step: TestStep = {
        name: "Test",
        request: { method: "GET", url: "/test" },
        iterate: { over: "{{items}}", as: "item" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with request but also call", () => {
      const step: TestStep = {
        name: "Test",
        request: { method: "GET", url: "/test" },
        call: { test: "other.yaml", step: "step-1" },
      };

      expect(strategy.canHandle(step)).toBe(false);
    });
  });

  describe("execute", () => {
    it("should execute simple GET request successfully", async () => {
      const context = createMockContext();

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.step_name).toBe("Test Step");
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(context.httpService.executeRequest).toHaveBeenCalledWith(
        "Test Step",
        context.step.request
      );
    });

    it("should interpolate variables before request", async () => {
      const context = createMockContext();
      context.step.request = { method: "GET", url: "/users/{{user_id}}" };

      await strategy.execute(context);

      expect(context.globalVariables.interpolate).toHaveBeenCalledWith(
        context.step.request
      );
    });

    it("should execute assertions when configured", async () => {
      const context = createMockContext();
      context.step.assert = {
        status_code: 200,
        body: { success: { equals: true } },
      };

      await strategy.execute(context);

      expect(context.assertionService.validateAssertions).toHaveBeenCalled();
    });

    it("should capture variables when configured", async () => {
      const context = createMockContext();
      context.step.capture = {
        user_id: "body.id",
      };

      (context.captureService.captureVariables as jest.Mock).mockReturnValue({
        user_id: 123,
      });

      const result = await strategy.execute(context);

      expect(context.captureService.captureVariables).toHaveBeenCalled();
      expect(result.captured_variables).toEqual({ user_id: 123 });
    });

    it("should mark step as failure when assertions fail", async () => {
      const context = createMockContext();
      context.step.assert = { status_code: 200 };

      (
        context.assertionService.validateAssertions as jest.Mock
      ).mockReturnValue([
        { field: "status_code", passed: false, expected: 200, actual: 404 },
      ]);

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("assertion(s) failed");
    });

    it("should execute pre-request script when configured", async () => {
      const context = createMockContext();
      context.step.pre_request = {
        script: "variables.timestamp = Date.now();",
      };

      await strategy.execute(context);

      expect(
        context.scriptExecutorService.executePreRequestScript
      ).toHaveBeenCalled();
    });

    it("should execute post-request script when configured", async () => {
      const context = createMockContext();
      context.step.post_request = {
        script: "variables.response_received = true;",
      };

      await strategy.execute(context);

      expect(
        context.scriptExecutorService.executePostRequestScript
      ).toHaveBeenCalled();
    });

    it("should process scenarios when configured", async () => {
      const context = createMockContext();
      context.step.scenarios = [
        {
          name: "Check success",
          condition: "status_code == `200`",
          then: { capture: { result: "body.data" } },
        },
      ];

      await strategy.execute(context);

      expect(context.scenarioService.processScenarios).toHaveBeenCalled();
    });

    it("should apply suite-level certificate when no step-level certificate", async () => {
      const context = createMockContext();
      context.suite.certificate = {
        cert_path: "./certs/suite.crt",
        key_path: "./certs/suite.key",
      };

      await strategy.execute(context);

      expect(context.globalVariables.interpolate).toHaveBeenCalledWith(
        context.suite.certificate
      );
    });

    it("should handle HTTP request failure gracefully", async () => {
      const context = createMockContext();
      (context.httpService.executeRequest as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Network error");
    });

    it("should throw error if step has no request configuration", async () => {
      const context = createMockContext();
      context.step.request = undefined;

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain(
        "must have 'request' configuration"
      );
    });

    it("should include request details in failure result", async () => {
      const context = createMockContext();
      context.step.request = { method: "POST", url: "/users" };
      (context.httpService.executeRequest as jest.Mock).mockRejectedValue(
        new Error("Server error")
      );

      const result = await strategy.execute(context);

      expect(result.request_details).toBeDefined();
      expect(result.request_details?.method).toBe("POST");
      expect(result.request_details?.url).toBe("/users");
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
  });

  describe("edge cases", () => {
    it("should handle step with both request and input", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter value:",
        type: "text",
      };

      (
        context.inputService.promptMultipleInputs as jest.Mock
      ).mockResolvedValue([
        {
          variable: "user_input",
          value: "test",
          validation_passed: true,
          used_default: false,
          timed_out: false,
          input_time_ms: 1000,
        },
      ]);

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(context.inputService.promptMultipleInputs).toHaveBeenCalled();
    });

    it("should continue on pre-request script error if continue_on_error is true", async () => {
      const context = createMockContext();
      context.step.pre_request = {
        script: "throw new Error('Script error');",
        continue_on_error: true,
      };

      (
        context.scriptExecutorService.executePreRequestScript as jest.Mock
      ).mockRejectedValue(new Error("Script error"));

      const result = await strategy.execute(context);

      // Should continue execution despite script error
      expect(result.status).toBe("success");
      expect(context.httpService.executeRequest).toHaveBeenCalled();
    });

    it("should fail on pre-request script error if continue_on_error is false", async () => {
      const context = createMockContext();
      context.step.pre_request = {
        script: "throw new Error('Script error');",
        continue_on_error: false,
      };

      (
        context.scriptExecutorService.executePreRequestScript as jest.Mock
      ).mockRejectedValue(new Error("Script error"));

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Script error");
    });

    it("should handle empty capture configuration", async () => {
      const context = createMockContext();
      context.step.capture = {};

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.captured_variables).toEqual({});
    });

    it("should handle response with no body", async () => {
      const context = createMockContext();
      (context.httpService.executeRequest as jest.Mock).mockResolvedValue({
        status: "success",
        request_details: { method: "DELETE", url: "/resource/123" },
        response_details: {
          status_code: 204,
          headers: {},
          body: null,
          size_bytes: 0,
        },
        response_time: 50,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.response_details?.status_code).toBe(204);
      expect(result.response_details?.body).toBeNull();
    });

    it("should handle step-level certificate overriding suite certificate", async () => {
      const context = createMockContext();
      context.suite.certificate = {
        cert_path: "./certs/suite.crt",
        key_path: "./certs/suite.key",
      };
      context.step.request!.certificate = {
        pfx_path: "./certs/step.pfx",
        passphrase: "step-pass",
      };

      await strategy.execute(context);

      // Step certificate should be on the request object
      expect(context.step.request?.certificate).toBeDefined();
      expect(context.step.request?.certificate?.pfx_path).toBe(
        "./certs/step.pfx"
      );
    });

    it("should handle post-request script error with continue_on_error true", async () => {
      const context = createMockContext();
      context.step.post_request = {
        script: "throw new Error('Post script error');",
        continue_on_error: true,
      };

      (
        context.scriptExecutorService.executePostRequestScript as jest.Mock
      ).mockRejectedValue(new Error("Post script error"));

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
    });

    it("should fail on post-request script error with continue_on_error false", async () => {
      const context = createMockContext();
      context.step.post_request = {
        script: "throw new Error('Post script error');",
        continue_on_error: false,
      };

      (
        context.scriptExecutorService.executePostRequestScript as jest.Mock
      ).mockRejectedValue(new Error("Post script error"));

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Post script error");
    });

    it("should include dynamic assignments when input has dynamic config", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter value:",
        type: "text",
        dynamic: {
          scope: "runtime",
          computed: { derived: "value * 2" },
        },
      };

      (
        context.inputService.promptMultipleInputs as jest.Mock
      ).mockResolvedValue([
        {
          variable: "user_input",
          value: "test",
          validation_passed: true,
          used_default: false,
          timed_out: false,
          input_time_ms: 1000,
          dynamic_assignments: [
            {
              variable_name: "derived",
              value: "test2",
              scope: "runtime",
              source_type: "computed",
            },
          ],
        },
      ]);

      const result = await strategy.execute(context);

      expect(result.input_results).toBeDefined();
      expect(Array.isArray(result.input_results)).toBe(true);
    });

    it("should merge captures from request and input", async () => {
      const context = createMockContext();
      context.step.capture = { request_data: "body.id" };
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
      };

      (context.captureService.captureVariables as jest.Mock).mockReturnValue({
        request_data: 123,
      });

      (
        context.inputService.promptMultipleInputs as jest.Mock
      ).mockResolvedValue([
        {
          variable: "user_input",
          value: "input_value",
          validation_passed: true,
          used_default: false,
          timed_out: false,
          input_time_ms: 500,
        },
      ]);

      // Mock captureFromObject para processar step.capture após input
      (context.captureService.captureFromObject as jest.Mock).mockReturnValue({
        input_data: "captured_from_input",
      });

      const result = await strategy.execute(context);

      expect(result.captured_variables?.request_data).toBe(123);
    });

    it("should preserve error_message from HTTP result", async () => {
      const context = createMockContext();
      (context.httpService.executeRequest as jest.Mock).mockResolvedValue({
        status: "failure",
        error_message: "Connection timeout",
        request_details: { method: "GET", url: "/test" },
        response_time: 5000,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toBe("Connection timeout");
    });

    it("should include scenarios_meta in result when present", async () => {
      const context = createMockContext();
      const mockHttpResult: any = {
        status: "success",
        request_details: { method: "GET", url: "/test" },
        response_details: {
          status_code: 200,
          headers: {},
          body: {},
          size_bytes: 10,
        },
        response_time: 100,
        scenarios_meta: {
          evaluated: ["scenario1"],
          matched: ["scenario1"],
        },
      };

      (context.httpService.executeRequest as jest.Mock).mockResolvedValue(
        mockHttpResult
      );

      const result = await strategy.execute(context);

      expect(result.scenarios_meta).toEqual({
        evaluated: ["scenario1"],
        matched: ["scenario1"],
      });
    });

    it("should handle capture errors gracefully", async () => {
      const context = createMockContext();
      context.step.capture = { invalid_path: "body.nonexistent.path" };

      (context.captureService.captureVariables as jest.Mock).mockImplementation(
        () => {
          throw new Error("JMESPath evaluation failed");
        }
      );

      const result = await strategy.execute(context);

      // Should catch error and continue
      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("JMESPath evaluation failed");
    });

    it("should handle input processing errors", async () => {
      const context = createMockContext();
      context.step.input = {
        variable: "user_input",
        prompt: "Enter:",
        type: "text",
      };

      (
        context.inputService.promptMultipleInputs as jest.Mock
      ).mockRejectedValue(new Error("Input timeout"));

      const result = await strategy.execute(context);

      // Input errors are logged but don't fail the step
      expect(result.status).toBe("success");
      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Input processing error")
      );
    });

    it("should update runtime variables after capturing", async () => {
      const context = createMockContext();
      context.step.capture = { user_id: "body.id", token: "body.token" };

      (context.captureService.captureVariables as jest.Mock).mockReturnValue({
        user_id: 456,
        token: "abc123",
      });

      await strategy.execute(context);

      expect(context.globalVariables.setRuntimeVariables).toHaveBeenCalledWith({
        user_id: 456,
        token: "abc123",
      });
    });

    it("should handle pre-request script with variable modifications", async () => {
      const context = createMockContext();
      context.step.pre_request = {
        script: "variables.custom_header = 'value';",
      };

      (
        context.scriptExecutorService.executePreRequestScript as jest.Mock
      ).mockResolvedValue({
        variables: { custom_header: "value" },
        console_output: ["Script executed"],
      });

      await strategy.execute(context);

      expect(context.globalVariables.setRuntimeVariables).toHaveBeenCalledWith({
        custom_header: "value",
      });
    });

    it("should handle post-request script with response data", async () => {
      const context = createMockContext();
      context.step.post_request = {
        script: "variables.processed = response.body.data;",
      };

      (
        context.scriptExecutorService.executePostRequestScript as jest.Mock
      ).mockResolvedValue({
        variables: { processed: "data_value" },
        console_output: [],
      });

      await strategy.execute(context);

      // Verify post-request script was called with correct parameters
      expect(
        context.scriptExecutorService.executePostRequestScript
      ).toHaveBeenCalled();
      const callArgs = (
        context.scriptExecutorService.executePostRequestScript as jest.Mock
      ).mock.calls[0];
      expect(callArgs[0]).toEqual({
        script: "variables.processed = response.body.data;",
      });
      expect(callArgs[1]).toBeDefined(); // currentVariables
      expect(callArgs[2]).toBeDefined(); // request object
    });

    it("should not process input if step has no input config", async () => {
      const context = createMockContext();
      delete context.step.input;

      await strategy.execute(context);

      expect(context.inputService.promptMultipleInputs).not.toHaveBeenCalled();
    });

    it("should not execute pre-request script if not configured", async () => {
      const context = createMockContext();
      delete context.step.pre_request;

      await strategy.execute(context);

      expect(
        context.scriptExecutorService.executePreRequestScript
      ).not.toHaveBeenCalled();
    });

    it("should not execute post-request script if not configured", async () => {
      const context = createMockContext();
      delete context.step.post_request;

      await strategy.execute(context);

      expect(
        context.scriptExecutorService.executePostRequestScript
      ).not.toHaveBeenCalled();
    });

    it("should not process scenarios if not configured", async () => {
      const context = createMockContext();
      delete context.step.scenarios;

      await strategy.execute(context);

      expect(context.scenarioService.processScenarios).not.toHaveBeenCalled();
    });

    it("should apply step certificate if both step and suite certificates exist", async () => {
      const context = createMockContext();
      context.suite.certificate = {
        cert_path: "./certs/suite.crt",
        key_path: "./certs/suite.key",
      };
      context.step.request!.certificate = {
        cert_path: "./certs/step.crt",
        key_path: "./certs/step.key",
      };

      await strategy.execute(context);

      // Verify step has its own certificate (not overridden by suite)
      expect(context.step.request?.certificate).toBeDefined();
      expect(context.step.request?.certificate?.cert_path).toBe(
        "./certs/step.crt"
      );
    });

    it("should handle multiple assertion failures", async () => {
      const context = createMockContext();
      context.step.assert = {
        status_code: 200,
        body: {
          success: { equals: true },
          data: { exists: true },
        },
      };

      (
        context.assertionService.validateAssertions as jest.Mock
      ).mockReturnValue([
        { field: "status_code", passed: false, expected: 200, actual: 404 },
        { field: "body.success", passed: false, expected: true, actual: false },
        { field: "body.data", passed: true, expected: true, actual: true },
      ]);

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("2 assertion(s) failed");
      expect(result.assertions_results?.length).toBe(3);
    });

    it("should track execution duration accurately", async () => {
      const context = createMockContext();

      const startTime = Date.now();
      const result = await strategy.execute(context);
      const endTime = Date.now();

      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.duration_ms).toBeLessThanOrEqual(endTime - startTime + 10); // +10ms tolerance
    });
  });
});
