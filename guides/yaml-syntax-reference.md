# YAML Syntax Reference

This guide covers the complete YAML syntax for writing test suites in Flow Test Engine, including all available options, assertions, and advanced features.

## Test Suite Structure

Every test file is a YAML document representing a test suite:

```yaml
# Suite metadata
node_id: "unique-suite-identifier"
suite_name: "Human readable suite name"

# Optional metadata
metadata:
  priority: "high"
  tags: ["smoke", "api", "authentication"]
  description: "What this suite tests"
  dependencies: ["auth-setup", "database-seed"]

# Base URL for all requests (optional)
base_url: "https://api.example.com"

# Local variables (available only in this suite)
variables:
  api_key: "your-api-key"
  user_id: 12345
  test_data:
    name: "John Doe"
    email: "john@example.com"

# Variables to export globally (accessible by other suites)
exports: ["auth_token", "user_id"]

# Test steps (the actual test flow)
steps:
  - name: "Step 1"
    # ... step configuration

  - name: "Step 2"
    # ... step configuration
```

## Step Configuration

Each step represents one HTTP request and its validations:

```yaml
steps:
  - name: "Create user account"
    request:
      method: "POST"
      url: "/api/users"
      headers:
        "Content-Type": "application/json"
        "Authorization": "Bearer {{auth_token}}"
      body:
        name: "{{test_data.name}}"
        email: "{{test_data.email}}"
        password: "secure-password"

    # Optional: Assertions to validate response
    assert:
      status_code: 201
      body:
        id: { exists: true, type: "number" }
        name: { equals: "{{test_data.name}}" }
        email: { equals: "{{test_data.email}}" }

    # Optional: Capture values from response
    capture:
      user_id: "body.id"
      auth_token: "body.token"

    # Optional: Step metadata
    metadata:
      priority: "high"
      skip: false
      timeout: 30000
```

## Request Configuration

### HTTP Methods

Supported HTTP methods:

```yaml
request:
  method: "GET"     # GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  url: "/api/users" # Relative to base_url, or absolute URL
```

### Headers

HTTP headers as key-value pairs:

```yaml
request:
  method: "POST"
  url: "/api/users"
  headers:
    "Content-Type": "application/json"
    "Authorization": "Bearer {{auth_token}}"
    "X-API-Key": "{{api_key}}"
    "User-Agent": "Flow-Test-Engine/1.0"
```

### Request Body

Supports JSON, form data, and text:

```yaml
# JSON body
request:
  method: "POST"
  url: "/api/users"
  headers:
    "Content-Type": "application/json"
  body:
    name: "John Doe"
    email: "john@example.com"
    preferences:
      theme: "dark"
      notifications: true

# Form data
request:
  method: "POST"
  url: "/upload"
  headers:
    "Content-Type": "multipart/form-data"
  body:
    file: "@./test-files/document.pdf"  # File upload
    metadata: "test document"

# Text body
request:
  method: "POST"
  url: "/api/logs"
  headers:
    "Content-Type": "text/plain"
  body: "This is a log message"
```

## Assertions

Assertions validate the HTTP response. All assertions are optional.

### Status Code Assertion

```yaml
assert:
  status_code: 200  # Exact status code
  # Or range:
  status_code: { min: 200, max: 299 }  # 2xx range
```

### Response Body Assertions

Complex assertions using JMESPath expressions:

```yaml
assert:
  body:
    # Simple value checks
    user.id: { exists: true }
    user.name: { equals: "John Doe" }
    user.age: { type: "number", min: 18, max: 120 }

    # String matching
    message: { contains: "success" }
    email: { matches: "^[^@]+@[^@]+\\.[^@]+$" }  # Regex

    # Array validations
    users: { length: { min: 1, max: 10 } }
    users[0].name: { exists: true }

    # Complex nested assertions
    data:
      pagination:
        total: { type: "number", min: 0 }
        page: { equals: 1 }
      items:
        - name: { exists: true }
          email: { matches: ".*@.*" }
```

### Available Assertion Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `exists` | Value must exist | `{ exists: true }` |
| `equals` | Exact match | `{ equals: "expected" }` |
| `type` | Type check | `{ type: "string" }` |
| `contains` | String contains | `{ contains: "substring" }` |
| `matches` | Regex match | `{ matches: "^\\d+$" }` |
| `length` | Array/string length | `{ length: 5 }` |
| `min` | Minimum value | `{ min: 18 }` |
| `max` | Maximum value | `{ max: 100 }` |
| `oneOf` | Value in list | `{ oneOf: ["A", "B", "C"] }` |

### Response Headers Assertions

```yaml
assert:
  headers:
    "content-type": { contains: "application/json" }
    "x-api-version": { equals: "1.0" }
    "cache-control": { exists: true }
```

## Variable Capture

Capture values from responses for use in subsequent steps:

```yaml
capture:
  # Simple value capture
  user_id: "body.data.id"
  auth_token: "body.token"

  # Capture from headers
  request_id: "headers.x-request-id"

  # Complex object capture
  user_profile: "body.user"

  # Capture with transformation
  created_at: "body.created_at"  # Will be stored as string
```

Captured variables are available in subsequent steps using `{{variable_name}}` syntax.

## Variable Interpolation

Use variables in any string field:

```yaml
variables:
  base_url: "https://api.example.com"
  api_version: "v1"
  user_data:
    name: "John"
    role: "admin"

steps:
  - name: "API Call"
    request:
      method: "GET"
      url: "{{base_url}}/{{api_version}}/users/{{user_id}}"
      headers:
        "Authorization": "Bearer {{auth_token}}"
        "X-User-Role": "{{user_data.role}}"
      body:
        name: "{{user_data.name}}"
        timestamp: "{{$faker.date.recent}}"
```

## Built-in Variables

### Environment Variables

Access environment variables:

```yaml
variables:
  api_key: "{{$env.API_KEY}}"
  database_url: "{{$env.DATABASE_URL}}"
  environment: "{{$env.NODE_ENV}}"
```

### Faker.js Data

Generate fake test data:

```yaml
variables:
  test_user:
    name: "{{$faker.name.fullName}}"
    email: "{{$faker.internet.email}}"
    phone: "{{$faker.phone.number}}"
    address: "{{$faker.address.streetAddress}}"
    company: "{{$faker.company.name}}"
```

Common Faker.js generators:
- `name.fullName`, `name.firstName`, `name.lastName`
- `internet.email`, `internet.username`, `internet.password`
- `phone.number`, `address.streetAddress`, `address.city`
- `company.name`, `company.catchPhrase`
- `date.recent`, `date.past`, `date.future`
- `random.number`, `random.word`, `random.uuid`

## Advanced Features

### Conditional Steps

Skip steps based on conditions:

```yaml
steps:
  - name: "Conditional step"
    metadata:
      skip: "{{environment}} !== 'production'"  # Skip if not production
    request:
      method: "POST"
      url: "/api/cleanup"
```

### Step Dependencies

Define step dependencies (executed automatically):

```yaml
metadata:
  dependencies: ["auth-setup", "database-seed"]

steps:
  - name: "Main test"
    # This step runs after dependencies
```

### Iterations

Repeat steps with different data:

```yaml
steps:
  - name: "Test multiple users"
    iteration:
      data:
        - { name: "Alice", role: "admin" }
        - { name: "Bob", role: "user" }
        - { name: "Charlie", role: "moderator" }
      variable: "current_user"
    request:
      method: "POST"
      url: "/api/users"
      body: "{{current_user}}"
```

### Error Handling

Control behavior on failures:

```yaml
steps:
  - name: "May fail step"
    request:
      method: "DELETE"
      url: "/api/resource/999"
    metadata:
      continue_on_failure: true  # Don't stop suite on failure
      retry:
        max_attempts: 3
        delay_ms: 1000
```

## Complete Examples

### Authentication Flow

```yaml
suite_name: "Authentication Tests"
base_url: "https://api.example.com"

variables:
  test_user:
    email: "{{$faker.internet.email}}"
    password: "TestPass123!"

exports: ["auth_token"]

steps:
  - name: "Register user"
    request:
      method: "POST"
      url: "/auth/register"
      headers:
        "Content-Type": "application/json"
      body: "{{test_user}}"
    assert:
      status_code: 201
      body:
        id: { exists: true }
        email: { equals: "{{test_user.email}}" }

  - name: "Login user"
    request:
      method: "POST"
      url: "/auth/login"
      headers:
        "Content-Type": "application/json"
      body:
        email: "{{test_user.email}}"
        password: "{{test_user.password}}"
    assert:
      status_code: 200
      body:
        token: { exists: true, type: "string" }
    capture:
      auth_token: "body.token"

  - name: "Access protected resource"
    request:
      method: "GET"
      url: "/api/profile"
      headers:
        "Authorization": "Bearer {{auth_token}}"
    assert:
      status_code: 200
      body:
        email: { equals: "{{test_user.email}}" }
```

### API CRUD Operations

```yaml
suite_name: "User Management API"
base_url: "https://api.example.com"

variables:
  new_user:
    name: "{{$faker.name.fullName}}"
    email: "{{$faker.internet.email}}"

steps:
  - name: "Create user"
    request:
      method: "POST"
      url: "/api/users"
      headers:
        "Content-Type": "application/json"
        "Authorization": "Bearer {{auth_token}}"
      body: "{{new_user}}"
    assert:
      status_code: 201
      body:
        id: { exists: true, type: "number" }
        name: { equals: "{{new_user.name}}" }
    capture:
      created_user_id: "body.id"

  - name: "Get user details"
    request:
      method: "GET"
      url: "/api/users/{{created_user_id}}"
      headers:
        "Authorization": "Bearer {{auth_token}}"
    assert:
      status_code: 200
      body:
        id: { equals: "{{created_user_id}}" }
        name: { equals: "{{new_user.name}}" }

  - name: "Update user"
    request:
      method: "PUT"
      url: "/api/users/{{created_user_id}}"
      headers:
        "Content-Type": "application/json"
        "Authorization": "Bearer {{auth_token}}"
      body:
        name: "Updated Name"
        email: "{{new_user.email}}"
    assert:
      status_code: 200
      body:
        name: { equals: "Updated Name" }

  - name: "Delete user"
    request:
      method: "DELETE"
      url: "/api/users/{{created_user_id}}"
      headers:
        "Authorization": "Bearer {{auth_token}}"
    assert:
      status_code: 204

  - name: "Verify user deleted"
    request:
      method: "GET"
      url: "/api/users/{{created_user_id}}"
      headers:
        "Authorization": "Bearer {{auth_token}}"
    assert:
      status_code: 404
```