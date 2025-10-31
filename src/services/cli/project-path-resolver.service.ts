/**
 * @fileoverview Project Path Resolver Service
 *
 * @remarks
 * Handles resolution of project root, test directories, and dependency search paths.
 *
 * @packageDocumentation
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { LoggerService } from "../logger.service";

/**
 * Service responsible for resolving project paths and directories
 */
export class ProjectPathResolver {
  constructor(private readonly logger?: LoggerService) {}

  /**
   * Resolve the project root directory by searching for configuration files
   *
   * @param startDir - Directory to start searching from
   * @returns Absolute path to project root
   */
  resolveProjectRoot(startDir: string): string {
    let current = path.resolve(startDir);

    while (true) {
      if (
        fs.existsSync(path.join(current, "flow-test.config.yml")) ||
        fs.existsSync(path.join(current, "flow-test.config.yaml")) ||
        fs.existsSync(path.join(current, "package.json")) ||
        fs.existsSync(path.join(current, ".git"))
      ) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return path.resolve(startDir);
      }
      current = parent;
    }
  }

  /**
   * Load configured test root directories from configuration file
   *
   * @param projectRoot - Project root directory
   * @returns Array of absolute paths to test directories
   */
  loadConfiguredTestRoots(projectRoot: string): string[] {
    const candidates = [
      path.join(projectRoot, "flow-test.config.yml"),
      path.join(projectRoot, "flow-test.config.yaml"),
      path.join(projectRoot, "flow-test.config.json"),
    ];

    const roots = new Set<string>();

    const pushRoot = (candidatePath: unknown) => {
      if (typeof candidatePath !== "string") {
        return;
      }

      const trimmed = candidatePath.trim();
      if (!trimmed) {
        return;
      }

      const absolutePath = path.isAbsolute(trimmed)
        ? path.normalize(trimmed)
        : path.resolve(projectRoot, trimmed);

      try {
        if (
          fs.existsSync(absolutePath) &&
          fs.statSync(absolutePath).isDirectory()
        ) {
          roots.add(absolutePath);
        }
      } catch (error) {
        this.logger?.debug(
          `⚠️  Skipping configured test root '${absolutePath}': ${error}`
        );
      }
    };

    for (const configPath of candidates) {
      if (!fs.existsSync(configPath)) {
        continue;
      }

      try {
        const raw = fs.readFileSync(configPath, "utf8");
        const config = configPath.endsWith(".json")
          ? JSON.parse(raw)
          : yaml.load(raw);

        if (config) {
          const directoryLists = [
            (config as any).testDirectories,
            (config as any).test_directories,
            (config as any).tests?.directories,
          ];

          for (const list of directoryLists) {
            if (Array.isArray(list)) {
              list.forEach(pushRoot);
            }
          }

          pushRoot((config as any).test_directory);
          pushRoot((config as any).testDirectory);
        }
      } catch (error) {
        this.logger?.debug(
          `⚠️  Could not load configured test roots from '${configPath}': ${error}`
        );
      }
    }

    return Array.from(roots);
  }

  /**
   * Determine dependency search roots for auto-discovery
   *
   * @param startDir - Starting directory
   * @param projectRoot - Project root directory
   * @param configuredRoots - Configured test roots from config file
   * @returns Array of directories to search for dependencies
   */
  determineDependencySearchRoots(
    startDir: string,
    projectRoot: string,
    configuredRoots: string[]
  ): string[] {
    const normalizedProjectRoot = path.resolve(projectRoot);
    const roots = new Set<string>();

    const addIfDir = (candidate: string) => {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          roots.add(path.resolve(candidate));
        }
      } catch (error) {
        this.logger?.debug(
          `⚠️  Skipping dependency search root '${candidate}': ${error}`
        );
      }
    };

    let current = path.resolve(startDir);
    addIfDir(current);

    while (true) {
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      addIfDir(parent);

      if (path.resolve(parent) === normalizedProjectRoot) {
        break;
      }

      current = parent;
    }

    configuredRoots.forEach(addIfDir);

    const result = Array.from(roots);

    if (
      result.length > 1 &&
      result.some((root) => path.resolve(root) === normalizedProjectRoot)
    ) {
      return result.filter(
        (root) => path.resolve(root) !== normalizedProjectRoot
      );
    }

    return result;
  }
}
