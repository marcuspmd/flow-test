/**
 * @fileoverview Environment variable interpolation strategy.
 *
 * @remarks
 * Handles {{$env.VAR_NAME}} expressions by resolving from process.env
 *
 * @packageDocumentation
 */

import {
  InterpolationStrategy,
  InterpolationStrategyContext,
  InterpolationResult,
} from "../interpolation-strategy.interface";
import type { ILogger } from "../../../interfaces/services/ILogger";

/**
 * No-op logger for strategies (avoids test pollution)
 */
const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
const noopLogger: ILogger = {
  debug: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.debug(msg, ...args);
  },
  info: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.log(msg, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.warn(msg, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    if (!isTestEnv) console.error(msg, ...args);
  },
  setLogLevel: () => {},
  getLogLevel: () => "info",
};

/**
 * Strategy for resolving environment variables
 *
 * @remarks
 * Handles expressions like {{$env.API_KEY}} or {{$env.DATABASE_URL}}
 * Priority: 10 (highest - environment should override everything)
 *
 * @example
 * ```typescript
 * const strategy = new EnvironmentVariableStrategy();
 * const result = strategy.resolve('$env.API_KEY', context);
 * // Returns value from process.env.API_KEY
 * ```
 *
 * @public
 */
export class EnvironmentVariableStrategy implements InterpolationStrategy {
  readonly name = "EnvironmentVariable";
  readonly priority = 10;

  constructor(private logger: ILogger = noopLogger) {}

  canHandle(expression: string): boolean {
    return expression.startsWith("$env.");
  }

  resolve(
    expression: string,
    context: InterpolationStrategyContext
  ): InterpolationResult {
    if (!this.canHandle(expression)) {
      return { canHandle: false, success: false };
    }

    try {
      const envVarName = expression.substring(5); // Remove "$env."
      const value = process.env[envVarName];

      if (context.debug) {
        this.logger.debug(
          `[${this.name}] Resolved ${envVarName} = ${value ?? "undefined"}`
        );
      }

      // IMPORTANT: Return null for missing environment variables
      // This ensures test expectations are met and provides clear semantics
      if (value === undefined) {
        return {
          canHandle: true,
          success: true, // Still successful resolution, value is explicitly null
          value: null,
        };
      }

      return {
        canHandle: true,
        success: true,
        value: value,
      };
    } catch (error) {
      return {
        canHandle: true,
        success: false,
        error: `Failed to resolve environment variable: ${error}`,
      };
    }
  }
}
