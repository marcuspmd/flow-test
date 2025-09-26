import { EngineHooks, ExecutionStats, TestSuite, TestStep, ExecutionContext } from "../types/engine.types";
import { LoggerService, getLogger } from "./logger.service";

/**
 * Creates default console logging hooks used by the CLI and orchestrator server.
 */
export function createConsoleHooks(logger: LoggerService): EngineHooks {
  const cliLogger = getLogger();

  return {
    onExecutionStart: async (stats: ExecutionStats) => {
      cliLogger.info(`🚀 Starting execution of ${stats.tests_discovered} test(s)`);
    },

    onTestDiscovered: async (test: any) => {
      cliLogger.debug(
        `📋 Discovered: ${test.node_id} - ${test.suite_name} (${test.priority})`
      );
    },

    onSuiteStart: async (suite: TestSuite) => {
      logger.info(`Starting suite`, {
        metadata: {
          type: "suite_start",
          suite_name: suite.suite_name,
          file_path: suite.node_id,
        },
      });
      cliLogger.info(`▶️  Starting: ${suite.suite_name}`);
    },

    onSuiteEnd: async (suite: TestSuite, result: any) => {
      logger.info(`Suite completed`, {
        metadata: {
          type: "suite_complete",
          suite_name: suite.suite_name,
          file_path: suite.node_id,
          success: result.status === "success",
        },
      });
      const emoji = result.status === "success" ? "✅" : "❌";
      cliLogger.info(
        `${emoji} Completed: ${suite.suite_name} (${result.duration_ms || 0}ms)`
      );
    },

    onStepEnd: async (step: TestStep, result: any, _context: ExecutionContext) => {
      logger.info(`Step completed`, {
        stepName: step.name,
        duration: result.duration_ms,
        metadata: {
          type: "step_result",
          success: result.status === "success",
        },
      });
    },

    onError: async (error: Error) => {
      cliLogger.error(`💥 Engine error: ${error.message}`, {
        error,
      });
    },
  };
}
