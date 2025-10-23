# Flow Test YAML Reference

Complete reference for Flow Test Engine YAML syntax and features.

## Basic Structure

```yaml
# Unique identifier for this test suite
node_id: "my-api-tests"

# Descriptive name
suite_name: "My API Test Suite"

# Optional description
description: "Tests for the user management API"

# Base URL for all requests (optional)
base_url: "https://api.example.com"

# Suite-level variables
variables:
  api_version: "v1"
  test_email: "test@example.com"

# Variables to export to other suites
exports:
  - auth_token
  - user_id

# Optional variables to export (no warnings if missing)
exports_optional:
  - optional_data

# Dependencies - other suites that must run first
depends:
  - path: "./auth/setup.yaml"
    required: true
    cache: 300  # Cache for 5 minutes

# Suite metadata
metadata:
  priority: "high"  # critical, high, medium, low
  tags:
    - integration
    - user-management
  timeout: 60000
  estimated_duration_ms: 30000

# Test steps
steps:
  - name: "Step 1"
    # ... step configuration
```

## Variables System

### Variable Interpolation

Use `{{variable_name}}` syntax in any string value:

```yaml
request:
  url: "/users/{{user_id}}"
  headers:
    Authorization: "Bearer {{auth_token}}"
  body:
    email: "{{test_email}}"
```

### Variable Scopes (Resolution Order)

1. **Step variables** - defined in step or from `call.variables`
2. **Suite variables** - defined in `variables` section
3. **Global variables** - from config file
4. **Environment variables** - with `FLOW_TEST_` prefix
5. **Faker.js** - dynamic data generation
6. **JavaScript expressions** - computed values

### Environment Variables

```yaml
variables:
  api_key: "{{$env.API_KEY}}"
  # Or directly use FLOW_TEST_ prefix
  # FLOW_TEST_API_KEY environment variable
```

### Faker.js Integration

Generate dynamic test data:

```yaml
variables:
  random_email: "{{$faker.internet.email}}"
  random_name: "{{$faker.person.firstName}}"
  random_uuid: "{{$faker.string.uuid}}"
  random_number: "{{$faker.number.int}}"
  random_date: "{{$faker.date.future}}"
```

### JavaScript Expressions

```yaml
variables:
  timestamp: "{{$js:Date.now()}}"
  random: "{{$js:Math.random()}}"
  computed: "{{$js:user_age > 18 ? 'adult' : 'minor'}}"
```

### Nested Access

```yaml
# Access nested objects
user_name: "{{user.profile.name}}"

# Access array elements
first_item: "{{items[0].id}}"
```

## HTTP Requests

```yaml
request:
  # HTTP method
  method: "POST"  # GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

  # URL (relative to base_url or absolute)
  url: "/api/users"

  # Headers
  headers:
    Content-Type: "application/json"
    Authorization: "Bearer {{auth_token}}"
    X-Custom-Header: "value"

  # Request body (for POST, PUT, PATCH)
  body:
    name: "John Doe"
    email: "{{test_email}}"
    age: 25

  # Query parameters
  params:
    page: 1
    limit: 10
    filter: "active"

  # Request timeout in milliseconds
  timeout: 30000

  # SSL/TLS client certificate (mTLS)
  certificate:
    cert_path: "./certs/client.crt"
    key_path: "./certs/client.key"
    passphrase: "{{$env.CERT_PASSWORD}}"
```

## Assertions

### Status Code

```yaml
assert:
  # Simple status code check
  status_code: 200

  # Or with validation rules
  status_code:
    equals: 201
    # Also: not_equals, greater_than, less_than
```

### Body Assertions

```yaml
assert:
  body:
    # Type checking
    success:
      type: "boolean"
      equals: true

    # Existence check
    data:
      exists: true
      type: "object"

    # Nested field validation
    user:
      id:
        type: "number"
        greater_than: 0
      email:
        type: "string"
        regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
      role:
        in: ["admin", "user", "guest"]

    # Array validation
    items:
      type: "array"
      length:
        greater_than: 0
        less_than: 100
      minLength: 1
      notEmpty: true

    # String validation
    message:
      type: "string"
      contains: "success"
      pattern: "^Success.*"
      minLength: 5
```

### Header Assertions

```yaml
assert:
  headers:
    content-type:
      contains: "application/json"
    x-rate-limit:
      type: "string"
      exists: true
```

### Response Time

```yaml
assert:
  response_time_ms:
    less_than: 2000
    greater_than: 10
```

### Custom Assertions

```yaml
assert:
  custom:
    - name: "Valid user ID format"
      condition: "body.user.id && typeof body.user.id === 'number'"
      message: "User ID must be a number"

    - name: "Email is verified"
      condition: "body.email_verified == true"
      message: "User email must be verified"
```

### Assertion Operators

- `equals` - Exact equality
- `not_equals` - Not equal
- `contains` - String/array contains value
- `greater_than` - Numeric comparison
- `less_than` - Numeric comparison
- `regex` / `pattern` - Regex pattern matching
- `exists` - Field exists (true/false)
- `type` - Type check (string, number, boolean, object, array)
- `length` - Length validation (equals, greater_than, less_than)
- `minLength` - Minimum length
- `notEmpty` - Not null/undefined/empty
- `in` - Value is in array

## Data Capture

Extract data from responses using JMESPath:

```yaml
capture:
  # Simple field extraction
  user_id: "body.id"

  # Nested fields
  user_email: "body.user.email"

  # Array access
  first_item_id: "body.items[0].id"

  # JMESPath expressions
  all_ids: "body.users[*].id"
  admin_users: "body.users[?role=='admin']"

  # Headers
  auth_token: "headers['authorization']"

  # Status code
  response_status: "status_code"
```

## Conditional Scenarios

Execute different logic based on response data:

```yaml
scenarios:
  - name: "Admin user scenario"
    condition: "body.user.role == 'admin'"
    then:
      assert:
        body:
          permissions:
            contains: "admin_access"
      capture:
        admin_id: "body.user.id"
        admin_permissions: "body.permissions"
      variables:
        is_admin: true
    else:
      assert:
        status_code: 403
      variables:
        is_admin: false

  - name: "Success vs Error"
    condition: "status_code == 200"
    then:
      capture:
        data: "body.data"
    else:
      capture:
        error_msg: "body.error.message"
```

## Iterations

### Array Iteration

```yaml
iterate:
  over: "{{test_users}}"  # Variable or JMESPath
  as: "current_user"

request:
  method: "POST"
  url: "/users"
  body:
    name: "{{current_user.name}}"
    email: "{{current_user.email}}"

assert:
  status_code: 201
  body:
    email:
      equals: "{{current_user.email}}"
```

### Range Iteration

```yaml
iterate:
  range: "1..10"  # Inclusive range
  as: "page_number"

request:
  method: "GET"
  url: "/api/items"
  params:
    page: "{{page_number}}"
    limit: 20
```

### Iteration Context

Special variables available during iteration:

- `{{current_user}}` - Current item (from `as` parameter)
- `{{$iteration.index}}` - Current index (0-based)
- `{{$iteration.isFirst}}` - True if first iteration
- `{{$iteration.isLast}}` - True if last iteration

## Interactive Input

Prompt for user input during test execution:

```yaml
# Single input
input:
  prompt: "Enter your API key:"
  variable: "api_key"
  type: "password"
  required: true
  validation:
    min_length: 20
    pattern: "^sk-[a-zA-Z0-9]+"

# Multiple inputs
input:
  - prompt: "Enter user email:"
    variable: "test_email"
    type: "email"
    default: "test@example.com"

  - prompt: "Select environment:"
    variable: "env"
    type: "select"
    options:
      - value: "dev"
        label: "Development"
      - value: "staging"
        label: "Staging"
      - value: "prod"
        label: "Production"

# Dynamic select from response
input:
  prompt: "Found {{users | length(@)}} users. Select one:"
  variable: "selected_user_id"
  type: "select"
  options: "{{users[*].{value: id, label: name}}}"

# Conditional input
input:
  prompt: "Enter admin password:"
  variable: "admin_password"
  type: "password"
  condition: "body.user.role == 'admin'"
  timeout_seconds: 60
  ci_default: "{{$env.ADMIN_PASSWORD}}"
```

### Input Types

- `text` - Plain text input
- `password` - Masked input
- `number` - Numeric input
- `email` - Email validation
- `url` - URL validation
- `select` - Single choice from list
- `confirm` - Yes/No confirmation
- `multiline` - Multi-line text

## Cross-Suite Step Calls

Reuse steps from other test suites:

```yaml
call:
  # Path to the suite (relative to current file)
  suite_path: "./auth/login-flow.yaml"

  # Step ID or name to call
  step: "login_user"

  # Variables to pass to the called step
  variables:
    username: "{{test_username}}"
    password: "{{test_password}}"

  # Context isolation
  isolate_context: true  # Default: true
  # If true: captured variables return as "step_id.variable"
  # If false: captured variables merge into parent scope

  # Error handling
  on_error: "fail"  # Options: fail (default), warn, continue

  # Timeout
  timeout: 30000
```

## Dependencies

Define suite dependencies:

```yaml
depends:
  # Relative path (default)
  - path: "./auth/setup-auth.yaml"
    required: true
    cache: 300  # Cache TTL in seconds
    retry:
      max_attempts: 2
      delay_ms: 1000

  # Absolute path from test_directory
  - path: "common/database-setup.yaml"
    path_type: "absolute"
    required: true

  # Direct node reference
  - node_id: "auth-setup"
    required: false

  # Conditional dependency
  - path: "./staging-setup.yaml"
    condition: "environment == 'staging'"
    variables:
      test_mode: true
```

## Lifecycle Hooks

Execute custom logic at specific points:

```yaml
# Before/after input collection
hooks_pre_input:
  - type: "set_variable"
    variable: "input_timestamp"
    value: "{{$js:Date.now()}}"

hooks_post_input:
  - type: "log"
    message: "Input collected: {{api_key}}"

# Before/after iterations
hooks_pre_iteration:
  - type: "set_variable"
    variable: "iteration_start"
    value: "{{$js:Date.now()}}"

hooks_post_iteration:
  - type: "compute"
    variable: "iteration_duration"
    expression: "{{$js:Date.now() - iteration_start}}"

# Before/after HTTP request
hooks_pre_request:
  - type: "log"
    message: "Sending request to {{request.url}}"

hooks_post_request:
  - type: "transform"
    variable: "response_data"
    expression: "{{$js:JSON.stringify(body)}}"

# Before/after assertions
hooks_pre_assertion:
  - type: "validate"
    condition: "{{status_code >= 200 && status_code < 300}}"

hooks_post_assertion:
  - type: "set_variable"
    variable: "assertions_passed"
    value: true

# Before/after variable capture
hooks_pre_capture:
  - type: "log"
    message: "Capturing variables"

hooks_post_capture:
  - type: "log"
    message: "Captured: {{$js:Object.keys(captured).join(', ')}}"
```

## Step Metadata

```yaml
metadata:
  # Priority level
  priority: "critical"  # critical, high, medium, low

  # Tags for filtering
  tags:
    - auth
    - security
    - smoke

  # Timeout in milliseconds
  timeout: 10000

  # Retry configuration
  retry:
    max_attempts: 3
    delay_ms: 1000

  # Step dependencies
  depends_on:
    - setup_auth_token
    - create_test_user

  # Description
  description: "Validates authentication and user permissions"
```

## Scripts (Pre/Post Request)

```yaml
# Pre-request script
pre_request:
  language: "javascript"
  script: |
    // Prepare request data
    const timestamp = Date.now();
    const nonce = Math.random().toString(36);

# Post-request script
post_request:
  language: "javascript"
  script: |
    // Process response
    if (body.data) {
      console.log('Data received:', body.data);
    }
```

## Delays

```yaml
# Fixed delay
delay: 1000  # milliseconds

# Random delay range
delay:
  min: 500
  max: 2000
```

## Complete Step Example

```yaml
steps:
  - name: "Create user account"
    step_id: "create-user"

    # Input prompts
    input:
      - prompt: "Enter user email:"
        variable: "new_user_email"
        type: "email"
        required: true

    # Pre-request hook
    hooks_pre_request:
      - type: "set_variable"
        variable: "timestamp"
        value: "{{$js:Date.now()}}"

    # HTTP request
    request:
      method: "POST"
      url: "/api/users"
      headers:
        Content-Type: "application/json"
        Authorization: "Bearer {{auth_token}}"
      body:
        username: "{{$faker.internet.userName}}"
        email: "{{new_user_email}}"
        role: "user"
      timeout: 30000

    # Assertions
    assert:
      status_code: 201
      body:
        id:
          exists: true
          type: "number"
          greater_than: 0
        username:
          type: "string"
          notEmpty: true
        email:
          equals: "{{new_user_email}}"
          regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
      response_time_ms:
        less_than: 2000

    # Capture variables
    capture:
      user_id: "body.id"
      created_at: "body.created_at"
      user_data: "body"

    # Conditional scenarios
    scenarios:
      - name: "Check if admin"
        condition: "body.role == 'admin'"
        then:
          capture:
            admin_permissions: "body.permissions"
        else:
          variables:
            is_admin: false

    # Continue on failure
    continue_on_failure: false

    # Metadata
    metadata:
      priority: "high"
      tags:
        - user-management
        - regression
      timeout: 10000
      retry:
        max_attempts: 3
        delay_ms: 1000
      description: "Creates a new user account and validates response"

    # Delay after step
    delay: 500
```

## Advanced Patterns

### Authentication Flow with Token Capture

```yaml
steps:
  - name: "Login"
    request:
      method: "POST"
      url: "/auth/login"
      body:
        username: "{{test_user}}"
        password: "{{test_password}}"
    capture:
      auth_token: "body.token"

  - name: "Use authenticated endpoint"
    request:
      method: "GET"
      url: "/api/protected"
      headers:
        Authorization: "Bearer {{auth_token}}"
```

### CRUD Operations

```yaml
steps:
  - name: "Create"
    request:
      method: "POST"
      url: "/api/items"
      body:
        name: "{{$faker.commerce.productName}}"
    capture:
      item_id: "body.id"

  - name: "Read"
    request:
      method: "GET"
      url: "/api/items/{{item_id}}"

  - name: "Update"
    request:
      method: "PUT"
      url: "/api/items/{{item_id}}"
      body:
        name: "Updated Name"

  - name: "Delete"
    request:
      method: "DELETE"
      url: "/api/items/{{item_id}}"
    assert:
      status_code: 204
```

### Pagination Testing

```yaml
steps:
  - name: "Test pagination"
    iterate:
      range: "1..5"
      as: "page"
    request:
      method: "GET"
      url: "/api/items"
      params:
        page: "{{page}}"
        limit: 10
    assert:
      body:
        items:
          type: "array"
          length:
            less_than: 11
        pagination:
          page:
            equals: "{{page}}"
```

### Error Handling

```yaml
steps:
  - name: "Test error responses"
    request:
      method: "POST"
      url: "/api/users"
      body:
        email: "invalid-email"
    assert:
      status_code: 400
      body:
        error:
          type: "object"
          exists: true
        message:
          contains: "Invalid email"
    continue_on_failure: true
```

## Tips and Best Practices

1. **Use descriptive names** for steps and suites
2. **Leverage variables** to avoid duplication
3. **Capture tokens early** for authenticated flows
4. **Use scenarios** for conditional logic
5. **Add assertions** for all critical fields
6. **Use iterations** for data-driven tests
7. **Isolate contexts** in cross-suite calls by default
8. **Tag your tests** for easy filtering
9. **Set priorities** for execution order
10. **Use Faker.js** for dynamic test data
