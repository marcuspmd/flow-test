---
slug: advanced-features-deep-dive
title: Deep Dive into Advanced Features
authors: [marcus]
tags: [features, advanced, tutorial]
---

# Deep Dive into Flow Test Engine's Advanced Features

Flow Test Engine goes far beyond simple API requests. Today, we'll explore the advanced features that make it a powerful testing framework for complex scenarios.

![Advanced Features](../static/img/flow.png)

## Request Chaining: Building Realistic Test Flows

One of Flow Test Engine's most powerful features is request chaining - the ability to capture data from one request and use it in subsequent requests.

### Real-World Example: E-commerce Flow

```yaml
suite_name: "E-commerce User Journey"
base_url: "https://api.shop.example.com"

steps:
  # Step 1: User Registration
  - name: "Register new user"
    request:
      method: POST
      url: "/auth/register"
      body:
        email: "{{faker.internet.email}}"
        password: "SecurePass123!"
        first_name: "{{faker.person.firstName}}"

    capture:
      user_id: "body.user.id"
      access_token: "body.tokens.access_token"

  # Step 2: Create Shopping Cart
  - name: "Create shopping cart"
    request:
      method: POST
      url: "/cart"
      headers:
        Authorization: "Bearer {{access_token}}"

    capture:
      cart_id: "body.cart.id"

  # Step 3: Add Items and Checkout
  - name: "Add item to cart"
    request:
      method: POST
      url: "/cart/{{cart_id}}/items"
      headers:
        Authorization: "Bearer {{access_token}}"
      body:
        product_id: "PROD-123"
        quantity: 2
```

<!--truncate-->

## Variable Interpolation: Dynamic Test Data

Flow Test Engine supports multiple types of variable interpolation, making your tests flexible and realistic.

### Faker.js Integration

Generate realistic test data automatically:

```yaml
variables:
  # Personal data
  user_email: "{{faker.internet.email}}"
  user_name: "{{faker.person.fullName}}"
  phone: "{{faker.phone.number}}"

  # Business data
  company: "{{faker.company.name}}"
  job_title: "{{faker.person.jobTitle}}"

  # Location data
  address: "{{faker.location.streetAddress}}"
  city: "{{faker.location.city}}"
```

### JavaScript Expressions

Perform complex calculations and logic:

```yaml
steps:
  - name: "Calculate order total"
    request:
      method: POST
      url: "/orders"
      body:
        items: "{{order_items}}"
        # Calculate total with tax
        total: "{{$js.
          const subtotal = order_items.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0);
          const tax = subtotal * 0.08;
          return subtotal + tax;
        }}"
        # Generate order date
        order_date: "{{$js.return new Date().toISOString()}}"
```

## Iteration Patterns: Eliminate Repetitive Tests

### Array Iteration

Test multiple scenarios efficiently:

```yaml
variables:
  test_users:
    - { name: "Alice", role: "admin", active: true }
    - { name: "Bob", role: "user", active: true }
    - { name: "Charlie", role: "guest", active: false }

steps:
  - name: "Test user {{item.name}} permissions"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: GET
      url: "/profile"
      headers:
        X-User-Role: "{{item.role}}"
        X-User-Active: "{{item.active}}"

    assert:
      status_code: "{{item.active ? 200 : 403}}"
```

### Range Iteration

Perfect for load testing:

```yaml
steps:
  - name: "Load test iteration {{index}}"
    iterate:
      range: "1..50"
      as: "index"
    request:
      method: GET
      url: "/api/health"
      headers:
        X-Test-Iteration: "{{index}}"
```

## Conditional Scenarios: Handle Complex Responses

Different APIs can return different response structures. Scenarios let you handle all cases:

```yaml
steps:
  - name: "API call with multiple outcomes"
    request:
      method: GET
      url: "/api/data"

    scenarios:
      # Success with data
      - condition: "status_code == `200` && body.data"
        then:
          capture:
            item_count: "body.data | length(@)"
            items: "body.data"

      # Rate limited
      - condition: "status_code == `429`"
        then:
          capture:
            retry_after: "headers.retry-after"
          # Wait and retry logic could go here

      # Server error
      - condition: "status_code >= `500`"
        then:
          capture:
            error_code: "body.error_code"
            incident_id: "headers.x-incident-id"
```

## Swagger/OpenAPI Integration

Generate comprehensive test suites from your API specifications:

```bash
# Import OpenAPI spec and generate tests
flow-test --import-swagger api-spec.json --swagger-output ./tests/generated

# Generated tests include:
# - All endpoints with proper HTTP methods
# - Request/response schemas
# - Example data
# - Basic assertions
```

Example generated test:

```yaml
suite_name: "Generated API Tests"
base_url: "{{api_base_url}}"

steps:
  - name: "POST /users - Create User"
    request:
      method: POST
      url: "/users"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{faker.person.fullName}}"
        email: "{{faker.internet.email}}"
        age: "{{$js.return Math.floor(Math.random() * 50) + 18}}"

    assert:
      status_code: 201
      body:
        id:
          type: "number"
        name:
          type: "string"
        email:
          regex: "^[\\w\\._%+-]+@[\\w\\.-]+\\.[A-Za-z]{2,}$"
```

## Performance Testing Features

### Response Time Monitoring

```yaml
steps:
  - name: "Performance test critical endpoint"
    request:
      method: GET
      url: "/api/critical-data"

    assert:
      response_time_ms:
        less_than: 500  # Must respond within 500ms
      status_code: 200

    capture:
      actual_response_time: "response_time_ms"
```

### Load Testing Patterns

```yaml
variables:
  concurrent_users: 20
  requests_per_user: 10

steps:
  - name: "Load test - User {{user}} Request {{req}}"
    iterate:
      range: "1..{{concurrent_users}}"
      as: "user"
      nested:
        range: "1..{{requests_per_user}}"
        as: "req"
    request:
      method: GET
      url: "/api/endpoint"
      headers:
        X-User-ID: "{{user}}"
        X-Request-ID: "{{req}}"
```

## Global Variable Registry

Share data between test suites for complex workflows:

```yaml
# In auth-suite.yaml
suite_name: "Authentication Tests"
steps:
  - name: "Login"
    request:
      method: POST
      url: "/login"
    capture:
      auth_token: "body.token"
      user_id: "body.user_id"

exports:
  - auth_token
  - user_id

# In user-suite.yaml
suite_name: "User Tests"
steps:
  - name: "Get user profile"
    request:
      method: GET
      url: "/profile"
      headers:
        Authorization: "Bearer {{auth_suite.auth_token}}"
```

## Best Practices for Advanced Features

### 1. Organize Complex Flows
Break down complex scenarios into logical steps:

```yaml
steps:
  # Setup phase
  - name: "Setup: Create test data"
  - name: "Setup: Authenticate"

  # Test phase
  - name: "Test: Create resource"
  - name: "Test: Verify creation"
  - name: "Test: Update resource"

  # Cleanup phase
  - name: "Cleanup: Delete test data"
```

### 2. Use Meaningful Variable Names
```yaml
# Good
capture:
  user_authentication_token: "body.access_token"
  created_order_id: "body.order.id"

# Avoid
capture:
  token: "body.access_token"
  id: "body.order.id"
```

### 3. Handle Errors Gracefully
```yaml
scenarios:
  - condition: "status_code >= `200` && status_code < `300`"
    then:
      capture:
        success_data: "body.data"

  - condition: "status_code >= `400`"
    then:
      capture:
        error_message: "body.message"
        error_code: "body.code"
```

## What's Next?

These advanced features enable you to create sophisticated test suites that closely mirror real-world usage patterns. Try incorporating these patterns into your test suites and see how they can improve your API testing strategy!

Want to learn more? Check out our [Advanced Features Guide](../docs/advanced-features) for even more examples and patterns.