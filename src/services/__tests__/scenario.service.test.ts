import { ScenarioService } from "../scenario.service";
import { ConditionalScenario, Assertions } from "../../types/engine.types";
import { StepExecutionResult } from "../../types/config.types";
import { AssertionService } from "../assertion"; // Já está correto!
import { CaptureService } from "../capture.service";
import * as jmespath from "jmespath";

// Mock dependencies
jest.mock("../assertion"); // Corrigido: agora aponta para o index.ts
jest.mock("../capture.service");
jest.mock("../logger.service", () => ({
  getLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

describe("ScenarioService", () => {
  let scenarioService: ScenarioService;
  let mockAssertionService: jest.Mocked<AssertionService>;
  let mockCaptureService: jest.Mocked<CaptureService>;

  const createMockResult = (): StepExecutionResult => ({
    status: "success",
    step_name: "test-step",
    duration_ms: 150,
    response_details: {
      status_code: 200,
      headers: {
        "content-type": "application/json",
        "x-api-version": "v1.0",
      },
      body: {
        id: 123,
        name: "Test User",
        status: "active",
        data: [1, 2, 3],
      },
      size_bytes: 256,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      startGroup: jest.fn(),
      endGroup: jest.fn(),
    };

    mockAssertionService = {
      validateAssertions: jest.fn(),
    } as any;

    mockCaptureService = {
      captureVariables: jest.fn(),
    } as any;

    (
      AssertionService as jest.MockedClass<typeof AssertionService>
    ).mockImplementation(() => mockAssertionService);
    (
      CaptureService as jest.MockedClass<typeof CaptureService>
    ).mockImplementation(() => mockCaptureService);

    scenarioService = new ScenarioService(
      mockLogger as any,
      mockAssertionService,
      mockCaptureService
    );
  });

  describe("constructor", () => {
    it("should initialize with AssertionService and CaptureService", () => {
      expect(scenarioService).toBeDefined();
      expect(mockAssertionService).toBeDefined();
      expect(mockCaptureService).toBeDefined();
    });
  });

  describe("processScenarios", () => {
    it("should process scenarios with true condition and execute then block", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`",
          then: {
            assert: {
              status_code: 200,
            } as Assertions,
            capture: {
              user_id: "body.id",
            },
          },
        },
      ];

      mockAssertionService.validateAssertions.mockReturnValue([
        {
          field: "status_code",
          passed: true,
          expected: 200,
          actual: 200,
          message: "OK",
        },
      ]);

      mockCaptureService.captureVariables.mockReturnValue({
        user_id: 123,
      });

      scenarioService.processScenarios(scenarios, mockResult, "simple");

      expect(mockAssertionService.validateAssertions).toHaveBeenCalledWith(
        scenarios[0].then!.assert,
        mockResult
      );
      expect(mockCaptureService.captureVariables).toHaveBeenCalledWith(
        scenarios[0].then!.capture,
        mockResult,
        undefined
      );
      expect(mockResult.scenarios_meta).toEqual({
        has_scenarios: true,
        executed_count: 1,
        evaluations: [
          {
            index: 1,
            condition: "status_code == `200`",
            matched: true,
            executed: true,
            branch: "then",
            assertions_added: 1,
            captures_added: 1,
          },
        ],
      });
    });

    it("should process scenarios with false condition and execute else block", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `404`",
          else: {
            variables: {
              error_flag: true,
            },
          },
        },
      ];

      scenarioService.processScenarios(scenarios, mockResult, "simple");

      expect(mockResult.captured_variables).toEqual({
        error_flag: true,
      });
      expect(mockResult.scenarios_meta).toEqual({
        has_scenarios: true,
        executed_count: 1,
        evaluations: [
          {
            index: 1,
            condition: "status_code == `404`",
            matched: false,
            executed: true,
            branch: "else",
            assertions_added: 0,
            captures_added: 0,
          },
        ],
      });
    });

    it("should handle scenario without then/else blocks", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`",
        },
      ];

      scenarioService.processScenarios(scenarios, mockResult, "simple");

      expect(mockResult.scenarios_meta).toEqual({
        has_scenarios: true,
        executed_count: 0,
        evaluations: [
          {
            index: 1,
            condition: "status_code == `200`",
            matched: true,
            executed: false,
            branch: "none",
            assertions_added: 0,
            captures_added: 0,
          },
        ],
      });
    });

    it("should handle multiple scenarios", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`",
          then: {
            variables: { success: true },
          },
        },
        {
          condition: "body.status == 'active'",
          then: {
            variables: { user_active: true },
          },
        },
      ];

      scenarioService.processScenarios(scenarios, mockResult, "simple");

      expect(mockResult.scenarios_meta?.executed_count).toBe(2);
      expect(mockResult.captured_variables).toEqual({
        success: true,
        user_active: true,
      });
    });

    it("should handle verbose logging", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`",
          then: {
            variables: { test: true },
          },
        },
      ];

      scenarioService.processScenarios(scenarios, mockResult, "verbose");

      // Logger calls are tested implicitly through mocking
      expect(mockResult.scenarios_meta?.executed_count).toBe(1);
    });

    it("should handle scenario evaluation errors", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "invalid.jmespath[syntax",
          then: {
            variables: { test: true },
          },
        },
      ];

      scenarioService.processScenarios(scenarios, mockResult, "simple");

      expect(mockResult.status).toBe("failure");
      expect(mockResult.error_message).toContain("Scenario error at index");
    });

    it("should handle failed assertions in scenario", () => {
      const mockResult = createMockResult();
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`",
          then: {
            assert: {
              status_code: 404,
            } as Assertions,
          },
        },
      ];

      mockAssertionService.validateAssertions.mockReturnValue([
        {
          field: "status_code",
          passed: false,
          expected: 404,
          actual: 200,
          message: "Status mismatch",
        },
      ]);

      scenarioService.processScenarios(scenarios, mockResult, "simple");

      expect(mockResult.status).toBe("failure");
      expect(mockResult.error_message).toBe("1 scenario assertion(s) failed");
    });
  });

  describe("evaluateCondition", () => {
    it("should evaluate simple boolean conditions", () => {
      const mockResult = createMockResult();
      const result = (scenarioService as any).evaluateCondition(
        "status_code == `200`",
        mockResult
      );
      expect(result).toBe(true);

      const result2 = (scenarioService as any).evaluateCondition(
        "status_code == `404`",
        mockResult
      );
      expect(result2).toBe(false);
    });

    it("should evaluate complex JMESPath expressions", () => {
      const mockResult = createMockResult();
      const result = (scenarioService as any).evaluateCondition(
        "body.status == 'active'",
        mockResult
      );
      expect(result).toBe(true);

      const result2 = (scenarioService as any).evaluateCondition(
        "length(body.data) > `2`",
        mockResult
      );
      expect(result2).toBe(true);
    });

    it("should handle truthy/falsy values", () => {
      const mockResult = createMockResult();
      const result = (scenarioService as any).evaluateCondition(
        "body.name",
        mockResult
      );
      expect(result).toBe(true);

      const result2 = (scenarioService as any).evaluateCondition(
        "body.nonexistent",
        mockResult
      );
      expect(result2).toBe(false);
    });

    it("should throw error when response is not available", () => {
      const mockResult = createMockResult();
      const resultWithoutResponse = {
        ...mockResult,
        response_details: undefined,
      };

      expect(() => {
        (scenarioService as any).evaluateCondition(
          "status_code == `200`",
          resultWithoutResponse
        );
      }).toThrow("Response not available for condition evaluation");
    });

    it("should throw error for invalid JMESPath", () => {
      const mockResult = createMockResult();
      expect(() => {
        (scenarioService as any).evaluateCondition(
          "invalid[syntax",
          mockResult
        );
      }).toThrow("Invalid JMESPath condition");
    });
  });

  describe("preprocessJMESPathCondition", () => {
    it("should fix numbers without backticks", () => {
      const result = (scenarioService as any).preprocessJMESPathCondition(
        "status_code == 200"
      );
      expect(result).toBe("status_code == `200`");

      const result2 = (scenarioService as any).preprocessJMESPathCondition(
        "value >= 100"
      );
      expect(result2).toBe("value >= `100`");
    });

    it("should fix boolean values without backticks", () => {
      const result = (scenarioService as any).preprocessJMESPathCondition(
        "enabled == true"
      );
      expect(result).toBe("enabled == `true`");

      const result2 = (scenarioService as any).preprocessJMESPathCondition(
        "disabled != false"
      );
      expect(result2).toBe("disabled != `false`");
    });

    it("should fix header array syntax", () => {
      const result = (scenarioService as any).preprocessJMESPathCondition(
        "headers['content-type']"
      );
      expect(result).toBe('headers."content-type"');
    });

    it("should fix null comparisons", () => {
      const result = (scenarioService as any).preprocessJMESPathCondition(
        "value != null"
      );
      expect(result).toBe("value != `null`");
    });

    it("should handle $env variables", () => {
      const result = (scenarioService as any).preprocessJMESPathCondition(
        "$env.API_KEY == 'test'"
      );
      expect(result).toBe("`null` == 'test'");
    });

    it("should preserve already correctly formatted expressions", () => {
      const condition = "status_code == `200` && body.status == 'active'";
      const result = (scenarioService as any).preprocessJMESPathCondition(
        condition
      );
      expect(result).toBe(condition);
    });
  });

  describe("buildEvaluationContext", () => {
    it("should build complete evaluation context", () => {
      const mockResult = createMockResult();
      const context = (scenarioService as any).buildEvaluationContext(
        mockResult
      );

      expect(context).toEqual({
        status_code: 200,
        headers: {
          "content-type": "application/json",
          "x-api-version": "v1.0",
        },
        body: {
          id: 123,
          name: "Test User",
          status: "active",
          data: [1, 2, 3],
        },
        duration_ms: 150,
        size_bytes: 256,
        step_status: "success",
      });
    });
  });

  describe("executeScenarioBlock", () => {
    it("should execute assertions in scenario block", () => {
      const mockResult = createMockResult();
      const block = {
        assert: {
          status_code: 200,
        } as Assertions,
      };

      mockAssertionService.validateAssertions.mockReturnValue([
        {
          field: "status_code",
          passed: true,
          expected: 200,
          actual: 200,
          message: "OK",
        },
      ]);

      const result = (scenarioService as any).executeScenarioBlock(
        block,
        mockResult,
        "simple"
      );

      expect(result.assertionsAdded).toBe(1);
      expect(result.capturesAdded).toBe(0);
      expect(mockResult.assertions_results).toHaveLength(1);
    });

    it("should execute captures in scenario block", () => {
      const mockResult = createMockResult();
      const block = {
        capture: {
          user_id: "body.id",
          user_name: "body.name",
        },
      };

      mockCaptureService.captureVariables.mockReturnValue({
        user_id: 123,
        user_name: "Test User",
      });

      const result = (scenarioService as any).executeScenarioBlock(
        block,
        mockResult,
        "simple"
      );

      expect(result.assertionsAdded).toBe(0);
      expect(result.capturesAdded).toBe(2);
      expect(mockResult.captured_variables).toEqual({
        user_id: 123,
        user_name: "Test User",
      });
    });

    it("should execute static variables in scenario block", () => {
      const mockResult = createMockResult();
      const block = {
        variables: {
          static_var: "test_value",
          flag: true,
        },
      };

      const result = (scenarioService as any).executeScenarioBlock(
        block,
        mockResult,
        "verbose"
      );

      expect(mockResult.captured_variables).toEqual({
        static_var: "test_value",
        flag: true,
      });
    });

    it("should handle combined assertions, captures, and variables", () => {
      const mockResult = createMockResult();
      const block = {
        assert: {
          status_code: 200,
        } as Assertions,
        capture: {
          user_id: "body.id",
        },
        variables: {
          processed: true,
        },
      };

      mockAssertionService.validateAssertions.mockReturnValue([
        {
          field: "status_code",
          passed: true,
          expected: 200,
          actual: 200,
          message: "OK",
        },
      ]);

      mockCaptureService.captureVariables.mockReturnValue({
        user_id: 123,
      });

      const result = (scenarioService as any).executeScenarioBlock(
        block,
        mockResult,
        "simple"
      );

      expect(result.assertionsAdded).toBe(1);
      expect(result.capturesAdded).toBe(1);
      expect(mockResult.captured_variables).toEqual({
        user_id: 123,
        processed: true,
      });
    });
  });

  describe("validateScenarios", () => {
    it("should validate correct scenarios", () => {
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`",
        },
        {
          condition: "body.status == 'active'",
        },
      ];

      const errors = scenarioService.validateScenarios(scenarios);
      expect(errors).toHaveLength(0);
    });

    it("should return errors for invalid scenarios", () => {
      const scenarios: ConditionalScenario[] = [
        {
          condition: "status_code == `200`", // Valid
        },
        {
          condition: "invalid[syntax", // Invalid
        },
        {
          condition: "another.invalid.expr[", // Invalid
        },
      ];

      const errors = scenarioService.validateScenarios(scenarios);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain("Scenario 2: invalid condition");
      expect(errors[1]).toContain("Scenario 3: invalid condition");
    });

    it("should handle empty scenarios array", () => {
      const errors = scenarioService.validateScenarios([]);
      expect(errors).toHaveLength(0);
    });
  });

  describe("suggestConditions", () => {
    it("should suggest basic conditions", () => {
      const mockResult = createMockResult();
      const suggestions = scenarioService.suggestConditions(mockResult);

      expect(suggestions).toContain("status_code == `200`");
      expect(suggestions).toContain("status_code != `200`");
      expect(suggestions).toContain("status_code >= `200`");
      expect(suggestions).toContain("status_code < `400`");
      expect(suggestions).toContain("duration_ms < `1000`");
      expect(suggestions).toContain("size_bytes > `100`");
    });

    it("should suggest body-based conditions when body is an object", () => {
      const mockResult = createMockResult();
      const suggestions = scenarioService.suggestConditions(mockResult);

      expect(suggestions).toContain("body && body.error");
      expect(suggestions).toContain("body && !body.error");
      expect(suggestions).toContain("body.status == 'success'");
      expect(suggestions).toContain("body.data && length(body.data) > `0`");
      expect(suggestions).toContain("body.id");
      expect(suggestions).toContain("body.name");
      expect(suggestions).toContain("body.status");
    });

    it("should suggest header-based conditions", () => {
      const mockResult = createMockResult();
      const suggestions = scenarioService.suggestConditions(mockResult);

      expect(suggestions).toContain('headers."content-type"');
      expect(suggestions).toContain('headers."x-api-version"');
    });

    it("should return empty array when no response details", () => {
      const mockResult = createMockResult();
      const resultWithoutResponse = {
        ...mockResult,
        response_details: undefined,
      };
      const suggestions = scenarioService.suggestConditions(
        resultWithoutResponse
      );

      expect(suggestions).toHaveLength(0);
    });

    it("should handle response with non-object body", () => {
      const mockResult = createMockResult();
      const resultWithStringBody = {
        ...mockResult,
        response_details: {
          ...mockResult.response_details!,
          body: "plain text response",
        },
      };

      const suggestions =
        scenarioService.suggestConditions(resultWithStringBody);

      // Should still include basic suggestions
      expect(suggestions).toContain("status_code == `200`");
      expect(suggestions).toContain("duration_ms < `1000`");
      // But no body-specific suggestions
      expect(suggestions.filter((s) => s.includes("body.")).length).toBe(0);
    });

    it("should handle response with empty object body", () => {
      const mockResult = createMockResult();
      const resultWithEmptyBody = {
        ...mockResult,
        response_details: {
          ...mockResult.response_details!,
          body: {},
        },
      };

      const suggestions =
        scenarioService.suggestConditions(resultWithEmptyBody);

      // Should include basic suggestions but limited body suggestions
      expect(suggestions).toContain("status_code == `200`");
      expect(suggestions.filter((s) => s.includes("body.id")).length).toBe(0);
    });
  });
});
