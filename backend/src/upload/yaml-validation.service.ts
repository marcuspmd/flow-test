import { Injectable, BadRequestException } from '@nestjs/common';
import * as yaml from 'yaml';
import { FlowSuite } from '../engine/types/engine.types';

export interface YamlValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  flowSuite?: FlowSuite;
  metadata: {
    stepCount: number;
    hasVariables: boolean;
    hasDependencies: boolean;
    tags: string[];
    priority?: string;
  };
}

@Injectable()
export class YamlValidationService {
  validateYamlContent(yamlContent: string): YamlValidationResult {
    const result: YamlValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      metadata: {
        stepCount: 0,
        hasVariables: false,
        hasDependencies: false,
        tags: [],
      },
    };

    try {
      // Parse YAML content
      const parsed = yaml.parse(yamlContent);

      if (!parsed || typeof parsed !== 'object') {
        result.errors.push('Invalid YAML format: must be an object');
        return result;
      }

      // Validate required fields
      this.validateRequiredFields(parsed, result);

      // Validate suite structure
      this.validateSuiteStructure(parsed, result);

      // Validate steps
      this.validateSteps(parsed, result);

      // Extract metadata
      this.extractMetadata(parsed, result);

      // Set as valid if no errors
      if (result.errors.length === 0) {
        result.isValid = true;
        result.flowSuite = parsed as FlowSuite;
      }

      return result;

    } catch (error) {
      result.errors.push(`YAML parsing error: ${error.message}`);
      return result;
    }
  }

  private validateRequiredFields(parsed: any, result: YamlValidationResult): void {
    const requiredFields = ['suite_name', 'steps'];

    for (const field of requiredFields) {
      if (!parsed[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }
  }

  private validateSuiteStructure(parsed: any, result: YamlValidationResult): void {
    // Validate suite_name
    if (parsed.suite_name && typeof parsed.suite_name !== 'string') {
      result.errors.push('suite_name must be a string');
    }

    // Validate base_url if present
    if (parsed.base_url && typeof parsed.base_url !== 'string') {
      result.errors.push('base_url must be a string');
    }

    // Validate variables if present
    if (parsed.variables) {
      if (typeof parsed.variables !== 'object' || Array.isArray(parsed.variables)) {
        result.errors.push('variables must be an object');
      }
    }

    // Validate dependencies if present
    if (parsed.dependencies) {
      if (!Array.isArray(parsed.dependencies)) {
        result.errors.push('dependencies must be an array');
      } else {
        parsed.dependencies.forEach((dep: any, index: number) => {
          if (typeof dep !== 'string') {
            result.errors.push(`dependencies[${index}] must be a string`);
          }
        });
      }
    }

    // Validate tags if present
    if (parsed.tags) {
      if (!Array.isArray(parsed.tags)) {
        result.errors.push('tags must be an array');
      } else {
        parsed.tags.forEach((tag: any, index: number) => {
          if (typeof tag !== 'string') {
            result.errors.push(`tags[${index}] must be a string`);
          }
        });
      }
    }

    // Validate priority if present
    if (parsed.priority) {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (typeof parsed.priority !== 'string' || !validPriorities.includes(parsed.priority.toLowerCase())) {
        result.errors.push(`priority must be one of: ${validPriorities.join(', ')}`);
      }
    }
  }

  private validateSteps(parsed: any, result: YamlValidationResult): void {
    if (!Array.isArray(parsed.steps)) {
      result.errors.push('steps must be an array');
      return;
    }

    if (parsed.steps.length === 0) {
      result.errors.push('At least one step is required');
      return;
    }

    parsed.steps.forEach((step: any, index: number) => {
      this.validateStep(step, index, result);
    });
  }

  private validateStep(step: any, index: number, result: YamlValidationResult): void {
    const stepPrefix = `steps[${index}]`;

    // Required step fields
    const requiredStepFields = ['name', 'method', 'url'];
    for (const field of requiredStepFields) {
      if (!step[field]) {
        result.errors.push(`${stepPrefix}: Missing required field '${field}'`);
      }
    }

    // Validate method
    if (step.method) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      if (!validMethods.includes(step.method.toUpperCase())) {
        result.errors.push(`${stepPrefix}: Invalid HTTP method '${step.method}'. Must be one of: ${validMethods.join(', ')}`);
      }
    }

    // Validate URL
    if (step.url && typeof step.url !== 'string') {
      result.errors.push(`${stepPrefix}: url must be a string`);
    }

    // Validate headers if present
    if (step.headers) {
      if (typeof step.headers !== 'object' || Array.isArray(step.headers)) {
        result.errors.push(`${stepPrefix}: headers must be an object`);
      }
    }

    // Validate timeout if present
    if (step.timeout && (typeof step.timeout !== 'number' || step.timeout <= 0)) {
      result.errors.push(`${stepPrefix}: timeout must be a positive number`);
    }

    // Validate assertions if present
    if (step.assertions) {
      this.validateAssertions(step.assertions, `${stepPrefix}.assertions`, result);
    }

    // Validate capture if present
    if (step.capture) {
      if (typeof step.capture !== 'object' || Array.isArray(step.capture)) {
        result.errors.push(`${stepPrefix}: capture must be an object`);
      } else {
        // Validate capture expressions
        Object.entries(step.capture).forEach(([varName, expression]) => {
          if (typeof varName !== 'string' || !varName) {
            result.errors.push(`${stepPrefix}.capture: Variable name must be a non-empty string`);
          }
          if (typeof expression !== 'string' || !expression) {
            result.errors.push(`${stepPrefix}.capture.${varName}: Expression must be a non-empty string`);
          }
        });
      }
    }

    // Validate skip if present
    if (step.skip !== undefined && typeof step.skip !== 'boolean') {
      result.errors.push(`${stepPrefix}: skip must be a boolean`);
    }

    // Validate priority if present
    if (step.priority) {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(step.priority.toLowerCase())) {
        result.errors.push(`${stepPrefix}: priority must be one of: ${validPriorities.join(', ')}`);
      }
    }
  }

  private validateAssertions(assertions: any, prefix: string, result: YamlValidationResult): void {
    if (typeof assertions !== 'object' || Array.isArray(assertions)) {
      result.errors.push(`${prefix}: assertions must be an object`);
      return;
    }

    // Common assertion operators
    const validOperators = [
      'equals', 'not_equals', 'contains', 'greater_than', 'less_than',
      'regex', 'not_null', 'type', 'length'
    ];

    Object.entries(assertions).forEach(([field, assertion]) => {
      if (typeof assertion === 'object' && assertion !== null && !Array.isArray(assertion)) {
        // Validate assertion operators
        Object.keys(assertion as object).forEach(operator => {
          if (!validOperators.includes(operator)) {
            result.warnings.push(`${prefix}.${field}: Unknown assertion operator '${operator}'`);
          }
        });
      }
    });
  }

  private extractMetadata(parsed: any, result: YamlValidationResult): void {
    result.metadata.stepCount = Array.isArray(parsed.steps) ? parsed.steps.length : 0;
    result.metadata.hasVariables = !!parsed.variables && Object.keys(parsed.variables).length > 0;
    result.metadata.hasDependencies = !!parsed.dependencies && parsed.dependencies.length > 0;
    result.metadata.tags = parsed.tags || [];
    result.metadata.priority = parsed.priority;
  }

  // Utility method to validate multiple YAML files
  validateMultipleYamlFiles(yamlContents: string[]): YamlValidationResult[] {
    return yamlContents.map((content, index) => {
      const result = this.validateYamlContent(content);

      // Add file index to error messages for identification
      result.errors = result.errors.map(error => `File ${index + 1}: ${error}`);
      result.warnings = result.warnings.map(warning => `File ${index + 1}: ${warning}`);

      return result;
    });
  }

  // Method to extract flow suite names for duplicate checking
  extractSuiteNames(yamlContents: string[]): { [fileName: string]: string } {
    const suiteNames: { [fileName: string]: string } = {};

    yamlContents.forEach((content, index) => {
      try {
        const parsed = yaml.parse(content);
        if (parsed && parsed.suite_name) {
          suiteNames[`file_${index + 1}`] = parsed.suite_name;
        }
      } catch {
        // Ignore parsing errors here, they'll be caught in validation
      }
    });

    return suiteNames;
  }

  // Check for duplicate suite names
  findDuplicateSuiteNames(yamlContents: string[]): string[] {
    const suiteNames = this.extractSuiteNames(yamlContents);
    const nameCount: { [name: string]: number } = {};
    const duplicates: string[] = [];

    Object.values(suiteNames).forEach(name => {
      nameCount[name] = (nameCount[name] || 0) + 1;
      if (nameCount[name] === 2) {
        duplicates.push(name);
      }
    });

    return duplicates;
  }
}