/**
 * @fileoverview Variable context management service implementation
 * @module services/execution/variable-context-manager
 */

import { injectable, inject } from "inversify";
import { TYPES } from "../../di/identifiers";
import type {
  IVariableContextManager,
  VariableScope,
  VariableContextSnapshot,
} from "../../interfaces/services/IVariableContextManager";
import type { ILogger } from "../../interfaces/services/ILogger";
import type { IVariableService } from "../../interfaces/services/IVariableService";
import type { IGlobalRegistryService } from "../../interfaces/services/IGlobalRegistryService";
import type {
  TestSuite,
  DiscoveredTest,
  DependencyResult,
  StepExecutionResult,
} from "../../types/engine.types";
import {
  maskSensitiveVariables,
  smartFilterAndMask,
} from "../../utils/variable-masking.utils";

/**
 * Service responsible for managing variable contexts and scopes
 *
 * @remarks
 * Manages the complete lifecycle of variables including:
 * - Context initialization/cleanup for suites
 * - Export registration and retrieval
 * - Variable filtering and masking for security
 * - Cache restoration
 *
 * @public
 */
@injectable()
export class VariableContextManager implements IVariableContextManager {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IVariableService) private variableService: IVariableService,
    @inject(TYPES.IGlobalRegistryService)
    private globalRegistry: IGlobalRegistryService
  ) {}

  /**
   * Initialize variable context for a test suite
   */
  initializeContext(suite: TestSuite, test: DiscoveredTest): void {
    this.logger.debug(
      `Initializing variable context for suite '${suite.suite_name}'`
    );

    // Set suite-level variables
    if (suite.variables) {
      // Interpolate and set suite variables in batch
      const interpolatedVars: Record<string, any> = {};

      for (const [key, value] of Object.entries(suite.variables)) {
        const interpolatedValue =
          typeof value === "string"
            ? this.variableService.interpolateString(value)
            : value;
        interpolatedVars[key] = interpolatedValue;
      }

      this.variableService.setSuiteVariables(interpolatedVars);

      this.logger.debug(
        `Initialized ${Object.keys(suite.variables).length} suite variables`,
        { metadata: { type: "internal_debug", internal: true } }
      );
    }

    // Setup base_url if provided
    if (suite.base_url) {
      const interpolatedBaseUrl = this.variableService.interpolateString(
        suite.base_url
      );
      this.variableService.setRuntimeVariable("base_url", interpolatedBaseUrl);
      this.logger.debug(`Set base_url: ${interpolatedBaseUrl}`);
    }
  }

  /**
   * Cleanup variable context after suite execution
   */
  cleanupContext(suite: TestSuite, preserveExports: boolean = false): void {
    this.logger.debug(
      `Cleaning up variable context for suite '${suite.suite_name}' (preserveExports: ${preserveExports})`
    );

    // Clear suite-specific variables
    // Note: Runtime variables are typically cleared between suites
    // Global exports are preserved in GlobalRegistry

    // Reset runtime variables for next suite
    this.variableService.clearRuntimeVariables();

    if (!preserveExports) {
      // If not preserving exports, also clear suite variables
      this.variableService.clearSuiteVariables();
    }
  }

  /**
   * Register suite exports in global registry
   */
  registerExports(
    test: DiscoveredTest,
    variables: Record<string, any>,
    exports?: string[]
  ): void {
    const exportList = exports || test.exports || [];
    const optionalExports = test.exports_optional || [];

    const hasRequiredExports = exportList.length > 0;
    const hasOptionalExports = optionalExports.length > 0;

    if (!hasRequiredExports && !hasOptionalExports) {
      return;
    }

    this.logger.debug(
      `[EXPORT DEBUG] Node '${test.node_id}' - Registering exports: [${[
        ...exportList,
        ...optionalExports,
      ].join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );

    // Get all available variables from multiple sources
    const allVars = this.variableService.getAllVariables();
    const runtimeVars = this.variableService.getVariablesByScope("runtime");

    // Merge all sources with correct precedence:
    // 1. Start with provided variables (captured from steps)
    // 2. Override with allVars (includes suite, input, etc.)
    // 3. Override with runtime vars (highest priority)
    const allAvailableVars = { ...variables, ...allVars, ...runtimeVars };

    this.logger.debug(
      `[EXPORT DEBUG] Total available vars: ${
        Object.keys(allAvailableVars).length
      } - [${Object.keys(allAvailableVars).join(", ")}]`,
      { metadata: { type: "internal_debug", internal: true } }
    );

    // Process required exports (with warnings)
    if (hasRequiredExports) {
      for (const exportName of exportList) {
        const value = allAvailableVars[exportName];

        if (value !== undefined) {
          this.globalRegistry.setExportedVariable(
            test.node_id,
            exportName,
            value
          );
          this.logger.debug(
            `[EXPORT DEBUG] Successfully exported '${exportName}' = ${JSON.stringify(
              value
            )?.substring(0, 100)}`,
            { metadata: { type: "internal_debug", internal: true } }
          );
        } else {
          this.logger.warn(
            `Export '${exportName}' not found in captured variables for suite '${test.suite_name}'`
          );
        }
      }
    }

    // Process optional exports (no warnings)
    if (hasOptionalExports) {
      for (const exportName of optionalExports) {
        const value = allAvailableVars[exportName];

        if (value !== undefined) {
          this.globalRegistry.setExportedVariable(
            test.node_id,
            exportName,
            value
          );
          this.logger.debug(
            `Optional export '${exportName}' found and registered for suite '${test.suite_name}'`
          );
        }
      }
    }
  }

  /**
   * Restore exported variables from cached result
   */
  restoreExportsFromCache(cachedResult: DependencyResult): void {
    if (!cachedResult.exportedVariables) {
      return;
    }

    this.logger.debug(
      `Restoring ${
        Object.keys(cachedResult.exportedVariables).length
      } exported variables from cache`
    );

    Object.entries(cachedResult.exportedVariables).forEach(([key, value]) => {
      this.globalRegistry.setExportedVariable(cachedResult.nodeId, key, value);
    });
  }

  /**
   * Get all captured variables for export
   */
  getAllCapturedVariables(
    stepResults: StepExecutionResult[]
  ): Record<string, any> {
    const allCaptured: Record<string, any> = {};

    for (const stepResult of stepResults) {
      if (stepResult.captured_variables) {
        Object.assign(allCaptured, stepResult.captured_variables);
      }
    }

    return allCaptured;
  }

  /**
   * Get exported variables for a test
   */
  getExportedVariables(test: DiscoveredTest): Record<string, any> {
    const exports = test.exports || [];
    const optionalExports = test.exports_optional || [];
    const allExports = [...exports, ...optionalExports];

    if (allExports.length === 0) {
      return {};
    }

    const exportedVars: Record<string, any> = {};

    for (const exportName of allExports) {
      const fullName = `${test.node_id}.${exportName}`;
      const value = this.globalRegistry.getExportedVariable(fullName);
      if (value !== undefined) {
        exportedVars[exportName] = value;
      }
    }

    return exportedVars;
  }

  /**
   * Filter and mask sensitive variables for logging
   */
  filterAndMaskVariables(
    variables: Record<string, any>,
    context?: { stepName?: string }
  ): Record<string, any> {
    // Get environment variables to exclude
    const envVarsToExclude = this.getEnvironmentVariablesToExclude();

    // Filter out environment variables
    const filtered = Object.fromEntries(
      Object.entries(variables).filter(([key]) => !envVarsToExclude.has(key))
    );

    // Apply smart masking for sensitive data
    return smartFilterAndMask(
      filtered,
      context ? { stepName: context.stepName } : undefined
    );
  }

  /**
   * Get current variable context snapshot
   */
  getContextSnapshot(): VariableContextSnapshot {
    const allVariables = this.variableService.getAllVariables();

    return {
      allVariables,
      byScope: new Map([
        ["global", this.variableService.getVariablesByScope("global")],
        ["suite", this.variableService.getVariablesByScope("suite")],
        ["runtime", this.variableService.getVariablesByScope("runtime")],
        ["imported", this.variableService.getVariablesByScope("imported")],
      ]),
      exports: {}, // Global registry doesn't expose getGlobalVariables - would need to track separately
    };
  }

  /**
   * Process captured variables after step execution
   */
  processCapturedVariables(
    capturedVariables: Record<string, any>,
    scope: VariableScope = "runtime"
  ): void {
    // For now, all captured variables go to runtime scope
    // Future: Could extend IVariableService to support more granular scope control
    Object.entries(capturedVariables).forEach(([key, value]) => {
      this.variableService.setRuntimeVariable(key, value);
    });

    this.logger.debug(
      `Processed ${
        Object.keys(capturedVariables).length
      } captured variables into scope '${scope}'`
    );
  }

  /**
   * Get environment variables to exclude from filtering
   */
  private getEnvironmentVariablesToExclude(): Set<string> {
    const excludeSet = new Set<string>();

    // Get all variables
    const allVars = this.variableService.getAllVariables();

    // Find variables that look like environment variables
    for (const key of Object.keys(allVars)) {
      // Check if it's an environment variable pattern
      if (key.startsWith("FLOW_TEST_") || key.startsWith("NODE_")) {
        excludeSet.add(key);
      }
    }

    return excludeSet;
  }
}
