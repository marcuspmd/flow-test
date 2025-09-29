import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  TestSuite,
  TestStep,
  Assertions,
  AssertionChecks,
} from "../types/engine.types";
import {
  AggregatedResult,
  SuiteExecutionResult,
  StepExecutionResult,
} from "../types/config.types";

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
  preserveFolderStructure?: boolean; // If true, creates multiple files based on folder structure
  analyzeDependencies?: boolean; // If true, analyzes and adds 'depends' directives
}

export interface PostmanImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  generatedSuites: number;
  outputFiles: string[];
  dependenciesFound?: VariableDependency[];
  folderStructure?: string; // Visual tree representation
}

interface VariableDependency {
  variableName: string;
  capturedBy: string; // file path where it's captured
  usedBy: string[]; // file paths where it's used
}

interface ProcessedFolder {
  name: string;
  path: string; // relative path from output dir
  items: PostmanItem[];
  suite?: TestSuite;
  capturedVariables: Set<string>;
  usedVariables: Set<string>;
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

      const outputDir = options.outputDir || path.dirname(collectionPath);

      // Check if we should preserve folder structure
      if (options.preserveFolderStructure) {
        return await this.importWithFolderStructure(
          parsed,
          outputDir,
          options,
          result
        );
      }

      // Original behavior: single file import
      const suite = this.convertCollectionToSuite(parsed, options);
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

  /**
   * Import with folder structure preservation, creating multiple YAML files.
   */
  private async importWithFolderStructure(
    collection: PostmanCollection,
    outputDir: string,
    options: PostmanImportOptions,
    result: PostmanImportResult
  ): Promise<PostmanImportResult> {
    // Process the folder structure recursively
    const folders: ProcessedFolder[] = [];
    this.processFolders(collection.item, [], folders);

    // If no folders, warn and fallback to single file
    if (folders.length === 0) {
      result.warnings.push("No folders found in collection, generating single file");
      const suite = this.convertCollectionToSuite(collection, options);
      const fileName = `${this.sanitizeNodeId(suite.suite_name)}.yaml`;
      const outputPath = path.join(outputDir, fileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, yaml.dump(suite, { indent: 2, noRefs: true, lineWidth: 120 }), "utf-8");
      result.outputFiles.push(outputPath);
      result.generatedSuites = 1;
      result.success = true;
      return result;
    }

    // Extract global variables used across multiple folders
    const globalVariables = this.extractGlobalVariables(folders);

    // Convert each folder to a suite
    for (const folder of folders) {
      folder.suite = this.convertFolderToSuite(folder, collection, options, globalVariables);
    }

    // Analyze dependencies if requested
    if (options.analyzeDependencies) {
      const dependencies = this.analyzeDependencies(folders);
      this.addDependenciesToSuites(folders, dependencies);
      result.dependenciesFound = dependencies;
    }

    // Write all suites to disk
    for (const folder of folders) {
      if (!folder.suite) continue;

      const folderPath = path.join(outputDir, folder.path);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileName = `${this.sanitizeNodeId(folder.name)}.yaml`;
      const outputPath = path.join(folderPath, fileName);

      const yamlContent = yaml.dump(folder.suite, {
        indent: 2,
        noRefs: true,
        lineWidth: 120,
      });

      fs.writeFileSync(outputPath, yamlContent, "utf-8");
      result.outputFiles.push(outputPath);
      result.generatedSuites++;
    }

    // Generate folder structure tree
    result.folderStructure = this.generateFolderTree(folders);
    result.success = true;
    return result;
  }

  private convertStepToItem(
    step: TestStep,
    suite: TestSuite,
    index: number
  ): PostmanItem {
    // Skip steps without requests (input-only steps)
    if (!step.request) {
      throw new Error(`Cannot convert step '${step.name}' to Postman: step has no request configuration`);
    }

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
    if (!step.request) {
      throw new Error(`Cannot build URL for step '${step.name}': step has no request configuration`);
    }

    const raw = this.combineUrl(suite.base_url || "", step.request.url);
    const url: PostmanRequest["url"] = {
      raw,
    };

    if (step.request?.params && Object.keys(step.request.params).length > 0) {
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
        method: (request.method || "GET") as NonNullable<TestStep["request"]>["method"],
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

  /**
   * Export a Postman collection from execution results (results/latest.json).
   * This uses real, processed data from test execution instead of raw YAML templates.
   */
  async exportFromExecutionResults(
    resultsPath: string,
    options: PostmanExportOptions = {}
  ): Promise<PostmanExportResult> {
    const result: PostmanExportResult = {
      success: false,
      errors: [],
      warnings: [],
      outputFiles: [],
    };

    try {
      if (!fs.existsSync(resultsPath)) {
        throw new Error(`Results file not found: ${resultsPath}`);
      }

      const raw = fs.readFileSync(resultsPath, "utf-8");
      const executionResults = JSON.parse(raw) as AggregatedResult;

      // Process each suite in the execution results
      for (const suiteResult of executionResults.suites_results) {
        const collection = this.convertExecutionResultToCollection(suiteResult, executionResults, options);

        const outputFile = this.resolveOutputFile(
          resultsPath,
          options.outputPath,
          `${suiteResult.node_id}.postman_collection.json`
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
   * Convert execution result data to a Postman collection with real, processed values.
   */
  private convertExecutionResultToCollection(
    suiteResult: SuiteExecutionResult,
    _aggregatedResult: AggregatedResult,
    options: PostmanExportOptions = {}
  ): PostmanCollection {
    const collectionName = options.collectionName || suiteResult.suite_name;
    const items: PostmanItem[] = [];

    // Convert each executed step to a Postman item
    for (const stepResult of suiteResult.steps_results) {
      if (stepResult.request_details && stepResult.response_details) {
        const item = this.convertStepResultToItem(stepResult);
        items.push(item);
      }
    }

    const collection: PostmanCollection = {
      info: {
        name: collectionName,
        schema: POSTMAN_SCHEMA_URL,
        description: `Exported from execution results: ${suiteResult.file_path}\nExecuted at: ${suiteResult.start_time}`,
      },
      item: items,
    };

    const suiteVariables = this.collectVariablesForCollection(suiteResult);
    if (suiteVariables.length > 0) {
      collection.variable = suiteVariables.map(([key, value]) => ({
        key,
        value: value,
        type: "default",
      }));
    }

    return collection;
  }

  private collectVariablesForCollection(
    suiteResult: SuiteExecutionResult
  ): Array<[string, string]> {
    const entries = new Map<string, string>();

    const addVariable = (key: string, value: unknown) => {
      if (!key) {
        return;
      }

      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === "object") {
        return;
      }

      entries.set(key, String(value));
    };

    if (suiteResult.variables_captured) {
      for (const [key, value] of Object.entries(
        suiteResult.variables_captured
      )) {
        addVariable(key, value);
      }
    }

    for (const step of suiteResult.steps_results || []) {
      if (!step.captured_variables) {
        continue;
      }

      for (const [key, value] of Object.entries(step.captured_variables)) {
        addVariable(key, value);
      }
    }

    return Array.from(entries.entries());
  }

  /**
   * Convert a step execution result to a Postman item with real request/response data.
   */
  private convertStepResultToItem(stepResult: StepExecutionResult): PostmanItem {
    const { request_details, response_details, assertions_results } = stepResult;

    if (!request_details) {
      throw new Error(`Missing request details for step: ${stepResult.step_name}`);
    }

    // Build URL from full_url or construct from base + url
    const fullUrl = request_details.full_url || request_details.url;
    const url = this.parseUrlForPostman(fullUrl);

    // Convert headers, removing undefined values
    const headers = Object.entries(request_details.headers || {})
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        key,
        value: String(value),
        disabled: false,
      }));

    // Build request
    const request: PostmanRequest = {
      method: request_details.method,
      url,
      header: headers,
    };

    // Add body if present
    if (request_details.body) {
      if (typeof request_details.body === 'string') {
        request.body = {
          mode: 'raw',
          raw: request_details.body,
          options: {
            raw: {
              language: 'text'
            }
          }
        };
      } else {
        request.body = {
          mode: 'raw',
          raw: JSON.stringify(request_details.body, null, 2),
          options: {
            raw: {
              language: 'json'
            }
          }
        };
      }
    }

    // Generate test script from assertions
    const testScript = this.generateTestScriptFromAssertions(assertions_results || []);

    const item: PostmanItem = {
      name: stepResult.step_name,
      request,
    };

    if (testScript.length > 0) {
      item.event = [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: testScript,
          },
        },
      ];
    }

    return item;
  }

  /**
   * Parse URL for Postman format, handling query parameters properly.
   */
  private parseUrlForPostman(fullUrl: string): PostmanRequest['url'] {
    try {
      const urlObj = new URL(fullUrl);

      const query = Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
        key,
        value,
      }));

      return {
        raw: fullUrl,
        host: [urlObj.hostname],
        path: urlObj.pathname.split('/').filter(Boolean),
        query: query.length > 0 ? query : undefined,
      };
    } catch (error) {
      // Fallback for malformed URLs
      return {
        raw: fullUrl,
      };
    }
  }

  /**
   * Process folders recursively to extract folder structure.
   */
  private processFolders(
    items: PostmanItem[],
    currentPath: string[],
    result: ProcessedFolder[]
  ): void {
    for (const item of items) {
      // If item has sub-items, it's a folder
      if (item.item && item.item.length > 0) {
        const hasRequests = item.item.some(subItem => subItem.request);
        const hasSubFolders = item.item.some(subItem => subItem.item && subItem.item.length > 0);

        // If this folder has requests, create a ProcessedFolder for it
        if (hasRequests) {
          const folderPath = [...currentPath, this.sanitizeNodeId(item.name)];
          const folder: ProcessedFolder = {
            name: item.name,
            path: folderPath.join(path.sep),
            items: item.item.filter(i => i.request),
            capturedVariables: new Set(),
            usedVariables: new Set(),
          };

          // Analyze variables in this folder
          this.analyzeVariablesInItems(folder.items, folder);
          result.push(folder);
        }

        // Recursively process sub-folders
        this.processFolders(item.item, [...currentPath, this.sanitizeNodeId(item.name)], result);
      }
    }
  }

  /**
   * Analyze variables captured and used in a set of items.
   */
  private analyzeVariablesInItems(items: PostmanItem[], folder: ProcessedFolder): void {
    for (const item of items) {
      if (!item.request) continue;

      // Check for captured variables in test scripts
      if (item.event) {
        for (const event of item.event) {
          if (event.listen === "test" && event.script?.exec) {
            for (const line of event.script.exec) {
              // Match pm.environment.set("VAR_NAME", ...)
              const captureMatch = line.match(/pm\.(?:environment|collection)\.set\s*\(\s*["']([^"']+)["']/);
              if (captureMatch) {
                folder.capturedVariables.add(captureMatch[1]);
              }
            }
          }
        }
      }

      // Check for used variables in URL
      const urlRaw = item.request.url?.raw || "";
      const urlVars = urlRaw.match(/\{\{([^}]+)\}\}/g);
      if (urlVars) {
        urlVars.forEach(v => folder.usedVariables.add(v.replace(/[{}]/g, "")));
      }

      // Check for used variables in body
      if (item.request.body?.raw) {
        const bodyVars = item.request.body.raw.match(/\{\{([^}]+)\}\}/g);
        if (bodyVars) {
          bodyVars.forEach(v => folder.usedVariables.add(v.replace(/[{}]/g, "")));
        }
      }

      // Check for used variables in headers
      if (item.request.header) {
        for (const header of item.request.header) {
          const headerVars = header.value.match(/\{\{([^}]+)\}\}/g);
          if (headerVars) {
            headerVars.forEach(v => folder.usedVariables.add(v.replace(/[{}]/g, "")));
          }
        }
      }
    }
  }

  /**
   * Extract global variables used across multiple folders.
   */
  private extractGlobalVariables(folders: ProcessedFolder[]): Set<string> {
    const variableUsageCount = new Map<string, number>();

    // Count usage of each variable
    for (const folder of folders) {
      for (const variable of folder.usedVariables) {
        variableUsageCount.set(variable, (variableUsageCount.get(variable) || 0) + 1);
      }
    }

    // Variables used in 2+ folders are considered global
    const globalVars = new Set<string>();
    for (const [variable, count] of variableUsageCount.entries()) {
      if (count >= 2) {
        globalVars.add(variable);
      }
    }

    return globalVars;
  }

  /**
   * Convert a folder to a TestSuite.
   */
  private convertFolderToSuite(
    folder: ProcessedFolder,
    collection: PostmanCollection,
    options: PostmanImportOptions,
    globalVariables: Set<string>
  ): TestSuite {
    const steps = folder.items.map((item, index) => this.convertItemToStep(item, index));

    // Filter used variables to only include globals
    const suiteVariables: Record<string, string> = {};
    for (const variable of folder.usedVariables) {
      if (globalVariables.has(variable)) {
        suiteVariables[variable] = `{{${variable}}}`; // Placeholder
      }
    }

    const suite: TestSuite = {
      suite_name: folder.name,
      node_id: this.sanitizeNodeId(folder.name),
      description: `Imported from Postman collection: ${collection.info?.name}`,
      metadata: {
        priority: options.defaultPriority || "medium",
        tags: ["imported", "postman", ...folder.path.split(path.sep)],
      },
      base_url: this.detectBaseUrl(folder.items) || "",
      variables: suiteVariables,
      steps,
    };

    return suite;
  }

  /**
   * Analyze dependencies between folders based on variable capture/usage.
   */
  private analyzeDependencies(folders: ProcessedFolder[]): VariableDependency[] {
    const dependencies: VariableDependency[] = [];

    // For each captured variable, find where it's used
    for (const folder of folders) {
      for (const capturedVar of folder.capturedVariables) {
        const usedBy: string[] = [];

        for (const otherFolder of folders) {
          if (otherFolder === folder) continue;
          if (otherFolder.usedVariables.has(capturedVar)) {
            usedBy.push(otherFolder.path);
          }
        }

        if (usedBy.length > 0) {
          dependencies.push({
            variableName: capturedVar,
            capturedBy: folder.path,
            usedBy,
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Add 'depends' directives to suites based on dependencies.
   */
  private addDependenciesToSuites(
    folders: ProcessedFolder[],
    dependencies: VariableDependency[]
  ): void {
    for (const folder of folders) {
      if (!folder.suite) continue;

      const dependsOn = new Set<string>();

      // Find which folders this folder depends on
      for (const dep of dependencies) {
        if (dep.usedBy.includes(folder.path)) {
          dependsOn.add(dep.capturedBy);
        }
      }

      if (dependsOn.size > 0) {
        // Add depends to suite metadata
        if (!folder.suite.metadata) {
          folder.suite.metadata = {};
        }

        // Convert paths to relative depends format
        const depends = Array.from(dependsOn).map(depPath => {
          // Convert "v1/admin/agreement" to "../agreement" relative path
          const folderParts = folder.path.split(path.sep);
          const depParts = depPath.split(path.sep);

          // Find common prefix
          let commonLength = 0;
          while (commonLength < folderParts.length &&
                 commonLength < depParts.length &&
                 folderParts[commonLength] === depParts[commonLength]) {
            commonLength++;
          }

          // Calculate relative path
          const upLevels = folderParts.length - commonLength;
          const downPath = depParts.slice(commonLength);

          const relativePath = [
            ...Array(upLevels).fill(".."),
            ...downPath,
            `${this.sanitizeNodeId(folders.find(f => f.path === depPath)?.name || "")}.yaml`
          ].join("/");

          return relativePath;
        });

        (folder.suite.metadata as any).depends = depends;
      }
    }
  }

  /**
   * Generate a visual tree representation of the folder structure.
   */
  private generateFolderTree(folders: ProcessedFolder[]): string {
    const lines: string[] = ["Generated folder structure:"];
    const sortedFolders = folders.sort((a, b) => a.path.localeCompare(b.path));

    for (const folder of sortedFolders) {
      const depth = folder.path.split(path.sep).length - 1;
      const indent = "  ".repeat(depth);
      const fileName = `${this.sanitizeNodeId(folder.name)}.yaml`;
      const varInfo = folder.capturedVariables.size > 0
        ? ` [captures: ${Array.from(folder.capturedVariables).join(", ")}]`
        : "";
      lines.push(`${indent}📁 ${folder.path}/${fileName}${varInfo}`);
    }

    return lines.join("\n");
  }

  /**
   * Generate Postman test script from assertion results.
   */
  private generateTestScriptFromAssertions(assertions: any[]): string[] {
    const lines: string[] = [];

    for (const assertion of assertions) {
      if (assertion.passed) {
        // Generate positive test based on the assertion
        if (assertion.field === 'status_code') {
          lines.push(`pm.test("Status code is ${assertion.expected}", function () {`);
          lines.push(`    pm.response.to.have.status(${assertion.expected});`);
          lines.push(`});`);
          lines.push(``);
        } else if (assertion.field.startsWith('body.')) {
          const fieldPath = assertion.field.replace('body.', '');
          lines.push(`pm.test("${assertion.field} validation", function () {`);
          lines.push(`    const responseJson = pm.response.json();`);
          lines.push(`    pm.expect(responseJson).to.have.property('${fieldPath.split('.')[0]}');`);
          lines.push(`});`);
          lines.push(``);
        } else if (assertion.field.startsWith('custom.')) {
          const testName = assertion.field.replace('custom.', '');
          lines.push(`pm.test("${testName}", function () {`);
          lines.push(`    // Custom validation: ${assertion.message || 'OK'}`);
          lines.push(`    pm.expect(true).to.be.true; // This assertion passed in Flow Test`);
          lines.push(`});`);
          lines.push(``);
        }
      }
    }

    return lines;
  }
}
