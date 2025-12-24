#!/usr/bin/env node
/**
 * @fileoverview Simple HTTP test server for running YAML flow tests
 * 
 * This server provides a basic REST API that can be used to test the flow-test engine
 * without requiring external services. It mimics httpbin functionality.
 * 
 * @packageDocumentation
 */

import http from "http";
import { URL } from "url";

const PORT = parseInt(process.env.TEST_SERVER_PORT || "8080", 10);

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body?: any;
}

const requestLogs: RequestLog[] = [];

/**
 * Parse JSON body from request
 */
async function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    req
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }

        try {
          const content = Buffer.concat(chunks).toString("utf8");
          resolve(JSON.parse(content));
        } catch (error) {
          // If not valid JSON, return as string
          resolve(Buffer.concat(chunks).toString("utf8"));
        }
      })
      .on("error", (error) => reject(error));
  });
}

/**
 * Send JSON response
 */
function sendJson(
  res: http.ServerResponse,
  status: number,
  data: unknown
): void {
  res.writeHead(status, { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Handle CORS preflight
 */
function handleCors(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Custom-Header, X-Request-ID, X-Timestamp, User-Agent"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
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

  // Parse body for non-GET requests
  let body: any = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }
  }

  // Log the request
  requestLogs.push({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body,
  });

  // Keep only last 100 requests
  if (requestLogs.length > 100) {
    requestLogs.shift();
  }

  // Health check
  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
    return;
  }

  // Get request logs
  if (req.method === "GET" && url.pathname === "/logs") {
    sendJson(res, 200, {
      count: requestLogs.length,
      logs: requestLogs,
    });
    return;
  }

  // Clear request logs
  if (req.method === "DELETE" && url.pathname === "/logs") {
    const count = requestLogs.length;
    requestLogs.length = 0;
    sendJson(res, 200, {
      message: "Logs cleared",
      cleared: count,
    });
    return;
  }

  // Echo endpoint - returns request info (like httpbin)
  if (url.pathname === "/get" && req.method === "GET") {
    sendJson(res, 200, {
      args: Object.fromEntries(url.searchParams.entries()),
      headers: req.headers,
      origin: req.socket.remoteAddress,
      url: req.url,
    });
    return;
  }

  // POST echo endpoint
  if (url.pathname === "/post" && req.method === "POST") {
    sendJson(res, 200, {
      args: Object.fromEntries(url.searchParams.entries()),
      data: typeof body === "string" ? body : undefined,
      files: {},
      form: {},
      headers: req.headers,
      json: typeof body === "object" ? body : null,
      origin: req.socket.remoteAddress,
      url: req.url,
    });
    return;
  }

  // PUT echo endpoint
  if (url.pathname === "/put" && req.method === "PUT") {
    sendJson(res, 200, {
      args: Object.fromEntries(url.searchParams.entries()),
      data: typeof body === "string" ? body : undefined,
      files: {},
      form: {},
      headers: req.headers,
      json: typeof body === "object" ? body : null,
      origin: req.socket.remoteAddress,
      url: req.url,
    });
    return;
  }

  // PATCH echo endpoint
  if (url.pathname === "/patch" && req.method === "PATCH") {
    sendJson(res, 200, {
      args: Object.fromEntries(url.searchParams.entries()),
      data: typeof body === "string" ? body : undefined,
      files: {},
      form: {},
      headers: req.headers,
      json: typeof body === "object" ? body : null,
      origin: req.socket.remoteAddress,
      url: req.url,
    });
    return;
  }

  // DELETE echo endpoint
  if (url.pathname === "/delete" && req.method === "DELETE") {
    sendJson(res, 200, {
      args: Object.fromEntries(url.searchParams.entries()),
      data: typeof body === "string" ? body : undefined,
      files: {},
      form: {},
      headers: req.headers,
      json: typeof body === "object" ? body : null,
      origin: req.socket.remoteAddress,
      url: req.url,
    });
    return;
  }

  // Status code endpoint
  const statusMatch = url.pathname.match(/^\/status\/(\d+)$/);
  if (statusMatch) {
    const code = parseInt(statusMatch[1], 10);
    if (code >= 200 && code < 600) {
      sendJson(res, code, {
        code,
        message: http.STATUS_CODES[code] || "Unknown",
      });
      return;
    }
  }

  // Delay endpoint
  const delayMatch = url.pathname.match(/^\/delay\/(\d+)$/);
  if (delayMatch && req.method === "GET") {
    const delaySeconds = parseInt(delayMatch[1], 10);
    const delayMs = Math.min(delaySeconds * 1000, 10000); // Max 10 seconds
    
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    
    sendJson(res, 200, {
      args: Object.fromEntries(url.searchParams.entries()),
      headers: req.headers,
      origin: req.socket.remoteAddress,
      url: req.url,
      delay: delaySeconds,
    });
    return;
  }

  // Basic auth endpoint
  if (url.pathname === "/basic-auth") {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Basic ")) {
      res.writeHead(401, {
        "WWW-Authenticate": 'Basic realm="Test Server"',
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const credentials = Buffer.from(auth.slice(6), "base64").toString();
    const [username, password] = credentials.split(":");

    sendJson(res, 200, {
      authenticated: true,
      user: username,
    });
    return;
  }

  // Bearer auth endpoint
  if (url.pathname === "/bearer") {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.writeHead(401, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const token = auth.slice(7);

    sendJson(res, 200, {
      authenticated: true,
      token,
    });
    return;
  }

  // Response headers endpoint
  if (url.pathname === "/response-headers") {
    const customHeaders: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      customHeaders[key] = value;
    });

    res.writeHead(200, {
      ...customHeaders,
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        "Content-Type": "application/json",
        ...customHeaders,
      })
    );
    return;
  }

  // JSON response
  if (url.pathname === "/json") {
    sendJson(res, 200, {
      slideshow: {
        author: "Test Author",
        date: "2024-01-01",
        title: "Sample JSON Response",
        slides: [
          {
            title: "Wake up to Reality",
            type: "all",
          },
          {
            items: [
              "Nothing ever goes as planned in this world",
              "The longer you live, the more you realize",
              "That only pain, suffering and futility exist",
            ],
            title: "Overview",
            type: "all",
          },
        ],
      },
    });
    return;
  }

  // UUID endpoint
  if (url.pathname === "/uuid") {
    sendJson(res, 200, {
      uuid: crypto.randomUUID(),
    });
    return;
  }

  // User-agent endpoint
  if (url.pathname === "/user-agent") {
    sendJson(res, 200, {
      "user-agent": req.headers["user-agent"] || "",
    });
    return;
  }

  // Headers endpoint
  if (url.pathname === "/headers") {
    sendJson(res, 200, {
      headers: req.headers,
    });
    return;
  }

  // IP endpoint
  if (url.pathname === "/ip") {
    sendJson(res, 200, {
      origin: req.socket.remoteAddress,
    });
    return;
  }

  // Default 404
  sendJson(res, 404, {
    error: "Not found",
    path: url.pathname,
    message: "The requested endpoint does not exist",
    available_endpoints: [
      "/health",
      "/logs",
      "/get",
      "/post",
      "/put",
      "/patch",
      "/delete",
      "/status/:code",
      "/delay/:seconds",
      "/basic-auth",
      "/bearer",
      "/response-headers",
      "/json",
      "/uuid",
      "/user-agent",
      "/headers",
      "/ip",
    ],
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Flow Test Server - Simple HTTP Testing Server            ║
╚════════════════════════════════════════════════════════════╝

🌐 Server running on: http://localhost:${PORT}
📋 Available endpoints:
   
   GET  /health              - Health check
   GET  /logs                - View request logs
   DELETE /logs              - Clear request logs
   
   GET  /get                 - Echo GET request
   POST /post                - Echo POST request
   PUT  /put                 - Echo PUT request
   PATCH /patch              - Echo PATCH request
   DELETE /delete            - Echo DELETE request
   
   GET  /status/:code        - Return specific status code
   GET  /delay/:seconds      - Delayed response (max 10s)
   
   GET  /basic-auth          - Test Basic authentication
   GET  /bearer              - Test Bearer authentication
   
   GET  /response-headers    - Return custom headers
   GET  /json                - Sample JSON response
   GET  /uuid                - Generate UUID
   GET  /user-agent          - Echo user agent
   GET  /headers             - Echo all headers
   GET  /ip                  - Return client IP

✨ Ready for testing!
`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
