/**
 * @fileoverview Tests for ResponseContextBuilder
 */

import { ResponseContextBuilder } from '../response-context-builder';
import type { StepExecutionResult } from '../../types/config.types';

describe('ResponseContextBuilder', () => {
  let mockStepResult: StepExecutionResult;

  beforeEach(() => {
    mockStepResult = {
      step_name: 'Test Step',
      status: 'success',
      duration_ms: 150,
      response_details: {
        status_code: 200,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'value'
        },
        body: {
          id: 1,
          name: 'Test',
          items: [1, 2, 3]
        },
        size_bytes: 1024
      }
    };
  });

  describe('build', () => {
    it('should build basic context from step result', () => {
      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.status_code).toBe(200);
      expect(context.headers).toEqual({
        'content-type': 'application/json',
        'x-custom-header': 'value'
      });
      expect(context.body).toEqual({
        id: 1,
        name: 'Test',
        items: [1, 2, 3]
      });
      expect(context.duration_ms).toBe(150);
      expect(context.size_bytes).toBe(1024);
    });

    it('should include step status when requested', () => {
      const context = ResponseContextBuilder.build(mockStepResult, {
        includeStepStatus: true
      });

      expect(context.step_status).toBe('success');
    });

    it('should not include step status by default', () => {
      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.step_status).toBeUndefined();
    });

    it('should include additional fields', () => {
      const context = ResponseContextBuilder.build(mockStepResult, {
        additionalFields: {
          request_id: '123',
          custom_data: 'value'
        }
      });

      expect(context).toHaveProperty('request_id', '123');
      expect(context).toHaveProperty('custom_data', 'value');
    });

    it('should handle empty headers', () => {
      mockStepResult.response_details!.headers = {};

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.headers).toEqual({});
    });

    it('should handle null body', () => {
      mockStepResult.response_details!.body = null;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body).toBeNull();
    });

    it('should handle string body', () => {
      mockStepResult.response_details!.body = 'plain text response';

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body).toBe('plain text response');
    });

    it('should handle array body', () => {
      mockStepResult.response_details!.body = [1, 2, 3];

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body).toEqual([1, 2, 3]);
    });

    it('should handle missing size_bytes', () => {
      mockStepResult.response_details = {
        ...mockStepResult.response_details!,
        size_bytes: 0
      };
      (mockStepResult.response_details as any).size_bytes = undefined;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.size_bytes).toBeUndefined();
    });

    it('should handle failure status', () => {
      mockStepResult.status = 'failure';

      const context = ResponseContextBuilder.build(mockStepResult, {
        includeStepStatus: true
      });

      expect(context.step_status).toBe('failure');
    });

    it('should handle skipped status', () => {
      mockStepResult.status = 'skipped';

      const context = ResponseContextBuilder.build(mockStepResult, {
        includeStepStatus: true
      });

      expect(context.step_status).toBe('skipped');
    });

    it('should handle 4xx status codes', () => {
      mockStepResult.response_details!.status_code = 404;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.status_code).toBe(404);
    });

    it('should handle 5xx status codes', () => {
      mockStepResult.response_details!.status_code = 500;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.status_code).toBe(500);
    });

    it('should preserve header keys case', () => {
      mockStepResult.response_details!.headers = {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'VALUE'
      };

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.headers['Content-Type']).toBe('application/json');
      expect(context.headers['X-Custom-Header']).toBe('VALUE');
    });

    it('should handle complex nested body', () => {
      mockStepResult.response_details!.body = {
        user: {
          id: 1,
          profile: {
            name: 'Test',
            settings: {
              theme: 'dark'
            }
          }
        },
        metadata: {
          version: '1.0.0'
        }
      };

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body.user.profile.settings.theme).toBe('dark');
      expect(context.body.metadata.version).toBe('1.0.0');
    });

    it('should handle zero duration', () => {
      mockStepResult.duration_ms = 0;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.duration_ms).toBe(0);
    });

    it('should combine all options', () => {
      const context = ResponseContextBuilder.build(mockStepResult, {
        includeStepStatus: true,
        additionalFields: {
          suite_id: 'suite-123',
          step_index: 5
        }
      });

      expect(context.status_code).toBe(200);
      expect(context.step_status).toBe('success');
      expect(context).toHaveProperty('suite_id', 'suite-123');
      expect(context).toHaveProperty('step_index', 5);
    });

    it('should handle empty additional fields', () => {
      const context = ResponseContextBuilder.build(mockStepResult, {
        additionalFields: {}
      });

      expect(context.status_code).toBe(200);
      expect(context.body).toBeDefined();
    });

    it('should handle boolean body', () => {
      mockStepResult.response_details!.body = true;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body).toBe(true);
    });

    it('should handle number body', () => {
      mockStepResult.response_details!.body = 42;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body).toBe(42);
    });

    it('should handle undefined body', () => {
      mockStepResult.response_details!.body = undefined;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.body).toBeUndefined();
    });

    it('should throw error if response_details is missing', () => {
      const resultWithoutResponse = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 100
      };

      expect(() => ResponseContextBuilder.build(resultWithoutResponse))
        .toThrow('Response details not available');
    });

    it('should handle null headers gracefully', () => {
      mockStepResult.response_details!.headers = null as any;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.headers).toEqual({});
    });

    it('should handle undefined headers gracefully', () => {
      mockStepResult.response_details!.headers = undefined as any;

      const context = ResponseContextBuilder.build(mockStepResult);

      expect(context.headers).toEqual({});
    });
  });

  describe('hasValidResponse', () => {
    it('should return true for valid response', () => {
      expect(ResponseContextBuilder.hasValidResponse(mockStepResult)).toBe(true);
    });

    it('should return false if response_details is missing', () => {
      const result = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 100
      };

      expect(ResponseContextBuilder.hasValidResponse(result)).toBe(false);
    });

    it('should return false if status_code is missing', () => {
      const result = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 100,
        response_details: {
          headers: {},
          body: {},
          size_bytes: 0
        }
      } as any;

      expect(ResponseContextBuilder.hasValidResponse(result)).toBe(false);
    });

    it('should return false if status_code is not a number', () => {
      const result = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 100,
        response_details: {
          status_code: '200' as any,
          headers: {},
          body: {},
          size_bytes: 0
        }
      };

      expect(ResponseContextBuilder.hasValidResponse(result)).toBe(false);
    });

    it('should return true for 0 status code', () => {
      mockStepResult.response_details!.status_code = 0;

      expect(ResponseContextBuilder.hasValidResponse(mockStepResult)).toBe(true);
    });
  });

  describe('buildSafe', () => {
    it('should build context when response_details exists', () => {
      const context = ResponseContextBuilder.buildSafe(mockStepResult);

      expect(context.status_code).toBe(200);
      expect(context.body).toBeDefined();
    });

    it('should return partial context when response_details is missing', () => {
      const result = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 150
      };

      const context = ResponseContextBuilder.buildSafe(result);

      expect(context.duration_ms).toBe(150);
      expect(context.status_code).toBeUndefined();
      expect(context.body).toBeUndefined();
    });

    it('should include step_status in safe mode when requested', () => {
      const result = {
        step_name: 'Test',
        status: 'failure' as const,
        duration_ms: 150
      };

      const context = ResponseContextBuilder.buildSafe(result, {
        includeStepStatus: true
      });

      expect(context.step_status).toBe('failure');
    });

    it('should not include step_status in safe mode by default', () => {
      const result = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 150
      };

      const context = ResponseContextBuilder.buildSafe(result);

      expect(context.step_status).toBeUndefined();
    });

    it('should pass through options to build when response exists', () => {
      const context = ResponseContextBuilder.buildSafe(mockStepResult, {
        includeStepStatus: true,
        additionalFields: { custom: 'value' }
      });

      expect(context.step_status).toBe('success');
      expect(context).toHaveProperty('custom', 'value');
    });
  });

  describe('extract', () => {
    it('should extract specified fields', () => {
      const extracted = ResponseContextBuilder.extract(mockStepResult, [
        'status_code',
        'body'
      ]);

      expect(extracted.status_code).toBe(200);
      expect(extracted.body).toBeDefined();
      expect(extracted.headers).toBeUndefined();
      expect(extracted.duration_ms).toBeUndefined();
    });

    it('should extract single field', () => {
      const extracted = ResponseContextBuilder.extract(mockStepResult, [
        'status_code'
      ]);

      expect(extracted).toEqual({ status_code: 200 });
    });

    it('should extract all fields when requested', () => {
      const extracted = ResponseContextBuilder.extract(mockStepResult, [
        'status_code',
        'headers',
        'body',
        'duration_ms',
        'size_bytes'
      ]);

      expect(extracted.status_code).toBe(200);
      expect(extracted.headers).toBeDefined();
      expect(extracted.body).toBeDefined();
      expect(extracted.duration_ms).toBe(150);
      expect(extracted.size_bytes).toBe(1024);
    });

    it('should return empty object for empty fields array', () => {
      const extracted = ResponseContextBuilder.extract(mockStepResult, []);

      expect(extracted).toEqual({});
    });

    it('should handle extraction with undefined size_bytes', () => {
      (mockStepResult.response_details as any).size_bytes = undefined;

      const extracted = ResponseContextBuilder.extract(mockStepResult, [
        'size_bytes'
      ]);

      expect(extracted).toEqual({ size_bytes: undefined });
    });

    it('should throw if response_details missing', () => {
      const result = {
        step_name: 'Test',
        status: 'success' as const,
        duration_ms: 100
      };

      expect(() => ResponseContextBuilder.extract(result, ['status_code']))
        .toThrow('Response details not available');
    });
  });
});
