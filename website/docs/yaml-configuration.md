# YAML Configuration Reference

This guide provides comprehensive documentation for the YAML configuration format used by Flow Test Engine.

## Basic Structure

Every test suite follows this basic structure:

```yaml
# Required: Suite identification
suite_name: "Test Suite Name"

# Optional: Base URL for all requests
base_url: "https://api.example.com"

# Optional: Suite-level configuration
tags: ["api", "smoke"]
priority: "high"
timeout: 30000

# Optional: Variables for interpolation
variables:
  key: "value"

# Optional: Global exports for cross-suite communication
exports:
  - variable_name

# Required: Test steps
steps:
  - name: "Step name"
    # Step configuration...
```

## Suite Configuration

### Basic Properties

```yaml
suite_name: "User Management API"       # Required: Descriptive name
base_url: "https://api.example.com"     # Optional: Base URL for requests
description: "Test user operations"     # Optional: Suite description
```

### Metadata

```yaml
tags: ["user", "crud", "critical"]      # Optional: Tags for filtering
priority: "high"                        # Optional: critical, high, medium, low
timeout: 60000                          # Optional: Suite timeout in milliseconds
author: "Test Team"                     # Optional: Author information
version: "1.0"                          # Optional: Suite version
```

### Environment Configuration

```yaml
environment: "staging"                  # Optional: Environment identifier
variables:
  api_key: "staging-key-123"
  base_timeout: 5000
```

## Variables

Variables provide dynamic values that can be used throughout your test suite.

### Static Variables

```yaml
variables:
  user_id: 123
  api_version: "v1"
  test_email: "test@example.com"
```

### Environment Variables

Access system environment variables with the `$env` prefix:

```yaml
variables:
  database_url: "{{$env.DATABASE_URL}}"
  api_key: "{{$env.API_KEY}}"
```

### Built-in Functions

Flow Test Engine provides several built-in functions:

```yaml
variables:
  current_time: "{{$now}}"              # Current timestamp
  unique_id: "{{$uuid}}"                # Generate UUID v4
  random_number: "{{$random}}"          # Random number 0-1000
  random_range: "{{$random:1:100}}"     # Random number in range
```

### Faker.js Integration

Generate realistic test data using Faker.js:

```yaml
variables:
  # Personal information
  first_name: "{{faker.person.firstName}}"
  last_name: "{{faker.person.lastName}}"
  full_name: "{{faker.person.fullName}}"
  email: "{{faker.internet.email}}"
  phone: "{{faker.phone.number}}"

  # Location data
  city: "{{faker.location.city}}"
  country: "{{faker.location.country}}"
  address: "{{faker.location.streetAddress}}"
  zipcode: "{{faker.location.zipCode}}"

  # Business data
  company: "{{faker.company.name}}"
  job_title: "{{faker.person.jobTitle}}"
  department: "{{faker.person.jobArea}}"

  # Text content
  sentence: "{{faker.lorem.sentence}}"
  paragraph: "{{faker.lorem.paragraph}}"
  word: "{{faker.lorem.word}}"

  # Dates
  past_date: "{{faker.date.past}}"
  future_date: "{{faker.date.future}}"
  recent_date: "{{faker.date.recent}}"

  # Internet
  username: "{{faker.internet.userName}}"
  password: "{{faker.internet.password}}"
  url: "{{faker.internet.url}}"
  domain: "{{faker.internet.domainName}}"

  # Finance
  credit_card: "{{faker.finance.creditCardNumber}}"
  account_number: "{{faker.finance.accountNumber}}"
  amount: "{{faker.finance.amount}}"
```

### JavaScript Expressions

Execute JavaScript for complex calculations:

```yaml
variables:
  base_number: 10
  multiplier: 5

steps:
  - name: "Calculate values"
    request:
      method: POST
      url: "/calculate"
      body:
        # Mathematical operations
        result: "{{$js.return base_number * multiplier}}"

        # Date manipulation
        tomorrow: "{{$js.return new Date(Date.now() + 86400000).toISOString()}}"

        # String operations
        uppercase: "{{$js.return 'hello world'.toUpperCase()}}"

        # Conditional logic
        status: "{{$js.return user_count > 0 ? 'active' : 'inactive'}}"

        # Array operations
        first_item: "{{$js.return items[0].name}}"

        # Random generation
        random_id: "{{$js.return Math.floor(Math.random() * 1000000)}}"
```

## Steps Configuration

Each step represents a single API request and its validation.

### Basic Step Structure

```yaml
steps:
  - name: "Descriptive step name"        # Required: Step identifier
    description: "What this step does"   # Optional: Detailed description

    # Request configuration
    request:
      method: GET                        # Required: HTTP method
      url: "/endpoint"                   # Required: URL path

    # Optional configurations
    assert: {}                           # Response assertions
    capture: {}                          # Data extraction
    scenarios: []                        # Conditional logic
    iterate: {}                          # Iteration patterns
```

### Request Configuration

#### HTTP Methods

```yaml
request:
  method: GET     # GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  url: "/users/{{user_id}}"
```

#### Headers

```yaml
request:
  headers:
    Content-Type: "application/json"
    Authorization: "Bearer {{auth_token}}"
    X-Custom-Header: "{{custom_value}}"
    Accept: "application/json"
```

#### Query Parameters

```yaml
request:
  params:
    page: 1
    limit: 10
    filter: "{{filter_value}}"
    sort: "created_at:desc"
```

#### Request Body

```yaml
# JSON body
request:
  body:
    user_id: "{{user_id}}"
    name: "{{faker.person.fullName}}"
    email: "{{faker.internet.email}}"
    metadata:
      source: "api-test"
      timestamp: "{{$now}}"

# Form data
request:
  headers:
    Content-Type: "application/x-www-form-urlencoded"
  body: "username={{username}}&password={{password}}"

# Raw body
request:
  body: |
    <xml>
      <user>
        <id>{{user_id}}</id>
        <name>{{user_name}}</name>
      </user>
    </xml>
```

#### Timeouts

```yaml
request:
  timeout: 5000                         # Request timeout in milliseconds
```

## Assertions

Validate response data using flexible assertion operators.

### Status Code Assertions

```yaml
assert:
  status_code: 200                      # Exact match
  # OR
  status_code:
    equals: 200
    not_equals: 500
    greater_than: 199
    less_than: 300
```

### Header Assertions

```yaml
assert:
  headers:
    content-type:
      equals: "application/json"
      contains: "json"
    x-rate-limit-remaining:
      greater_than: 0
    cache-control:
      regex: "max-age=\\d+"
```

### Body Assertions

Use JMESPath syntax to navigate response data:

```yaml
assert:
  body:
    # Simple field assertions
    status:
      equals: "success"

    # Nested object assertions
    user.id:
      equals: "{{user_id}}"
    user.profile.email:
      contains: "@"

    # Array assertions
    items:
      length:
        greater_than: 0
        less_than: 100
    items[0].name:
      not_equals: null

    # Type validation
    count:
      type: "number"
    active:
      type: "boolean"

    # Pattern matching
    email:
      regex: "^[\\w\\._%+-]+@[\\w\\.-]+\\.[A-Za-z]{2,}$"

    # Existence checks
    required_field:
      exists: true
    optional_field:
      exists: false
```

### Performance Assertions

```yaml
assert:
  response_time_ms:
    less_than: 1000                     # Response time under 1 second
    greater_than: 50                    # Minimum response time
```

### Custom Assertions

```yaml
assert:
  body:
    # Complex validation with JavaScript
    total_amount:
      custom: "{{$js.return value > 0 && value < 10000}}"
```

## Data Capture

Extract data from responses for use in subsequent steps:

### Basic Capture

```yaml
capture:
  # Simple field extraction
  user_id: "body.user.id"
  token: "body.access_token"

  # Header extraction
  session_id: "headers.x-session-id"
  correlation_id: "headers.x-correlation-id"

  # Status extraction
  response_status: "status_code"
```

### Advanced Capture

```yaml
capture:
  # Nested object extraction
  user_profile: "body.user"

  # Array operations
  first_item: "body.items[0]"
  item_ids: "body.items[*].id"

  # Conditional extraction
  error_message: "body.error || body.message"

  # Computed values
  full_name: "{{$js.return captured_first_name + ' ' + captured_last_name}}"
```

## Iteration Patterns

Reduce test repetition with iteration capabilities.

### Array Iteration

```yaml
variables:
  test_users:
    - { id: 1, name: "Alice", role: "admin" }
    - { id: 2, name: "Bob", role: "user" }
    - { id: 3, name: "Charlie", role: "user" }

steps:
  - name: "Create user {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      url: "/users"
      body:
        id: "{{item.id}}"
        name: "{{item.name}}"
        role: "{{item.role}}"
    assert:
      status_code: 201
      body:
        user.id:
          equals: "{{item.id}}"
```

### Range Iteration

```yaml
steps:
  - name: "Load test iteration {{index}}"
    iterate:
      range: "1..5"
      as: "index"
    request:
      method: GET
      url: "/health"
      headers:
        X-Iteration: "{{index}}"
    assert:
      status_code: 200
```

### Dynamic Iteration

```yaml
steps:
  - name: "Get available endpoints"
    request:
      method: GET
      url: "/api/endpoints"
    capture:
      endpoints: "body.endpoints"

  - name: "Test endpoint {{endpoint.path}}"
    iterate:
      over: "{{endpoints}}"
      as: "endpoint"
    request:
      method: "{{endpoint.method}}"
      url: "{{endpoint.path}}"
    assert:
      status_code:
        not_equals: 500
```

## Conditional Scenarios

Execute different logic based on response conditions:

### Basic Scenarios

```yaml
steps:
  - name: "API call with conditional logic"
    request:
      method: GET
      url: "/data"

    scenarios:
      - condition: "status_code == `200`"
        then:
          capture:
            data: "body.data"
            count: "body.data | length(@)"

      - condition: "status_code == `404`"
        then:
          capture:
            error_message: "body.error"

      - condition: "status_code >= `500`"
        then:
          assert:
            body:
              error:
                exists: true
```

### Complex Conditions

```yaml
scenarios:
  # Multiple conditions
  - condition: "status_code == `200` && body.success == `true`"
    then:
      capture:
        success_data: "body.data"

  # JMESPath expressions
  - condition: "body.items | length(@) > `0`"
    then:
      capture:
        first_item: "body.items[0]"

  # Variable comparisons
  - condition: "body.user_id == user_id"
    then:
      capture:
        user_matched: true
```

## Global Exports

Share variables between test suites:

### Exporting Variables

```yaml
# In auth-test.yaml
suite_name: "Authentication Tests"

steps:
  - name: "Login"
    request:
      method: POST
      url: "/login"
      body:
        username: "testuser"
        password: "password123"
    capture:
      auth_token: "body.token"
      user_id: "body.user.id"

# Export for other suites
exports:
  - auth_token
  - user_id
```

### Using Exported Variables

```yaml
# In user-test.yaml
suite_name: "User Tests"

steps:
  - name: "Get user profile"
    request:
      method: GET
      url: "/profile"
      headers:
        # Use exported variables from auth-test
        Authorization: "Bearer {{auth_test.auth_token}}"
        X-User-ID: "{{auth_test.user_id}}"
```

## Advanced Configuration

### Suite Dependencies

```yaml
dependencies:
  - suite: "auth-test"          # Run auth-test first
    required: true              # Fail if dependency fails
  - suite: "setup-test"
    required: false             # Continue even if setup fails
```

### Retry Configuration

```yaml
retry:
  enabled: true
  max_attempts: 3
  delay_ms: 1000
  exponential_backoff: true
```

### Parallel Execution

```yaml
execution:
  mode: "parallel"              # Run steps in parallel where possible
  max_concurrent: 5             # Maximum concurrent requests
```

## Best Practices

### Variable Naming

```yaml
# Good: Descriptive names
variables:
  api_base_url: "https://api.example.com"
  test_user_email: "test@example.com"
  max_retry_attempts: 3

# Avoid: Generic names
variables:
  url: "https://api.example.com"
  email: "test@example.com"
  max: 3
```

### Step Organization

```yaml
# Group related steps logically
steps:
  # Setup phase
  - name: "Setup: Create test data"
  - name: "Setup: Authenticate user"

  # Main test phase
  - name: "Test: Create resource"
  - name: "Test: Verify resource creation"
  - name: "Test: Update resource"

  # Cleanup phase
  - name: "Cleanup: Delete test data"
```

### Error Handling

```yaml
steps:
  - name: "Operation that might fail"
    request:
      method: POST
      url: "/risky-operation"

    # Handle both success and failure cases
    scenarios:
      - condition: "status_code >= `200` && status_code < `300`"
        then:
          capture:
            operation_id: "body.operation_id"

      - condition: "status_code >= `400`"
        then:
          capture:
            error_code: "body.error_code"
            error_message: "body.message"
```

This comprehensive reference covers all aspects of YAML configuration in Flow Test Engine. For practical examples, see the [examples repository](https://github.com/marcuspmd/flow-test/tree/main/tests) or check out the [Advanced Features](advanced-features) guide.