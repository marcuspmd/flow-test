import { InputService } from "../../services/input.service";
import { InputConfig } from "../../types/engine.types";

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
