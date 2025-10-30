/**
 * @fileoverview Tests for reporting module exports
 */

import {
  ReportingUtils,
  JsonReportStrategy,
  QAReportStrategy,
  HtmlReportStrategy,
  HtmlTemplateRenderer,
} from '../index';

describe('Reporting Module Exports', () => {
  it('should export ReportingUtils', () => {
    expect(ReportingUtils).toBeDefined();
  });

  it('should export JsonReportStrategy', () => {
    expect(JsonReportStrategy).toBeDefined();
  });

  it('should export QAReportStrategy', () => {
    expect(QAReportStrategy).toBeDefined();
  });

  it('should export HtmlReportStrategy', () => {
    expect(HtmlReportStrategy).toBeDefined();
  });

  it('should export HtmlTemplateRenderer', () => {
    expect(HtmlTemplateRenderer).toBeDefined();
  });
});
