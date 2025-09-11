import fs from 'fs';
import path from 'path';
import { AggregatedResult, StepExecutionResult } from '../types/config.types';

export interface PostmanCollection {
  info: {
    name: string;
    description: string;
    version: string;
    schema: string;
  };
  variable: Array<{
    key: string;
    value: string;
    type: string;
  }>;
  item: PostmanItem[];
}

export interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: Array<{
      key: string;
      value: string;
      type: string;
    }>;
    body?: {
      mode: string;
      raw: string;
      options?: {
        raw: {
          language: string;
        };
      };
    };
    url: {
      raw: string;
      protocol: string;
      host: string[];
      path: string[];
      query?: Array<{
        key: string;
        value: string;
      }>;
    };
    description: string;
  };
  response: PostmanResponse[];
}

export interface PostmanResponse {
  name: string;
  originalRequest: any;
  status: string;
  code: number;
  _postman_previewlanguage: string;
  header: Array<{
    key: string;
    value: string;
  }>;
  body: string;
}

export class PostmanExporter {
  /**
   * Exports test results to Postman Collection v2.1 format
   */
  async exportFromJSON(jsonPath: string, outputPath?: string): Promise<string> {
    const jsonData = await this.loadJSONData(jsonPath);
    return this.exportCollection(jsonData, outputPath);
  }

  /**
   * Exports aggregated result to Postman Collection
   */
  async exportCollection(data: AggregatedResult, outputPath?: string): Promise<string> {
    const collection = this.buildPostmanCollection(data);
    
    const finalOutputPath = outputPath || 
      path.join('./results', `${this.sanitizeFileName(data.project_name)}_postman_collection.json`);
    
    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(finalOutputPath, JSON.stringify(collection, null, 2), 'utf8');
    
    return finalOutputPath;
  }

  /**
   * Exports as cURL script file
   */
  async exportCurlScript(data: AggregatedResult, outputPath?: string): Promise<string> {
    const script = this.buildCurlScript(data);
    
    const finalOutputPath = outputPath || 
      path.join('./results', `${this.sanitizeFileName(data.project_name)}_curl_commands.sh`);
    
    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(finalOutputPath, script, 'utf8');
    fs.chmodSync(finalOutputPath, '755'); // Make executable
    
    return finalOutputPath;
  }

  private async loadJSONData(jsonPath: string): Promise<AggregatedResult> {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonContent) as AggregatedResult;
  }

  private buildPostmanCollection(data: AggregatedResult): PostmanCollection {
    const collection: PostmanCollection = {
      info: {
        name: `${data.project_name} - Test Collection`,
        description: `Generated from Flow Test Engine execution on ${data.start_time}. Success Rate: ${data.success_rate.toFixed(1)}%`,
        version: "1.0.0",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      variable: this.extractCollectionVariables(data),
      item: this.buildPostmanItems(data)
    };

    return collection;
  }

  private extractCollectionVariables(data: AggregatedResult): Array<{ key: string; value: string; type: string }> {
    const variables: Array<{ key: string; value: string; type: string }> = [];
    
    // Extract base URLs
    const baseUrls = new Set<string>();
    data.suites_results.forEach(suite => {
      suite.steps_results?.forEach(step => {
        if (step.request_details && (step.request_details as any).full_url) {
          try {
            const url = new URL((step.request_details as any).full_url);
            baseUrls.add(`${url.protocol}//${url.host}`);
          } catch {
            // Invalid URL, skip
          }
        }
      });
    });

    // Add base URLs as variables
    Array.from(baseUrls).forEach((baseUrl, index) => {
      variables.push({
        key: `base_url${index === 0 ? '' : `_${index + 1}`}`,
        value: baseUrl,
        type: "string"
      });
    });

    // Add common variables from global state if available
    if (data.global_variables_final_state) {
      Object.entries(data.global_variables_final_state).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          variables.push({
            key: key,
            value: String(value),
            type: typeof value
          });
        }
      });
    }

    return variables;
  }

  private buildPostmanItems(data: AggregatedResult): PostmanItem[] {
    const items: PostmanItem[] = [];

    data.suites_results.forEach(suite => {
      if (suite.steps_results) {
        suite.steps_results.forEach(step => {
          if (step.request_details) {
            items.push(this.buildPostmanItem(step, suite.suite_name));
          }
        });
      }
    });

    return items;
  }

  private buildPostmanItem(step: StepExecutionResult, suiteName: string): PostmanItem {
    const request = step.request_details!;
    const fullUrl = (request as any).full_url || request.url;
    
    let parsedUrl;
    try {
      parsedUrl = new URL(fullUrl);
    } catch {
      // Fallback for invalid URLs
      parsedUrl = {
        protocol: 'https:',
        hostname: 'example.com',
        pathname: request.url,
        search: ''
      };
    }

    // Build headers
    const headers = Object.entries(request.headers || {}).map(([key, value]) => ({
      key,
      value: String(value),
      type: "text"
    }));

    // Build query parameters
    const queryParams = Array.from(new URLSearchParams(parsedUrl.search || '')).map(([key, value]) => ({
      key,
      value
    }));

    // Build request body
    let body: any = undefined;
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      body = {
        mode: "raw",
        raw: typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2),
        options: {
          raw: {
            language: "json"
          }
        }
      };
    }

    // Build sample response if available
    const responses: PostmanResponse[] = [];
    if (step.response_details) {
      responses.push({
        name: `Sample Response - ${step.response_details.status_code}`,
        originalRequest: {
          method: request.method,
          header: headers,
          body: body,
          url: fullUrl
        },
        status: this.getStatusText(step.response_details.status_code),
        code: step.response_details.status_code,
        _postman_previewlanguage: this.getPreviewLanguage(step.response_details.headers),
        header: Object.entries(step.response_details.headers).map(([key, value]) => ({
          key,
          value: String(value)
        })),
        body: typeof step.response_details.body === 'string' 
          ? step.response_details.body 
          : JSON.stringify(step.response_details.body, null, 2)
      });
    }

    return {
      name: `${suiteName} - ${step.step_name}`,
      request: {
        method: request.method,
        header: headers,
        ...(body && { body }),
        url: {
          raw: fullUrl,
          protocol: parsedUrl.protocol?.replace(':', '') || 'https',
          host: [parsedUrl.hostname || 'example.com'],
          path: (parsedUrl.pathname || '/').split('/').filter(Boolean),
          ...(queryParams.length > 0 && { query: queryParams })
        },
        description: this.buildRequestDescription(step)
      },
      response: responses
    };
  }

  private buildRequestDescription(step: StepExecutionResult): string {
    let description = `**Test Step:** ${step.step_name}\n`;
    description += `**Status:** ${step.status}\n`;
    description += `**Duration:** ${step.duration_ms}ms\n`;

    if (step.error_message) {
      description += `**Error:** ${step.error_message}\n`;
    }

    if ((step.request_details as any)?.curl_command) {
      description += `\n**cURL Command:**\n\`\`\`bash\n${(step.request_details as any).curl_command}\n\`\`\`\n`;
    }

    if (step.assertions_results && step.assertions_results.length > 0) {
      description += `\n**Assertions:**\n`;
      step.assertions_results.forEach(assertion => {
        const status = assertion.passed ? '✅' : '❌';
        description += `- ${status} ${assertion.field}: Expected \`${JSON.stringify(assertion.expected)}\`, Got \`${JSON.stringify(assertion.actual)}\`\n`;
      });
    }

    if (step.captured_variables && Object.keys(step.captured_variables).length > 0) {
      description += `\n**Captured Variables:**\n`;
      Object.entries(step.captured_variables).forEach(([key, value]) => {
        description += `- ${key}: \`${JSON.stringify(value)}\`\n`;
      });
    }

    return description;
  }

  private buildCurlScript(data: AggregatedResult): string {
    let script = `#!/bin/bash\n`;
    script += `# cURL commands generated from Flow Test Engine\n`;
    script += `# Project: ${data.project_name}\n`;
    script += `# Generated: ${new Date().toISOString()}\n`;
    script += `# Success Rate: ${data.success_rate.toFixed(1)}%\n\n`;

    script += `set -e  # Exit on any error\n\n`;

    data.suites_results.forEach(suite => {
      script += `echo "\\n=== ${suite.suite_name} ===\\n"\n\n`;
      
      if (suite.steps_results) {
        suite.steps_results.forEach((step, index) => {
          if (step.request_details && (step.request_details as any).curl_command) {
            script += `# Step ${index + 1}: ${step.step_name}\n`;
            script += `# Status: ${step.status} (${step.duration_ms}ms)\n`;
            
            if (step.error_message) {
              script += `# Error: ${step.error_message}\n`;
            }
            
            script += `echo "Executing: ${step.step_name}"\n`;
            script += `${(step.request_details as any).curl_command}\n`;
            script += `echo "\\n"\n\n`;
          }
        });
      }
    });

    script += `echo "All requests completed!\\n"\n`;

    return script;
  }

  private getStatusText(code: number): string {
    const statusTexts: { [key: number]: string } = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error'
    };
    return statusTexts[code] || 'Unknown';
  }

  private getPreviewLanguage(headers: Record<string, string>): string {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    
    if (contentType.includes('application/json')) return 'json';
    if (contentType.includes('text/html')) return 'html';
    if (contentType.includes('text/xml') || contentType.includes('application/xml')) return 'xml';
    if (contentType.includes('text/plain')) return 'text';
    
    return 'text';
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}