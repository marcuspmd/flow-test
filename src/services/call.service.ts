import { injectable } from "inversify";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getLogger } from "./logger.service";
import { ErrorHandler } from "../utils";
import type { ICallService } from "../interfaces/services/ICallService";
import type {
  ResolvedStepCall,
  StepCallExecutionOptions,
  StepCallRequest,
  StepCallResult,
  StepCallErrorStrategy,
  StepExecutionHandler,
} from "../types/call.types";
import type { TestStep, TestSuite } from "../types/engine.types";

const DEFAULT_MAX_CALL_DEPTH = 10;

interface CachedSuiteEntry {
  suite: TestSuite;
  mtimeMs: number;
}

@injectable()
export class CallService implements ICallService {
  private logger = getLogger();
  private suiteCache: Map<string, CachedSuiteEntry> = new Map();

  constructor() {}

  async executeStepCall(
    request: StepCallRequest,
    options: StepCallExecutionOptions
  ): Promise<StepCallResult> {
    const strategy: StepCallErrorStrategy = request.on_error ?? "fail";
    const resolvedOptions = this.normalizeOptions(options);
    let currentIdentifier: string | undefined;

    try {
      const resolvedCall = await this.resolveStepCall(request, resolvedOptions);
      currentIdentifier = resolvedCall.identifier;

      // Execute via handler if provided
      if (resolvedOptions.stepExecutionHandler) {
        const handlerResult = await resolvedOptions.stepExecutionHandler({
          resolved: resolvedCall,
          request,
          options: resolvedOptions,
        });
        return handlerResult;
      }

      // Fallback: return basic success without execution
      return {
        success: true,
        status: "success",
        suite_name: resolvedCall.suite.suite_name,
        suite_node_id: resolvedCall.suite.node_id,
        step_name: resolvedCall.step.name,
        captured_variables: {},
        propagated_variables: {},
      };
    } catch (error) {
      return this.handleExecutionError(
        error as Error,
        request,
        strategy,
        options
      );
    } finally {
      if (currentIdentifier && resolvedOptions.callStack?.length) {
        const last =
          resolvedOptions.callStack[resolvedOptions.callStack.length - 1];
        if (last === currentIdentifier) {
          resolvedOptions.callStack.pop();
        } else {
          const idx = resolvedOptions.callStack.lastIndexOf(currentIdentifier);
          if (idx !== -1) {
            resolvedOptions.callStack.splice(idx, 1);
          }
        }
      }
    }
  }

  private normalizeOptions(
    options: StepCallExecutionOptions
  ): StepCallExecutionOptions {
    const callStack = options.callStack ?? [];
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_CALL_DEPTH;

    return {
      ...options,
      callStack,
      maxDepth,
    };
  }

  private async resolveStepCall(
    request: StepCallRequest,
    options: StepCallExecutionOptions
  ): Promise<ResolvedStepCall> {
    const absoluteSuitePath = this.resolveSuitePath(
      options.callerSuitePath,
      request.test,
      options.allowedRoot,
      request.path_type
    );

    const identifier = this.buildCallIdentifier(
      absoluteSuitePath,
      request.step
    );
    this.checkForRecursion(identifier, options);

    const suite = await this.loadSuiteFromCache(absoluteSuitePath);
    const { step, index } = this.findTargetStep(suite, request.step);

    options.callStack?.push(identifier);

    return {
      suite,
      suitePath: absoluteSuitePath,
      step,
      stepIndex: index,
      identifier,
    };
  }

  private resolveSuitePath(
    callerPath: string,
    targetPath: string,
    allowedRoot?: string,
    pathType: "relative" | "absolute" = "relative"
  ): string {
    if (!callerPath) {
      throw new Error("Caller suite path is required to resolve step call");
    }

    if (!targetPath) {
      throw new Error("Call configuration must include the 'test' path");
    }

    let resolved: string;

    // Handle absolute path type (relative to allowedRoot/test_directory)
    if (pathType === "absolute") {
      if (!allowedRoot) {
        throw new Error(
          `Cannot use path_type 'absolute' without a configured test_directory`
        );
      }

      // Resolve from allowedRoot
      resolved = path.resolve(allowedRoot, targetPath);

      this.logger.debug(
        `Resolving absolute path '${targetPath}' from test_directory: ${resolved}`
      );
    } else {
      // Default: relative path type (relative to caller's directory)

      // Reject absolute paths when using "relative" mode
      if (path.isAbsolute(targetPath)) {
        throw new Error(
          `Call configuration with path_type 'relative' must use relative paths. Received absolute path: ${targetPath}`
        );
      }

      const callerDir = path.dirname(callerPath);
      resolved = path.resolve(callerDir, targetPath);
    }

    if (allowedRoot) {
      const normalizedRoot = path.resolve(allowedRoot);
      const relative = path.relative(normalizedRoot, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(
          `Resolved suite path escapes the allowed directory (${normalizedRoot}): ${resolved}`
        );
      }
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(
        `Target suite file not found: ${targetPath} (resolved to ${resolved})`
      );
    }

    const stats = fs.statSync(resolved);
    if (!stats.isFile()) {
      throw new Error(
        `Target suite path must be a file: ${targetPath} (resolved to ${resolved})`
      );
    }

    return resolved;
  }

  private buildCallIdentifier(suitePath: string, stepKey: string): string {
    const normalizedStep = stepKey.trim().toLowerCase();
    const normalizedPath = path.normalize(suitePath);
    return `${normalizedPath}::${normalizedStep}`;
  }

  private checkForRecursion(
    identifier: string,
    options: StepCallExecutionOptions
  ): void {
    const currentDepth = options.callStack?.length ?? 0;

    if (currentDepth >= (options.maxDepth ?? DEFAULT_MAX_CALL_DEPTH)) {
      throw new Error(
        `Maximum call depth exceeded (>${
          options.maxDepth ?? DEFAULT_MAX_CALL_DEPTH
        }). Potential recursive call detected at ${identifier}`
      );
    }

    if (options.callStack?.includes(identifier)) {
      throw new Error(
        `Recursive step call detected for identifier '${identifier}'. Call stack: ${options.callStack.join(
          " -> "
        )}`
      );
    }
  }

  private async loadSuiteFromCache(filePath: string): Promise<TestSuite> {
    const cached = this.suiteCache.get(filePath);
    const currentMtime = fs.statSync(filePath).mtimeMs;

    if (cached && cached.mtimeMs === currentMtime) {
      return this.cloneSuite(cached.suite);
    }

    const suite = await this.loadSuiteFromDisk(filePath);
    this.suiteCache.set(filePath, {
      suite: this.cloneSuite(suite),
      mtimeMs: currentMtime,
    });
    return this.cloneSuite(suite);
  }

  private async loadSuiteFromDisk(filePath: string): Promise<TestSuite> {
    const result = await ErrorHandler.handleAsync(
      async () => {
        const fileContent = await fs.promises.readFile(filePath, "utf8");
        const suite = yaml.load(fileContent) as TestSuite;

        if (!suite?.suite_name) {
          throw new Error("Invalid suite: missing suite_name");
        }

        if (!Array.isArray(suite.steps) || suite.steps.length === 0) {
          throw new Error("Invalid suite: missing steps array");
        }

        return suite;
      },
      {
        message: `Failed to load suite from ${filePath}`,
        context: { filePath },
        rethrow: true,
      }
    );
    // With rethrow: true, result is never undefined (throws instead)
    return result as TestSuite;
  }

  private findTargetStep(
    suite: TestSuite,
    stepKey: string
  ): { step: TestStep; index: number } {
    if (!stepKey) {
      throw new Error("Call configuration must include the 'step' identifier");
    }

    const normalizedKey = stepKey.trim().toLowerCase();

    for (let index = 0; index < suite.steps.length; index++) {
      const candidate = suite.steps[index];
      const candidateId = this.normalizeIdentifier(candidate.step_id);
      const candidateName = this.normalizeIdentifier(candidate.name);

      if (candidateId === normalizedKey || candidateName === normalizedKey) {
        return { step: this.cloneStep(candidate), index };
      }
    }

    throw new Error(
      `Step '${stepKey}' not found in suite '${
        suite.suite_name
      }'. Available identifiers: ${suite.steps
        .map((step) => step.step_id || step.name)
        .join(", ")}`
    );
  }

  private normalizeIdentifier(value?: string): string | null {
    if (!value) return null;
    return value.trim().toLowerCase();
  }

  private cloneSuite(suite: TestSuite): TestSuite {
    if (typeof structuredClone === "function") {
      return structuredClone(suite);
    }

    return JSON.parse(JSON.stringify(suite));
  }

  private cloneStep(step: TestStep): TestStep {
    if (typeof structuredClone === "function") {
      return structuredClone(step);
    }

    return JSON.parse(JSON.stringify(step));
  }

  private handleExecutionError(
    error: Error,
    request: StepCallRequest,
    strategy: StepCallErrorStrategy,
    options: StepCallExecutionOptions
  ): StepCallResult {
    const message = `Step call failed (${request.test} -> ${request.step}): ${error.message}`;
    const context = {
      filePath: options.callerSuitePath,
      error,
      metadata: {
        callerSuite: options.callerSuiteName,
        strategy,
        targetTest: request.test,
        targetStep: request.step,
      },
    } as const;

    switch (strategy) {
      case "continue":
        this.logger.info(message, context);
        return {
          success: false,
          status: "skipped",
          error: message,
        };
      case "warn":
        this.logger.warn(message, context);
        return {
          success: false,
          status: "failure",
          error: message,
        };
      case "fail":
      default:
        this.logger.error(message, context);
        throw error;
    }
  }
}
