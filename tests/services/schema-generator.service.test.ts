/**
 * @fileoverview Unit tests for SchemaGeneratorService.
 *
 * @remarks
 * Tests the schema generation service to ensure it produces valid,
 * complete schema catalogs for consumption by external tools.
 */

import { SchemaGeneratorService } from "../../src/services/schema-generator.service";
import { FlowTestSchema } from "../../src/types/schema.types";
import { readFileSync } from "fs";
import { join } from "path";

describe("SchemaGeneratorService", () => {
  let service: SchemaGeneratorService;
  let schema: FlowTestSchema;

  beforeEach(() => {
    service = new SchemaGeneratorService();
    schema = service.generateSchema();
  });

  describe("generateSchema", () => {
    it("should generate a valid schema object", () => {
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty("version");
      expect(schema).toHaveProperty("generatedAt");
      expect(schema).toHaveProperty("engine");
      expect(schema).toHaveProperty("structures");
      expect(schema).toHaveProperty("types");
      expect(schema).toHaveProperty("examples");
      expect(schema).toHaveProperty("interpolation");
      expect(schema).toHaveProperty("cli");
    });

    it("should include correct version from package.json", () => {
      const packageJson = JSON.parse(
        readFileSync(join(__dirname, "../../package.json"), "utf-8")
      );
      expect(schema.version).toBe(packageJson.version);
    });

    it("should include generatedAt timestamp in ISO format", () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(schema.generatedAt).toMatch(isoRegex);
    });

    it("should include engine metadata", () => {
      expect(schema.engine).toEqual({
        name: "Flow Test Engine",
        version: schema.version,
        description:
          "Declarative API testing framework with YAML-based test definitions",
      });
    });
  });

  describe("structures", () => {
    it("should include all core structures", () => {
      const expectedStructures = [
        "TestSuite",
        "TestStep",
        "RequestDetails",
        "Assertions",
        "AssertionChecks",
        "InputConfig",
        "IterationConfig",
        "ConditionalScenario",
        "StepCallConfig",
        "FlowDependency",
        "CertificateConfig",
        "HookAction",
      ];

      expectedStructures.forEach((structureName) => {
        expect(schema.structures).toHaveProperty(structureName);
      });
    });

    describe("TestSuite", () => {
      it("should have correct required fields", () => {
        const testSuite = schema.structures.TestSuite;
        expect(testSuite.required).toEqual(["node_id", "suite_name", "steps"]);
      });

      it("should have all essential properties", () => {
        const testSuite = schema.structures.TestSuite;
        const expectedProps = [
          "node_id",
          "suite_name",
          "description",
          "base_url",
          "execution_mode",
          "variables",
          "exports",
          "exports_optional",
          "depends",
          "steps",
          "metadata",
          "certificate",
        ];

        expectedProps.forEach((prop) => {
          expect(testSuite.properties).toHaveProperty(prop);
        });
      });

      it("should mark interpolable properties correctly", () => {
        const testSuite = schema.structures.TestSuite;
        expect(testSuite.properties.node_id.interpolable).toBe(false);
        expect(testSuite.properties.suite_name.interpolable).toBe(true);
        expect(testSuite.properties.base_url.interpolable).toBe(true);
      });
    });

    describe("TestStep", () => {
      it("should include all lifecycle hooks", () => {
        const testStep = schema.structures.TestStep;
        const hookProps = [
          "hooks_pre_request",
          "hooks_post_request",
          "hooks_pre_assertion",
          "hooks_post_assertion",
          "hooks_pre_capture",
          "hooks_post_capture",
          "hooks_pre_input",
          "hooks_post_input",
          "hooks_pre_iteration",
          "hooks_post_iteration",
        ];

        hookProps.forEach((prop) => {
          expect(testStep.properties).toHaveProperty(prop);
          expect(testStep.properties[prop].since).toBe("2.0");
        });
      });

      it("should have required name property", () => {
        const testStep = schema.structures.TestStep;
        expect(testStep.required).toContain("name");
      });
    });

    describe("RequestDetails", () => {
      it("should have correct HTTP methods in enum", () => {
        const requestDetails = schema.structures.RequestDetails;
        expect(requestDetails.properties.method.enum).toEqual([
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "HEAD",
          "OPTIONS",
        ]);
      });

      it("should mark method and url as required", () => {
        const requestDetails = schema.structures.RequestDetails;
        expect(requestDetails.required).toContain("method");
        expect(requestDetails.required).toContain("url");
      });
    });

    describe("AssertionChecks", () => {
      it("should include all assertion operators", () => {
        const checks = schema.structures.AssertionChecks;
        const operators = [
          "equals",
          "not_equals",
          "contains",
          "not_contains",
          "greater_than",
          "less_than",
          "greater_than_or_equal",
          "less_than_or_equal",
          "regex",
          "pattern",
          "exists",
          "not_exists",
          "type",
          "length",
          "minLength",
          "notEmpty",
          "in",
          "not_in",
        ];

        operators.forEach((op) => {
          expect(checks.properties).toHaveProperty(op);
        });
      });

      it("should have correct type enum values", () => {
        const checks = schema.structures.AssertionChecks;
        expect(checks.properties.type.enum).toEqual([
          "string",
          "number",
          "boolean",
          "array",
          "object",
          "null",
        ]);
      });
    });

    describe("InputConfig", () => {
      it("should have all input types", () => {
        const inputConfig = schema.structures.InputConfig;
        expect(inputConfig.properties.type.enum).toEqual([
          "text",
          "password",
          "number",
          "email",
          "url",
          "select",
          "multiselect",
          "confirm",
          "multiline",
        ]);
      });
    });

    describe("CertificateConfig", () => {
      it("should include TLS version options", () => {
        const certConfig = schema.structures.CertificateConfig;
        expect(certConfig.properties.min_version.enum).toEqual([
          "TLSv1",
          "TLSv1.1",
          "TLSv1.2",
          "TLSv1.3",
        ]);
        expect(certConfig.properties.max_version.enum).toEqual([
          "TLSv1",
          "TLSv1.1",
          "TLSv1.2",
          "TLSv1.3",
        ]);
      });

      it("should have verify property with default true", () => {
        const certConfig = schema.structures.CertificateConfig;
        expect(certConfig.properties.verify.default).toBe(true);
      });
    });

    describe("HookAction", () => {
      it("should have all hook action types", () => {
        const hookAction = schema.structures.HookAction;
        const actions = [
          "compute",
          "validate",
          "log",
          "metric",
          "script",
          "call",
          "wait",
        ];

        actions.forEach((action) => {
          expect(hookAction.properties).toHaveProperty(action);
        });
      });

      it("should be marked as v2.0 feature", () => {
        const hookAction = schema.structures.HookAction;
        expect(hookAction.since).toBe("2.0");
      });
    });
  });

  describe("types", () => {
    it("should include all type definitions", () => {
      const expectedTypes = [
        "HttpMethod",
        "PriorityLevel",
        "ExecutionMode",
        "InputType",
      ];

      expectedTypes.forEach((typeName) => {
        expect(schema.types).toHaveProperty(typeName);
      });
    });

    it("should have correct HttpMethod values", () => {
      const httpMethod = schema.types.HttpMethod;
      expect(httpMethod.kind).toBe("enum");
      expect(httpMethod.values).toHaveLength(7);
      expect(httpMethod.values?.map((v) => v.value)).toEqual([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "HEAD",
        "OPTIONS",
      ]);
    });

    it("should have correct PriorityLevel values", () => {
      const priorityLevel = schema.types.PriorityLevel;
      expect(priorityLevel.kind).toBe("enum");
      expect(priorityLevel.values?.map((v) => v.value)).toEqual([
        "critical",
        "high",
        "medium",
        "low",
      ]);
    });
  });

  describe("examples", () => {
    it("should include multiple examples", () => {
      expect(schema.examples).toBeInstanceOf(Array);
      expect(schema.examples.length).toBeGreaterThan(0);
    });

    it("should include basic authentication example", () => {
      const authExample = schema.examples.find(
        (ex) => ex.name === "Basic Authentication Flow"
      );
      expect(authExample).toBeDefined();
      expect(authExample?.category).toBe("authentication");
      expect(authExample?.complexity).toBe("basic");
      expect(authExample?.yaml).toContain("suite_name");
    });

    it("should include lifecycle hooks example", () => {
      const hooksExample = schema.examples.find(
        (ex) => ex.name === "Lifecycle Hooks"
      );
      expect(hooksExample).toBeDefined();
      expect(hooksExample?.features).toContain("hooks");
      expect(hooksExample?.yaml).toContain("hooks_pre_request");
    });

    it("all examples should have required fields", () => {
      schema.examples.forEach((example) => {
        expect(example).toHaveProperty("name");
        expect(example).toHaveProperty("description");
        expect(example).toHaveProperty("category");
        expect(example).toHaveProperty("yaml");
        expect(example).toHaveProperty("complexity");
      });
    });
  });

  describe("interpolation", () => {
    it("should include interpolation patterns", () => {
      expect(schema.interpolation.patterns).toBeInstanceOf(Array);
      expect(schema.interpolation.patterns.length).toBeGreaterThan(0);
    });

    it("should include all core interpolation patterns", () => {
      const patternNames = schema.interpolation.patterns.map((p) => p.name);
      expect(patternNames).toContain("Basic Variable");
      expect(patternNames).toContain("Environment Variable");
      expect(patternNames).toContain("Faker Data");
      expect(patternNames).toContain("JavaScript Expression");
    });

    it("should include Faker catalog", () => {
      expect(schema.interpolation.faker).toBeDefined();
      expect(schema.interpolation.faker?.categories).toBeInstanceOf(Array);

      const categoryNames = schema.interpolation.faker?.categories.map(
        (c) => c.name
      );
      expect(categoryNames).toContain("person");
      expect(categoryNames).toContain("internet");
      expect(categoryNames).toContain("string");
    });

    it("should include JavaScript helpers", () => {
      expect(schema.interpolation.javascript).toBeDefined();
      expect(schema.interpolation.javascript?.globals).toContain("Date");
      expect(schema.interpolation.javascript?.globals).toContain("Math");
      expect(schema.interpolation.javascript?.patterns).toBeInstanceOf(Array);
    });

    it("should include environment variable documentation", () => {
      expect(schema.interpolation.environment).toBeDefined();
      expect(schema.interpolation.environment?.prefix).toBe("FLOW_TEST_");
      expect(schema.interpolation.environment?.examples).toBeInstanceOf(Array);
    });
  });

  describe("cli", () => {
    it("should include CLI definition", () => {
      expect(schema.cli).toBeDefined();
      expect(schema.cli.command).toBe("flow-test");
    });

    it("should include all main flags", () => {
      const flagNames = schema.cli.flags.map((f) => f.name);
      expect(flagNames).toContain("--config");
      expect(flagNames).toContain("--verbose");
      expect(flagNames).toContain("--dry-run");
      expect(flagNames).toContain("--priority");
      expect(flagNames).toContain("--tags");
    });

    it("should include all subcommands", () => {
      expect(schema.cli.subcommands).toBeDefined();
      const subcommandNames = schema.cli.subcommands?.map((s) => s.name);
      expect(subcommandNames).toContain("schema");
      expect(subcommandNames).toContain("init");
    });

    it("schema subcommand should have correct definition", () => {
      const schemaCmd = schema.cli.subcommands?.find(
        (s) => s.name === "schema"
      );
      expect(schemaCmd).toBeDefined();
      expect(schemaCmd?.description).toContain("schema");
      expect(schemaCmd?.example).toContain("schema");
    });
  });

  describe("schema completeness", () => {
    it("should have no null or undefined in core structures", () => {
      Object.values(schema.structures).forEach((structure) => {
        expect(structure.name).toBeDefined();
        expect(structure.description).toBeDefined();
        expect(structure.properties).toBeDefined();
        expect(structure.required).toBeInstanceOf(Array);
      });
    });

    it("all properties should have required metadata", () => {
      Object.values(schema.structures).forEach((structure) => {
        Object.values(structure.properties).forEach((prop) => {
          expect(prop.name).toBeDefined();
          expect(prop.type).toBeDefined();
          expect(prop.description).toBeDefined();
          expect(typeof prop.required).toBe("boolean");
        });
      });
    });

    it("should be serializable to JSON", () => {
      expect(() => JSON.stringify(schema)).not.toThrow();
      const json = JSON.stringify(schema);
      expect(json.length).toBeGreaterThan(1000);
    });

    it("should be deserializable from JSON", () => {
      const json = JSON.stringify(schema);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(schema);
    });
  });

  describe("version tracking", () => {
    it("should increment generatedAt on each generation", async () => {
      const schema1 = service.generateSchema();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const schema2 = new SchemaGeneratorService().generateSchema();

      expect(schema1.generatedAt).not.toBe(schema2.generatedAt);
    });

    it("should maintain consistent version within same service instance", () => {
      const schema1 = service.generateSchema();
      const schema2 = service.generateSchema();
      expect(schema1.version).toBe(schema2.version);
    });
  });
});
