/**
 * @fileoverview Command handler for schema export functionality.
 *
 * @remarks
 * Exports the Flow Test Engine schema catalog in JSON format for consumption
 * by external tools like the VS Code extension. The schema includes complete
 * metadata about structures, types, interpolation patterns, and examples.
 *
 * @example
 * ```bash
 * # Export schema to stdout
 * flow-test schema --format json
 *
 * # Save schema to file
 * flow-test schema --format json > flow-test-engine.schema.json
 * ```
 *
 * @packageDocumentation
 */

import { SchemaGeneratorService } from "../services/schema-generator.service";

/**
 * Supported output formats for schema export.
 */
export type SchemaFormat = "json";

/**
 * Options for schema export command.
 */
export interface SchemaCommandOptions {
  /** Output format (currently only 'json' is supported) */
  format: SchemaFormat;
  /** Whether to pretty-print the JSON output */
  pretty?: boolean;
}

/**
 * Handles the 'schema' command to export engine schema catalog.
 *
 * @param options - Command options
 * @returns Exit code (0 for success, 1 for error)
 *
 * @example
 * ```typescript
 * // Pretty-printed JSON
 * await handleSchemaCommand({ format: 'json', pretty: true });
 *
 * // Compact JSON (default)
 * await handleSchemaCommand({ format: 'json' });
 * ```
 */
export async function handleSchemaCommand(
  options: SchemaCommandOptions
): Promise<number> {
  try {
    const { format, pretty = true } = options;

    // Validate format
    if (format !== "json") {
      console.error(
        `Error: Unsupported format '${format}'. Only 'json' is currently supported.`
      );
      return 1;
    }

    // Generate schema
    const generator = new SchemaGeneratorService();
    const schema = generator.generateSchema();

    // Output to stdout
    const output = pretty
      ? JSON.stringify(schema, null, 2)
      : JSON.stringify(schema);

    console.log(output);

    return 0;
  } catch (error) {
    console.error("Error generating schema:", error);
    return 1;
  }
}

/**
 * Displays help information for the schema command.
 */
export function displaySchemaHelp(): void {
  console.log(`
Usage: flow-test schema [options]

Export Flow Test Engine schema catalog for external tools (like VS Code extension).

Options:
  --format <format>    Output format (json) [default: json]
  --help              Display this help message

Examples:
  # Export schema to stdout
  flow-test schema --format json

  # Save schema to file
  flow-test schema --format json > flow-test-engine.schema.json

  # Pipe to jq for inspection
  flow-test schema --format json | jq '.structures.TestSuite'

Schema Structure:
  The exported schema includes:
  - structures: Complete definitions of TestSuite, TestStep, etc.
  - types: Reusable type definitions (enums, unions)
  - examples: Complete YAML examples
  - interpolation: Variable interpolation patterns and helpers
  - cli: CLI command and flag documentation

For more information, visit: https://github.com/marcuspmd/flow-test
  `);
}
