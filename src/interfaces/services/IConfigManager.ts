/**
 * @fileoverview Configuration manager interface for dependency injection.
 *
 * @remarks
 * Defines the contract for configuration management services in the Flow Test Engine.
 * All services that need access to configuration should depend on this interface.
 *
 * @packageDocumentation
 */

import { EngineConfig, EngineExecutionOptions } from "../../types/engine.types";

/**
 * Configuration manager interface
 *
 * @remarks
 * Provides access to engine configuration including global variables,
 * environment settings, execution options, and runtime overrides.
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.IConfigManager) private configManager: IConfigManager) {}
 *
 *   initialize(): void {
 *     const config = this.configManager.getConfig();
 *     console.log(`Base URL: ${config.base_url}`);
 *     console.log(`Environment: ${config.environment}`);
 *   }
 * }
 * ```
 */
export interface IConfigManager {
  /**
   * Get the complete engine configuration
   *
   * @returns The validated and processed engine configuration
   */
  getConfig(): EngineConfig;

  /**
   * Get global variables defined in configuration
   *
   * @returns Record of global variable names to values
   */
  getGlobalVariables(): Record<string, any>;

  /**
   * Check if strategy pattern is enabled for a feature
   *
   * @returns True if strategy pattern is enabled
   */
  isStrategyPatternEnabled(): boolean;

  /**
   * Get runtime filters (priorities, tags, etc.)
   *
   * @returns Filter configuration object
   */
  getRuntimeFilters(): any;

  /**
   * Reload configuration from file
   *
   * Useful for hot-reloading configuration during development
   */
  reload(): void;

  /**
   * Save current configuration to debug file
   *
   * @param outputPath - Path where to save the debug configuration
   */
  saveDebugConfig(outputPath: string): void;
}
