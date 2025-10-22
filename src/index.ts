/**
 * @fileoverview Flow Test Engine v1.0 - Main API package for programmatic usage.
 *
 * @remarks
 * This module exports all classes, types, and functions necessary to integrate
 * the Flow Test Engine into applications or custom scripts. It provides both
 * direct class access and convenience functions for common use cases.
 *
 * **Package Organization:**
 * - **Core Classes**: FlowTestEngine, ConfigManager, TestDiscovery
 * - **Service Classes**: HTTP, Assertion, Variable, and Reporting services
 * - **Type Definitions**: Complete TypeScript interfaces and types
 * - **Convenience Functions**: Quick-start functions for common scenarios
 *
 * @example Basic programmatic usage
 * ```typescript
 * import { FlowTestEngine } from 'flow-test-engine';
 *
 * // Direct class usage
 * const engine = new FlowTestEngine('./config.yml');
 * const result = await engine.run();
 *
 * if (result.success_rate >= 95) {
 *   console.log('✅ Tests passed successfully');
 *   process.exit(0);
 * } else {
 *   console.log('❌ Some tests failed');
 *   process.exit(1);
 * }
 * ```
 *
 * @example Using convenience functions
 * ```typescript
 * import { runTests, planTests, createEngine } from 'flow-test-engine';
 *
 * // One-shot test execution
 * const result = await runTests('./config.yml');
 * console.log(`Success rate: ${result.success_rate}%`);
 *
 * // Dry run for planning
 * const plan = await planTests('./config.yml');
 * console.log(`Found ${plan.length} test suites to execute`);
 *
 * // Engine creation with default settings
 * const engine = createEngine('./config.yml');
 * ```
 *
 * @example Advanced integration with monitoring
 * ```typescript
 * import { FlowTestEngine, EngineHooks } from 'flow-test-engine';
 *
 * const hooks: EngineHooks = {
 *   onExecutionStart: (stats) => {
 *     console.log(`🚀 Starting ${stats.tests_discovered} tests`);
 *   },
 *   onSuiteEnd: (suite, result) => {
 *     const status = result.status === 'success' ? '✅' : '❌';
 *     console.log(`${status} ${suite.suite_name}`);
 *   },
 *   onExecutionEnd: (result) => {
 *     console.log(`🏁 Completed: ${result.success_rate.toFixed(1)}% success`);
 *   }
 * };
 *
 * const engine = new FlowTestEngine('./config.yml', hooks);
 * const result = await engine.run();
 * ```
 *
 * @public
 * @since 1.0.0
 */

// Export main engine classes
export { FlowTestEngine } from "./core/engine";
export { ConfigManager } from "./core/config";
export { TestDiscovery } from "./core/discovery";

// Export services for advanced usage
export { VariableService } from "./services/variable.service";
export { PriorityService } from "./services/priority";
export { ReportingService } from "./services/reporting";
export { ExecutionService } from "./services/execution";

// Export all type definitions
export * from "./types/engine.types";
export * from "./types/config.types";

// Export legacy compatible services (for migration)
export { HttpService } from "./services/http.service";
export { AssertionService } from "./services/assertion";
export { CaptureService } from "./services/capture.service";

/**
 * Convenience function for quick engine creation with default settings.
 *
 * @remarks
 * Creates a FlowTestEngine instance with minimal configuration,
 * ideal for use in scripts or simple integrations where you need
 * a pre-configured engine instance.
 *
 * @param configPath - Optional path to configuration file. If not provided, uses default discovery.
 * @returns New configured FlowTestEngine instance
 *
 * @example Creating an engine with specific configuration
 * ```typescript
 * const engine = createEngine('./my-config.yml');
 * const result = await engine.run();
 *
 * console.log(`Executed ${result.total_tests} tests`);
 * console.log(`Success rate: ${result.success_rate}%`);
 * ```
 *
 * @example Creating an engine with automatic config discovery
 * ```typescript
 * // Uses default config file discovery (flow-test.config.yml, etc.)
 * const engine = createEngine();
 * const result = await engine.run();
 * ```
 *
 * @public
 */
export function createEngine(configPath?: string) {
  const { FlowTestEngine } = require("./core/engine");
  return new FlowTestEngine(configPath);
}

/**
 * Convenience function for one-shot test execution with comprehensive lifecycle management.
 *
 * @remarks
 * Creates an engine, executes all tests, and returns the aggregated results.
 * This is ideal for automation, CI/CD pipelines, and simple test execution
 * scenarios where you want everything handled automatically.
 *
 * The function handles the complete lifecycle: engine creation, configuration
 * loading, test discovery, execution, and result aggregation.
 *
 * @param configPath - Optional path to configuration file. If not provided, uses default discovery.
 * @returns Promise that resolves to the aggregated execution results
 * @throws {Error} When configuration is invalid or critical execution failure occurs
 *
 * @example Simple test execution
 * ```typescript
 * import { runTests } from 'flow-test-engine';
 *
 * // Execute with default configuration
 * const result = await runTests();
 * console.log(`Success rate: ${result.success_rate.toFixed(1)}%`);
 * console.log(`Duration: ${result.total_duration_ms}ms`);
 *
 * // Exit with appropriate code for CI/CD
 * process.exit(result.failed_tests > 0 ? 1 : 0);
 * ```
 *
 * @example Production environment execution
 * ```typescript
 * const result = await runTests('./configs/production.yml');
 *
 * if (result.success_rate < 95) {
 *   console.error(`Test success rate too low: ${result.success_rate}%`);
 *   console.error(`Failed tests: ${result.failed_tests}`);
 *   process.exit(1);
 * }
 *
 * console.log('✅ All tests passed - deployment ready');
 * ```
 *
 * @example Error handling and reporting
 * ```typescript
 * try {
 *   const result = await runTests('./config.yml');
 *
 *   // Generate summary report
 *   console.log('\n📊 Test Execution Summary:');
 *   console.log(`   Total Tests: ${result.total_tests}`);
 *   console.log(`   Successful: ${result.successful_tests}`);
 *   console.log(`   Failed: ${result.failed_tests}`);
 *   console.log(`   Skipped: ${result.skipped_tests}`);
 *   console.log(`   Duration: ${(result.total_duration_ms / 1000).toFixed(1)}s`);
 *
 * } catch (error) {
 *   console.error('❌ Test execution failed:', error.message);
 *   process.exit(2); // Different exit code for execution errors
 * }
 * ```
 *
 * @public
 */
export async function runTests(configPath?: string) {
  const { FlowTestEngine } = require("./core/engine");
  const engine = new FlowTestEngine(configPath);
  return await engine.run();
}

/**
 * Function for dry-run execution (discovery and planning only)
 *
 * Executes only the discovery and planning phases without making actual HTTP requests.
 * This is useful for validating configuration, visualizing execution plans, checking
 * test dependencies, and estimating execution time without running the actual tests.
 *
 * The dry-run process includes:
 * - Test file discovery and parsing
 * - Dependency resolution and validation
 * - Priority-based test ordering
 * - Execution plan generation
 *
 * @param configPath - Optional path to configuration file
 * @returns Promise that resolves to array of discovered and ordered test information
 * @throws {Error} When configuration is invalid or test discovery fails
 *
 * @example Basic dry-run for configuration validation
 * ```typescript
 * import { planTests } from 'flow-test-engine';
 *
 * const plan = await planTests('./config.yml');
 * console.log(`📋 Execution Plan: ${plan.length} tests discovered`);
 *
 * plan.forEach((test, index) => {
 *   console.log(`${index + 1}. ${test.suite_name} (${test.priority})`);
 *   console.log(`   📁 ${test.file_path}`);
 *   console.log(`   ⏱️  Est. Duration: ${test.estimated_duration}ms`);
 * });
 * ```
 *
 * @example Dependency analysis with dry-run
 * ```typescript
 * const tests = await planTests('./config.yml');
 *
 * // Analyze dependencies
 * const testsWithDeps = tests.filter(t => t.depends?.length);
 * console.log(`\n🔗 Dependency Analysis (${testsWithDeps.length} tests have dependencies):`);
 *
 * testsWithDeps.forEach(test => {
 *   console.log(`${test.suite_name}:`);
 *   test.depends?.forEach(dep => {
 *     const depTest = tests.find(t => t.node_id === dep.node_id);
 *     if (depTest) {
 *       console.log(`  ↳ depends on: ${depTest.suite_name}`);
 *     } else {
 *       console.log(`  ⚠️  missing dependency: ${dep}`);
 *     }
 *   });
 * });
 * ```
 *
 * @example Execution time estimation
 * ```typescript
 * const plan = await planTests('./config.yml');
 *
 * const totalEstimatedTime = plan.reduce((sum, test) => {
 *   return sum + (test.estimated_duration || 0);
 * }, 0);
 *
 * console.log(`⏱️  Estimated execution time: ${(totalEstimatedTime / 1000).toFixed(1)}s`);
 *
 * const priorityBreakdown = plan.reduce((acc, test) => {
 *   const priority = test.priority || 'medium';
 *   acc[priority] = (acc[priority] || 0) + 1;
 *   return acc;
 * }, {} as Record<string, number>);
 *
 * console.log('🏷️  Priority breakdown:', priorityBreakdown);
 * ```
 *
 * @public
 */
export async function planTests(configPath?: string) {
  const { FlowTestEngine } = require("./core/engine");
  const engine = new FlowTestEngine(configPath);
  return await engine.dryRun();
}

/**
 * Package information and metadata sourced from package.json
 *
 * Metadata about the Flow Test Engine including name, version, and description.
 * Useful for integration with tools that need to identify the version or
 * display package information.
 *
 * @example Displaying package information
 * ```typescript
 * import { PACKAGE_INFO } from 'flow-test-engine';
 *
 * console.log(`Using ${PACKAGE_INFO.name} v${PACKAGE_INFO.version}`);
 * console.log(`Description: ${PACKAGE_INFO.description}`);
 * ```
 *
 * @example Version checking in CI/CD
 * ```typescript
 * if (PACKAGE_INFO.version.startsWith('1.')) {
 *   console.log('Using stable v1.x release');
 * } else {
 *   console.warn('Using pre-release version');
 * }
 * ```
 *
 * @public
 */
const packageMetadata = require("../package.json");

export const PACKAGE_INFO = {
  name: packageMetadata.name,
  version: packageMetadata.version,
  description: packageMetadata.description,
} as const;
