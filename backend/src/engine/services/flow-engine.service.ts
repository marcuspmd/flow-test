import { Injectable } from '@nestjs/common';
import {
  FlowSuite,
  FlowStep,
  StepExecutionResult,
  ExecutionContext
} from '../types/engine.types';
import { HttpEngineService } from './http-engine.service';
import { AssertionService } from './assertion.service';
import { CaptureService } from './capture.service';
import { VariableService, GlobalVariableContext } from './variable.service';
import { LoggerService } from './logger.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface FlowExecutionOptions {
  baseUrl?: string;
  timeout?: number;
  variables?: Record<string, any>;
  skipValidation?: boolean;
  dryRun?: boolean;
}

export interface FlowExecutionResult {
  suite_name: string;
  status: 'success' | 'failure' | 'cancelled';
  start_time: Date;
  end_time?: Date;
  duration_ms: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  steps: StepExecutionResult[];
  variables: Record<string, any>;
  error_message?: string;
}

@Injectable()
export class FlowEngineService {
  private executionGateway?: any; // Optional WebSocket gateway

  constructor(
    private readonly httpService: HttpEngineService,
    private readonly assertionService: AssertionService,
    private readonly captureService: CaptureService,
    private readonly variableService: VariableService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  // Method to inject the ExecutionEventsGateway (optional dependency)
  setExecutionGateway(gateway: any) {
    this.executionGateway = gateway;
  }

  async executeFlow(
    flowSuite: FlowSuite,
    options: FlowExecutionOptions = {},
    runId?: string,
  ): Promise<FlowExecutionResult> {
    const startTime = new Date();
    const executionResult: FlowExecutionResult = {
      suite_name: flowSuite.suite_name,
      status: 'success',
      start_time: startTime,
      duration_ms: 0,
      total_steps: flowSuite.steps.length,
      passed_steps: 0,
      failed_steps: 0,
      skipped_steps: 0,
      steps: [],
      variables: {},
    };

    try {
      this.logger.info(`Starting flow execution: ${flowSuite.suite_name}`, {
        suiteId: runId,
        totalSteps: flowSuite.steps.length,
        metadata: { type: 'flow_start' },
      });

      // Broadcast flow started event
      if (this.executionGateway && runId) {
        this.executionGateway.broadcastFlowStarted(runId, {
          suite_name: flowSuite.suite_name,
          total_steps: flowSuite.steps.length,
          start_time: startTime,
        });
      }

      // Initialize variable context
      const variableContext: GlobalVariableContext = {
        global: process.env as Record<string, any>,
        suite: {
          ...(flowSuite.variables || {}),
          ...(options.variables || {}),
        },
        runtime: {},
        imported: {},
      };

      this.variableService.setContext(variableContext);

      // Execute steps sequentially
      for (let stepIndex = 0; stepIndex < flowSuite.steps.length; stepIndex++) {
        const step = flowSuite.steps[stepIndex];

        if (step.skip) {
          this.logger.info(`Skipping step: ${step.name}`);
          executionResult.skipped_steps++;
          continue;
        }

        // Broadcast step start
        if (this.executionGateway && runId) {
          this.executionGateway.broadcastStepStarted(runId, stepIndex, step.name, {
            method: step.method,
            url: step.url,
            step_index: stepIndex + 1,
            total_steps: flowSuite.steps.length,
          });
        }

        const stepResult = await this.executeStep(
          step,
          stepIndex,
          {
            variables: this.variableService.getAllVariables(),
            baseUrl: options.baseUrl || flowSuite.base_url,
            suiteId: runId,
            runId,
            stepIndex,
          },
          options,
        );

        executionResult.steps.push(stepResult);

        // Update runtime variables with captured variables
        if (Object.keys(stepResult.captured_variables).length > 0) {
          this.variableService.updateRuntimeVariables(stepResult.captured_variables);
        }

        // Broadcast step completion
        if (this.executionGateway && runId) {
          if (stepResult.status === 'success') {
            this.executionGateway.broadcastStepCompleted(runId, stepIndex, step.name, {
              duration_ms: stepResult.duration_ms,
              assertions_passed: stepResult.assertions_results.filter(a => a.passed).length,
              variables_captured: Object.keys(stepResult.captured_variables).length,
            });
          } else {
            this.executionGateway.broadcastStepFailed(runId, stepIndex, step.name, {
              error_message: stepResult.error_message,
              duration_ms: stepResult.duration_ms,
            });
          }

          // Broadcast progress update
          this.executionGateway.broadcastProgressUpdate({
            runId,
            totalSteps: flowSuite.steps.length,
            completedSteps: executionResult.passed_steps + executionResult.failed_steps,
            currentStep: stepIndex + 1,
            status: stepResult.status === 'success' ? 'running' : 'failed',
            progressPercentage: Math.round(((executionResult.passed_steps + executionResult.failed_steps) / flowSuite.steps.length) * 100),
          });
        }

        // Persist step result to database
        if (runId) {
          await this.persistStepResult(runId, stepIndex, stepResult);
        }

        if (stepResult.status === 'success') {
          executionResult.passed_steps++;
        } else {
          executionResult.failed_steps++;

          // Stop execution on failure (can be configurable)
          if (!options.skipValidation) {
            executionResult.status = 'failure';
            executionResult.error_message = stepResult.error_message;
            break;
          }
        }

        this.logger.info(`Step ${stepIndex + 1}/${flowSuite.steps.length} completed`, {
          stepName: step.name,
          status: stepResult.status,
          duration: stepResult.duration_ms,
          suiteId: runId,
        });
      }

      const endTime = new Date();
      executionResult.end_time = endTime;
      executionResult.duration_ms = endTime.getTime() - startTime.getTime();
      executionResult.variables = this.variableService.getAllVariables();

      this.logger.info(`Flow execution completed: ${flowSuite.suite_name}`, {
        status: executionResult.status,
        duration: executionResult.duration_ms,
        passed: executionResult.passed_steps,
        failed: executionResult.failed_steps,
        suiteId: runId,
        metadata: { type: 'flow_complete' },
      });

      // Broadcast flow completion
      if (this.executionGateway && runId) {
        if (executionResult.status === 'success') {
          this.executionGateway.broadcastFlowCompleted(runId, {
            duration_ms: executionResult.duration_ms,
            passed_steps: executionResult.passed_steps,
            failed_steps: executionResult.failed_steps,
            total_steps: executionResult.total_steps,
          });
        } else {
          this.executionGateway.broadcastFlowFailed(runId, {
            error_message: executionResult.error_message,
            duration_ms: executionResult.duration_ms,
            passed_steps: executionResult.passed_steps,
            failed_steps: executionResult.failed_steps,
          });
        }
      }

      return executionResult;

    } catch (error) {
      const endTime = new Date();
      executionResult.end_time = endTime;
      executionResult.duration_ms = endTime.getTime() - startTime.getTime();
      executionResult.status = 'failure';
      executionResult.error_message = error.message;

      this.logger.error(`Flow execution failed: ${flowSuite.suite_name}`, {
        error: error as Error,
        suiteId: runId,
        metadata: { type: 'flow_error' },
      });

      // Broadcast flow failure
      if (this.executionGateway && runId) {
        this.executionGateway.broadcastFlowFailed(runId, {
          error_message: executionResult.error_message,
          duration_ms: executionResult.duration_ms,
          passed_steps: executionResult.passed_steps,
          failed_steps: executionResult.failed_steps,
        });
      }

      return executionResult;
    }
  }

  private async executeStep(
    step: FlowStep,
    stepIndex: number,
    context: ExecutionContext,
    options: FlowExecutionOptions,
  ): Promise<StepExecutionResult> {
    try {
      this.logger.info(`Executing step: ${step.name}`, {
        stepIndex,
        method: step.method,
        url: step.url,
        metadata: { type: 'step_start' },
      });

      // Interpolate variables in step configuration
      const interpolatedStep: FlowStep = {
        ...step,
        url: this.variableService.interpolate(step.url),
        headers: this.variableService.interpolate(step.headers || {}),
        body: this.variableService.interpolate(step.body),
        params: this.variableService.interpolate(step.params || {}),
      };

      // Execute HTTP request
      const httpResult = await this.httpService.executeRequest(
        step.name,
        {
          method: interpolatedStep.method,
          url: interpolatedStep.url,
          headers: interpolatedStep.headers,
          body: interpolatedStep.body,
          params: interpolatedStep.params,
          timeout: interpolatedStep.timeout,
        },
        context.baseUrl,
        options.timeout,
      );

      // Validate assertions
      let assertionResults: any[] = [];
      if (step.assertions && httpResult.status === 'success') {
        assertionResults = this.assertionService.validateAssertions(
          step.assertions,
          httpResult,
        );
        httpResult.assertions_results = assertionResults;

        // Check if any assertions failed
        const failedAssertions = assertionResults.filter(result => !result.passed);
        if (failedAssertions.length > 0) {
          httpResult.status = 'failure';
          httpResult.error_message = `Assertion failures: ${failedAssertions
            .map(f => f.message)
            .join(', ')}`;
        }
      }

      // Capture variables
      if (step.capture && httpResult.status === 'success') {
        const capturedVariables = this.captureService.captureVariables(
          step.capture,
          httpResult,
          this.variableService.getAllVariables(),
        );
        httpResult.captured_variables = capturedVariables;
      }

      return httpResult;

    } catch (error) {
      this.logger.error(`Step execution failed: ${step.name}`, {
        stepIndex,
        error: error as Error,
      });

      return {
        step_name: step.name,
        status: 'failure',
        duration_ms: 0,
        error_message: error.message,
        captured_variables: {},
        assertions_results: [],
      };
    }
  }

  private async persistStepResult(
    runId: string,
    stepIndex: number,
    stepResult: StepExecutionResult,
  ): Promise<void> {
    try {
      const stepStatus = this.mapExecutionStatusToStepStatus(stepResult.status);

      await this.prisma.stepRun.create({
        data: {
          flowRunId: runId,
          stepIndex,
          stepName: stepResult.step_name,
          status: stepStatus,
          durationMs: stepResult.duration_ms,
          requestSnapshot: stepResult.request_details as any,
          responseSnapshot: stepResult.response_details as any,
          errorDetails: stepResult.error_message ? { message: stepResult.error_message } as any : undefined,
          captures: stepResult.captured_variables as any,
          assertions: stepResult.assertions_results as any,
          startedAt: new Date(Date.now() - stepResult.duration_ms),
          finishedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to persist step result', {
        runId,
        stepIndex,
        error: error as Error,
      });
      // Continue execution even if persistence fails
    }
  }

  private mapExecutionStatusToStepStatus(status: 'success' | 'failure'): any {
    return status === 'success' ? 'SUCCESS' : 'FAILED';
  }

  validateFlowSuite(flowSuite: FlowSuite): string[] {
    const errors: string[] = [];

    if (!flowSuite.suite_name) {
      errors.push('Suite name is required');
    }

    if (!flowSuite.steps || flowSuite.steps.length === 0) {
      errors.push('At least one step is required');
    }

    flowSuite.steps?.forEach((step, index) => {
      if (!step.name) {
        errors.push(`Step ${index + 1}: Name is required`);
      }

      if (!step.method) {
        errors.push(`Step ${index + 1} (${step.name}): Method is required`);
      }

      if (!step.url) {
        errors.push(`Step ${index + 1} (${step.name}): URL is required`);
      }

      // Validate variable references
      try {
        const variableErrors = this.variableService.validateVariableReferences(step);
        errors.push(...variableErrors.map(err => `Step ${index + 1} (${step.name}): ${err}`));
      } catch (validationError) {
        errors.push(`Step ${index + 1} (${step.name}): Variable validation failed`);
      }
    });

    return errors;
  }

  async dryRunFlow(flowSuite: FlowSuite, options: FlowExecutionOptions = {}): Promise<any> {
    const validationErrors = this.validateFlowSuite(flowSuite);

    if (validationErrors.length > 0) {
      return {
        valid: false,
        errors: validationErrors,
      };
    }

    // Initialize variable context for dry run
    const variableContext: GlobalVariableContext = {
      global: process.env as Record<string, any>,
      suite: {
        ...(flowSuite.variables || {}),
        ...(options.variables || {}),
      },
      runtime: {},
      imported: {},
    };

    this.variableService.setContext(variableContext);

    const executionPlan = flowSuite.steps.map((step, index) => {
      const interpolatedStep = {
        ...step,
        url: this.variableService.interpolate(step.url),
        headers: this.variableService.interpolate(step.headers || {}),
        body: this.variableService.interpolate(step.body),
        params: this.variableService.interpolate(step.params || {}),
      };

      return {
        stepIndex: index + 1,
        name: step.name,
        method: step.method,
        url: interpolatedStep.url,
        skip: step.skip || false,
        hasAssertions: !!step.assertions && Object.keys(step.assertions).length > 0,
        hasCapture: !!step.capture && Object.keys(step.capture).length > 0,
      };
    });

    return {
      valid: true,
      suite_name: flowSuite.suite_name,
      base_url: options.baseUrl || flowSuite.base_url,
      total_steps: flowSuite.steps.length,
      active_steps: executionPlan.filter(step => !step.skip).length,
      skipped_steps: executionPlan.filter(step => step.skip).length,
      execution_plan: executionPlan,
      variables: this.variableService.getAvailableVariables(),
    };
  }
}