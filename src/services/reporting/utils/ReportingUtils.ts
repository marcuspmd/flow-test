/**
 * @fileoverview Utility functions for report generation (formatting, escaping, etc.)
 */

import type { AssertionResult } from "../../../types/engine.types";

/**
 * Shared utilities for all report strategies
 */
export class ReportingUtils {
  /**
   * Escape HTML special characters
   */
  static escapeHtml(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Escape attribute values for HTML attributes
   */
  static escapeAttribute(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Format JSON with indentation
   */
  static formatJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  /**
   * Format XML with indentation
   */
  static formatXml(xml: string): string {
    try {
      let formatted = "";
      const reg = /(>)(<)(\/*)/g;
      let padding = 0;
      const PADDING = "  ";
      const cleaned = xml
        .replace(/\r?\n/g, "")
        .replace(reg, "$1\n$2")
        .split("\n");

      for (const node of cleaned) {
        const trimmed = node.trim();
        if (!trimmed) {
          continue;
        }

        if (/^<\//.test(trimmed)) {
          padding = Math.max(padding - 1, 0);
        }

        const indent = PADDING.repeat(padding);
        formatted += `${indent}${trimmed}\n`;

        if (
          /^<[^!?][^>]*[^/]?>$/.test(trimmed) &&
          !/^<[^>]+>.*<\/[^>]+>$/.test(trimmed)
        ) {
          padding += 1;
        }
      }

      return formatted.trim();
    } catch {
      return xml;
    }
  }

  /**
   * Format date/time as locale string
   */
  static formatDateTime(value: string | undefined): string {
    if (!value) {
      return "n/a";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  static formatDuration(durationMs: number): string {
    if (!Number.isFinite(durationMs)) {
      return "n/a";
    }

    if (durationMs >= 1000) {
      return `${(durationMs / 1000).toFixed(2)} s`;
    }

    return `${durationMs.toFixed(0)} ms`;
  }

  /**
   * Get CSS class name for status
   */
  static getStatusClass(status: string): string {
    switch (status) {
      case "success":
        return "status-success";
      case "failure":
        return "status-failure";
      default:
        return "status-skipped";
    }
  }

  /**
   * Format assertions summary as "passed/total"
   */
  static formatAssertionsSummary(assertions?: AssertionResult[]): string {
    if (!assertions || assertions.length === 0) {
      return "—";
    }

    const passed = assertions.filter((assertion) => assertion.passed).length;
    return `${passed}/${assertions.length}`;
  }

  /**
   * Generate timestamp string for file names (YYYY-MM-DD_HH-mm-ss)
   */
  static generateTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace(/T/, "_")
      .slice(0, 19);
  }

  /**
   * Sanitize string for use as file name
   */
  static sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Generate cURL command from request details
   */
  static generateCurlCommand(requestDetails: any): string {
    if (!requestDetails) {
      return "# No request details available";
    }

    let curlCommand = "curl";

    // Add method
    if (requestDetails.method && requestDetails.method !== "GET") {
      curlCommand += ` -X ${requestDetails.method}`;
    }

    // Add headers
    if (requestDetails.headers && typeof requestDetails.headers === "object") {
      Object.entries(requestDetails.headers).forEach(([key, value]) => {
        curlCommand += ` \\\n  -H "${key}: ${value}"`;
      });
    }

    // Add body if present
    if (requestDetails.body) {
      const bodyStr =
        typeof requestDetails.body === "string"
          ? requestDetails.body
          : JSON.stringify(requestDetails.body);
      curlCommand += ` \\\n  -d '${bodyStr}'`;
    }

    // Add URL (use full_url if available, otherwise url)
    const url = requestDetails.full_url || requestDetails.url || "";
    curlCommand += ` \\\n  "${url}"`;

    return curlCommand;
  }

  /**
   * Check if value is binary payload (Buffer, ArrayBuffer, etc.)
   */
  static isBinaryPayload(value: unknown): boolean {
    if (!value) {
      return false;
    }

    if (
      typeof Buffer !== "undefined" &&
      typeof Buffer.isBuffer === "function" &&
      Buffer.isBuffer(value)
    ) {
      return true;
    }

    if (value instanceof ArrayBuffer) {
      return true;
    }

    return (
      typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value as any)
    );
  }

  /**
   * Extract body string from response for display
   */
  static extractBodyString(response: any): string | undefined {
    if (response.body === null || response.body === undefined) {
      if (typeof response.raw_response === "string") {
        const separator = response.raw_response.indexOf("\r\n\r\n");
        if (separator !== -1) {
          return response.raw_response.slice(separator + 4);
        }
        return response.raw_response;
      }
      return undefined;
    }

    if (typeof response.body === "string") {
      return response.body;
    }

    if (this.isBinaryPayload(response.body)) {
      try {
        if (typeof Buffer !== "undefined" && Buffer.isBuffer(response.body)) {
          return response.body.toString("utf8");
        }

        if (response.body instanceof ArrayBuffer) {
          if (typeof Buffer !== "undefined") {
            return Buffer.from(new Uint8Array(response.body)).toString("utf8");
          }
          return undefined;
        }

        if (ArrayBuffer.isView(response.body)) {
          if (typeof Buffer !== "undefined") {
            const view = response.body as ArrayBufferView;
            return Buffer.from(
              view.buffer,
              view.byteOffset,
              view.byteLength
            ).toString("utf8");
          }
          return undefined;
        }
      } catch {
        return undefined;
      }

      return undefined;
    }

    try {
      return JSON.stringify(response.body, null, 2);
    } catch {
      return String(response.body);
    }
  }
}
