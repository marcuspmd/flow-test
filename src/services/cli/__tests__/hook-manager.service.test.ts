import * as path from "path";
import { HookManager } from "../hook-manager.service";
import { EngineHooks } from "../../../types/engine.types";
import { createConsoleHooks as originalCreateConsoleHooks } from "../../hook-factory";

jest.mock("../../hook-factory", () => ({
  createConsoleHooks: jest.fn(() => ({ onExecutionStart: jest.fn() })),
}));

const beginRunMock = jest.fn();
const createHooksMock = jest.fn();

jest.mock("../../realtime-reporter", () => {
  return {
    RealtimeReporter: jest.fn().mockImplementation(() => ({
      beginRun: beginRunMock,
      createHooks: createHooksMock,
    })),
  };
});

describe("HookManager", () => {
  let manager: HookManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new HookManager();
  });

  describe("mergeHooks", () => {
    it("should merge callbacks from multiple hook objects", async () => {
      const spy: Array<string> = [];
      const hookA: EngineHooks = {
        onExecutionStart: async () => {
          spy.push("A");
        },
      };
      const hookB: EngineHooks = {
        onExecutionStart: async () => {
          spy.push("B");
        },
      };

      const merged = manager.mergeHooks(hookA, hookB);
      await merged.onExecutionStart?.({} as any);

      expect(spy).toEqual(["A", "B"]);
    });

    it("should ignore undefined hooks and missing callbacks", async () => {
      const calls: string[] = [];
      const merged = manager.mergeHooks(
        undefined,
        {},
        {
          onError: async () => {
            calls.push("first");
          },
        },
        {
          onError: async () => {
            calls.push("second");
          },
        }
      );

      await merged.onError?.(new Error("boom"));
      expect(merged.onExecutionStart).toBeUndefined();
      expect(calls).toEqual(["first", "second"]);
    });
  });

  describe("createConsoleHooks", () => {
    it("should delegate to createConsoleHooks factory", () => {
      const logger: any = { info: jest.fn() };
      const hooks = manager.createConsoleHooks(logger);

      expect(hooks.onExecutionStart).toBeDefined();
      expect(
        (originalCreateConsoleHooks as unknown as jest.Mock).mock.calls[0][0]
      ).toBe(logger);
    });
  });

  describe("createRealtimeHooks", () => {
    beforeEach(() => {
      beginRunMock.mockReturnValue("run-123");
      createHooksMock.mockReturnValue({ onExecutionEnd: jest.fn() });
    });

    it("should create realtime hooks with absolute path", () => {
      const [hooks, reporter, runId] = manager.createRealtimeHooks(
        "/tmp/live-events.jsonl",
        { foo: "bar" }
      );

      expect(hooks.onExecutionEnd).toBeDefined();
      expect(beginRunMock).toHaveBeenCalledWith({
        source: "cli",
        label: "CLI execution",
        options: { foo: "bar" },
      });
      expect(runId).toBe("run-123");
      expect(reporter).toBeDefined();
    });

    it("should resolve relative path against cwd", () => {
      const relativePath = "results/live.jsonl";
      manager.createRealtimeHooks(relativePath, {});

      const RealtimeReporterMock = jest.requireMock("../../realtime-reporter")
        .RealtimeReporter as jest.Mock;

      expect(beginRunMock).toHaveBeenCalled();
      expect(RealtimeReporterMock).toHaveBeenCalledWith(
        path.join(process.cwd(), relativePath)
      );
      expect(createHooksMock).toHaveBeenCalledWith("run-123");
    });
  });
});
