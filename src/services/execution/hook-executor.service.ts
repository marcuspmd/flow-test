/**
 * @fileoverview Hook execution service for lifecycle hooks system.
 *
 * @remarks
 * This module provides the HookExecutorService class which processes and executes
 * lifecycle hooks at various points in the test execution flow. It handles all
 * hook actions including compute, validate, log, metric, script, call, and wait.
 *
 * @packageDocumentation
 */

import {
  HookAction,
  HookExecutionContext,
  HookExecutionResult,
  HookLogLevel,
  HookMetricConfig,
  HookValidationSeverity,
} from "../../types/hook.types";
import { injectable, inject, optional } from "inversify";
import { getLogger } from "../logger.service";
import { ErrorHandler } from "../../utils";
import { TYPES } from "../../di/identifiers";
import type { IHookExecutorService } from "../../interfaces/services/IHookExecutorService";
import type { IVariableService } from "../../interfaces/services/IVariableService";
import type { IJavaScriptService } from "../../interfaces/services/IJavaScriptService";
import type { ICallService } from "../../interfaces/services/ICallService";

/**
 * Service responsible for executing lifecycle hooks
 *
 * @remarks
 * The HookExecutorService processes HookAction configurations and executes
 * them in the appropriate lifecycle context. It supports multiple action types
 * and ensures proper error handling and result aggregation.
 *
 * **Supported Actions:**
 * - `compute`: Calculate variables using interpolation/JavaScript
 * - `validate`: Validate conditions with custom error messages
 * - `log`: Emit structured log messages
 * - `metric`: Track custom metrics and telemetry
 * - `script`: Execute arbitrary JavaScript code
 * - `call`: Invoke another step or suite
 * - `wait`: Introduce delays in execution
 *
 * @example Basic usage
 * ```typescript
 * const executor = new HookExecutorService(variableService, javascriptService);
 *
 * const context: HookExecutionContext = {
 *   stepName: "Login",
 *   stepIndex: 0,
 *   variables: { username: "test@example.com" }
 * };
 *
 * const hooks: HookAction[] = [
 *   {
 *     compute: { timestamp: "{{$js:Date.now()}}" },
 *     log: { message: "Starting login for {{username}}" }
 *   }
 * ];
 *
 * const result = await executor.executeHooks(hooks, context);
 * ```
 *
 * @public
 * @since 2.0.0
 */
@injectable()
export class HookExecutorService implements IHookExecutorService {
  private logger = getLogger();

  /**
   * Creates a new HookExecutorService instance
   *
   * @param variableService - Service for variable interpolation
   * @param javascriptService - Service for JavaScript execution
   * @param callService - Optional service for step/suite calls
   */
  constructor(
    @inject(TYPES.IVariableService)
    private readonly variableService: IVariableService,
    @inject(TYPES.IJavaScriptService)
    private readonly javascriptService: IJavaScriptService,
    @inject(TYPES.ICallService)
    @optional()
    private readonly callService?: ICallService
  ) {}

  /**
   * Execute an array of hook actions
   *
   * @param hooks - Array of hook actions to execute
   * @param context - Execution context with variables and state
   * @returns Aggregated result of all hook executions
   *
   * @example
   * ```typescript
   * const result = await executor.executeHooks([
   *   { compute: { id: "{{$js:crypto.randomUUID()}}" } },
   *   { log: { message: "Generated ID: {{id}}" } }
   * ], context);
   *
   * if (!result.success) {
   *   console.error("Hook execution failed:", result.error);
   * }
   * ```
   */
  async executeHooks(
    hooks: HookAction[],
    context: HookExecutionContext
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const result: HookExecutionResult = {
      success: true,
      computedVariables: {},
      validations: { passed: true, failures: [] },
      metrics: [],
      logs: [],
      duration_ms: 0,
    };

    try {
      // Execute each hook action sequentially
      for (const hook of hooks) {
        const hookResult = await this.executeHook(hook, context);

        // Merge results
        Object.assign(result.computedVariables, hookResult.computedVariables);
        result.validations.failures.push(...hookResult.validations.failures);
        result.metrics.push(...hookResult.metrics);
        result.logs.push(...hookResult.logs);

        // Update validation status
        if (!hookResult.validations.passed) {
          result.validations.passed = false;
          // Note: Validations don't fail hook execution, they just accumulate
          // The caller can decide what to do with validation failures
        }

        // If hook execution failed, stop
        if (!hookResult.success) {
          result.success = false;
          result.error = hookResult.error;
          break;
        }

        // Update context with computed variables for next hook
        Object.assign(context.variables, result.computedVariables);
      }
    } catch (error) {
      result.success = false;
      result.error = `Hook execution error: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(`Hook execution failed: ${result.error}`, {
        stepName: context.stepName,
      });
    }

    result.duration_ms = Date.now() - startTime;
    return result;
  }

  /**
   * Execute a single hook action
   *
   * @param hook - Hook action configuration
   * @param context - Execution context
   * @returns Result of this specific hook action
   *
   * @public
   */
  async executeHook(
    hook: HookAction,
    context: HookExecutionContext
  ): Promise<HookExecutionResult> {
    const result: HookExecutionResult = {
      success: true,
      computedVariables: {},
      validations: { passed: true, failures: [] },
      metrics: [],
      logs: [],
      duration_ms: 0,
    };

    const startTime = Date.now();

    try {
      // 1. Execute compute action
      if (hook.compute) {
        const computed = await this.executeCompute(hook.compute, context);
        Object.assign(result.computedVariables, computed);

        // Store computed variables in VariableService
        for (const [key, value] of Object.entries(computed)) {
          this.variableService.setRuntimeVariable(key, value);
        }
      }

      // 2. Execute validate action
      if (hook.validate) {
        const validation = await this.executeValidate(hook.validate, context);
        result.validations = validation;
      }

      // 3. Execute log action
      if (hook.log) {
        const log = await this.executeLog(hook.log, context);
        result.logs.push(log);
      }

      // 4. Execute metric action
      if (hook.metric) {
        const metric = await this.executeMetric(hook.metric, context);
        result.metrics.push(metric);
      }

      // 5. Execute script action
      if (hook.script) {
        // Just execute the script, don't store result in computed variables
        // Scripts can modify context directly if needed
        await this.executeScript(hook.script, context);
      }

      // 6. Execute call action
      if (hook.call) {
        if (!this.callService) {
          throw new Error("CallService not available for hook call action");
        }
        await this.executeCall(hook.call, context);
      }

      // 7. Execute wait action
      if (hook.wait !== undefined) {
        await this.executeWait(hook.wait);
      }
    } catch (error) {
      // Propagate all errors - don't swallow them
      result.success = false;
      result.error = `Hook action failed: ${
        error instanceof Error ? error.message : String(error)
      }`;

      this.logger.warn(
        `[Hook] Hook action encountered issues: ${result.error}`,
        {
          stepName: context.stepName,
        }
      );
    }

    result.duration_ms = Date.now() - startTime;
    return result;
  }

  /**
   * Execute compute action - calculate and store variables
   *
   * @param compute - Record of variable names to expressions
   * @param context - Execution context
   * @returns Computed variables
   *
   * @internal
   */
  private async executeCompute(
    compute: Record<string, string>,
    context: HookExecutionContext
  ): Promise<Record<string, any>> {
    const computed: Record<string, any> = {};

    for (const [key, expression] of Object.entries(compute)) {
      try {
        // Interpolate the expression using VariableService
        const value = this.variableService.interpolate(expression);
        computed[key] = value;

        this.logger.debug(`[Hook] Computed variable: ${key} = ${value}`, {
          stepName: context.stepName,
        });
      } catch (error) {
        this.logger.warn(
          `[Hook] Failed to compute ${key}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { stepName: context.stepName }
        );
        // Continue with other computations
      }
    }

    return computed;
  }

  /**
   * Execute validate action - check conditions
   *
   * @param validations - Array of validation rules
   * @param context - Execution context
   * @returns Validation results
   *
   * @internal
   */
  private async executeValidate(
    validations: Array<{
      expression: string;
      message?: string;
      severity?: HookValidationSeverity;
    }>,
    context: HookExecutionContext
  ): Promise<{
    passed: boolean;
    failures: Array<{
      expression: string;
      message: string;
      severity: HookValidationSeverity;
    }>;
  }> {
    const result = {
      passed: true,
      failures: [] as Array<{
        expression: string;
        message: string;
        severity: HookValidationSeverity;
      }>,
    };

    for (const validation of validations) {
      try {
        // Interpolate the expression first
        const interpolatedExpr = this.variableService.interpolate(
          validation.expression
        );

        // Evaluate as JavaScript expression
        const passed = this.javascriptService.executeExpression(
          interpolatedExpr,
          {
            variables: context.variables,
            response: context.response,
          }
        );

        if (!passed) {
          const severity = validation.severity || "error";
          const message =
            validation.message || `Validation failed: ${validation.expression}`;

          result.failures.push({
            expression: validation.expression,
            message,
            severity,
          });

          // Mark as failed regardless of severity
          result.passed = false;

          const logMethod = severity === "error" ? "error" : "warn";
          this.logger[logMethod](`[Hook] Validation failed: ${message}`, {
            stepName: context.stepName,
            metadata: { expression: validation.expression },
          });
        } else {
          this.logger.debug(
            `[Hook] Validation passed: ${validation.expression}`,
            {
              stepName: context.stepName,
            }
          );
        }
      } catch (error) {
        const message = `Validation error: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.failures.push({
          expression: validation.expression,
          message,
          severity: "error",
        });
        result.passed = false;

        this.logger.error(`[Hook] ${message}`, {
          stepName: context.stepName,
          metadata: { expression: validation.expression },
        });
      }
    }

    return result;
  }

  /**
   * Execute log action - emit structured log
   *
   * @param logConfig - Log configuration
   * @param context - Execution context
   * @returns Log entry
   *
   * @internal
   */
  private async executeLog(
    logConfig: {
      level?: HookLogLevel;
      message: string;
      metadata?: Record<string, any>;
    },
    context: HookExecutionContext
  ): Promise<{
    level: HookLogLevel;
    message: string;
    metadata?: Record<string, any>;
    timestamp: number;
  }> {
    const level = logConfig.level || "info";

    // Interpolate message
    const message = this.variableService.interpolate(logConfig.message);

    // Interpolate metadata if present
    let metadata = logConfig.metadata;
    if (metadata) {
      metadata = Object.entries(metadata).reduce((acc, [key, value]) => {
        acc[key] =
          typeof value === "string"
            ? this.variableService.interpolate(value)
            : value;
        return acc;
      }, {} as Record<string, any>);
    }

    // Emit log
    this.logger[level](`[Hook] ${message}`, {
      stepName: context.stepName,
      ...metadata,
    });

    return {
      level,
      message,
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
      timestamp: Date.now(),
    };
  }

  /**
   * Execute metric action - emit telemetry
   *
   * @param metricConfig - Metric configuration
   * @param context - Execution context
   * @returns Metric data
   *
   * @internal
   */
  private async executeMetric(
    metricConfig: {
      name: string;
      value: any;
      tags?: Record<string, string>;
      timestamp?: number;
    },
    context: HookExecutionContext
  ): Promise<HookMetricConfig> {
    // Interpolate metric values
    const name = this.variableService.interpolate(metricConfig.name);
    let value: any = this.variableService.interpolate(
      String(metricConfig.value)
    );

    // Try to convert back to number if it was originally a number
    if (typeof metricConfig.value === "number" || !isNaN(Number(value))) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        value = numValue;
      }
    }

    let tags = metricConfig.tags;
    if (tags) {
      tags = Object.entries(tags).reduce((acc, [key, val]) => {
        acc[key] = this.variableService.interpolate(val);
        return acc;
      }, {} as Record<string, string>);
    }

    const metric: HookMetricConfig = {
      name,
      value,
      ...(tags ? { tags } : {}),
      ...(metricConfig.timestamp ? { timestamp: metricConfig.timestamp } : {}),
    };

    this.logger.info(`[Hook] Metric: ${name} = ${value}`, {
      stepName: context.stepName,
      metadata: { tags },
    });

    return metric;
  }

  /**
   * Execute script action - run arbitrary JavaScript
   *
   * @param script - JavaScript code to execute
   * @param context - Execution context
   * @returns Script result
   *
   * @internal
   */
  private async executeScript(
    script: string,
    context: HookExecutionContext
  ): Promise<any> {
    return ErrorHandler.handle(
      () => {
        // Execute JavaScript in context
        const result = this.javascriptService.executeExpression(
          script,
          {
            variables: context.variables,
            response: context.response,
          },
          true // asCodeBlock
        );

        this.logger.debug(`[Hook] Script executed successfully`, {
          stepName: context.stepName,
          metadata: { result },
        });

        return result;
      },
      {
        logger: this.logger,
        message: "Failed to execute hook script",
        context: { stepName: context.stepName },
        rethrow: true,
      }
    );
  }

  /**
   * Execute call action - invoke another step/suite
   *
   * @param callConfig - Call configuration
   * @param context - Execution context
   *
   * @internal
   */
  private async executeCall(
    callConfig: any,
    context: HookExecutionContext
  ): Promise<void> {
    // callService is guaranteed to exist at this point (checked in executeHookAction)
    if (!this.callService) {
      throw new Error("CallService not available");
    }

    this.logger.info(`[Hook] Calling step/suite: ${callConfig.test}`, {
      stepName: context.stepName,
    });

    // Execute the call
    // Note: Implementation depends on CallService interface
    // This is a placeholder that needs to be properly integrated
    await this.callService.executeStepCall(callConfig, {
      callerSuitePath: "", // Need to pass from context
      variables: context.variables,
    } as any);
  }

  /**
   * Execute wait action - introduce delay
   *
   * @param milliseconds - Time to wait in milliseconds
   *
   * @internal
   */
  private async executeWait(milliseconds: number): Promise<void> {
    this.logger.debug(`[Hook] Waiting ${milliseconds}ms`);
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
