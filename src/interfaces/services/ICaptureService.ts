/**
 * Interface for the Capture Service.
 * Handles extraction of data from HTTP responses using JMESPath expressions.
 */

import { StepExecutionResult } from "../../types/config.types";

export interface ICaptureService {
  /**
   * Captures variables from HTTP response using JMESPath expressions.
   *
   * Processes a map of captures where the key is the variable name
   * to be created and the value is the JMESPath expression to extract the data.
   *
   * @param captureConfig - Map of variable_name -> jmespath_expression
   * @param result - HTTP execution result containing the response
   * @param variableContext - Current variable context for JavaScript expressions
   * @returns Object with captured variables
   */
  captureVariables(
    captureConfig: Record<string, string>,
    result: StepExecutionResult,
    variableContext?: Record<string, any>
  ): Record<string, any>;

  /**
   * Captures variables from a generic object using JMESPath expressions.
   *
   * @param captureConfig - Map of variable_name -> jmespath_expression
   * @param source - Source object to extract data from
   * @param variableContext - Current variable context for JavaScript expressions
   * @returns Object with captured variables
   */
  captureFromObject(
    captureConfig: Record<string, string>,
    source: any,
    variableContext?: Record<string, any>
  ): Record<string, any>;
}
