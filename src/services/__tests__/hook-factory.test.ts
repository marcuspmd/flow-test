/**
 * Unit tests for HookFactory
 */

import { createConsoleHooks } from "../hook-factory";
import { getLogger, setupLogger } from "../logger.service";

describe("HookFactory", () => {
  beforeEach(() => {
    setupLogger("console", "silent");
  });

  describe("createConsoleHooks", () => {
    it("should create hooks object with all required methods", () => {
      const logger = getLogger();
      const hooks = createConsoleHooks(logger);

      expect(hooks.onExecutionStart).toBeDefined();
      expect(hooks.onTestDiscovered).toBeDefined();
      expect(hooks.onSuiteStart).toBeDefined();
      expect(hooks.onSuiteEnd).toBeDefined();
      expect(hooks.onStepEnd).toBeDefined();
      expect(hooks.onError).toBeDefined();
      expect(hooks.onExecutionEnd).toBeDefined();
    });

    it("should execute all hooks without error", async () => {
      const logger = getLogger();
      const hooks = createConsoleHooks(logger);

      const stats = {
        tests_discovered: 10,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      const suite = {
        node_id: "test-suite",
        suite_name: "Test Suite",
        steps: [],
      };

      const step = {
        name: "Test Step",
        request: { method: "GET", url: "/test" },
      };

      const result = {
        status: "success",
        duration_ms: 100,
      };

      const context = {
        runtime_variables: {},
        iteration_context: undefined,
      };

      await expect(hooks.onExecutionStart?.(stats)).resolves.toBeUndefined();
      await expect(
        hooks.onTestDiscovered?.({
          node_id: "test-1",
          suite_name: "Test",
          priority: "high",
        })
      ).resolves.toBeUndefined();
      await expect(hooks.onSuiteStart?.(suite as any)).resolves.toBeUndefined();
      await expect(
        hooks.onSuiteEnd?.(suite as any, result)
      ).resolves.toBeUndefined();
      await expect(
        hooks.onStepEnd?.(step as any, result, context as any)
      ).resolves.toBeUndefined();
      await expect(
        hooks.onError?.(new Error("Test error"))
      ).resolves.toBeUndefined();
      await expect(hooks.onExecutionEnd?.(stats)).resolves.toBeUndefined();
    });
  });
});
