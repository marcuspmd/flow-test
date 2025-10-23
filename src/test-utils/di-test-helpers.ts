/**
 * @fileoverview Test utilities for DI container and service mocking.
 *
 * @remarks
 * This module provides utilities for creating test containers and mocked services
 * for unit testing with dependency injection.
 */

import { Container } from "inversify";
import { TYPES } from "../di/identifiers";
import type { ILogger } from "../interfaces/services/ILogger";
import type { IConfigManager } from "../interfaces/services/IConfigManager";
import type { IGlobalRegistryService } from "../interfaces/services/IGlobalRegistryService";
import type { IHttpService } from "../interfaces/services/IHttpService";
import type { IVariableService } from "../interfaces/services/IVariableService";
import type { IAssertionService } from "../interfaces/services/IAssertionService";
import type { ICaptureService } from "../interfaces/services/ICaptureService";
import type { IPriorityService } from "../interfaces/services/IPriorityService";
import type { IDependencyService } from "../interfaces/services/IDependencyService";
import type { IScenarioService } from "../interfaces/services/IScenarioService";
import type { IIterationService } from "../interfaces/services/IIterationService";
import type { IInputService } from "../interfaces/services/IInputService";
import type { ICallService } from "../interfaces/services/ICallService";
import type { IScriptExecutorService } from "../interfaces/services/IScriptExecutorService";
import type { IJavaScriptService } from "../interfaces/services/IJavaScriptService";
import type { IHookExecutorService } from "../interfaces/services/IHookExecutorService";
import type {
  EngineHooks,
  EngineExecutionOptions,
} from "../types/engine.types";

/**
 * Creates a test container with mocked services
 *
 * @param overrides - Optional service overrides for specific services
 * @returns Configured test container
 *
 * @example
 * ```typescript
 * const container = createTestContainer({
 *   logger: mockLogger,
 *   configManager: mockConfigManager
 * });
 *
 * const executionService = container.get<IExecutionService>(TYPES.IExecutionService);
 * ```
 */
export function createTestContainer(
  overrides: Partial<{
    logger: ILogger;
    configManager: IConfigManager;
    globalRegistry: IGlobalRegistryService;
    httpService: IHttpService;
    variableService: IVariableService;
    assertionService: IAssertionService;
    captureService: ICaptureService;
    priorityService: IPriorityService;
    dependencyService: IDependencyService;
    scenarioService: IScenarioService;
    iterationService: IIterationService;
    inputService: IInputService;
    callService: ICallService;
    scriptExecutorService: IScriptExecutorService;
    javascriptService: IJavaScriptService;
    hookExecutorService: IHookExecutorService;
    hooks: EngineHooks;
    executionOptions: EngineExecutionOptions;
  }> = {}
): Container {
  const container = new Container();

  // Bind services with defaults or overrides
  container
    .bind<ILogger>(TYPES.ILogger)
    .toConstantValue(overrides.logger || createMockLogger());

  container
    .bind<IConfigManager>(TYPES.IConfigManager)
    .toConstantValue(overrides.configManager || createMockConfigManager());

  container
    .bind<IGlobalRegistryService>(TYPES.IGlobalRegistryService)
    .toConstantValue(overrides.globalRegistry || createMockGlobalRegistry());

  container
    .bind<IHttpService>(TYPES.IHttpService)
    .toConstantValue(overrides.httpService || createMockHttpService());

  container
    .bind<IVariableService>(TYPES.IVariableService)
    .toConstantValue(overrides.variableService || createMockVariableService());

  container
    .bind<IAssertionService>(TYPES.IAssertionService)
    .toConstantValue(
      overrides.assertionService || createMockAssertionService()
    );

  container
    .bind<ICaptureService>(TYPES.ICaptureService)
    .toConstantValue(overrides.captureService || createMockCaptureService());

  container
    .bind<IPriorityService>(TYPES.IPriorityService)
    .toConstantValue(overrides.priorityService || createMockPriorityService());

  container
    .bind<IDependencyService>(TYPES.IDependencyService)
    .toConstantValue(
      overrides.dependencyService || createMockDependencyService()
    );

  container
    .bind<IScenarioService>(TYPES.IScenarioService)
    .toConstantValue(overrides.scenarioService || createMockScenarioService());

  container
    .bind<IIterationService>(TYPES.IIterationService)
    .toConstantValue(
      overrides.iterationService || createMockIterationService()
    );

  container
    .bind<IInputService>(TYPES.IInputService)
    .toConstantValue(overrides.inputService || createMockInputService());

  container
    .bind<ICallService>(TYPES.ICallService)
    .toConstantValue(overrides.callService || createMockCallService());

  container
    .bind<IScriptExecutorService>(TYPES.IScriptExecutorService)
    .toConstantValue(
      overrides.scriptExecutorService || createMockScriptExecutorService()
    );

  container
    .bind<IJavaScriptService>(TYPES.IJavaScriptService)
    .toConstantValue(
      overrides.javascriptService || createMockJavaScriptService()
    );

  container
    .bind<IHookExecutorService>(TYPES.IHookExecutorService)
    .toConstantValue(
      overrides.hookExecutorService || createMockHookExecutorService()
    );

  // Runtime values
  container
    .bind<EngineHooks>("EngineHooks")
    .toConstantValue(overrides.hooks || {});
  container
    .bind<EngineExecutionOptions>("EngineExecutionOptions")
    .toConstantValue(overrides.executionOptions || {});

  return container;
}

// Mock creators
export function createMockLogger(): ILogger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn(),
    getLogLevel: jest.fn(() => "info"),
  };
}

export function createMockConfigManager(): IConfigManager {
  return {
    getConfig: jest.fn(() => ({
      project_name: "Test Project",
      test_directory: "./tests",
      execution: { mode: "sequential" as const },
      reporting: {},
      globals: {},
    })),
    validateConfig: jest.fn(),
    mergeConfig: jest.fn(),
  } as any;
}

export function createMockGlobalRegistry(): IGlobalRegistryService {
  return {
    setVariable: jest.fn(),
    getVariable: jest.fn(),
    hasVariable: jest.fn(),
    getAllVariables: jest.fn(() => ({})),
    clear: jest.fn(),
  } as any;
}

export function createMockHttpService(): IHttpService {
  return {
    executeRequest: jest.fn(),
  } as any;
}

export function createMockVariableService(): IVariableService {
  return {
    interpolate: jest.fn((str) => str),
    interpolateObject: jest.fn((obj) => obj),
    setRuntimeVariable: jest.fn(),
    getRuntimeVariable: jest.fn(),
    getAllVariables: jest.fn(() => ({})),
  } as any;
}

export function createMockAssertionService(): IAssertionService {
  return {
    validateResponse: jest.fn(() => ({ passed: true, failures: [] })),
  } as any;
}

export function createMockCaptureService(): ICaptureService {
  return {
    captureVariables: jest.fn(() => ({})),
  } as any;
}

export function createMockPriorityService(): IPriorityService {
  return {
    sortByPriority: jest.fn((tests) => tests),
  } as any;
}

export function createMockDependencyService(): IDependencyService {
  return {
    buildDependencyGraph: jest.fn(),
    resolveExecutionOrder: jest.fn((tests) => tests),
    validateDependencies: jest.fn(),
  } as any;
}

export function createMockScenarioService(): IScenarioService {
  return {
    evaluateScenarios: jest.fn(),
  } as any;
}

export function createMockIterationService(): IIterationService {
  return {
    resolveIterationData: jest.fn(),
  } as any;
}

export function createMockInputService(): IInputService {
  return {
    promptUser: jest.fn(),
  } as any;
}

export function createMockCallService(): ICallService {
  return {
    executeStepCall: jest.fn(),
  } as any;
}

export function createMockScriptExecutorService(): IScriptExecutorService {
  return {
    executePreRequestScript: jest.fn(),
    executePostRequestScript: jest.fn(),
  } as any;
}

export function createMockJavaScriptService(): IJavaScriptService {
  return {
    executeExpression: jest.fn(),
    validateExpression: jest.fn(() => ({ isValid: true })),
  } as any;
}

export function createMockHookExecutorService(): IHookExecutorService {
  return {
    executeHooks: jest.fn(),
    executeHook: jest.fn(),
  } as any;
}
