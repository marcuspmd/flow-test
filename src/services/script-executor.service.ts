import { injectable, inject } from "inversify";
import vm from "vm";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import { faker } from "@faker-js/faker";
import {
  ScriptConfig,
  PreRequestScriptContext,
  PostRequestScriptContext,
} from "../types/common.types";
import { LoggerService } from "./logger.service";
import type { IScriptExecutorService } from "../interfaces/services/IScriptExecutorService";
import { TYPES } from "../di/identifiers";
import type { ILogger } from "../interfaces/services/ILogger";

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

interface SandboxOptions {
  variables: Record<string, any>;
  capturedVariables: Record<string, any>;
  consoleOutput: string[];
  additionalGlobals?: Record<string, any>;
}

@injectable()
export class ScriptExecutorService implements IScriptExecutorService {
  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {}

  async executePreRequestScript(
    config: ScriptConfig,
    variables: Record<string, any>,
    request: PreRequestScriptContext["request"],
    suiteFilePath?: string
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const timeout = config.timeout ?? 5000;
    const consoleOutput: string[] = [];
    const capturedVariables: Record<string, any> = {};
    const sandboxRequest = this.cloneValue(request ?? {});

    try {
      this.logger.debug("Executing pre-request script...");

      const scriptCode = await this.getScriptCode(config, suiteFilePath);
      const { context, sandbox } = this.buildSandbox({
        variables,
        capturedVariables,
        consoleOutput,
        additionalGlobals: {
          request: sandboxRequest,
        },
      });

      this.runInSandbox(scriptCode, context, timeout);

      const executionTime = Date.now() - startTime;
      const modifiedRequest = this.cloneValue(sandbox.request);

      this.logger.debug(
        `Pre-request script executed successfully in ${executionTime}ms`
      );

      return {
        success: true,
        variables: capturedVariables,
        execution_time_ms: executionTime,
        console_output: consoleOutput,
        modified_request: modifiedRequest,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Pre-request script failed: ${errorMessage}`);

      if (consoleOutput.length > 0) {
        this.logger.debug(
          `Console output before failure:\n${consoleOutput.join("\n")}`
        );
      }

      if (config.continue_on_error) {
        this.logger.warn(
          "Continuing execution despite script failure (continue_on_error=true)"
        );
        return {
          success: false,
          variables: {},
          execution_time_ms: executionTime,
          error: errorMessage,
          console_output: consoleOutput,
        };
      }

      throw new Error(`Pre-request script execution failed: ${errorMessage}`);
    }
  }

  async executePostRequestScript(
    config: ScriptConfig,
    variables: Record<string, any>,
    request: PostRequestScriptContext["request"],
    response: PostRequestScriptContext["response"],
    suiteFilePath?: string
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const timeout = config.timeout ?? 5000;
    const consoleOutput: string[] = [];
    const capturedVariables: Record<string, any> = {};
    const sandboxRequest = this.cloneValue(request ?? {});
    const sandboxResponse = this.cloneValue(response ?? {});

    try {
      this.logger.debug("Executing post-request script...");

      const scriptCode = await this.getScriptCode(config, suiteFilePath);
      const { context } = this.buildSandbox({
        variables,
        capturedVariables,
        consoleOutput,
        additionalGlobals: {
          request: sandboxRequest,
          response: sandboxResponse,
        },
      });

      this.runInSandbox(scriptCode, context, timeout);

      const executionTime = Date.now() - startTime;

      this.logger.debug(
        `Post-request script executed successfully in ${executionTime}ms`
      );

      return {
        success: true,
        variables: capturedVariables,
        execution_time_ms: executionTime,
        console_output: consoleOutput,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Post-request script failed: ${errorMessage}`);

      if (consoleOutput.length > 0) {
        this.logger.debug(
          `Console output before failure:\n${consoleOutput.join("\n")}`
        );
      }

      if (config.continue_on_error) {
        this.logger.warn(
          "Continuing execution despite script failure (continue_on_error=true)"
        );
        return {
          success: false,
          variables: {},
          execution_time_ms: executionTime,
          error: errorMessage,
          console_output: consoleOutput,
        };
      }

      throw new Error(`Post-request script execution failed: ${errorMessage}`);
    }
  }

  private buildSandbox(options: SandboxOptions): {
    context: vm.Context;
    sandbox: Record<string, any>;
  } {
    const sandbox: Record<string, any> = {
      setVariable: (name: string, value: any) => {
        const key =
          typeof name === "string"
            ? name
            : name !== undefined
            ? String(name)
            : "";
        if (!key) {
          return;
        }
        options.capturedVariables[key] = this.cloneValue(value);
      },
      variables: Object.freeze(this.cloneValue(options.variables ?? {})),
      console: this.createConsoleBridge(options.consoleOutput),
      crypto,
      Buffer,
      faker,
      btoa: (input: string) =>
        Buffer.from(String(input), "utf8").toString("base64"),
      atob: (input: string) =>
        Buffer.from(String(input), "base64").toString("utf8"),
      Math,
      Date,
    };

    if (options.additionalGlobals) {
      for (const [key, value] of Object.entries(options.additionalGlobals)) {
        sandbox[key] = value;
      }
    }

    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.process = undefined;

    const context = vm.createContext(sandbox, {
      name: "FlowTestScriptSandbox",
    });

    return { context, sandbox };
  }

  private runInSandbox(
    code: string,
    context: vm.Context,
    timeout: number
  ): void {
    if (!code || code.trim().length === 0) {
      return;
    }

    const script = new vm.Script(code);
    script.runInContext(context, { timeout });
  }

  private createConsoleBridge(consoleOutput: string[]) {
    const push = (args: any[]) => {
      consoleOutput.push(this.formatConsoleArgs(args));
    };

    return {
      log: (...args: any[]) => push(args),
      info: (...args: any[]) => push(args),
      warn: (...args: any[]) => push(args),
      error: (...args: any[]) => push(args),
    };
  }

  private formatConsoleArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "string") {
          return arg;
        }
        if (
          typeof arg === "number" ||
          typeof arg === "boolean" ||
          arg === null
        ) {
          return String(arg);
        }
        if (Buffer.isBuffer(arg)) {
          return arg.toString("utf8");
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");
  }

  private cloneValue<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    if (Buffer.isBuffer(value)) {
      return Buffer.from(value) as unknown as T;
    }

    const globalObj = global as {
      structuredClone?: <T>(input: T) => T;
    };

    if (typeof globalObj.structuredClone === "function") {
      try {
        return globalObj.structuredClone(value);
      } catch {
        // Fall back to JSON serialization below.
      }
    }

    if (typeof value === "object") {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return value;
      }
    }

    return value;
  }

  private async getScriptCode(
    config: ScriptConfig,
    suiteFilePath?: string
  ): Promise<string> {
    if (config.script !== undefined) {
      return config.script;
    }

    if (config.script_file) {
      const scriptPath = path.isAbsolute(config.script_file)
        ? config.script_file
        : suiteFilePath
        ? path.resolve(path.dirname(suiteFilePath), config.script_file)
        : path.resolve(process.cwd(), config.script_file);

      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }

      try {
        const scriptContent = fs.readFileSync(scriptPath, "utf8");

        if (!scriptContent || scriptContent.trim().length === 0) {
          this.logger.warn(`Script file is empty: ${scriptPath}`);
        }

        this.logger.debug(`Loaded script from file: ${scriptPath}`);
        return scriptContent;
      } catch (error) {
        throw new Error(
          `Failed to read script file ${scriptPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    throw new Error(
      "Script configuration must contain either 'script' or 'script_file'"
    );
  }
}
