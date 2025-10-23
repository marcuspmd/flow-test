/**
 * @fileoverview Service interfaces barrel export.
 *
 * @remarks
 * Central export point for all service interfaces used in dependency injection.
 *
 * @packageDocumentation
 */

// Core Services
export { ILogger } from "./ILogger";
export { IConfigManager } from "./IConfigManager";

// Network Services
export { IHttpService } from "./IHttpService";
export { ICertificateService } from "./ICertificateService";

// Variable Management
export { IVariableService } from "./IVariableService";
export { IGlobalRegistryService } from "./IGlobalRegistryService";

// Validation Services
export { IAssertionService } from "./IAssertionService";
export { ICaptureService } from "./ICaptureService";

// Execution Services
export { IExecutionService } from "./IExecutionService";
export { IDependencyService } from "./IDependencyService";
export { IPriorityService } from "./IPriorityService";
export { IScenarioService } from "./IScenarioService";
export { IIterationService } from "./IIterationService";
export { IInputService } from "./IInputService";
export { ICallService } from "./ICallService";
export { IHookExecutorService } from "./IHookExecutorService";

// Utility Services
export { IJavaScriptService } from "./IJavaScriptService";
export { IScriptExecutorService } from "./IScriptExecutorService";
