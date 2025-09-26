import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { LoggerService } from './logger.service';

export interface GlobalVariableContext {
  global?: Record<string, any>;
  suite?: Record<string, any>;
  runtime?: Record<string, any>;
  imported?: Record<string, any>;
}

export interface JavaScriptExecutionContext {
  [key: string]: any;
}

@Injectable()
export class VariableService {
  private context: GlobalVariableContext = {};
  private currentExecutionContext: JavaScriptExecutionContext = {};

  constructor(private readonly logger: LoggerService) {}

  setContext(context: GlobalVariableContext): void {
    this.context = context;
  }

  updateRuntimeVariables(variables: Record<string, any>): void {
    this.context.runtime = {
      ...(this.context.runtime || {}),
      ...variables,
    };
  }

  setExecutionContext(context: JavaScriptExecutionContext): void {
    this.currentExecutionContext = context;
  }

  interpolate(template: any, suppressWarnings = false): any {
    if (typeof template === 'string') {
      return this.interpolateString(template, suppressWarnings);
    }

    if (Array.isArray(template)) {
      return template.map(item => this.interpolate(item, suppressWarnings));
    }

    if (template && typeof template === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolate(value, suppressWarnings);
      }
      return result;
    }

    return template;
  }

  private interpolateString(template: string, suppressWarnings: boolean): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();

      try {
        // Handle Faker.js expressions
        if (trimmedName.startsWith('faker.') || trimmedName.startsWith('fake.')) {
          return this.evaluateFakerExpression(trimmedName);
        }

        // Handle JavaScript expressions (js: prefix)
        if (trimmedName.startsWith('js:')) {
          return this.evaluateJavaScriptExpression(trimmedName.substring(3));
        }

        // Handle environment variables
        if (trimmedName.startsWith('env.')) {
          const envVar = trimmedName.substring(4);
          return process.env[envVar] || '';
        }

        // Handle hierarchical variable lookup
        const value = this.getVariable(trimmedName);

        if (value !== undefined && value !== null) {
          return String(value);
        }

        if (!suppressWarnings) {
          this.logger.warn(`Variable not found: ${trimmedName}`, {
            context: 'variable_interpolation',
            availableVariables: this.getAvailableVariables(),
          });
        }

        return match; // Return unchanged if variable not found
      } catch (error) {
        this.logger.error(`Failed to interpolate variable: ${trimmedName}`, {
          error: error as Error,
        });
        return match;
      }
    });
  }

  private getVariable(name: string): any {
    // Check runtime variables first (highest priority)
    if (this.context.runtime && this.hasNestedProperty(this.context.runtime, name)) {
      return this.getNestedProperty(this.context.runtime, name);
    }

    // Check suite variables
    if (this.context.suite && this.hasNestedProperty(this.context.suite, name)) {
      return this.getNestedProperty(this.context.suite, name);
    }

    // Check imported variables
    if (this.context.imported && this.hasNestedProperty(this.context.imported, name)) {
      return this.getNestedProperty(this.context.imported, name);
    }

    // Check global variables (lowest priority)
    if (this.context.global && this.hasNestedProperty(this.context.global, name)) {
      return this.getNestedProperty(this.context.global, name);
    }

    return undefined;
  }

  private hasNestedProperty(obj: Record<string, any>, path: string): boolean {
    try {
      const result = this.getNestedProperty(obj, path);
      return result !== undefined;
    } catch {
      return false;
    }
  }

  private getNestedProperty(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  private evaluateFakerExpression(expression: string): string {
    try {
      // Handle both faker.* and fake.* patterns
      const cleanExpression = expression.replace(/^fake\./, 'faker.');

      // Simple faker method calls like faker.name.firstName()
      if (cleanExpression.startsWith('faker.')) {
        return this.evaluateFakerMethod(cleanExpression);
      }

      return expression;
    } catch (error) {
      this.logger.error(`Faker expression evaluation failed: ${expression}`, {
        error: error as Error,
      });
      return `<faker_error:${expression}>`;
    }
  }

  private evaluateFakerMethod(expression: string): string {
    try {
      // Extract the method path from faker.category.method()
      const methodMatch = expression.match(/faker\.([a-zA-Z0-9_.]+)(?:\(\))?$/);
      if (!methodMatch) {
        throw new Error(`Invalid faker expression format: ${expression}`);
      }

      const methodPath = methodMatch[1];
      const pathParts = methodPath.split('.');

      let fakerMethod: any = faker;
      for (const part of pathParts) {
        if (fakerMethod && typeof fakerMethod === 'object' && part in fakerMethod) {
          fakerMethod = fakerMethod[part];
        } else {
          throw new Error(`Faker method not found: faker.${methodPath}`);
        }
      }

      if (typeof fakerMethod === 'function') {
        const result = fakerMethod();
        return typeof result === 'string' ? result : String(result);
      } else {
        return String(fakerMethod);
      }
    } catch (error) {
      this.logger.error(`Faker method evaluation failed: ${expression}`, {
        error: error as Error,
      });
      return `<faker_error:${expression}>`;
    }
  }

  private evaluateJavaScriptExpression(expression: string): string {
    try {
      // Create evaluation context with all variables
      const evalContext = {
        ...this.currentExecutionContext,
        ...(this.context.global || {}),
        ...(this.context.imported || {}),
        ...(this.context.suite || {}),
        ...(this.context.runtime || {}),
      };

      // Basic expression evaluation (simplified for security)
      const contextKeys = Object.keys(evalContext);
      const contextValues = Object.values(evalContext);

      const func = new Function(...contextKeys, `return ${expression}`);
      const result = func(...contextValues);

      return typeof result === 'string' ? result : String(result);
    } catch (error) {
      this.logger.error(`JavaScript expression evaluation failed: ${expression}`, {
        error: error as Error,
      });
      return `<js_error:${expression}>`;
    }
  }

  getAvailableVariables(): string[] {
    const variables: string[] = [];

    const collectVariables = (obj: Record<string, any>, prefix = ''): void => {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          collectVariables(obj[key], fullKey);
        } else {
          variables.push(fullKey);
        }
      }
    };

    if (this.context.global) collectVariables(this.context.global);
    if (this.context.imported) collectVariables(this.context.imported);
    if (this.context.suite) collectVariables(this.context.suite);
    if (this.context.runtime) collectVariables(this.context.runtime);

    return variables.sort();
  }

  getAllVariables(): Record<string, any> {
    return {
      global: this.context.global || {},
      imported: this.context.imported || {},
      suite: this.context.suite || {},
      runtime: this.context.runtime || {},
    };
  }

  clearRuntimeVariables(): void {
    this.context.runtime = {};
  }

  // Validation methods
  validateVariableReferences(template: any): string[] {
    const errors: string[] = [];
    const variableRefs = this.extractVariableReferences(template);

    for (const varRef of variableRefs) {
      if (!varRef.startsWith('faker.') &&
          !varRef.startsWith('fake.') &&
          !varRef.startsWith('js:') &&
          !varRef.startsWith('env.') &&
          this.getVariable(varRef) === undefined) {
        errors.push(`Variable not found: ${varRef}`);
      }
    }

    return errors;
  }

  private extractVariableReferences(template: any): string[] {
    const refs: string[] = [];

    if (typeof template === 'string') {
      const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
      refs.push(...matches.map(match => match.slice(2, -2).trim()));
    } else if (Array.isArray(template)) {
      template.forEach(item => refs.push(...this.extractVariableReferences(item)));
    } else if (template && typeof template === 'object') {
      Object.values(template).forEach(value => refs.push(...this.extractVariableReferences(value)));
    }

    return [...new Set(refs)]; // Remove duplicates
  }
}