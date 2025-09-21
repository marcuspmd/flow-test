import { parse } from "yaml";
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
} from "../../../src/services/postman-collection.service";

const POSTMAN_SCHEMA_URL =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

type Primitive = string | number | boolean | null;

type AssertionChecks = {
  equals?: Primitive | Record<string, unknown> | unknown[];
  contains?: Primitive;
  not_equals?: Primitive;
  greater_than?: number;
  less_than?: number;
  regex?: string;
  exists?: boolean;
  type?: string;
  length?: number;
  [key: string]: unknown;
};

interface Assertions {
  status_code?: number;
  body?: Record<string, unknown>;
  headers?: Record<string, AssertionChecks>;
  response_time_ms?: AssertionChecks;
  custom?: Record<string, AssertionChecks>;
  [key: string]: unknown;
}

interface FlowTestStep {
  name?: string;
  request: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
  };
  assert?: Assertions;
  capture?: Record<string, unknown>;
}

interface FlowTestSuite {
  suite_name?: string;
  description?: string;
  base_url?: string;
  steps?: FlowTestStep[];
}

interface BuildCollectionParams {
  yamlContent: string;
  fallbackSuiteName: string;
  filePath: string;
}

export function buildPostmanCollectionFromSuiteYaml({
  yamlContent,
  fallbackSuiteName,
  filePath,
}: BuildCollectionParams): PostmanCollection | null {
  let parsedSuite: FlowTestSuite | null = null;

  try {
    parsedSuite = parse(yamlContent) as FlowTestSuite | null;
  } catch (error) {
    console.error("[Postman Export] Failed to parse suite YAML", error);
    return null;
  }

  if (!parsedSuite || !parsedSuite.steps || parsedSuite.steps.length === 0) {
    console.warn("[Postman Export] Suite YAML has no steps to export");
    return null;
  }

  return convertSuiteToCollection(parsedSuite, fallbackSuiteName, filePath);
}

function convertSuiteToCollection(
  suite: FlowTestSuite,
  fallbackSuiteName: string,
  filePath: string
): PostmanCollection {
  const name = suite.suite_name || fallbackSuiteName;
  const description = suite.description
    ? suite.description
    : `Exported from Flow Test suite: ${filePath}`;

  const items: PostmanItem[] = (suite.steps || []).map((step, index) =>
    convertStepToItem(step, suite, index)
  );

  return {
    info: {
      name,
      schema: POSTMAN_SCHEMA_URL,
      description,
    },
    item: items,
  };
}

function convertStepToItem(
  step: FlowTestStep,
  suite: FlowTestSuite,
  index: number
): PostmanItem {
  const request: PostmanRequest = {
    method: (step.request.method || "GET").toUpperCase(),
    url: buildPostmanUrl(step, suite),
    header: convertHeaders(step.request.headers),
    body: convertBody(step.request.body),
  };

  const scriptLines = buildScriptFromStep(step);

  const item: PostmanItem = {
    name: step.name || `Step ${index + 1}`,
    request,
  };

  if (scriptLines.length > 0) {
    item.event = [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: scriptLines,
        },
      },
    ];
  }

  return item;
}

function buildPostmanUrl(
  step: FlowTestStep,
  suite: FlowTestSuite
): PostmanRequest["url"] {
  const raw = combineUrl(suite.base_url || "", step.request.url || "");
  const url: PostmanRequest["url"] = {
    raw,
  };

  if (step.request.params && Object.keys(step.request.params).length > 0) {
    url.query = Object.entries(step.request.params).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  }

  return url;
}

function combineUrl(base: string, relative: string): string {
  if (!base) {
    return relative;
  }

  if (!relative) {
    return base;
  }

  if (relative.startsWith("http")) {
    return relative;
  }

  if (base.endsWith("/") && relative.startsWith("/")) {
    return `${base.slice(0, -1)}${relative}`;
  }

  if (!base.endsWith("/") && !relative.startsWith("/")) {
    return `${base}/${relative}`;
  }

  return `${base}${relative}`;
}

function convertHeaders(
  headers?: Record<string, string>
): Array<{ key: string; value: string }> | undefined {
  if (!headers || Object.keys(headers).length === 0) {
    return undefined;
  }

  return Object.entries(headers).map(([key, value]) => ({
    key,
    value,
  }));
}

function convertBody(body: unknown): PostmanRequest["body"] | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof body === "string") {
    return {
      mode: "raw",
      raw: body,
    };
  }

  return {
    mode: "raw",
    raw: JSON.stringify(body, null, 2),
    options: {
      raw: {
        language: "json",
      },
    },
  };
}

function buildScriptFromStep(step: FlowTestStep): string[] {
  const lines: string[] = [];
  let usesResponseJson = false;

  const assertionScript = generateAssertionScript(step.assert);
  if (assertionScript.lines.length > 0) {
    lines.push(...assertionScript.lines);
    usesResponseJson = usesResponseJson || assertionScript.usesResponseJson;
  }

  const captureScript = generateCaptureScript(step.capture);
  if (captureScript.lines.length > 0) {
    lines.push(...captureScript.lines);
    usesResponseJson = usesResponseJson || captureScript.usesResponseJson;
  }

  if (usesResponseJson && lines.length > 0) {
    lines.unshift("const responseJson = pm.response.json();");
  }

  return lines;
}

function generateAssertionScript(assert?: Assertions): {
  lines: string[];
  usesResponseJson: boolean;
} {
  if (!assert) {
    return { lines: [], usesResponseJson: false };
  }

  const lines: string[] = [];
  let usesResponseJson = false;

  if (typeof assert.status_code === "number") {
    lines.push(`pm.test("Status code is ${assert.status_code}", function () {`);
    lines.push(`  pm.expect(pm.response.code).to.eql(${assert.status_code});`);
    lines.push("});");
  }

  if (assert.body) {
    const collected = collectBodyAssertions(assert.body);
    for (const { path, check } of collected) {
      if (check && typeof check === "object" && "equals" in check) {
        const expected = JSON.stringify((check as any).equals);
        const jsExpr = bodyPathToJs(path);
        lines.push(`pm.test("Body field ${path} equals ${expected}", function () {`);
        lines.push(`  pm.expect(${jsExpr}).to.eql(${expected});`);
        lines.push("});");
        usesResponseJson = true;
      }
    }
  }

  const reservedKeys = new Set([
    "status_code",
    "body",
    "headers",
    "response_time_ms",
    "custom",
  ]);

  for (const [key, value] of Object.entries(assert as Record<string, unknown>)) {
    if (reservedKeys.has(key)) {
      continue;
    }
    if (isAssertionCheck(value) && value.equals !== undefined) {
      const expected = JSON.stringify(value.equals);
      const jsExpr = bodyPathToJs(key);
      lines.push(`pm.test("Body field ${key} equals ${expected}", function () {`);
      lines.push(`  pm.expect(${jsExpr}).to.eql(${expected});`);
      lines.push("});");
      usesResponseJson = true;
    }
  }

  return { lines, usesResponseJson };
}

function generateCaptureScript(
  capture?: Record<string, unknown>
): { lines: string[]; usesResponseJson: boolean } {
  if (!capture || Object.keys(capture).length === 0) {
    return { lines: [], usesResponseJson: false };
  }

  const lines: string[] = [];
  let usesResponseJson = false;

  for (const [name, expression] of Object.entries(capture)) {
    const jsExpr = captureExpressionToJs(expression);
    if (!jsExpr) {
      lines.push(`// TODO: Unable to convert capture for ${name}`);
      continue;
    }

    if (jsExpr.includes("responseJson")) {
      usesResponseJson = true;
    }

    lines.push(`pm.environment.set("${name}", ${jsExpr});`);
  }

  return { lines, usesResponseJson };
}

function collectBodyAssertions(
  body: Record<string, unknown>,
  path: string[] = []
): Array<{ path: string; check: AssertionChecks }> {
  const result: Array<{ path: string; check: AssertionChecks }> = [];

  for (const [key, value] of Object.entries(body)) {
    const nextPath = [...path, key];

    if (isAssertionCheck(value)) {
      result.push({ path: nextPath.join("."), check: value });
    } else if (value && typeof value === "object") {
      result.push(...collectBodyAssertions(value as Record<string, unknown>, nextPath));
    }
  }

  return result;
}

function isAssertionCheck(value: unknown): value is AssertionChecks {
  if (!value || typeof value !== "object") {
    return false;
  }

  const knownKeys = [
    "equals",
    "contains",
    "not_equals",
    "greater_than",
    "less_than",
    "regex",
    "exists",
    "type",
    "length",
  ];

  return knownKeys.some((key) => key in (value as Record<string, unknown>));
}

function bodyPathToJs(path: string): string {
  if (!path.startsWith("body")) {
    return `responseJson${path.startsWith(".") ? path : `.${path}`}`;
  }

  const parts = path.replace(/^body\.*/, "").split(".").filter(Boolean);
  if (parts.length === 0) {
    return "responseJson";
  }

  let expression = "responseJson";
  for (const part of parts) {
    const accessor = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(part)
      ? `.${part}`
      : `["${part}"]`;
    expression += accessor;
  }

  return expression;
}

function captureExpressionToJs(expression: unknown): string | undefined {
  if (expression === null || expression === undefined) {
    return "null";
  }

  if (typeof expression === "number" || typeof expression === "boolean") {
    return JSON.stringify(expression);
  }

  if (typeof expression !== "string") {
    return JSON.stringify(expression);
  }

  const trimmed = expression.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.stringify(trimmed.slice(1, -1));
  }

  if (trimmed.startsWith("body")) {
    return bodyPathToJs(trimmed);
  }

  if (trimmed === "status_code") {
    return "pm.response.code";
  }

  if (trimmed.startsWith("headers.")) {
    const headerName = trimmed.slice("headers.".length);
    return `pm.response.headers.get("${headerName}")`;
  }

  if (trimmed.startsWith("response_time")) {
    return "pm.response.responseTime";
  }

  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
    const variable = trimmed.slice(2, -2).trim();
    return `pm.variables.replace("{{${variable}}}")`;
  }

  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    const inner = trimmed.slice(1, -1);
    return "`" + escapeForTemplateLiteral(inner) + "`";
  }

  return trimmed;
}

function escapeForTemplateLiteral(value: string): string {
  return value.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export { POSTMAN_SCHEMA_URL };
