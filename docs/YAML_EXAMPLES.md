# Flow Test - YAML Examples and Patterns

This document provides comprehensive examples of YAML test suite configurations for the Flow Test Engine, covering various testing scenarios and patterns.

Conventions used in examples:
- JMESPath expressions reference the response body with the `body.` prefix (e.g., `body.user.id`).
- Exported auth token variable is named `auth_token` and referenced via the suite alias when needed (e.g., `{{auth_flows_test.auth_token}}`).
- JavaScript in templates/captures: use `{{js: ...}}` for short expressions or `{{$js.return ...}}` for blocks that return a value.

## Table of Contents
- [Basic Test Suite](#basic-test-suite)
- [Authentication Flows](#authentication-flows)
- [API Testing Patterns](#api-testing-patterns)
- [Iteration Patterns](#iteration-patterns)
- [Data-Driven Testing](#data-driven-testing)
- [Error Handling](#error-handling)
- [Performance Testing](#performance-testing)
- [Integration Testing](#integration-testing)
- [Advanced Scenarios](#advanced-scenarios)
- [Swagger/OpenAPI Import](#swaggeropenapi-import)

## Basic Test Suite

### Simple API Test
```yaml
# File: tests/basic-api-test.yaml
suite_name: "Basic API Test"
base_url: "https://jsonplaceholder.typicode.com"

variables:
  user_id: 1

steps:
  - name: "Get user data"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        id: "{{user_id}}"
        name:
          contains: "Leanne"

    capture:
      user_email: "body.email"
      user_name: "body.name"

  - name: "Create new post"
    request:
      method: POST
      url: "/posts"
      headers:
        Content-Type: "application/json"
      body:
        title: "Test Post"
        body: "This is a test post by {{user_name}}"
        userId: "{{user_id}}"

    assert:
      status_code: 201
      body:
        id:
          greater_than: 100

    capture:
      post_id: "body.id"
```

## Authentication Flows

### JWT Token Authentication
```yaml
# File: tests/auth/jwt-auth-test.yaml
suite_name: "JWT Authentication Test"
base_url: "{{httpbin_url}}"

exports: ["auth_token", "user_id", "refresh_token"]

variables:
  username: "test@example.com"
  password: "secure_password"

steps:
  - name: "User Login"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{username}}"
        password: "{{password}}"

    assert:
      status_code: 200
      body:
        success: true
        token:
          regex: "^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$"

    capture:
      auth_token: "body.token"
      user_id: "body.user.id"
      refresh_token: "body.refresh_token"

  - name: "Verify Token"
    request:
      method: GET
      url: "/auth/verify"
      headers:
        Authorization: "Bearer {{auth_token}}"

    assert:
      status_code: 200
      body:
        valid: true
        user_id: "{{user_id}}"

  - name: "Refresh Token"
    request:
      method: POST
      url: "/auth/refresh"
      headers:
        Content-Type: "application/json"
      body:
        refresh_token: "{{refresh_token}}"

    assert:
      status_code: 200
      body:
        token:
          not_equals: "{{auth_token}}"

    capture:
      auth_token: "body.token"
```

### OAuth2 Flow
```yaml
# File: tests/auth/oauth2-test.yaml
suite_name: "OAuth2 Authentication Test"
base_url: "https://auth.example.com"

exports: ["access_token", "token_type", "expires_in"]

variables:
  client_id: "my-client-id"
  client_secret: "my-client-secret"
  grant_type: "client_credentials"

steps:
  - name: "Get Access Token"
    request:
      method: POST
      url: "/oauth2/token"
      headers:
        Content-Type: "application/x-www-form-urlencoded"
        Authorization: "Basic {{base64_encode(client_id + ':' + client_secret)}}"
      body:
        grant_type: "{{grant_type}}"
        scope: "read write"

    assert:
      status_code: 200
      body:
        access_token:
          regex: "^[A-Za-z0-9-_]+$"
        token_type: "Bearer"
        expires_in:
          greater_than: 300

    capture:
      access_token: "body.access_token"
      token_type: "body.token_type"
      expires_in: "body.expires_in"

  - name: "Use Access Token"
    request:
      method: GET
      url: "/get"  # httpbin.org endpoint
      headers:
        Authorization: "{{token_type}} {{access_token}}"

    assert:
      status_code: 200
```

## API Testing Patterns

### CRUD Operations
```yaml
# File: tests/crud-operations.yaml
suite_name: "CRUD Operations Test"
base_url: "{{httpbin_url}}"

# Use Global Registry instead of imports
# Reference variables from auth-flows-test.yaml via Global Registry
variables:
  test_user:
    name: "John Doe"
    email: "john.doe@example.com"
    role: "user"

steps:
  - name: "Create User"
    request:
      method: POST
      url: "/users"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"
        Content-Type: "application/json"
      body: "{{test_user}}"

    assert:
      status_code: 201
      body:
        id:
          greater_than: 0
        email: "{{test_user.email}}"

    capture:
      created_user_id: "body.id"

  - name: "Read User"
    request:
      method: GET
      url: "/users/{{created_user_id}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"

    assert:
      status_code: 200
      body:
        id: "{{created_user_id}}"
        name: "{{test_user.name}}"
        email: "{{test_user.email}}"

  - name: "Update User"
    request:
      method: PUT
      url: "/users/{{created_user_id}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"
        Content-Type: "application/json"
      body:
        name: "John Smith"
        email: "{{test_user.email}}"
        role: "admin"

    assert:
      status_code: 200
      body:
        name: "John Smith"
        role: "admin"

  - name: "Delete User"
    request:
      method: DELETE
      url: "/users/{{created_user_id}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"

    assert:
      status_code: 204

  - name: "Verify Deletion"
    request:
      method: GET
      url: "/users/{{created_user_id}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"

    assert:
      status_code: 404
```

### File Upload and Download
```yaml
# File: tests/file-operations.yaml
suite_name: "File Operations Test"
base_url: "{{httpbin_url}}"

# Use Global Registry instead of imports
# Reference variables from auth-flows-test.yaml via Global Registry
variables:
  test_file:
    name: "test-document.pdf"
    size: 1024000
    type: "application/pdf"

steps:
  - name: "Upload File"
    request:
      method: POST
      url: "/files/upload"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"
        Content-Type: "multipart/form-data"
      body:
        file: "@test-document.pdf"
        metadata: "{{test_file}}"

    assert:
      status_code: 201
      body:
        file_id:
          regex: "^FILE-[0-9]+$"
        upload_url:
          regex: "^https://.*"

    capture:
      file_id: "body.file_id"
      download_url: "body.upload_url"

  - name: "Get File Metadata"
    request:
      method: GET
      url: "/files/{{file_id}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"

    assert:
      status_code: 200
      body:
        id: "{{file_id}}"
        name: "{{test_file.name}}"
        size: "{{test_file.size}}"

  - name: "Download File"
    request:
      method: GET
      url: "{{download_url}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"

    assert:
      status_code: 200
      headers:
        content-type: "{{test_file.type}}"
        content-length:
          equals: "{{test_file.size}}"

  - name: "Delete File"
    request:
      method: DELETE
      url: "/files/{{file_id}}"
      headers:
        Authorization: "Bearer {{auth_flows_test.auth_token}}"

    assert:
      status_code: 204
```

## Iteration Patterns

Iteration patterns allow you to eliminate repetitive YAML code by iterating over arrays or ranges. This powerful feature makes tests more maintainable and concise.

### Array Iteration

```yaml
# File: tests/array-iteration-example.yaml
suite_name: "Array Iteration Example"
base_url: "{{httpbin_url}}"

exports: ["users_tested", "creation_summary"]

variables:
  test_users:
    - id: 1
      name: "Alice Smith"
      email: "alice@example.com"
      role: "admin"
    - id: 2
      name: "Bob Johnson"
      email: "bob@example.com"
      role: "user"
    - id: 3
      name: "Charlie Brown"
      email: "charlie@example.com"
      role: "moderator"

steps:
  # Instead of writing 3 separate steps, use iteration
  - name: "Create user {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
        X-Test-Type: "user-creation"
      body:
        user_id: "{{item.id}}"
        name: "{{item.name}}"
        email: "{{item.email}}"
        role: "{{item.role}}"
        created_at: "{{$js.return new Date().toISOString()}}"

    assert:
      status_code: 200
      body:
        json.user_id:
          equals: "{{item.id}}"
        json.name:
          equals: "{{item.name}}"
        json.email:
          equals: "{{item.email}}"

    capture:
      created_user_id: "body.json.user_id"
      user_creation_timestamp: "body.json.created_at"

  # Summary step after iteration
  - name: "Generate user creation summary"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
      body:
        test_summary:
          users_created: 3
          total_iterations: "{{test_users.length}}"
          test_completed_at: "{{$js.return new Date().toISOString()}}"

    assert:
      status_code: 200

    capture:
      users_tested: "body.json.test_summary.users_created"
      creation_summary: "body.json.test_summary"
```

### Range Iteration

```yaml
# File: tests/range-iteration-example.yaml
suite_name: "Range Iteration Example"
base_url: "{{httpbin_url}}"

exports: ["load_test_results", "performance_metrics"]

variables:
  load_test_config:
    iterations: 10
    delay_ms: 100
    endpoint: "/get"

steps:
  # Range iteration for load testing
  - name: "Load test iteration {{index}}"
    iterate:
      range: "1..10"
      as: "index"
    request:
      method: GET
      url: "{{load_test_config.endpoint}}"
      headers:
        X-Load-Test: "true"
        X-Iteration: "{{index}}"
        X-Test-Batch: "range-iteration"
      params:
        iteration: "{{index}}"
        timestamp: "{{$js.return Date.now()}}"
        test_id: "LOAD_TEST_{{index}}"

    assert:
      status_code: 200
      body:
        args.iteration:
          equals: "{{index}}"
      response_time_ms:
        less_than: 2000

    capture:
      iteration_response_time: "response_time_ms"
      iteration_timestamp: "body.args.timestamp"

  # Performance analysis after iterations
  - name: "Analyze load test performance"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
      body:
        analysis:
          total_iterations: 10
          test_type: "load_test"
          completed_at: "{{$js.return new Date().toISOString()}}"
          performance_data:
            average_response_time: "{{$js.return Math.round(Math.random() * 100 + 50)}}"
            max_iterations: 10

    assert:
      status_code: 200

    capture:
      load_test_results: "body.json.analysis"
      performance_metrics: "body.json.analysis.performance_data"
```

### Nested Array Iteration

```yaml
# File: tests/nested-iteration-example.yaml
suite_name: "Nested Array Iteration"
base_url: "{{httpbin_url}}"

variables:
  test_scenarios:
    - scenario_name: "user_registration"
      test_cases:
        - name: "Valid User 1"
          email: "user1@example.com"
          expected_status: 201
        - name: "Valid User 2"
          email: "user2@example.com"
          expected_status: 201
    - scenario_name: "error_handling"
      test_cases:
        - name: "Invalid Email"
          email: "invalid-email"
          expected_status: 400
        - name: "Missing Data"
          email: ""
          expected_status: 400

steps:
  # Iterate through test cases in first scenario
  - name: "Test {{item.name}} in user registration"
    iterate:
      over: "{{test_scenarios[0].test_cases}}"
      as: "item"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
        X-Scenario: "{{test_scenarios[0].scenario_name}}"
      body:
        name: "{{item.name}}"
        email: "{{item.email}}"
        test_type: "registration"

    assert:
      status_code: "{{item.expected_status}}"

    scenarios:
      - condition: "status_code == `201`"
        then:
          capture:
            successful_registration: "body"
            user_created: "true"

      - condition: "status_code >= `400`"
        then:
          capture:
            registration_error: "body"
            error_handled: "true"

  # Iterate through error test cases
  - name: "Test {{item.name}} in error handling"
    iterate:
      over: "{{test_scenarios[1].test_cases}}"
      as: "item"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
        X-Scenario: "{{test_scenarios[1].scenario_name}}"
      body:
        name: "{{item.name}}"
        email: "{{item.email}}"
        test_type: "error_validation"

    assert:
      status_code: "{{item.expected_status}}"

    capture:
      validation_result: "body"
```

### Combined Array and Range Iteration

```yaml
# File: tests/combined-iteration-example.yaml
suite_name: "Combined Iteration Patterns"
base_url: "{{httpbin_url}}"

variables:
  api_endpoints:
    - path: "/get"
      method: "GET"
      description: "Get endpoint"
    - path: "/post"
      method: "POST"
      description: "Post endpoint"
    - path: "/put"
      method: "PUT"
      description: "Put endpoint"

steps:
  # First: Array iteration over endpoints
  - name: "Test {{item.description}} endpoint"
    iterate:
      over: "{{api_endpoints}}"
      as: "item"
    request:
      method: "{{item.method}}"
      url: "{{item.path}}"
      headers:
        Accept: "application/json"
        X-Test-Endpoint: "{{item.path}}"
      body:
        endpoint: "{{item.path}}"
        method: "{{item.method}}"
        description: "{{item.description}}"

    assert:
      status_code: 200

    capture:
      endpoint_response: "body"
      endpoint_tested: "{{item.path}}"

  # Then: Range iteration for stress testing
  - name: "Stress test iteration {{index}}"
    iterate:
      range: "1..5"
      as: "index"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
        X-Stress-Test: "true"
        X-Iteration: "{{index}}"
      body:
        stress_test:
          iteration: "{{index}}"
          timestamp: "{{$js.return Date.now()}}"
          random_data: "{{$js.return 'data_' + Math.random().toString(36).substr(2, 9)}}"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 1000

    capture:
      stress_iteration_time: "response_time_ms"
      stress_data: "body"
```

### Iteration with Variable Capture and Reuse

```yaml
# File: tests/iteration-variable-reuse.yaml
suite_name: "Iteration with Variable Reuse"
base_url: "{{httpbin_url}}"

exports: ["created_users", "user_summary"]

variables:
  user_templates:
    - template_name: "admin_template"
      base_role: "admin"
      permissions: ["read", "write", "delete"]
    - template_name: "user_template"
      base_role: "user"
      permissions: ["read"]
    - template_name: "guest_template"
      base_role: "guest"
      permissions: []

steps:
  # Create users based on templates
  - name: "Create user from {{item.template_name}}"
    iterate:
      over: "{{user_templates}}"
      as: "item"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
      body:
        user_data:
          template: "{{item.template_name}}"
          role: "{{item.base_role}}"
          permissions: "{{item.permissions}}"
          created_at: "{{$js.return new Date().toISOString()}}"
          unique_id: "USER_{{$js.return Math.random().toString(36).substr(2, 9)}}"

    assert:
      status_code: 200

    capture:
      created_user: "body.json.user_data"
      user_id: "body.json.user_data.unique_id"
      template_used: "{{item.template_name}}"

  # Verify each created user with range iteration
  - name: "Verify user access level {{index}}"
    iterate:
      range: "1..3"  # Match number of templates
      as: "index"
    request:
      method: GET
      url: "/get"
      params:
        user_check: "{{index}}"
        verification_type: "access_level"
        timestamp: "{{$js.return Date.now()}}"

    assert:
      status_code: 200

    capture:
      verification_result: "body.args"
      check_iteration: "{{index}}"

  # Summary of all iterations
  - name: "Generate iteration summary"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
      body:
        summary:
          total_templates_processed: "{{user_templates.length}}"
          total_verifications: 3
          test_completed_at: "{{$js.return new Date().toISOString()}}"
          iteration_types: ["array", "range"]

    assert:
      status_code: 200

    capture:
      created_users: "{{user_templates.length}}"
      user_summary: "body.json.summary"
```

### Benefits of Iteration Patterns

#### Before Iteration (Repetitive)
```yaml
# ❌ Repetitive approach
steps:
  - name: "Test user Alice"
    request:
      method: POST
      body: { name: "Alice", email: "alice@example.com", role: "admin" }
    assert:
      status_code: 201
    capture:
      alice_id: "body.id"

  - name: "Test user Bob"
    request:
      method: POST
      body: { name: "Bob", email: "bob@example.com", role: "user" }
    assert:
      status_code: 201
    capture:
      bob_id: "body.id"

  - name: "Test user Charlie"
    request:
      method: POST
      body: { name: "Charlie", email: "charlie@example.com", role: "moderator" }
    assert:
      status_code: 201
    capture:
      charlie_id: "body.id"
```

#### After Iteration (Concise)
```yaml
# ✅ Clean iteration approach
variables:
  test_users:
    - { name: "Alice", email: "alice@example.com", role: "admin" }
    - { name: "Bob", email: "bob@example.com", role: "user" }
    - { name: "Charlie", email: "charlie@example.com", role: "moderator" }

steps:
  - name: "Test user {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      body:
        name: "{{item.name}}"
        email: "{{item.email}}"
        role: "{{item.role}}"
    assert:
      status_code: 201
    capture:
      user_id: "body.id"
```

### Key Advantages

1. **Code Reduction**: Eliminate repetitive YAML blocks
2. **Maintainability**: Single definition for multiple test cases
3. **Scalability**: Easy to add/remove test data without changing steps
4. **Dynamic Variables**: Access iteration context (index, isFirst, isLast)
5. **Variable Isolation**: Each iteration has its own variable scope
6. **Performance**: Range iterations for load testing scenarios

## Data-Driven Testing

### Multiple Test Cases
```yaml
# File: tests/data-driven-registration.yaml
suite_name: "Data Driven User Registration"
base_url: "{{httpbin_url}}"

variables:
  test_cases:
    - id: "valid_user"
      name: "Valid User"
      email: "john.doe@example.com"
      password: "SecurePass123!"
      expected_status: 201
      expected_success: true
    - id: "invalid_email"
      name: "Invalid Email"
      email: "invalid-email"
      password: "SecurePass123!"
      expected_status: 400
      expected_success: false
    - id: "weak_password"
      name: "Weak Password"
      email: "jane.doe@example.com"
      password: "123"
      expected_status: 400
      expected_success: false
    - id: "existing_email"
      name: "Existing Email"
      email: "existing@example.com"
      password: "SecurePass123!"
      expected_status: 409
      expected_success: false

steps:
  - name: "Register User - {{test_cases[0].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{test_cases[0].name}}"
        email: "{{test_cases[0].email}}"
        password: "{{test_cases[0].password}}"

    assert:
      status_code: "{{test_cases[0].expected_status}}"

    scenarios:
      - condition: "status_code == `201`"
        then:
          capture:
            user_id: "body.user_id"
            registration_token: "body.token"

      - condition: "status_code >= `400`"
        then:
          capture:
            error_message: "body.message"
            error_code: "body.error_code"

  - name: "Register User - {{test_cases[1].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{test_cases[1].name}}"
        email: "{{test_cases[1].email}}"
        password: "{{test_cases[1].password}}"

    assert:
      status_code: "{{test_cases[1].expected_status}}"
      body:
        message:
          contains: "invalid email"

  - name: "Register User - {{test_cases[2].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{test_cases[2].name}}"
        email: "{{test_cases[2].email}}"
        password: "{{test_cases[2].password}}"

    assert:
      status_code: "{{test_cases[2].expected_status}}"
      body:
        message:
          contains: "password too weak"

  - name: "Register User - {{test_cases[3].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{test_cases[3].name}}"
        email: "{{test_cases[3].email}}"
        password: "{{test_cases[3].password}}"

    assert:
      status_code: "{{test_cases[3].expected_status}}"
      body:
        message:
          contains: "already exists"
```

### Environment-Based Testing
```yaml
# File: tests/environment-based-test.yaml
suite_name: "Environment Based Testing"
base_url: "{{api_base_url}}"

variables:
  environments:
    development:
      api_base_url: "{{httpbin_url}}"
      test_user: "dev-user@example.com"
      expected_response_time: 2000
    staging:
      api_base_url: "{{httpbin_url}}"
      test_user: "staging-user@example.com"
      expected_response_time: 1000
    production:
      api_base_url: "{{httpbin_url}}"
      test_user: "prod-user@example.com"
      expected_response_time: 500

steps:
  - name: "Health Check - {{environment}}"
    request:
      method: GET
      url: "/health"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: "{{environments[environment].expected_response_time}}"
      body:
        status: "healthy"
        environment: "{{environment}}"

  - name: "User Authentication - {{environment}}"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{environments[environment].test_user}}"
        password: "test_password"

    assert:
      status_code: 200
      body:
        success: true
        environment: "{{environment}}"

    capture:
      auth_token: "body.token"
```

## Error Handling

### Circuit Breaker Pattern
```yaml
# File: tests/circuit-breaker-test.yaml
suite_name: "Circuit Breaker Test"
base_url: "https://api.unreliable.com"

variables:
  max_retries: 3
  retry_delay: 1000
  circuit_open_threshold: 5
  circuit_timeout: 30000

steps:
  - name: "Test Circuit Breaker Pattern"
    request:
      method: GET
      url: "/unstable-endpoint"
      headers:
        Accept: "application/json"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body:
              data:
                not_equals: null
          capture:
            response_data: "body.data"
            circuit_status: "`closed`"

      - condition: "status_code >= `500`"
        then:
          assert:
            status_code:
              greater_than: 499
          capture:
            error_code: "status_code"
            circuit_status: "`open`"
            retry_after: "headers.retry-after || '60'"

  - name: "Graceful Degradation"
    request:
      method: GET
      url: "/fallback-endpoint"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        fallback_mode: true
        limited_data: true

    capture:
      fallback_data: "body.data"

  - name: "Recovery Test"
    request:
      method: POST
      url: "/recovery-test"
      headers:
        Content-Type: "application/json"
      body:
        previous_error: "{{error_code}}"
        fallback_data: "{{fallback_data}}"
        circuit_status: "{{circuit_status}}"

    assert:
      status_code: 200
      body:
        recovery_successful: true
```

### Timeout and Retry Handling
```yaml
# File: tests/timeout-retry-test.yaml
suite_name: "Timeout and Retry Test"
base_url: "https://api.slow.com"

variables:
  timeout_scenarios:
    - name: "fast_response"
      endpoint: "/fast"
      timeout: 1000
      expected_status: 200
    - name: "slow_response"
      endpoint: "/slow"
      timeout: 5000
      expected_status: 200
    - name: "timeout_response"
      endpoint: "/timeout"
      timeout: 1000
      expected_status: 408

steps:
  - name: "Test Fast Response"
    request:
      method: GET
      url: "{{timeout_scenarios[0].endpoint}}"
      headers:
        Accept: "application/json"

    assert:
      status_code: "{{timeout_scenarios[0].expected_status}}"
      response_time_ms:
        less_than: "{{timeout_scenarios[0].timeout}}"

  - name: "Test Slow Response"
    request:
      method: GET
      url: "{{timeout_scenarios[1].endpoint}}"
      headers:
        Accept: "application/json"

    assert:
      status_code: "{{timeout_scenarios[1].expected_status}}"
      response_time_ms:
        less_than: "{{timeout_scenarios[1].timeout}}"

  - name: "Test Timeout Handling"
    request:
      method: GET
      url: "{{timeout_scenarios[2].endpoint}}"
      headers:
        Accept: "application/json"

    scenarios:
      - condition: "status_code == `408`"
        then:
          assert:
            body:
              error: "Request timeout"
          capture:
            timeout_error: "body.error"
            suggested_retry_after: "body.retry_after"

      - condition: "status_code == `200`"
        then:
          capture:
            timeout_handled: "`false`"
```

## Performance Testing

### Response Time Validation
```yaml
# File: tests/performance-test.yaml
suite_name: "API Performance Test"
base_url: "https://api.performance.com"

variables:
  performance_thresholds:
    health_check: 100
    user_query: 500
    file_upload: 2000
    report_generation: 10000

steps:
  - name: "Health Check Performance"
    request:
      method: GET
      url: "/health"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: "{{performance_thresholds.health_check}}"
      body:
        status: "healthy"

  - name: "Database Query Performance"
    request:
      method: GET
      url: "/users?limit=100&page=1"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: "{{performance_thresholds.user_query}}"
      body:
        data:
          length: 100

    capture:
      query_time: "response_time_ms"

  - name: "File Upload Performance"
    request:
      method: POST
      url: "/files/upload"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Content-Type: "multipart/form-data"
      body:
        file: "@performance-test-1MB.jpg"
        metadata:
          name: "performance_test.jpg"
          size: 1048576

    assert:
      status_code: 201
      response_time_ms:
        less_than: "{{performance_thresholds.file_upload}}"
      body:
        upload_id:
          regex: "^UPLOAD-[0-9]+$"

    capture:
      upload_time: "response_time_ms"
      file_url: "body.url"

  - name: "Report Generation Performance"
    request:
      method: POST
      url: "/reports/generate"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Content-Type: "application/json"
      body:
        type: "user_activity"
        date_range:
          start: "2024-01-01"
          end: "2024-01-31"
        format: "pdf"

    assert:
      status_code: 202
      response_time_ms:
        less_than: "{{performance_thresholds.report_generation}}"
      body:
        report_id:
          regex: "^REPORT-[0-9]+$"
        status: "processing"

    capture:
      report_id: "body.report_id"
```

### Load Testing Simulation
```yaml
# File: tests/load-test-simulation.yaml
suite_name: "Load Test Simulation"
base_url: "https://api.loadtest.com"

variables:
  concurrent_users: 10
  test_duration: 60
  request_interval: 100

steps:
  - name: "Warm-up Phase"
    request:
      method: GET
      url: "/health"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 200

  - name: "Load Test - User Creation"
    request:
      method: POST
      url: "/users"
      headers:
        Content-Type: "application/json"
      body:
        name: "Load Test User {{random_int(1, 1000)}}"
        email: "loadtest{{random_int(1, 1000)}}@example.com"

    assert:
      status_code: 201
      response_time_ms:
        less_than: 1000

    capture:
      user_id: "body.id"
      creation_time: "response_time_ms"

  - name: "Load Test - Data Retrieval"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 500
      body:
        id: "{{user_id}}"

    capture:
      retrieval_time: "response_time_ms"

  - name: "Load Test - Update Operation"
    request:
      method: PUT
      url: "/users/{{user_id}}"
      headers:
        Content-Type: "application/json"
      body:
        name: "Updated Load Test User {{random_int(1, 1000)}}"
        status: "active"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 800

    capture:
      update_time: "response_time_ms"

  - name: "Performance Summary"
    request:
      method: POST
      url: "/metrics/log"
      headers:
        Content-Type: "application/json"
      body:
        test_type: "load_test"
        metrics:
          creation_time: "{{creation_time}}"
          retrieval_time: "{{retrieval_time}}"
          update_time: "{{update_time}}"
          total_time: "{{creation_time + retrieval_time + update_time}}"

    assert:
      status_code: 200
```

## Integration Testing

### Microservices Integration
```yaml
# File: tests/microservices-integration.yaml
suite_name: "Microservices Integration Test"
base_url: "{{httpbin_url}}"

# Use Global Registry - reference exported variables from other test nodes
# Example: {{auth_flows_test.jwt_token}}, {{user_service.user_id}}, etc.

variables:
  test_scenario: "complete_purchase_flow"

steps:
  - name: "Initialize Test Scenario"
    request:
      method: POST
      url: "/test/initialize"
      headers:
        Content-Type: "application/json"
      body:
        scenario: "{{test_scenario}}"
        services: ["auth", "user", "order", "payment"]

    assert:
      status_code: 200
      body:
        scenario_id:
          regex: "^SCENARIO-[0-9]+$"

    capture:
      scenario_id: "body.scenario_id"

  - name: "User Registration and Authentication"
    request:
      method: POST
      url: "/users"
      headers:
        Content-Type: "application/json"
      body:
        name: "Integration Test User"
        email: "integration@example.com"
        password: "secure_password"

    assert:
      status_code: 201

    capture:
      user_id: "body.id"

  - name: "User Authentication"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        email: "integration@example.com"
        password: "secure_password"

    assert:
      status_code: 200

    capture:
      auth_token: "body.token"

  - name: "Create Order"
    request:
      method: POST
      url: "/orders"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Content-Type: "application/json"
      body:
        user_id: "{{user_id}}"
        items: [
          { product_id: "PROD-001", quantity: 2, price: 29.99 },
          { product_id: "PROD-002", quantity: 1, price: 49.99 }
        ]
        total_amount: 109.97

    assert:
      status_code: 201
      body:
        order_id:
          regex: "^ORDER-[0-9]+$"
        status: "pending"

    capture:
      order_id: "body.order_id"

  - name: "Process Payment"
    request:
      method: POST
      url: "/payments"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Content-Type: "application/json"
      body:
        order_id: "{{order_id}}"
        amount: 109.97
        payment_method: "credit_card"
        card_details:
          number: "4111111111111111"
          expiry: "12/25"
          cvv: "123"

    assert:
      status_code: 200
      body:
        payment_id:
          regex: "^PAYMENT-[0-9]+$"
        status: "approved"

    capture:
      payment_id: "body.payment_id"

  - name: "Verify Order Status Update"
    request:
      method: GET
      url: "/orders/{{order_id}}"
      headers:
        Authorization: "Bearer {{auth_token}}"

    assert:
      status_code: 200
      body:
        status: "paid"
        payment_id: "{{payment_id}}"

  - name: "Complete Integration Test"
    request:
      method: POST
      url: "/test/complete"
      headers:
        Content-Type: "application/json"
      body:
        scenario_id: "{{scenario_id}}"
        result: "success"
        services_tested: ["auth", "user", "order", "payment"]

    assert:
      status_code: 200
      body:
        test_result: "passed"
```

## Advanced Scenarios

### Conditional Logic with Complex Scenarios
```yaml
# File: tests/complex-scenarios.yaml
suite_name: "Complex Conditional Scenarios"
base_url: "https://api.complex.com"

variables:
  user_types: ["guest", "registered", "premium", "admin"]
  test_matrix:
    - user_type: "guest"
      expected_features: ["basic_search"]
      expected_limits: { requests_per_hour: 10 }
    - user_type: "registered"
      expected_features: ["basic_search", "save_searches"]
      expected_limits: { requests_per_hour: 100 }
    - user_type: "premium"
      expected_features: ["basic_search", "save_searches", "advanced_filters", "export_data"]
      expected_limits: { requests_per_hour: 1000 }
    - user_type: "admin"
      expected_features: ["all"]
      expected_limits: { requests_per_hour: -1 }

steps:
  - name: "Test Guest User Access"
    request:
      method: GET
      url: "/api/features"
      headers:
        Accept: "application/json"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body:
              available_features:
                contains: "basic_search"
              limits:
                requests_per_hour:
                  equals: "{{test_matrix[0].expected_limits.requests_per_hour}}"
          capture:
            guest_features: "body.available_features"
            guest_limits: "body.limits"

      - condition: "status_code == `401`"
        then:
          capture:
            auth_required: "`true`"

  - name: "Test Registered User Access"
    request:
      method: GET
      url: "/api/features"
      headers:
        Authorization: "Bearer {{registered_user_token}}"
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        available_features:
          length:
            greater_than: "{{guest_features | length}}"
        limits:
          requests_per_hour:
            greater_than: "{{guest_limits.requests_per_hour}}"

    capture:
      registered_features: "body.available_features"
      registered_limits: "body.limits"

  - name: "Test Premium User Features"
    request:
      method: GET
      url: "/api/advanced/search"
      headers:
        Authorization: "Bearer {{premium_user_token}}"
        Accept: "application/json"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body:
              advanced_filters_available: true
              export_formats:
                contains: "csv"
                contains: "json"
          capture:
            premium_features: "`true`"

      - condition: "status_code == `403`"
        then:
          capture:
            premium_upgrade_required: "`true`"

  - name: "Test Admin Capabilities"
    request:
      method: GET
      url: "/api/admin/dashboard"
      headers:
        Authorization: "Bearer {{admin_token}}"
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        admin_panels:
          contains: "user_management"
          contains: "system_monitoring"
        unlimited_access: true

    capture:
      admin_capabilities: "body.admin_panels"

  - name: "Cross-User-Type Validation"
    request:
      method: POST
      url: "/api/validate-access-matrix"
      headers:
        Content-Type: "application/json"
      body:
        test_results:
          guest: "{{guest_features}}"
          registered: "{{registered_features}}"
          premium: "{{premium_features}}"
          admin: "{{admin_capabilities}}"

    assert:
      status_code: 200
      body:
        validation_result: "passed"
        access_matrix_correct: true
```

### Dynamic Test Generation
```yaml
# File: tests/dynamic-test-generation.yaml
suite_name: "Dynamic Test Generation"
base_url: "https://api.dynamic.com"

variables:
  api_endpoints:
    - path: "/users"
      method: "GET"
      description: "List users"
    - path: "/users"
      method: "POST"
      description: "Create user"
    - path: "/users/{id}"
      method: "GET"
      description: "Get user by ID"
    - path: "/users/{id}"
      method: "PUT"
      description: "Update user"
    - path: "/users/{id}"
      method: "DELETE"
      description: "Delete user"

  test_data_generator:
    users:
      - id: 1
        name: "Alice Johnson"
        email: "alice@example.com"
      - id: 2
        name: "Bob Smith"
        email: "bob@example.com"
      - id: 3
        name: "Carol Williams"
        email: "carol@example.com"

steps:
  - name: "Discover API Endpoints"
    request:
      method: GET
      url: "/api/docs"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        endpoints:
          length:
            greater_than: 0

    capture:
      discovered_endpoints: "body.endpoints"

  - name: "Generate Test Cases"
    request:
      method: POST
      url: "/test/generate"
      headers:
        Content-Type: "application/json"
      body:
        endpoints: "{{discovered_endpoints}}"
        test_data: "{{test_data_generator}}"
        coverage: "full"

    assert:
      status_code: 200
      body:
        generated_tests:
          length:
            greater_than: 0

    capture:
      generated_test_cases: "body.generated_tests"

  - name: "Execute Generated Tests"
    request:
      method: POST
      url: "/test/execute"
      headers:
        Content-Type: "application/json"
      body:
        test_cases: "{{generated_test_cases}}"
        parallel_execution: true
        max_concurrency: 5

    assert:
      status_code: 200
      body:
        execution_result: "completed"
        passed_tests:
          greater_than: 0

    capture:
      execution_results: "body.results"
      test_coverage: "body.coverage_percentage"

  - name: "Validate Test Results"
    request:
      method: POST
      url: "/test/validate"
      headers:
        Content-Type: "application/json"
      body:
        results: "{{execution_results}}"
        expected_coverage: 95

    assert:
      status_code: 200
      body:
        validation_status: "passed"
        coverage_achieved:
          greater_than: 90

    capture:
      validation_report: "body.report"
```

## Swagger/OpenAPI Import

### Importing from OpenAPI Specification

The Flow Test Engine can automatically generate test suites from OpenAPI/Swagger specifications:

```bash
# Import OpenAPI spec and generate tests
node dist/cli.js --import-swagger api.json

# Import with custom output directory
node dist/cli.js --import-swagger api.yaml --swagger-output ./tests/api

# Import Swagger 2.0 specification
node dist/cli.js --import-swagger swagger.json --swagger-output ./tests/legacy-api
```

### Generated Test Structure

When importing from an OpenAPI specification, the engine generates comprehensive test suites:

```yaml
# Generated automatically from OpenAPI spec
suite_name: "petstore-api"
description: "Testes importados de Swagger Petstore v1.0.0"
base_url: "https://petstore.swagger.io/v2"

variables:
  # Auto-generated variables from API parameters
  petId: "{{faker.uuid}}"
  status: "available"
  userId: "{{faker.uuid}}"
  api_key: "{{API_KEY}}"

steps:
  - name: "get_pet_by_id"
    description: "Find pet by ID"
    http:
      method: GET
      url: "/pet/{{petId}}"
      headers:
        api_key: "{{api_key}}"

    assertions:
      - field: "status"
        operator: "equals"
        expected: 200

    capture:
      pet_name: "body.name"
      pet_status: "body.status"

  - name: "post_pet"
    description: "Add a new pet to the store"
    http:
      method: POST
      url: "/pet"
      headers:
        Content-Type: "application/json"
        api_key: "{{api_key}}"
      body:
        name: "{{faker.pet_name}}"
        category:
          id: "{{faker.number}}"
          name: "{{faker.word}}"
        photoUrls:
          - "{{faker.image_url}}"
        tags:
          - id: "{{faker.number}}"
            name: "{{faker.word}}"
        status: "{{status}}"

    assertions:
      - field: "status"
        operator: "equals"
        expected: 200

    capture:
      resource_id: "body.id"

  - name: "put_pet"
    description: "Update an existing pet"
    http:
      method: PUT
      url: "/pet"
      headers:
        Content-Type: "application/json"
        api_key: "{{api_key}}"
      body:
        id: "{{resource_id}}"
        name: "{{faker.pet_name}}"
        status: "sold"

    assertions:
      - field: "status"
        operator: "equals"
        expected: 200

  - name: "delete_pet"
    description: "Deletes a pet"
    http:
      method: DELETE
      url: "/pet/{{resource_id}}"
      headers:
        api_key: "{{api_key}}"

    assertions:
      - field: "status"
        operator: "equals"
        expected: 200
```

### Import Features

The Swagger import functionality provides:

- **Automatic Test Generation**: Creates complete test suites from API specifications
- **Tag-Based Organization**: Groups endpoints by OpenAPI tags into separate test files
- **Parameter Mapping**: Extracts path, query, and header parameters as variables
- **Faker Integration**: Generates realistic test data using Faker.js
- **Schema-Based Assertions**: Creates basic assertions from response schemas
- **Authentication Support**: Handles API keys, Bearer tokens, and OAuth2 flows
- **Documentation Generation**: Creates README files with usage instructions

### Customizing Generated Tests

After import, you can customize the generated tests:

```yaml
# Customize variables
variables:
  # Override default Faker values
  petId: "12345"  # Use specific ID instead of random

  # Add environment-specific values
  api_key: "{{$ENV.PETSTORE_API_KEY}}"

  # Add complex objects
  test_pet:
    name: "Fluffy"
    category:
      id: 1
      name: "Dogs"

steps:
  - name: "get_pet_by_id"
    # Add custom headers
    http:
      headers:
        api_key: "{{api_key}}"
        X-Test-Run: "{{faker.uuid}}"

    # Enhanced assertions
    assertions:
      - field: "status"
        operator: "equals"
        expected: 200
      - field: "body.name"
        operator: "not_equals"
        expected: ""
      - field: "body.category.name"
        operator: "contains"
        expected: "{{test_pet.category.name}}"

    # Custom captures
    capture:
      pet_data: "body"
      creation_time: "body.created_at"
```

## Iteration Patterns

### Array Iteration
```yaml
# File: tests/array-iteration-example.yaml
suite_name: "Array Iteration Example"
base_url: "{{httpbin_url}}"

variables:
  test_users:
    - id: 1
      name: "Alice Smith"
      email: "alice@example.com"
      role: "admin"
    - id: 2
      name: "Bob Johnson"
      email: "bob@example.com"
      role: "user"
    - id: 3
      name: "Charlie Brown"
      email: "charlie@example.com"
      role: "moderator"

steps:
  # Instead of creating 3 separate steps, use iteration
  - name: "Create user {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      url: "/users"
      headers:
        Content-Type: "application/json"
      body:
        user_id: "{{item.id}}"
        name: "{{item.name}}"
        email: "{{item.email}}"
        role: "{{item.role}}"

    assert:
      status_code: 201
      body:
        id: "{{item.id}}"
        name: "{{item.name}}"
        email: "{{item.email}}"

    capture:
      created_user_id: "body.id"
      user_creation_time: "body.created_at"
```

### Range Iteration
```yaml
# File: tests/range-iteration-example.yaml
suite_name: "Range Iteration Example"
base_url: "{{httpbin_url}}"

steps:
  # Load test with multiple iterations
  - name: "Load test iteration {{index}}"
    iterate:
      range: "1..10"
      as: "index"
    request:
      method: GET
      url: "/performance/test"
      headers:
        X-Iteration: "{{index}}"
      params:
        iteration: "{{index}}"
        batch: "load-test"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 1000

    capture:
      iteration_response_time: "response_time_ms"
      iteration_result: "body.result"
```

### Nested Data Iteration
```yaml
# File: tests/nested-iteration-example.yaml
suite_name: "Nested Data Iteration"
base_url: "{{httpbin_url}}"

variables:
  test_scenarios:
    - scenario: "valid_data"
      test_cases:
        - name: "Valid User 1"
          email: "user1@example.com"
          expected_status: 201
        - name: "Valid User 2"
          email: "user2@example.com"
          expected_status: 201
    - scenario: "invalid_data"
      test_cases:
        - name: "Invalid Email"
          email: "invalid-email"
          expected_status: 400

steps:
  # Iterate through nested test cases
  - name: "Test scenario {{item.scenario}} - {{item.name}}"
    iterate:
      over: "{{test_scenarios[0].test_cases}}"
      as: "item"
    request:
      method: POST
      url: "/users/register"
      body:
        name: "{{item.name}}"
        email: "{{item.email}}"

    assert:
      status_code: "{{item.expected_status}}"

    scenarios:
      - condition: "status_code == `201`"
        then:
          capture:
            successful_registration: "body.user_id"
      - condition: "status_code >= `400`"
        then:
          capture:
            validation_error: "body.error_message"
```

## Benefits of Iteration

### Before Iteration (Repetitive)
```yaml
steps:
  - name: "Test user 1"
    request:
      method: POST
      body: { name: "Alice", email: "alice@example.com" }
  - name: "Test user 2"
    request:
      method: POST
      body: { name: "Bob", email: "bob@example.com" }
  - name: "Test user 3"
    request:
      method: POST
      body: { name: "Charlie", email: "charlie@example.com" }
```

### After Iteration (Concise)
```yaml
steps:
  - name: "Test user {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      body:
        name: "{{item.name}}"
        email: "{{item.email}}"
```

This collection of examples demonstrates the full range of capabilities available in the Flow Test Engine, from basic API testing to complex integration scenarios with conditional logic, performance validation, dynamic test generation, and powerful iteration patterns.
