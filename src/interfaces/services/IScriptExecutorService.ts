import type {
  ScriptConfig,
  PreRequestScriptContext,
  PostRequestScriptContext,
} from "../../types/common.types";

/**
 * Result of script execution including any variables set during execution.
 */
export interface ScriptExecutionResult {
  success: boolean;
  variables: Record<string, any>;
  execution_time_ms: number;
  error?: string;
  console_output?: string[];
  modified_request?: any;
}

/**
 * Interface for the ScriptExecutorService which executes pre/post request scripts.
 *
 * @remarks
 * The ScriptExecutorService is responsible for:
 * - Executing JavaScript scripts in a sandboxed environment
 * - Providing access to test context (variables, request, response)
 * - Capturing script output and errors
 * - Managing script timeouts
 */
export interface IScriptExecutorService {
  /**
   * Executes a pre-request script before an HTTP request is made.
   *
   * @param config - Script configuration
   * @param variables - Current variable context
   * @param request - The HTTP request object that can be modified
   * @param suiteFilePath - Optional path to the suite file for relative script paths
   * @returns Result of script execution including any captured variables
   *
   * @example
   * ```typescript
   * const result = await scriptExecutor.executePreRequestScript(
   *   { inline: "request.headers['X-Custom'] = 'value';" },
   *   { token: "abc123" },
   *   { method: "GET", url: "/api/test" }
   * );
   * ```
   */
  executePreRequestScript(
    config: ScriptConfig,
    variables: Record<string, any>,
    request: PreRequestScriptContext["request"],
    suiteFilePath?: string
  ): Promise<ScriptExecutionResult>;

  /**
   * Executes a post-request script after an HTTP response is received.
   *
   * @param config - Script configuration
   * @param variables - Current variable context
   * @param request - The HTTP request object for context
   * @param response - The HTTP response object
   * @param suiteFilePath - Optional path to the suite file for relative script paths
   * @returns Result of script execution including any captured variables
   *
   * @example
   * ```typescript
   * const result = await scriptExecutor.executePostRequestScript(
   *   { inline: "const token = response.body.access_token;" },
   *   {},
   *   { method: "POST", url: "/auth/login" },
   *   { status: 200, body: { access_token: "xyz" } }
   * );
   * ```
   */
  executePostRequestScript(
    config: ScriptConfig,
    variables: Record<string, any>,
    request: PostRequestScriptContext["request"],
    response: PostRequestScriptContext["response"],
    suiteFilePath?: string
  ): Promise<ScriptExecutionResult>;
}
