# Flow Test Engine - Quick Reference Cheat Sheet

## Basic Structure

```yaml
suite_name: "Test Name"
node_id: "unique-id"
description: "What this test does"
base_url: "https://api.example.com"

metadata:
  priority: "high"  # critical|high|medium|low
  tags: ["smoke", "api"]

variables:
  my_var: "value"

exports:
  - shared_var

steps:
  - name: "Step name"
    request:
      method: "GET"
      url: "/endpoint"
    assert:
      status_code: 200
```

## Request Methods

```yaml
method: "GET"     # Retrieve data
method: "POST"    # Create resource
method: "PUT"     # Update (replace) resource
method: "PATCH"   # Partial update
method: "DELETE"  # Remove resource
method: "HEAD"    # Headers only
method: "OPTIONS" # CORS preflight
```

## Variables

```yaml
# Static
variables:
  my_var: "value"

# Environment (.env file or system)
api_key: "{{$env.API_KEY}}"

# Faker (dynamic data)
email: "{{$faker.internet.email}}"
name: "{{$faker.person.fullName}}"
uuid: "{{$faker.string.uuid}}"
price: "{{$faker.commerce.price}}"

# JavaScript
computed: "{{$js.return Date.now()}}"

# Captured from previous step
user_id: "{{captured_id}}"
```

## Common Faker Methods

```yaml
# Person
$faker.person.firstName
$faker.person.lastName
$faker.person.fullName

# Internet
$faker.internet.email
$faker.internet.userName
$faker.internet.password
$faker.internet.url

# IDs
$faker.string.uuid
$faker.number.int
$faker.number.float

# Address
$faker.location.city
$faker.location.country
$faker.location.streetAddress

# Commerce
$faker.commerce.productName
$faker.commerce.price
$faker.commerce.department

# Text
$faker.lorem.word
$faker.lorem.sentence
$faker.lorem.paragraph

# Random selection
$faker.helpers.arrayElement(['a', 'b', 'c'])
```

## Assertions

```yaml
assert:
  # Status code
  status_code: 200
  
  # Exact match
  body:
    field: { equals: "value" }
  
  # Type checking
  body:
    field: { type: "string" }  # string|number|boolean|object|array|null
  
  # String operations
  body:
    field:
      contains: "substring"
      regex: "^pattern$"
      minLength: 5
      maxLength: 100
      notEmpty: true
  
  # Numeric comparisons
  body:
    count:
      greater_than: 0
      less_than: 100
      min: 1
      max: 99
  
  # Array operations
  body:
    items:
      type: "array"
      length: 5
      length: { min: 1, max: 10 }
      contains: "value"
  
  # Existence
  body:
    field:
      exists: true
  
  # Multiple values
  body:
    status:
      in: ["active", "pending"]
      one_of: ["a", "b", "c"]
  
  # Headers
  headers:
    content-type:
      contains: "application/json"
  
  # Performance
  response_time_ms:
    less_than: 1000
```

## Captures (Extract Data)

```yaml
capture:
  # Simple field
  user_id: "body.id"
  
  # Nested field
  email: "body.user.email"
  
  # Array element
  first_item: "body.items[0]"
  
  # JMESPath query
  active_users: "body.users[?status=='active']"
  
  # Literal value
  constant: "'fixed-value'"
  
  # JavaScript expression
  computed: "{{$js.return body.price * 1.1}}"
```

## Conditional Execution

```yaml
# Run only if condition is true
condition: "{{user_role}} == 'admin'"

# Skip if condition is true
skip_condition: "{{environment}} == 'production'"

# Scenarios (branching)
scenarios:
  - name: "If premium user"
    condition: "body.account_type == 'premium'"
    then:
      capture:
        is_premium: true
    else:
      capture:
        is_premium: false
```

## Common Patterns

### Authentication Flow
```yaml
- name: "Login"
  request:
    method: "POST"
    url: "/auth/login"
    body:
      username: "user"
      password: "{{$env.PASSWORD}}"
  capture:
    auth_token: "body.token"

- name: "Protected endpoint"
  request:
    method: "GET"
    url: "/api/resource"
    headers:
      Authorization: "Bearer {{auth_token}}"
```

### CRUD Operations
```yaml
# Create
- request:
    method: "POST"
    url: "/users"
    body: { name: "John" }
  capture:
    user_id: "body.id"

# Read
- request:
    method: "GET"
    url: "/users/{{user_id}}"

# Update
- request:
    method: "PUT"
    url: "/users/{{user_id}}"
    body: { name: "Jane" }

# Delete
- request:
    method: "DELETE"
    url: "/users/{{user_id}}"
```

### Error Handling
```yaml
- name: "Test expected error"
  request:
    method: "GET"
    url: "/invalid"
  assert:
    status_code: 404
  continue_on_failure: true
```

### Retry Pattern
```yaml
metadata:
  retry:
    max_attempts: 3
    delay_ms: 1000
    retry_on:
      - status_code: 500
      - status_code: 503
```

### Setup and Cleanup
```yaml
- name: "Setup - Create test data"
  request:
    method: "POST"
    url: "/users"
  capture:
    test_user_id: "body.id"

- name: "Run test"
  # ... main test logic

- name: "Cleanup - Delete test data"
  metadata:
    always_run: true
  request:
    method: "DELETE"
    url: "/users/{{test_user_id}}"
  continue_on_failure: true
```

## CLI Commands

```bash
# Run all tests
fest

# Specific file
fest tests/my-test.yaml

# Filter by priority
fest --priority critical,high

# Filter by tags
fest --tag smoke

# Verbose output
fest --verbose

# Dry run (plan only)
fest --dry-run --detailed

# Generate HTML report
fest --html-output

# Use different config
fest --config staging.yml

# Initialize new project
fest init
```

## Configuration File (flow-test.config.yml)

```yaml
project_name: My Project
test_directory: ./tests

globals:
  variables:
    api_base_url: http://localhost:3000
  timeouts:
    default: 60000

discovery:
  patterns:
    - '**/*.yaml'
  exclude:
    - '**/node_modules/**'

execution:
  mode: sequential
  max_parallel: 3
  continue_on_failure: true

reporting:
  formats: [json, html]
  output_dir: ./results
```

## Environment Variables (.env)

```bash
API_URL=https://api.example.com
API_KEY=secret-key-here
DB_URL=postgresql://localhost/test
```

## Tips

✅ **DO:**
- Use Faker for unique test data
- Capture IDs for later use
- Export tokens for other tests
- Test both success and error cases
- Use descriptive names
- Clean up test data

❌ **DON'T:**
- Hardcode test data (use Faker)
- Share state between tests
- Test implementation details
- Leave test data behind
- Use production credentials

## Quick Start

```bash
# 1. Initialize
npx fest init

# 2. Edit tests/getting-started.yaml

# 3. Run
npx fest --verbose

# 4. View results/report.html
```

## Resources

- [Examples](https://github.com/marcuspmd/flow-test/tree/main/examples)
- [Full Documentation](https://github.com/marcuspmd/flow-test)
- [YAML Reference](https://github.com/marcuspmd/flow-test/blob/main/guides/4.yaml-syntax-reference.md)
