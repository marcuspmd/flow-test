/**
 * @fileoverview Step execution service implementation
 * @module services/execution/step-executor
 */

import { injectable, inject } from "inversify";
import { TYPES } from "../../di/identifiers";
import type {
  IStepExecutor,
  StepExecutionContext,
  StepIdentifiers,
} from "../../interfaces/services/IStepExecutor";
import type { ILogger } from "../../interfaces/services/ILogger";
import type { IVariableService } from "../../interfaces/services/IVariableService";
import type { IJavaScriptService } from "../../interfaces/services/IJavaScriptService";
import type { IHttpService } from "../../interfaces/services/IHttpService";
import type { IAssertionService } from "../../interfaces/services/IAssertionService";
import type { ICaptureService } from "../../interfaces/services/ICaptureService";
import type { IScenarioService } from "../../interfaces/services/IScenarioService";
import type { ICallService } from "../../interfaces/services/ICallService";
import type { IInputService } from "../../interfaces/services/IInputService";
import type { IIterationService } from "../../interfaces/services/IIterationService";
import type { IScriptExecutorService } from "../../interfaces/services/IScriptExecutorService";
import type { IHookExecutorService } from "../../interfaces/services/IHookExecutorService";
import type { IConfigManager } from "../../interfaces/services/IConfigManager";
import type { IVariableContextManager } from "../../interfaces/services/IVariableContextManager";
import type {
  TestStep,
  StepExecutionResult,
  EngineHooks,
  SkipConfig,
} from "../../types/engine.types";
import { StepStrategyFactory } from "./strategies/step-strategy.factory";
import type { StepExecutionContext as StrategyContext } from "./strategies/step-execution.strategy";

/**
 * Service responsible for executing individual test steps
 *
 * @remarks
 * This service handles the complete lifecycle of step execution including:
 * - Strategy selection and delegation
 * - Skip condition evaluation (pre/post execution)
 * - Hook execution (onStepStart, onStepEnd)
 * - Result building
 *
 * Delegates actual execution to specialized strategies based on step type.
 *
 * @public
 */
@injectable()
export class StepExecutorService implements IStepExecutor {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IVariableService) private variableService: IVariableService,
    @inject(TYPES.IJavaScriptService)
    private javascriptService: IJavaScriptService,
    @inject(TYPES.IVariableContextManager)
    private contextManager: IVariableContextManager,
    @inject(TYPES.IHttpService) private httpService: IHttpService,
    @inject(TYPES.IAssertionService)
    private assertionService: IAssertionService,
    @inject(TYPES.ICaptureService) private captureService: ICaptureService,
    @inject(TYPES.IScenarioService) private scenarioService: IScenarioService,
    @inject(TYPES.ICallService) private callService: ICallService,
    @inject(TYPES.IInputService) private inputService: IInputService,
    @inject(TYPES.IIterationService)
    private iterationService: IIterationService,
    @inject(TYPES.IScriptExecutorService)
    private scriptExecutorService: IScriptExecutorService,
    @inject(TYPES.IHookExecutorService)
    private hookExecutorService: IHookExecutorService,
    @inject(TYPES.IConfigManager) private configManager: IConfigManager
  ) {}

  /**
   * Execute a single test step
   */
  async executeStep(
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const {
      step,
      suite,
      stepIndex,
      identifiers,
      hooks,
      shouldExecute = true,
      discoveredTest,
    } = context;
    const stepStartTime = Date.now();

    // Build hook context
    const hookContext = {
      suite,
      global_variables: this.variableService.getAllVariables(),
      runtime_variables: this.variableService.getVariablesByScope("runtime"),
      step_index: stepIndex,
      total_steps: suite.steps.length,
      start_time: new Date(),
      execution_id: `${suite.suite_name}_${stepIndex}`,
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
    };

    // Fire step start hook
    await hooks?.onStepStart?.(step, hookContext);

    // Handle step filter skip
    if (!shouldExecute) {
      const skippedResult = this.buildSkippedResult(
        identifiers,
        step.name,
        "step filter"
      );

      this.logger.info(
        `Skipping step '${step.name}' (${identifiers.stepId}) due to step filter`
      );

      await hooks?.onStepEnd?.(step, skippedResult, hookContext);
      return skippedResult;
    }

    // Evaluate pre-execution skip condition
    if (step.skip) {
      const shouldSkip = this.evaluateSkipCondition(step.skip, "pre_execution");

      if (shouldSkip) {
        const skipConfig = this.getSkipConfigString(step.skip, "pre_execution");
        const skippedResult = this.buildSkippedResult(
          identifiers,
          step.name,
          skipConfig
        );

        this.logger.info(
          `⏭️  Skipping step '${step.name}' (${identifiers.stepId}) due to skip condition (pre_execution): ${skipConfig}`
        );

        await hooks?.onStepEnd?.(step, skippedResult, hookContext);
        return skippedResult;
      }
    }

    try {
      // Execute step using appropriate strategy
      const result = await this.executeStepWithStrategy(context);

      // Evaluate post-capture skip condition
      if (step.skip) {
        const availableContext = {
          response: result.response_details,
          capturedVariables: result.captured_variables || {},
        };

        const shouldSkipPostCapture = this.evaluateSkipCondition(
          step.skip,
          "post_capture",
          availableContext
        );

        if (shouldSkipPostCapture) {
          const skipConfig = this.getSkipConfigString(
            step.skip,
            "post_capture"
          );

          // Convert result to skipped status
          const skippedResult: StepExecutionResult = {
            ...result,
            status: "skipped",
          };

          this.logger.info(
            `⏭️  Step '${step.name}' (${identifiers.stepId}) skipped after capture due to skip condition (post_capture): ${skipConfig}`
          );

          await hooks?.onStepEnd?.(step, skippedResult, hookContext);
          return skippedResult;
        }
      }

      // Fire step end hook
      await hooks?.onStepEnd?.(step, result, hookContext);
      return result;
    } catch (error) {
      // Build error result
      const errorResult: StepExecutionResult = {
        step_id: identifiers.stepId,
        qualified_step_id: identifiers.qualifiedStepId,
        step_name: step.name,
        status: "failure",
        duration_ms: Date.now() - stepStartTime,
        captured_variables: {},
        available_variables: this.contextManager.filterAndMaskVariables(
          this.variableService.getAllVariables(),
          { stepName: step.name }
        ),
        error_message: error instanceof Error ? error.message : String(error),
      };

      await hooks?.onStepEnd?.(step, errorResult, hookContext);
      return errorResult;
    }
  }

  /**
   * Execute step using appropriate strategy
   */
  private async executeStepWithStrategy(
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const { step, suite, stepIndex, identifiers, discoveredTest } = context;

    // Get step strategy factory (singleton pattern - no constructor params needed)
    const factory = new StepStrategyFactory();

    const strategy = factory.getStrategy(step);
    const strategyName = strategy.constructor.name;

    this.logger.debug(
      `Using strategy: ${strategyName} for step '${step.name}'`
    );

    // Build strategy execution context
    const strategyContext: StrategyContext = {
      step,
      suite,
      stepIndex,
      identifiers: {
        stepId: identifiers.stepId,
        qualifiedStepId: identifiers.qualifiedStepId,
        normalizedQualifiedStepId: identifiers.normalizedQualifiedStepId,
      },
      logger: this.logger,
      globalVariables: this.variableService as any,
      httpService: this.httpService as any,
      assertionService: this.assertionService as any,
      captureService: this.captureService as any,
      scenarioService: this.scenarioService,
      callService: this.callService,
      inputService: this.inputService,
      iterationService: this.iterationService,
      scriptExecutorService: this.scriptExecutorService,
      hookExecutorService: this.hookExecutorService,
      hooks: context.hooks || {},
      configManager: this.configManager as any,
      stepCallStack: [], // Will be managed by ExecutionService
      discoveredTest,
      executionService: null as any, // Will be set by ExecutionService
    };

    return await strategy.execute(strategyContext);
  }

  /**
   * Compute step identifiers for a given step
   */
  computeStepIdentifiers(
    suiteNodeId: string,
    step: TestStep,
    stepIndex: number
  ): StepIdentifiers {
    const normalizedSuiteId = this.normalizeSuiteId(suiteNodeId);
    const stepId = step.step_id || `step-${stepIndex + 1}`;
    const normalizedStepId = this.normalizeStepId(stepId);
    const qualifiedStepId = `${suiteNodeId}.${stepId}`;
    const normalizedQualifiedStepId = `${normalizedSuiteId}.${normalizedStepId}`;

    return {
      stepId,
      qualifiedStepId,
      normalizedQualifiedStepId,
    };
  }

  /**
   * Evaluate skip condition for a step
   */
  evaluateSkipCondition(
    skipConfig: string | SkipConfig,
    timing: "pre_execution" | "post_capture",
    additionalContext?: Record<string, any>
  ): boolean {
    try {
      // Normalize skip config
      let skipExpression: string;
      let expectedTiming: "pre_execution" | "post_capture";

      if (typeof skipConfig === "string") {
        skipExpression = skipConfig;
        expectedTiming = "pre_execution";
      } else {
        skipExpression = skipConfig.condition;
        expectedTiming = (skipConfig.when as any) || "pre_execution";
      }

      // Only evaluate if timing matches
      if (timing !== expectedTiming) {
        return false;
      }

      // Check for literal boolean values
      const trimmed = skipExpression.trim();
      if (trimmed === "true") return true;
      if (trimmed === "false") return false;

      // Get all current variables for context
      const variables = this.variableService.getAllVariables();

      // Build evaluation context based on timing
      const evalContext = {
        ...variables,
        ...(additionalContext?.capturedVariables || {}),
      };

      // Add response to context only if available (post_capture timing)
      if (timing === "post_capture" && additionalContext?.response) {
        this.variableService.setRuntimeVariable(
          "response",
          additionalContext.response
        );
        this.variableService.setRuntimeVariable(
          "status",
          additionalContext.response.status
        );
        this.variableService.setRuntimeVariable(
          "status_code",
          additionalContext.response.status
        );
        this.variableService.setRuntimeVariable(
          "headers",
          additionalContext.response.headers
        );
        this.variableService.setRuntimeVariable(
          "body",
          additionalContext.response.body
        );
      }

      // Interpolate the expression
      const interpolatedExpression =
        this.variableService.interpolateString(skipExpression);

      // Check if it's a direct boolean value after interpolation
      if (interpolatedExpression === "true") return true;
      if (interpolatedExpression === "false") return false;

      // Try JavaScript evaluation first
      const looksLikeJavaScript =
        interpolatedExpression.includes("===") ||
        interpolatedExpression.includes("!==") ||
        interpolatedExpression.includes("&&") ||
        interpolatedExpression.includes("||") ||
        /^\s*!/.test(interpolatedExpression);

      if (looksLikeJavaScript) {
        try {
          const wrappedExpression = `return (${interpolatedExpression});`;
          const jsResult = this.javascriptService.executeExpression(
            wrappedExpression,
            { variables: this.variableService.getAllVariables() },
            true
          );
          return Boolean(jsResult);
        } catch (jsError) {
          this.logger.debug(
            `Failed to evaluate skip condition as JavaScript: ${jsError}. Trying JMESPath...`
          );
        }
      }

      // Fallback to JMESPath
      return this.evaluateJMESPath(skipExpression);
    } catch (error) {
      this.logger.error(
        `Error evaluating skip condition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Evaluate JMESPath expression
   */
  private evaluateJMESPath(expression: string): boolean {
    try {
      const jmespath = require("jmespath");
      const context = this.variableService.getAllVariables();

      // Process condition for JMESPath
      let processedCondition = expression
        .replace(/(==|!=)\s*'([^']+)'/g, "$1 `$2`")
        .replace(/(==|!=|>=|<=|>|<)\s*(\d+)(?![`])/g, "$1 `$2`")
        .replace(/(==|!=)\s*(true|false)(?![`])/g, "$1 `$2`")
        .replace(/(==|!=)\s*null(?![`])/g, "$1 `null`");

      const result = jmespath.search(context, processedCondition);
      return Boolean(result);
    } catch (error) {
      this.logger.warn(
        `Failed to evaluate skip condition as JMESPath: ${error}`
      );
      return false;
    }
  }

  /**
   * Build skipped result
   */
  private buildSkippedResult(
    identifiers: StepIdentifiers,
    stepName: string,
    reason: string
  ): StepExecutionResult {
    return {
      step_id: identifiers.stepId,
      qualified_step_id: identifiers.qualifiedStepId,
      step_name: stepName,
      status: "skipped",
      duration_ms: 0,
      captured_variables: {},
      available_variables: this.contextManager.filterAndMaskVariables(
        this.variableService.getAllVariables(),
        { stepName }
      ),
    };
  }

  /**
   * Get skip config as string for logging
   */
  private getSkipConfigString(
    skipConfig: string | SkipConfig,
    timing: string
  ): string {
    if (typeof skipConfig === "string") {
      return skipConfig;
    }
    return `when: ${skipConfig.when || timing}, condition: ${
      skipConfig.condition
    }`;
  }

  /**
   * Normalize suite ID
   */
  private normalizeSuiteId(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  }

  /**
   * Normalize step ID
   */
  private normalizeStepId(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  }
}
