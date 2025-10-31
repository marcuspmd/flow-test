/**
 * @fileoverview Dependency Discovery Service
 *
 * @remarks
 * Responsible for auto-discovering test suite dependencies by analyzing
 * dependency declarations and searching for corresponding files.
 *
 * @packageDocumentation
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import fg from "fast-glob";
import { LoggerService } from "../logger.service";
import { ProjectPathResolver } from "./project-path-resolver.service";

/**
 * Dependency discovery context
 */
export interface DependencyDiscoveryContext {
  projectRoot: string;
  searchRoots: string[];
  nodeIdToFileMap: Map<string, string>;
  processedFiles: Set<string>;
  visitedDependencyFiles: Set<string>;
  fallbackSearchPerformed: boolean;
}

/**
 * Dependency discovery result
 */
export interface DependencyDiscoveryResult {
  nodeIds: string[];
  filePaths: string[];
}

/**
 * Service responsible for discovering test dependencies
 */
export class DependencyDiscoveryService {
  constructor(
    private readonly pathResolver: ProjectPathResolver,
    private readonly logger?: LoggerService
  ) {}

  /**
   * Auto-discover dependencies for a test suite
   *
   * @param testData - Parsed YAML test data
   * @param testDirectory - Directory containing the test file
   * @param context - Optional discovery context for reuse
   * @returns Discovery result with node IDs and file paths
   */
  async autoDiscoverDependencies(
    testData: Record<string, unknown>,
    testDirectory: string,
    context?: DependencyDiscoveryContext
  ): Promise<DependencyDiscoveryResult> {
    const dependencyNodeIds: string[] = [];
    const dependencyFilePaths: string[] = [];

    // Early exit if no dependencies
    if (!testData?.depends || !Array.isArray(testData.depends)) {
      return { nodeIds: dependencyNodeIds, filePaths: dependencyFilePaths };
    }

    const normalizedStartDir = path.resolve(testDirectory);
    let discoveryContext = context;

    // Create context if not provided
    if (!discoveryContext) {
      const projectRoot =
        this.pathResolver.resolveProjectRoot(normalizedStartDir);
      const configuredRoots =
        this.pathResolver.loadConfiguredTestRoots(projectRoot);
      const searchRoots = this.pathResolver.determineDependencySearchRoots(
        normalizedStartDir,
        projectRoot,
        configuredRoots
      );

      discoveryContext = {
        projectRoot,
        searchRoots,
        nodeIdToFileMap: new Map<string, string>(),
        processedFiles: new Set<string>(),
        visitedDependencyFiles: new Set<string>(),
        fallbackSearchPerformed: false,
      };
    }

    // Build dependency index if empty
    if (discoveryContext.nodeIdToFileMap.size === 0) {
      await this.buildDependencyIndex(
        discoveryContext.searchRoots,
        discoveryContext
      );
    }

    // Process each dependency
    for (const dependency of testData.depends) {
      const result = await this.processDependency(
        dependency,
        normalizedStartDir,
        discoveryContext
      );

      if (result.nodeId && result.filePath) {
        if (!dependencyNodeIds.includes(result.nodeId)) {
          dependencyNodeIds.push(result.nodeId);
          this.logger?.info(
            `✅ Found dependency: ${result.nodeId} (${path.basename(
              result.filePath
            )})`
          );
        }

        if (!dependencyFilePaths.includes(result.filePath)) {
          dependencyFilePaths.push(result.filePath);
        }

        // Recursively discover transitive dependencies
        if (!discoveryContext.visitedDependencyFiles.has(result.filePath)) {
          discoveryContext.visitedDependencyFiles.add(result.filePath);

          const transitive = await this.discoverTransitiveDependencies(
            result.filePath,
            discoveryContext
          );

          // Add transitive dependencies
          for (const nodeId of transitive.nodeIds) {
            if (!dependencyNodeIds.includes(nodeId)) {
              dependencyNodeIds.push(nodeId);
            }
          }

          for (const filePath of transitive.filePaths) {
            if (!dependencyFilePaths.includes(filePath)) {
              dependencyFilePaths.push(filePath);
            }
          }
        }
      } else {
        this.logger?.warn(
          `⚠️ Could not resolve dependency: ${JSON.stringify(dependency)}`
        );
      }
    }

    return { nodeIds: dependencyNodeIds, filePaths: dependencyFilePaths };
  }

  /**
   * Build dependency index from search roots
   */
  private async buildDependencyIndex(
    roots: string[],
    context: DependencyDiscoveryContext
  ): Promise<void> {
    for (const root of roots) {
      if (!root) continue;

      try {
        const files = await fg(["**/*.yaml", "**/*.yml"], {
          cwd: root,
          absolute: true,
          ignore: ["node_modules/**", ".git/**", "results/**", "dist/**"],
          followSymbolicLinks: true,
        });

        for (const file of files) {
          const absolutePath = path.resolve(file);

          if (context.processedFiles.has(absolutePath)) {
            continue;
          }

          context.processedFiles.add(absolutePath);

          try {
            const fileContent = fs.readFileSync(absolutePath, "utf8");
            const fileData = yaml.load(fileContent);

            if (fileData && (fileData as any).node_id) {
              const nodeId = (fileData as any).node_id;
              if (!context.nodeIdToFileMap.has(nodeId)) {
                context.nodeIdToFileMap.set(nodeId, absolutePath);
              }
            }
          } catch (error) {
            this.logger?.debug(
              `⚠️ Could not parse YAML file during dependency discovery: ${absolutePath}`
            );
          }
        }
      } catch (error) {
        this.logger?.debug(
          `⚠️ Skipping dependency discovery in '${root}': ${error}`
        );
      }
    }
  }

  /**
   * Ensure a node ID is indexed
   */
  private async ensureNodeIndexed(
    nodeId: string,
    context: DependencyDiscoveryContext
  ): Promise<void> {
    if (!nodeId || context.nodeIdToFileMap.has(nodeId)) {
      return;
    }

    if (!context.fallbackSearchPerformed) {
      context.fallbackSearchPerformed = true;
      await this.buildDependencyIndex([context.projectRoot], context);
    }
  }

  /**
   * Process a single dependency declaration
   */
  private async processDependency(
    dependency: any,
    normalizedStartDir: string,
    context: DependencyDiscoveryContext
  ): Promise<{ nodeId: string | null; filePath: string | null }> {
    let resolvedNodeId: string | null =
      typeof dependency?.node_id === "string" ? dependency.node_id : null;
    let dependencyFilePath: string | null = null;

    // Try resolving by node_id
    if (resolvedNodeId) {
      await this.ensureNodeIndexed(resolvedNodeId, context);
      dependencyFilePath = context.nodeIdToFileMap.get(resolvedNodeId) ?? null;
    }

    // Try resolving by path
    const dependencyPathCandidate =
      typeof dependency?.path === "string" ? dependency.path.trim() : null;

    if (!dependencyFilePath && dependencyPathCandidate) {
      const dependencyPath = path.resolve(
        normalizedStartDir,
        dependencyPathCandidate
      );

      if (
        fs.existsSync(dependencyPath) &&
        fs.statSync(dependencyPath).isFile()
      ) {
        dependencyFilePath = dependencyPath;
      } else {
        // Fuzzy search in the index
        for (const [nodeId, filePath] of context.nodeIdToFileMap) {
          if (
            filePath.includes(dependencyPathCandidate) ||
            dependencyPathCandidate.includes(
              path.basename(filePath, path.extname(filePath))
            )
          ) {
            resolvedNodeId = nodeId;
            dependencyFilePath = filePath;
            break;
          }
        }
      }
    }

    // Extract node_id from file if not found
    if (dependencyFilePath && !resolvedNodeId) {
      try {
        const depFileContent = fs.readFileSync(dependencyFilePath, "utf8");
        const depData = yaml.load(depFileContent);
        if (depData && (depData as any).node_id) {
          resolvedNodeId = (depData as any).node_id;
          if (resolvedNodeId) {
            context.nodeIdToFileMap.set(resolvedNodeId, dependencyFilePath);
          }
        }
      } catch (error) {
        this.logger?.warn(
          `⚠️ Could not resolve dependency node_id for file: ${dependencyFilePath}`
        );
      }
    }

    // Final resolution attempt
    if (resolvedNodeId) {
      await this.ensureNodeIndexed(resolvedNodeId, context);
      dependencyFilePath =
        dependencyFilePath ??
        context.nodeIdToFileMap.get(resolvedNodeId) ??
        null;
    }

    if (!resolvedNodeId || !dependencyFilePath) {
      return { nodeId: null, filePath: null };
    }

    // Update map
    if (!context.nodeIdToFileMap.has(resolvedNodeId)) {
      context.nodeIdToFileMap.set(resolvedNodeId, dependencyFilePath);
    }

    return { nodeId: resolvedNodeId, filePath: dependencyFilePath };
  }

  /**
   * Discover transitive dependencies
   */
  private async discoverTransitiveDependencies(
    filePath: string,
    context: DependencyDiscoveryContext
  ): Promise<DependencyDiscoveryResult> {
    try {
      const depFileContent = fs.readFileSync(filePath, "utf8");
      const depData = yaml.load(depFileContent);

      return await this.autoDiscoverDependencies(
        depData as Record<string, unknown>,
        path.dirname(filePath),
        context
      );
    } catch (error) {
      this.logger?.warn(`⚠️ Could not read dependency file: ${filePath}`);
      return { nodeIds: [], filePaths: [] };
    }
  }
}
