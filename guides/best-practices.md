# Best Practices Guide

This guide outlines recommended patterns, anti-patterns, and best practices for writing maintainable, reliable, and efficient API tests with the Flow Test Engine.

## Test Organization

### Suite Structure

**✅ Do: Organize by business domain**

```yaml
# Good: Domain-driven organization
tests/
├── auth/
│   ├── login-tests.yaml
│   ├── registration-tests.yaml
│   └── password-reset-tests.yaml
├── user-management/
│   ├── profile-tests.yaml
│   └── permissions-tests.yaml
└── payments/
    ├── checkout-tests.yaml
    └── refunds-tests.yaml
```

**❌ Don't: Organize by technical layers**

```yaml
# Bad: Technical organization
tests/
├── unit/
├── integration/
└── e2e/
```

### Test Naming Conventions

**✅ Do: Use descriptive, behavior-focused names**

```yaml
suite_name: "User Registration and Email Verification"
# ✅ Clear business value

node_id: "user-registration-flow"
# ✅ Descriptive and unique

steps:
  - name: "Submit registration form with valid data"
  - name: "Verify email confirmation is sent"
  - name: "Complete email verification process"
# ✅ Action-oriented and specific
```

**❌ Don't: Use technical or vague names**

```yaml
suite_name: "API Test Suite #1"
# ❌ Not descriptive

node_id: "test123"
# ❌ Not meaningful

steps:
  - name: "Test POST request"
  - name: "Check response"
# ❌ Too generic
```

## Test Design Principles

### Single Responsibility

**✅ Do: One scenario per test suite**

```yaml
# Good: Focused on single user journey
suite_name: "User Password Reset Flow"
steps:
  - name: "Request password reset"
  - name: "Receive reset email"
  - name: "Reset password with valid token"
  - name: "Login with new password"
```

**❌ Don't: Multiple scenarios in one suite**

```yaml
# Bad: Too many responsibilities
suite_name: "User Management Tests"
steps:
  - name: "Create user"
  - name: "Login user"
  - name: "Update profile"
  - name: "Delete user"
  - name: "Create admin"
  # ... 20+ steps mixing different scenarios
```

### Independent Tests

**✅ Do: Make tests independent**

```yaml
# Test A: User registration
exports: ["test_user_id"]

# Test B: User profile management (uses different user)
variables:
  user_id: "{{$faker.random.uuid}}"
```

**❌ Don't: Create dependencies between tests**

```yaml
# Bad: Test B depends on Test A's side effects
# Test A creates user with ID 123
# Test B assumes user 123 exists
```

## Data Management

### Test Data Strategy

**✅ Do: Use factories and builders**

```yaml
variables:
  test_user: "{{$faker.helpers.createCard}}"
  order_data:
    items:
      - product_id: "{{$faker.random.uuid}}"
        quantity: "{{$faker.random.number({min:1,max:5})}}"
    shipping_address: "{{$faker.address.streetAddress}}"
```

**❌ Don't: Hardcode test data**

```yaml
# Bad: Brittle and unrealistic
variables:
  user_email: "test@example.com"  # Will conflict
  user_name: "John Doe"          # Not realistic
```

### Data Cleanup

**✅ Do: Clean up after tests**

```yaml
steps:
  - name: "Create test data"
    # ... create operations

  - name: "Run test scenario"
    # ... actual test

  - name: "Cleanup test data"
    metadata:
      always_run: true  # Run even if previous steps fail
    request:
      method: "DELETE"
      url: "/api/test-data/{{created_id}}"
```

## Assertions and Validations

### Meaningful Assertions

**✅ Do: Assert business rules, not implementation details**

```yaml
assert:
  body:
    # Good: Business rule
    order_status: { one_of: ["pending", "confirmed", "shipped"] }

    # Good: Data integrity
    total_amount: { min: 0 }
    items: { length: { min: 1 } }
```

**❌ Don't: Assert irrelevant details**

```yaml
assert:
  body:
    # Bad: Implementation detail
    created_at: { exists: true }  # Database timestamp

    # Bad: Overly specific
    response_time: { max: 50 }  # Too restrictive for API tests
```

### Response Validation

**✅ Do: Validate complete response structure**

```yaml
assert:
  status_code: 200
  headers:
    "content-type": { contains: "application/json" }
  body:
    data:
      id: { type: "string" }
      name: { type: "string", min_length: 1 }
      email: { matches: "^[^@]+@[^@]+\\.[^@]+$" }
    meta:
      pagination:
        page: { type: "number", min: 1 }
        total: { type: "number", min: 0 }
```

## Error Handling

### Graceful Degradation

**✅ Do: Handle expected errors**

```yaml
steps:
  - name: "Test invalid input"
    request:
      method: "POST"
      url: "/api/users"
      body:
        email: "invalid-email"
    assert:
      status_code: 400
      body:
        error: { equals: "VALIDATION_ERROR" }
        message: { contains: "Invalid email format" }
```

### Retry Logic

**✅ Do: Use retries for transient failures**

```yaml
steps:
  - name: "Call unreliable service"
    request:
      method: "GET"
      url: "/api/external-service"
    metadata:
      retry:
        max_attempts: 3
        delay_ms: 1000
        retry_on:
          - status_code: 429  # Rate limited
          - status_code: 502  # Bad gateway
          - status_code: 503  # Service unavailable
```

## Performance Considerations

### Response Time Expectations

**✅ Do: Set realistic performance expectations**

```yaml
assert:
  response_time_ms:
    max: 1000  # 1 second for API calls
    warning_threshold: 500  # Log warning above 500ms
```

### Parallel Execution

**✅ Do: Design tests for parallel execution**

```yaml
# Use unique identifiers
variables:
  unique_id: "{{$faker.random.uuid}}"
  test_email: "test.{{unique_id}}@example.com"

# Avoid shared state
steps:
  - name: "Create isolated test user"
    request:
      method: "POST"
      url: "/api/users"
      body:
        email: "{{test_email}}"
        name: "Test User {{unique_id}}"
```

## Configuration Management

### Environment-Specific Configs

**✅ Do: Use environment-specific configurations**

```yaml
# config/development.yml
base_url: "http://localhost:3000"
variables:
  environment: "dev"
  debug_mode: true

# config/production.yml
base_url: "https://api.example.com"
variables:
  environment: "prod"
  debug_mode: false
```

### Secrets Management

**✅ Do: Use environment variables for secrets**

```yaml
variables:
  api_key: "{{$env.API_KEY}}"
  database_url: "{{$env.DATABASE_URL}}"
  jwt_secret: "{{$env.JWT_SECRET}}"
```

**❌ Don't: Hardcode secrets**

```yaml
# Bad: Exposed in version control
variables:
  api_key: "sk-1234567890abcdef"
  password: "admin123"
```

## Maintenance Practices

### Regular Test Review

**✅ Do: Regularly review and update tests**

- Remove obsolete tests
- Update changed API contracts
- Add tests for new features
- Review flaky tests

### Test Documentation

**✅ Do: Document complex test scenarios**

```yaml
metadata:
  description: "Tests the complete user registration flow including email verification and account activation"
  prerequisites: "Clean database, SMTP service available"
  expected_duration_ms: 5000

steps:
  - name: "Submit registration form"
    metadata:
      description: "Posts user registration data and validates initial response"
```

## Anti-Patterns to Avoid

### Flaky Tests

**❌ Don't: Create time-dependent tests**

```yaml
# Bad: Depends on current time
assert:
  body:
    created_at: { equals: "2024-01-01T12:00:00Z" }
```

**✅ Do: Use relative time validation**

```yaml
# Good: Validate reasonable time range
assert:
  body:
    created_at: { type: "string" }
    # Use custom validation or accept recent timestamps
```

### Test Pollution

**❌ Don't: Leave test data behind**

```yaml
# Bad: No cleanup
steps:
  - name: "Create user"
    request:
      method: "POST"
      url: "/api/users"
      body: { name: "Test User" }
  # User remains in database
```

**✅ Do: Always clean up**

```yaml
# Good: Cleanup included
steps:
  - name: "Create user"
    capture:
      user_id: "body.id"

  - name: "Run test scenario"
    # ... test logic

  - name: "Cleanup"
    metadata:
      always_run: true
    request:
      method: "DELETE"
      url: "/api/users/{{user_id}}"
```

### Over-Testing

**❌ Don't: Test implementation details**

```yaml
# Bad: Testing internal database structure
assert:
  body:
    _internal_id: { exists: true }
    _timestamps:
      created_at: { exists: true }
      updated_at: { exists: true }
```

**✅ Do: Test observable behavior**

```yaml
# Good: Testing API contract
assert:
  body:
    id: { exists: true }
    created_at: { exists: true }
    updated_at: { exists: true }
```

## CI/CD Integration Best Practices

### Pipeline Organization

**✅ Do: Structure pipelines for different test types**

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: flow-test --tag unit --silent

  integration:
    needs: unit
    runs-on: ubuntu-latest
    services:
      - postgres: # Start dependencies
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: flow-test --tag integration

  e2e:
    needs: integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: flow-test --tag e2e
```

### Test Result Handling

**✅ Do: Fail fast on critical issues**

```bash
# Run smoke tests first
flow-test --priority critical --silent

# Exit on failure for critical tests
if [ $? -ne 0 ]; then
  echo "Critical tests failed!"
  exit 1
fi

# Run full suite
flow-test --verbose
```

## Debugging Techniques

### Effective Logging

**✅ Do: Use appropriate verbosity levels**

```bash
# Development: See everything
flow-test --verbose

# CI: Minimal output
flow-test --silent

# Debugging: Detailed progress
flow-test --detailed
```

### Test Isolation

**✅ Do: Debug individual test suites**

```bash
# Run single suite
flow-test --suite "user-registration"

# Run with specific node
flow-test --node "auth-tests"

# Combine filters for precise targeting
flow-test --suite "checkout" --environment staging
```

## Performance Optimization

### Test Execution Time

**✅ Do: Optimize for speed**

- Use parallel execution when possible
- Minimize external dependencies
- Use efficient assertions
- Cache reusable test data

### Resource Usage

**✅ Do: Be mindful of resources**

```yaml
# Limit concurrent requests
execution:
  max_parallel: 5
  timeout: 30000

# Use appropriate timeouts
timeouts:
  default: 10000  # 10 seconds
  slow_tests: 30000  # 30 seconds for slow operations
```

## Code Quality

### YAML Best Practices

**✅ Do: Write readable YAML**

```yaml
# Good: Clear structure
variables:
  user:
    name: "John Doe"
    email: "john@example.com"
  product:
    id: "123"
    name: "Widget"

steps:
  - name: "Create user account"
    request:
      method: "POST"
      url: "/api/users"
      body: "{{user}}"

  - name: "Purchase product"
    request:
      method: "POST"
      url: "/api/purchase"
      body:
        user_id: "{{user.id}}"
        product_id: "{{product.id}}"
```

**❌ Don't: Write confusing YAML**

```yaml
# Bad: Nested and hard to read
variables: {user:{name:"John Doe",email:"john@example.com"},product:{id:"123",name:"Widget"}}
steps: [{name:"Create user",request:{method:POST,url:"/api/users",body:"{{user}}"}},{name:"Purchase",request:{method:POST,url:"/api/purchase",body:{user_id:"{{user.id}}",product_id:"{{product.id}}"}}}}]
```

Following these best practices will result in more maintainable, reliable, and efficient API tests that provide better coverage and faster feedback in your development process.