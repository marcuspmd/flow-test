/**
 * @fileoverview Zod schemas for core Flow Test Engine type definitions.
 *
 * @remarks
 * This module provides comprehensive Zod schemas for the fundamental types of the
 * Flow Test Engine, including test suites, steps, HTTP requests, assertions, and
 * execution results. These schemas enable runtime validation and type inference.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import {
  DynamicVariableAssignmentSchema,
  InputDynamicConfigSchema,
  InputValidationConfigSchema,
} from "./common.schemas";

/**
 * Schema for HTTP request methods.
 *
 * @remarks
 * Defines all supported HTTP methods for API testing.
 *
 * @public
 */
export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);

/**
 * Schema for HTTP request details with comprehensive configuration options.
 *
 * @remarks
 * Enhanced version supporting all major HTTP methods with configurable
 * timeouts, headers, and parameter support.
 *
 * @example
 * ```typescript
 * import { RequestDetailsSchema } from './schemas/engine.schemas';
 *
 * const request = RequestDetailsSchema.parse({
 *   method: "POST",
 *   url: "/api/users",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": "Bearer {{auth_token}}"
 *   },
 *   body: {
 *     name: "John Doe",
 *     email: "john@example.com"
 *   },
 *   timeout: 30000
 * });
 * ```
 *
 * @public
 */
export const RequestDetailsSchema = z.object({
  /** HTTP method for the request */
  method: HttpMethodSchema.describe("HTTP method"),

  /** URL path, can be absolute or relative to base_url */
  url: z.string().min(1).describe("Request URL"),

  /** HTTP headers to include with the request */
  headers: z.record(z.string(), z.string()).optional().describe("HTTP headers"),

  /** Request body payload for POST/PUT/PATCH methods */
  body: z.any().optional().describe("Request body"),

  /** Query string parameters */
  params: z.record(z.string(), z.any()).optional().describe("Query parameters"),

  /** Request timeout in milliseconds */
  timeout: z.number().positive().optional().describe("Timeout in ms"),
});

/**
 * Schema for advanced validation rules for response field checking.
 *
 * @remarks
 * Comprehensive assertion checks supporting type validation, existence checks,
 * pattern matching, numerical comparisons, and length validations.
 *
 * @example Basic field validation
 * ```typescript
 * import { AssertionChecksSchema } from './schemas/engine.schemas';
 *
 * const checks = AssertionChecksSchema.parse({
 *   type: "number",
 *   greater_than: 0,
 *   exists: true
 * });
 * ```
 *
 * @example Complex validation
 * ```typescript
 * const checks = AssertionChecksSchema.parse({
 *   type: "string",
 *   regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
 *   minLength: 5,
 *   notEmpty: true
 * });
 * ```
 *
 * @public
 */
export const AssertionChecksSchema = z.object({
  /** Exact value equality check */
  equals: z.any().optional().describe("Expected value"),

  /** Check if field contains the specified value */
  contains: z.any().optional().describe("Contains value"),

  /** Check if field does not equal the specified value */
  not_equals: z.any().optional().describe("Not equals value"),

  /** Numerical greater than comparison */
  greater_than: z.number().optional().describe("Greater than"),

  /** Numerical less than comparison */
  less_than: z.number().optional().describe("Less than"),

  /** Regular expression pattern matching */
  regex: z.string().optional().describe("Regex pattern"),

  /** Check if field exists in the response */
  exists: z.boolean().optional().describe("Field exists"),

  /** Type validation */
  type: z
    .enum(["string", "number", "boolean", "object", "array"])
    .optional()
    .describe("Expected type"),

  /** Length validation for arrays and strings */
  length: z
    .object({
      equals: z.number().int().nonnegative().optional(),
      greater_than: z.number().int().nonnegative().optional(),
      less_than: z.number().int().nonnegative().optional(),
    })
    .optional()
    .describe("Length constraints"),

  /** Regular expression pattern matching (alias for regex) */
  pattern: z.string().optional().describe("Pattern"),

  /** Minimum length validation for strings and arrays */
  minLength: z.number().int().nonnegative().optional().describe("Min length"),

  /** Check if field is not empty */
  notEmpty: z.boolean().optional().describe("Not empty"),
});

/**
 * Schema for custom assertion with condition and message.
 *
 * @public
 */
export const CustomAssertionSchema = z.object({
  /** Name of the custom assertion */
  name: z.string().min(1).describe("Assertion name"),

  /** JMESPath expression or JavaScript condition to evaluate */
  condition: z.string().min(1).describe("Condition expression"),

  /** Optional error message when assertion fails */
  message: z.string().optional().describe("Error message"),
});

/**
 * Schema for comprehensive assertion configuration for HTTP response validation.
 *
 * @remarks
 * Defines all possible validations that can be applied to an HTTP response,
 * including status code checks, body field validation, header verification,
 * response time constraints, and custom assertion scripts.
 *
 * @example Complete assertion configuration
 * ```typescript
 * import { AssertionsSchema } from './schemas/engine.schemas';
 *
 * const assertions = AssertionsSchema.parse({
 *   status_code: 200,
 *   body: {
 *     success: { equals: true },
 *     data: { type: "object", exists: true },
 *     "user.id": { type: "number", greater_than: 0 },
 *     "user.email": { regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
 *   },
 *   headers: {
 *     "content-type": { contains: "application/json" }
 *   },
 *   response_time_ms: {
 *     less_than: 2000,
 *     greater_than: 10
 *   },
 *   custom: [
 *     {
 *       name: "Valid user ID format",
 *       condition: "body.user.id && typeof body.user.id === 'number'",
 *       message: "User ID must be a number"
 *     }
 *   ]
 * });
 * ```
 *
 * @public
 */
export const AssertionsSchema = z.object({
  /** Expected HTTP status code or status code validation rules */
  status_code: z
    .union([z.number().int(), AssertionChecksSchema])
    .optional()
    .describe("Status code assertion"),

  /** Body field validations using nested assertion checks */
  body: z.record(z.string(), AssertionChecksSchema).optional().describe("Body assertions"),

  /** HTTP header validations */
  headers: z
    .record(z.string(), AssertionChecksSchema)
    .optional()
    .describe("Header assertions"),

  /** Response time performance constraints */
  response_time_ms: z
    .object({
      less_than: z.number().positive().optional(),
      greater_than: z.number().nonnegative().optional(),
    })
    .optional()
    .describe("Response time constraints"),

  /** Custom assertion scripts for advanced validation */
  custom: z
    .array(CustomAssertionSchema)
    .optional()
    .describe("Custom assertions"),
});

/**
 * Schema for conditional scenario configuration for dynamic test behavior.
 *
 * @remarks
 * Enables conditional execution of assertions, captures, and variable assignments
 * based on JMESPath expressions evaluated against the response data.
 *
 * @example
 * ```typescript
 * import { ConditionalScenarioSchema } from './schemas/engine.schemas';
 *
 * const scenario = ConditionalScenarioSchema.parse({
 *   name: "Admin vs User permissions",
 *   condition: "body.user.role == 'admin'",
 *   then: {
 *     assert: {
 *       status_code: 200,
 *       body: { permissions: { contains: "admin_access" } }
 *     },
 *     capture: { admin_id: "body.user.id" }
 *   },
 *   else: {
 *     assert: { status_code: 403 },
 *     variables: { is_admin: false }
 *   }
 * });
 * ```
 *
 * @public
 */
export const ConditionalScenarioSchema = z.lazy(() =>
  z.object({
    /** Optional descriptive name for the scenario */
    name: z.string().optional().describe("Scenario name"),

    /** JMESPath expression to evaluate the condition against response data */
    condition: z.string().min(1).describe("Condition expression"),

    /** Actions to execute when condition evaluates to true */
    then: z
      .object({
        assert: AssertionsSchema.optional(),
        capture: z.record(z.string(), z.string()).optional(),
        variables: z.record(z.string(), z.any()).optional(),
      })
      .optional()
      .describe("Then branch"),

    /** Actions to execute when condition evaluates to false */
    else: z
      .object({
        assert: AssertionsSchema.optional(),
        capture: z.record(z.string(), z.string()).optional(),
        variables: z.record(z.string(), z.any()).optional(),
      })
      .optional()
      .describe("Else branch"),
  })
);

/**
 * Schema for array iteration configuration.
 *
 * @example
 * ```typescript
 * import { ArrayIterationConfigSchema } from './schemas/engine.schemas';
 *
 * const config = ArrayIterationConfigSchema.parse({
 *   over: "{{test_users}}",
 *   as: "current_user"
 * });
 * ```
 *
 * @public
 */
export const ArrayIterationConfigSchema = z.object({
  /** JMESPath expression or variable name pointing to the array to iterate over */
  over: z.string().min(1).describe("Array to iterate"),

  /** Variable name to use for the current item in each iteration */
  as: z.string().min(1).describe("Iterator variable name"),
});

/**
 * Schema for range iteration configuration.
 *
 * @example
 * ```typescript
 * import { RangeIterationConfigSchema } from './schemas/engine.schemas';
 *
 * const config = RangeIterationConfigSchema.parse({
 *   range: "1..10",
 *   as: "page_number"
 * });
 * ```
 *
 * @public
 */
export const RangeIterationConfigSchema = z.object({
  /** Range specification in format "start..end" (inclusive) */
  range: z.string().regex(/^\d+\.\.\d+$/).describe("Range specification"),

  /** Variable name to use for the current index in each iteration */
  as: z.string().min(1).describe("Iterator variable name"),
});

/**
 * Schema for unified iteration configuration.
 *
 * @public
 */
export const IterationConfigSchema = z.union([
  ArrayIterationConfigSchema,
  RangeIterationConfigSchema,
]);

/**
 * Schema for interactive input configuration.
 *
 * @remarks
 * Enables test flows to pause execution and request user input, making tests
 * interactive and dynamic.
 *
 * @example Basic input
 * ```typescript
 * import { InputConfigSchema } from './schemas/engine.schemas';
 *
 * const input = InputConfigSchema.parse({
 *   prompt: "Enter your API key:",
 *   variable: "api_key",
 *   type: "password",
 *   required: true,
 *   validation: {
 *     min_length: 20,
 *     pattern: "^sk-[a-zA-Z0-9]+"
 *   }
 * });
 * ```
 *
 * @example Select with options
 * ```typescript
 * const input = InputConfigSchema.parse({
 *   prompt: "Select environment:",
 *   variable: "environment",
 *   type: "select",
 *   options: [
 *     { value: "dev", label: "Development" },
 *     { value: "staging", label: "Staging" },
 *     { value: "prod", label: "Production" }
 *   ],
 *   required: true
 * });
 * ```
 *
 * @public
 */
export const InputConfigSchema = z.object({
  /** The prompt message displayed to the user */
  prompt: z.string().min(1).describe("Prompt message"),

  /** Variable name to store the input value */
  variable: z.string().min(1).describe("Variable name"),

  /** Type of input control to display */
  type: z
    .enum([
      "text",
      "password",
      "number",
      "email",
      "url",
      "select",
      "confirm",
      "multiline",
    ])
    .describe("Input type"),

  /** Optional detailed description */
  description: z.string().optional().describe("Description"),

  /** Default value if user doesn't provide input */
  default: z.any().optional().describe("Default value"),

  /** Placeholder text shown in input field */
  placeholder: z.string().optional().describe("Placeholder"),

  /** Whether input is required (cannot be empty) */
  required: z.boolean().optional().describe("Is required"),

  /** Visual style for the prompt */
  style: z.enum(["simple", "boxed", "highlighted"]).optional().describe("Style"),

  /** Timeout in seconds before using default value */
  timeout_seconds: z.number().positive().optional().describe("Timeout seconds"),

  /** JMESPath condition - input only shown if condition is true */
  condition: z.string().optional().describe("Show condition"),

  /** Value to use automatically in CI/non-interactive environments */
  ci_default: z.any().optional().describe("CI default value"),

  /** Validation rules for the input */
  validation: InputValidationConfigSchema.optional().describe(
    "Validation config"
  ),

  /** Dynamic processing configuration for derived variables */
  dynamic: InputDynamicConfigSchema.optional().describe("Dynamic config"),

  /** For select type: array of options or JMESPath expression */
  options: z
    .union([
      z.array(z.object({ value: z.any(), label: z.string() })),
      z.string(),
    ])
    .optional()
    .describe("Select options"),
});

/**
 * Schema for input execution result.
 *
 * @public
 */
export const InputResultSchema = z.object({
  /** Variable name that was set */
  variable: z.string().describe("Variable name"),

  /** The value provided by user or default */
  value: z.any().describe("Input value"),

  /** Time taken for user to provide input in milliseconds */
  input_time_ms: z.number().nonnegative().describe("Input time"),

  /** Whether validation passed */
  validation_passed: z.boolean().describe("Validation passed"),

  /** Whether default value was used */
  used_default: z.boolean().describe("Used default"),

  /** Whether input timed out */
  timed_out: z.boolean().describe("Timed out"),

  /** Validation error message if validation failed */
  validation_error: z.string().optional().describe("Validation error"),

  /** Dynamic variable assignments derived from this input */
  derived_assignments: z
    .array(DynamicVariableAssignmentSchema)
    .optional()
    .describe("Derived assignments"),

  /** Non-blocking validation warnings */
  validation_warnings: z.array(z.string()).optional().describe("Warnings"),
});

/**
 * Schema for iteration context during execution.
 *
 * @public
 */
export const IterationContextSchema = z.object({
  /** Current iteration index (0-based) */
  index: z.number().int().nonnegative().describe("Iteration index"),

  /** Current item or value */
  value: z.any().describe("Current value"),

  /** Variable name to bind the current value to */
  variableName: z.string().describe("Variable name"),

  /** Whether this is the first iteration */
  isFirst: z.boolean().describe("Is first"),

  /** Whether this is the last iteration */
  isLast: z.boolean().describe("Is last"),
});

/**
 * Schema for test step metadata.
 *
 * @example
 * ```typescript
 * import { TestStepMetadataSchema } from './schemas/engine.schemas';
 *
 * const metadata = TestStepMetadataSchema.parse({
 *   priority: "critical",
 *   tags: ["auth", "security", "smoke"],
 *   timeout: 10000,
 *   retry: {
 *     max_attempts: 3,
 *     delay_ms: 1000
 *   },
 *   depends_on: ["setup_auth_token"],
 *   description: "Validates authentication token"
 * });
 * ```
 *
 * @public
 */
export const TestStepMetadataSchema = z.object({
  /** Execution priority level */
  priority: z.string().optional().describe("Priority level"),

  /** Tags for categorization, filtering, and organization */
  tags: z.array(z.string()).optional().describe("Tags"),

  /** Maximum execution time in milliseconds before timeout */
  timeout: z.number().positive().optional().describe("Timeout ms"),

  /** Retry configuration for handling transient failures */
  retry: z
    .object({
      max_attempts: z.number().int().positive(),
      delay_ms: z.number().nonnegative(),
    })
    .optional()
    .describe("Retry config"),

  /** Names of steps that must complete successfully before this step executes */
  depends_on: z.array(z.string()).optional().describe("Dependencies"),

  /** Human-readable description */
  description: z.string().optional().describe("Description"),
});

/**
 * Schema for complete test step definition.
 *
 * @remarks
 * Forward reference is needed because TestStep can reference itself through
 * the call field (StepCallConfig).
 *
 * @public
 */
export const TestStepSchema = z.lazy(() =>
  z.object({
    /** Descriptive name identifying the purpose of this test step */
    name: z.string().min(1).describe("Step name"),

    /** Optional unique identifier used for targeted execution */
    step_id: z.string().optional().describe("Step ID"),

    /** HTTP request configuration */
    request: RequestDetailsSchema.optional().describe("Request details"),

    /** Response validation rules and assertions */
    assert: AssertionsSchema.optional().describe("Assertions"),

    /** Cross-suite step call configuration */
    call: z.any().optional().describe("Step call config"),

    /** Data extraction patterns using JMESPath expressions */
    capture: z.record(z.string(), z.string()).optional().describe("Capture expressions"),

    /** Conditional scenarios for dynamic test behavior */
    scenarios: z
      .array(ConditionalScenarioSchema)
      .optional()
      .describe("Scenarios"),

    /** Iteration configuration for data-driven testing */
    iterate: IterationConfigSchema.optional().describe("Iteration config"),

    /** Interactive input configuration */
    input: z
      .union([InputConfigSchema, z.array(InputConfigSchema)])
      .optional()
      .describe("Input config"),

    /** Whether to continue test suite execution if this step fails */
    continue_on_failure: z.boolean().optional().describe("Continue on failure"),

    /** Additional metadata for execution control and organization */
    metadata: TestStepMetadataSchema.optional().describe("Step metadata"),
  })
);

/**
 * Schema for flow dependency configuration.
 *
 * @example
 * ```typescript
 * import { FlowDependencySchema } from './schemas/engine.schemas';
 *
 * const dependency = FlowDependencySchema.parse({
 *   path: "./auth/setup-auth.yaml",
 *   required: true,
 *   cache: 300,
 *   condition: "environment == 'test'",
 *   variables: { test_mode: true },
 *   retry: { max_attempts: 2, delay_ms: 1000 }
 * });
 * ```
 *
 * @public
 */
export const FlowDependencySchema = z.object({
  /** Path to the dependency flow or node_id for direct reference */
  path: z.string().optional().describe("Dependency path"),

  /** Path resolution strategy */
  path_type: z.enum(["relative", "absolute"]).optional().describe("Path type"),

  /** Node ID for direct reference to another test suite */
  node_id: z.string().optional().describe("Node ID"),

  /** Whether this dependency is required for execution */
  required: z.boolean().optional().describe("Is required"),

  /** Cache configuration: true, false, or TTL in seconds */
  cache: z.union([z.boolean(), z.number()]).optional().describe("Cache config"),

  /** JMESPath condition for conditional execution */
  condition: z.string().optional().describe("Condition"),

  /** Variables to override in the dependency */
  variables: z.record(z.string(), z.any()).optional().describe("Variables"),

  /** Retry configuration for failed dependencies */
  retry: z
    .object({
      max_attempts: z.number().int().positive(),
      delay_ms: z.number().nonnegative(),
    })
    .optional()
    .describe("Retry config"),
});

/**
 * Schema for reusable flow definition.
 *
 * @public
 */
export const ReusableFlowSchema = z.object({
  /** Name of the reusable flow */
  flow_name: z.string().min(1).describe("Flow name"),

  /** Description of what this flow does */
  description: z.string().optional().describe("Description"),

  /** Default variables for the flow */
  variables: z.record(z.string(), z.any()).optional().describe("Variables"),

  /** Test steps that comprise the flow */
  steps: z.array(TestStepSchema).describe("Steps"),

  /** Variables to export to global scope after execution */
  exports: z.array(z.string()).optional().describe("Exports"),

  /** Optional variables to export (no warnings if not found) */
  exports_optional: z.array(z.string()).optional().describe("Optional exports"),

  /** Flow dependencies that must be executed first */
  depends: z.array(FlowDependencySchema).optional().describe("Dependencies"),

  /** Additional metadata for flow execution */
  metadata: z
    .object({
      priority: z.string().optional(),
      tags: z.array(z.string()).optional(),
      estimated_duration_ms: z.number().nonnegative().optional(),
    })
    .optional()
    .describe("Flow metadata"),
});

/**
 * Schema for complete test suite definition.
 *
 * @example
 * ```typescript
 * import { TestSuiteSchema } from './schemas/engine.schemas';
 *
 * const suite = TestSuiteSchema.parse({
 *   node_id: "user-mgmt-e2e",
 *   suite_name: "E2E User Management Tests",
 *   description: "Complete end-to-end testing",
 *   base_url: "https://api.example.com",
 *   variables: {
 *     test_user_email: "test@example.com",
 *     api_version: "v1"
 *   },
 *   steps: [
 *     {
 *       name: "Create user",
 *       request: {
 *         method: "POST",
 *         url: "/users",
 *         body: { email: "{{test_user_email}}" }
 *       }
 *     }
 *   ],
 *   exports: ["created_user_id", "auth_token"],
 *   metadata: {
 *     priority: "high",
 *     tags: ["e2e", "user-management"]
 *   }
 * });
 * ```
 *
 * @public
 */
export const TestSuiteSchema = z.object({
  /** Unique node identifier for this test suite */
  node_id: z.string().min(1).describe("Node ID"),

  /** Name of the test suite */
  suite_name: z.string().min(1).describe("Suite name"),

  /** Description of what this suite tests */
  description: z.string().optional().describe("Description"),

  /** Base URL for all requests in this suite */
  base_url: z.string().url().optional().describe("Base URL"),

  /** Variables available to all steps */
  variables: z.record(z.string(), z.any()).optional().describe("Variables"),

  /** Test steps to execute */
  steps: z.array(TestStepSchema).min(1).describe("Test steps"),

  /** Variables to export to global scope */
  exports: z.array(z.string()).optional().describe("Exports"),

  /** Optional variables to export (no warnings if not found) */
  exports_optional: z.array(z.string()).optional().describe("Optional exports"),

  /** Dependencies that must be satisfied before execution */
  depends: z.array(FlowDependencySchema).optional().describe("Dependencies"),

  /** Extended metadata for suite configuration */
  metadata: z
    .object({
      priority: z.string().optional(),
      tags: z.array(z.string()).optional(),
      timeout: z.number().positive().optional(),
      estimated_duration_ms: z.number().nonnegative().optional(),
    })
    .optional()
    .describe("Suite metadata"),
});

/**
 * Type inference helpers for TypeScript compatibility
 */
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type RequestDetails = z.infer<typeof RequestDetailsSchema>;
export type AssertionChecks = z.infer<typeof AssertionChecksSchema>;
export type CustomAssertion = z.infer<typeof CustomAssertionSchema>;
export type Assertions = z.infer<typeof AssertionsSchema>;
export type ConditionalScenario = z.infer<typeof ConditionalScenarioSchema>;
export type ArrayIterationConfig = z.infer<typeof ArrayIterationConfigSchema>;
export type RangeIterationConfig = z.infer<typeof RangeIterationConfigSchema>;
export type IterationConfig = z.infer<typeof IterationConfigSchema>;
export type InputConfig = z.infer<typeof InputConfigSchema>;
export type InputResult = z.infer<typeof InputResultSchema>;
export type IterationContext = z.infer<typeof IterationContextSchema>;
export type TestStepMetadata = z.infer<typeof TestStepMetadataSchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type FlowDependency = z.infer<typeof FlowDependencySchema>;
export type ReusableFlow = z.infer<typeof ReusableFlowSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;
