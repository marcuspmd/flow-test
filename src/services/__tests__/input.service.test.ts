/**
 * @fileoverview Tests for InputService - Public API and Integration Tests
 *
 * These tests focus on the public API (promptUser method) and integration behavior
 * rather than testing private methods that have been moved to strategies/helpers.
 */

import { InputService } from "../input.service";
import { InputConfig } from "../../types/engine.types";
import { InputTypeRegistry } from "../input/strategies/input-types";
import { PromptStyleRegistry } from "../input/strategies/prompt-styles";

describe("InputService", () => {
  let service: InputService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InputService();
  });

  describe("Constructor", () => {
    it("should create instance with default registries", () => {
      const instance = new InputService();
      expect(instance).toBeInstanceOf(InputService);
    });

    it("should detect CI environment from CI env var", () => {
      process.env.CI = "true";
      const ciService = new InputService();
      expect((ciService as any).isCI).toBe(true);
      delete process.env.CI;
    });

    it("should detect CI from FLOW_TEST_AUTO_INPUT", () => {
      process.env.FLOW_TEST_AUTO_INPUT = "true";
      const ciService = new InputService();
      expect((ciService as any).isCI).toBe(true);
      delete process.env.FLOW_TEST_AUTO_INPUT;
    });

    it("should set runnerInteractiveMode when provided", () => {
      const interactiveService = new InputService(true);
      expect((interactiveService as any).runnerInteractiveMode).toBe(true);
    });

    it("should accept custom InputTypeRegistry", () => {
      const mockRegistry = new InputTypeRegistry();
      const customService = new InputService(false, mockRegistry);
      expect((customService as any).inputTypeRegistry).toBe(mockRegistry);
    });

    it("should accept custom PromptStyleRegistry", () => {
      const mockRegistry = new PromptStyleRegistry();
      const customService = new InputService(false, undefined, mockRegistry);
      expect((customService as any).promptStyleRegistry).toBe(mockRegistry);
    });
  });

  describe("setExecutionContext", () => {
    it("should set execution context", () => {
      const context = {
        suite_name: "Test Suite",
        suite_path: "/path/to/suite.yaml",
        step_name: "Test Step",
        step_id: "test-step",
        step_index: 0,
      };
      service.setExecutionContext(context);
      expect((service as any).executionContext).toEqual(context);
    });
  });

  describe("CI Mode", () => {
    beforeEach(() => {
      (service as any).isCI = true;
    });

    it("should use ci_default in CI mode", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        ci_default: "ci_value",
        default: "default_value",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe("ci_value");
      expect((result as any).used_default).toBe(true);
      expect((result as any).validation_passed).toBe(true);
    });

    it("should fall back to default when no ci_default", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        default: "default_value",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe("default_value");
      expect((result as any).used_default).toBe(true);
    });

    it("should fail for required input without ci_default or default", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        required: true,
      };

      const result = await service.promptUser(config, {});
      expect((result as any).validation_passed).toBe(false);
      expect((result as any).validation_error).toBeDefined();
    });

    it("should validate type even in CI mode", async () => {
      const config: InputConfig = {
        prompt: "Enter email",
        variable: "email",
        type: "email",
        ci_default: "invalid-email",
        required: true,
      };

      // Type validation (email, url) is always performed, even in CI mode
      const result = await service.promptUser(config, {});
      expect((result as any).validation_passed).toBe(false);
      expect((result as any).validation_error).toContain(
        "Invalid email format"
      );
    });

    it("should convert value types correctly in CI mode", async () => {
      const config: InputConfig = {
        prompt: "Enter number",
        variable: "count",
        type: "number",
        ci_default: "42",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe(42);
      expect(typeof (result as any).value).toBe("number");
    });
  });

  describe("Multiple Inputs", () => {
    beforeEach(() => {
      (service as any).isCI = true;
    });

    it("should handle array of inputs sequentially", async () => {
      const configs: InputConfig[] = [
        {
          prompt: "First input",
          variable: "first",
          type: "text",
          ci_default: "value1",
        },
        {
          prompt: "Second input",
          variable: "second",
          type: "text",
          ci_default: "value2",
        },
      ];

      const results = await service.promptUser(configs, {});
      expect(Array.isArray(results)).toBe(true);
      expect((results as any).length).toBe(2);
      expect((results as any)[0].value).toBe("value1");
      expect((results as any)[1].value).toBe("value2");
    });

    it("should update variables progressively between inputs", async () => {
      const configs: InputConfig[] = [
        {
          prompt: "First input",
          variable: "first",
          type: "text",
          ci_default: "value1",
        },
        {
          prompt: "Using: {{first}}",
          variable: "second",
          type: "text",
          ci_default: "value2",
        },
      ];

      const results = await service.promptUser(configs, {});
      expect((results as any)[0].validation_passed).toBe(true);
      expect((results as any)[1].validation_passed).toBe(true);
    });

    it("should continue on error in multiple inputs", async () => {
      const configs: InputConfig[] = [
        {
          prompt: "First (will fail)",
          variable: "first",
          type: "text",
          required: true,
        },
        {
          prompt: "Second (will succeed)",
          variable: "second",
          type: "text",
          ci_default: "value2",
        },
      ];

      const results = await service.promptUser(configs, {});
      expect((results as any)[0].validation_passed).toBe(false);
      expect((results as any)[1].validation_passed).toBe(true);
    });
  });

  describe("Condition Evaluation", () => {
    beforeEach(() => {
      (service as any).isCI = true;
    });

    it("should skip input when condition is false", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        condition: "enabled",
        default: "default_value",
      };

      const result = await service.promptUser(config, { enabled: false });
      expect((result as any).value).toBe("default_value");
      expect((result as any).used_default).toBe(true);
    });

    it("should execute input when condition is true", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        condition: "enabled",
        ci_default: "ci_value",
      };

      const result = await service.promptUser(config, { enabled: true });
      expect((result as any).value).toBe("ci_value");
      expect((result as any).validation_passed).toBe(true);
    });

    it("should handle complex JMESPath conditions", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        condition: "status == `200` && environment == 'prod'",
        ci_default: "prod_value",
      };

      const result = await service.promptUser(config, {
        status: 200,
        environment: "prod",
      });
      expect((result as any).value).toBe("prod_value");
    });
  });

  describe("Variable Interpolation", () => {
    beforeEach(() => {
      (service as any).isCI = true;
    });

    it("should interpolate variables in prompt", async () => {
      const config: InputConfig = {
        prompt: "Enter {{field_name}}",
        variable: "test",
        type: "text",
        ci_default: "value",
      };

      const result = await service.promptUser(config, {
        field_name: "username",
      });
      expect((result as any).validation_passed).toBe(true);
    });

    it("should fail validation for Faker template in email type (interpolation should happen before)", async () => {
      const config: InputConfig = {
        prompt: "Enter email",
        variable: "email",
        type: "email",
        ci_default: "{{$faker.internet.email}}",
      };

      // InputService receives raw template and validates it - templates should be interpolated before validation
      const result = await service.promptUser(config, {});
      expect((result as any).validation_passed).toBe(false);
      expect((result as any).validation_error).toContain(
        "Invalid email format"
      );
    });

    it("should pass through JavaScript template (interpolation happens in VariableService)", async () => {
      const config: InputConfig = {
        prompt: "Enter timestamp",
        variable: "timestamp",
        type: "text",
        ci_default: "{{$js:Date.now()}}",
      };

      // InputService doesn't interpolate - that's VariableService's responsibility
      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe("{{$js:Date.now()}}");
      expect((result as any).validation_passed).toBe(true);
    });
  });

  describe("Type Conversion", () => {
    beforeEach(() => {
      (service as any).isCI = true;
    });

    it("should convert string to number for number type", async () => {
      const config: InputConfig = {
        prompt: "Enter number",
        variable: "count",
        type: "number",
        ci_default: "42",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe(42);
      expect(typeof (result as any).value).toBe("number");
    });

    it("should convert to boolean for confirm type", async () => {
      const config: InputConfig = {
        prompt: "Confirm action",
        variable: "confirmed",
        type: "confirm",
        ci_default: "yes",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe(true);
      expect(typeof (result as any).value).toBe("boolean");
    });

    it("should keep string as-is for text type", async () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "text",
        type: "text",
        ci_default: "hello",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).value).toBe("hello");
      expect(typeof (result as any).value).toBe("string");
    });
  });
});
