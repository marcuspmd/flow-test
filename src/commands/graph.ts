import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ConfigManager } from "../core/config";
import { TestDiscovery } from "../core/discovery";
import { PriorityService } from "../services/priority";
import {
  generateDiscoveryMermaidGraph,
  MermaidDirection,
} from "../services/discovery-graph.service";
import { DiscoveredTest, EngineExecutionOptions } from "../types/engine.types";

interface RuntimeFilters {
  priorities?: string[];
  suite_names?: string[];
  node_ids?: string[];
  tags?: string[];
}

const VALID_DIRECTIONS: MermaidDirection[] = ["TD", "LR", "BT", "RL"];

/**
 * Handles the `graph` CLI command responsible for generating discovery graphs.
 */
export async function handleGraphCommand(args: string[]): Promise<void> {
  let format: string | undefined;
  let configFile: string | undefined;
  let testDirectory: string | undefined;
  let outputPath: string | undefined;
  let direction: MermaidDirection = "TD";
  let customTitle: string | undefined;
  let highlightOrphans = true;

  let priorityFilter: string[] | undefined;
  let suiteFilter: string[] | undefined;
  let nodeFilter: string[] | undefined;
  let tagFilter: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith("-") && !format) {
      format = arg;
      continue;
    }

    switch (arg) {
      case "-c":
      case "--config":
        configFile = args[++i];
        break;
      case "-d":
      case "--directory":
        testDirectory = args[++i];
        break;
      case "-o":
      case "--output":
        outputPath = args[++i];
        break;
      case "--direction": {
        const value = args[++i];
        if (!value) {
          console.error("❌ --direction requires a value (TD, LR, BT, RL)");
          process.exit(1);
        }
        const normalized = value.toUpperCase() as MermaidDirection;
        if (!VALID_DIRECTIONS.includes(normalized)) {
          console.error(
            `❌ Invalid direction '${value}'. Use one of: ${VALID_DIRECTIONS.join(
              ", "
            )}`
          );
          process.exit(1);
        }
        direction = normalized;
        break;
      }
      case "--title":
        customTitle = args[++i];
        break;
      case "--priority":
      case "--priorities":
        priorityFilter = parseList(args[++i]);
        break;
      case "--suite":
      case "--suites":
        suiteFilter = parseList(args[++i]);
        break;
      case "--node":
      case "--nodes":
        nodeFilter = parseList(args[++i]);
        break;
      case "--tag":
      case "--tags":
        tagFilter = parseList(args[++i]);
        break;
      case "--no-orphans":
        highlightOrphans = false;
        break;
      case "-h":
      case "--help":
        printGraphHelp();
        process.exit(0);
      default:
        console.error(`❌ Unknown option: ${arg}`);
        printGraphHelp();
        process.exit(1);
    }
  }

  const resolvedFormat = (format || "mermaid").toLowerCase();
  if (resolvedFormat !== "mermaid") {
    console.error(
      `❌ Unsupported graph format '${resolvedFormat}'. Only 'mermaid' is supported currently.`
    );
    process.exit(1);
  }

  const filtersForRuntime: RuntimeFilters = {};
  const filtersForExecution: NonNullable<EngineExecutionOptions["filters"]> =
    {};

  if (priorityFilter?.length) {
    filtersForRuntime.priorities = priorityFilter;
    filtersForExecution.priority = priorityFilter;
    (filtersForExecution as any).priorities = priorityFilter; // ensure compatibility
  }
  if (suiteFilter?.length) {
    filtersForRuntime.suite_names = suiteFilter;
    filtersForExecution.suite_names = suiteFilter;
  }
  if (nodeFilter?.length) {
    filtersForRuntime.node_ids = nodeFilter;
    filtersForExecution.node_ids = nodeFilter;
  }
  if (tagFilter?.length) {
    filtersForRuntime.tags = tagFilter;
    filtersForExecution.tags = tagFilter;
  }

  const executionOptions: EngineExecutionOptions = {
    config_file: configFile,
    test_directory: testDirectory,
    filters:
      Object.keys(filtersForExecution).length > 0
        ? filtersForExecution
        : undefined,
  };

  const configManager = new ConfigManager(executionOptions);
  const discovery = new TestDiscovery(configManager);
  const priorityService = new PriorityService(configManager);

  const discoveredTests = await discovery.discoverTests();
  const filteredTests = filterDiscoveredTests(
    discoveredTests,
    filtersForRuntime
  );
  const orderedTests = priorityService.orderTests(filteredTests);

  const graphTitle =
    customTitle ||
    `Flow Test Discovery (${orderedTests.length} suite${
      orderedTests.length === 1 ? "" : "s"
    })`;

  const { diagram, orphanNodeIds, unresolvedDependencies } =
    generateDiscoveryMermaidGraph(orderedTests, {
      direction,
      title: graphTitle,
      highlightOrphans,
    });

  if (outputPath) {
    const resolvedPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.resolve(process.cwd(), outputPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, `${diagram}\n`, "utf8");
    console.error(`✅ Mermaid discovery graph written to ${resolvedPath}`);
  } else {
    process.stdout.write(`${diagram}\n`);
  }

  if (highlightOrphans && orphanNodeIds.length > 0) {
    console.error(
      `ℹ️  Orphan suites (no dependencies in either direction): ${orphanNodeIds.join(
        ", "
      )}`
    );
  }

  if (unresolvedDependencies.length > 0) {
    console.error(
      `⚠️  ${unresolvedDependencies.length} dependency reference(s) could not be resolved.`
    );
  }
}

function parseList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function filterDiscoveredTests(
  tests: DiscoveredTest[],
  filters: RuntimeFilters
): DiscoveredTest[] {
  if (!filters || Object.keys(filters).length === 0) {
    return tests;
  }

  return tests.filter((test) => {
    if (filters.priorities?.length) {
      const priority = test.priority || "medium";
      if (!filters.priorities.includes(priority)) {
        return false;
      }
    }

    if (filters.suite_names?.length) {
      if (!filters.suite_names.includes(test.suite_name)) {
        return false;
      }
    }

    if (filters.node_ids?.length) {
      if (!filters.node_ids.includes(test.node_id)) {
        return false;
      }
    }

    if (filters.tags?.length) {
      const tags = getTestTags(test.file_path);
      if (!tags.some((tag) => filters.tags!.includes(tag))) {
        return false;
      }
    }

    return true;
  });
}

function getTestTags(filePath: string): string[] {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const suite = yaml.load(fileContent) as any;
    const tags = suite?.metadata?.tags;
    if (Array.isArray(tags)) {
      return tags;
    }
    return [];
  } catch (error) {
    console.error(
      `⚠️  Warning: Could not read tags from ${filePath}: ${error}`
    );
    return [];
  }
}

function printGraphHelp(): void {
  console.error(`
Usage: flow-test graph [format] [options]

Generates a discovery graph of the Flow Test suites. The default and only
supported format is 'mermaid'.

Examples:
  flow-test graph mermaid --output discovery.mmd
  flow-test graph --direction LR --priority critical,high
  flow-test graph mermaid --no-orphans --tag smoke

Options:
  -c, --config <file>      Configuration file to load
  -d, --directory <dir>    Override test discovery directory
  -o, --output <file>      Write the Mermaid graph to a file instead of stdout
      --direction <dir>    Graph direction (TD, LR, BT, RL). Default: TD
      --title <title>      Custom title comment for the graph
      --priority <list>    Filter suites by priority levels (comma-separated)
      --suite <list>       Filter suites by suite names (comma-separated)
      --node <list>        Filter suites by node IDs (comma-separated)
      --tag <list>         Filter suites by metadata tags (comma-separated)
      --no-orphans         Disable orphan highlighting in the diagram
      --help               Show this help message
`);
}
