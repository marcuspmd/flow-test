import { Injectable } from '@nestjs/common';
import * as jmespath from 'jmespath';
import { StepExecutionResult } from '../types/engine.types';
import { LoggerService } from './logger.service';

@Injectable()
export class CaptureService {
  constructor(private readonly logger: LoggerService) {}

  captureVariables(
    captureConfig: Record<string, string>,
    result: StepExecutionResult,
    variableContext?: Record<string, any>,
  ): Record<string, any> {
    const capturedVariables: Record<string, any> = {};

    if (!captureConfig || Object.keys(captureConfig).length === 0) {
      return capturedVariables;
    }

    if (!result.response_details) {
      this.logger.warn('No response details available for variable capture');
      return capturedVariables;
    }

    const responseData = {
      status_code: result.response_details.status_code,
      headers: result.response_details.headers,
      body: result.response_details.body,
      response_time: result.duration_ms,
    };

    for (const [variableName, expression] of Object.entries(captureConfig)) {
      try {
        const capturedValue = this.extractValue(
          expression,
          responseData,
          variableContext,
        );
        capturedVariables[variableName] = capturedValue;

        this.logger.debug(`Captured variable ${variableName}`, {
          expression,
          value: capturedValue,
          metadata: { type: 'variable_capture' },
        });
      } catch (error) {
        this.logger.error(`Failed to capture variable ${variableName}`, {
          expression,
          error: error as Error,
          metadata: { type: 'capture_error' },
        });

        // Continue with other captures even if one fails
        capturedVariables[variableName] = null;
      }
    }

    return capturedVariables;
  }

  private extractValue(
    expression: string,
    responseData: any,
    variableContext?: Record<string, any>,
  ): any {
    // Handle JavaScript expressions (marked with js: prefix)
    if (expression.startsWith('js:')) {
      return this.evaluateJavaScriptExpression(
        expression.substring(3),
        responseData,
        variableContext,
      );
    }

    // Handle direct property access
    if (expression === 'status_code') {
      return responseData.status_code;
    }

    if (expression === 'response_time') {
      return responseData.response_time;
    }

    // Handle headers with case-insensitive matching
    if (expression.startsWith('headers.')) {
      const headerName = expression.substring(8);
      return this.getHeaderValue(responseData.headers, headerName);
    }

    // Handle body property access
    if (expression.startsWith('body.')) {
      const bodyPath = expression.substring(5);
      return this.extractFromBody(bodyPath, responseData.body);
    }

    // Try JMESPath for complex expressions
    try {
      return jmespath.search(responseData, expression);
    } catch (jmesPathError) {
      // Fall back to simple property access
      return this.getSimpleProperty(expression, responseData);
    }
  }

  private extractFromBody(path: string, body: any): any {
    if (!body) {
      return null;
    }

    try {
      // Try JMESPath first for complex queries
      if (path.includes('[') || path.includes('?') || path.includes('|')) {
        return jmespath.search(body, path);
      }

      // Simple dot notation
      return path.split('.').reduce((obj, key) => {
        if (obj && typeof obj === 'object' && key in obj) {
          return obj[key];
        }
        return null;
      }, body);
    } catch (error) {
      this.logger.debug(`Failed to extract from body with path ${path}`, {
        error: error as Error,
      });
      return null;
    }
  }

  private getHeaderValue(
    headers: Record<string, string>,
    headerName: string,
  ): string | null {
    if (!headers || typeof headers !== 'object') {
      return null;
    }

    // Case-insensitive header lookup
    const lowerHeaderName = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerHeaderName) {
        return value;
      }
    }

    return null;
  }

  private getSimpleProperty(path: string, data: any): any {
    return path.split('.').reduce((obj, key) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return obj[key];
      }
      return null;
    }, data);
  }

  private evaluateJavaScriptExpression(
    expression: string,
    responseData: any,
    variableContext?: Record<string, any>,
  ): any {
    try {
      // Create a safe evaluation context
      const context = {
        body: responseData.body,
        headers: responseData.headers,
        status_code: responseData.status_code,
        response_time: responseData.response_time,
        ...(variableContext || {}),
      };

      // Basic expression evaluation (limited for security)
      // This is a simplified version - in production, consider using vm2 or similar
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);

      const func = new Function(...contextKeys, `return ${expression}`);
      return func(...contextValues);
    } catch (error) {
      this.logger.error(
        `JavaScript expression evaluation failed: ${expression}`,
        {
          error: error as Error,
        },
      );
      throw new Error(
        `JavaScript expression evaluation failed: ${error.message}`,
      );
    }
  }

  // Validate capture configuration
  validateCaptureConfig(captureConfig: Record<string, string>): string[] {
    const errors: string[] = [];

    if (!captureConfig || typeof captureConfig !== 'object') {
      return ['Capture configuration must be an object'];
    }

    for (const [variableName, expression] of Object.entries(captureConfig)) {
      if (!variableName || typeof variableName !== 'string') {
        errors.push('Variable names must be non-empty strings');
        continue;
      }

      if (!expression || typeof expression !== 'string') {
        errors.push(
          `Expression for variable ${variableName} must be a non-empty string`,
        );
        continue;
      }

      // Validate JavaScript expressions
      if (expression.startsWith('js:')) {
        const jsExpression = expression.substring(3).trim();
        if (!jsExpression) {
          errors.push(
            `JavaScript expression for variable ${variableName} cannot be empty`,
          );
        }
      }
    }

    return errors;
  }

  // Test capture configuration against sample data
  testCaptureConfig(
    captureConfig: Record<string, string>,
    sampleResponseData: any,
  ): Record<string, { success: boolean; value?: any; error?: string }> {
    const results: Record<
      string,
      { success: boolean; value?: any; error?: string }
    > = {};

    for (const [variableName, expression] of Object.entries(captureConfig)) {
      try {
        const value = this.extractValue(expression, sampleResponseData);
        results[variableName] = { success: true, value };
      } catch (error) {
        results[variableName] = {
          success: false,
          error: error.message,
        };
      }
    }

    return results;
  }
}
