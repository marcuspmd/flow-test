/**
 * @fileoverview Example integrations showing how to use Zod schemas in the Flow Test Engine.
 *
 * @remarks
 * This file demonstrates practical examples of integrating Zod validation into
 * various parts of the Flow Test Engine codebase. These examples can be used
 * as reference when adding validation to services and utilities.
 *
 * @packageDocumentation
 */

import * as yaml from "js-yaml";
import * as fs from "fs";
import { z } from "zod";
import {
  TestSuiteSchema,
  EngineConfigSchema,
  RequestDetailsSchema,
  StepExecutionResultSchema,
  SchemaUtils,
  type TestSuite,
  type EngineConfig,
  type RequestDetails,
} from "./index";

/**
 * Example 1: Validating YAML test suites before execution
 *
 * @remarks
 * This example shows how to validate a test suite loaded from YAML
 * before passing it to the execution engine. This catches configuration
 * errors early and provides clear feedback.
 */
export class ValidatedTestSuiteLoader {
  /**
   * Load and validate a test suite from a YAML file
   *
   * @param filePath - Path to the YAML test suite file
   * @returns Validated test suite
   * @throws Error with detailed validation messages if suite is invalid
   *
   * @example
   * ```typescript
   * const loader = new ValidatedTestSuiteLoader();
   * try {
   *   const suite = loader.loadSuite('./tests/user-api.yaml');
   *   console.log(`Loaded suite: ${suite.suite_name}`);
   * } catch (error) {
   *   console.error('Invalid suite:', error.message);
   * }
   * ```
   */
  loadSuite(filePath: string): TestSuite {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const rawData = yaml.load(fileContent);

    return SchemaUtils.validateOrThrow(
      TestSuiteSchema,
      rawData,
      `Loading suite from ${filePath}`
    );
  }

  /**
   * Load suite with graceful error handling
   *
   * @param filePath - Path to the YAML test suite file
   * @returns Object with success status and data or errors
   *
   * @example
   * ```typescript
   * const loader = new ValidatedTestSuiteLoader();
   * const result = loader.loadSuiteSafe('./tests/user-api.yaml');
   * if (result.success) {
   *   console.log('Suite loaded:', result.data.suite_name);
   * } else {
   *   console.error('Validation errors:');
   *   result.errors?.forEach(err => console.error(`  - ${err}`));
   * }
   * ```
   */
  loadSuiteSafe(filePath: string): {
    success: boolean;
    data?: TestSuite;
    errors?: string[];
  } {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const rawData = yaml.load(fileContent);
      return SchemaUtils.parseWithErrors(TestSuiteSchema, rawData);
    } catch (error: any) {
      return {
        success: false,
        errors: [`Failed to read file: ${error.message}`],
      };
    }
  }
}

/**
 * Example 2: Validating engine configuration
 *
 * @remarks
 * Shows how to validate the engine configuration file with proper
 * error handling and defaults for optional fields.
 */
export class ValidatedConfigLoader {
  /**
   * Load and validate engine configuration
   *
   * @param configPath - Path to config YAML file
   * @returns Validated engine configuration
   *
   * @example
   * ```typescript
   * const configLoader = new ValidatedConfigLoader();
   * const config = configLoader.loadConfig('./flow-test.config.yml');
   * console.log(`Project: ${config.project_name}`);
   * ```
   */
  loadConfig(configPath: string): EngineConfig {
    const configContent = fs.readFileSync(configPath, "utf8");
    const configData = yaml.load(configContent);

    const result = SchemaUtils.parseWithErrors(EngineConfigSchema, configData);

    if (!result.success) {
      const errors = result.errors?.join("\n  - ") || "Unknown error";
      throw new Error(
        `Invalid engine configuration:\n  - ${errors}\n\nPlease check your ${configPath} file.`
      );
    }

    return result.data!;
  }

  /**
   * Validate configuration with detailed feedback
   *
   * @param configPath - Path to config file
   * @returns Validation result with errors if any
   */
  validateConfig(configPath: string): {
    isValid: boolean;
    config?: EngineConfig;
    errors?: string[];
  } {
    try {
      const config = this.loadConfig(configPath);
      return { isValid: true, config };
    } catch (error: any) {
      return {
        isValid: false,
        errors: error.message.split("\n").filter((s: string) => s.trim()),
      };
    }
  }
}

/**
 * Example 3: Validating HTTP requests before execution
 *
 * @remarks
 * Demonstrates request validation in the HTTP service to ensure
 * all required fields are present and correctly typed.
 */
export class ValidatedHttpClient {
  /**
   * Execute HTTP request with validation
   *
   * @param stepName - Name of the test step
   * @param request - Request configuration (will be validated)
   * @returns Promise with execution result
   *
   * @example
   * ```typescript
   * const client = new ValidatedHttpClient();
   * const result = await client.executeRequest('Login User', {
   *   method: 'POST',
   *   url: '/auth/login',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: { username: 'testuser', password: 'secret' }
   * });
   * ```
   */
  async executeRequest(
    stepName: string,
    request: unknown
  ): Promise<{ success: boolean; error?: string }> {
    // Validate request before execution
    const validatedRequest = SchemaUtils.validateOrThrow(
      RequestDetailsSchema,
      request,
      `Request validation for step "${stepName}"`
    );

    // Now validatedRequest is type-safe and validated
    console.log(`Executing ${validatedRequest.method} ${validatedRequest.url}`);

    // Actual HTTP execution would go here
    // This is just an example structure
    return { success: true };
  }

  /**
   * Prepare request with safe validation
   *
   * @param request - Request configuration
   * @returns Validated request or null if invalid
   */
  prepareRequest(request: unknown): RequestDetails | null {
    return SchemaUtils.safeParse(RequestDetailsSchema, request);
  }
}

/**
 * Example 4: Validating execution results
 *
 * @remarks
 * Shows how to validate test execution results before saving to
 * ensure report integrity and catch result formatting issues.
 */
export class ValidatedReportWriter {
  /**
   * Save step execution result with validation
   *
   * @param result - Step execution result
   * @param outputPath - Path to save the result
   *
   * @example
   * ```typescript
   * const writer = new ValidatedReportWriter();
   * writer.saveStepResult(stepResult, './results/step-001.json');
   * ```
   */
  saveStepResult(result: unknown, outputPath: string): void {
    // Validate result structure
    const validatedResult = StepExecutionResultSchema.parse(result);

    // Write validated result to file
    fs.writeFileSync(outputPath, JSON.stringify(validatedResult, null, 2));

    console.log(`✅ Step result saved: ${validatedResult.step_name}`);
    console.log(`   Status: ${validatedResult.status}`);
    console.log(`   Duration: ${validatedResult.duration_ms}ms`);
  }

  /**
   * Validate result without saving
   *
   * @param result - Result to validate
   * @returns Validation status with errors
   */
  validateResult(result: unknown): {
    isValid: boolean;
    errors?: string[];
  } {
    const parseResult = SchemaUtils.parseWithErrors(
      StepExecutionResultSchema,
      result
    );

    return {
      isValid: parseResult.success,
      errors: parseResult.errors,
    };
  }
}

/**
 * Example 5: Runtime validation in service methods
 *
 * @remarks
 * Demonstrates how to add validation to existing service methods
 * to ensure data integrity throughout the execution pipeline.
 */
export class ValidatedExecutionService {
  /**
   * Validate and execute a test suite
   *
   * @param suite - Test suite to execute (will be validated)
   * @returns Execution result
   *
   * @example
   * ```typescript
   * const service = new ValidatedExecutionService();
   * const result = await service.executeSuite(suiteData);
   * ```
   */
  async executeSuite(suite: unknown): Promise<{
    success: boolean;
    message: string;
  }> {
    // Step 1: Validate suite structure
    const validationResult = SchemaUtils.parseWithErrors(TestSuiteSchema, suite);

    if (!validationResult.success) {
      return {
        success: false,
        message: `Suite validation failed:\n${validationResult.errors?.join(
          "\n"
        )}`,
      };
    }

    const validatedSuite = validationResult.data!;

    // Step 2: Execute with validated data (type-safe)
    console.log(`Executing suite: ${validatedSuite.suite_name}`);
    console.log(`Steps: ${validatedSuite.steps.length}`);

    // Actual execution logic would go here
    return {
      success: true,
      message: `Suite "${validatedSuite.suite_name}" executed successfully`,
    };
  }
}

/**
 * Example 6: Custom schema composition
 *
 * @remarks
 * Shows how to create custom schemas by composing existing ones
 * for specific use cases.
 */
export class CustomSchemaExamples {
  /**
   * Create a minimal request schema for quick tests
   */
  static MinimalRequestSchema = RequestDetailsSchema.pick({
    method: true,
    url: true,
  });

  /**
   * Create a partial suite schema for suite updates
   */
  static PartialSuiteSchema = TestSuiteSchema.partial();

  /**
   * Create a custom step with additional metadata
   */
  static CustomStepMetadataSchema = z.object({
    created_by: z.string(),
    created_at: z.string().datetime(),
    tags: z.array(z.string()),
  });

  /**
   * Example usage of custom schemas
   */
  static examples() {
    // Minimal request
    const minimalRequest = this.MinimalRequestSchema.parse({
      method: "GET",
      url: "/api/health",
    });

    // Partial suite (for updates)
    const partialSuite = this.PartialSuiteSchema.parse({
      node_id: "test-123",
      // suite_name is now optional
    });

    // Custom metadata
    const customMetadata = this.CustomStepMetadataSchema.parse({
      created_by: "automation",
      created_at: new Date().toISOString(),
      tags: ["automated", "regression"],
    });

    return { minimalRequest, partialSuite, customMetadata };
  }
}

/**
 * Example 7: Integration with existing logger
 *
 * @remarks
 * Shows how to integrate validation with the existing logger service
 * to provide detailed validation feedback in logs.
 */
export class ValidatedLogger {
  /**
   * Log validated data with schema
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate and log
   * @param context - Context for logging
   */
  static logValidated<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context: string
  ): T | null {
    const result = schema.safeParse(data);

    if (result.success) {
      console.log(`[${context}] ✅ Validation passed`);
      console.log(`[${context}] Data:`, JSON.stringify(result.data, null, 2));
      return result.data;
    } else {
      console.error(`[${context}] ❌ Validation failed`);
      result.error.errors.forEach((err) => {
        console.error(
          `[${context}]   - ${err.path.join(".")}: ${err.message}`
        );
      });
      return null;
    }
  }
}

// Export examples for documentation
export const examples = {
  ValidatedTestSuiteLoader,
  ValidatedConfigLoader,
  ValidatedHttpClient,
  ValidatedReportWriter,
  ValidatedExecutionService,
  CustomSchemaExamples,
  ValidatedLogger,
};
