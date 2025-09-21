import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  TestSuite,
  TestStep,
  Assertions,
  AssertionChecks,
} from "../types/engine.types";

export interface PostmanCollection {
  info: {
    name: string;
    schema: string;
    description?: string;
  };
  item: PostmanItem[];
  auth?: any;
  event?: PostmanEvent[];
  variable?: Array<{ key: string; value: string; type?: string }>;
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  response?: any[];
  event?: PostmanEvent[];
}

export interface PostmanRequest {
  method: string;
  url: {
    raw: string;
    host?: string[];
    path?: string[];
    query?: Array<{ key: string; value: string }>;
  };
  header?: Array<{ key: string; value: string; disabled?: boolean }>;
  body?: {
    mode: string;
    raw?: string;
    options?: { raw?: { language?: string } };
  };
  auth?: any;
  description?: string;
}

export interface PostmanEvent {
  listen: "test" | "prerequest";
  script: {
    type: "text/javascript";
    exec: string[];
  };
}

export interface PostmanExportOptions {
  outputPath?: string;
  collectionName?: string;
  includeCapturesAs?: "environment" | "collection";
}

export interface PostmanExportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  outputFiles: string[];
}

export interface PostmanImportOptions {
  outputDir?: string;
  defaultPriority?: "low" | "medium" | "high" | "critical";
}

export interface PostmanImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  generatedSuites: number;
  outputFiles: string[];
}

export const POSTMAN_SCHEMA_URL =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

export class PostmanCollectionService {
  /**
   * Convert a Flow Test suite to a Postman collection representation.
   */
  convertSuiteToCollection(
    suite: TestSuite,
    options: PostmanExportOptions = {}
  ): PostmanCollection {
    const name = options.collectionName || suite.suite_name || suite.node_id;
    const items: PostmanItem[] = suite.steps.map((step, index) =>
      this.convertStepToItem(step, suite, index)
    );

    const collection: PostmanCollection = {
      info: {
        name,
        schema: POSTMAN_SCHEMA_URL,
        description: suite.description,
      },
      item: items,
    };

    return collection;
  }

  /**
   * Export a suite file or directory containing suites to Postman JSON collections.
   */
  async exportFromPath(
    inputPath: string,
    options: PostmanExportOptions = {}
  ): Promise<PostmanExportResult> {
    const result: PostmanExportResult = {
      success: false,
      errors: [],
      warnings: [],
      outputFiles: [],
    };

    try {
      const stats = fs.statSync(inputPath);

      if (stats.isDirectory()) {
        const files = fs
          .readdirSync(inputPath)
          .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));

        if (files.length === 0) {
          result.warnings.push("No YAML suites found to export");
          return result;
        }

        for (const file of files) {
          const fullPath = path.join(inputPath, file);
          const suite = this.loadSuite(fullPath);
          const collection = this.convertSuiteToCollection(suite, options);

          const outputFile = this.resolveOutputFile(
            fullPath,
            options.outputPath,
            "postman_collection.json"
          );

          this.writeCollection(outputFile, collection);
          result.outputFiles.push(outputFile);
        }
      } else {
        const suite = this.loadSuite(inputPath);
        const collection = this.convertSuiteToCollection(suite, options);
        const outputFile = this.resolveOutputFile(
          inputPath,
          options.outputPath,
          "postman_collection.json"
        );

        this.writeCollection(outputFile, collection);
        result.outputFiles.push(outputFile);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      return result;
    }
  }

  /**
   * Convert a suite file directly into a Postman collection object without writing to disk.
   */
  convertSuiteFileToCollection(
    suitePath: string,
    options: PostmanExportOptions = {}
  ): PostmanCollection {
    const suite = this.loadSuite(suitePath);
    return this.convertSuiteToCollection(suite, options);
  }

  /**
   * Convert a Postman collection representation into a Flow Test suite.
   */
  convertCollectionToSuite(
    collection: PostmanCollection,
    options: PostmanImportOptions = {}
  ): TestSuite {
    const suiteName = collection.info?.name || "postman-imported-suite";
    const nodeId = this.sanitizeNodeId(suiteName);

    const flattenedItems = this.flattenItems(collection.item);
    const steps = flattenedItems.map((item, index) =>
      this.convertItemToStep(item, index)
    );

    return {
      suite_name: suiteName,
      node_id: nodeId,
      description:
        collection.info?.description ||
        "Imported from Postman collection via Flow Test",
      metadata: {
        priority: options.defaultPriority || "medium",
        tags: ["imported", "postman"],
      },
      base_url: this.detectBaseUrl(flattenedItems) || "",
      variables: {},
      steps,
    };
  }

  /**
   * Import a Postman collection file and generate Flow Test YAML suites.
   */
  async importFromFile(
    collectionPath: string,
    options: PostmanImportOptions = {}
  ): Promise<PostmanImportResult> {
    const result: PostmanImportResult = {
      success: false,
      errors: [],
      warnings: [],
      generatedSuites: 0,
      outputFiles: [],
    };

    try {
      if (!fs.existsSync(collectionPath)) {
        throw new Error(`Collection file not found: ${collectionPath}`);
      }

      const raw = fs.readFileSync(collectionPath, "utf-8");
      const parsed = JSON.parse(raw) as PostmanCollection;

      const suite = this.convertCollectionToSuite(parsed, options);
      const outputDir = options.outputDir || path.dirname(collectionPath);
      const fileName = `${this.sanitizeNodeId(suite.suite_name)}.yaml`;
      const outputPath = path.join(outputDir, fileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const yamlContent = yaml.dump(suite, {
        indent: 2,
        noRefs: true,
        lineWidth: 120,
      });

      fs.writeFileSync(outputPath, yamlContent, "utf-8");
      result.generatedSuites = 1;
      result.outputFiles.push(outputPath);
      result.success = true;
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      return result;
    }
  }

  private convertStepToItem(
    step: TestStep,
    suite: TestSuite,
    index: number
  ): PostmanItem {
    const request: PostmanRequest = {
      method: step.request.method,
      url: this.buildPostmanUrl(step, suite),
      header: this.convertHeaders(step.request.headers),
      body: this.convertBody(step.request.body),
    };

    const scriptLines = this.buildScriptFromStep(step);

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

  private buildScriptFromStep(step: TestStep): string[] {
    const lines: string[] = [];
    let usesResponseJson = false;

    const assertionScript = this.generateAssertionScript(step.assert);
    if (assertionScript.lines.length > 0) {
      lines.push(...assertionScript.lines);
      usesResponseJson = usesResponseJson || assertionScript.usesResponseJson;
    }

    const captureScript = this.generateCaptureScript(step.capture);
    if (captureScript.lines.length > 0) {
      lines.push(...captureScript.lines);
      usesResponseJson = usesResponseJson || captureScript.usesResponseJson;
    }

    if (usesResponseJson && lines.length > 0) {
      lines.unshift("const responseJson = pm.response.json();");
    }

    return lines;
  }

  private generateAssertionScript(assert?: Assertions): {
    lines: string[];
    usesResponseJson: boolean;
  } {
    if (!assert) {
      return { lines: [], usesResponseJson: false };
    }

    const lines: string[] = [];
    let usesResponseJson = false;

    if (typeof assert.status_code === "number") {
      lines.push(
        `pm.test("Status code is ${assert.status_code}", function () {`
      );
      lines.push(
        `  pm.expect(pm.response.code).to.eql(${assert.status_code});`
      );
      lines.push("});");
    }

    if (assert.body) {
      const collected = this.collectBodyAssertions(assert.body);
      for (const { path, check } of collected) {
        if (check && typeof check === "object" && "equals" in check) {
          const expected = JSON.stringify((check as any).equals);
          const jsExpr = this.bodyPathToJs(path);
          lines.push(
            `pm.test("Body field ${path} equals ${expected}", function () {`
          );
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

    for (const [key, value] of Object.entries(assert as Record<string, any>)) {
      if (reservedKeys.has(key)) {
        continue;
      }
      if (this.isAssertionCheck(value) && value.equals !== undefined) {
        const expected = JSON.stringify(value.equals);
        const jsExpr = this.bodyPathToJs(key);
        lines.push(
          `pm.test("Body field ${key} equals ${expected}", function () {`
        );
        lines.push(`  pm.expect(${jsExpr}).to.eql(${expected});`);
        lines.push("});");
        usesResponseJson = true;
      }
    }

    return { lines, usesResponseJson };
  }

  private generateCaptureScript(
    capture?: Record<string, any>
  ): { lines: string[]; usesResponseJson: boolean } {
    if (!capture || Object.keys(capture).length === 0) {
      return { lines: [], usesResponseJson: false };
    }

    const lines: string[] = [];
    let usesResponseJson = false;

    for (const [name, expression] of Object.entries(capture)) {
      const jsExpr = this.captureExpressionToJs(expression);
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

  private collectBodyAssertions(
    body: Record<string, any>,
    path: string[] = []
  ): Array<{ path: string; check: AssertionChecks }> {
    const result: Array<{ path: string; check: AssertionChecks }> = [];

    for (const [key, value] of Object.entries(body)) {
      const nextPath = [...path, key];

      if (this.isAssertionCheck(value)) {
        result.push({ path: nextPath.join("."), check: value });
      } else if (value && typeof value === "object") {
        result.push(...this.collectBodyAssertions(value, nextPath));
      }
    }

    return result;
  }

  private isAssertionCheck(value: any): value is AssertionChecks {
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

    return knownKeys.some((key) => key in value);
  }

  private convertHeaders(
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

  private convertBody(body: any): PostmanRequest["body"] | undefined {
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

  private captureExpressionToJs(expression: any): string | undefined {
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
      return this.bodyPathToJs(trimmed);
    }

    if (trimmed === "status_code") {
      return "pm.response.code";
    }

    if (trimmed.startsWith("headers.")) {
      const headerName = trimmed.slice("headers.".length);
      return `pm.response.headers.get("${headerName}")`;
    }

    if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
      const variable = trimmed.slice(2, -2).trim();
      return `pm.variables.replace("{{${variable}}}")`;
    }

    if (trimmed.startsWith("{{js:")) {
      return undefined;
    }

    if (!Number.isNaN(Number(trimmed))) {
      return trimmed;
    }

    return JSON.stringify(trimmed);
  }

  private bodyPathToJs(pathKey: string): string {
    const sanitized = pathKey.replace(/^body\.?/, "");
    const parts = sanitized ? sanitized.split(".") : [];
    const chain: string[] = ["responseJson"];

    for (const part of parts) {
      if (!part) {
        continue;
      }

      const arrayMatch = part.match(/([a-zA-Z0-9_\-]+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, prop, index] = arrayMatch;
        chain.push(`?.${prop}`);
        chain.push(`?.[${index}]`);
      } else {
        chain.push(`?.${part}`);
      }
    }

    return chain.join("");
  }

  private buildPostmanUrl(step: TestStep, suite: TestSuite): PostmanRequest["url"] {
    const raw = this.combineUrl(suite.base_url || "", step.request.url);
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

  private combineUrl(base: string, relative: string): string {
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

  private loadSuite(filePath: string): TestSuite {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Suite file not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(raw) as TestSuite;

    if (!data || !data.steps) {
      throw new Error(`Invalid suite structure in ${filePath}`);
    }

    return data;
  }

  private resolveOutputFile(
    inputPath: string,
    desiredOutput?: string,
    suffix: string = "postman_collection.json"
  ): string {
    if (desiredOutput) {
      const desiredStats = fs.existsSync(desiredOutput)
        ? fs.statSync(desiredOutput)
        : undefined;

      if (desiredStats?.isDirectory()) {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        return path.join(desiredOutput, `${baseName}.${suffix}`);
      }

      if (desiredOutput.endsWith(".json")) {
        return desiredOutput;
      }

      return `${desiredOutput}.${suffix}`;
    }

    const dir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${baseName}.${suffix}`);
  }

  private writeCollection(filePath: string, collection: PostmanCollection) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(collection, null, 2),
      "utf-8"
    );
  }

  private sanitizeNodeId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private flattenItems(items: PostmanItem[]): PostmanItem[] {
    const result: PostmanItem[] = [];

    for (const item of items || []) {
      if (item.item && item.item.length > 0) {
        result.push(...this.flattenItems(item.item));
      } else {
        result.push(item);
      }
    }

    return result;
  }

  private convertItemToStep(item: PostmanItem, index: number): TestStep {
    const request = item.request;
    if (!request) {
      throw new Error(`Postman item missing request payload at index ${index}`);
    }

    const urlInfo = request.url || { raw: "" };
    const headers = this.parseHeaders(request.header || []);
    const body = this.parseBody(request.body);

    const { assertions, captures } = this.parseEvents(item.event || []);

    const step: TestStep = {
      name: item.name || `Step ${index + 1}`,
      request: {
        method: (request.method || "GET") as TestStep["request"]["method"],
        url: this.extractRelativeUrl(urlInfo),
        headers: headers,
        body,
        params: this.parseParams(urlInfo.query),
      },
    };

    if (Object.keys(assertions).length > 0) {
      step.assert = assertions;
    }

    if (Object.keys(captures).length > 0) {
      step.capture = captures;
    }

    return step;
  }

  private parseHeaders(
    headers: Array<{ key: string; value: string; disabled?: boolean }>
  ): Record<string, string> | undefined {
    const result: Record<string, string> = {};

    for (const header of headers) {
      if (header.disabled) {
        continue;
      }

      if (header.key) {
        result[header.key] = header.value;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private parseBody(body?: PostmanRequest["body"]): any {
    if (!body) {
      return undefined;
    }

    if (body.mode === "raw" && body.raw) {
      try {
        return JSON.parse(body.raw);
      } catch (error) {
        return body.raw;
      }
    }

    return undefined;
  }

  private parseParams(
    params?: Array<{ key: string; value: string }>
  ): Record<string, any> | undefined {
    if (!params || params.length === 0) {
      return undefined;
    }

    const result: Record<string, any> = {};
    for (const param of params) {
      result[param.key] = param.value;
    }

    return result;
  }

  private parseEvents(events: PostmanEvent[]): {
    assertions: Assertions;
    captures: Record<string, string>;
  } {
    const assertions: Assertions = {};
    const captures: Record<string, string> = {};
    const responseAliases = new Set<string>();

    for (const event of events) {
      if (event.listen !== "test" || !event.script?.exec) {
        continue;
      }

      const lines = event.script.exec.map((line) => line.trim());
      for (const line of lines) {
        const aliasMatch = line.match(
          /^(?:const|let|var)\s+(\w+)\s*=\s*pm\.response\.json\(\)/
        );
        if (aliasMatch) {
          responseAliases.add(aliasMatch[1]);
          continue;
        }

        const statusMatch = line.match(
          /pm\.expect\(pm\.response\.code\)\.to\.(?:be\.)?(?:eql|equal|equals)\((\d+)\)/
        );
        if (statusMatch) {
          assertions.status_code = Number(statusMatch[1]);
          continue;
        }

        const envMatch = line.match(
          /pm\.(?:environment|collection)\.set\(\"([^\"]+)\",\s*(.+)\)/
        );
        if (envMatch) {
          const [, name, expr] = envMatch;
          const converted = this.postmanExpressionToCapture(
            expr,
            responseAliases
          );
          if (converted) {
            captures[name] = converted;
          }
        }
      }
    }

    return { assertions, captures };
  }

  private postmanExpressionToCapture(
    expr: string,
    responseAliases: Set<string>
  ): string | undefined {
    const cleaned = expr.replace(/;$/, "").trim();

    if (cleaned.startsWith("pm.response.headers.get")) {
      const headerMatch = cleaned.match(/get\(\"([^\"]+)\"\)/);
      if (headerMatch) {
        return `headers.${headerMatch[1]}`;
      }
    }

    for (const alias of responseAliases) {
      if (cleaned.startsWith(`${alias}.`)) {
        return `body.${cleaned.slice(alias.length + 1)}`;
      }
    }

    if (cleaned.startsWith("pm.response.json()")) {
      return `body.${cleaned.slice("pm.response.json().".length)}`;
    }

    if (/^\d+$/.test(cleaned)) {
      return Number(cleaned).toString();
    }

    if (cleaned.startsWith("\"") && cleaned.endsWith("\"")) {
      return cleaned;
    }

    if (cleaned.startsWith("'")) {
      return `"${cleaned.slice(1, -1)}"`;
    }

    if (cleaned.startsWith("{{") && cleaned.endsWith("}}")) {
      return cleaned;
    }

    return cleaned;
  }

  private detectBaseUrl(items: PostmanItem[]): string | undefined {
    for (const item of items) {
      const raw = item.request?.url?.raw;
      if (raw) {
        const match = raw.match(/^(https?:\/\/[^\/]+)\//);
        if (match) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  private extractRelativeUrl(urlInfo: PostmanRequest["url"]): string {
    if (!urlInfo) {
      return "";
    }

    if (urlInfo.raw && urlInfo.raw.startsWith("http")) {
      try {
        const parsed = new URL(urlInfo.raw);
        const path = parsed.pathname || "";
        return path === "/" ? "" : path;
      } catch (error) {
        return urlInfo.raw;
      }
    }

    if (urlInfo.path && urlInfo.path.length > 0) {
      return `/${urlInfo.path.join("/")}`.replace(/\/+/, "/");
    }

    return urlInfo.raw || "";
  }
}
