import { InputService } from "../../services/input.service";
import { InputConfig } from "../../types/engine.types";
import * as readline from "readline";

// Mock readline
jest.mock("readline");
const mockReadline = readline as jest.Mocked<typeof readline>;

describe("InputService", () => {
  let service: InputService;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    service = new InputService();
  });

  describe("constructor", () => {
    it("should detect CI environment from various environment variables", () => {
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

  describe("displayPrompt", () => {
    it("should display simple style prompt", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test_var",
        type: "text",
        style: "simple",
      };
      (service as any).displayPrompt(config);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should display boxed style prompt", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test_var",
        type: "text",
        style: "boxed",
        description: "Test description",
      };
      (service as any).displayPrompt(config);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should display highlighted style prompt", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test_var",
        type: "text",
        style: "highlighted",
        description: "Test description",
      };
      (service as any).displayPrompt(config);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should display default value hint", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test_var",
        type: "text",
        default: "default_value",
      };
      (service as any).displayPrompt(config);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should display placeholder hint", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test_var",
        type: "text",
        placeholder: "example@email.com",
      };
      (service as any).displayPrompt(config);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("promptText", () => {
    it("should prompt for text with default", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        default: "default_text",
      };

      const result = await (service as any).promptText(config);
      expect(result).toBe("default_text");
      expect(mockRL.close).toHaveBeenCalled();
    });

    it("should prompt for text with user input", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("user_input")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        required: true,
      };

      const result = await (service as any).promptText(config);
      expect(result).toBe("user_input");
    });
  });

  describe("promptPassword", () => {
    it("should mask password input", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("secret")),
        close: jest.fn(),
        _writeToOutput: jest.fn(),
      } as any;
      mockReadline.createInterface.mockReturnValue(mockRL);

      const config: InputConfig = {
        prompt: "Enter password",
        variable: "password",
        type: "password",
        required: true,
      };

      const result = await (service as any).promptPassword(config);
      expect(result).toBe("secret");
    });

    it("should use default for empty password", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("")),
        close: jest.fn(),
        _writeToOutput: jest.fn(),
      } as any;
      mockReadline.createInterface.mockReturnValue(mockRL);

      const config: InputConfig = {
        prompt: "Enter password",
        variable: "password",
        type: "password",
        default: "default_pass",
      };

      const result = await (service as any).promptPassword(config);
      expect(result).toBe("default_pass");
    });
  });

  describe("promptSelect", () => {
    it("should handle valid selection", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("1")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const config: InputConfig = {
        prompt: "Select option",
        variable: "choice",
        type: "select",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      const result = await (service as any).promptSelect(config);
      expect(result).toBe("opt1");
      consoleSpy.mockRestore();
    });

    it("should use default on invalid selection", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("999")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const config: InputConfig = {
        prompt: "Select option",
        variable: "choice",
        type: "select",
        options: [{ value: "opt1", label: "Option 1" }],
        default: "opt1",
      };

      const result = await (service as any).promptSelect(config);
      expect(result).toBe("opt1");
      consoleSpy.mockRestore();
    });

    it("should throw error for empty options", async () => {
      const config: InputConfig = {
        prompt: "Select option",
        variable: "choice",
        type: "select",
        options: [],
      };

      await expect((service as any).promptSelect(config)).rejects.toThrow(
        "Select input requires options array"
      );
    });
  });

  describe("promptConfirm", () => {
    it("should handle yes confirmation", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("y")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Confirm action",
        variable: "confirm",
        type: "confirm",
      };

      const result = await (service as any).promptConfirm(config);
      expect(result).toBe(true);
    });

    it("should handle no confirmation", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("n")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Confirm action",
        variable: "confirm",
        type: "confirm",
      };

      const result = await (service as any).promptConfirm(config);
      expect(result).toBe(false);
    });

    it("should use default on empty input", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Confirm action",
        variable: "confirm",
        type: "confirm",
        default: true,
      };

      const result = await (service as any).promptConfirm(config);
      expect(result).toBe(true);
    });
  });

  describe("promptNumber", () => {
    it("should parse valid number", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("42")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Enter number",
        variable: "num",
        type: "number",
      };

      const result = await (service as any).promptNumber(config);
      expect(result).toBe(42);
    });

    it("should use default for invalid number", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("not_a_number")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Enter number",
        variable: "num",
        type: "number",
        default: 10,
      };

      const result = await (service as any).promptNumber(config);
      expect(result).toBe(10);
    });

    it("should throw for invalid number without default", async () => {
      const mockRL = {
        question: jest.fn((prompt, callback) => callback("invalid")),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);

      const config: InputConfig = {
        prompt: "Enter number",
        variable: "num",
        type: "number",
      };

      await expect((service as any).promptNumber(config)).rejects.toThrow(
        "Invalid number input"
      );
    });
  });

  describe("promptMultiline", () => {
    it("should capture multiple lines until END", async () => {
      const lines = ["line 1", "line 2", "END"];
      let callCount = 0;

      const mockRL = {
        question: jest.fn((prompt, callback) => {
          callback(lines[callCount++]);
        }),
        close: jest.fn(),
      };
      mockReadline.createInterface.mockReturnValue(mockRL as any);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const config: InputConfig = {
        prompt: "Enter text",
        variable: "text",
        type: "multiline",
      };

      const result = await (service as any).promptMultiline(config);
      expect(result).toBe("line 1\nline 2");
      consoleSpy.mockRestore();
    });
  });

  describe("validateInput", () => {
    it("should pass for valid input", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
      };

      const result = (service as any).validateInput("test", config, {});
      expect(result.valid).toBe(true);
    });

    it("should fail for required empty input", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        required: true,
        validation: {}, // Need validation object for required check to work
      };

      const result = (service as any).validateInput(null, config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toBe("This field is required");
    });

    it("should validate min_length", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        validation: { min_length: 5 },
      };

      const result = (service as any).validateInput("abc", config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Minimum length is 5");
    });

    it("should validate max_length", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        validation: { max_length: 5 },
      };

      const result = (service as any).validateInput("too long", config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Maximum length is 5");
    });

    it("should validate pattern", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        validation: { pattern: "^[0-9]+$" },
      };

      const result = (service as any).validateInput("abc", config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not match required pattern");
    });

    it("should validate email format", () => {
      const config: InputConfig = {
        prompt: "Enter email",
        variable: "email",
        type: "email",
        required: true,
        validation: {}, // Need validation object
      };

      const result = (service as any).validateInput("invalid", config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("should validate URL format", () => {
      const config: InputConfig = {
        prompt: "Enter URL",
        variable: "url",
        type: "url",
        required: true,
        validation: {}, // Need validation object
      };

      const result = (service as any).validateInput("not-a-url", config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    it("should validate number min", () => {
      const config: InputConfig = {
        prompt: "Enter number",
        variable: "num",
        type: "number",
        validation: { min: 10 },
      };

      const result = (service as any).validateInput(5, config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be at least 10");
    });

    it("should validate number max", () => {
      const config: InputConfig = {
        prompt: "Enter number",
        variable: "num",
        type: "number",
        validation: { max: 10 },
      };

      const result = (service as any).validateInput(15, config, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be at most 10");
    });

    it("should validate custom validation", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        validation: {
          custom_validation: "value.startsWith('test')",
        },
      };

      const result = (service as any).validateInput("abc", config, {});
      expect(result.valid).toBe(false);
    });

    it("should handle custom validation errors", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        validation: {
          custom_validation: "invalid syntax",
        },
      };

      const result = (service as any).validateInput("test", config, {});
      expect(result.valid).toBe(false);
    });

    it("should return warnings for warning severity expressions", () => {
      const config: InputConfig = {
        prompt: "Enter text",
        variable: "test",
        type: "text",
        validation: {
          expressions: [
            {
              expression: "false",
              language: "javascript",
              message: "This is a warning",
              severity: "warning",
            },
          ],
        },
      };

      const result = (service as any).validateInput("test", config, {});
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain("This is a warning");
    });
  });

  describe("evaluateCondition", () => {
    it("should evaluate JMESPath condition", () => {
      const result = (service as any).evaluateCondition("status == `200`", {
        status: 200,
      });
      expect(result).toBe(true);
    });

    it("should handle invalid conditions", () => {
      const result = (service as any).evaluateCondition("invalid...", {
        status: 200,
      });
      expect(result).toBe(false);
    });
  });

  describe("convertValue", () => {
    it("should convert to number", () => {
      const result = (service as any).convertValue("42", "number");
      expect(result).toBe(42);
    });

    it("should convert to boolean", () => {
      const result = (service as any).convertValue("yes", "confirm");
      expect(result).toBe(true);
    });

    it("should return value as-is for other types", () => {
      const result = (service as any).convertValue("text", "text");
      expect(result).toBe("text");
    });
  });

  describe("interpolateConfig", () => {
    it("should interpolate prompt and description", () => {
      const config: InputConfig = {
        prompt: "Enter {{field_name}}",
        variable: "test",
        type: "text",
        description: "This is for {{field_name}}",
      };

      const result = (service as any).interpolateConfig(config, {
        field_name: "username",
      });
      expect(result.prompt).toBe("Enter username");
      expect(result.description).toBe("This is for username");
    });

    it("should handle undefined values in toDisplayString", () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        description: undefined,
        placeholder: undefined,
      };

      const result = (service as any).interpolateConfig(config, {});
      expect(result.description).toBeUndefined();
      expect(result.placeholder).toBeUndefined();
    });

    it("should handle complex objects in toDisplayString", () => {
      const config: InputConfig = {
        prompt: { nested: "value" } as any,
        variable: "test",
        type: "text",
      };

      const result = (service as any).interpolateConfig(config, {});
      expect(result.prompt).toBe('{"nested":"value"}');
    });
  });

  describe("interpolateOptions", () => {
    it("should interpolate string expression", () => {
      const result = (service as any).interpolateOptions(
        "items[*].{value: id, label: name}",
        { items: [{ id: 1, name: "Item 1" }] },
        { interpolate: (v: any) => v } as any
      );
      expect(result).toHaveLength(1);
    });

    it("should handle invalid JMESPath gracefully", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const result = (service as any).interpolateOptions(
        "invalid...syntax",
        {},
        { interpolate: (v: any) => v } as any
      );
      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe("CI mode", () => {
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
    });

    it("should throw for required input without ci_default", async () => {
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        required: true,
      };

      const result = await service.promptUser(config, {});
      expect((result as any).validation_passed).toBe(false);
    });

    it("should validate ci_default value", async () => {
      const config: InputConfig = {
        prompt: "Enter email",
        variable: "email",
        type: "email",
        ci_default: "invalid",
        required: true,
        validation: {}, // Need validation object
      };

      const result = await service.promptUser(config, {});
      expect((result as any).validation_passed).toBe(false);
    });
  });

  describe("condition evaluation", () => {
    it("should skip input when condition is false", async () => {
      (service as any).isCI = true;
      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        condition: "enabled",
        default: "default",
      };

      const result = await service.promptUser(config, { enabled: false });
      expect((result as any).value).toBe("default");
      expect((result as any).used_default).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle error and return default", async () => {
      (service as any).isCI = false;
      jest.spyOn(service as any, "displayPrompt").mockImplementation(() => {
        throw new Error("Display error");
      });

      const config: InputConfig = {
        prompt: "Enter value",
        variable: "test",
        type: "text",
        default: "fallback",
      };

      const result = await service.promptUser(config, {});
      expect((result as any).validation_passed).toBe(false);
      expect((result as any).value).toBe("fallback");
    });
  });

  describe("multiple inputs", () => {
    it("should handle array of inputs and update variables progressively", async () => {
      (service as any).isCI = true;
      const configs: InputConfig[] = [
        {
          prompt: "First input",
          variable: "first",
          type: "text",
          ci_default: "value1",
        },
        {
          prompt: "Second input using first: {{first}}",
          variable: "second",
          type: "text",
          ci_default: "value2",
        },
      ];

      const results = await service.promptUser(configs, {});
      expect(Array.isArray(results)).toBe(true);
      expect((results as any)[0].value).toBe("value1");
      expect((results as any)[1].value).toBe("value2");
    });

    it("should continue on error in multiple inputs", async () => {
      (service as any).isCI = true;
      const configs: InputConfig[] = [
        {
          prompt: "First input",
          variable: "first",
          type: "text",
          required: true,
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
      expect((results as any)[0].validation_passed).toBe(false);
      expect((results as any)[1].validation_passed).toBe(true);
    });
  });
});

describe("InputService sequential selects", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should re-evaluate select options using newly captured variables", async () => {
    const service = new InputService();
    (service as any).isCI = false;

    const displaySpy = jest
      .spyOn(service as any, "displayPrompt")
      .mockImplementation(() => {});

    const selectSpy = jest
      .spyOn(service as any, "promptSelect")
      .mockImplementation(async (config: any) => {
        if (config.variable === "proposalId") {
          expect(config.options).toHaveLength(2);
          return config.options[1].value; // choose proposal id 2
        }

        expect(config.variable).toBe("stageId");
        expect(config.options).toHaveLength(1);
        expect(config.options[0].value).toBe("stage-b1");
        expect(config.options[0].label).toContain("Stage B1");
        return config.options[0].value;
      });

    const configs: InputConfig[] = [
      {
        prompt: "Select proposal",
        variable: "proposalId",
        type: "select",
        options: "proposal_options",
        required: true,
      },
      {
        prompt: "Select stage",
        variable: "stageId",
        type: "select",
        options:
          "full_body.rows[?id == `{{proposalId}}`].flow.stages[*].{value: to_string(id), label: join(' - ', [to_string(name), to_string(code)])} | [0]",
        required: true,
      },
    ];

    const variables = {
      proposal_options: [
        { value: "1", label: "Proposal A" },
        { value: "2", label: "Proposal B" },
      ],
      full_body: {
        rows: [
          {
            id: 1,
            flow: {
              stages: [
                { id: "stage-a1", name: "Stage A1", code: "A1" },
                { id: "stage-a2", name: "Stage A2", code: "A2" },
              ],
            },
          },
          {
            id: 2,
            flow: {
              stages: [{ id: "stage-b1", name: "Stage B1", code: "B1" }],
            },
          },
        ],
      },
    };

    const results = await service.promptUser(configs, variables);

    expect(Array.isArray(results)).toBe(true);
    const resultArray = results as any[];
    expect(resultArray[0].variable).toBe("proposalId");
    expect(resultArray[0].value).toBe("2");
    expect(resultArray[1].variable).toBe("stageId");
    expect(resultArray[1].value).toBe("stage-b1");

    selectSpy.mockRestore();
    displaySpy.mockRestore();
  });
});

describe("InputService dynamic validation", () => {
  let service: InputService;

  beforeEach(() => {
    jest.resetModules();
    service = new InputService();
    (service as any).isCI = true;
  });

  it("returns validation warnings when expressions evaluate to warning", async () => {
    const config: InputConfig = {
      prompt: "Enter user email",
      variable: "user_email",
      type: "text",
      ci_default: "user@external.com",
      validation: {
        expressions: [
          {
            expression: "contains(value, '@example.com')",
            language: "jmespath",
            message: "Email should use example.com domain",
            severity: "warning",
          },
        ],
      },
    };

    const result = await service.promptUser(config, {});

    expect(Array.isArray(result)).toBe(false);
    const singleResult = result as any;
    expect(singleResult.validation_passed).toBe(true);
    expect(singleResult.validation_warnings).toEqual([
      "Email should use example.com domain",
    ]);
    expect(singleResult.used_default).toBe(true);
  });

  it("fails CI input when expressions evaluate to error", async () => {
    const config: InputConfig = {
      prompt: "Enter API key",
      variable: "api_key",
      type: "text",
      default: "invalid",
      ci_default: "invalid",
      validation: {
        expressions: [
          {
            expression: "contains(value, 'sk-')",
            language: "jmespath",
            message: "API key must start with sk-",
          },
        ],
      },
    };

    const result = await service.promptUser(config, {});

    expect(Array.isArray(result)).toBe(false);
    const singleResult = result as any;
    expect(singleResult.validation_passed).toBe(false);
    expect(singleResult.used_default).toBe(true);
    expect(singleResult.validation_error).toContain(
      "CI Mode validation failed"
    );
  });
});
