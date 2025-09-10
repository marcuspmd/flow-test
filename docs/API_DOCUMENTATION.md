# Flow Test Engine v2.0 - API Documentation

## Overview

The Flow Test Engine v2.0 is a comprehensive API testing engine with support for directory-based execution, global variables, and priority-driven test management.

## Architecture

### Main Classes

#### `FlowTestEngine`
Main engine responsible for orchestrating the entire test execution process.

```typescript
const engine = new FlowTestEngine('./config.yaml');
const result = await engine.run();
```

**Main responsibilities:**
- Test discovery
- Filter application
- Priority sorting
- Coordinated execution
- Report generation

#### `ConfigManager`
Configuration manager that loads and validates all engine configurations.

```typescript
const configManager = new ConfigManager({
  config_file: './flow-test.config.yml',
  environment: 'staging',
  verbosity: 'verbose'
});
```

**Main responsibilities:**
- Configuration loading
- Environment variable resolution
- Runtime override application

#### `HttpService`
HTTP service responsible for executing requests and processing responses.

```typescript
const httpService = new HttpService('https://api.example.com', 30000);
const result = await httpService.executeRequest('Login', requestDetails);
```

**Main responsibilities:**
- HTTP request execution
- Performance measurement
- Error handling
- Response normalization

#### `AssertionService`
Service for validating assertions in HTTP responses.

```typescript
const assertionService = new AssertionService();
const results = assertionService.validateAssertions(assertions, executionResult);
```

**Main responsibilities:**
- Status code validation
- Header validation
- Body validation using JMESPath
- Response time validation

#### `CaptureService`
Service for capturing variables from HTTP responses using JMESPath.

```typescript
const captureService = new CaptureService();
const captured = captureService.captureVariables({
  user_id: 'body.data.user.id',
  token: 'body.access_token'
}, executionResult);
```

**Main responsibilities:**
- Data extraction using JMESPath
- Variable capture for later use
- Value formatting for logs

#### `VariableService`
Variable interpolation and resolution service.

```typescript
const variableService = new VariableService(variableContext);
const interpolated = variableService.interpolate('{{api_url}}/users/{{user_id}}');
```

**Main responsibilities:**
- Variable interpolation in templates
- Hierarchical scope resolution
- Support for dot notation for imported variables

#### `GlobalRegistryService`
Global registry service for variables exported between flows.

```typescript
const registry = new GlobalRegistryService();
registry.registerSuite('auth-suite', ['user_token', 'user_id'], './auth.yaml');
registry.setExportedVariable('auth-suite', 'user_token', 'abc123');
const token = registry.getExportedVariable('auth-suite.user_token');
```

**Main responsibilities:**
- Suite registration and their exports
- Variable sharing between suites
- Registry integrity validation

## Main Types

### `RequestDetails`
Defines a complete HTTP request.

```typescript
interface RequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}
```

### `Assertions`
Defines validations for an HTTP response.

```typescript
interface Assertions {
  status_code?: number | AssertionChecks;
  body?: Record<string, AssertionChecks>;
  headers?: Record<string, AssertionChecks>;
  response_time_ms?: {
    less_than?: number;
    greater_than?: number;
  };
  custom?: Array<{
    name: string;
    condition: string; // JMESPath expression
    message?: string;
  }>;
}
```

### `AssertionChecks`
Validation operators for specific fields.

```typescript
interface AssertionChecks {
  equals?: any;
  contains?: any;
  not_equals?: any;
  greater_than?: number;
  less_than?: number;
  regex?: string;
  exists?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  length?: {
    equals?: number;
    greater_than?: number;
    less_than?: number;
  };
}
```

### `VariableContext`
Hierarchical variable context.

```typescript
interface VariableContext {
  global: Record<string, any>;
  imported: Record<string, Record<string, any>>; // flow_name -> variables
  suite: Record<string, any>;
  runtime: Record<string, any>;
}
```

## Convenience Functions

### `createEngine(configPath?: string)`
Creates an engine instance with minimal configuration.

```typescript
const engine = createEngine('./my-config.yml');
const result = await engine.run();
```

### `runTests(configPath?: string)`
One-shot execution of all tests.

```typescript
const result = await runTests('./config.yml');
console.log(`Success rate: ${result.success_rate}%`);
```

### `planTests(configPath?: string)`
Dry-run for planning and configuration validation.

```typescript
const plan = await planTests('./config.yml');
console.log(`Found ${plan.total_tests} tests to execute`);
```

## Complete Usage Example

```typescript
import { FlowTestEngine, EngineExecutionOptions } from 'flow-test-engine';

// Advanced configuration with hooks
const options: EngineExecutionOptions = {
  config_file: './flow-test.config.yml',
  test_directory: './tests',
  environment: 'staging',
  verbosity: 'detailed',
  filters: {
    priorities: ['critical', 'high'],
    suite_names: ['auth', 'checkout']
  }
};

const hooks = {
  onExecutionStart: (stats) => {
    console.log(`🚀 Starting execution of ${stats.tests_discovered} test(s)`);
  },
  onTestDiscovered: (test) => {
    console.log(`📋 Discovered: ${test.suite_name} (${test.priority})`);
  },
  onExecutionEnd: (result) => {
    console.log(`✅ Completed with ${result.success_rate}% success rate`);
  },
  onError: (error) => {
    console.error(`❌ Error: ${error.message}`);
  }
};

// Create and execute engine
const engine = new FlowTestEngine(options, hooks);

try {
  const result = await engine.run();

  if (result.failed_tests > 0) {
    console.log(`❌ ${result.failed_tests} test(s) failed`);
    process.exit(1);
  }

  console.log(`✅ All tests passed! (${result.successful_tests}/${result.total_tests})`);
} catch (error) {
  console.error('Execution failed:', error);
  process.exit(1);
}
```

## CLI Usage

```bash
# Basic execution
flow-test

# With specific configuration file
flow-test -c ./config/prod.yml

# With filters
flow-test --priority high,critical --verbose

# Dry run to plan execution
flow-test --dry-run --detailed

# Silent execution for CI/CD
flow-test --environment production --silent
```

## Test File Structure

```yaml
suite_name: "Login Flow"
description: "User authentication tests"
base_url: "https://api.example.com"

variables:
  test_user: "user@example.com"
  test_password: "password123"

imports:
  - name: "common"
    path: "./common.yaml"
    variables:
      api_version: "v2"

steps:
  - name: "Login"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{test_user}}"
        password: "{{test_password}}"
    assert:
      status_code: 200
      body:
        success:
          equals: true
        token:
          type: string
          exists: true
    capture:
      auth_token: "body.token"
      user_id: "body.user.id"

  - name: "Verify Token"
    request:
      method: GET
      url: "/auth/verify"
      headers:
        Authorization: "Bearer {{auth_token}}"
    assert:
      status_code: 200
      body:
        valid:
          equals: true

exports:
  - auth_token
  - user_id
```

This documentation provides a complete view of the Flow Test Engine v2.0 API and architecture.
