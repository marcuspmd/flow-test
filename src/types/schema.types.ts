/**
 * @fileoverview Type definitions for the Flow Test Engine Schema Catalog.
 *
 * @remarks
 * These types define the structure of the JSON schema exported by the
 * `flow-test schema --format=json` command. This schema is consumed by
 * the VS Code extension to provide autocomplete, hover documentation,
 * and validation for YAML test files.
 *
 * @packageDocumentation
 */

/**
 * Root schema structure exported by the Flow Test Engine.
 * Contains complete metadata about supported structures, types, and examples.
 */
export interface FlowTestSchema {
  /** Schema version - follows engine version from package.json */
  version: string;
  /** Timestamp when schema was generated (ISO 8601) */
  generatedAt: string;
  /** Engine metadata */
  engine: {
    name: string;
    version: string;
    description: string;
  };
  /** Top-level structures (TestSuite, TestStep, etc.) */
  structures: Record<string, StructureDefinition>;
  /** Reusable type definitions (enums, unions, interfaces) */
  types: Record<string, TypeDefinition>;
  /** Complete examples for reference */
  examples: ExampleDefinition[];
  /** Variable interpolation patterns and helpers */
  interpolation: InterpolationCatalog;
  /** CLI commands and flags */
  cli: CLIDefinition;
}

/**
 * Definition of a top-level structure (e.g., TestSuite, TestStep).
 */
export interface StructureDefinition {
  /** Structure name (e.g., "TestSuite") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Extended documentation with examples */
  documentation?: string;
  /** Properties/fields of this structure */
  properties: Record<string, PropertyDefinition>;
  /** Names of required properties */
  required: string[];
  /** JSON schema $schema identifier (for reference) */
  schema?: string;
  /** Usage examples */
  examples?: any[];
  /** Related structures (e.g., TestSuite contains TestStep[]) */
  relations?: RelationDefinition[];
  /** Version when structure was introduced */
  since?: string;
}

/**
 * Definition of a property/field within a structure.
 */
export interface PropertyDefinition {
  /** Property name */
  name: string;
  /** Type(s) of the property */
  type: string | string[];
  /** Human-readable description */
  description: string;
  /** Extended documentation */
  documentation?: string;
  /** Whether this property is required */
  required: boolean;
  /** Default value if not specified */
  default?: any;
  /** Enum values if type is constrained */
  enum?: string[];
  /** Reference to a type definition */
  $ref?: string;
  /** Array item type if type is "array" */
  items?: PropertyDefinition | { $ref: string } | { type: string };
  /** Properties if type is "object" */
  properties?: Record<string, PropertyDefinition>;
  /** Validation constraints */
  constraints?: PropertyConstraints;
  /** Usage examples */
  examples?: any[];
  /** Deprecation warning */
  deprecated?: boolean | string;
  /** Version when property was introduced */
  since?: string;
  /** Supports variable interpolation */
  interpolable?: boolean;
}

/**
 * Validation constraints for a property.
 */
export interface PropertyConstraints {
  /** Minimum value (numbers) */
  minimum?: number;
  /** Maximum value (numbers) */
  maximum?: number;
  /** Minimum length (strings/arrays) */
  minLength?: number;
  /** Maximum length (strings/arrays) */
  maxLength?: number;
  /** Regex pattern (strings) */
  pattern?: string;
  /** Format hint (e.g., "email", "url", "date-time") */
  format?: string;
  /** Minimum items (arrays) */
  minItems?: number;
  /** Maximum items (arrays) */
  maxItems?: number;
  /** Unique items (arrays) */
  uniqueItems?: boolean;
}

/**
 * Reusable type definition (enum, union, interface).
 */
export interface TypeDefinition {
  /** Type name (e.g., "HttpMethod", "PriorityLevel") */
  name: string;
  /** Type kind */
  kind: "enum" | "union" | "interface" | "primitive";
  /** Human-readable description */
  description: string;
  /** Extended documentation */
  documentation?: string;
  /** Enum values (for kind="enum") */
  values?: EnumValue[];
  /** Union member types (for kind="union") */
  unionOf?: string[];
  /** Interface properties (for kind="interface") */
  properties?: Record<string, PropertyDefinition>;
  /** Usage examples */
  examples?: any[];
}

/**
 * Enum value with metadata.
 */
export interface EnumValue {
  /** Enum value */
  value: string;
  /** Description of this value */
  description: string;
  /** Usage example */
  example?: string;
  /** Deprecation warning */
  deprecated?: boolean | string;
}

/**
 * Relation between structures (e.g., TestSuite contains TestStep[]).
 */
export interface RelationDefinition {
  /** Target structure name */
  target: string;
  /** Relation type */
  type: "contains" | "references" | "extends";
  /** Property name that holds the relation */
  via: string;
  /** Description of the relation */
  description: string;
}

/**
 * Complete example with metadata.
 */
export interface ExampleDefinition {
  /** Example name/title */
  name: string;
  /** Description of what this example demonstrates */
  description: string;
  /** Category/tag for grouping */
  category: string;
  /** Complete YAML example */
  yaml: string;
  /** JSON representation (for reference) */
  json?: any;
  /** Highlighted features demonstrated */
  features?: string[];
  /** Complexity level */
  complexity?: "basic" | "intermediate" | "advanced";
}

/**
 * Catalog of variable interpolation patterns.
 */
export interface InterpolationCatalog {
  /** Description of interpolation system */
  description: string;
  /** Interpolation patterns */
  patterns: InterpolationPattern[];
  /** Available Faker.js categories and methods */
  faker?: FakerCatalog;
  /** JavaScript expression helpers */
  javascript?: JavaScriptHelpers;
  /** Environment variable conventions */
  environment?: EnvironmentVariables;
}

/**
 * Interpolation pattern definition.
 */
export interface InterpolationPattern {
  /** Pattern name */
  name: string;
  /** Pattern syntax (e.g., "{{variable}}") */
  syntax: string;
  /** Description */
  description: string;
  /** Usage examples */
  examples: string[];
  /** Where this pattern can be used */
  applicableTo?: string[];
  /** Version when pattern was introduced */
  since?: string;
}

/**
 * Faker.js catalog for data generation.
 */
export interface FakerCatalog {
  /** Faker categories */
  categories: FakerCategory[];
}

/**
 * Faker category with methods.
 */
export interface FakerCategory {
  /** Category name (e.g., "person", "internet") */
  name: string;
  /** Description */
  description: string;
  /** Available methods */
  methods: FakerMethod[];
}

/**
 * Faker method definition.
 */
export interface FakerMethod {
  /** Method name */
  name: string;
  /** Description */
  description: string;
  /** Example output */
  example: string;
  /** Full interpolation syntax */
  syntax: string;
}

/**
 * JavaScript expression helpers.
 */
export interface JavaScriptHelpers {
  /** Description */
  description: string;
  /** Available globals */
  globals: string[];
  /** Common patterns */
  patterns: Array<{
    name: string;
    syntax: string;
    description: string;
    example: string;
  }>;
}

/**
 * Environment variable conventions.
 */
export interface EnvironmentVariables {
  /** Description */
  description: string;
  /** Prefix requirement */
  prefix: string;
  /** Example variables */
  examples: Array<{
    name: string;
    description: string;
    example: string;
  }>;
}

/**
 * CLI command and flag definitions.
 */
export interface CLIDefinition {
  /** Command name */
  command: string;
  /** Description */
  description: string;
  /** Available flags */
  flags: CLIFlag[];
  /** Available subcommands */
  subcommands?: CLISubcommand[];
}

/**
 * CLI flag definition.
 */
export interface CLIFlag {
  /** Flag name (e.g., "--verbose") */
  name: string;
  /** Short alias (e.g., "-v") */
  alias?: string;
  /** Description */
  description: string;
  /** Type of value */
  type: "boolean" | "string" | "number" | "array";
  /** Default value */
  default?: any;
  /** Example usage */
  example?: string;
}

/**
 * CLI subcommand definition.
 */
export interface CLISubcommand {
  /** Subcommand name */
  name: string;
  /** Description */
  description: string;
  /** Flags specific to this subcommand */
  flags?: CLIFlag[];
  /** Example usage */
  example?: string;
}
