/**
 * @fileoverview Dependency Injection container configuration.
 *
 * @remarks
 * This module sets up the InversifyJS container with all service bindings
 * for the Flow Test Engine. It defines the lifetime scopes (singleton vs transient)
 * and wiring between interfaces and implementations.
 *
 * @packageDocumentation
 */

import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./identifiers";

// Interfaces
import {
  ILogger,
  IConfigManager,
  IHttpService,
  IVariableService,
  IGlobalRegistryService,
  ICertificateService,
  IAssertionService,
  ICaptureService,
  IDependencyService,
  IPriorityService,
  IScenarioService,
  IIterationService,
  IInputService,
  ICallService,
  IHookExecutorService,
  IJavaScriptService,
  IScriptExecutorService,
  IExecutionService,
} from "../interfaces";

// Implementations
import { LoggerService } from "../services/logger.service";
import { ConfigManager } from "../core/config";
import { GlobalRegistryService } from "../services/global-registry.service";
import { CertificateService } from "../services/certificate/certificate.service";
import { HttpService } from "../services/http.service";
import { VariableService } from "../services/variable.service";
import { AssertionService } from "../services/assertion/assertion.service";
import { CaptureService } from "../services/capture.service";
import { DependencyService } from "../services/dependency.service";
import { PriorityService } from "../services/priority";
import { ScenarioService } from "../services/scenario.service";
import { IterationService } from "../services/iteration.service";
import { InputService } from "../services/input/input.service";
import { CallService } from "../services/call.service";
import { HookExecutorService } from "../services/execution/hook-executor.service";
import { JavaScriptService } from "../services/javascript.service";
import { ScriptExecutorService } from "../services/script-executor.service";
import { ExecutionService } from "../services/execution/execution.service";

/**
 * Create and configure the DI container
 *
 * @remarks
 * Creates a new InversifyJS container instance with all service bindings.
 * Services are configured with appropriate lifetime scopes:
 * - **Singleton**: Logger, ConfigManager, GlobalRegistry (shared state)
 * - **Transient**: HttpService, VariableService (per-request instances)
 *
 * @returns Configured container ready for service resolution
 *
 * @example
 * ```typescript
 * import { createContainer } from './di/container';
 * import { TYPES } from './di/identifiers';
 *
 * const container = createContainer();
 * const logger = container.get<ILogger>(TYPES.ILogger);
 * logger.info('Container initialized');
 * ```
 */
export function createContainer(): Container {
  const container = new Container({
    defaultScope: "Transient",
  });

  // ========================================
  // FASE 1: Core Services (Sprint 1)
  // ========================================

  // Singleton services (shared state across application)
  container.bind<ILogger>(TYPES.ILogger).to(LoggerService).inSingletonScope();

  container
    .bind<IConfigManager>(TYPES.IConfigManager)
    .to(ConfigManager)
    .inSingletonScope();

  container
    .bind<IGlobalRegistryService>(TYPES.IGlobalRegistryService)
    .to(GlobalRegistryService)
    .inSingletonScope();

  container
    .bind<ICertificateService>(TYPES.ICertificateService)
    .to(CertificateService)
    .inSingletonScope();

  // Transient services (new instance per injection)
  container.bind<IHttpService>(TYPES.IHttpService).to(HttpService);

  container.bind<IVariableService>(TYPES.IVariableService).to(VariableService);

  // ========================================
  // FASE 2: Validation Services (Sprint 3)
  // ========================================

  container
    .bind<IAssertionService>(TYPES.IAssertionService)
    .to(AssertionService);

  container.bind<ICaptureService>(TYPES.ICaptureService).to(CaptureService);

  container
    .bind<IDependencyService>(TYPES.IDependencyService)
    .to(DependencyService)
    .inSingletonScope();

  container
    .bind<IPriorityService>(TYPES.IPriorityService)
    .to(PriorityService)
    .inSingletonScope();

  container.bind<IScenarioService>(TYPES.IScenarioService).to(ScenarioService);

  container
    .bind<IIterationService>(TYPES.IIterationService)
    .to(IterationService);

  container.bind<IInputService>(TYPES.IInputService).to(InputService);

  // ========================================
  // FASE 3: Execution Services (Sprint 4)
  // ========================================

  container.bind<ICallService>(TYPES.ICallService).to(CallService);

  container
    .bind<IHookExecutorService>(TYPES.IHookExecutorService)
    .to(HookExecutorService);

  // ========================================
  // FASE 4: Utility Services (Sprint 4)
  // ========================================

  container
    .bind<IJavaScriptService>(TYPES.IJavaScriptService)
    .to(JavaScriptService)
    .inSingletonScope();

  container
    .bind<IScriptExecutorService>(TYPES.IScriptExecutorService)
    .to(ScriptExecutorService);

  // ========================================
  // FASE 5: Execution Orchestrator (Sprint 4)
  // ========================================

  // ExecutionService requires all dependencies via DI
  // Note: hooks and executionOptions are bound at runtime by the Engine
  container
    .bind<IExecutionService>(TYPES.IExecutionService)
    .to(ExecutionService);

  return container;
}

/**
 * Global container instance
 *
 * @remarks
 * Singleton container instance that can be imported and used throughout
 * the application. Use this for production code.
 *
 * For testing, create new containers using `createContainer()`.
 */
export const container = createContainer();
