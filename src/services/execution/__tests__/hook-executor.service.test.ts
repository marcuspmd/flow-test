/**
 * @fileoverview Comprehensive unit tests for HookExecutorService
 * Validates lifecycle hooks execution with all action types
 */

import { HookExecutorService } from "../hook-executor.service";
import { VariableService } from "../../variable.service";
import { JavaScriptService } from "../../javascript.service";
import { CallService } from "../../call.service";
import {
  HookAction,
  HookExecutionContext,
  HookExecutionResult,
} from "../../../types/hook.types";

// Mock dependencies
jest.mock("../../variable.service");
jest.mock("../../javascript.service");
jest.mock("../../call.service");

describe("HookExecutorService", () => {
  let hookExecutor: HookExecutorService;
  let mockVariableService: jest.Mocked<VariableService>;
  let mockJavaScriptService: jest.Mocked<JavaScriptService>;
  let mockCallService: jest.Mocked<CallService>;

  beforeEach(() => {
    // Create mocks
    mockVariableService = {
      interpolate: jest.fn((value: any) => value),
      setRuntimeVariable: jest.fn(),
      setRuntimeVariables: jest.fn(),
      getAllVariables: jest.fn(() => ({})),
    } as any;

    mockJavaScriptService = {
      executeExpression: jest.fn(() => ({ result: true, error: null })),
    } as any;

    mockCallService = {
      executeStepCall: jest.fn(),
    } as any;

    hookExecutor = new HookExecutorService(
      mockVariableService,
      mockJavaScriptService,
      mockCallService
    );

    jest.clearAllMocks();
  });

  const createContext = (
    overrides?: Partial<HookExecutionContext>
  ): HookExecutionContext => ({
    stepName: "test-step",
    stepIndex: 0,
    variables: { test_var: "value" },
    ...overrides,
  });

  describe("executeHooks", () => {
    it("should return success for empty hooks array", async () => {
      const context = createContext();
      const result = await hookExecutor.executeHooks([], context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toEqual({});
      expect(result.validations.passed).toBe(true);
      expect(result.metrics).toEqual([]);
      expect(result.logs).toEqual([]);
    });

    it("should execute multiple hooks in sequence", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            var1: "value1",
          },
        },
        {
          compute: {
            var2: "value2",
          },
        },
      ];

      mockVariableService.interpolate
        .mockReturnValueOnce("value1")
        .mockReturnValueOnce("value2");

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toEqual({
        var1: "value1",
        var2: "value2",
      });
      expect(mockVariableService.setRuntimeVariable).toHaveBeenCalledTimes(2);
    });

    it("should handle hook execution errors gracefully", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "invalid expression",
              message: "Test validation",
            },
          ],
        },
      ];

      // Mock should throw error for invalid expression
      mockJavaScriptService.executeExpression.mockImplementation(() => {
        throw new Error("Syntax error");
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true); // Validation errors don't fail hooks
      expect(result.validations.passed).toBe(false);
      expect(result.validations.failures).toHaveLength(1);
      expect(result.validations.failures[0].message).toContain(
        "Validation error"
      );
    });
  });

  describe("compute action", () => {
    it("should compute simple variables", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            timestamp: "2024-01-01",
            count: 42,
            enabled: true,
          },
        },
      ];

      mockVariableService.interpolate
        .mockReturnValueOnce("2024-01-01")
        .mockReturnValueOnce(42)
        .mockReturnValueOnce(true);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toEqual({
        timestamp: "2024-01-01",
        count: 42,
        enabled: true,
      });
      expect(mockVariableService.setRuntimeVariable).toHaveBeenCalledTimes(3);
      expect(mockVariableService.setRuntimeVariable).toHaveBeenCalledWith(
        "timestamp",
        "2024-01-01"
      );
      expect(mockVariableService.setRuntimeVariable).toHaveBeenCalledWith(
        "count",
        42
      );
      expect(mockVariableService.setRuntimeVariable).toHaveBeenCalledWith(
        "enabled",
        true
      );
    });

    it("should compute variables with interpolation", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            full_name: "{{first_name}} {{last_name}}",
            user_id: "{{$js:Math.random()}}",
          },
        },
      ];

      mockVariableService.interpolate
        .mockReturnValueOnce("John Doe")
        .mockReturnValueOnce(0.123456);

      const context = createContext({
        variables: { first_name: "John", last_name: "Doe" },
      });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toEqual({
        full_name: "John Doe",
        user_id: 0.123456,
      });
    });

    it("should handle empty compute object", async () => {
      const hooks: HookAction[] = [{ compute: {} }];

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toEqual({});
      expect(mockVariableService.setRuntimeVariable).not.toHaveBeenCalled();
    });
  });

  describe("validate action", () => {
    it("should validate passing expressions", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "user_id > 0",
              message: "User ID must be positive",
              severity: "error",
            },
            {
              expression: "auth_token",
              message: "Auth token required",
              severity: "warning",
            },
          ],
        },
      ];

      mockJavaScriptService.executeExpression
        .mockReturnValueOnce({ result: true, error: null })
        .mockReturnValueOnce({ result: true, error: null });

      const context = createContext({
        variables: { user_id: 123, auth_token: "abc123" },
      });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.validations.passed).toBe(true);
      expect(result.validations.failures).toEqual([]);
    });

    it("should collect validation failures", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "user_id > 0",
              message: "User ID must be positive",
              severity: "error",
            },
            {
              expression: "auth_token",
              message: "Auth token required",
              severity: "error",
            },
          ],
        },
      ];

      mockJavaScriptService.executeExpression
        .mockReturnValueOnce(false) // First validation fails
        .mockReturnValueOnce(false); // Second validation fails

      const context = createContext({
        variables: { user_id: -1, auth_token: null },
      });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true); // Validations don't fail the hook execution
      expect(result.validations.passed).toBe(false);
      expect(result.validations.failures).toHaveLength(2);
      expect(result.validations.failures[0]).toEqual({
        expression: "user_id > 0",
        message: "User ID must be positive",
        severity: "error",
      });
      expect(result.validations.failures[1]).toEqual({
        expression: "auth_token",
        message: "Auth token required",
        severity: "error",
      });
    });

    it("should handle validation with warning severity", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "quantity < 100",
              message: "Large quantity",
              severity: "warning",
            },
          ],
        },
      ];

      mockJavaScriptService.executeExpression.mockReturnValue(false);

      const context = createContext({ variables: { quantity: 150 } });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.validations.passed).toBe(false);
      expect(result.validations.failures[0].severity).toBe("warning");
    });

    it("should handle validation with info severity", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "status === 'active'",
              message: "Status check",
              severity: "info",
            },
          ],
        },
      ];

      mockJavaScriptService.executeExpression.mockReturnValue({
        result: true,
        error: null,
      });

      const context = createContext({ variables: { status: "active" } });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.validations.passed).toBe(true);
    });

    it("should use default severity when not specified", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "true",
              message: "Test",
              // severity not specified - should default to "error"
            },
          ],
        },
      ];

      mockJavaScriptService.executeExpression.mockReturnValue(false);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.validations.passed).toBe(false);
      expect(result.validations.failures[0].severity).toBe("error");
    });
  });

  describe("log action", () => {
    it("should emit log with interpolated message", async () => {
      const hooks: HookAction[] = [
        {
          log: {
            level: "info",
            message: "Processing user {{user_id}}",
            metadata: {
              step: "login",
              attempt: 1,
            },
          },
        },
      ];

      mockVariableService.interpolate
        .mockReturnValueOnce("Processing user 123") // message
        .mockReturnValueOnce("login") // metadata.step
        .mockReturnValueOnce(1); // metadata.attempt

      const context = createContext({ variables: { user_id: 123 } });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toMatchObject({
        level: "info",
        message: "Processing user 123",
        metadata: {
          step: "login",
          attempt: 1,
        },
      });
      expect(result.logs[0].timestamp).toBeGreaterThan(0);
    });

    it("should support different log levels", async () => {
      const hooks: HookAction[] = [
        { log: { level: "debug", message: "Debug message" } },
        { log: { level: "info", message: "Info message" } },
        { log: { level: "warn", message: "Warning message" } },
        { log: { level: "error", message: "Error message" } },
      ];

      mockVariableService.interpolate.mockImplementation((val) => val);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.logs).toHaveLength(4);
      expect(result.logs[0].level).toBe("debug");
      expect(result.logs[1].level).toBe("info");
      expect(result.logs[2].level).toBe("warn");
      expect(result.logs[3].level).toBe("error");
    });

    it("should handle log without metadata", async () => {
      const hooks: HookAction[] = [
        {
          log: {
            level: "info",
            message: "Simple log",
          },
        },
      ];

      mockVariableService.interpolate.mockReturnValue("Simple log");

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.logs[0].metadata).toBeUndefined();
    });
  });

  describe("metric action", () => {
    it("should emit metric with interpolated values", async () => {
      const hooks: HookAction[] = [
        {
          metric: {
            name: "api_response_time",
            value: "{{response_time_ms}}",
            tags: {
              endpoint: "/users",
              method: "POST",
              status: "{{status_code}}",
            },
          },
        },
      ];

      mockVariableService.interpolate
        .mockReturnValueOnce("api_response_time") // name
        .mockReturnValueOnce(245) // value (will be converted back to number)
        .mockReturnValueOnce("/users") // tags.endpoint
        .mockReturnValueOnce("POST") // tags.method
        .mockReturnValueOnce("200"); // tags.status

      const context = createContext({
        variables: { response_time_ms: 245, status_code: "200" },
      });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]).toEqual({
        name: "api_response_time",
        value: 245,
        tags: {
          endpoint: "/users",
          method: "POST",
          status: "200",
        },
      });
    });

    it("should handle metric without tags", async () => {
      const hooks: HookAction[] = [
        {
          metric: {
            name: "request_count",
            value: 1,
          },
        },
      ];

      mockVariableService.interpolate
        .mockReturnValueOnce("request_count")
        .mockReturnValueOnce(1);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.metrics[0]).toEqual({
        name: "request_count",
        value: 1,
      });
    });

    it("should emit multiple metrics", async () => {
      const hooks: HookAction[] = [
        {
          metric: {
            name: "metric1",
            value: 100,
          },
        },
        {
          metric: {
            name: "metric2",
            value: 200,
          },
        },
      ];

      mockVariableService.interpolate.mockImplementation((val) => val);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0].name).toBe("metric1");
      expect(result.metrics[1].name).toBe("metric2");
    });
  });

  describe("script action", () => {
    it("should execute JavaScript script", async () => {
      const hooks: HookAction[] = [
        {
          script: "console.log('test'); return { result: 'success' };",
        },
      ];

      mockJavaScriptService.executeExpression.mockReturnValue({
        result: { result: "success" },
        error: null,
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(mockJavaScriptService.executeExpression).toHaveBeenCalledWith(
        "console.log('test'); return { result: 'success' };",
        expect.objectContaining({
          variables: context.variables,
        }),
        true // asCodeBlock
      );
    });

    it("should handle script execution errors", async () => {
      const hooks: HookAction[] = [
        {
          script: "throw new Error('Script error')",
        },
      ];

      mockJavaScriptService.executeExpression.mockImplementation(() => {
        throw new Error("Script error");
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Script error");
    });

    it("should provide context variables to script", async () => {
      const hooks: HookAction[] = [
        {
          script:
            "return { userId: variables.user_id, doubled: variables.count * 2 };",
        },
      ];

      mockJavaScriptService.executeExpression.mockReturnValue({
        userId: 123,
        doubled: 20,
      });

      const context = createContext({
        variables: { user_id: 123, count: 10 },
      });
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(mockJavaScriptService.executeExpression).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          variables: { user_id: 123, count: 10 },
        }),
        true
      );
    });
  });

  describe("call action", () => {
    it("should call another step", async () => {
      const hooks: HookAction[] = [
        {
          call: {
            test: "./auth/login.yaml",
            step: "login-step",
            variables: {
              username: "test@example.com",
            },
          },
        },
      ];

      mockCallService.executeStepCall = jest.fn().mockResolvedValue({
        success: true,
        captured_variables: { auth_token: "abc123" },
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(mockCallService.executeStepCall).toHaveBeenCalledWith(
        expect.objectContaining({
          test: "./auth/login.yaml",
          step: "login-step",
          variables: {
            username: "test@example.com",
          },
        }),
        expect.any(Object)
      );
    });

    it("should handle call without CallService", async () => {
      const hooksExecutorWithoutCall = new HookExecutorService(
        mockVariableService,
        mockJavaScriptService
        // No CallService
      );

      const hooks: HookAction[] = [
        {
          call: {
            test: "./test.yaml",
            step: "step1",
          },
        },
      ];

      const context = createContext();
      const result = await hooksExecutorWithoutCall.executeHooks(
        hooks,
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("CallService not available");
    });

    it("should handle call execution failure", async () => {
      const hooks: HookAction[] = [
        {
          call: {
            test: "./invalid.yaml",
            step: "missing-step",
          },
        },
      ];

      mockCallService.executeStepCall = jest
        .fn()
        .mockRejectedValue(new Error("Step not found"));

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Step not found");
    });
  });

  describe("wait action", () => {
    it("should delay execution", async () => {
      const hooks: HookAction[] = [
        {
          wait: 100,
        },
      ];

      const startTime = Date.now();
      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow 10ms margin
    });

    it("should handle zero delay", async () => {
      const hooks: HookAction[] = [
        {
          wait: 0,
        },
      ];

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
    });
  });

  describe("complex scenarios", () => {
    it("should execute mixed action types in sequence", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            timestamp: "2024-01-01",
          },
        },
        {
          validate: [
            {
              expression: "timestamp",
              message: "Timestamp required",
              severity: "error",
            },
          ],
        },
        {
          log: {
            level: "info",
            message: "Processing at {{timestamp}}",
          },
        },
        {
          metric: {
            name: "operations_count",
            value: 1,
          },
        },
      ];

      mockVariableService.interpolate.mockImplementation((val) => val);
      mockJavaScriptService.executeExpression.mockReturnValue({
        result: true,
        error: null,
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toHaveProperty("timestamp");
      expect(result.validations.passed).toBe(true);
      expect(result.logs).toHaveLength(1);
      expect(result.metrics).toHaveLength(1);
    });

    it("should accumulate computed variables across hooks", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            var1: "value1",
          },
        },
        {
          compute: {
            var2: "value2",
            var3: "value3",
          },
        },
      ];

      mockVariableService.interpolate.mockImplementation((val) => val);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toEqual({
        var1: "value1",
        var2: "value2",
        var3: "value3",
      });
    });

    it("should track execution duration", async () => {
      const hooks: HookAction[] = [
        {
          wait: 50,
        },
        {
          compute: {
            test: "value",
          },
        },
      ];

      mockVariableService.interpolate.mockReturnValue("value");

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.duration_ms).toBeGreaterThanOrEqual(50);
    });

    it("should handle hook with multiple actions", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            id: "123",
          },
          log: {
            level: "info",
            message: "ID computed: {{id}}",
          },
          metric: {
            name: "id_generation",
            value: 1,
          },
        },
      ];

      mockVariableService.interpolate.mockImplementation((val) => val);

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true);
      expect(result.computedVariables).toHaveProperty("id");
      expect(result.logs).toHaveLength(1);
      expect(result.metrics).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should stop execution on first error", async () => {
      const hooks: HookAction[] = [
        {
          compute: {
            var1: "value1",
          },
        },
        {
          script: "throw new Error('Intentional error')",
        },
        {
          compute: {
            var2: "value2", // Should not execute
          },
        },
      ];

      mockVariableService.interpolate.mockReturnValue("value1");
      mockJavaScriptService.executeExpression.mockImplementation(() => {
        throw new Error("Intentional error");
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(false); // Script errors DO stop hooks
      expect(result.error).toContain("Intentional error");
      expect(result.computedVariables).toHaveProperty("var1");
      expect(result.computedVariables).not.toHaveProperty("var2"); // Second hook didn't run
    });

    it("should provide detailed error messages", async () => {
      const hooks: HookAction[] = [
        {
          validate: [
            {
              expression: "invalid syntax {",
              message: "Test",
            },
          ],
        },
      ];

      mockJavaScriptService.executeExpression.mockImplementation(() => {
        throw new Error("Unexpected token {");
      });

      const context = createContext();
      const result = await hookExecutor.executeHooks(hooks, context);

      expect(result.success).toBe(true); // Validation errors are caught
      expect(result.validations.passed).toBe(false);
      expect(result.validations.failures[0].message).toContain(
        "Unexpected token"
      );
    });
  });
});
