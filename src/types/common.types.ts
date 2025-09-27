/**
 * @fileoverview Shared type definitions for dynamic variables, input post-processing,
 * and expression reevaluation within the Flow Test Engine.
 *
 * @remarks
 * These types are consumed by execution services and YAML schema contracts to
 * describe how dynamic variables created during runtime should be tracked,
 * reevaluated, and exported across scopes. They also provide structured
 * metadata for dynamic validation rules attached to interactive inputs.
 */

/**
 * Supported scopes for dynamically created variables.
 *
 * - `runtime`: Available only for the current suite execution (default)
 * - `suite`: Persisted for the suite duration and shared across steps
 * - `global`: Exported to the global registry for reuse by other suites
 */
export type DynamicVariableScope = "runtime" | "suite" | "global";

/**
 * Source tags describing where a dynamic variable originated from.
 */
export type DynamicVariableSource =
  | "input"
  | "capture"
  | "computed"
  | "reevaluation";

/**
 * Expression languages supported when evaluating dynamic variables.
 */
export type DynamicExpressionLanguage = "jmespath" | "javascript";

/**
 * Definition of a dynamic variable that can be reevaluated multiple times
 * during the execution lifecycle.
 */
export interface DynamicVariableDefinition {
  /** Unique variable identifier that will be created/updated */
  name: string;
  /** Expression used to compute the value */
  expression: string;
  /** Indicates whether expression should be processed as capture or computed */
  type: "capture" | "computed";
  /** Optional explicit language override (defaults derive from type) */
  language?: DynamicExpressionLanguage;
  /** Target scope where the resulting value should be persisted */
  scope?: DynamicVariableScope;
  /** Optional textual description for logging/reporting */
  description?: string;
  /**
   * Whether the variable should be exported to global registry/persisted
   * beyond the current runtime context.
   */
  persist?: boolean;
  /**
   * List of variable names that should trigger reevaluation when they change.
   * When undefined, the definition is assumed to depend on the owning input value.
   */
  reevaluateOn?: string[];
}

/**
 * Concrete assignment produced after evaluating a dynamic variable definition.
 */
export interface DynamicVariableAssignment {
  /** Variable name that received the assignment */
  name: string;
  /** Value produced by evaluation */
  value: any;
  /** Scope where the value was written */
  scope: DynamicVariableScope;
  /** Metadata about the source of the assignment */
  source: DynamicVariableSource;
  /** Expression used to compute the value (for traceability) */
  expression?: string;
  /**
   * Timestamp (ISO string) representing when the assignment was produced.
   * Allows reporting/monitoring tools to order updates.
   */
  timestamp: string;
  /** Whether the assignment was produced as part of a reevaluation cycle */
  reevaluated?: boolean;
  /** Indicates if the assignment should be exported to the global registry */
  persist?: boolean;
}

/**
 * Metadata describing dynamic processing attached to an interactive input.
 */
export interface InputDynamicConfig {
  /** Default scope for variables derived from this input */
  scope?: DynamicVariableScope;
  /** Map of variable name -> JMESPath expression to capture values from input context */
  capture?: Record<string, string>;
  /** Map of variable name -> JavaScript expression for computed values */
  computed?: Record<string, string>;
  /**
   * Optional collection of definitions registered for subsequent reevaluation
   * cycles triggered by other variable changes.
   */
  reevaluate?: DynamicVariableDefinition[];
  /** List of variable names that should also be exported via global registry */
  exports?: string[];
  /**
   * When true, any derived variable will be stored in the global registry by default.
   * Useful shorthand instead of enumerating through `exports`.
   */
  persist_to_global?: boolean;
}

/**
 * Dynamic validation rule evaluated against input context and current variables.
 */
export interface InputValidationExpression {
  /** Friendly name displayed in logs */
  name?: string;
  /** Expression returning truthy for success */
  expression: string;
  /** Language used by the expression. Defaults depend on rule type. */
  language?: DynamicExpressionLanguage | "javascript-inline";
  /** Message displayed when expression evaluates to false */
  message: string;
  /**
   * Severity controls whether violation blocks progression (`error`) or just warns.
   * Warnings are logged but do not fail validation.
   */
  severity?: "error" | "warning";
  /** List of variable names that should trigger reevaluation of this rule */
  reevaluateOn?: string[];
}

/**
 * Extended validation configuration for interactive inputs.
 */
export interface InputValidationConfig {
  /** Minimum length for string inputs */
  min_length?: number;
  /** Maximum length for string inputs */
  max_length?: number;
  /** Regex pattern for validation */
  pattern?: string;
  /** Minimum numeric value accepted */
  min?: number | string;
  /** Maximum numeric value accepted */
  max?: number | string;
  /**
   * Allowed options when validation needs to restrict possible values.
   * Can be an array or an expression returning the options list.
   */
  options?: Array<{ value: any; label: string }> | string;
  /** Legacy custom validation expression (JavaScript) */
  custom_validation?: string;
  /** Collection of dynamic validation expressions */
  expressions?: InputValidationExpression[];
}

/**
 * Result of processing an input including derived dynamic variables.
 */
export interface InputProcessingResult {
  /** Raw input result provided by the InputService */
  input: {
    variable: string;
    value: any;
    used_default: boolean;
    validation_passed: boolean;
    timed_out: boolean;
    input_time_ms: number;
    validation_error?: string;
  };
  /** Derived dynamic assignments created from this input */
  derived_assignments: DynamicVariableAssignment[];
}
