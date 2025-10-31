/**
 * @fileoverview Hook Manager Service
 *
 * @remarks
 * Manages creation and merging of engine hooks for CLI execution.
 *
 * @packageDocumentation
 */

import * as path from "path";
import { EngineHooks } from "../../types/engine.types";
import { LoggerService } from "../logger.service";
import { createConsoleHooks } from "../hook-factory";
import { RealtimeReporter } from "../realtime-reporter";

const HOOK_KEYS: (keyof EngineHooks)[] = [
  "onTestDiscovered",
  "onSuiteStart",
  "onSuiteEnd",
  "onStepStart",
  "onStepEnd",
  "onExecutionStart",
  "onExecutionEnd",
  "onError",
];

/**
 * Service responsible for managing engine hooks
 */
export class HookManager {
  /**
   * Merge multiple hook objects into a single one
   *
   * @param hooks - Array of hook objects to merge
   * @returns Merged hooks object
   */
  mergeHooks(...hooks: Array<EngineHooks | undefined>): EngineHooks {
    const merged: EngineHooks = {};

    for (const hookName of HOOK_KEYS) {
      const callbacks = hooks
        .filter(Boolean)
        .map((hook) => hook![hookName])
        .filter((callback) => typeof callback === "function");

      if (callbacks.length > 0) {
        (merged as Record<string, unknown>)[hookName] = async (
          ...args: unknown[]
        ) => {
          for (const callback of callbacks) {
            if (callback) {
              await (callback as (...args: unknown[]) => Promise<void> | void)(
                ...args
              );
            }
          }
        };
      }
    }

    return merged;
  }

  /**
   * Create console hooks for CLI output
   *
   * @param logger - Logger service instance
   * @returns Console hooks
   */
  createConsoleHooks(logger: LoggerService): EngineHooks {
    return createConsoleHooks(logger);
  }

  /**
   * Create hooks for realtime reporting
   *
   * @param liveEventsPath - Path to live events file
   * @param options - Execution options for metadata
   * @returns Tuple of [hooks, reporter, runId]
   */
  createRealtimeHooks(
    liveEventsPath: string,
    options: any
  ): [EngineHooks, RealtimeReporter, string] {
    const resolvedPath = path.isAbsolute(liveEventsPath)
      ? liveEventsPath
      : path.join(process.cwd(), liveEventsPath);

    const reporter = new RealtimeReporter(resolvedPath);
    const runId = reporter.beginRun({
      source: "cli",
      label: "CLI execution",
      options,
    });

    const hooks = reporter.createHooks(runId);

    return [hooks, reporter, runId];
  }
}
