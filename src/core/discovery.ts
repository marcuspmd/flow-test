/**
 * @fileoverview Test discovery and filtering service for the Flow Test Engine.
 *
 * @remarks
 * This module provides the TestDiscovery class which handles automatic discovery
 * of test files, validation of test suite structures, dependency resolution,
 * and advanced filtering capabilities for test execution planning.
 *
 * @packageDocumentation
 */

import fs from "fs";
import path from "path";
import fg from "fast-glob";
import yaml from "js-yaml";
import { getLogger } from "../services/logger.service";
import { ConfigManager } from "./config";
import {
  DiscoveredTest,
  TestSuite,
  FlowDependency,
} from "../types/engine.types";

/**
 * Test discovery service for finding, loading, and filtering test files.
 *
 * @remarks
 * The TestDiscovery service provides comprehensive test file discovery capabilities
 * with support for directory scanning, YAML validation, dependency resolution,
 * and advanced filtering options. It serves as the foundation for test execution
 * planning and orchestration.
 *
 * **Key Features:**
 * - **Automatic Discovery**: Recursive scanning of directories for YAML test files
 * - **Structure Validation**: Comprehensive validation of test suite YAML structure
 * - **Dependency Resolution**: Analysis and resolution of inter-suite dependencies
 * - **Advanced Filtering**: Multi-criteria filtering by priority, tags, and patterns
 * - **Error Handling**: Detailed error reporting for invalid test files
 * - **Performance Optimized**: Efficient file scanning with configurable patterns
 *
 * **Supported File Patterns:**
 * - `**\/*.yaml` and `**\/*.yml` (all YAML files)
 * - Configurable inclusion/exclusion patterns
 * - Support for nested directory structures
 * - Automatic exclusion of common non-test directories
 *
 * @example Basic test discovery
 * ```typescript
 * const configManager = new ConfigManager();
 * const discovery = new TestDiscovery(configManager);
 *
 * // Discover all tests in directory
 * const tests = await discovery.discoverTests();
 * console.log(`Found ${tests.length} test suites`);
 *
 * // Get execution order with dependency resolution
 * const executionOrder = discovery.getExecutionOrder(tests);
 * ```
 *
 * @example Advanced filtering and dependency analysis
 * ```typescript
 * // Discover with specific directory
 * const tests = await discovery.discoverTests('./integration-tests');
 *
 * // Filter by priority and tags
 * const filtered = discovery.filterTests(tests, {
 *   priorities: ['critical', 'high'],
 *   tags: ['smoke', 'api'],
 *   excludeTags: ['experimental']
 * });
 *
 * // Analyze dependencies
 * const dependencies = discovery.analyzeDependencies(filtered);
 * console.log('Dependency graph:', dependencies);
 * ```
 *
 * @example Custom file patterns and validation
 * ```typescript
 * const discovery = new TestDiscovery(configManager);
 *
 * // Override default patterns
 * const customTests = await discovery.discoverTests('./tests', {
 *   patterns: ['**\/*-test.yaml', '**\/*-spec.yml'],
 *   exclude: ['**\/drafts\/**', '**\/templates\/**']
 * });
 *
 * // Validate specific files
 * const validationResults = await discovery.validateTestFiles(customTests);
 * const invalidTests = validationResults.filter(r => !r.valid);
 * ```
/**
 * Test discovery service for finding, loading, and filtering test files.
 *
 * @remarks
 * The TestDiscovery service provides comprehensive test file discovery capabilities
 * with support for directory scanning, YAML validation, dependency resolution,
 * and advanced filtering options. It serves as the foundation for test execution
 * planning and orchestration.
 *
 * **Key Features:**
 * - **Automatic Discovery**: Recursive scanning of directories for YAML test files
 * - **Structure Validation**: Comprehensive validation of test suite YAML structure
 * - **Dependency Resolution**: Analysis and resolution of inter-suite dependencies
 * - **Advanced Filtering**: Multi-criteria filtering by priority, tags, and patterns
 * - **Error Handling**: Detailed error reporting for invalid test files
 * - **Performance Optimized**: Efficient file scanning with configurable patterns
 *
 * **Supported File Patterns:**
 * - All YAML files with .yaml and .yml extensions
 * - Configurable inclusion/exclusion patterns
 * - Support for nested directory structures
 * - Automatic exclusion of common non-test directories
 *
 * @example Basic test discovery
 * ```typescript
 * const configManager = new ConfigManager();
 * const discovery = new TestDiscovery(configManager);
 *
 * // Discover all tests in directory
 * const tests = await discovery.discoverTests();
 * console.log(`Found ${tests.length} test suites`);
 *
 * // Get execution order with dependency resolution
 * const executionOrder = discovery.getExecutionOrder(tests);
 * ```
 *
 * @example Advanced filtering and dependency analysis
 * ```typescript
 * // Discover with specific directory
 * const tests = await discovery.discoverTests('./integration-tests');
 *
 * // Filter by priority and tags
 * const filtered = discovery.filterTests(tests, {
 *   priorities: ['critical', 'high'],
 *   tags: ['smoke', 'api'],
 *   excludeTags: ['experimental']
 * });
 *
 * // Analyze dependencies
 * const dependencies = discovery.analyzeDependencies(filtered);
 * console.log('Dependency graph:', dependencies);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class TestDiscovery {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Discovers all test files in the configured directory
   *
   * Scans the test directory recursively for YAML files, validates their structure
   * as valid test suites, and returns an array of discovered tests with metadata.
   *
   * @returns Promise resolving to array of discovered test configurations
   * @throws Error if test directory doesn't exist or YAML files are invalid
   *
   * @example
   * ```typescript
   * const tests = await discovery.discoverTests();
   * console.log(`Found ${tests.length} test suites`);
   *
   * tests.forEach(test => {
   *   console.log(`- ${test.suite.suite_name} (${test.filePath})`);
   * });
   * ```
   */
  async discoverTests(): Promise<DiscoveredTest[]> {
    const config = this.configManager.getConfig();
    const testDirectory = path.resolve(config.test_directory);

    if (!fs.existsSync(testDirectory)) {
      throw new Error(`Test directory does not exist: ${testDirectory}`);
    }

    const discoveredTests: DiscoveredTest[] = [];

    // Para cada padrão de descoberta, encontra arquivos correspondentes
    for (const pattern of config.discovery!.patterns) {
      const fullPattern = path.join(testDirectory, pattern);
      const files = await fg(fullPattern, {
        ignore: config.discovery!.exclude,
        absolute: true,
        onlyFiles: true,
      });

      for (const filePath of files) {
        try {
          const test = await this.parseTestFile(filePath);
          if (test) {
            discoveredTests.push(test);
          }
        } catch (error) {
          getLogger().warn(
            `⚠️  Warning: Failed to parse test file ${filePath}: ${error}`
          );
        }
      }
    }

    // Remove duplicatas baseado no file_path
    const uniqueTests = this.removeDuplicates(discoveredTests);

    // Resolve dependências entre testes
    const testsWithDependencies = this.resolveDependencies(uniqueTests);

    return testsWithDependencies;
  }

  /**
   * Analisa um arquivo de teste individual
   */
  private async parseTestFile(
    filePath: string
  ): Promise<DiscoveredTest | null> {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const suite = yaml.load(fileContent) as TestSuite;

      if (!suite || !suite.suite_name || !suite.node_id) {
        getLogger().warn(
          `⚠️  Warning: Invalid test suite in ${filePath} - missing suite_name or node_id`
        );
        return null;
      }

      const discoveredTest: DiscoveredTest = {
        file_path: filePath,
        node_id: suite.node_id,
        suite_name: suite.suite_name,
        priority:
          suite.metadata?.priority ||
          this.inferPriorityFromName(suite.suite_name),
        depends: this.extractFlowDependencies(suite, filePath),
        exports: this.extractExports(suite),
        estimated_duration:
          suite.metadata?.estimated_duration_ms || this.estimateDuration(suite),
      };

      return discoveredTest;
    } catch (error) {
      throw new Error(`Failed to parse test file ${filePath}: ${error}`);
    }
  }

  /**
   * Infere prioridade baseada no nome da suíte
   */
  private inferPriorityFromName(suiteName: string): string {
    const name = suiteName.toLowerCase();

    // Palavras-chave que indicam prioridade crítica
    if (
      name.includes("critical") ||
      name.includes("smoke") ||
      name.includes("health")
    ) {
      return "critical";
    }

    // Palavras-chave que indicam alta prioridade
    if (
      name.includes("auth") ||
      name.includes("login") ||
      name.includes("core")
    ) {
      return "high";
    }

    // Palavras-chave que indicam baixa prioridade
    if (
      name.includes("edge") ||
      name.includes("optional") ||
      name.includes("experimental")
    ) {
      return "low";
    }

    // Padrão é média prioridade
    return "medium";
  }

  /**
   * Extrai dependências de fluxo no novo formato
   */
  private extractFlowDependencies(
    suite: TestSuite,
    filePath: string
  ): FlowDependency[] {
    if (!suite.depends) {
      return [];
    }

    const seenNodeIds = new Set<string>();
    const seenPaths = new Set<string>();
    const dependencies: FlowDependency[] = [];

    for (const dependency of suite.depends) {
      if (!dependency || typeof dependency !== "object") {
        continue;
      }

      const rawNodeId =
        typeof dependency.node_id === "string"
          ? dependency.node_id.trim()
          : undefined;
      const rawPath =
        typeof dependency.path === "string"
          ? dependency.path.trim()
          : undefined;

      if (!rawNodeId && !rawPath) {
        getLogger().warn(
          `⚠️  Warning: Dependency without node_id or path found in ${filePath}.`
        );
        continue;
      }

      if (rawNodeId && seenNodeIds.has(rawNodeId) && !rawPath) {
        continue;
      }

      if (rawPath) {
        const normalizedPath = path.normalize(rawPath);
        if (!rawNodeId && seenPaths.has(normalizedPath)) {
          continue;
        }
        seenPaths.add(normalizedPath);
      }

      if (rawNodeId) {
        seenNodeIds.add(rawNodeId);
      }

      const normalizedDependency: FlowDependency = {
        ...dependency,
      };

      if (rawNodeId) {
        normalizedDependency.node_id = rawNodeId;
      } else {
        delete normalizedDependency.node_id;
      }

      if (rawPath) {
        normalizedDependency.path = rawPath;
      } else {
        delete normalizedDependency.path;
      }

      dependencies.push(normalizedDependency);
    }

    return dependencies;
  }

  /**
   * Extrai lista de variáveis exportadas
   */
  private extractExports(suite: TestSuite): string[] {
    return suite.exports || [];
  }

  /**
   * Estima duração baseada no número de steps
   */
  private estimateDuration(suite: TestSuite): number {
    let totalSteps = suite.steps.length;

    // Estimativa considerando apenas steps diretos da suite

    // Estimativa: 500ms por step como baseline
    return totalSteps * 500;
  }

  /**
   * Remove testes duplicados baseado no caminho do arquivo
   */
  private removeDuplicates(tests: DiscoveredTest[]): DiscoveredTest[] {
    const seen = new Set<string>();
    return tests.filter((test) => {
      if (seen.has(test.file_path)) {
        return false;
      }
      seen.add(test.file_path);
      return true;
    });
  }

  /**
   * Resolve dependências entre testes
   */
  private resolveDependencies(tests: DiscoveredTest[]): DiscoveredTest[] {
    const knownNodeIds = new Set(tests.map((test) => test.node_id));

    return tests.map((test) => {
      if (!test.depends || test.depends.length === 0) {
        return test;
      }

      const validDependencies = test.depends.filter((dependency) => {
        const nodeId =
          typeof dependency.node_id === "string"
            ? dependency.node_id.trim()
            : undefined;
        const dependencyPath =
          typeof dependency.path === "string"
            ? dependency.path.trim()
            : undefined;

        if (nodeId) {
          if (knownNodeIds.has(nodeId)) {
            return true;
          }

          if (dependencyPath) {
            getLogger().warn(
              `⚠️  Warning: Dependency '${nodeId}' not found for test '${test.node_id}' (${test.suite_name}). Will attempt path resolution via '${dependencyPath}'.`
            );
            return true;
          }

          getLogger().warn(
            `⚠️  Warning: Dependency '${nodeId}' not found for test '${test.node_id}' (${test.suite_name})`
          );
          return false;
        }

        if (dependencyPath) {
          return true;
        }

        getLogger().warn(
          `⚠️  Warning: Invalid dependency without node_id or path for test '${test.node_id}' (${test.suite_name})`
        );
        return false;
      });

      return {
        ...test,
        depends: validDependencies,
      };
    });
  }

  /**
   * Obtém estatísticas da descoberta
   */
  getDiscoveryStats(tests: DiscoveredTest[]) {
    const stats = {
      total_tests: tests.length,
      by_priority: {} as Record<string, number>,
      total_estimated_duration: 0,
      with_dependencies: 0,
      files_scanned: 0,
    };

    tests.forEach((test) => {
      const priority = test.priority || "medium";
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;

      stats.total_estimated_duration += test.estimated_duration || 0;

      if (test.depends && test.depends.length > 0) {
        stats.with_dependencies++;
      }
    });

    return stats;
  }

  /**
   * Valida se um arquivo é um teste válido sem carregá-lo completamente
   */
  async isValidTestFile(filePath: string): Promise<boolean> {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const firstLines = fileContent.split("\n").slice(0, 10).join("\n");

      // Verifica se tem estrutura básica de um teste
      return firstLines.includes("suite_name") && firstLines.includes("steps");
    } catch (error) {
      return false;
    }
  }

  /**
   * Descobre e organiza testes em grupos lógicos
   */
  async discoverTestGroups(): Promise<Map<string, DiscoveredTest[]>> {
    const tests = await this.discoverTests();
    const groups = new Map<string, DiscoveredTest[]>();

    tests.forEach((test) => {
      // Agrupa por diretório
      const dir = path.dirname(test.file_path);
      const dirName = path.basename(dir);

      if (!groups.has(dirName)) {
        groups.set(dirName, []);
      }
      groups.get(dirName)!.push(test);
    });

    return groups;
  }

  /**
   * Detecta testes órfãos (sem dependências e que ninguém depende)
   */
  findOrphanTests(tests: DiscoveredTest[]): DiscoveredTest[] {
    const allDependencies = new Set<string>();

    // Coleta todas as dependências
    tests.forEach((test) => {
      test.depends?.forEach((dep) => {
        if (dep.node_id) {
          allDependencies.add(dep.node_id);
        }
      });
    });

    return tests.filter((test) => {
      const hasNoDependencies = !test.depends || test.depends.length === 0;
      const nobodyDependsOnIt = !allDependencies.has(test.node_id);

      return hasNoDependencies && nobodyDependsOnIt;
    });
  }
}
