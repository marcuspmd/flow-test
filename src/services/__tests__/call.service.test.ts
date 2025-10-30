import fs from "fs";
import os from "os";
import path from "path";
import { CallService } from "../call.service";
import type {
  StepCallExecutionOptions,
  StepCallRequest,
  StepCallResult,
  StepExecutionHandler,
} from "../../types/call.types";

const createYamlSuite = (filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, "utf8");
};

describe("CallService", () => {
  let tempDir: string;
  let callService: CallService;
  let handlerMock: jest.MockedFunction<StepExecutionHandler>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-call-"));
    handlerMock = jest.fn<
      ReturnType<StepExecutionHandler>,
      Parameters<StepExecutionHandler>
    >(async () => ({
      success: true,
      status: "success",
    }));
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLogLevel: jest.fn(),
      getLogLevel: jest.fn(() => "info"),
    };
    callService = new CallService(mockLogger);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should resolve and execute the target step", async () => {
    const callerPath = path.join(tempDir, "caller.yaml");
    createYamlSuite(
      callerPath,
      `suite_name: Caller
node_id: caller
steps: []
`
    );

    const targetPath = path.join(tempDir, "target.yaml");
    createYamlSuite(
      targetPath,
      `suite_name: Target Suite
node_id: target-suite
steps:
  - name: Target Step
    step_id: target-step
    request:
      method: GET
      url: /demo
`
    );

    const request: StepCallRequest = {
      test: "./target.yaml",
      step: "target-step",
    };

    const options: StepCallExecutionOptions = {
      callerSuitePath: callerPath,
      allowedRoot: tempDir,
      callStack: [],
      stepExecutionHandler: handlerMock,
    };

    await callService.executeStepCall(request, options);

    expect(handlerMock).toHaveBeenCalledTimes(1);
    const handlerInput = handlerMock.mock.calls[0][0];
    expect(handlerInput.resolved.suitePath).toBe(targetPath);
    expect(handlerInput.resolved.step.step_id).toBe("target-step");
    expect(handlerInput.request).toEqual(request);
  });

  it("should prevent resolving outside the allowed root", async () => {
    const callerPath = path.join(tempDir, "caller.yaml");
    createYamlSuite(
      callerPath,
      `suite_name: Caller
node_id: caller
steps: []
`
    );

    const request: StepCallRequest = {
      test: "../escape.yaml",
      step: "any-step",
    };

    const options: StepCallExecutionOptions = {
      callerSuitePath: callerPath,
      allowedRoot: tempDir,
      callStack: [],
      stepExecutionHandler: handlerMock,
    };

    await expect(callService.executeStepCall(request, options)).rejects.toThrow(
      "escapes the allowed directory"
    );
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it("should detect recursive calls using the call stack", async () => {
    const callerPath = path.join(tempDir, "caller.yaml");
    createYamlSuite(
      callerPath,
      `suite_name: Caller
node_id: caller
steps: []
`
    );

    const targetPath = path.join(tempDir, "target.yaml");
    createYamlSuite(
      targetPath,
      `suite_name: Target Suite
node_id: target-suite
steps:
  - name: Target Step
    step_id: target-step
    request:
      method: GET
      url: /demo
`
    );

    const request: StepCallRequest = {
      test: "./target.yaml",
      step: "target-step",
    };

    const normalizedPath = path.normalize(targetPath);
    const identifier = `${normalizedPath}::target-step`;

    const options: StepCallExecutionOptions = {
      callerSuitePath: callerPath,
      allowedRoot: tempDir,
      callStack: [identifier],
      stepExecutionHandler: handlerMock,
    };

    await expect(callService.executeStepCall(request, options)).rejects.toThrow(
      "Recursive step call detected"
    );
    expect(handlerMock).not.toHaveBeenCalled();
  });
});
