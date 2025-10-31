import { CLIArgumentParser } from "../cli-argument-parser.service";

describe("CLIArgumentParser", () => {
  let parser: CLIArgumentParser;

  beforeEach(() => {
    parser = new CLIArgumentParser();
  });

  describe("parse", () => {
    it("should parse init command", () => {
      const result = parser.parse(["init"]);
      expect(result.command).toBe("init");
      expect(result.showHelp).toBe(false);
    });

    it("should parse schema command with json format", () => {
      const result = parser.parse(["schema", "--format", "json"]);
      expect(result.command).toBe("schema");
      expect(result.schemaFormat).toBe("json");
    });

    it("should parse comprehensive option set", () => {
      const args = [
        "--config",
        "flow.yml",
        "--directory",
        "./tests",
        "--environment",
        "staging",
        "--verbose",
        "--priority",
        "critical,high",
        "--suite",
        "auth,checkout",
        "--node",
        "login,checkout",
        "--step",
        "step1,step2",
        "--tag",
        "smoke,regression",
        "--no-log",
        "--no-report",
        "--format",
        "json,html",
        "--dry-run",
        "--swagger-import",
        "api.yaml",
        "--swagger-output",
        "./imported",
        "--postman-export",
        "suite.yaml",
        "--postman-output",
        "postman.json",
        "--postman-export-from-results",
        "results.json",
        "--live-events",
        "live/events.log",
        "--runner-interactive-inputs",
        "--inline-yaml",
        "inline: true",
        "--inline-base",
        "./inline-base",
        "--inline-path",
        "inline/path.yaml",
        "--html-output",
        "html-dir",
        "--postman-import",
        "collection.json",
        "--postman-import-output",
        "import-dir",
        "--postman-preserve-folders",
        "--postman-analyze-deps",
        "-h",
        "-v",
        "tests/auth.yaml",
      ];

      const result = parser.parse(args);

      expect(result.configFile).toBe("flow.yml");
      expect(result.options.test_directory).toBe("./tests");
      expect(result.options.environment).toBe("staging");
      expect(result.options.verbosity).toBe("verbose");
      expect(result.options.filters).toMatchObject({
        priority: ["critical", "high"],
        suite_names: ["auth", "checkout"],
        node_ids: ["login", "checkout"],
        step_ids: ["step1", "step2"],
        tags: ["smoke", "regression"],
      });
      expect(result.options.logging).toEqual({ enabled: false });
      expect(result.disableReporting).toBe(true);
      expect(result.options.reporting?.formats).toEqual(
        expect.arrayContaining(["json", "html"])
      );
      expect(result.options.reporting?.formats?.length).toBe(2);
      expect(result.dryRun).toBe(true);
      expect(result.swaggerImport).toBe("api.yaml");
      expect(result.swaggerOutput).toBe("./imported");
      expect(result.postmanExport).toBe("suite.yaml");
      expect(result.postmanExportOutput).toBe("postman.json");
      expect(result.postmanExportFromResults).toBe("results.json");
      expect(result.liveEventsPath).toBe("live/events.log");
      expect(result.runnerInteractiveMode).toBe(true);
      expect(result.inlineYamlArg).toBe("inline: true");
      expect(result.inlineBaseDir).toBe("./inline-base");
      expect(result.inlineRelativePath).toBe("inline/path.yaml");
      expect(result.options.reporting?.html).toEqual({
        output_subdir: "html-dir",
      });
      expect(result.postmanImport).toBe("collection.json");
      expect(result.postmanImportOutput).toBe("import-dir");
      expect(result.postmanPreserveFolders).toBe(true);
      expect(result.postmanAnalyzeDeps).toBe(true);
      expect(result.showHelp).toBe(true);
      expect(result.showVersion).toBe(true);
      expect(result.testFile).toBe("tests/auth.yaml");
    });

    it("should support tag aliases and live-events default path", () => {
      const result = parser.parse([
        "--tags",
        "a,b",
        "--live-events",
        "--simple",
        "--detailed",
        "--silent",
      ]);

      expect(result.options.filters?.tags).toEqual(["a", "b"]);
      expect(result.liveEventsPath).toBe("results/live-events.jsonl");
      expect(result.options.verbosity).toBe("silent");
    });

    it("should treat first non-flag as test file", () => {
      const result = parser.parse(["my-suite.yaml", "--simple"]);
      expect(result.testFile).toBe("my-suite.yaml");
    });
  });

  describe("validate", () => {
    it("should detect conflicting postman export and import", () => {
      const errors = parser.validate({
        options: {},
        showHelp: false,
        showVersion: false,
        dryRun: false,
        postmanPreserveFolders: false,
        postmanAnalyzeDeps: false,
        runnerInteractiveMode: false,
        disableReporting: false,
        postmanExport: "a",
        postmanImport: "b",
      } as any);
      expect(errors).toContain(
        "Cannot use --postman-export and --postman-import in the same command."
      );
    });

    it("should detect conflicting postman export-from-results usage", () => {
      const errors = parser.validate({
        options: {},
        showHelp: false,
        showVersion: false,
        dryRun: false,
        postmanPreserveFolders: false,
        postmanAnalyzeDeps: false,
        runnerInteractiveMode: false,
        disableReporting: false,
        postmanExportFromResults: "results.json",
        postmanExport: "suite.yaml",
      } as any);
      expect(errors).toContain(
        "Cannot use --postman-export-from-results with other postman export/import commands."
      );
    });

    it("should detect inline YAML conflicts", () => {
      const errors = parser.validate({
        options: {},
        showHelp: false,
        showVersion: false,
        dryRun: true,
        postmanPreserveFolders: false,
        postmanAnalyzeDeps: false,
        runnerInteractiveMode: false,
        disableReporting: false,
        inlineYamlArg: "yaml",
        postmanExport: "suite.yaml",
      } as any);
      expect(errors).toEqual([
        "Inline YAML execution does not support --dry-run mode.",
        "Inline YAML execution cannot be combined with Postman import/export commands.",
      ]);
    });

    it("should return no errors for valid configuration", () => {
      const errors = parser.validate({
        options: {},
        showHelp: false,
        showVersion: false,
        dryRun: false,
        postmanPreserveFolders: false,
        postmanAnalyzeDeps: false,
        runnerInteractiveMode: false,
        disableReporting: false,
      } as any);

      expect(errors).toHaveLength(0);
    });
  });
});
