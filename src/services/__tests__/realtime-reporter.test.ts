import fs from "fs";
import os from "os";
import path from "path";
import { RealtimeReporter } from "../../services/realtime-reporter";
import {
  AggregatedResult,
  ExecutionContext,
  ExecutionStats,
  TestStep,
  TestSuite,
} from "../../types/engine.types";

function createStats(): ExecutionStats {
  return {
    tests_discovered: 1,
    tests_completed: 0,
    tests_successful: 0,
    tests_failed: 0,
    tests_skipped: 0,
    requests_made: 0,
    total_response_time_ms: 0,
  };
}

describe("RealtimeReporter", () => {
  it("tracks execution lifecycle and persists events", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-reporter-"));
    const outputPath = path.join(tmpDir, "events.jsonl");
    const reporter = new RealtimeReporter(outputPath);

    const runId = reporter.beginRun({ source: "test", label: "unit" });
    const hooks = reporter.createHooks(runId);

    const stats = createStats();
    await hooks.onExecutionStart?.(stats);

    const suite: TestSuite = {
      node_id: "suite-1",
      suite_name: "Sample Suite",
      steps: [],
    };

    await hooks.onSuiteStart?.(suite);

    const step: TestStep = { name: "Sample Step" };
    const stepResult = {
      status: "success",
      duration_ms: 12,
      assertions_results: [],
      captured_variables: { sample: "value" },
    };

    const context: ExecutionContext = {
      suite,
      global_variables: {},
      runtime_variables: {},
      step_index: 0,
      total_steps: 1,
      start_time: new Date(),
      execution_id: "run-1",
    };

    await hooks.onStepEnd?.(step, stepResult, context);

    const suiteResult = {
      status: "success",
      duration_ms: 25,
      failed_step: undefined,
    };

    await hooks.onSuiteEnd?.(suite, suiteResult);

    const aggregated: AggregatedResult = {
      project_name: "Unit Tests",
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      total_duration_ms: 25,
      total_tests: 1,
      successful_tests: 1,
      failed_tests: 0,
      skipped_tests: 0,
      success_rate: 100,
      suites_results: [],
      global_variables_final_state: {},
    };

    await hooks.onExecutionEnd?.(aggregated);

    const run = reporter.getRun(runId);
    expect(run).toBeDefined();
    expect(run!.status).toBe("success");
    expect(run!.events.length).toBeGreaterThan(0);
    expect(run!.result?.success_rate).toBe(100);

    const fileContent = fs.readFileSync(outputPath, "utf8").trim().split("\n");
    expect(fileContent.length).toBeGreaterThan(0);
    const finalEvent = JSON.parse(fileContent[fileContent.length - 1]);
    expect(finalEvent.type).toBe("run_completed");

    const errorRunId = reporter.beginRun({ source: "test" });
    reporter.recordRunError(errorRunId, new Error("boom"));
    const errorRun = reporter.getRun(errorRunId);
    expect(errorRun?.status).toBe("failed");
    expect(errorRun?.error?.message).toBe("boom");

    const errorFileContent = fs
      .readFileSync(outputPath, "utf8")
      .trim()
      .split("\n");
    const lastLine = JSON.parse(errorFileContent[errorFileContent.length - 1]);
    expect(lastLine.type).toBe("run_error");
  });
});
