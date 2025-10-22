/**
 * @fileoverview Central exports for interpolation service and strategies
 */

export {
  InterpolationService,
  interpolationService,
  InterpolationConfig,
  InterpolationContext,
} from "../interpolation.service";

export {
  InterpolationStrategy,
  InterpolationStrategyContext,
  InterpolationResult,
  PreprocessStrategy,
} from "./interpolation-strategy.interface";

export {
  EnvironmentVariableStrategy,
  FakerStrategy,
  JavaScriptStrategy,
  VariableStrategy,
} from "./strategies";
