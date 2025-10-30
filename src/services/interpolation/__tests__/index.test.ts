/**
 * @fileoverview Tests for interpolation module exports
 */

import {
  InterpolationService,
  EnvironmentVariableStrategy,
  FakerStrategy,
  JavaScriptStrategy,
  VariableStrategy,
} from '../index';

describe('Interpolation Module Exports', () => {
  it('should export InterpolationService', () => {
    expect(InterpolationService).toBeDefined();
  });

  it('should export EnvironmentVariableStrategy', () => {
    expect(EnvironmentVariableStrategy).toBeDefined();
  });

  it('should export FakerStrategy', () => {
    expect(FakerStrategy).toBeDefined();
  });

  it('should export JavaScriptStrategy', () => {
    expect(JavaScriptStrategy).toBeDefined();
  });

  it('should export VariableStrategy', () => {
    expect(VariableStrategy).toBeDefined();
  });
});
