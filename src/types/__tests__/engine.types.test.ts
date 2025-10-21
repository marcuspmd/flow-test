/**
 * @fileoverview Unit tests for engine.types.ts type definitions and interfaces
 *
 * @remarks
 * This test suite validates the type definitions, interfaces, and type guards
 * for the Flow Test Engine's core types, ensuring type safety and correctness.
 */

import type {
  RequestDetails,
  AssertionChecks,
  Assertions,
  ConditionalScenario,
  ArrayIterationConfig,
  RangeIterationConfig,
  IterationConfig,
  InputConfig,
  InputResult,
  InputExecutionContext,
  InteractiveInputRequest,
  RunnerInputEvent,
  IterationContext,
  TestStepMetadata,
  TestStep,
  FlowDependency,
  DependencyResult,
  ReusableFlow,
  TestSuite,
  ExecutionContext,
  ExecutionStats,
} from "../engine.types";

describe("engine.types", () => {
  describe("RequestDetails", () => {
    it("should accept valid HTTP methods", () => {
      const validMethods: RequestDetails["method"][] = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ];

      validMethods.forEach((method) => {
        const request: RequestDetails = {
          method,
          url: "/api/test",
        };
        expect(request.method).toBe(method);
      });
    });

    it("should create valid request with all properties", () => {
      const request: RequestDetails = {
        method: "POST",
        url: "/api/users",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
        body: {
          name: "John Doe",
          email: "john@example.com",
        },
        params: {
          page: 1,
          limit: 10,
        },
        timeout: 30000,
        certificate: {
          cert_path: "./certs/client.crt",
          key_path: "./certs/client.key",
        },
      };

      expect(request.method).toBe("POST");
      expect(request.url).toBe("/api/users");
      expect(request.headers).toBeDefined();
      expect(request.body).toBeDefined();
      expect(request.params).toBeDefined();
      expect(request.timeout).toBe(30000);
      expect(request.certificate).toBeDefined();
    });

    it("should create minimal valid request", () => {
      const request: RequestDetails = {
        method: "GET",
        url: "/api/users",
      };

      expect(request.method).toBe("GET");
      expect(request.url).toBe("/api/users");
      expect(request.headers).toBeUndefined();
      expect(request.body).toBeUndefined();
    });
  });

  describe("AssertionChecks", () => {
    it("should create equality assertion", () => {
      const check: AssertionChecks = {
        equals: 200,
      };
      expect(check.equals).toBe(200);
    });

    it("should create type assertion", () => {
      const validTypes: AssertionChecks["type"][] = [
        "string",
        "number",
        "boolean",
        "object",
        "array",
      ];

      validTypes.forEach((type) => {
        const check: AssertionChecks = { type };
        expect(check.type).toBe(type);
      });
    });

    it("should create complex assertion with multiple checks", () => {
      const check: AssertionChecks = {
        type: "string",
        regex: "^[a-zA-Z0-9]+$",
        minLength: 5,
        notEmpty: true,
        exists: true,
      };

      expect(check.type).toBe("string");
      expect(check.regex).toBeDefined();
      expect(check.minLength).toBe(5);
      expect(check.notEmpty).toBe(true);
    });

    it("should create length assertion with nested checks", () => {
      const check: AssertionChecks = {
        type: "array",
        length: {
          equals: 10,
          greater_than: 0,
          less_than: 100,
        },
      };

      expect(check.length).toBeDefined();
      expect(check.length?.equals).toBe(10);
      expect(check.length?.greater_than).toBe(0);
      expect(check.length?.less_than).toBe(100);
    });

    it("should create numerical comparison assertions", () => {
      const check: AssertionChecks = {
        type: "number",
        greater_than: 0,
        less_than: 100,
      };

      expect(check.greater_than).toBe(0);
      expect(check.less_than).toBe(100);
    });
  });

  describe("Assertions", () => {
    it("should create simple status code assertion", () => {
      const assertions: Assertions = {
        status_code: 200,
      };
      expect(assertions.status_code).toBe(200);
    });

    it("should create status code assertion with checks", () => {
      const assertions: Assertions = {
        status_code: {
          equals: 200,
        },
      };
      expect(typeof assertions.status_code).toBe("object");
    });

    it("should create body field assertions", () => {
      const assertions: Assertions = {
        body: {
          success: { equals: true },
          user_id: { type: "number", greater_than: 0 },
          email: { regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" },
        },
      };

      expect(assertions.body).toBeDefined();
      expect(assertions.body?.success).toBeDefined();
      expect(assertions.body?.user_id).toBeDefined();
    });

    it("should create header assertions", () => {
      const assertions: Assertions = {
        headers: {
          "content-type": { contains: "application/json" },
          "x-api-version": { equals: "v1" },
        },
      };

      expect(assertions.headers).toBeDefined();
      expect(assertions.headers?.["content-type"]).toBeDefined();
    });

    it("should create response time assertions", () => {
      const assertions: Assertions = {
        response_time_ms: {
          less_than: 2000,
          greater_than: 10,
        },
      };

      expect(assertions.response_time_ms?.less_than).toBe(2000);
      expect(assertions.response_time_ms?.greater_than).toBe(10);
    });

    it("should create custom assertions", () => {
      const assertions: Assertions = {
        custom: [
          {
            name: "Valid user ID",
            condition: "body.user.id && typeof body.user.id === 'number'",
            message: "User ID must be a number",
          },
        ],
      };

      expect(assertions.custom).toHaveLength(1);
      expect(assertions.custom?.[0].name).toBe("Valid user ID");
    });
  });

  describe("ConditionalScenario", () => {
    it("should create scenario with then clause", () => {
      const scenario: ConditionalScenario = {
        name: "Admin user check",
        condition: "body.role == 'admin'",
        then: {
          assert: {
            status_code: 200,
          },
          capture: {
            admin_id: "body.id",
          },
          variables: {
            is_admin: true,
          },
        },
      };

      expect(scenario.name).toBe("Admin user check");
      expect(scenario.condition).toBeDefined();
      expect(scenario.then).toBeDefined();
      expect(scenario.then?.assert).toBeDefined();
      expect(scenario.then?.capture).toBeDefined();
      expect(scenario.then?.variables).toBeDefined();
    });

    it("should create scenario with else clause", () => {
      const scenario: ConditionalScenario = {
        condition: "status == `200`",
        then: {
          capture: { success_data: "body" },
        },
        else: {
          assert: { status_code: { greater_than: 399 } },
          variables: { failed: true },
        },
      };

      expect(scenario.else).toBeDefined();
      expect(scenario.else?.assert).toBeDefined();
      expect(scenario.else?.variables).toBeDefined();
    });

    it("should create minimal scenario", () => {
      const scenario: ConditionalScenario = {
        condition: "body.success == true",
      };

      expect(scenario.condition).toBeDefined();
      expect(scenario.then).toBeUndefined();
      expect(scenario.else).toBeUndefined();
    });
  });

  describe("IterationConfig", () => {
    it("should create array iteration config", () => {
      const config: ArrayIterationConfig = {
        over: "{{test_users}}",
        as: "current_user",
      };

      expect(config.over).toBe("{{test_users}}");
      expect(config.as).toBe("current_user");
    });

    it("should create range iteration config", () => {
      const config: RangeIterationConfig = {
        range: "1..10",
        as: "page_number",
      };

      expect(config.range).toBe("1..10");
      expect(config.as).toBe("page_number");
    });

    it("should accept both iteration types", () => {
      const arrayConfig: IterationConfig = {
        over: "{{items}}",
        as: "item",
      };

      const rangeConfig: IterationConfig = {
        range: "0..100",
        as: "index",
      };

      expect("over" in arrayConfig).toBe(true);
      expect("range" in rangeConfig).toBe(true);
    });
  });

  describe("InputConfig", () => {
    it("should create text input config", () => {
      const input: InputConfig = {
        prompt: "Enter your name:",
        variable: "user_name",
        type: "text",
      };

      expect(input.prompt).toBeDefined();
      expect(input.variable).toBe("user_name");
      expect(input.type).toBe("text");
    });

    it("should create password input with validation", () => {
      const input: InputConfig = {
        prompt: "Enter API key:",
        variable: "api_key",
        type: "password",
        required: true,
        validation: {
          min_length: 20,
          pattern: "^sk-[a-zA-Z0-9]+",
        },
      };

      expect(input.type).toBe("password");
      expect(input.required).toBe(true);
      expect(input.validation?.min_length).toBe(20);
    });

    it("should create select input with options", () => {
      const input: InputConfig = {
        prompt: "Select environment:",
        variable: "env",
        type: "select",
        options: [
          { value: "dev", label: "Development" },
          { value: "prod", label: "Production" },
        ],
      };

      expect(input.type).toBe("select");
      expect(input.options).toHaveLength(2);
    });

    it("should create input with all optional properties", () => {
      const input: InputConfig = {
        prompt: "Enter value:",
        variable: "test_var",
        type: "text",
        description: "Test input field",
        default: "default_value",
        placeholder: "Enter value here...",
        required: false,
        style: "boxed",
        timeout_seconds: 30,
        condition: "status == `200`",
        ci_default: "ci_value",
        validation: {
          min_length: 3,
          max_length: 100,
        },
        dynamic: {
          scope: "global",
          capture: {},
          computed: {},
        },
      };

      expect(input.description).toBeDefined();
      expect(input.default).toBe("default_value");
      expect(input.placeholder).toBeDefined();
      expect(input.style).toBe("boxed");
      expect(input.timeout_seconds).toBe(30);
      expect(input.condition).toBeDefined();
      expect(input.ci_default).toBeDefined();
      expect(input.validation).toBeDefined();
      expect(input.dynamic).toBeDefined();
    });

    it("should support all input types", () => {
      const types: InputConfig["type"][] = [
        "text",
        "password",
        "number",
        "email",
        "url",
        "select",
        "confirm",
        "multiline",
      ];

      types.forEach((type) => {
        const input: InputConfig = {
          prompt: `Enter ${type}:`,
          variable: `test_${type}`,
          type,
        };
        expect(input.type).toBe(type);
      });
    });
  });

  describe("InputResult", () => {
    it("should create successful input result", () => {
      const result: InputResult = {
        variable: "api_key",
        value: "sk-abc123",
        input_time_ms: 15000,
        validation_passed: true,
        used_default: false,
        timed_out: false,
      };

      expect(result.variable).toBe("api_key");
      expect(result.validation_passed).toBe(true);
      expect(result.used_default).toBe(false);
      expect(result.timed_out).toBe(false);
    });

    it("should create failed validation result", () => {
      const result: InputResult = {
        variable: "email",
        value: "invalid",
        input_time_ms: 5000,
        validation_passed: false,
        used_default: false,
        timed_out: false,
        validation_error: "Invalid email format",
      };

      expect(result.validation_passed).toBe(false);
      expect(result.validation_error).toBeDefined();
    });

    it("should create result with warnings", () => {
      const result: InputResult = {
        variable: "username",
        value: "test_user",
        input_time_ms: 10000,
        validation_passed: true,
        used_default: false,
        timed_out: false,
        validation_warnings: ["Username contains special characters"],
      };

      expect(result.validation_warnings).toHaveLength(1);
    });

    it("should create result with derived assignments", () => {
      const result: InputResult = {
        variable: "user_data",
        value: { name: "John", email: "john@example.com" },
        input_time_ms: 8000,
        validation_passed: true,
        used_default: false,
        timed_out: false,
        derived_assignments: [
          {
            name: "user_name",
            value: "John",
            scope: "runtime",
            source: "computed",
            timestamp: new Date().toISOString(),
          },
        ],
      };

      expect(result.derived_assignments).toHaveLength(1);
    });
  });

  describe("InputExecutionContext", () => {
    it("should create complete execution context", () => {
      const context: InputExecutionContext = {
        suite_name: "API Tests",
        suite_path: "/path/to/tests.yaml",
        step_name: "Login step",
        step_id: "login-001",
        step_index: 2,
        cache_key: "api-tests::login",
      };

      expect(context.suite_name).toBe("API Tests");
      expect(context.step_index).toBe(2);
      expect(context.cache_key).toBeDefined();
    });

    it("should create minimal context", () => {
      const context: InputExecutionContext = {};
      expect(context).toBeDefined();
    });
  });

  describe("InteractiveInputRequest", () => {
    it("should create complete input request", () => {
      const request: InteractiveInputRequest = {
        variable: "api_key",
        prompt: "Enter API key:",
        required: true,
        masked: true,
        input_type: "password",
        default: "default_key",
        options: [{ label: "Option 1", value: "opt1" }],
        suite_name: "API Tests",
        cache_key: "test::api_key",
      };

      expect(request.variable).toBe("api_key");
      expect(request.masked).toBe(true);
      expect(request.required).toBe(true);
    });
  });

  describe("RunnerInputEvent", () => {
    it("should create request event", () => {
      const event: RunnerInputEvent = {
        type: "request",
        request: {
          variable: "username",
          prompt: "Enter username:",
          required: true,
          masked: false,
          input_type: "text",
        },
      };

      expect(event.type).toBe("request");
      expect(event.request).toBeDefined();
    });

    it("should create info event", () => {
      const event: RunnerInputEvent = {
        type: "info",
        message: "Processing input...",
      };

      expect(event.type).toBe("info");
      expect(event.message).toBeDefined();
    });
  });

  describe("IterationContext", () => {
    it("should create iteration context", () => {
      const context: IterationContext = {
        index: 2,
        value: { id: 123, name: "Alice" },
        variableName: "current_user",
        isFirst: false,
        isLast: false,
      };

      expect(context.index).toBe(2);
      expect(context.value).toBeDefined();
      expect(context.variableName).toBe("current_user");
      expect(context.isFirst).toBe(false);
      expect(context.isLast).toBe(false);
    });

    it("should create first iteration context", () => {
      const context: IterationContext = {
        index: 0,
        value: "first item",
        variableName: "item",
        isFirst: true,
        isLast: false,
      };

      expect(context.isFirst).toBe(true);
    });

    it("should create last iteration context", () => {
      const context: IterationContext = {
        index: 9,
        value: "last item",
        variableName: "item",
        isFirst: false,
        isLast: true,
      };

      expect(context.isLast).toBe(true);
    });
  });

  describe("TestStepMetadata", () => {
    it("should create complete metadata", () => {
      const metadata: TestStepMetadata = {
        priority: "critical",
        tags: ["auth", "security", "smoke"],
        timeout: 10000,
        retry: {
          max_attempts: 3,
          delay_ms: 1000,
        },
        depends_on: ["setup_auth"],
        description: "Authenticates user and validates token",
      };

      expect(metadata.priority).toBe("critical");
      expect(metadata.tags).toHaveLength(3);
      expect(metadata.timeout).toBe(10000);
      expect(metadata.retry?.max_attempts).toBe(3);
      expect(metadata.depends_on).toHaveLength(1);
    });

    it("should create minimal metadata", () => {
      const metadata: TestStepMetadata = {
        priority: "low",
      };

      expect(metadata.priority).toBe("low");
      expect(metadata.tags).toBeUndefined();
    });
  });

  describe("TestStep", () => {
    it("should create complete test step", () => {
      const step: TestStep = {
        name: "Create user account",
        step_id: "create-user-001",
        request: {
          method: "POST",
          url: "/api/users",
          headers: { "Content-Type": "application/json" },
          body: { username: "test_user" },
        },
        assert: {
          status_code: 201,
          body: {
            id: { exists: true, type: "number" },
          },
        },
        capture: {
          user_id: "body.id",
        },
        scenarios: [
          {
            condition: "body.role == 'admin'",
            then: {
              capture: { admin_permissions: "body.permissions" },
            },
          },
        ],
        continue_on_failure: false,
        metadata: {
          priority: "high",
          tags: ["user-management"],
        },
      };

      expect(step.name).toBe("Create user account");
      expect(step.step_id).toBe("create-user-001");
      expect(step.request).toBeDefined();
      expect(step.assert).toBeDefined();
      expect(step.capture).toBeDefined();
      expect(step.scenarios).toHaveLength(1);
      expect(step.metadata).toBeDefined();
    });

    it("should create step with iteration", () => {
      const step: TestStep = {
        name: "Test multiple users",
        iterate: {
          over: "{{test_users}}",
          as: "user",
        },
        request: {
          method: "GET",
          url: "/api/users/{{user.id}}",
        },
      };

      expect(step.iterate).toBeDefined();
      expect("over" in step.iterate!).toBe(true);
    });

    it("should create step with input", () => {
      const step: TestStep = {
        name: "Get user input",
        input: {
          prompt: "Enter API key:",
          variable: "api_key",
          type: "password",
        },
      };

      expect(step.input).toBeDefined();
      if (step.input && !Array.isArray(step.input)) {
        expect(step.input.type).toBe("password");
      }
    });

    it("should create step with multiple inputs", () => {
      const step: TestStep = {
        name: "Get user credentials",
        input: [
          {
            prompt: "Enter username:",
            variable: "username",
            type: "text",
          },
          {
            prompt: "Enter password:",
            variable: "password",
            type: "password",
          },
        ],
      };

      expect(Array.isArray(step.input)).toBe(true);
      expect(step.input).toHaveLength(2);
    });

    it("should create step with call", () => {
      const step: TestStep = {
        name: "Execute external flow",
        call: {
          test: "../auth/login.yaml",
          step: "login-step",
          variables: { username: "test" },
        },
      };

      expect(step.call).toBeDefined();
      expect(step.call?.test).toBe("../auth/login.yaml");
    });

    it("should create step with pre and post request scripts", () => {
      const step: TestStep = {
        name: "API call with scripts",
        pre_request: {
          script: "console.log('Before request');",
        },
        request: {
          method: "GET",
          url: "/api/data",
        },
        post_request: {
          script: "console.log('After request');",
        },
      };

      expect(step.pre_request).toBeDefined();
      expect(step.post_request).toBeDefined();
    });

    it("should create minimal step", () => {
      const step: TestStep = {
        name: "Simple GET request",
        request: {
          method: "GET",
          url: "/api/status",
        },
      };

      expect(step.name).toBeDefined();
      expect(step.request).toBeDefined();
    });
  });

  describe("FlowDependency", () => {
    it("should create dependency with path", () => {
      const dependency: FlowDependency = {
        path: "./auth/setup-auth.yaml",
        required: true,
        cache: 300,
      };

      expect(dependency.path).toBe("./auth/setup-auth.yaml");
      expect(dependency.required).toBe(true);
      expect(dependency.cache).toBe(300);
    });

    it("should create dependency with node_id", () => {
      const dependency: FlowDependency = {
        node_id: "auth-setup-001",
        required: true,
      };

      expect(dependency.node_id).toBe("auth-setup-001");
    });

    it("should create dependency with condition and variables", () => {
      const dependency: FlowDependency = {
        path: "./setup.yaml",
        condition: "environment == 'test'",
        variables: {
          test_mode: true,
        },
      };

      expect(dependency.condition).toBeDefined();
      expect(dependency.variables).toBeDefined();
    });

    it("should create dependency with retry config", () => {
      const dependency: FlowDependency = {
        path: "./setup.yaml",
        retry: {
          max_attempts: 3,
          delay_ms: 2000,
        },
      };

      expect(dependency.retry?.max_attempts).toBe(3);
      expect(dependency.retry?.delay_ms).toBe(2000);
    });

    it("should support path type resolution", () => {
      const relDep: FlowDependency = {
        path: "./auth/login.yaml",
        path_type: "relative",
      };

      const absDep: FlowDependency = {
        path: "common/setup.yaml",
        path_type: "absolute",
      };

      expect(relDep.path_type).toBe("relative");
      expect(absDep.path_type).toBe("absolute");
    });
  });

  describe("DependencyResult", () => {
    it("should create successful dependency result", () => {
      const result: DependencyResult = {
        flowPath: "./auth/setup.yaml",
        nodeId: "auth-setup",
        suiteName: "Authentication Setup",
        success: true,
        executionTime: 1250,
        exportedVariables: {
          auth_token: "abc123",
          user_id: "user_456",
        },
        cached: false,
      };

      expect(result.success).toBe(true);
      expect(result.executionTime).toBe(1250);
      expect(result.exportedVariables).toBeDefined();
      expect(result.cached).toBe(false);
    });

    it("should create failed dependency result", () => {
      const result: DependencyResult = {
        flowPath: "./setup.yaml",
        nodeId: "setup-001",
        suiteName: "Setup",
        success: false,
        executionTime: 500,
        exportedVariables: {},
        cached: false,
        error: "Connection timeout",
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection timeout");
    });

    it("should create cached dependency result", () => {
      const result: DependencyResult = {
        flowPath: "./auth.yaml",
        nodeId: "auth",
        suiteName: "Auth",
        success: true,
        executionTime: 0,
        exportedVariables: { token: "cached_token" },
        cached: true,
      };

      expect(result.cached).toBe(true);
      expect(result.executionTime).toBe(0);
    });
  });

  describe("ReusableFlow", () => {
    it("should create complete reusable flow", () => {
      const flow: ReusableFlow = {
        flow_name: "User Registration Flow",
        description: "Complete user registration process",
        variables: {
          base_url: "https://api.example.com",
          test_email: "test@example.com",
        },
        steps: [
          {
            name: "Create account",
            request: {
              method: "POST",
              url: "/users",
            },
          },
        ],
        exports: ["user_id", "auth_token"],
        exports_optional: ["user_preferences"],
        depends: [
          {
            path: "./database-setup.yaml",
          },
        ],
        metadata: {
          priority: "high",
          tags: ["user-registration"],
          estimated_duration_ms: 5000,
        },
      };

      expect(flow.flow_name).toBe("User Registration Flow");
      expect(flow.description).toBeDefined();
      expect(flow.variables).toBeDefined();
      expect(flow.steps).toHaveLength(1);
      expect(flow.exports).toHaveLength(2);
      expect(flow.exports_optional).toHaveLength(1);
      expect(flow.depends).toHaveLength(1);
      expect(flow.metadata).toBeDefined();
    });

    it("should create minimal reusable flow", () => {
      const flow: ReusableFlow = {
        flow_name: "Simple Flow",
        steps: [
          {
            name: "Step 1",
            request: { method: "GET", url: "/test" },
          },
        ],
      };

      expect(flow.flow_name).toBeDefined();
      expect(flow.steps).toHaveLength(1);
    });
  });

  describe("TestSuite", () => {
    it("should create complete test suite", () => {
      const suite: TestSuite = {
        node_id: "user-api-tests",
        suite_name: "User API Tests",
        description: "Complete user API testing suite",
        base_url: "https://api.example.com",
        variables: {
          api_version: "v1",
          test_user: "test@example.com",
        },
        steps: [
          {
            name: "Health check",
            request: { method: "GET", url: "/health" },
          },
        ],
        exports: ["api_health_status"],
        exports_optional: ["optional_metric"],
        depends: [
          {
            path: "./setup.yaml",
            required: true,
          },
        ],
        metadata: {
          priority: "critical",
          tags: ["api", "smoke"],
          timeout: 30000,
          estimated_duration_ms: 15000,
        },
        certificate: {
          cert_path: "./certs/client.crt",
          key_path: "./certs/client.key",
        },
      };

      expect(suite.node_id).toBe("user-api-tests");
      expect(suite.suite_name).toBe("User API Tests");
      expect(suite.description).toBeDefined();
      expect(suite.base_url).toBeDefined();
      expect(suite.variables).toBeDefined();
      expect(suite.steps).toHaveLength(1);
      expect(suite.exports).toHaveLength(1);
      expect(suite.exports_optional).toHaveLength(1);
      expect(suite.depends).toHaveLength(1);
      expect(suite.metadata).toBeDefined();
      expect(suite.certificate).toBeDefined();
    });

    it("should create minimal test suite", () => {
      const suite: TestSuite = {
        node_id: "simple-test",
        suite_name: "Simple Test",
        steps: [
          {
            name: "Test step",
            request: { method: "GET", url: "/test" },
          },
        ],
      };

      expect(suite.node_id).toBeDefined();
      expect(suite.suite_name).toBeDefined();
      expect(suite.steps).toHaveLength(1);
    });
  });

  describe("ExecutionContext", () => {
    it("should create complete execution context", () => {
      const context: ExecutionContext = {
        suite: {
          node_id: "test-suite",
          suite_name: "Test Suite",
          steps: [],
        },
        global_variables: {
          api_base_url: "https://api.example.com",
          auth_token: "token123",
        },
        runtime_variables: {
          test_timestamp: "2024-01-01T12:00:00Z",
          user_id: "user_456",
        },
        step_index: 2,
        total_steps: 5,
        start_time: new Date("2024-01-01T12:00:00Z"),
        execution_id: "exec_789",
      };

      expect(context.suite).toBeDefined();
      expect(context.global_variables).toBeDefined();
      expect(context.runtime_variables).toBeDefined();
      expect(context.step_index).toBe(2);
      expect(context.total_steps).toBe(5);
      expect(context.start_time).toBeInstanceOf(Date);
      expect(context.execution_id).toBe("exec_789");
    });
  });

  describe("ExecutionStats", () => {
    it("should create execution statistics", () => {
      const stats: ExecutionStats = {
        tests_discovered: 15,
        tests_completed: 10,
        tests_successful: 8,
        tests_failed: 2,
        tests_skipped: 0,
        current_test: "User Authentication Tests",
        estimated_time_remaining_ms: 45000,
        requests_made: 127,
        total_response_time_ms: 12500,
      };

      expect(stats.tests_discovered).toBe(15);
      expect(stats.tests_completed).toBe(10);
      expect(stats.tests_successful).toBe(8);
      expect(stats.tests_failed).toBe(2);
      expect(stats.tests_skipped).toBe(0);
      expect(stats.current_test).toBe("User Authentication Tests");
      expect(stats.estimated_time_remaining_ms).toBe(45000);
      expect(stats.requests_made).toBe(127);
      expect(stats.total_response_time_ms).toBe(12500);
    });

    it("should handle zero values", () => {
      const stats: ExecutionStats = {
        tests_discovered: 0,
        tests_completed: 0,
        tests_successful: 0,
        tests_failed: 0,
        tests_skipped: 0,
        current_test: "",
        estimated_time_remaining_ms: 0,
        requests_made: 0,
        total_response_time_ms: 0,
      };

      expect(stats.tests_discovered).toBe(0);
      expect(stats.tests_completed).toBe(0);
    });
  });

  describe("Type compatibility", () => {
    it("should allow IterationConfig to be ArrayIterationConfig", () => {
      const arrayConfig: ArrayIterationConfig = {
        over: "{{items}}",
        as: "item",
      };
      const iterationConfig: IterationConfig = arrayConfig;
      expect(iterationConfig).toBeDefined();
    });

    it("should allow IterationConfig to be RangeIterationConfig", () => {
      const rangeConfig: RangeIterationConfig = {
        range: "1..10",
        as: "index",
      };
      const iterationConfig: IterationConfig = rangeConfig;
      expect(iterationConfig).toBeDefined();
    });

    it("should allow status_code to be number or AssertionChecks", () => {
      const numericAssertion: Assertions = { status_code: 200 };
      const objectAssertion: Assertions = {
        status_code: { equals: 200 },
      };

      expect(typeof numericAssertion.status_code).toBe("number");
      expect(typeof objectAssertion.status_code).toBe("object");
    });

    it("should allow input to be single or array", () => {
      const singleInput: TestStep = {
        name: "Single input",
        input: { prompt: "Enter:", variable: "var", type: "text" },
      };

      const multipleInputs: TestStep = {
        name: "Multiple inputs",
        input: [
          { prompt: "Enter 1:", variable: "var1", type: "text" },
          { prompt: "Enter 2:", variable: "var2", type: "text" },
        ],
      };

      expect(singleInput.input).toBeDefined();
      expect(Array.isArray(multipleInputs.input)).toBe(true);
    });

    it("should allow cache to be boolean or number", () => {
      const boolCache: FlowDependency = { path: "./test.yaml", cache: true };
      const numCache: FlowDependency = { path: "./test.yaml", cache: 300 };

      expect(typeof boolCache.cache).toBe("boolean");
      expect(typeof numCache.cache).toBe("number");
    });
  });

  describe("Optional properties", () => {
    it("should allow RequestDetails without optional properties", () => {
      const minimalRequest: RequestDetails = {
        method: "GET",
        url: "/test",
      };

      expect(minimalRequest.headers).toBeUndefined();
      expect(minimalRequest.body).toBeUndefined();
      expect(minimalRequest.params).toBeUndefined();
      expect(minimalRequest.timeout).toBeUndefined();
    });

    it("should allow TestStep without optional properties", () => {
      const minimalStep: TestStep = {
        name: "Test",
        request: { method: "GET", url: "/test" },
      };

      expect(minimalStep.step_id).toBeUndefined();
      expect(minimalStep.assert).toBeUndefined();
      expect(minimalStep.capture).toBeUndefined();
      expect(minimalStep.scenarios).toBeUndefined();
      expect(minimalStep.iterate).toBeUndefined();
      expect(minimalStep.input).toBeUndefined();
      expect(minimalStep.metadata).toBeUndefined();
    });

    it("should allow TestSuite without optional properties", () => {
      const minimalSuite: TestSuite = {
        node_id: "test",
        suite_name: "Test",
        steps: [],
      };

      expect(minimalSuite.description).toBeUndefined();
      expect(minimalSuite.base_url).toBeUndefined();
      expect(minimalSuite.variables).toBeUndefined();
      expect(minimalSuite.exports).toBeUndefined();
      expect(minimalSuite.depends).toBeUndefined();
      expect(minimalSuite.metadata).toBeUndefined();
    });
  });

  describe("Edge Cases and Constraints", () => {
    describe("RequestDetails edge cases", () => {
      it("should handle empty headers object", () => {
        const request: RequestDetails = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        expect(Object.keys(request.headers!)).toHaveLength(0);
      });

      it("should handle null/undefined body", () => {
        const requestNull: RequestDetails = {
          method: "POST",
          url: "/test",
          body: null,
        };
        const requestUndefined: RequestDetails = {
          method: "POST",
          url: "/test",
          body: undefined,
        };
        expect(requestNull.body).toBeNull();
        expect(requestUndefined.body).toBeUndefined();
      });

      it("should handle complex nested body structures", () => {
        const request: RequestDetails = {
          method: "POST",
          url: "/test",
          body: {
            user: {
              profile: {
                address: {
                  street: "123 Main St",
                  city: "Springfield",
                },
                contacts: [
                  { type: "email", value: "test@example.com" },
                  { type: "phone", value: "+1234567890" },
                ],
              },
            },
            metadata: {
              timestamp: new Date().toISOString(),
              version: "1.0",
            },
          },
        };
        expect(request.body.user.profile.address.city).toBe("Springfield");
        expect(request.body.user.profile.contacts).toHaveLength(2);
      });

      it("should handle URL with query parameters in string", () => {
        const request: RequestDetails = {
          method: "GET",
          url: "/api/users?page=1&limit=10&sort=name",
        };
        expect(request.url).toContain("?");
        expect(request.url).toContain("page=1");
      });

      it("should handle very large timeout values", () => {
        const request: RequestDetails = {
          method: "GET",
          url: "/test",
          timeout: Number.MAX_SAFE_INTEGER,
        };
        expect(request.timeout).toBe(Number.MAX_SAFE_INTEGER);
      });

      it("should handle zero timeout", () => {
        const request: RequestDetails = {
          method: "GET",
          url: "/test",
          timeout: 0,
        };
        expect(request.timeout).toBe(0);
      });
    });

    describe("AssertionChecks edge cases", () => {
      it("should handle multiple contradictory checks", () => {
        const check: AssertionChecks = {
          equals: 10,
          greater_than: 5,
          less_than: 15,
        };
        // This is logically consistent but tests the type system
        expect(check.equals).toBe(10);
        expect(check.greater_than).toBe(5);
        expect(check.less_than).toBe(15);
      });

      it("should handle regex with special characters", () => {
        const check: AssertionChecks = {
          regex:
            "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$",
        };
        expect(check.regex).toBeDefined();
      });

      it("should handle length with all operators", () => {
        const check: AssertionChecks = {
          length: {
            equals: 10,
            greater_than: 5,
            less_than: 15,
          },
        };
        expect(check.length?.equals).toBe(10);
        expect(check.length?.greater_than).toBe(5);
        expect(check.length?.less_than).toBe(15);
      });

      it("should handle contains with different data types", () => {
        const stringCheck: AssertionChecks = { contains: "substring" };
        const numberCheck: AssertionChecks = { contains: 42 };
        const boolCheck: AssertionChecks = { contains: true };

        expect(stringCheck.contains).toBe("substring");
        expect(numberCheck.contains).toBe(42);
        expect(boolCheck.contains).toBe(true);
      });

      it("should handle negative numbers in comparisons", () => {
        const check: AssertionChecks = {
          greater_than: -100,
          less_than: -10,
        };
        expect(check.greater_than).toBe(-100);
        expect(check.less_than).toBe(-10);
      });

      it("should handle floating point numbers", () => {
        const check: AssertionChecks = {
          equals: 3.14159,
          greater_than: 3.14,
          less_than: 3.15,
        };
        expect(check.equals).toBeCloseTo(3.14159);
      });
    });

    describe("Assertions edge cases", () => {
      it("should handle deeply nested body assertions", () => {
        const assertions: Assertions = {
          body: {
            "data.users[0].profile.address.city": { equals: "New York" },
            "data.users[0].profile.contacts[0].email": {
              regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
            },
          },
        };
        expect(assertions.body).toBeDefined();
      });

      it("should handle multiple custom assertions", () => {
        const assertions: Assertions = {
          custom: [
            {
              name: "Check 1",
              condition: "body.value > 0",
              message: "Value must be positive",
            },
            {
              name: "Check 2",
              condition: "body.status === 'active'",
              message: "Status must be active",
            },
            {
              name: "Check 3",
              condition: "headers['x-rate-limit'] < 100",
            },
          ],
        };
        expect(assertions.custom).toHaveLength(3);
      });

      it("should handle empty assertions object", () => {
        const assertions: Assertions = {};
        expect(Object.keys(assertions)).toHaveLength(0);
      });

      it("should handle response_time_ms with extreme values", () => {
        const assertions: Assertions = {
          response_time_ms: {
            less_than: 1,
            greater_than: 0,
          },
        };
        expect(assertions.response_time_ms?.less_than).toBe(1);
      });
    });

    describe("ConditionalScenario edge cases", () => {
      it("should handle complex JMESPath conditions", () => {
        const scenario: ConditionalScenario = {
          condition:
            "body.users[?status=='active'] | length(@) > `0` && body.total > `10`",
          then: {
            variables: { has_active_users: true },
          },
        };
        expect(scenario.condition).toContain("length(@)");
      });

      it("should handle scenario without name", () => {
        const scenario: ConditionalScenario = {
          condition: "status == `200`",
          then: { variables: { success: true } },
        };
        expect(scenario.name).toBeUndefined();
      });

      it("should handle nested scenarios (conceptually)", () => {
        const scenario: ConditionalScenario = {
          name: "Nested logic",
          condition: "body.type == 'complex'",
          then: {
            assert: {
              body: {
                nested: { exists: true },
              },
            },
            capture: {
              nested_data: "body.nested",
            },
          },
          else: {
            assert: {
              body: {
                simple: { exists: true },
              },
            },
          },
        };
        expect(scenario.then?.assert).toBeDefined();
        expect(scenario.else?.assert).toBeDefined();
      });
    });

    describe("IterationConfig edge cases", () => {
      it("should handle JMESPath expressions in array iteration", () => {
        const config: ArrayIterationConfig = {
          over: "{{body.data[?status=='active'].items[]}}",
          as: "active_item",
        };
        expect(config.over).toContain("?status");
      });

      it("should handle large ranges", () => {
        const config: RangeIterationConfig = {
          range: "1..10000",
          as: "batch_index",
        };
        expect(config.range).toBe("1..10000");
      });

      it("should handle negative ranges", () => {
        const config: RangeIterationConfig = {
          range: "-10..10",
          as: "offset",
        };
        expect(config.range).toBe("-10..10");
      });

      it("should handle reverse ranges", () => {
        const config: RangeIterationConfig = {
          range: "10..1",
          as: "countdown",
        };
        expect(config.range).toBe("10..1");
      });
    });

    describe("InputConfig edge cases", () => {
      it("should handle dynamic options with JMESPath", () => {
        const input: InputConfig = {
          prompt: "Select user:",
          variable: "selected_user",
          type: "select",
          options:
            "{{body.users[*].{value: id, label: join(' - ', [name, email])}}",
        };
        expect(input.options).toContain("join");
      });

      it("should handle multiline input with validation", () => {
        const input: InputConfig = {
          prompt: "Enter JSON:",
          variable: "json_data",
          type: "multiline",
          validation: {
            custom_validation: "JSON.parse(value)",
          },
        };
        expect(input.type).toBe("multiline");
      });

      it("should handle complex validation with multiple rules", () => {
        const input: InputConfig = {
          prompt: "Enter password:",
          variable: "password",
          type: "password",
          validation: {
            min_length: 8,
            max_length: 128,
            pattern:
              "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
            custom_validation:
              "value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\\d/.test(value)",
            expressions: [
              {
                name: "has_uppercase",
                expression: "/[A-Z]/.test(value)",
                severity: "error",
                message: "Must contain uppercase letter",
              },
              {
                name: "has_number",
                expression: "/\\d/.test(value)",
                severity: "error",
                message: "Must contain number",
              },
            ],
          },
        };
        expect(input.validation?.min_length).toBe(8);
        expect(input.validation?.expressions).toHaveLength(2);
      });

      it("should handle input with all timeout and default options", () => {
        const input: InputConfig = {
          prompt: "Enter value:",
          variable: "test_var",
          type: "text",
          timeout_seconds: 0,
          default: "",
          ci_default: "ci_default",
          required: false,
        };
        expect(input.timeout_seconds).toBe(0);
      });

      it("should handle conditional input with complex expression", () => {
        const input: InputConfig = {
          prompt: "Additional info:",
          variable: "extra_info",
          type: "text",
          condition:
            "body.status == 'pending' && body.requires_additional_info == true",
        };
        expect(input.condition).toContain("&&");
      });

      it("should handle input with dynamic config", () => {
        const input: InputConfig = {
          prompt: "Enter user data:",
          variable: "user_input",
          type: "text",
          dynamic: {
            scope: "global",
            capture: {
              user_name: "value.name",
              user_email: "value.email",
            },
            computed: {
              display_name: "value.name + ' (' + value.email + ')'",
            },
            reevaluate: [
              {
                name: "computed_age",
                expression: "new Date().getFullYear() - value.birth_year",
                type: "computed",
                scope: "runtime",
              },
            ],
            exports: ["user_name", "user_email"],
            persist_to_global: true,
          },
        };
        expect(input.dynamic?.scope).toBe("global");
        expect(input.dynamic?.capture).toBeDefined();
        expect(input.dynamic?.computed).toBeDefined();
      });
    });

    describe("TestStep edge cases", () => {
      it("should handle step with all possible features", () => {
        const step: TestStep = {
          name: "Complex step",
          step_id: "complex-001",
          pre_request: {
            script: "const data = prepareData();",
          },
          request: {
            method: "POST",
            url: "/api/complex",
            headers: { "X-Custom": "value" },
            body: { data: "test" },
            timeout: 60000,
          },
          post_request: {
            script: "processResponse(response);",
          },
          delay: {
            min: 1000,
            max: 2000,
          },
          assert: {
            status_code: 201,
            body: { id: { exists: true } },
          },
          capture: {
            result_id: "body.id",
          },
          scenarios: [
            {
              condition: "body.success == true",
              then: { variables: { success: true } },
            },
          ],
          iterate: {
            range: "1..3",
            as: "attempt",
          },
          input: {
            prompt: "Confirm?",
            variable: "confirmed",
            type: "confirm",
          },
          call: {
            test: "./external.yaml",
            step: "external-step",
          },
          continue_on_failure: true,
          metadata: {
            priority: "critical",
            tags: ["complex", "integration"],
            timeout: 120000,
            retry: { max_attempts: 5, delay_ms: 2000 },
            depends_on: ["setup-1", "setup-2"],
            description: "Complex integration test",
          },
        };

        expect(step.name).toBe("Complex step");
        expect(step.pre_request).toBeDefined();
        expect(step.post_request).toBeDefined();
        expect(step.delay).toBeDefined();
        expect(step.assert).toBeDefined();
        expect(step.capture).toBeDefined();
        expect(step.scenarios).toBeDefined();
        expect(step.iterate).toBeDefined();
        expect(step.input).toBeDefined();
        expect(step.call).toBeDefined();
        expect(step.metadata?.retry?.max_attempts).toBe(5);
      });

      it("should handle step with only input (no request)", () => {
        const step: TestStep = {
          name: "Input only step",
          input: [
            {
              prompt: "Username:",
              variable: "username",
              type: "text",
            },
            {
              prompt: "Password:",
              variable: "password",
              type: "password",
            },
          ],
        };
        expect(step.request).toBeUndefined();
        expect(Array.isArray(step.input)).toBe(true);
      });

      it("should handle step with only call (no request)", () => {
        const step: TestStep = {
          name: "Call only step",
          call: {
            test: "./reusable-flow.yaml",
            step: "authentication",
            variables: {
              env: "test",
            },
          },
        };
        expect(step.request).toBeUndefined();
        expect(step.call).toBeDefined();
      });

      it("should handle step with empty metadata", () => {
        const step: TestStep = {
          name: "Test",
          request: { method: "GET", url: "/test" },
          metadata: {},
        };
        expect(step.metadata).toBeDefined();
        expect(Object.keys(step.metadata!)).toHaveLength(0);
      });
    });

    describe("FlowDependency edge cases", () => {
      it("should handle dependency with all optional properties", () => {
        const dependency: FlowDependency = {
          path: "./setup.yaml",
          path_type: "relative",
          required: true,
          cache: 600,
          condition: "environment == 'production' && feature_flag == true",
          variables: {
            test_mode: false,
            debug: false,
            env: "prod",
          },
          retry: {
            max_attempts: 5,
            delay_ms: 5000,
          },
        };

        expect(dependency.path).toBeDefined();
        expect(dependency.path_type).toBe("relative");
        expect(dependency.cache).toBe(600);
        expect(dependency.condition).toContain("&&");
        expect(dependency.retry?.max_attempts).toBe(5);
      });

      it("should handle dependency with node_id instead of path", () => {
        const dependency: FlowDependency = {
          node_id: "global-setup-node",
          required: true,
          cache: true,
        };
        expect(dependency.path).toBeUndefined();
        expect(dependency.node_id).toBeDefined();
      });

      it("should handle dependency with cache disabled", () => {
        const dependency: FlowDependency = {
          path: "./test.yaml",
          cache: false,
        };
        expect(dependency.cache).toBe(false);
      });

      it("should handle dependency with complex variables", () => {
        const dependency: FlowDependency = {
          path: "./flow.yaml",
          variables: {
            config: {
              api: {
                base_url: "https://api.example.com",
                timeout: 30000,
              },
              features: {
                auth: true,
                cache: false,
              },
            },
            test_data: [
              { id: 1, name: "Test 1" },
              { id: 2, name: "Test 2" },
            ],
          },
        };
        expect(dependency.variables?.config.api.base_url).toBeDefined();
        expect(Array.isArray(dependency.variables?.test_data)).toBe(true);
      });
    });

    describe("TestSuite edge cases", () => {
      it("should handle suite with empty steps array", () => {
        const suite: TestSuite = {
          node_id: "empty-suite",
          suite_name: "Empty Suite",
          steps: [],
        };
        expect(suite.steps).toHaveLength(0);
      });

      it("should handle suite with many dependencies", () => {
        const suite: TestSuite = {
          node_id: "complex-suite",
          suite_name: "Complex Suite",
          steps: [{ name: "Test", request: { method: "GET", url: "/test" } }],
          depends: [
            { path: "./setup-1.yaml", required: true },
            { path: "./setup-2.yaml", required: true },
            { path: "./setup-3.yaml", required: false },
            { node_id: "global-setup", cache: 3600 },
          ],
        };
        expect(suite.depends).toHaveLength(4);
      });

      it("should handle suite with interpolated base_url", () => {
        const suite: TestSuite = {
          node_id: "test",
          suite_name: "Test",
          base_url: "{{$env.API_BASE_URL}}/v{{api_version}}",
          steps: [],
        };
        expect(suite.base_url).toContain("{{");
      });

      it("should handle suite with complex variables", () => {
        const suite: TestSuite = {
          node_id: "test",
          suite_name: "Test",
          variables: {
            simple_string: "value",
            number: 42,
            boolean: true,
            null_value: null,
            array: [1, 2, 3],
            nested_object: {
              level1: {
                level2: {
                  value: "deep",
                },
              },
            },
            interpolated: "{{$env.VAR}}",
            faker: "{{$faker.internet.email}}",
            computed: "{{$js:Date.now()}}",
          },
          steps: [],
        };
        expect(suite.variables?.simple_string).toBe("value");
        expect(suite.variables?.nested_object.level1.level2.value).toBe("deep");
      });

      it("should handle suite with certificate config", () => {
        const suite: TestSuite = {
          node_id: "secure-test",
          suite_name: "Secure Test",
          base_url: "https://secure-api.example.com",
          certificate: {
            cert_path: "{{$env.CERT_PATH}}",
            key_path: "{{$env.KEY_PATH}}",
            passphrase: "{{$env.CERT_PASSWORD}}",
            ca_path: "./certs/ca.crt",
            verify: true,
            min_version: "TLSv1.2",
            max_version: "TLSv1.3",
          },
          steps: [],
        };
        expect(suite.certificate).toBeDefined();
        expect(suite.certificate?.verify).toBe(true);
      });
    });

    describe("ExecutionContext edge cases", () => {
      it("should handle context with empty variables", () => {
        const context: ExecutionContext = {
          suite: {
            node_id: "test",
            suite_name: "Test",
            steps: [],
          },
          global_variables: {},
          runtime_variables: {},
          step_index: 0,
          total_steps: 1,
          start_time: new Date(),
          execution_id: "exec_123",
        };
        expect(Object.keys(context.global_variables)).toHaveLength(0);
      });

      it("should handle context at final step", () => {
        const context: ExecutionContext = {
          suite: {
            node_id: "test",
            suite_name: "Test",
            steps: [],
          },
          global_variables: {},
          runtime_variables: {},
          step_index: 9,
          total_steps: 10,
          start_time: new Date(),
          execution_id: "exec_123",
        };
        expect(context.step_index).toBe(context.total_steps - 1);
      });

      it("should handle context with complex runtime variables", () => {
        const context: ExecutionContext = {
          suite: {
            node_id: "test",
            suite_name: "Test",
            steps: [],
          },
          global_variables: {},
          runtime_variables: {
            captured_response: {
              status: 200,
              headers: { "content-type": "application/json" },
              body: { data: [1, 2, 3] },
            },
            iteration_data: {
              index: 5,
              item: { id: 123 },
            },
          },
          step_index: 0,
          total_steps: 1,
          start_time: new Date(),
          execution_id: "exec_123",
        };
        expect(context.runtime_variables.captured_response.status).toBe(200);
      });
    });

    describe("ExecutionStats edge cases", () => {
      it("should handle stats with no tests", () => {
        const stats: ExecutionStats = {
          tests_discovered: 0,
          tests_completed: 0,
          tests_successful: 0,
          tests_failed: 0,
          tests_skipped: 0,
          requests_made: 0,
          total_response_time_ms: 0,
        };
        expect(stats.tests_discovered).toBe(0);
      });

      it("should handle stats with all tests failed", () => {
        const stats: ExecutionStats = {
          tests_discovered: 10,
          tests_completed: 10,
          tests_successful: 0,
          tests_failed: 10,
          tests_skipped: 0,
          requests_made: 50,
          total_response_time_ms: 25000,
        };
        expect(stats.tests_failed).toBe(stats.tests_discovered);
      });

      it("should handle stats with partial completion", () => {
        const stats: ExecutionStats = {
          tests_discovered: 20,
          tests_completed: 15,
          tests_successful: 12,
          tests_failed: 3,
          tests_skipped: 5,
          current_test: "Test #16",
          estimated_time_remaining_ms: 60000,
          requests_made: 200,
          total_response_time_ms: 45000,
        };
        expect(stats.tests_successful + stats.tests_failed).toBe(
          stats.tests_completed
        );
        expect(stats.tests_completed + stats.tests_skipped).toBeLessThanOrEqual(
          stats.tests_discovered
        );
      });

      it("should calculate average response time", () => {
        const stats: ExecutionStats = {
          tests_discovered: 10,
          tests_completed: 10,
          tests_successful: 10,
          tests_failed: 0,
          tests_skipped: 0,
          requests_made: 100,
          total_response_time_ms: 50000,
        };
        const avgResponseTime =
          stats.total_response_time_ms / stats.requests_made;
        expect(avgResponseTime).toBe(500);
      });
    });
  });

  describe("Type Guards and Utilities", () => {
    describe("Iteration type discrimination", () => {
      it("should identify array iteration", () => {
        const config: IterationConfig = {
          over: "{{items}}",
          as: "item",
        };
        const isArrayIteration = "over" in config;
        expect(isArrayIteration).toBe(true);
      });

      it("should identify range iteration", () => {
        const config: IterationConfig = {
          range: "1..10",
          as: "index",
        };
        const isRangeIteration = "range" in config;
        expect(isRangeIteration).toBe(true);
      });
    });

    describe("Input type discrimination", () => {
      it("should identify single input", () => {
        const step: TestStep = {
          name: "Test",
          input: { prompt: "Test", variable: "test", type: "text" },
        };
        const isSingleInput =
          step.input !== undefined && !Array.isArray(step.input);
        expect(isSingleInput).toBe(true);
      });

      it("should identify multiple inputs", () => {
        const step: TestStep = {
          name: "Test",
          input: [
            { prompt: "Test 1", variable: "test1", type: "text" },
            { prompt: "Test 2", variable: "test2", type: "text" },
          ],
        };
        const isMultipleInputs = Array.isArray(step.input);
        expect(isMultipleInputs).toBe(true);
      });
    });

    describe("Status code type discrimination", () => {
      it("should identify numeric status code", () => {
        const assertions: Assertions = {
          status_code: 200,
        };
        const isNumeric = typeof assertions.status_code === "number";
        expect(isNumeric).toBe(true);
      });

      it("should identify object status code assertion", () => {
        const assertions: Assertions = {
          status_code: { equals: 200 },
        };
        const isObject = typeof assertions.status_code === "object";
        expect(isObject).toBe(true);
      });
    });

    describe("Cache type discrimination", () => {
      it("should identify boolean cache", () => {
        const dep: FlowDependency = {
          path: "./test.yaml",
          cache: true,
        };
        const isBoolean = typeof dep.cache === "boolean";
        expect(isBoolean).toBe(true);
      });

      it("should identify numeric TTL cache", () => {
        const dep: FlowDependency = {
          path: "./test.yaml",
          cache: 300,
        };
        const isNumeric = typeof dep.cache === "number";
        expect(isNumeric).toBe(true);
      });
    });

    describe("Dependency reference type", () => {
      it("should identify path-based dependency", () => {
        const dep: FlowDependency = {
          path: "./test.yaml",
        };
        const hasPath = dep.path !== undefined;
        expect(hasPath).toBe(true);
      });

      it("should identify node_id-based dependency", () => {
        const dep: FlowDependency = {
          node_id: "test-node",
        };
        const hasNodeId = dep.node_id !== undefined;
        expect(hasNodeId).toBe(true);
      });
    });
  });

  describe("Real-world Integration Scenarios", () => {
    it("should model complete authentication flow", () => {
      const authSuite: TestSuite = {
        node_id: "auth-flow",
        suite_name: "Authentication Flow",
        base_url: "{{$env.API_BASE_URL}}",
        variables: {
          username: "{{$env.TEST_USERNAME}}",
          password: "{{$env.TEST_PASSWORD}}",
        },
        steps: [
          {
            name: "Login",
            request: {
              method: "POST",
              url: "/auth/login",
              body: {
                username: "{{username}}",
                password: "{{password}}",
              },
            },
            assert: {
              status_code: 200,
              body: {
                token: { exists: true, type: "string" },
                expires_at: { exists: true },
              },
            },
            capture: {
              auth_token: "body.token",
              user_id: "body.user.id",
            },
          },
          {
            name: "Validate token",
            request: {
              method: "GET",
              url: "/auth/validate",
              headers: {
                Authorization: "Bearer {{auth_token}}",
              },
            },
            assert: {
              status_code: 200,
              body: {
                valid: { equals: true },
              },
            },
          },
        ],
        exports: ["auth_token", "user_id"],
      };

      expect(authSuite.steps).toHaveLength(2);
      expect(authSuite.exports).toContain("auth_token");
    });

    it("should model paginated data retrieval", () => {
      const paginationSuite: TestSuite = {
        node_id: "pagination-test",
        suite_name: "Pagination Test",
        base_url: "https://api.example.com",
        steps: [
          {
            name: "Fetch page {{page}}",
            iterate: {
              range: "1..5",
              as: "page",
            },
            request: {
              method: "GET",
              url: "/items",
              params: {
                page: "{{page}}",
                limit: 20,
              },
            },
            assert: {
              status_code: 200,
              body: {
                items: {
                  type: "array",
                  length: { less_than: 21 },
                },
                page: { equals: "{{page}}" },
              },
            },
            capture: {
              "page_{{page}}_items": "body.items",
              "page_{{page}}_total": "body.total",
            },
          },
        ],
      };

      expect(paginationSuite.steps[0].iterate).toBeDefined();
      expect(paginationSuite.steps[0].capture).toBeDefined();
    });

    it("should model conditional testing based on environment", () => {
      const suite: TestSuite = {
        node_id: "conditional-env-test",
        suite_name: "Environment Conditional Test",
        steps: [
          {
            name: "Environment-specific endpoint",
            request: {
              method: "GET",
              url: "/status",
            },
            scenarios: [
              {
                name: "Production environment",
                condition: "{{$env.ENVIRONMENT}} == 'production'",
                then: {
                  assert: {
                    body: {
                      environment: { equals: "production" },
                      debug_mode: { equals: false },
                    },
                  },
                },
              },
              {
                name: "Development environment",
                condition: "{{$env.ENVIRONMENT}} == 'development'",
                then: {
                  assert: {
                    body: {
                      environment: { equals: "development" },
                      debug_mode: { exists: true },
                    },
                  },
                },
              },
            ],
          },
        ],
      };

      expect(suite.steps[0].scenarios).toHaveLength(2);
    });

    it("should model interactive testing with user confirmation", () => {
      const suite: TestSuite = {
        node_id: "interactive-delete",
        suite_name: "Interactive Delete Test",
        steps: [
          {
            name: "List items to delete",
            request: {
              method: "GET",
              url: "/items",
            },
            capture: {
              items_list: "body.items",
            },
          },
          {
            name: "Select item to delete",
            input: {
              prompt: "Select item to delete:",
              variable: "item_to_delete",
              type: "select",
              options: "{{items_list[*].{value: id, label: name}}}",
            },
          },
          {
            name: "Confirm deletion",
            input: {
              prompt:
                "Are you sure you want to delete item {{item_to_delete}}?",
              variable: "delete_confirmed",
              type: "confirm",
            },
          },
          {
            name: "Delete item",
            request: {
              method: "DELETE",
              url: "/items/{{item_to_delete}}",
            },
            scenarios: [
              {
                condition: "{{delete_confirmed}} == true",
                then: {
                  assert: {
                    status_code: 204,
                  },
                },
              },
            ],
          },
        ],
      };

      expect(suite.steps).toHaveLength(4);
      expect(suite.steps[1].input).toBeDefined();
      expect(suite.steps[2].input).toBeDefined();
    });

    it("should model multi-suite dependency chain", () => {
      const mainSuite: TestSuite = {
        node_id: "main-test",
        suite_name: "Main Test Suite",
        depends: [
          {
            path: "./database-setup.yaml",
            required: true,
            cache: true,
          },
          {
            path: "./auth-setup.yaml",
            required: true,
            cache: 600,
          },
          {
            path: "./test-data-seed.yaml",
            required: false,
          },
        ],
        steps: [
          {
            name: "Use dependencies",
            request: {
              method: "GET",
              url: "/api/users",
              headers: {
                Authorization: "Bearer {{auth-setup.auth_token}}",
              },
            },
            assert: {
              status_code: 200,
              body: {
                users: { type: "array" },
              },
            },
          },
        ],
      };

      expect(mainSuite.depends).toHaveLength(3);
      expect(mainSuite.depends?.[0].required).toBe(true);
      expect(mainSuite.depends?.[1].cache).toBe(600);
    });
  });
});
