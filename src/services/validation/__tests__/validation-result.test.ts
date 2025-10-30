/**
 * @fileoverview Tests for ValidationResult
 */

import {
  ValidationResult,
  ValidationResultSet,
  ValidationResultHelper,
  ValidationSeverity,
} from '../validation-result';

describe('ValidationResult', () => {
  describe('ValidationResultHelper.success', () => {
    it('should create success result', () => {
      const result = ValidationResultHelper.success('email', 'pattern', 'test@example.com');

      expect(result.valid).toBe(true);
      expect(result.field).toBe('email');
      expect(result.validatorName).toBe('pattern');
      expect(result.value).toBe('test@example.com');
    });

    it('should not include message for success', () => {
      const result = ValidationResultHelper.success('field', 'validator', 'value');

      expect(result.message).toBeUndefined();
      expect(result.severity).toBeUndefined();
    });
  });

  describe('ValidationResultHelper.failure', () => {
    it('should create error result with default severity', () => {
      const result = ValidationResultHelper.failure(
        'password',
        'min_length',
        '123',
        'Password must be at least 8 characters'
      );

      expect(result.valid).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.message).toBe('Password must be at least 8 characters');
    });

    it('should create result with custom severity', () => {
      const result = ValidationResultHelper.failure(
        'age',
        'range',
        150,
        'Age seems unusually high',
        'warning'
      );

      expect(result.valid).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should include expected and actual values', () => {
      const result = ValidationResultHelper.failure(
        'count',
        'max',
        100,
        'Count exceeds maximum',
        'error',
        50,
        100
      );

      expect(result.expected).toBe(50);
      expect(result.actual).toBe(100);
    });

    it('should work without expected/actual', () => {
      const result = ValidationResultHelper.failure(
        'field',
        'validator',
        'value',
        'Error message'
      );

      expect(result.expected).toBeUndefined();
      expect(result.actual).toBeUndefined();
    });
  });

  describe('ValidationResultHelper.aggregate', () => {
    it('should aggregate multiple results', () => {
      const results: ValidationResult[] = [
        ValidationResultHelper.success('field1', 'validator1', 'value1'),
        ValidationResultHelper.failure('field2', 'validator2', 'value2', 'Error'),
      ];

      const aggregated = ValidationResultHelper.aggregate('testField', results);

      expect(aggregated.valid).toBe(false);
      expect(aggregated.results).toHaveLength(2);
      expect(aggregated.errors).toHaveLength(1);
      expect(aggregated.errors[0]).toBe('Error');
    });

    it('should handle empty results array', () => {
      const aggregated = ValidationResultHelper.aggregate('field', []);

      expect(aggregated.valid).toBe(true);
      expect(aggregated.results).toEqual([]);
      expect(aggregated.errors).toEqual([]);
      expect(aggregated.warnings).toEqual([]);
    });

    it('should separate errors and warnings', () => {
      const results: ValidationResult[] = [
        ValidationResultHelper.failure('f1', 'v1', 'val', 'error1', 'error'),
        ValidationResultHelper.failure('f2', 'v2', 'val', 'error2', 'error'),
        ValidationResultHelper.failure('f3', 'v3', 'val', 'warn1', 'warning'),
      ];

      const aggregated = ValidationResultHelper.aggregate('field', results);

      expect(aggregated.errors).toHaveLength(2);
      expect(aggregated.warnings).toHaveLength(1);
      expect(aggregated.errors).toContain('error1');
      expect(aggregated.warnings).toContain('warn1');
    });

    it('should be valid when all results pass', () => {
      const results: ValidationResult[] = [
        ValidationResultHelper.success('f1', 'v1', 'val1'),
        ValidationResultHelper.success('f2', 'v2', 'val2'),
      ];

      const aggregated = ValidationResultHelper.aggregate('field', results);

      expect(aggregated.valid).toBe(true);
      expect(aggregated.errors).toEqual([]);
    });

    it('should be valid with only warnings', () => {
      const results: ValidationResult[] = [
        ValidationResultHelper.failure('f1', 'v1', 'val', 'warn', 'warning'),
      ];

      const aggregated = ValidationResultHelper.aggregate('field', results);

      expect(aggregated.valid).toBe(true);
      expect(aggregated.warnings).toHaveLength(1);
    });
  });

  describe('ValidationResultHelper.hasErrors', () => {
    it('should return true when result set has errors', () => {
      const resultSet: ValidationResultSet = {
        valid: false,
        field: 'test',
        results: [],
        errors: ['error1'],
        warnings: [],
      };

      expect(ValidationResultHelper.hasErrors(resultSet)).toBe(true);
    });

    it('should return false when no errors', () => {
      const resultSet: ValidationResultSet = {
        valid: true,
        field: 'test',
        results: [],
        errors: [],
        warnings: [],
      };

      expect(ValidationResultHelper.hasErrors(resultSet)).toBe(false);
    });

    it('should return false with only warnings', () => {
      const resultSet: ValidationResultSet = {
        valid: true,
        field: 'test',
        results: [],
        errors: [],
        warnings: ['warning1'],
      };

      expect(ValidationResultHelper.hasErrors(resultSet)).toBe(false);
    });
  });

  describe('ValidationResultHelper.hasWarnings', () => {
    it('should return true when result set has warnings', () => {
      const resultSet: ValidationResultSet = {
        valid: true,
        field: 'test',
        results: [],
        errors: [],
        warnings: ['warning1'],
      };

      expect(ValidationResultHelper.hasWarnings(resultSet)).toBe(true);
    });

    it('should return false when no warnings', () => {
      const resultSet: ValidationResultSet = {
        valid: true,
        field: 'test',
        results: [],
        errors: [],
        warnings: [],
      };

      expect(ValidationResultHelper.hasWarnings(resultSet)).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should handle complex validation scenario', () => {
      const results: ValidationResult[] = [
        ValidationResultHelper.success('username', 'required', 'john_doe'),
        ValidationResultHelper.success('username', 'min_length', 'john_doe'),
        ValidationResultHelper.failure('email', 'pattern', 'invalid', 'Invalid email format'),
        ValidationResultHelper.failure('age', 'range', 200, 'Age too high', 'warning'),
      ];

      const aggregated = ValidationResultHelper.aggregate('user', results);

      expect(aggregated.valid).toBe(false);
      expect(aggregated.errors).toHaveLength(1);
      expect(aggregated.warnings).toHaveLength(1);
      expect(ValidationResultHelper.hasErrors(aggregated)).toBe(true);
      expect(ValidationResultHelper.hasWarnings(aggregated)).toBe(true);
    });
  });
});
