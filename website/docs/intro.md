# Welcome to Flow Test Engine

Flow Test Engine is a comprehensive TypeScript-based API testing framework that allows you to create complex test flows using declarative YAML configuration files.

![Flow Test Engine Overview](../static/img/flow-test.png)

## What is Flow Test Engine?

Flow Test Engine is designed to simplify API testing by providing:

- **Declarative YAML Configuration**: Write tests in simple, readable YAML format
- **Request Chaining**: Capture data from one request and use it in subsequent requests
- **Variable Interpolation**: Support for environment variables, Faker.js, and JavaScript expressions
- **Powerful Assertions**: Multiple assertion operators with JMESPath support
- **Rich Reporting**: JSON and HTML reports with detailed execution information
- **Swagger/OpenAPI Integration**: Generate tests directly from API specifications

## Key Features

### 🔗 Request Chaining & Data Capture
Capture response data from one step and use it in subsequent requests:

```yaml
steps:
  - name: "Login"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "testuser"
        password: "password123"
    capture:
      auth_token: "body.token"
      user_id: "body.user.id"

  - name: "Get User Profile"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Authorization: "Bearer {{auth_token}}"
```

### 🎲 Variable Interpolation
Support for multiple variable sources:

```yaml
variables:
  base_number: 10
  multiplier: 5

steps:
  - name: "Dynamic Data Generation"
    request:
      method: POST
      url: "/data"
      body:
        # Environment variables
        user: "{{$env.USER}}"
        # Faker.js integration
        email: "{{faker.internet.email}}"
        # JavaScript expressions
        calculated: "{{$js.return base_number * multiplier}}"
        # Current timestamp
        timestamp: "{{$now}}"
```

### ✅ Flexible Assertions
Multiple assertion operators for comprehensive validation:

```yaml
assert:
  status_code: 200
  headers:
    content-type:
      contains: "application/json"
  body:
    users:
      length:
        greater_than: 0
    status:
      equals: "success"
  response_time_ms:
    less_than: 1000
```

### 🔄 Iteration Patterns
Reduce test repetition with iteration:

```yaml
# Array iteration
- name: "Create user {{item.name}}"
  iterate:
    over: "{{test_users}}"
    as: "item"
  request:
    method: POST
    url: "/users"
    body:
      name: "{{item.name}}"
      email: "{{item.email}}"

# Range iteration
- name: "Load test iteration {{index}}"
  iterate:
    range: "1..10"
    as: "index"
  request:
    method: GET
    url: "/health"
```

### 🌐 Swagger/OpenAPI Integration
Generate test suites from API specifications:

```bash
# Import OpenAPI 3.0 or Swagger 2.0
flow-test --import-swagger api.json --swagger-output ./tests/api-tests

# Import and run immediately
flow-test --import-swagger api.yaml && flow-test --directory ./tests/api-tests
```

## Getting Started

Ready to start testing? Check out our [Getting Started Guide](getting-started) to set up your first test suite!

## Example Test Suite

Here's a simple example to get you started:

```yaml
suite_name: "User Management API Test"
base_url: "https://jsonplaceholder.typicode.com"

variables:
  user_id: 1

steps:
  - name: "Get User Details"
    request:
      method: GET
      url: "/users/{{user_id}}"

    assert:
      status_code: 200
      body:
        id:
          equals: "{{user_id}}"
        email:
          contains: "@"

    capture:
      username: "body.username"
      email: "body.email"

  - name: "Get User Posts"
    request:
      method: GET
      url: "/users/{{user_id}}/posts"

    assert:
      status_code: 200
      body:
        length:
          greater_than: 0
```

## What's Next?

- **[Getting Started](getting-started)**: Set up your first test
- **[YAML Configuration](yaml-configuration)**: Learn the YAML syntax
- **[Advanced Features](advanced-features)**: Explore powerful features
- **[CLI Reference](cli-reference)**: Command-line options and usage
- **[API Reference](/api)**: Detailed API documentation