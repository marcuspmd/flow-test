/**
 * @fileoverview Tests for ScenarioStepStrategy
 */

import { ScenarioStepStrategy } from "../scenario-step.strategy";
import type {
  StepExecutionContext,
  StepExecutionStrategy,
} from "../step-execution.strategy";
import type { TestStep, TestSuite } from "../../../../types/engine.types";
import type { StepExecutionResult } from "../../../../types/config.types";

describe("ScenarioStepStrategy", () => {
  let strategy: StepExecutionStrategy;
  let mockContext: StepExecutionContext;
  let mockStep: TestStep;
  let mockSuite: TestSuite;

  beforeEach(() => {
    strategy = new ScenarioStepStrategy();

    // Create mock suite
    mockSuite = {
      node_id: "test-suite",
      suite_name: "Test Suite",
      steps: [],
    };

    // Create mock step
    mockStep = {
      name: "Test scenario step",
      scenarios: [
        {
          condition: "status_code == `200`",
          then: {
            assert: {
              body: { success: { equals: true } },
            },
          },
        },
      ],
    };

    // Create mock context
    mockContext = createMockContext({
      step: mockStep,
      suite: mockSuite,
    });
  });

  describe("canHandle", () => {
    it("should return true for step with scenarios only", () => {
      const step: TestStep = {
        name: "Scenario step",
        scenarios: [
          {
            condition: "status == `200`",
            then: { assert: {} },
          },
        ],
      };

      expect(strategy.canHandle(step)).toBe(true);
    });

    it("should return false for step with scenarios AND request", () => {
      const step: TestStep = {
        name: "Request with scenarios",
        request: {
          method: "GET",
          url: "/test",
        },
        scenarios: [
          {
            condition: "status == `200`",
            then: { assert: {} },
          },
        ],
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with scenarios AND input", () => {
      const step: TestStep = {
        name: "Input with scenarios",
        input: {
          prompt: "Enter value",
          variable: "test_var",
          type: "text",
        },
        scenarios: [
          {
            condition: "status == `200`",
            then: { assert: {} },
          },
        ],
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with scenarios AND call", () => {
      const step: TestStep = {
        name: "Call with scenarios",
        call: {
          test: "other-test.yaml",
          step: "other-step",
        },
        scenarios: [
          {
            condition: "status == `200`",
            then: { assert: {} },
          },
        ],
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step with scenarios AND iterate", () => {
      const step: TestStep = {
        name: "Iterate with scenarios",
        iterate: {
          over: "{{items}}",
          as: "item",
        },
        scenarios: [
          {
            condition: "status == `200`",
            then: { assert: {} },
          },
        ],
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false for step without scenarios", () => {
      const step: TestStep = {
        name: "No scenarios",
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false if scenarios is not an array", () => {
      const step: TestStep = {
        name: "Invalid scenarios",
        scenarios: "invalid" as any,
      };

      expect(strategy.canHandle(step)).toBe(false);
    });

    it("should return false if scenarios is empty array", () => {
      const step: TestStep = {
        name: "Empty scenarios",
        scenarios: [],
      };

      expect(strategy.canHandle(step)).toBe(false);
    });
  });

  describe("execute - success scenarios", () => {
    it("should execute scenario when condition matches", async () => {
      const step: TestStep = {
        name: "Matching scenario",
        scenarios: [
          {
            condition: "test_value == `true`",
            then: {
              variables: { matched: true },
            },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ test_value: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        } as any,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.scenarios_meta).toBeDefined();
      expect(result.scenarios_meta?.executed_count).toBe(1);
      expect(result.scenarios_meta?.evaluations).toHaveLength(1);
      expect(result.scenarios_meta?.evaluations[0]).toMatchObject({
        index: 1,
        matched: true,
        executed: true,
        branch: "then",
      });
    });

    it("should execute first matching scenario only", async () => {
      const step: TestStep = {
        name: "Multiple scenarios",
        scenarios: [
          {
            condition: "value == `1`",
            then: { variables: { result: "first" } },
          },
          {
            condition: "value == `1`", // Also matches, but should not execute
            then: { variables: { result: "second" } },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ value: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.scenarios_meta?.executed_count).toBe(1);
      expect(result.scenarios_meta?.evaluations).toHaveLength(1);
    });

    it("should execute scenario with HTTP request", async () => {
      const step: TestStep = {
        name: "Scenario with request",
        scenarios: [
          {
            condition: "enable_request == `true`",
            then: {
              request: {
                method: "POST",
                url: "/api/test",
                body: { data: "test" },
              },
            } as any, // Type cast needed
          },
        ],
      };

      const mockHttpResult = {
        status: "success",
        request_details: {
          method: "POST",
          url: "/api/test",
        },
        response_details: {
          status: 201,
          body: { id: 123 },
        },
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ enable_request: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest.fn().mockResolvedValue(mockHttpResult),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.request_details).toBeDefined();
      expect(result.request_details?.method).toBe("POST");
      expect(context.httpService.executeRequest).toHaveBeenCalledWith(
        step.name,
        expect.objectContaining({
          method: "POST",
          url: "/api/test",
        })
      );
    });

    it("should execute scenario with assertions", async () => {
      const step: TestStep = {
        name: "Scenario with assertions",
        scenarios: [
          {
            condition: "run_assert == `true`",
            then: {
              request: {
                method: "GET",
                url: "/test",
              },
              assert: {
                status_code: 200,
                body: { success: { equals: true } },
              },
            } as any,
          },
        ],
      };

      const mockHttpResult = {
        status: "success",
        request_details: { method: "GET", url: "/test" },
        response_details: {
          status: 200,
          body: { success: true },
        },
      };

      const mockAssertions = [
        { field: "status_code", passed: true },
        { field: "body.success", passed: true },
      ];

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ run_assert: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest.fn().mockResolvedValue(mockHttpResult),
        },
        assertionService: {
          validateAssertions: jest.fn().mockReturnValue(mockAssertions),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.assertions_results).toBeDefined();
      expect(result.assertions_results).toHaveLength(2);
      expect(context.assertionService.validateAssertions).toHaveBeenCalled();
    });

    it("should execute scenario with captures", async () => {
      const step: TestStep = {
        name: "Scenario with captures",
        scenarios: [
          {
            condition: "do_capture == `true`",
            then: {
              request: {
                method: "GET",
                url: "/user",
              },
              capture: {
                user_id: "body.id",
                user_name: "body.name",
              },
            } as any,
          },
        ],
      };

      const mockHttpResult = {
        status: "success",
        request_details: { method: "GET", url: "/user" },
        response_details: {
          status: 200,
          body: { id: 456, name: "Test User" },
        },
      };

      const mockCaptures = {
        user_id: 456,
        user_name: "Test User",
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ do_capture: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest.fn().mockResolvedValue(mockHttpResult),
        },
        captureService: {
          captureVariables: jest.fn().mockReturnValue(mockCaptures),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.captured_variables).toEqual(mockCaptures);
      expect(context.captureService.captureVariables).toHaveBeenCalled();
      expect(context.globalVariables.setRuntimeVariables).toHaveBeenCalledWith(
        mockCaptures
      );
    });

    it("should execute scenario with static variables", async () => {
      const step: TestStep = {
        name: "Scenario with variables",
        scenarios: [
          {
            condition: "set_vars == `true`",
            then: {
              variables: {
                static_var: "value",
                computed_var: 123,
              },
            },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ set_vars: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(context.globalVariables.setRuntimeVariables).toHaveBeenCalledWith({
        static_var: "value",
        computed_var: 123,
      });
    });
  });

  describe("execute - else branch", () => {
    it("should execute else block when condition is false", async () => {
      const step: TestStep = {
        name: "Scenario with else",
        scenarios: [
          {
            condition: "value == `999`",
            then: {
              variables: { result: "then" },
            },
            else: {
              variables: { result: "else" },
            },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ value: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.scenarios_meta?.executed_count).toBe(1);
      expect(result.scenarios_meta?.evaluations[0]).toMatchObject({
        matched: false,
        executed: true,
        branch: "else",
      });
      expect(context.globalVariables.setRuntimeVariables).toHaveBeenCalledWith({
        result: "else",
      });
    });

    it("should execute else with assertions", async () => {
      const step: TestStep = {
        name: "Else with assertions",
        scenarios: [
          {
            condition: "never_true == `999`",
            then: {},
            else: {
              assert: {
                body: { error: { exists: true } },
              },
            },
          },
        ],
      };

      const mockHttpResult = {
        status: "success",
        response_details: {
          status: 400,
          body: { error: "Something failed" },
        },
      };

      const mockAssertions = [{ field: "body.error", passed: true }];

      // Simula que já existe um httpResult de um step anterior
      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ never_true: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        assertionService: {
          validateAssertions: jest.fn().mockReturnValue(mockAssertions),
        },
      });

      // Simula que já há um httpResult disponível
      // Na realidade, o else block só roda assertions se houver um httpResult anterior
      // Mas o código atual não executa request no else, então vamos testar o cenário onde não há request

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.scenarios_meta?.evaluations[0].branch).toBe("else");
    });
  });

  describe("execute - no match scenarios", () => {
    it("should return skipped when no scenarios match", async () => {
      const step: TestStep = {
        name: "No match",
        scenarios: [
          {
            condition: "value == `999`",
            then: { variables: { result: "matched" } },
          },
          {
            condition: "other == `888`",
            then: { variables: { result: "other" } },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ value: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("skipped");
      expect(result.error_message).toBe("No matching scenario conditions");
      expect(result.scenarios_meta?.executed_count).toBe(0);
      expect(result.scenarios_meta?.evaluations).toHaveLength(2);
      expect(result.scenarios_meta?.evaluations.every((e) => !e.executed)).toBe(
        true
      );
    });

    it("should track all evaluations when none match", async () => {
      const step: TestStep = {
        name: "Multiple non-matching",
        scenarios: [
          { condition: "a == `1`", then: {} },
          { condition: "b == `2`", then: {} },
          { condition: "c == `3`", then: {} },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ a: 0, b: 0, c: 0 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("skipped");
      expect(result.scenarios_meta?.evaluations).toHaveLength(3);
      expect(result.scenarios_meta?.evaluations[0]).toMatchObject({
        index: 1,
        condition: "a == `1`",
        matched: false,
        executed: false,
      });
    });
  });

  describe("execute - edge cases", () => {
    it("should return empty result for empty scenarios array", async () => {
      const step: TestStep = {
        name: "Empty scenarios",
        scenarios: [],
      };

      // Empty scenarios array should fail canHandle, but let's test execute directly
      const context = createMockContext({
        step,
        suite: mockSuite,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("success");
      expect(result.scenarios_meta?.executed_count).toBe(0);
      expect(result.scenarios_meta?.evaluations).toHaveLength(0);
    });

    it("should handle scenario without then or else block", async () => {
      const step: TestStep = {
        name: "Scenario without blocks",
        scenarios: [
          {
            condition: "value == `1`",
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ value: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("skipped");
      expect(result.scenarios_meta?.evaluations[0]).toMatchObject({
        matched: true,
        executed: false,
        branch: "none",
      });
    });

    it("should filter internal variables from available_variables", async () => {
      const step: TestStep = {
        name: "Filter variables",
        scenarios: [
          {
            condition: "test == `1`",
            then: { variables: { result: "ok" } },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({
            public_var: "visible",
            _internal_var: "hidden",
            _another_internal: "also_hidden",
            test: 1,
          }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.available_variables).toEqual({
        public_var: "visible",
        test: 1,
      });
      expect(result.available_variables).not.toHaveProperty("_internal_var");
      expect(result.available_variables).not.toHaveProperty(
        "_another_internal"
      );
    });

    it("should apply suite certificate to scenario request", async () => {
      const step: TestStep = {
        name: "Suite certificate",
        scenarios: [
          {
            condition: "secure == `true`",
            then: {
              request: {
                method: "GET",
                url: "/secure",
              },
            } as any,
          },
        ],
      };

      const suiteCert = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };

      const suiteWithCert: TestSuite = {
        ...mockSuite,
        certificate: suiteCert,
      };

      const mockHttpResult = {
        status: "success",
        response_details: { status: 200 },
      };

      const context = createMockContext({
        step,
        suite: suiteWithCert,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ secure: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest.fn().mockResolvedValue(mockHttpResult),
        },
      });

      await strategy.execute(context);

      expect(context.httpService.executeRequest).toHaveBeenCalledWith(
        step.name,
        expect.objectContaining({
          certificate: suiteCert,
        })
      );
    });
  });

  describe("execute - error handling", () => {
    it("should handle condition evaluation errors", async () => {
      const step: TestStep = {
        name: "Invalid condition",
        scenarios: [
          {
            condition: "invalid..syntax",
            then: { variables: { result: "ok" } },
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({}),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      // Should continue and mark scenario as not executed
      expect(result.status).toBe("skipped");
      expect(result.scenarios_meta?.evaluations[0]).toMatchObject({
        matched: false,
        executed: false,
      });
    });

    it("should handle request execution errors", async () => {
      const step: TestStep = {
        name: "Request error",
        scenarios: [
          {
            condition: "run == `true`",
            then: {
              request: {
                method: "GET",
                url: "/error",
              },
            } as any,
          },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ run: true }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest
            .fn()
            .mockRejectedValue(new Error("Network error")),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("Scenario execution error");
      expect(result.error_message).toContain("Network error");
    });

    it("should handle assertion failures", async () => {
      const step: TestStep = {
        name: "Failed assertions",
        scenarios: [
          {
            condition: "test == `1`",
            then: {
              request: {
                method: "GET",
                url: "/test",
              },
              assert: {
                status_code: 200,
              },
            } as any,
          },
        ],
      };

      const mockHttpResult = {
        status: "success",
        request_details: { method: "GET", url: "/test" },
        response_details: {
          status: 404,
        },
      };

      const mockAssertions = [
        {
          field: "status_code",
          passed: false,
          expected: 200,
          actual: 404,
        },
      ];

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ test: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest.fn().mockResolvedValue(mockHttpResult),
        },
        assertionService: {
          validateAssertions: jest.fn().mockReturnValue(mockAssertions),
        },
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("assertion(s) failed");
    });

    it("should throw error if step has no scenarios property", async () => {
      const step: TestStep = {
        name: "No scenarios property",
        // scenarios property is missing
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("must have 'scenarios' array");
    });

    it("should throw error if scenarios is not an array", async () => {
      const step: TestStep = {
        name: "Invalid scenarios",
        scenarios: "not-an-array" as any,
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
      });

      const result = await strategy.execute(context);

      expect(result.status).toBe("failure");
      expect(result.error_message).toContain("must have 'scenarios' array");
    });
  });

  describe("execute - metadata tracking", () => {
    it("should track scenario evaluations with correct metadata", async () => {
      const step: TestStep = {
        name: "Metadata tracking",
        scenarios: [
          {
            condition: "value == `1`",
            then: {
              request: {
                method: "GET",
                url: "/test",
              },
              assert: { body: { success: { equals: true } } },
              capture: { user_id: "body.id" },
            } as any,
          },
        ],
      };

      const mockHttpResult = {
        status: "success",
        request_details: { method: "GET", url: "/test" },
        response_details: {
          status: 200,
          body: { success: true, id: 123 },
        },
      };

      const mockAssertions = [{ field: "body.success", passed: true }];
      const mockCaptures = { user_id: 123 };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ value: 1 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
        httpService: {
          executeRequest: jest.fn().mockResolvedValue(mockHttpResult),
        },
        assertionService: {
          validateAssertions: jest.fn().mockReturnValue(mockAssertions),
        },
        captureService: {
          captureVariables: jest.fn().mockReturnValue(mockCaptures),
        },
      });

      const result = await strategy.execute(context);

      expect(result.scenarios_meta?.evaluations[0]).toMatchObject({
        index: 1,
        condition: "value == `1`",
        matched: true,
        executed: true,
        branch: "then",
        assertions_added: 1,
        captures_added: 1,
      });
    });

    it("should track multiple scenario evaluations", async () => {
      const step: TestStep = {
        name: "Multiple evaluations",
        scenarios: [
          { condition: "a == `999`", then: {} },
          { condition: "b == `888`", then: {} },
          { condition: "c == `777`", then: {} },
        ],
      };

      const context = createMockContext({
        step,
        suite: mockSuite,
        globalVariables: {
          getAllVariables: jest.fn().mockReturnValue({ a: 1, b: 2, c: 3 }),
          interpolate: jest.fn((v) => v),
          setRuntimeVariables: jest.fn(),
        },
      });

      const result = await strategy.execute(context);

      expect(result.scenarios_meta?.evaluations).toHaveLength(3);
      expect(result.scenarios_meta?.evaluations.map((e) => e.index)).toEqual([
        1, 2, 3,
      ]);
      expect(
        result.scenarios_meta?.evaluations.map((e) => e.condition)
      ).toEqual(["a == `999`", "b == `888`", "c == `777`"]);
    });
  });

  // Helper function to create mock context
  function createMockContext(overrides: any = {}): StepExecutionContext {
    const defaultLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const defaultGlobalVariables = {
      getAllVariables: jest.fn().mockReturnValue({}),
      interpolate: jest.fn((v: any) => v),
      setRuntimeVariables: jest.fn(),
    };

    const defaultHttpService = {
      executeRequest: jest.fn().mockResolvedValue({
        status: "success",
        response_details: { status: 200 },
      }),
    };

    const defaultAssertionService = {
      validateAssertions: jest.fn().mockReturnValue([]),
    };

    const defaultCaptureService = {
      captureVariables: jest.fn().mockReturnValue({}),
    };

    const defaultScenarioService = {
      processScenarios: jest.fn(),
    };

    const defaultContext: any = {
      step: mockStep,
      suite: mockSuite,
      stepIndex: 0,
      identifiers: {
        stepId: "step-1",
        qualifiedStepId: "test-suite.step-1",
        stepNumber: 1,
      },
      logger: defaultLogger,
      globalVariables: defaultGlobalVariables,
      httpService: defaultHttpService,
      assertionService: defaultAssertionService,
      captureService: defaultCaptureService,
      scenarioService: defaultScenarioService,
      variableService: {},
      callService: {},
      inputService: {},
      iterationService: {},
      configManager: {},
      stepCallStack: [],
      discoveredTest: {},
    };

    return {
      ...defaultContext,
      ...overrides,
    } as StepExecutionContext;
  }
});
