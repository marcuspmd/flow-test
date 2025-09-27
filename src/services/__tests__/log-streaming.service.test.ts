import { LogStreamingService, LogStreamEvent } from "../log-streaming.service";

describe("LogStreamingService", () => {
  let service: LogStreamingService;

  beforeEach(() => {
    service = LogStreamingService.getInstance();
    service.reset();
  });

  test("should publish events with sanitized context", () => {
    const events: LogStreamEvent[] = [];

    const unsubscribe = service.subscribe((event) => {
      events.push(event);
    });

    const session = service.beginSession({
      runId: "test-run",
      label: "Test Run",
      source: "unit-test",
    });

    const error = new Error("Boom");

    service.publish({
      level: "info",
      message: "Run started",
      context: {
        nodeId: "node-1",
        stepName: "Step A",
        duration: 42,
        metadata: { key: "value" },
        error,
      },
    });

    expect(events).toHaveLength(1);
    const [event] = events;

    expect(event.level).toBe("info");
    expect(event.runId).toBe("test-run");
    expect(event.context).toMatchObject({
      nodeId: "node-1",
      stepName: "Step A",
      duration: 42,
      metadata: { key: "value" },
    });
    expect(event.context?.error).toMatchObject({ message: "Boom" });

    session.end("success");
    unsubscribe();
  });

  test("should filter buffered events by run and level", () => {
    const first = service.beginSession({ runId: "run-A" });
    service.publish({ level: "info", message: "A-info" });
    service.publish({ level: "error", message: "A-error" });
    first.end("success");

    const second = service.beginSession({ runId: "run-B" });
    service.publish({ level: "debug", message: "B-debug" });
    second.end("success");

    const filtered = service.getBufferedEvents({
      runId: "run-A",
      levels: ["error"],
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].message).toBe("A-error");
  });

  test("should respect subscription filters", () => {
    const received: string[] = [];
    const session = service.beginSession({ runId: "filter-run" });

    const unsubscribe = service.subscribe(
      (event) => {
        received.push(event.message);
      },
      { runId: "filter-run", levels: ["error"] }
    );

    service.publish({ level: "info", message: "ignored" });
    service.publish({ level: "error", message: "captured" });

    expect(received).toEqual(["captured"]);

    session.end("success");
    unsubscribe();
  });

  test("should keep run metadata snapshot", () => {
    const session = service.beginSession({
      runId: "meta-run",
      label: "Metadata Run",
      source: "test",
      metadata: { initial: true },
    });

    service.updateSession("meta-run", {
      metadata: { updated: true },
    });

    session.end("success", {
      summary: { ok: true },
    });

    const runs = service.listSessions();
    const descriptor = runs.find((run) => run.id === "meta-run");

    expect(descriptor).toBeDefined();
    expect(descriptor?.status).toBe("success");
    expect(descriptor?.metadata).toMatchObject({
      initial: true,
      updated: true,
      summary: { ok: true },
    });
  });
});
