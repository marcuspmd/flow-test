import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import {
  AggregatedResult,
  EngineExecutionOptions,
  EngineHooks,
  ExecutionContext,
  ExecutionStats,
  TestStep,
  TestSuite,
} from "../types/engine.types";
import { LoggerService } from "./logger.service";
import { LogStreamingService } from "./log-streaming.service";

/**
 * Module-level logger instance for realtime reporter
 */
const logger = new LoggerService();

export type LiveEventType =
  | "run_registered"
  | "run_started"
  | "suite_started"
  | "suite_completed"
  | "step_completed"
  | "run_error"
  | "run_completed";

export interface LiveEvent<TPayload = any> {
  runId: string;
  type: LiveEventType;
  timestamp: string;
  payload?: TPayload;
}

export interface LiveRunRecord {
  id: string;
  status: "pending" | "running" | "success" | "failed";
  source?: string;
  label?: string;
  options?: EngineExecutionOptions;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  last_event_at?: string;
  stats?: ExecutionStats;
  result?: AggregatedResult;
  error?: {
    message: string;
    stack?: string;
    context?: any;
  };
  events: LiveEvent[];
}

interface BeginRunMetadata {
  source?: string;
  label?: string;
  options?: EngineExecutionOptions;
  resetOutputFile?: boolean;
}

/**
 * Service responsible for broadcasting execution events in real time.
 *
 * @remarks
 * The RealtimeReporter captures execution lifecycle events and exposes them through
 * an event emitter, enabling consumers such as dashboards or HTTP servers to
 * provide live updates while tests are running. When an output path is provided,
 * events are also persisted as JSON lines that can be tailed by external tools.
 */
export class RealtimeReporter extends EventEmitter {
  private outputPath?: string;
  private runs: Map<string, LiveRunRecord> = new Map();
  private activeRunId: string | null = null;
  private logStream = LogStreamingService.getInstance();

  constructor(outputPath?: string) {
    super();
    this.outputPath = outputPath
      ? this.resolveOutputPath(outputPath)
      : undefined;
  }

  /**
   * Begins tracking a new execution run.
   *
   * @returns The generated run identifier
   */
  beginRun(metadata: BeginRunMetadata = {}): string {
    const runId = this.generateRunId();
    const createdAt = new Date().toISOString();

    const record: LiveRunRecord = {
      id: runId,
      status: "pending",
      source: metadata.source,
      label: metadata.label,
      options: metadata.options,
      created_at: createdAt,
      events: [],
    };

    this.runs.set(runId, record);
    this.activeRunId = runId;

    if (this.outputPath) {
      try {
        const dir = path.dirname(this.outputPath);
        fs.mkdirSync(dir, { recursive: true });
        if (metadata.resetOutputFile !== false) {
          fs.writeFileSync(this.outputPath, "", "utf8");
        }
      } catch (error) {
        logger.warn(
          `⚠️  Unable to prepare live events file at '${this.outputPath}': ${error}`
        );
      }
    }

    this.emitEvent({
      runId,
      type: "run_registered",
      payload: {
        source: metadata.source,
        label: metadata.label,
        options: metadata.options,
      },
    });

    this.logStream.updateSession(runId, {
      label: metadata.label,
      source: metadata.source,
      status: "pending",
      metadata: {
        options: metadata.options,
      },
    });

    return runId;
  }

  /**
   * Creates hook callbacks that funnel execution events into the reporter.
   */
  createHooks(runId: string): EngineHooks {
    return {
      onExecutionStart: async (stats: ExecutionStats) => {
        this.updateRun(runId, {
          status: "running",
          started_at: new Date().toISOString(),
          stats,
        });

        this.emitEvent({
          runId,
          type: "run_started",
          payload: { stats },
        });

        this.logStream.updateSession(runId, {
          status: "running",
          startedAt: new Date().toISOString(),
          metadata: {
            stats,
          },
        });
      },

      onSuiteStart: async (suite: TestSuite) => {
        this.emitEvent({
          runId,
          type: "suite_started",
          payload: {
            suite_name: suite.suite_name,
            node_id: suite.node_id,
          },
        });

        this.logStream.updateSession(runId, {
          metadata: {
            lastSuite: suite.suite_name,
            lastNodeId: suite.node_id,
          },
        });
      },

      onSuiteEnd: async (suite: TestSuite, result: any) => {
        this.emitEvent({
          runId,
          type: "suite_completed",
          payload: {
            suite_name: suite.suite_name,
            node_id: suite.node_id,
            status: result.status,
            duration_ms: result.duration_ms,
            failed_step: result.failed_step,
          },
        });

        this.logStream.updateSession(runId, {
          metadata: {
            lastSuite: suite.suite_name,
            lastSuiteStatus: result.status,
            lastSuiteDuration: result.duration_ms,
          },
        });
      },

      onStepEnd: async (
        step: TestStep,
        result: any,
        context: ExecutionContext
      ) => {
        this.emitEvent({
          runId,
          type: "step_completed",
          payload: {
            suite_name: context?.suite?.suite_name ?? "unknown",
            node_id: context?.suite?.node_id,
            step_name: step.name,
            status: result.status,
            duration_ms: result.duration_ms,
            assertions: result.assertions_results?.length || 0,
            captured_variables: result.captured_variables,
          },
        });

        this.logStream.updateSession(runId, {
          metadata: {
            lastSuite: context?.suite?.suite_name,
            lastStep: step.name,
            lastStepStatus: result.status,
          },
        });
      },

      onError: async (error: Error, context?: any) => {
        this.recordRunError(runId, error, context);
      },

      onExecutionEnd: async (result: AggregatedResult) => {
        const finishedAt = new Date().toISOString();
        const record = this.runs.get(runId);
        const status =
          record?.status === "failed"
            ? "failed"
            : (result.failed_tests || 0) > 0
            ? "failed"
            : "success";

        this.updateRun(runId, {
          status,
          finished_at: finishedAt,
          result,
        });

        this.emitEvent({
          runId,
          type: "run_completed",
          payload: {
            status,
            result,
          },
        });

        this.logStream.updateSession(runId, {
          status,
          finishedAt,
          metadata: {
            result,
          },
        });
      },
    };
  }

  /**
   * Retrieves an array with all known runs (newest first).
   */
  getRuns(): LiveRunRecord[] {
    return Array.from(this.runs.values()).sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
  }

  /**
   * Records a run error manually (used when execution fails outside hooks).
   */
  recordRunError(runId: string, error: Error, context?: any): void {
    this.updateRun(runId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        context,
      },
    });

    this.emitEvent({
      runId,
      type: "run_error",
      payload: {
        message: error.message,
        stack: error.stack,
        context,
      },
    });

    this.logStream.updateSession(runId, {
      status: "failed",
      metadata: {
        error: {
          message: error.message,
          stack: error.stack,
          context,
        },
      },
    });
  }

  /**
   * Returns the active run if one exists.
   */
  getActiveRun(): LiveRunRecord | undefined {
    return this.activeRunId ? this.runs.get(this.activeRunId) : undefined;
  }

  /**
   * Returns a specific run by id.
   */
  getRun(runId: string): LiveRunRecord | undefined {
    return this.runs.get(runId);
  }

  /**
   * Subscribes to live events.
   */
  subscribe(listener: (event: LiveEvent) => void): () => void {
    this.on("event", listener);
    return () => this.off("event", listener);
  }

  private resolveOutputPath(target: string): string {
    if (path.isAbsolute(target)) {
      return path.normalize(target);
    }
    return path.normalize(path.join(process.cwd(), target));
  }

  private updateRun(runId: string, data: Partial<LiveRunRecord>): void {
    const record = this.runs.get(runId);
    if (!record) {
      return;
    }

    Object.assign(record, data);
  }

  private emitEvent(event: Omit<LiveEvent, "timestamp">): void {
    const enriched: LiveEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const record = this.runs.get(event.runId);
    if (record) {
      record.events.push(enriched);
      record.last_event_at = enriched.timestamp;
    }

    if (this.outputPath) {
      try {
        fs.appendFileSync(
          this.outputPath,
          JSON.stringify(enriched) + "\n",
          "utf8"
        );
      } catch (error) {
        logger.warn(
          `⚠️  Failed to write live event to '${this.outputPath}': ${error}`
        );
      }
    }

    this.emit("event", enriched);
  }

  private generateRunId(): string {
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }
}
