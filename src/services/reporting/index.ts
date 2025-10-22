/**
 * @fileoverview Barrel export for reporting module
 */

export { ReportingService } from "../reporting";
export { ReportingUtils } from "./utils/ReportingUtils";
export {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
  ReportAsset,
} from "./strategies/ReportStrategy.interface";
export { JsonReportStrategy } from "./strategies/JsonReportStrategy";
export { QAReportStrategy } from "./strategies/QAReportStrategy";
export { HtmlReportStrategy } from "./strategies/HtmlReportStrategy";
export {
  HtmlTemplateRenderer,
  SuiteHtmlEntry,
  HtmlRenderContext,
} from "./templates/HtmlTemplateRenderer";
