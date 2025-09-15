# Getting Started

This guide will help you set up Flow Test Engine and create your first API test suite.

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Clone and Install

```bash
git clone https://github.com/marcuspmd/flow-test.git
cd flow-test
npm install
```

### Build the Project

```bash
npm run build
```

## Running Your First Test

Flow Test Engine comes with example tests that you can run immediately:

```bash
# Run the default test suite
npm test

# Run with verbose output
npm run test:verbose

# Run a specific test file
npm run dev tests/start-flow.yaml
```

## Creating Your First Test Suite

Let's create a simple test suite that demonstrates the core features of Flow Test Engine.

### 1. Create a Test File

Create a new file called `my-first-test.yaml` in the `tests/` directory:

```yaml
suite_name: "My First API Test"
base_url: "https://httpbin.org"

variables:
  user_name: "testuser"
  user_id: 123

steps:
  - name: "Send POST request with data"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
        X-Test-Header: "flow-test-demo"
      body:
        user_id: "{{user_id}}"
        username: "{{user_name}}"
        timestamp: "{{$now}}"

    assert:
      status_code: 200
      headers:
        content-type:
          contains: "application/json"
      body:
        json.user_id:
          equals: "{{user_id}}"
        json.username:
          equals: "{{user_name}}"

    capture:
      captured_username: "body.json.username"
      server_data: "body.json"

  - name: "Verify captured data"
    request:
      method: GET
      url: "/get"
      params:
        username: "{{captured_username}}"

    assert:
      status_code: 200
      body:
        args.username:
          equals: "{{user_name}}"
```

### 2. Run Your Test

```bash
npm run dev tests/my-first-test.yaml
```

You should see output similar to:

```
✓ My First API Test
  ✓ Send POST request with data (245ms)
  ✓ Verify captured data (156ms)

Tests: 1 passed, 1 total
Steps: 2 passed, 2 total
Time: 401ms
```

### 3. View the HTML Report

Generate and view a detailed HTML report:

```bash
npm run report:html
```

This will open a comprehensive report in your browser showing:
- Test execution summary
- Request/response details
- Performance metrics
- Variable states
- Captured data

## Understanding the Test Structure

Let's break down the key components of a test suite:

### Suite Header

```yaml
suite_name: "My First API Test"  # Descriptive name for your test suite
base_url: "https://httpbin.org"  # Base URL for all requests
```

### Variables

```yaml
variables:
  user_name: "testuser"  # Static variables
  user_id: 123           # Can be referenced as {{user_name}} and {{user_id}}
```

### Steps

Each step represents a single API request and its validation:

```yaml
steps:
  - name: "Descriptive step name"
    request:
      method: POST          # HTTP method
      url: "/post"          # Endpoint (relative to base_url)
      headers:              # Optional headers
        Content-Type: "application/json"
      body:                 # Request body (for POST/PUT/PATCH)
        key: "value"

    assert:                 # Response validation
      status_code: 200      # Expected status code
      headers:              # Header assertions
        content-type:
          contains: "json"
      body:                 # Body assertions using JMESPath
        json.key:
          equals: "value"

    capture:                # Extract data for later use
      variable_name: "body.json.field"
```

## Variable Interpolation

Flow Test Engine supports several types of variable interpolation:

### Static Variables
```yaml
variables:
  api_key: "your-api-key"

# Usage: {{api_key}}
```

### Environment Variables
```yaml
# Usage: {{$env.NODE_ENV}}
headers:
  Authorization: "Bearer {{$env.API_TOKEN}}"
```

### Built-in Functions
```yaml
body:
  timestamp: "{{$now}}"           # Current timestamp
  uuid: "{{$uuid}}"               # Generate UUID
  random: "{{$random}}"           # Random number
```

### Faker.js Integration
```yaml
body:
  email: "{{faker.internet.email}}"
  name: "{{faker.person.fullName}}"
  address: "{{faker.location.streetAddress}}"
```

### JavaScript Expressions
```yaml
body:
  calculated: "{{$js.return 10 * 5}}"
  formatted_date: "{{$js.return new Date().toISOString()}}"
```

## Assertions

Flow Test Engine provides flexible assertion operators:

### Equality Assertions
```yaml
assert:
  body:
    status:
      equals: "success"
    count:
      not_equals: 0
```

### Comparison Assertions
```yaml
assert:
  body:
    items:
      length:
        greater_than: 0
        less_than: 100
    response_time:
      less_than_or_equal: 1000
```

### Pattern Matching
```yaml
assert:
  body:
    email:
      regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    message:
      contains: "success"
```

## Data Capture

Capture response data for use in subsequent steps:

```yaml
capture:
  # Simple field extraction
  user_id: "body.user.id"

  # Nested object extraction
  user_profile: "body.user"

  # Array element extraction
  first_item: "body.items[0]"

  # Header extraction
  session_id: "headers.x-session-id"
```

## Next Steps

Now that you've created your first test, explore these advanced features:

- **[YAML Configuration](yaml-configuration)**: Complete YAML syntax reference
- **[Advanced Features](advanced-features)**: Request chaining, iterations, scenarios
- **[CLI Reference](cli-reference)**: Command-line options and filtering
- **[Configuration](configuration)**: Project configuration and environment setup

## Common Patterns

### Authentication Flow
```yaml
steps:
  - name: "Login"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"
    capture:
      auth_token: "body.token"

  - name: "Protected endpoint"
    request:
      method: GET
      url: "/protected"
      headers:
        Authorization: "Bearer {{auth_token}}"
```

### Error Handling
```yaml
steps:
  - name: "Test error response"
    request:
      method: GET
      url: "/invalid-endpoint"

    assert:
      status_code: 404
      body:
        error:
          equals: "Not Found"
```

### Performance Testing
```yaml
steps:
  - name: "Performance check"
    request:
      method: GET
      url: "/api/data"

    assert:
      response_time_ms:
        less_than: 500  # Must respond within 500ms
```

Ready to dive deeper? Check out the [YAML Configuration](yaml-configuration) guide for complete syntax reference.