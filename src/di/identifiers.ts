/**
 * @fileoverview Service identifiers for Dependency Injection container.
 *
 * @remarks
 * This module defines all service identifiers (Symbols) used by the DI container
 * to bind interfaces to their implementations. Using Symbols ensures unique
 * identifiers that won't collide with other code.
 *
 * @packageDocumentation
 */

/**
 * Service type identifiers for Dependency Injection
 *
 * Each service in the Flow Test Engine has a unique Symbol identifier
 * that the InversifyJS container uses to resolve dependencies.
 *
 * @example
 * ```typescript
 * // Binding a service
 * container.bind<ILogger>(TYPES.ILogger).to(LoggerService).inSingletonScope();
 *
 * // Injecting a service
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.ILogger) private logger: ILogger) {}
 * }
 * ```
 */
export const TYPES = {
  // ========================================
  // Core Services
  // ========================================

  /** Configuration manager service */
  IConfigManager: Symbol.for("IConfigManager"),

  /** Logging service */
  ILogger: Symbol.for("ILogger"),

  // ========================================
  // HTTP & Network Services
  // ========================================

  /** HTTP request execution service */
  IHttpService: Symbol.for("IHttpService"),

  /** Digital certificate management service */
  ICertificateService: Symbol.for("ICertificateService"),

  // ========================================
  // Variable Management Services
  // ========================================

  /** Variable interpolation and resolution service */
  IVariableService: Symbol.for("IVariableService"),

  /** Global variable registry (singleton) */
  IGlobalRegistryService: Symbol.for("IGlobalRegistryService"),

  /** String interpolation service */
  IInterpolationService: Symbol.for("IInterpolationService"),

  // ========================================
  // Execution Services
  // ========================================

  /** Main test execution orchestrator */
  IExecutionService: Symbol.for("IExecutionService"),

  /** HTTP assertion validation service */
  IAssertionService: Symbol.for("IAssertionService"),

  /** Response data capture service */
  ICaptureService: Symbol.for("ICaptureService"),

  /** Conditional scenario processing service */
  IScenarioService: Symbol.for("IScenarioService"),

  /** Iteration/loop processing service */
  IIterationService: Symbol.for("IIterationService"),

  /** Input prompting service */
  IInputService: Symbol.for("IInputService"),

  /** Cross-suite step call service */
  ICallService: Symbol.for("ICallService"),

  /** Lifecycle hook executor service */
  IHookExecutorService: Symbol.for("IHookExecutorService"),

  // ========================================
  // Discovery & Dependencies Services
  // ========================================

  /** Test file discovery service */
  ITestDiscovery: Symbol.for("ITestDiscovery"),

  /** Dependency resolution service */
  IDependencyService: Symbol.for("IDependencyService"),

  /** Priority sorting service */
  IPriorityService: Symbol.for("IPriorityService"),

  // ========================================
  // Reporting Services
  // ========================================

  /** Report generation service */
  IReportingService: Symbol.for("IReportingService"),

  // ========================================
  // Utility Services
  // ========================================

  /** Faker.js data generation service */
  IFakerService: Symbol.for("IFakerService"),

  /** JavaScript expression evaluation service */
  IJavaScriptService: Symbol.for("IJavaScriptService"),

  /** Script execution service */
  IScriptExecutorService: Symbol.for("IScriptExecutorService"),

  /** Computed variables service */
  IComputedService: Symbol.for("IComputedService"),

  /** Dynamic expression service */
  IDynamicExpressionService: Symbol.for("IDynamicExpressionService"),

  // ========================================
  // Future Services (Fase 6 - ExecutionService Split)
  // ========================================

  /** Step execution service (v3.0) */
  IStepExecutor: Symbol.for("IStepExecutor"),

  /** Variable context management service (v3.0) */
  IVariableContextManager: Symbol.for("IVariableContextManager"),

  /** Result building and aggregation service (v3.0) */
  IResultBuilder: Symbol.for("IResultBuilder"),
};
