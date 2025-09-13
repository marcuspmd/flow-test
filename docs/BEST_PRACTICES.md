# Flow Test - Best Practices and Patterns

This guide provides best practices, design patterns, and recommendations for writing effective test suites with the Flow Test Engine.

## Table of Contents
- [Test Organization](#test-organization)
- [Naming Conventions](#naming-conventions)
- [Variable Management](#variable-management)
- [Iteration Best Practices](#iteration-best-practices)
- [Assertion Strategies](#assertion-strategies)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Security Best Practices](#security-best-practices)
- [Maintenance and Scalability](#maintenance-and-scalability)

## Test Organization

### Directory Structure
```
tests/
├── auth/
│   ├── login-flow.yaml
│   ├── logout-flow.yaml
│   └── token-refresh-flow.yaml
├── users/
│   ├── user-registration.yaml
│   ├── user-profile.yaml
│   └── user-management.yaml
├── orders/
│   ├── order-creation.yaml
│   ├── order-fulfillment.yaml
│   └── order-cancellation.yaml
├── shared/
│   ├── setup-flow.yaml
│   └── teardown-flow.yaml
└── integration/
    ├── end-to-end-flow.yaml
    └── cross-service-flow.yaml
```

### Suite Organization Principles
- **Single Responsibility**: Each suite should test one specific feature or workflow
- **Logical Grouping**: Group related tests in subdirectories
- **Reusable Components**: Create shared flows for common operations
- **Clear Dependencies**: Document and manage test dependencies explicitly

## Naming Conventions

### Suite Names
```yaml
# ✅ Good
suite_name: "User Registration and Email Verification"
suite_name: "Payment Processing with Multiple Gateways"
suite_name: "Order Fulfillment and Inventory Update"

# ❌ Avoid
suite_name: "Test"
suite_name: "API Test Suite"
suite_name: "My Test"
```

### Step Names
```yaml
# ✅ Good - Descriptive and actionable
steps:
  - name: "Authenticate user with valid credentials"
  - name: "Create new order with multiple items"
  - name: "Verify payment processing webhook"
  - name: "Update user profile information"

# ❌ Avoid - Too vague
steps:
  - name: "Step 1"
  - name: "API Call"
  - name: "Test"
```

### Variable Names
```yaml
# ✅ Good - Descriptive and consistent
variables:
  user_email: "test@example.com"
  auth_token: "jwt-token-here"
  order_total: 99.99
  customer_id: "CUST-12345"

# ❌ Avoid - Unclear or inconsistent
variables:
  x: "test@example.com"
  token: "jwt-token-here"
  total: 99.99
  id: "CUST-12345"
```

## Variable Management

### Variable Scope Hierarchy
```yaml
# Global variables (shared across all suites)
# Set in config or environment
global_variables:
  base_url: "https://api.example.com"
  api_version: "v2"

# Suite variables (specific to this suite)
variables:
  test_user_email: "test@example.com"
  default_timeout: 5000

# Runtime variables (captured during execution)
# Automatically managed by the engine
captured_variables:
  auth_token: "captured-from-response"
  user_id: "captured-from-response"
```

### Variable Naming Patterns
```yaml
# Use consistent prefixes for different types
variables:
  # Input parameters
  input_user_email: "user@example.com"
  input_password: "secure123"

  # Expected values
  expected_status_code: 200
  expected_response_time: 1000

  # Captured values
  captured_auth_token: "from-login-response"
  captured_user_id: "from-user-creation"

  # Computed values
  computed_total_price: 149.99
  computed_discount_amount: 15.00
```

### Global Registry Best Practices
```yaml
# ✅ Good - Use exports to share specific variables
exports:
  - auth_token
  - user_id
  - session_data

# Then reference in other tests:
headers:
  Authorization: "Bearer {{auth_test.auth_token}}"
  X-User-ID: "{{auth_test.user_id}}"

# ❌ Avoid - Don't export too many variables
# Keep exports focused and meaningful
```

## Iteration Best Practices

Iteration patterns are powerful tools for eliminating repetitive test code. Follow these best practices to use them effectively.

### When to Use Iteration

#### ✅ Good Use Cases
```yaml
# Testing multiple similar data sets
variables:
  user_types: [
    { role: "admin", permissions: ["read", "write", "delete"] },
    { role: "user", permissions: ["read"] },
    { role: "guest", permissions: [] }
  ]

steps:
  - name: "Test {{item.role}} permissions"
    iterate:
      over: "{{user_types}}"
      as: "item"
```

```yaml
# Load testing with consistent patterns
steps:
  - name: "Load test iteration {{index}}"
    iterate:
      range: "1..100"
      as: "index"
    request:
      method: GET
      url: "/api/load-test"
      headers:
        X-Test-ID: "LOAD_{{index}}"
```

#### ❌ Avoid Iteration When
```yaml
# Different test logic per item - use separate steps instead
steps:
  - name: "Complex test {{item.name}}"  # ❌ Avoid if logic varies significantly
    iterate:
      over: "{{different_test_types}}"
      as: "item"
    # Complex conditional logic that varies per item type
```

### Iteration Naming Conventions

#### Step Names with Variables
```yaml
# ✅ Good - Descriptive step names with iteration variables
steps:
  - name: "Create user account for {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"

  - name: "Performance test iteration {{index}} of {{total}}"
    iterate:
      range: "1..10"
      as: "index"

# ❌ Avoid - Generic or unclear names
steps:
  - name: "Test step {{item}}"  # Too generic
  - name: "Iteration {{index}}"  # Doesn't describe what it does
```

#### Variable Names
```yaml
# ✅ Good - Clear, descriptive variable names
iterate:
  over: "{{test_users}}"
  as: "user"              # Clear what this represents

iterate:
  over: "{{api_endpoints}}"
  as: "endpoint"          # Meaningful name

iterate:
  range: "1..5"
  as: "iteration_count"   # Descriptive for ranges

# ❌ Avoid - Unclear or confusing names
iterate:
  over: "{{test_data}}"
  as: "item"              # Too generic

iterate:
  range: "1..10"
  as: "i"                 # Too short, unclear
```

### Array Iteration Patterns

#### Data Structure Organization
```yaml
# ✅ Good - Well-structured test data
variables:
  user_scenarios:
    - scenario: "valid_admin"
      user_data:
        name: "Admin User"
        email: "admin@example.com"
        role: "admin"
      expected:
        status_code: 201
        success: true
    - scenario: "invalid_email"
      user_data:
        name: "Invalid User"
        email: "invalid-email"
        role: "user"
      expected:
        status_code: 400
        success: false

steps:
  - name: "Test {{user.scenario}} scenario"
    iterate:
      over: "{{user_scenarios}}"
      as: "user"
    request:
      method: POST
      url: "/users"
      body: "{{user.user_data}}"
    assert:
      status_code: "{{user.expected.status_code}}"
```

#### Avoiding Deep Nesting
```yaml
# ❌ Avoid - Too deeply nested
variables:
  complex_data:
    scenarios:
      positive_tests:
        user_creation:
          admin_users:
            - name: "Admin 1"

# ✅ Better - Flatten structure for iteration
variables:
  admin_test_users:
    - name: "Admin 1"
      role: "admin"
      test_type: "positive"
    - name: "Admin 2"
      role: "admin"
      test_type: "positive"
```

### Range Iteration Patterns

#### Performance Testing
```yaml
# ✅ Good - Range iteration for load testing
variables:
  load_test_config:
    iterations: 50
    concurrent_users: 10
    ramp_up_time: 30

steps:
  - name: "Load test request {{index}} of {{load_test_config.iterations}}"
    iterate:
      range: "1..{{load_test_config.iterations}}"
      as: "index"
    request:
      method: GET
      url: "/api/performance"
      headers:
        X-Load-Test: "true"
        X-Iteration: "{{index}}"
    assert:
      response_time_ms:
        less_than: 1000
```

#### Data Generation
```yaml
# ✅ Good - Use range for generating test data
steps:
  - name: "Create test record {{index}}"
    iterate:
      range: "1..20"
      as: "index"
    request:
      method: POST
      url: "/records"
      body:
        id: "RECORD_{{index}}"
        name: "Test Record {{index}}"
        timestamp: "{{$js.return new Date().toISOString()}}"
```

### Variable Scoping in Iterations

#### Isolation Principles
```yaml
# ✅ Good - Each iteration is isolated
steps:
  - name: "Process user {{user.name}}"
    iterate:
      over: "{{test_users}}"
      as: "user"
    request:
      method: POST
      url: "/process"
      body:
        user_id: "{{user.id}}"
        timestamp: "{{$js.return Date.now()}}"  # Fresh for each iteration
    capture:
      processed_user_id: "body.user_id"        # Captured per iteration
      processing_time: "body.duration"
```

#### Variable Reuse Between Iterations
```yaml
# ✅ Good - Variables available after iteration completes
variables:
  counter: 0

steps:
  - name: "Increment counter {{index}}"
    iterate:
      range: "1..5"
      as: "index"
    request:
      method: POST
      url: "/counter"
      body:
        current_count: "{{counter}}"
        increment: 1
    capture:
      counter: "body.new_count"  # Updated each iteration

  - name: "Final counter check"
    request:
      method: GET
      url: "/counter/final"
    assert:
      body:
        final_count: "{{counter}}"  # Available after iterations
```

### Performance Considerations

#### Optimal Iteration Sizes
```yaml
# ✅ Good - Reasonable iteration counts
steps:
  # Small dataset iteration (< 50 items)
  - name: "Test user {{user.name}}"
    iterate:
      over: "{{test_users}}"  # 10-20 users
      as: "user"

  # Medium load testing (50-200)
  - name: "Load test {{index}}"
    iterate:
      range: "1..100"
      as: "index"

# ⚠️ Consider alternatives for very large iterations
steps:
  # Large dataset - consider batching or parallel execution
  - name: "Process batch {{batch_index}}"
    iterate:
      range: "1..10"  # Process in batches instead of 1000 iterations
      as: "batch_index"
```

#### Memory Management
```yaml
# ✅ Good - Clean up large data after iterations
variables:
  large_test_data: []  # Will be populated

steps:
  - name: "Generate test data"
    request:
      method: GET
      url: "/generate-large-dataset"
    capture:
      large_test_data: "body.dataset"

  - name: "Process item {{item.id}}"
    iterate:
      over: "{{large_test_data}}"
      as: "item"
    request:
      method: POST
      url: "/process"
      body: "{{item}}"

  - name: "Cleanup large data"
    request:
      method: POST
      url: "/cleanup"
      body:
        action: "clear_test_data"
    capture:
      large_test_data: null  # Clear memory
```

### Error Handling in Iterations

#### Graceful Failure Handling
```yaml
steps:
  - name: "Process user {{user.name}} with error handling"
    iterate:
      over: "{{test_users}}"
      as: "user"
    request:
      method: POST
      url: "/users/process"
      body: "{{user}}"
    continue_on_failure: true  # Don't stop entire iteration on one failure

    scenarios:
      - condition: "status_code == `200`"
        then:
          capture:
            successful_users: "body.user_id"
            success_count: "{{success_count + 1}}"

      - condition: "status_code >= `400`"
        then:
          capture:
            failed_users: "body.error"
            failure_count: "{{failure_count + 1}}"
```

#### Partial Success Reporting
```yaml
steps:
  - name: "Batch process with summary"
    iterate:
      range: "1..10"
      as: "index"
    request:
      method: POST
      url: "/batch/{{index}}"
    continue_on_failure: true

  # Summary after all iterations (success or failure)
  - name: "Generate iteration summary"
    request:
      method: POST
      url: "/summary"
      body:
        total_attempts: 10
        successful_items: "{{success_count || 0}}"
        failed_items: "{{failure_count || 0}}"
        success_rate: "{{(success_count / 10) * 100}}"
```

### Testing Iteration Logic

#### Validate Iteration Data
```yaml
# ✅ Good - Validate data before iteration
variables:
  test_users: []

steps:
  - name: "Load test data"
    request:
      method: GET
      url: "/test-data/users"
    capture:
      test_users: "body.users"

  - name: "Validate test data"
    scenarios:
      - condition: "length(test_users) > 0"
        then:
          capture:
            data_ready: "true"
      - condition: "length(test_users) == 0"
        then:
          assert:
            body:
              error: "No test data available"

  - name: "Process user {{user.name}}"
    iterate:
      over: "{{test_users}}"
      as: "user"
    # ... iteration logic
```

#### Debug Iteration Issues
```yaml
# ✅ Good - Add debug information for iterations
steps:
  - name: "Debug iteration {{index}} - {{user.name}}"
    iterate:
      over: "{{test_users}}"
      as: "user"
    request:
      method: POST
      url: "/debug/log"
      body:
        iteration_info:
          index: "{{$js.return iteration_context.index}}"
          is_first: "{{$js.return iteration_context.isFirst}}"
          is_last: "{{$js.return iteration_context.isLast}}"
          current_user: "{{user.name}}"
          total_users: "{{test_users.length}}"
```

Following these iteration best practices will help you create maintainable, performant, and reliable test suites that make the most of the iteration functionality.

## Assertion Strategies

### Progressive Assertion Levels
```yaml
# Level 1: Basic HTTP validation
assert:
  status_code: 200

# Level 2: Response structure validation
assert:
  status_code: 200
  body:
    success: true
    data:
      not_equals: null

# Level 3: Detailed content validation
assert:
  status_code: 200
  body:
    success: true
    data:
      id:
        greater_than: 0
      name:
        not_equals: null
      email:
        regex: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"
  headers:
    content-type: "application/json"
  response_time_ms:
    less_than: 1000
```

### Scenario-Based Assertions
```yaml
# Use scenarios for different response patterns
scenarios:
  - condition: "status_code == `200`"
    then:
      assert:
        body:
          status: "success"
          data:
            id: { greater_than: 0 }
      capture:
        resource_id: "body.data.id"

  - condition: "status_code == `400`"
    then:
      assert:
        body:
          error: { not_equals: null }
          message: { contains: "validation failed" }
      capture:
        error_details: "body.details"

  - condition: "status_code >= `500`"
    then:
      assert:
        body:
          error: "Internal server error"
      capture:
        incident_id: "body.incident_id"
```

### Custom Validation Functions
```yaml
# Use JMESPath for complex validations
assert:
  body:
    # Check if all items have required fields
    data: "all(items, @.id && @.name && @.price)"

    # Validate array length
    items: { length: { greater_than: 0 } }

    # Check date format
    created_at: { regex: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }

    # Validate nested object structure
    user:
      profile:
        preferences: { not_equals: null }
```

## Error Handling

### Graceful Failure Handling
```yaml
# Use continue_on_failure strategically
steps:
  - name: "Attempt optional operation"
    request:
      method: POST
      url: "/optional/feature"
      body: { feature_flag: true }
    continue_on_failure: true  # Don't fail the entire suite

  - name: "Critical operation"
    request:
      method: POST
      url: "/critical/operation"
      body: { required: true }
    continue_on_failure: false  # Fail fast on critical operations
```

### Retry Patterns
```yaml
# Implement retry logic for unreliable operations
steps:
  - name: "Unstable operation with retry"
    request:
      method: GET
      url: "/unstable/endpoint"
      headers:
        Accept: "application/json"

    scenarios:
      - condition: "status_code >= `500` && attempt_count < `3`"
        then:
          capture:
            retry_count: "`(retry_count || 0) + 1`"
          # Engine will automatically retry

      - condition: "status_code == `200`"
        then:
          capture:
            operation_successful: "`true`"
```

### Fallback Strategies
```yaml
# Provide fallback options
steps:
  - name: "Primary service call"
    request:
      method: GET
      url: "/primary/service"
    continue_on_failure: true

    scenarios:
      - condition: "status_code == `200`"
        then:
          capture:
            service_response: "body"
            service_used: "`primary`"

      - condition: "status_code != `200`"
        then:
          capture:
            fallback_needed: "`true`"

  - name: "Fallback service call"
    request:
      method: GET
      url: "/fallback/service"
    continue_on_failure: true

    scenarios:
      - condition: "status_code == `200` && fallback_needed == `true`"
        then:
          capture:
            service_response: "body"
            service_used: "`fallback`"
```

## Performance Considerations

### Response Time Validation
```yaml
# Set appropriate timeouts and expectations
variables:
  performance_thresholds:
    health_check: 200
    api_call: 1000
    file_upload: 5000
    report_generation: 30000

steps:
  - name: "Fast health check"
    request:
      method: GET
      url: "/health"
    assert:
      response_time_ms:
        less_than: "{{performance_thresholds.health_check}}"

  - name: "Standard API call"
    request:
      method: GET
      url: "/api/data"
    assert:
      response_time_ms:
        less_than: "{{performance_thresholds.api_call}}"
```

### Load Testing Patterns
```yaml
# Simulate concurrent users
variables:
  concurrent_users: 10
  test_duration_seconds: 60

steps:
  - name: "Load test preparation"
    request:
      method: POST
      url: "/test/setup"
      body:
        concurrent_users: "{{concurrent_users}}"
        duration: "{{test_duration_seconds}}"

  - name: "Execute load test"
    request:
      method: POST
      url: "/test/load"
      body:
        scenario: "user_registration"
        users: "{{concurrent_users}}"
        ramp_up_time: 10

    assert:
      status_code: 200
      body:
        success_rate:
          greater_than: 95
        average_response_time:
          less_than: 2000
```

### Resource Cleanup
```yaml
# Always clean up test data
steps:
  # ... test steps ...

  - name: "Cleanup test data"
    request:
      method: DELETE
      url: "/test/cleanup/{{test_session_id}}"
    continue_on_failure: true  # Don't fail if cleanup fails

  - name: "Verify cleanup"
    request:
      method: GET
      url: "/test/cleanup/status/{{test_session_id}}"
    assert:
      body:
        cleanup_complete: true
```

## Security Best Practices

### Credential Management
```yaml
# Never hardcode credentials
variables:
  # Use environment variables or config files
  api_key: "{{env.API_KEY}}"
  db_password: "{{env.DB_PASSWORD}}"

# Or reference secure credentials from environment variables
headers:
  Authorization: "Bearer {{$env.SECURE_TOKEN}}"
variables:
  api_key: "{{$env.API_SECRET}}"
```

### Sensitive Data Handling
```yaml
# Mask sensitive data in logs
steps:
  - name: "Login with sensitive data"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"  # Will be masked in logs

    assert:
      status_code: 200

    capture:
      # Don't capture sensitive tokens in logs
      auth_token: "body.token"  # This will be logged
      # Use secure capture for sensitive data
      secure_token: "body.sensitive_token"  # This won't be logged
```

### Input Validation
```yaml
# Validate inputs before using them
steps:
  - name: "Validate input parameters"
    request:
      method: POST
      url: "/validate/input"
      body:
        email: "{{user_email}}"
        password: "{{user_password}}"

    scenarios:
      - condition: "status_code == `200`"
        then:
          capture:
            input_valid: "`true`"

      - condition: "status_code == `400`"
        then:
          assert:
            body:
              errors:
                not_equals: null
          capture:
            validation_errors: "body.errors"
            input_valid: "`false`"
```

## Maintenance and Scalability

### Test Data Management
```yaml
# Use factories for test data
variables:
  user_factory:
    base_user:
      name: "Test User"
      email: "test@example.com"
      role: "user"
    variations:
      - suffix: "01"
        email: "test01@example.com"
      - suffix: "02"
        email: "test02@example.com"

steps:
  - name: "Create test user"
    request:
      method: POST
      url: "/users"
      body:
        name: "{{user_factory.base_user.name}} {{user_factory.variations[0].suffix}}"
        email: "{{user_factory.variations[0].email}}"
        role: "{{user_factory.base_user.role}}"
```

### Version Control for Tests
```yaml
# Include version information
suite_name: "User API Tests v2.1"
variables:
  api_version: "v2"
  test_version: "2.1.0"
  last_updated: "2024-01-15"

# Document breaking changes
steps:
  - name: "Verify API version compatibility"
    request:
      method: GET
      url: "/api/version"
    assert:
      body:
        version: "{{api_version}}"
        compatible_with: "{{test_version}}"
```

### Documentation Standards
```yaml
# Include comprehensive documentation
suite_name: "User Registration Flow"

# Document purpose and scope
description: |
  This test suite validates the complete user registration workflow
  including email verification and account activation.

# Document dependencies
dependencies:
  - "auth-service: v1.2.0"
  - "email-service: v2.0.0"
  - "database: PostgreSQL 12+"

# Document test data requirements
test_data:
  - "Valid email addresses"
  - "Unique usernames"
  - "Strong passwords"

steps:
  # Each step should have clear documentation
  - name: "Validate email format"
    description: "Ensure email follows RFC 5322 standard"
    request:
      # ... implementation
```

### Monitoring and Reporting
```yaml
# Include monitoring hooks
steps:
  - name: "Monitor test execution"
    request:
      method: POST
      url: "/monitoring/test/start"
      body:
        suite_name: "{{suite_name}}"
        start_time: "{{current_timestamp}}"
        environment: "{{environment}}"

    capture:
      monitoring_session: "body.session_id"

  # ... test steps ...

  - name: "Report test results"
    request:
      method: POST
      url: "/monitoring/test/complete"
      body:
        session_id: "{{monitoring_session}}"
        status: "{{test_status}}"
        duration_ms: "{{test_duration}}"
        metrics:
          requests_made: "{{request_count}}"
          assertions_passed: "{{passed_assertions}}"
          assertions_failed: "{{failed_assertions}}"
```

Following these best practices will help you create maintainable, scalable, and reliable test suites that provide consistent value throughout the development lifecycle.
