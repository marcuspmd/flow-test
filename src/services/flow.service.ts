import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  FlowImport,
  ReusableFlow,
  TestStep,
  VariableContext,
} from "../types/common.types";
import { VariableService } from "./variable.service";
import { getLogger } from "./logger.service";

export class FlowManager {
  private readonly loadedFlows: Map<string, ReusableFlow> = new Map();
  private readonly variableService: VariableService;
  private readonly verbosity: string;
  private readonly logger = getLogger();

  constructor(variableService: VariableService, verbosity: string = "simple") {
    this.variableService = variableService;
    this.verbosity = verbosity;
  }

  /**
   * Loads and processes all flow imports.
   */
  async loadImports(
    imports: FlowImport[],
    basePath: string
  ): Promise<TestStep[]> {
    const allSteps: TestStep[] = [];

    for (const flowImport of imports) {
      if (this.verbosity !== "silent") {
        this.logger.info(
          `Loading flow: ${flowImport.name} from ${flowImport.path}`
        );
      }

      const flow = await this.loadFlow(flowImport.path, basePath);
      const processedSteps = this.processFlowImport(flow, flowImport);

      allSteps.push(...processedSteps);

      // Adds flow variables to context
      const flowVariables = this.collectFlowVariables(flow, flowImport);
      this.variableService.addImportedFlow(flowImport.name, flowVariables);

      if (this.verbosity === "detailed" || this.verbosity === "verbose") {
        this.logger.info(
          `Flow "${flow.flow_name}" loaded with ${processedSteps.length} step(s)`
        );
      }
    }

    return allSteps;
  }

  /**
   * Loads a flow from a YAML file.
   */
  private async loadFlow(
    flowPath: string,
    basePath: string
  ): Promise<ReusableFlow> {
    // Checks if already loaded (cache)
    const cacheKey = path.resolve(basePath, flowPath);
    if (this.loadedFlows.has(cacheKey)) {
      return this.loadedFlows.get(cacheKey)!;
    }

    try {
      // Resolves the file path
      const fullPath = this.resolveFlowPath(flowPath, basePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Flow file not found: ${fullPath}`);
      }

      // Loads and parses the file
      const fileContent = fs.readFileSync(fullPath, "utf8");
      const flow = yaml.load(fileContent) as ReusableFlow;

      // Basic validation
      this.validateFlow(flow, fullPath);

      // Stores in cache
      this.loadedFlows.set(cacheKey, flow);

      return flow;
    } catch (error) {
      throw new Error(`Error loading flow "${flowPath}": ${error}`);
    }
  }

  /**
   * Resolves the complete path of the flow file.
   */
  private resolveFlowPath(flowPath: string, basePath: string): string {
    // If it's an absolute path, use as is
    if (path.isAbsolute(flowPath)) {
      return flowPath;
    }

    // Resolve relative to the base file
    const baseDir = path.dirname(basePath);
    return path.resolve(baseDir, flowPath);
  }

  /**
   * Validates the structure of a flow.
   */
  private validateFlow(flow: ReusableFlow, filePath: string): void {
    if (!flow.flow_name || typeof flow.flow_name !== "string") {
      throw new Error(`Required 'flow_name' field in ${filePath}`);
    }

    if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
      throw new Error(`'steps' field must be a non-empty array in ${filePath}`);
    }

    // Validates each step
    flow.steps.forEach((step, index) => {
      if (!step.name || typeof step.name !== "string") {
        throw new Error(
          `Step ${index + 1} must have a valid 'name' in ${filePath}`
        );
      }
      if (!step.request || typeof step.request !== "object") {
        throw new Error(
          `Step ${index + 1} must have a valid 'request' in ${filePath}`
        );
      }
    });
  }

  /**
   * Processes the import of a flow, applying variable overrides.
   */
  private processFlowImport(
    flow: ReusableFlow,
    flowImport: FlowImport
  ): TestStep[] {
    // Creates a temporary context for this flow
    const flowContext: VariableContext = {
      global: {},
      imported: {},
      suite: { ...(flow.variables || {}), ...(flowImport.variables || {}) },
      runtime: {},
    };

    const tempVariableService = new VariableService(flowContext);

    // Processes each step applying interpolation
    return flow.steps.map((step) => {
      const interpolatedStep: TestStep = {
        ...step,
        name: `[${flowImport.name}] ${step.name}`,
        request: tempVariableService.interpolate(step.request),
      };

      // Interpolates other properties if they exist
      if (step.assert) {
        interpolatedStep.assert = tempVariableService.interpolate(step.assert);
      }

      // Modifies capture to include flow prefix for exported variables only
      if (step.capture) {
        const modifiedCapture: Record<string, string> = {};
        const exportedVars = flow.exports || [];

        for (const [varName, jmesPath] of Object.entries(step.capture)) {
          if (exportedVars.includes(varName)) {
            // Only create namespaced version for exported variables
            modifiedCapture[`${flowImport.name}.${varName}`] = jmesPath;
          } else {
            // Keep original name for non-exported variables
            modifiedCapture[varName] = jmesPath;
          }
        }

        interpolatedStep.capture = modifiedCapture;
      }

      return interpolatedStep;
    });
  }

  /**
   * Collects the final variables of a flow after import.
   */
  private collectFlowVariables(
    flow: ReusableFlow,
    flowImport: FlowImport
  ): Record<string, any> {
    const variables: Record<string, any> = {};

    // Default flow variables
    if (flow.variables) {
      Object.assign(variables, flow.variables);
    }

    // Override with import variables
    if (flowImport.variables) {
      Object.assign(variables, flowImport.variables);
    }

    return variables;
  }

  /**
   * Lists all loaded flows.
   */
  getLoadedFlows(): Array<{ path: string; flow: ReusableFlow }> {
    return Array.from(this.loadedFlows.entries()).map(([path, flow]) => ({
      path,
      flow,
    }));
  }

  /**
   * Clears the cache of loaded flows.
   */
  clearCache(): void {
    this.loadedFlows.clear();
  }

  /**
   * Checks if a flow is in cache.
   */
  isFlowCached(flowPath: string, basePath: string): boolean {
    const cacheKey = path.resolve(basePath, flowPath);
    return this.loadedFlows.has(cacheKey);
  }

  /**
   * Gets debug information about loaded flows.
   */
  getDebugInfo(): any {
    const info: any = {
      totalFlows: this.loadedFlows.size,
      flows: [],
    };

    for (const [path, flow] of this.loadedFlows.entries()) {
      info.flows.push({
        path,
        name: flow.flow_name,
        description: flow.description || "No description",
        stepsCount: flow.steps.length,
        variablesCount: flow.variables ? Object.keys(flow.variables).length : 0,
        exports: flow.exports || [],
      });
    }

    return info;
  }
}
