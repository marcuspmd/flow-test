import http from "http";
import { URL } from "url";
import path from "path";
import { FlowTestEngine } from "../core/engine";
import { EngineExecutionOptions, EngineHooks } from "../types/engine.types";
import {
  setupLogger,
  LoggerService,
  getLogger,
} from "../services/logger.service";
import { RealtimeReporter, LiveEvent } from "../services/realtime-reporter";
import { createConsoleHooks } from "../services/hook-factory";
import {
  LogStreamingService,
  LogStreamEvent,
  LogLevel,
} from "../services/log-streaming.service";

interface RunRequestBody {
  options?: EngineExecutionOptions;
  label?: string;
}

const PORT = parseInt(process.env.ORCHESTRATOR_PORT || "3333", 10);
const DEFAULT_LIVE_EVENTS_PATH = path.join("results", "live-events.jsonl");

const liveEventsEnvPath = process.env.LIVE_EVENTS_PATH;
const liveEventsPath = liveEventsEnvPath
  ? path.isAbsolute(liveEventsEnvPath)
    ? liveEventsEnvPath
    : path.join(process.cwd(), liveEventsEnvPath)
  : path.join(process.cwd(), DEFAULT_LIVE_EVENTS_PATH);

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

setupLogger("console", { verbosity: "simple" });
const logger = LoggerService.getInstance();
const reporter = new RealtimeReporter(liveEventsPath);
const logStream = LogStreamingService.getInstance();
let activeRunId: string | null = null;

async function startRun(
  options: EngineExecutionOptions = {},
  label?: string
): Promise<string> {
  if (activeRunId) {
    throw new Error("A test execution is already in progress");
  }

  const runId = reporter.beginRun({
    source: "orchestrator",
    label: label || options?.filters?.suite_names?.join(", ") || "orchestrator",
    options,
  });

  const logSession = logStream.beginSession({
    runId,
    source: "orchestrator",
    label: label || runId,
    metadata: {
      options,
    },
    status: "running",
  });

  const reporterHooks = reporter.createHooks(runId);
  const consoleHooks = createConsoleHooks(logger);
  const hooks = mergeHooks(consoleHooks, reporterHooks);

  activeRunId = runId;

  // Start execution asynchronously
  (async () => {
    let sessionStatus: "success" | "failed" | "completed" = "success";
    try {
      const engine = new FlowTestEngine(options, hooks);
      const result = await engine.run();
      sessionStatus = result.failed_tests > 0 ? "failed" : "success";
      logSession.update({
        metadata: {
          summary: {
            successRate: result.success_rate,
            failedTests: result.failed_tests,
            successfulTests: result.successful_tests,
            totalTests: result.total_tests,
          },
        },
      });
    } catch (error) {
      const err = error as Error;
      getLogger().error(`❌ Orchestrator run error: ${err.message}`, {
        error: err,
      });
      reporter.recordRunError(runId, err);
      sessionStatus = "failed";
      logSession.update({
        metadata: {
          error: {
            message: err.message,
            stack: err.stack,
          },
        },
      });
    } finally {
      logSession.end(sessionStatus);
      activeRunId = null;
    }
  })();

  return runId;
}

function mergeHooks(...hooks: Array<EngineHooks | undefined>): EngineHooks {
  const keys: (keyof EngineHooks)[] = [
    "onTestDiscovered",
    "onSuiteStart",
    "onSuiteEnd",
    "onStepStart",
    "onStepEnd",
    "onExecutionStart",
    "onExecutionEnd",
    "onError",
  ];

  const merged: EngineHooks = {};

  for (const key of keys) {
    const callbacks = hooks
      .filter(Boolean)
      .map((hook) => hook![key])
      .filter(
        (callback): callback is (...args: any[]) => any =>
          typeof callback === "function"
      );

    if (callbacks.length > 0) {
      (merged as any)[key] = async (...args: any[]) => {
        for (const callback of callbacks) {
          await callback(...args);
        }
      };
    }
  }

  return merged;
}

function parseLevelsParam(value: string | null): LogLevel[] | undefined {
  if (!value) {
    return undefined;
  }

  const levels = value
    .split(",")
    .map((level) => level.trim().toLowerCase())
    .filter((level): level is LogLevel =>
      LOG_LEVELS.includes(level as LogLevel)
    );

  return levels.length > 0 ? levels : undefined;
}

function handleCors(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

async function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    req
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => {
        if (chunks.length === 0) {
          resolve({});
          return;
        }

        try {
          const content = Buffer.concat(chunks).toString("utf8");
          resolve(JSON.parse(content));
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => reject(error));
  });
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  data: unknown
): void {
  handleCors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  handleCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host || `localhost:${PORT}`}`
  );

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      activeRunId,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/runs") {
    const runs = reporter.getRuns();
    sendJson(res, 200, { runs });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/runs/")) {
    const runId = url.pathname.split("/")[2];
    const run = reporter.getRun(runId);
    if (!run) {
      sendJson(res, 404, { error: "Run not found" });
      return;
    }
    sendJson(res, 200, run);
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write("\n");

    const sendEvent = (event: LiveEvent) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = reporter.subscribe(sendEvent);

    const activeRun = reporter.getActiveRun();
    if (activeRun) {
      activeRun.events.forEach(sendEvent);
    }

    req.on("close", () => {
      unsubscribe();
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/logs") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write("\n");

    const levels = parseLevelsParam(url.searchParams.get("levels"));
    const runIdFilter = url.searchParams.get("runId") || undefined;
    const limitParam = url.searchParams.get("limit");
    let backlogLimit = 200;
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        backlogLimit = parsedLimit;
      }
    }

    const sessions = logStream.listSessions();
    res.write("event: runs\n");
    res.write(`data: ${JSON.stringify({ sessions })}\n\n`);

    const writeLogEvent = (event: LogStreamEvent) => {
      res.write("event: log\n");
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const initialEvents = logStream.getBufferedEvents({
      levels,
      runId: runIdFilter,
      limit: backlogLimit,
    });

    initialEvents.forEach(writeLogEvent);

    const unsubscribe = logStream.subscribe(writeLogEvent, {
      levels,
      runId: runIdFilter,
    });

    const heartbeat = setInterval(() => {
      res.write("event: ping\n");
      res.write("data: {}\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return;
  }

  if (req.method === "POST" && url.pathname === "/run") {
    try {
      const body = (await parseJsonBody(req)) as RunRequestBody;
      const runId = await startRun(body.options || {}, body.label);
      sendJson(res, 202, { runId });
    } catch (error) {
      const err = error as Error;
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/runs/") &&
    url.pathname.endsWith("/retry")
  ) {
    const parts = url.pathname.split("/");
    const runId = parts[2];
    const previous = reporter.getRun(runId);
    if (!previous || !previous.options) {
      sendJson(res, 404, {
        error: "Original run not found or missing options",
      });
      return;
    }

    try {
      const newRunId = await startRun(previous.options, previous.label);
      sendJson(res, 202, { runId: newRunId });
    } catch (error) {
      const err = error as Error;
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  getLogger().info(
    `🌐 Flow Test orchestrator listening on http://localhost:${PORT} (live events: ${liveEventsPath})`
  );
});
