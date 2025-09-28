import { CaptureService } from "../../services/capture.service";
import { ComputedService } from "../../services/computed.service";
import { DynamicExpressionService } from "../../services/dynamic-expression.service";
import { InputDynamicConfig } from "../../types/common.types";
import { InputResult } from "../../types/engine.types";

describe("DynamicExpressionService", () => {
  let service: DynamicExpressionService;

  beforeEach(() => {
    service = new DynamicExpressionService(
      new CaptureService(),
      new ComputedService()
    );
  });

  const baseContext = {
    stepName: "Collect interactive input",
    suiteNodeId: "suite-node",
    suiteName: "Sample Suite",
    timestamp: "2025-01-01T00:00:00.000Z",
  };

  const buildInputResult = (value: any): InputResult => ({
    variable: "user_input",
    value,
    input_time_ms: 10,
    validation_passed: true,
    used_default: false,
    timed_out: false,
  });

  it("processes capture expressions using input context", () => {
    const dynamicConfig: InputDynamicConfig = {
      capture: {
        mirrored_value: "value",
      },
    };

    const inputResult = buildInputResult("ABC-123");

    const outcome = service.processInputDynamics(inputResult, dynamicConfig, {
      ...baseContext,
      variables: { existing: "value" },
    });

    expect(outcome.assignments).toHaveLength(1);
    const assignment = outcome.assignments[0];
    expect(assignment.name).toBe("mirrored_value");
    expect(assignment.value).toBe("ABC-123");
    expect(assignment.scope).toBe("runtime");
    expect(assignment.source).toBe("capture");
    expect(assignment.reevaluated).toBeFalsy();
    expect(assignment.persist).toBeFalsy();
    expect(typeof assignment.timestamp).toBe("string");
    expect(outcome.registeredDefinitions).toHaveLength(0);
  });

  it("evaluates computed expressions and honours exports", () => {
    const dynamicConfig: InputDynamicConfig = {
      computed: {
        generated_token:
          "variables.prefix + '-' + variables.__input_value.toUpperCase()",
      },
      exports: ["generated_token"],
    };

    const inputResult = buildInputResult("session42");

    const outcome = service.processInputDynamics(inputResult, dynamicConfig, {
      ...baseContext,
      variables: { prefix: "sess" },
    });

    expect(outcome.assignments).toHaveLength(1);
    const assignment = outcome.assignments[0];
    expect(assignment.name).toBe("generated_token");
    expect(assignment.value).toBe("sess-SESSION42");
    expect(assignment.scope).toBe("runtime");
    expect(assignment.source).toBe("computed");
    expect(assignment.persist).toBe(true);
    expect(outcome.registeredDefinitions).toHaveLength(0);
  });

  it("reevaluates registered definitions when triggers change", () => {
    const dynamicConfig: InputDynamicConfig = {
      computed: {
        user_initial: "variables.__input_value",
      },
      reevaluate: [
        {
          name: "user_display_name",
          expression:
            "variables.user_first_name + ' ' + variables.user_last_name",
          type: "computed",
          scope: "suite",
          reevaluateOn: ["user_first_name", "user_last_name"],
        },
      ],
      persist_to_global: true,
    };

    const inputResult = buildInputResult("Ada");
    const contextVariables = {
      user_first_name: "Ada",
      user_last_name: "Lovelace",
    };

    const outcome = service.processInputDynamics(inputResult, dynamicConfig, {
      ...baseContext,
      variables: contextVariables,
    });

    expect(outcome.assignments).toHaveLength(1);
    expect(outcome.registeredDefinitions).toHaveLength(1);

    service.registerDefinitions(outcome.registeredDefinitions);

    const reevaluated = service.reevaluate(["user_first_name"], inputResult, {
      ...baseContext,
      variables: {
        ...contextVariables,
        user_first_name: "Augusta",
      },
    });

    expect(reevaluated).toHaveLength(1);
    const assignment = reevaluated[0];
    expect(assignment.name).toBe("user_display_name");
    expect(assignment.value).toBe("Augusta Lovelace");
    expect(assignment.scope).toBe("suite");
    expect(assignment.source).toBe("reevaluation");
    expect(assignment.reevaluated).toBe(true);
    expect(assignment.persist).toBe(true);
  });

  it("exposes request/response metadata to capture expressions", () => {
    const dynamicConfig: InputDynamicConfig = {
      capture: {
        status: "response.status_code",
        header_value: 'response.headers."x-correlation-id"',
        input_value: "input.value",
      },
      computed: {
        requestInfo: "`${variables.__input_variable}:${response?.status_code}`",
      },
    };

    const inputResult = buildInputResult("token-123");

    const outcome = service.processInputDynamics(inputResult, dynamicConfig, {
      ...baseContext,
      variables: {},
      response: {
        status_code: 201,
        headers: { "x-correlation-id": "corr-001" },
        body: { ok: true },
        size_bytes: 128,
      },
      request: {
        method: "POST",
        url: "/sessions",
      },
      captured: { previous: "value" },
    } as any);

    expect(outcome.assignments).toHaveLength(4);
    const byName = Object.fromEntries(
      outcome.assignments.map((assignment) => [assignment.name, assignment])
    );

    expect(byName.status.value).toBe(201);
    expect(byName.header_value.value).toBe("corr-001");
    expect(byName.input_value.value).toBe("token-123");
    expect(byName.requestInfo.value).toBe("user_input:201");
  });
});
