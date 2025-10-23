/**
 * Interface for the Assertion Service.
 * Handles validation of HTTP responses against assertions.
 */

import { Assertions } from "../../types/engine.types";
import { AssertionResult, StepExecutionResult } from "../../types/config.types";

export interface IAssertionService {
  /**
   * Validates all assertions of an HTTP response.
   *
   * Main method that processes all configured assertions
   * and returns an array with the results of each validation.
   *
   * @param assertions - Object with assertions to be validated
   * @param result - HTTP execution result containing response
   * @returns Array of validation results
   */
  validateAssertions(
    assertions: Assertions,
    result: StepExecutionResult
  ): AssertionResult[];
}
