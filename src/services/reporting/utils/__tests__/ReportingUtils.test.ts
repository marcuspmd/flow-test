/**
 * @fileoverview Tests for ReportingUtils
 */

import { ReportingUtils } from '../ReportingUtils';
import type { AssertionResult } from '../../../../types/engine.types';

describe('ReportingUtils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(ReportingUtils.escapeHtml('<div>Test & "quoted"</div>'))
        .toBe('&lt;div&gt;Test &amp; &quot;quoted&quot;&lt;/div&gt;');
    });

    it('should escape single quotes', () => {
      expect(ReportingUtils.escapeHtml("Test's value")).toBe("Test&#39;s value");
    });

    it('should handle null values', () => {
      expect(ReportingUtils.escapeHtml(null)).toBe('');
    });

    it('should handle undefined values', () => {
      expect(ReportingUtils.escapeHtml(undefined)).toBe('');
    });

    it('should convert numbers to strings', () => {
      expect(ReportingUtils.escapeHtml(123)).toBe('123');
    });

    it('should handle strings without special characters', () => {
      expect(ReportingUtils.escapeHtml('plain text')).toBe('plain text');
    });
  });

  describe('escapeAttribute', () => {
    it('should escape attribute special characters', () => {
      expect(ReportingUtils.escapeAttribute('value & "test"'))
        .toBe('value &amp; &quot;test&quot;');
    });

    it('should escape single quotes', () => {
      expect(ReportingUtils.escapeAttribute("it's")).toBe('it&#39;s');
    });

    it('should handle empty strings', () => {
      expect(ReportingUtils.escapeAttribute('')).toBe('');
    });
  });

  describe('formatJson', () => {
    it('should format JSON with 2-space indentation', () => {
      const obj = { name: 'test', value: 123 };
      const result = ReportingUtils.formatJson(obj);
      expect(result).toContain('  ');
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      const result = ReportingUtils.formatJson(arr);
      expect(JSON.parse(result)).toEqual(arr);
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      const result = ReportingUtils.formatJson(obj);
      expect(typeof result).toBe('string');
    });

    it('should handle null', () => {
      expect(ReportingUtils.formatJson(null)).toBe('null');
    });

    it('should handle undefined', () => {
      const result = ReportingUtils.formatJson(undefined);
      expect(result).toBe(undefined);
    });
  });

  describe('formatXml', () => {
    it('should format XML with indentation', () => {
      const xml = '<root><child>value</child></root>';
      const result = ReportingUtils.formatXml(xml);
      expect(result).toContain('\n');
      expect(result).toContain('<root>');
      expect(result).toContain('  <child>');
    });

    it('should handle self-closing tags', () => {
      const xml = '<root><item/></root>';
      const result = ReportingUtils.formatXml(xml);
      expect(result).toContain('<item/>');
    });

    it('should handle already formatted XML', () => {
      const xml = '<root>\n  <child>value</child>\n</root>';
      const result = ReportingUtils.formatXml(xml);
      expect(result).toContain('<root>');
    });

    it('should handle malformed XML gracefully', () => {
      const xml = '<root><unclosed>';
      const result = ReportingUtils.formatXml(xml);
      expect(typeof result).toBe('string');
    });

    it('should handle empty XML', () => {
      expect(ReportingUtils.formatXml('')).toBe('');
    });

    it('should handle XML with attributes', () => {
      const xml = '<root attr="value"><child/></root>';
      const result = ReportingUtils.formatXml(xml);
      expect(result).toContain('attr="value"');
    });
  });

  describe('formatDateTime', () => {
    it('should format valid ISO date string', () => {
      const date = '2024-01-01T12:00:00.000Z';
      const result = ReportingUtils.formatDateTime(date);
      expect(result).toContain('2024');
      expect(result).not.toBe('n/a');
    });

    it('should return "n/a" for undefined', () => {
      expect(ReportingUtils.formatDateTime(undefined)).toBe('n/a');
    });

    it('should return "n/a" for empty string', () => {
      expect(ReportingUtils.formatDateTime('')).toBe('n/a');
    });

    it('should return original value for invalid date', () => {
      expect(ReportingUtils.formatDateTime('invalid-date')).toBe('invalid-date');
    });

    it('should handle timestamp numbers as strings', () => {
      const timestamp = new Date().toISOString();
      const result = ReportingUtils.formatDateTime(timestamp);
      expect(result).not.toBe('n/a');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds under 1 second', () => {
      expect(ReportingUtils.formatDuration(500)).toBe('500 ms');
    });

    it('should format seconds with 2 decimal places', () => {
      expect(ReportingUtils.formatDuration(1234)).toBe('1.23 s');
    });

    it('should format exact seconds', () => {
      expect(ReportingUtils.formatDuration(5000)).toBe('5.00 s');
    });

    it('should return "n/a" for Infinity', () => {
      expect(ReportingUtils.formatDuration(Infinity)).toBe('n/a');
    });

    it('should return "n/a" for NaN', () => {
      expect(ReportingUtils.formatDuration(NaN)).toBe('n/a');
    });

    it('should handle zero duration', () => {
      expect(ReportingUtils.formatDuration(0)).toBe('0 ms');
    });

    it('should handle negative durations', () => {
      expect(ReportingUtils.formatDuration(-100)).toBe('-100 ms');
    });
  });

  describe('getStatusClass', () => {
    it('should return status-success for success', () => {
      expect(ReportingUtils.getStatusClass('success')).toBe('status-success');
    });

    it('should return status-failure for failure', () => {
      expect(ReportingUtils.getStatusClass('failure')).toBe('status-failure');
    });

    it('should return status-skipped for skipped', () => {
      expect(ReportingUtils.getStatusClass('skipped')).toBe('status-skipped');
    });

    it('should return status-skipped for unknown status', () => {
      expect(ReportingUtils.getStatusClass('unknown')).toBe('status-skipped');
    });
  });

  describe('formatAssertionsSummary', () => {
    it('should format passed/total assertions', () => {
      const assertions: AssertionResult[] = [
        { field: 'a', expected: 200, actual: 200, passed: true, message: 'ok' },
        { field: 'b', expected: 'test', actual: 'test', passed: true, message: 'ok' },
        { field: 'c', expected: true, actual: false, passed: false, message: 'fail' },
      ];
      expect(ReportingUtils.formatAssertionsSummary(assertions)).toBe('2/3');
    });

    it('should return — for undefined assertions', () => {
      expect(ReportingUtils.formatAssertionsSummary(undefined)).toBe('—');
    });

    it('should return — for empty array', () => {
      expect(ReportingUtils.formatAssertionsSummary([])).toBe('—');
    });

    it('should handle all passed', () => {
      const assertions: AssertionResult[] = [
        { field: 'a', expected: 1, actual: 1, passed: true, message: 'ok' },
        { field: 'b', expected: 2, actual: 2, passed: true, message: 'ok' },
      ];
      expect(ReportingUtils.formatAssertionsSummary(assertions)).toBe('2/2');
    });

    it('should handle all failed', () => {
      const assertions: AssertionResult[] = [
        { field: 'a', expected: 1, actual: 2, passed: false, message: 'fail' },
        { field: 'b', expected: 3, actual: 4, passed: false, message: 'fail' },
      ];
      expect(ReportingUtils.formatAssertionsSummary(assertions)).toBe('0/2');
    });
  });

  describe('generateTimestamp', () => {
    it('should generate timestamp in correct format', () => {
      const timestamp = ReportingUtils.generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
    });

    it('should not contain colons or dots', () => {
      const timestamp = ReportingUtils.generateTimestamp();
      expect(timestamp).not.toContain(':');
      expect(timestamp).not.toContain('.');
    });

    it('should be 19 characters long', () => {
      const timestamp = ReportingUtils.generateTimestamp();
      expect(timestamp).toHaveLength(19);
    });
  });

  describe('sanitizeFileName', () => {
    it('should convert to lowercase', () => {
      expect(ReportingUtils.sanitizeFileName('TestFile')).toBe('testfile');
    });

    it('should replace spaces with hyphens', () => {
      expect(ReportingUtils.sanitizeFileName('test file name')).toBe('test-file-name');
    });

    it('should remove special characters', () => {
      expect(ReportingUtils.sanitizeFileName('test@file#name!')).toBe('testfilename');
    });

    it('should collapse multiple hyphens', () => {
      expect(ReportingUtils.sanitizeFileName('test---file')).toBe('test-file');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(ReportingUtils.sanitizeFileName('-test-file-')).toBe('test-file');
    });

    it('should handle empty string', () => {
      expect(ReportingUtils.sanitizeFileName('')).toBe('');
    });

    it('should preserve numbers', () => {
      expect(ReportingUtils.sanitizeFileName('test123')).toBe('test123');
    });

    it('should handle only special characters', () => {
      expect(ReportingUtils.sanitizeFileName('@#$%')).toBe('');
    });
  });

  describe('generateCurlCommand', () => {
    it('should generate basic GET request', () => {
      const request = { method: 'GET', url: 'http://example.com/api' };
      const result = ReportingUtils.generateCurlCommand(request);
      expect(result).toContain('curl');
      expect(result).toContain('http://example.com/api');
      expect(result).not.toContain('-X GET');
    });

    it('should generate POST request with method', () => {
      const request = { method: 'POST', url: 'http://example.com/api' };
      const result = ReportingUtils.generateCurlCommand(request);
      expect(result).toContain('-X POST');
    });

    it('should include headers', () => {
      const request = {
        method: 'GET',
        url: 'http://example.com/api',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' }
      };
      const result = ReportingUtils.generateCurlCommand(request);
      expect(result).toContain('-H "Content-Type: application/json"');
      expect(result).toContain('-H "Authorization: Bearer token"');
    });

    it('should include JSON body', () => {
      const request = {
        method: 'POST',
        url: 'http://example.com/api',
        body: { name: 'test', value: 123 }
      };
      const result = ReportingUtils.generateCurlCommand(request);
      expect(result).toContain('-d');
      expect(result).toContain('"name":"test"');
    });

    it('should include string body', () => {
      const request = {
        method: 'POST',
        url: 'http://example.com/api',
        body: 'raw string data'
      };
      const result = ReportingUtils.generateCurlCommand(request);
      expect(result).toContain('-d \'raw string data\'');
    });

    it('should prefer full_url over url', () => {
      const request = {
        method: 'GET',
        url: '/api',
        full_url: 'http://example.com/api'
      };
      const result = ReportingUtils.generateCurlCommand(request);
      expect(result).toContain('http://example.com/api');
    });

    it('should return message for null request', () => {
      const result = ReportingUtils.generateCurlCommand(null);
      expect(result).toContain('No request details');
    });

    it('should return message for undefined request', () => {
      const result = ReportingUtils.generateCurlCommand(undefined);
      expect(result).toContain('No request details');
    });
  });

  describe('isBinaryPayload', () => {
    it('should return false for null', () => {
      expect(ReportingUtils.isBinaryPayload(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(ReportingUtils.isBinaryPayload(undefined)).toBe(false);
    });

    it('should return false for strings', () => {
      expect(ReportingUtils.isBinaryPayload('test')).toBe(false);
    });

    it('should return false for objects', () => {
      expect(ReportingUtils.isBinaryPayload({ key: 'value' })).toBe(false);
    });

    it('should return true for Buffer', () => {
      const buffer = Buffer.from('test');
      expect(ReportingUtils.isBinaryPayload(buffer)).toBe(true);
    });

    it('should return true for ArrayBuffer', () => {
      const buffer = new ArrayBuffer(8);
      expect(ReportingUtils.isBinaryPayload(buffer)).toBe(true);
    });

    it('should return true for TypedArray', () => {
      const buffer = new Uint8Array([1, 2, 3]);
      expect(ReportingUtils.isBinaryPayload(buffer)).toBe(true);
    });
  });

  describe('extractBodyString', () => {
    it('should return undefined for null body', () => {
      expect(ReportingUtils.extractBodyString({ body: null })).toBeUndefined();
    });

    it('should return string body as-is', () => {
      expect(ReportingUtils.extractBodyString({ body: 'test string' })).toBe('test string');
    });

    it('should JSON stringify objects', () => {
      const body = { name: 'test', value: 123 };
      const result = ReportingUtils.extractBodyString({ body });
      expect(result).toContain('"name"');
      expect(result).toContain('"test"');
    });

    it('should handle Buffer', () => {
      const body = Buffer.from('test data');
      const result = ReportingUtils.extractBodyString({ body });
      expect(result).toBe('test data');
    });

    it('should handle ArrayBuffer', () => {
      const encoder = new TextEncoder();
      const body = encoder.encode('test data').buffer;
      const result = ReportingUtils.extractBodyString({ body });
      expect(result).toBe('test data');
    });

    it('should extract from raw_response if body is null', () => {
      const response = {
        body: null,
        raw_response: 'HTTP/1.1 200 OK\r\n\r\ntest body'
      };
      const result = ReportingUtils.extractBodyString(response);
      expect(result).toBe('test body');
    });

    it('should return raw_response if no separator found', () => {
      const response = {
        body: null,
        raw_response: 'raw data without headers'
      };
      const result = ReportingUtils.extractBodyString(response);
      expect(result).toBe('raw data without headers');
    });

    it('should handle JSON stringify errors gracefully', () => {
      const circular: any = {};
      circular.self = circular;
      const result = ReportingUtils.extractBodyString({ body: circular });
      expect(typeof result).toBe('string');
    });
  });
});
