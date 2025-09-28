import path from "path";
import { DiscoveredTest, FlowDependency } from "../types/engine.types";

export type MermaidDirection = "TD" | "LR" | "BT" | "RL";

export interface MermaidGraphOptions {
  /** Direction of the mermaid graph (default: TD) */
  direction?: MermaidDirection;
  /** Optional graph title rendered as a comment */
  title?: string;
  /** Highlight orphan tests (no dependencies and no dependents) */
  highlightOrphans?: boolean;
}

export interface MermaidGraphResult {
  /** Generated Mermaid graph definition */
  diagram: string;
  /** Node IDs with no dependencies and no dependents */
  orphanNodeIds: string[];
  /** Dependencies that could not be resolved to discovered tests */
  unresolvedDependencies: Array<{
    from: string;
    dependency: FlowDependency;
  }>;
}

interface SanitizedIdTracker {
  /** Maps original node_id to sanitized mermaid identifier */
  map: Map<string, string>;
  /** Tracks already used sanitized identifiers to avoid collisions */
  used: Set<string>;
}

const PRIORITY_CLASS_MAP: Record<string, string> = {
  critical: "priority_critical",
  high: "priority_high",
  medium: "priority_medium",
  low: "priority_low",
};

const PRIORITY_CLASS_DEFS: Record<string, string> = {
  priority_critical:
    "fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d,stroke-width:2px",
  priority_high: "fill:#fef3c7,stroke:#c2410c,color:#7c2d12,stroke-width:2px",
  priority_medium:
    "fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e,stroke-width:1.5px",
  priority_low: "fill:#ecfdf5,stroke:#047857,color:#065f46,stroke-width:1.5px",
  priority_unknown:
    "fill:#f3f4f6,stroke:#4b5563,color:#1f2937,stroke-dasharray:3 2",
  orphan: "stroke-dasharray:6 3,stroke:#7c3aed",
};

/**
 * Generates a Mermaid graph representing the discovered tests and their dependencies.
 */
export function generateDiscoveryMermaidGraph(
  tests: DiscoveredTest[],
  options: MermaidGraphOptions = {}
): MermaidGraphResult {
  const direction = options.direction ?? "TD";
  const highlightOrphans = options.highlightOrphans !== false;
  const sanitizedTracker: SanitizedIdTracker = {
    map: new Map<string, string>(),
    used: new Set<string>(),
  };

  const nodeIdSet = new Set<string>();
  const pathToNodeId = new Map<string, string>();

  tests.forEach((test) => {
    nodeIdSet.add(test.node_id);
    pathToNodeId.set(path.normalize(test.file_path), test.node_id);
  });

  const lines: string[] = [];
  lines.push(`graph ${direction}`);

  if (options.title) {
    lines.push(`  %% ${escapeMermaidText(options.title)}`);
  }

  if (tests.length === 0) {
    lines.push("  %% No test suites discovered");
    return {
      diagram: lines.join("\n"),
      orphanNodeIds: [],
      unresolvedDependencies: [],
    };
  }

  const nodeClasses = new Map<string, Set<string>>();
  const outgoing = new Set<string>();
  const incoming = new Set<string>();
  const edges: string[] = [];
  const unresolved: Array<{ from: string; dependency: FlowDependency }> = [];

  // Declare nodes first so they appear before edges
  for (const test of tests) {
    const mermaidId = getOrCreateSanitizedId(test.node_id, sanitizedTracker);
    const priorityKey = (test.priority ?? "").toLowerCase();
    const priorityClass =
      (priorityKey && PRIORITY_CLASS_MAP[priorityKey]) || undefined;

    const effectivePriorityClass = priorityClass ?? "priority_unknown";
    assignClass(nodeClasses, mermaidId, effectivePriorityClass);

    const labelParts = [test.suite_name];
    labelParts.push(`(${test.node_id})`);
    if (test.priority) {
      labelParts.push(`priority: ${test.priority}`);
    }

    if (test.estimated_duration) {
      labelParts.push(`~${formatDuration(test.estimated_duration)}`);
    }

    if (test.exports && test.exports.length > 0) {
      labelParts.push(`exports: ${test.exports.join(", ")}`);
    }

    const nodeLabel = escapeMermaidText(labelParts.join("<br/>"));
    lines.push(`  ${mermaidId}["${nodeLabel}"]`);
  }

  // Create edges based on dependencies
  for (const test of tests) {
    const currentId = sanitizedTracker.map.get(test.node_id)!;

    if (!test.depends || test.depends.length === 0) {
      continue;
    }

    for (const dependency of test.depends) {
      if (!dependency) {
        continue;
      }

      const resolvedNodeId = resolveDependencyNodeId(
        dependency,
        nodeIdSet,
        pathToNodeId,
        test.file_path
      );

      if (!resolvedNodeId || !sanitizedTracker.map.has(resolvedNodeId)) {
        unresolved.push({ from: test.node_id, dependency });
        continue;
      }

      const dependencyId = sanitizedTracker.map.get(resolvedNodeId)!;
      outgoing.add(resolvedNodeId);
      incoming.add(test.node_id);

      const labels: string[] = [];
      if (dependency.required === false) {
        labels.push("optional");
      }
      if (dependency.condition) {
        labels.push(`if ${dependency.condition}`);
      }
      if (dependency.cache) {
        labels.push("cache");
      }

      const edgeLabel = labels.length
        ? `|${escapeMermaidText(labels.join(" & "))}|`
        : "";
      const arrow = dependency.required === false ? "-.->" : "-->";
      edges.push(`  ${dependencyId} ${arrow}${edgeLabel} ${currentId}`);
    }
  }

  lines.push(...edges);

  const orphanNodeIds: string[] = [];
  if (highlightOrphans) {
    for (const test of tests) {
      const hasOutgoing = outgoing.has(test.node_id);
      const hasIncoming = incoming.has(test.node_id);
      if (!hasOutgoing && !hasIncoming) {
        const mermaidId = sanitizedTracker.map.get(test.node_id)!;
        assignClass(nodeClasses, mermaidId, "orphan");
        orphanNodeIds.push(test.node_id);
      }
    }
  }

  // Append class definitions and assignments
  for (const [className, definition] of Object.entries(PRIORITY_CLASS_DEFS)) {
    lines.push(`  classDef ${className} ${definition};`);
  }

  for (const [mermaidId, classes] of nodeClasses.entries()) {
    const joined = Array.from(classes).join(",");
    if (joined.length > 0) {
      lines.push(`  class ${mermaidId} ${joined};`);
    }
  }

  if (unresolved.length > 0) {
    lines.push("\n  %% Unresolved dependencies");
    unresolved.forEach(({ from, dependency }) => {
      const descriptor = dependency.node_id ?? dependency.path ?? "unknown";
      lines.push(`  %% - ${from} -> ${descriptor}`);
    });
  }

  return {
    diagram: lines.join("\n"),
    orphanNodeIds,
    unresolvedDependencies: unresolved,
  };
}

function getOrCreateSanitizedId(
  nodeId: string,
  tracker: SanitizedIdTracker
): string {
  if (tracker.map.has(nodeId)) {
    return tracker.map.get(nodeId)!;
  }

  const base = sanitizeIdentifier(nodeId);
  let candidate = base;
  let counter = 1;

  while (tracker.used.has(candidate)) {
    candidate = `${base}_${counter++}`;
  }

  tracker.map.set(nodeId, candidate);
  tracker.used.add(candidate);
  return candidate;
}

function sanitizeIdentifier(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, "_");
  let normalized = cleaned;
  if (!/^[a-zA-Z_]/.test(normalized)) {
    normalized = `n_${normalized}`;
  }

  if (normalized.length === 0) {
    return "n_node";
  }

  return normalized;
}

function escapeMermaidText(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\|/g, "\\|");
}

function resolveDependencyNodeId(
  dependency: FlowDependency,
  knownNodeIds: Set<string>,
  pathMap: Map<string, string>,
  currentFilePath: string
): string | undefined {
  if (dependency.node_id && knownNodeIds.has(dependency.node_id)) {
    return dependency.node_id;
  }

  if (dependency.path) {
    const candidates = new Set<string>();
    const normalizedDependencyPath = path.normalize(dependency.path);
    candidates.add(normalizedDependencyPath);

    const absoluteFromCurrent = path.resolve(
      path.dirname(currentFilePath),
      dependency.path
    );
    candidates.add(path.normalize(absoluteFromCurrent));

    const absoluteFromCwd = path.resolve(process.cwd(), dependency.path);
    candidates.add(path.normalize(absoluteFromCwd));

    for (const candidate of candidates) {
      const mapped = pathMap.get(candidate);
      if (mapped && knownNodeIds.has(mapped)) {
        return mapped;
      }
    }
  }

  return undefined;
}

function assignClass(
  nodeClasses: Map<string, Set<string>>,
  nodeId: string,
  className: string
): void {
  const set = nodeClasses.get(nodeId) ?? new Set<string>();
  set.add(className);
  nodeClasses.set(nodeId, set);
}

function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    const seconds = durationMs / 1000;
    return `${seconds.toFixed(1)}s`;
  }
  return `${durationMs}ms`;
}
