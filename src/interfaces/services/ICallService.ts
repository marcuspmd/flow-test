import type {
  StepCallRequest,
  StepCallResult,
  StepCallExecutionOptions,
} from "../../types/call.types";

/**
 * Interface for the CallService which handles cross-suite step calls.
 *
 * @remarks
 * The CallService is responsible for:
 * - Resolving and loading target test suites
 * - Managing the call stack to prevent infinite recursion
 * - Executing steps from other suites
 * - Managing suite caching for performance
 */
export interface ICallService {
  /**
   * Executes a step call from another test suite.
   *
   * @param request - The step call configuration
   * @param options - Execution options including context and call stack
   * @returns Result of the step execution
   *
   * @example
   * ```typescript
   * const result = await callService.executeStepCall(
   *   {
   *     test: "./auth/login.yaml",
   *     step: "login-step",
   *     variables: { username: "test" }
   *   },
   *   {
   *     callerSuitePath: "/tests/main.yaml",
   *     callStack: []
   *   }
   * );
   * ```
   */
  executeStepCall(
    request: StepCallRequest,
    options: StepCallExecutionOptions
  ): Promise<StepCallResult>;
}
