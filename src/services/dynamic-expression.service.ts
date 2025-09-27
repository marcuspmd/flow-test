/**
 * @fileoverview Service orchestrating dynamic variable creation and reevaluation
 * for interactive inputs.
 */

import { getLogger } from "./logger.service";
import { CaptureService } from "./capture.service";
import { ComputedService, ComputedEvaluationContext } from "./computed.service";
import { InputResult } from "../types/engine.types";
import {
  DynamicVariableAssignment,
  DynamicVariableDefinition,
  DynamicVariableScope,
  InputDynamicConfig,
} from "../types/common.types";

interface DynamicProcessingContext {
  variables: Record<string, any>;
  stepName: string;
  suiteNodeId: string;
  suiteName: string;
  timestamp?: string;
  extras?: Record<string, any>;
}

interface ProcessInputResult {
  assignments: DynamicVariableAssignment[];
  registeredDefinitions: DynamicVariableDefinition[];
}
/**
 * Coordinates dynamic variable creation and reevaluation for interactive inputs.
 *
 * @remarks
 * The service combines capture- and JavaScript-based computations, generating
 * variable assignments immediately after inputs are processed and scheduling
 * additional reevaluations when dependent variables change.
 *
 * @example Using the service inside a step execution
 * ```typescript
 * const dynamicService = new DynamicExpressionService(captureService, computedService);
 * const result = dynamicService.processInputDynamics(inputResult, config.dynamic, context);
 * // result.assignments contains variables ready to persist
 * ```
 *
 * @public
 */
export class DynamicExpressionService {
  private logger = getLogger();
  private registeredDefinitions: Map<string, DynamicVariableDefinition> =
    new Map();

  constructor(
    private captureService: CaptureService,
    private computedService: ComputedService
  ) {}
  /**
   * Evaluates dynamic expressions tied to a single input submission.
   *
   * @param inputResult - Raw input outcome delivered by the input service.
   * @param dynamicConfig - Dynamic configuration extracted from the YAML step.
   * @param context - Supplemental data about the current suite and variables.
   * @returns Assignments generated immediately plus definitions to reevaluate later.
   */
  processInputDynamics(
    inputResult: InputResult,
    dynamicConfig: InputDynamicConfig | undefined,
    context: DynamicProcessingContext
  ): ProcessInputResult {
    if (!dynamicConfig) {
      return { assignments: [], registeredDefinitions: [] };
    }

    const immediateDefinitions = this.createImmediateDefinitions(
      dynamicConfig,
      inputResult
    );
    const reevaluateDefinitions = this.normalizeReevaluationDefinitions(
      dynamicConfig,
      inputResult
    );

    const assignments = this.evaluateDefinitions(
      immediateDefinitions,
      inputResult,
      context,
      false
    );

    return {
      assignments,
      registeredDefinitions: reevaluateDefinitions,
    };
  }
  /**
   * Registers definitions that should be reevaluated when dependent variables change.
   *
   * @param definitions - Normalized dynamic definitions to track.
   */
  registerDefinitions(definitions: DynamicVariableDefinition[]): void {
    for (const definition of definitions) {
      const key = this.definitionKey(definition);
      this.registeredDefinitions.set(key, definition);
      this.logger.debug(
        `Registered dynamic definition '${definition.name}' (scope: ${
          definition.scope ?? "runtime"
        })`
      );
    }
  }
  /**
   * Clears all registered definitions and resets internal caches.
   */
  reset(): void {
    if (this.registeredDefinitions.size > 0) {
      this.logger.debug(
        `Resetting ${this.registeredDefinitions.size} dynamic definition(s)`
      );
    }
    this.registeredDefinitions.clear();
  }
  /**
   * Re-evaluates dynamic definitions when watched variables are updated.
   *
   * @param triggeredVariables - Variable names that recently changed.
   * @param inputResult - Optional original input result related to the definitions.
   * @param context - Current execution context with access to variables.
   * @returns Array of assignments produced during the reevaluation pass.
   */
  reevaluate(
    triggeredVariables: string[],
    inputResult: InputResult | undefined,
    context: DynamicProcessingContext
  ): DynamicVariableAssignment[] {
    if (this.registeredDefinitions.size === 0) {
      return [];
    }

    const definitionsToExecute = Array.from(
      this.registeredDefinitions.values()
    ).filter((definition) => {
      const defaultTriggers = inputResult?.variable
        ? [inputResult.variable, definition.name]
        : [definition.name];
      const triggers =
        definition.reevaluateOn && definition.reevaluateOn.length > 0
          ? definition.reevaluateOn
          : defaultTriggers;
      return triggers.some((trigger) => triggeredVariables.includes(trigger));
    });

    if (definitionsToExecute.length === 0) {
      return [];
    }

    return this.evaluateDefinitions(
      definitionsToExecute,
      inputResult,
      context,
      true
    );
  }

  private evaluateDefinitions(
    definitions: DynamicVariableDefinition[],
    inputResult: InputResult | undefined,
    context: DynamicProcessingContext,
    reevaluated: boolean
  ): DynamicVariableAssignment[] {
    const assignments: DynamicVariableAssignment[] = [];

    const captureSource = {
      value: inputResult?.value,
      input: inputResult,
      variables: context.variables,
      metadata: {
        step: context.stepName,
        suite: context.suiteName,
        timestamp: context.timestamp,
      },
      extras: context.extras,
    };

    for (const definition of definitions) {
      try {
        const scope: DynamicVariableScope = definition.scope ?? "runtime";
        let value: any;

        if (definition.type === "capture") {
          const captureResult = this.captureService.captureFromObject(
            { [definition.name]: definition.expression },
            captureSource,
            context.variables
          );
          value = captureResult[definition.name];
        } else {
          const computedContext: ComputedEvaluationContext = {
            variables: context.variables,
            captured: {},
            input: {
              variable: inputResult?.variable ?? "",
              value: inputResult?.value,
              used_default: inputResult?.used_default,
              validation_passed: inputResult?.validation_passed,
            },
            extras: {
              stepName: context.stepName,
              suiteNodeId: context.suiteNodeId,
              suiteName: context.suiteName,
              ...(context.extras || {}),
            },
          };
          value = this.computedService.evaluateExpression(
            definition.expression,
            computedContext
          );
        }

        if (value !== undefined) {
          assignments.push({
            name: definition.name,
            value,
            scope,
            source: reevaluated ? "reevaluation" : definition.type,
            expression: definition.expression,
            timestamp: new Date().toISOString(),
            reevaluated,
            persist: definition.persist,
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to evaluate dynamic definition '${definition.name}': ${error}`
        );
      }
    }

    return assignments;
  }

  private createImmediateDefinitions(
    dynamicConfig: InputDynamicConfig,
    inputResult: InputResult
  ): DynamicVariableDefinition[] {
    const definitions: DynamicVariableDefinition[] = [];
    const scope = dynamicConfig.scope ?? "runtime";
    const persistDefault = dynamicConfig.persist_to_global ?? false;

    if (dynamicConfig.capture) {
      for (const [name, expression] of Object.entries(dynamicConfig.capture)) {
        definitions.push({
          name,
          expression,
          type: "capture",
          scope,
          persist:
            persistDefault || (dynamicConfig.exports?.includes(name) ?? false),
          reevaluateOn: [inputResult.variable],
        });
      }
    }

    if (dynamicConfig.computed) {
      for (const [name, expression] of Object.entries(dynamicConfig.computed)) {
        definitions.push({
          name,
          expression,
          type: "computed",
          scope,
          persist:
            persistDefault || (dynamicConfig.exports?.includes(name) ?? false),
          reevaluateOn: [inputResult.variable],
        });
      }
    }

    return definitions;
  }

  private normalizeReevaluationDefinitions(
    dynamicConfig: InputDynamicConfig,
    inputResult: InputResult
  ): DynamicVariableDefinition[] {
    if (!dynamicConfig.reevaluate || dynamicConfig.reevaluate.length === 0) {
      return [];
    }

    const scope = dynamicConfig.scope ?? "runtime";
    const persistDefault = dynamicConfig.persist_to_global ?? false;

    return dynamicConfig.reevaluate.map((definition) => ({
      ...definition,
      type: definition.type ?? "computed",
      scope: definition.scope ?? scope,
      persist:
        definition.persist ??
        (persistDefault ||
          (dynamicConfig.exports?.includes(definition.name) ?? false)),
      reevaluateOn:
        definition.reevaluateOn && definition.reevaluateOn.length > 0
          ? definition.reevaluateOn
          : [inputResult.variable, definition.name],
    }));
  }

  private definitionKey(definition: DynamicVariableDefinition): string {
    return `${definition.name}:${definition.type}:${definition.expression}`;
  }
}
