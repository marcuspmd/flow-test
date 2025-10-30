import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { JSONValue } from "../types/common.types";

/**
 * Context information for log streaming
 */
export interface LogStreamContext {
  nodeId?: string;
  stepName?: string;
  duration?: number;
  metadata?: Record<string, JSONValue>;
  filePath?: string;
  error?: Error | string;
}

/**
 * Log message severities supported by the streaming service.
 *
 * @remarks
 * These levels mirror the standard console semantics used across the engine
 * and can be leveraged to filter events when subscribing to the stream.
 *
 * @public
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/**
 * Lifecycle states tracked for a streaming run session.
 *
 * @remarks
 * Each session transitions through these states as execution progresses,
 * enabling dashboards and reporters to understand overall progress.
 *
 * @public
 */
export type LogStreamRunStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "completed";
/**
 * Snapshot describing a tracked execution session.
 *
 * @remarks
 * A descriptor aggregates metadata, timestamps, and the last known status for
 * a run. Consumers can display the descriptor directly or merge the metadata
 * into richer dashboards.
 *
 * @public
 */
export interface LogStreamRunDescriptor {
  id: string;
  label?: string;
  source?: string;
  status?: LogStreamRunStatus;
  metadata?: Record<string, any>;
  startedAt?: string;
  finishedAt?: string;
  lastUpdateAt?: string;
}
/**
 * Serialized representation of {@link LogStreamContext} suitable for event payloads.
 *
 * @remarks
 * Errors are converted into plain objects to avoid leaking prototype details
 * when events are delivered across process boundaries.
 *
 * @public
 */
export interface SerializedLogStreamContext
  extends Omit<LogStreamContext, "error"> {
  error?: { message: string; stack?: string } | string;
  metadata?: Record<string, any>;
}
/**
 * Structured event emitted by the {@link LogStreamingService}.
 *
 * @remarks
 * Events contain the original log message plus contextual information about
 * the originating run. They can be buffered, replayed, or pushed to
 * subscribers in real time.
 *
 * @public
 */
export interface LogStreamEvent {
  id: string;
  sequence: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  runId?: string;
  run?: LogStreamRunDescriptor;
  origin?: string;
  context?: SerializedLogStreamContext;
  extra?: Record<string, any>;
}
/**
 * Payload accepted by {@link LogStreamingService.publish | publish()} when
 * sending an event to the stream.
 *
 * @public
 */
export interface PublishLogInput {
  level: LogLevel;
  message: string;
  context?: LogStreamContext;
  runId?: string;
  origin?: string;
  extra?: Record<string, any>;
}
/**
 * Criteria used to filter log stream subscriptions.
 *
 * @public
 */
export interface SubscribeOptions {
  runId?: string;
  levels?: LogLevel[];
}
/**
 * Parameters accepted by {@link LogStreamingService.getBufferedEvents | getBufferedEvents()}.
 *
 * @public
 */
export interface BufferQuery extends SubscribeOptions {
  limit?: number;
}
/**
 * Handle returned by {@link LogStreamingService.beginSession | beginSession()}.
 *
 * @remarks
 * The handle exposes utility callbacks to update or end the tracked run
 * without needing to call the service directly.
 *
 * @public
 */
export interface LogSessionHandle {
  runId: string;
  end: (status?: LogStreamRunStatus, extra?: Record<string, any>) => void;
  update: (patch: Partial<LogStreamRunDescriptor>) => void;
}
/**
 * Central hub that broadcasts structured log events to interested consumers.
 *
 * @remarks
 * The service maintains an in-memory buffer of recent events, tracks
 * execution sessions, and provides subscription hooks for real-time updates.
 *
 * @example Subscribe to all error messages
 * ```typescript
 * const service = LogStreamingService.getInstance();
 *
 * const unsubscribe = service.subscribe((event) => {
 *   console.error(`[${event.timestamp}] ${event.message}`);
 * }, { levels: ["error"] });
 *
 * // Later, stop listening
 * unsubscribe();
 * ```
 *
 * @public
 */
export class LogStreamingService {
  private static instance: LogStreamingService;
  private emitter = new EventEmitter();
  private buffer: LogStreamEvent[] = [];
  private bufferSize = 500;
  private sequence = 0;
  private runStack: string[] = [];
  private runMetadata: Map<string, LogStreamRunDescriptor> = new Map();

  private constructor() {
    this.emitter.setMaxListeners(0);
  }
  /**
   * Retrieves the singleton instance of the streaming service.
   *
   * @returns The lazily created {@link LogStreamingService} instance.
   */
  static getInstance(): LogStreamingService {
    if (!LogStreamingService.instance) {
      LogStreamingService.instance = new LogStreamingService();
    }
    return LogStreamingService.instance;
  }
  /**
   * Creates or resumes a tracked run session.
   *
   * @param options - Optional metadata describing the run being tracked.
   * @returns A {@link LogSessionHandle} that can be used to update or finish the session.
   */
  beginSession(
    options: {
      runId?: string;
      label?: string;
      source?: string;
      metadata?: Record<string, any>;
      status?: LogStreamRunStatus;
    } = {}
  ): LogSessionHandle {
    const runId = options.runId ?? this.generateRunId();
    const descriptor = this.runMetadata.get(runId) || { id: runId };
    descriptor.label = options.label ?? descriptor.label;
    descriptor.source = options.source ?? descriptor.source;
    descriptor.metadata = this.mergeMetadata(
      descriptor.metadata,
      options.metadata
    );
    descriptor.status = options.status ?? "running";
    descriptor.startedAt = descriptor.startedAt ?? new Date().toISOString();
    descriptor.lastUpdateAt = new Date().toISOString();
    this.runMetadata.set(runId, descriptor);

    this.pushRunContext(runId);

    return {
      runId,
      end: (status?: LogStreamRunStatus, extra?: Record<string, any>) =>
        this.endSession(runId, status, extra),
      update: (patch: Partial<LogStreamRunDescriptor>) =>
        this.updateSession(runId, patch),
    };
  }
  /**
   * Marks a tracked run as finished and persists optional metadata.
   *
   * @param runId - Identifier of the run returned by {@link beginSession}.
   * @param status - Final status to apply. Defaults to {@link LogStreamRunStatus | completed}.
   * @param extra - Additional metadata to merge into the run descriptor.
   */
  endSession(
    runId: string,
    status: LogStreamRunStatus = "completed",
    extra?: Record<string, any>
  ): void {
    const descriptor = this.runMetadata.get(runId);
    const timestamp = new Date().toISOString();

    if (descriptor) {
      descriptor.status = status;
      descriptor.finishedAt = descriptor.finishedAt ?? timestamp;
      descriptor.lastUpdateAt = timestamp;

      if (extra) {
        descriptor.metadata = this.mergeMetadata(descriptor.metadata, extra);
      }
    }

    this.removeRunContext(runId);
  }
  /**
   * Applies partial updates to a previously registered run descriptor.
   *
   * @param runId - Identifier of the run to update.
   * @param patch - Set of changes to merge into the descriptor.
   */
  updateSession(runId: string, patch: Partial<LogStreamRunDescriptor>): void {
    const descriptor = this.runMetadata.get(runId);
    if (!descriptor) {
      return;
    }

    if (patch.metadata) {
      descriptor.metadata = this.mergeMetadata(
        descriptor.metadata,
        patch.metadata
      );
      delete patch.metadata;
    }

    Object.assign(descriptor, patch);
    descriptor.lastUpdateAt = new Date().toISOString();
  }
  /**
   * Streams a log entry to subscribers and stores it in the circular buffer.
   *
   * @param input - Details describing the log message and associated context.
   * @returns The fully constructed {@link LogStreamEvent} that was emitted.
   */
  publish(input: PublishLogInput): LogStreamEvent {
    const runId = input.runId ?? this.getActiveRunId();
    const timestamp = new Date().toISOString();
    const descriptor = runId ? this.runMetadata.get(runId) : undefined;

    const event: LogStreamEvent = {
      id: randomUUID(),
      sequence: ++this.sequence,
      timestamp,
      level: input.level,
      message: input.message,
      runId,
      origin: input.origin,
      run: descriptor ? this.cloneDescriptor(descriptor) : undefined,
      context: this.sanitizeContext(input.context),
      extra: input.extra ? this.cloneMetadata(input.extra) : undefined,
    };

    this.buffer.push(event);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    this.emitter.emit("log", event);
    return event;
  }
  /**
   * Subscribes to the live stream of log events.
   *
   * @param listener - Callback invoked for every matching event.
   * @param options - Optional filters for run identifier and severity levels.
   * @returns A cleanup function that unsubscribes the listener when invoked.
   */
  subscribe(
    listener: (event: LogStreamEvent) => void,
    options: SubscribeOptions = {}
  ): () => void {
    const handler = (event: LogStreamEvent) => {
      if (options.levels && !options.levels.includes(event.level)) {
        return;
      }

      if (options.runId && event.runId !== options.runId) {
        return;
      }

      listener(event);
    };

    this.emitter.on("log", handler);
    return () => this.emitter.off("log", handler);
  }
  /**
   * Returns buffered events that satisfy the provided filter criteria.
   *
   * @param options - Filter options such as run identifier, level, or limit.
   * @returns A snapshot of buffered {@link LogStreamEvent | events}.
   */
  getBufferedEvents(options: BufferQuery = {}): LogStreamEvent[] {
    const filtered = this.buffer.filter((event) => {
      if (options.levels && !options.levels.includes(event.level)) {
        return false;
      }
      if (options.runId && event.runId !== options.runId) {
        return false;
      }
      return true;
    });

    if (options.limit && options.limit > 0) {
      return filtered.slice(-options.limit);
    }

    return filtered.slice();
  }
  /**
   * Lists all known session descriptors ordered by their creation time.
   *
   * @returns An array of {@link LogStreamRunDescriptor} snapshots.
   */
  listSessions(): LogStreamRunDescriptor[] {
    return Array.from(this.runMetadata.values()).map((descriptor) =>
      this.cloneDescriptor(descriptor)
    );
  }
  /**
   * Resets the internal state of the service.
   *
   * @remarks
   * This helper is only intended for test suites and should not be used in
   * production code.
   *
   * @internal
   */
  reset(): void {
    this.buffer = [];
    this.runStack = [];
    this.runMetadata.clear();
    this.sequence = 0;
  }

  private pushRunContext(runId: string): void {
    this.removeRunContext(runId);
    this.runStack.push(runId);
  }

  private removeRunContext(runId: string): void {
    const index = this.runStack.lastIndexOf(runId);
    if (index >= 0) {
      this.runStack.splice(index, 1);
    }
  }

  private getActiveRunId(): string | undefined {
    if (this.runStack.length === 0) {
      return undefined;
    }
    return this.runStack[this.runStack.length - 1];
  }

  private sanitizeContext(
    context?: LogStreamContext
  ): SerializedLogStreamContext | undefined {
    if (!context) {
      return undefined;
    }

    const { metadata, error, ...rest } = context;
    const sanitized: SerializedLogStreamContext = { ...rest };

    if (metadata !== undefined) {
      sanitized.metadata = this.cloneMetadata(metadata);
    }

    if (error instanceof Error) {
      sanitized.error = {
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      sanitized.error = error;
    }

    return sanitized;
  }

  private mergeMetadata(
    current: Record<string, any> | undefined,
    incoming: Record<string, any> | undefined
  ): Record<string, any> | undefined {
    if (!incoming) {
      return current;
    }

    if (!current) {
      return this.cloneMetadata(incoming);
    }

    return {
      ...current,
      ...this.cloneMetadata(incoming),
    };
  }

  private cloneDescriptor(
    descriptor: LogStreamRunDescriptor
  ): LogStreamRunDescriptor {
    return {
      ...descriptor,
      metadata: this.cloneMetadata(descriptor.metadata),
    };
  }

  private cloneMetadata<T extends Record<string, any> | undefined>(
    metadata: T
  ): T {
    if (!metadata) {
      return metadata;
    }

    try {
      return JSON.parse(JSON.stringify(metadata));
    } catch {
      return metadata;
    }
  }

  private generateRunId(): string {
    return `run-${randomUUID()}`;
  }
}
