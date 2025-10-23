import type {
  HookAction,
  HookExecutionContext,
  HookExecutionResult,
} from "../../types/hook.types";

/**
 * Interface for the HookExecutorService which processes and executes lifecycle hooks.
 *
 * @remarks
 * The HookExecutorService is responsible for:
 * - Executing lifecycle hooks at various points in test execution
 * - Processing all hook actions (compute, validate, log, metric, script, call, wait)
 * - Managing hook execution context and results
 * - Handling errors and validation failures
 *
 * @since 2.0.0
 */
export interface IHookExecutorService {
  /**
   * Execute an array of hook actions in sequence.
   *
   * @param hooks - Array of hook actions to execute
   * @param context - Execution context with variables and state
   * @returns Aggregated result of all hook executions
   *
   * @example
   * ```typescript
   * const result = await hookExecutor.executeHooks(
   *   [
   *     { compute: { timestamp: "{{$js:Date.now()}}" } },
   *     { validate: [{ expression: "timestamp > 0", message: "Invalid timestamp" }] },
   *     { log: { message: "Timestamp: {{timestamp}}" } }
   *   ],
   *   {
   *     stepName: "Setup",
   *     variables: {},
   *     point: "pre_request"
   *   }
   * );
   * ```
   */
  executeHooks(
    hooks: HookAction[],
    context: HookExecutionContext
  ): Promise<HookExecutionResult>;

  /**
   * Execute a single hook action.
   *
   * @param hook - Single hook action to execute
   * @param context - Execution context with variables and state
   * @returns Result of the hook execution
   *
   * @example
   * ```typescript
   * const result = await hookExecutor.executeHook(
   *   { compute: { user_id: "{{$js:Math.floor(Math.random() * 1000)}}" } },
   *   context
   * );
   * ```
   */
  executeHook(
    hook: HookAction,
    context: HookExecutionContext
  ): Promise<HookExecutionResult>;
}
