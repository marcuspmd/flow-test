---
slug: swagger-openapi-integration
title: Swagger/OpenAPI Integration - Generate Tests Automatically
authors: [marcus]
tags: [swagger, openapi, automation, integration]
---

# Swagger/OpenAPI Integration: From Spec to Tests in Seconds

One of Flow Test Engine's most powerful features is its ability to automatically generate comprehensive test suites from your OpenAPI/Swagger specifications. Let's explore how this feature can revolutionize your API testing workflow.

![Swagger Integration](../static/img/test-iterator.png)

## Why Swagger/OpenAPI Integration Matters

API specifications are the single source of truth for your API contract, but they often become outdated or disconnected from actual testing. Flow Test Engine's Swagger integration bridges this gap by:

- **Automatically generating tests** from your API specification
- **Ensuring specification compliance** with real API behavior
- **Reducing manual test creation** time by 80%+
- **Maintaining consistency** between documentation and tests

## Getting Started with Swagger Import

### Basic Import

The simplest way to generate tests from your API specification:

```bash
# Import from local file
flow-test --import-swagger api-spec.json

# Import from URL
flow-test --import-swagger https://api.example.com/swagger.json

# Specify custom output directory
flow-test --import-swagger api-spec.yaml --swagger-output ./tests/api-v2
```

<!--truncate-->

## What Gets Generated

Flow Test Engine analyzes your Swagger/OpenAPI specification and automatically creates:

### 1. Complete Test Suites
Each API endpoint becomes a test step with realistic data:

```yaml
# Generated from: POST /users
suite_name: "User Management API - Generated Tests"
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
        address:
          street: "{{faker.location.streetAddress}}"
          city: "{{faker.location.city}}"
          zipCode: "{{faker.location.zipCode}}"

    assert:
      status_code: 201
      headers:
        content-type:
          contains: "application/json"
      body:
        id:
          type: "number"
        name:
          type: "string"
        email:
          regex: "^[\\w\\._%+-]+@[\\w\\.-]+\\.[A-Za-z]{2,}$"
```

### 2. Schema Validation
Automatic assertions based on response schemas:

```yaml
# From OpenAPI schema:
# User:
#   type: object
#   properties:
#     id: { type: integer }
#     name: { type: string, minLength: 1 }
#     email: { type: string, format: email }
#     active: { type: boolean, default: true }

assert:
  body:
    id:
      type: "number"
      exists: true
    name:
      type: "string"
      not_equals: ""
    email:
      regex: "^[\\w\\._%+-]+@[\\w\\.-]+\\.[A-Za-z]{2,}$"
    active:
      type: "boolean"
```

### 3. Realistic Test Data
Smart data generation based on field names and schemas:

```yaml
# Automatically detects field types and generates appropriate data
body:
  # String fields
  firstName: "{{faker.person.firstName}}"
  lastName: "{{faker.person.lastName}}"
  email: "{{faker.internet.email}}"
  phone: "{{faker.phone.number}}"

  # Number fields
  age: "{{$js.return Math.floor(Math.random() * 50) + 18}}"
  salary: "{{$js.return Math.floor(Math.random() * 100000) + 30000}}"

  # Date fields
  birthDate: "{{faker.date.past}}"
  hireDate: "{{faker.date.recent}}"

  # Boolean fields
  active: true
  verified: "{{$js.return Math.random() > 0.5}}"
```

## Advanced Generation Features

### Custom Data Mapping

Control how specific fields are generated:

```yaml
# swagger-config.yml
data_mapping:
  # Custom generators for specific field names
  field_mappings:
    user_id: "{{$js.return Math.floor(Math.random() * 1000) + 1}}"
    api_key: "test-api-key-{{$uuid}}"
    status: "active"

  # Type-based generators
  type_mappings:
    string:
      minLength_5: "{{faker.lorem.words(2)}}"
      format_email: "{{faker.internet.email}}"
      format_uri: "{{faker.internet.url}}"

  # Pattern-based generators
  pattern_mappings:
    "^[A-Z]{2,3}-\\d{4}$": "ABC-1234"
    "^\\d{4}-\\d{2}-\\d{2}$": "{{$js.return new Date().toISOString().split('T')[0]}}"
```

### Request Dependencies

Generate realistic request flows with dependencies:

```yaml
# Generated test suite with chained requests
suite_name: "User Management Flow - Generated"

steps:
  - name: "Create User"
    request:
      method: POST
      url: "/users"
      body:
        name: "{{faker.person.fullName}}"
        email: "{{faker.internet.email}}"

    capture:
      created_user_id: "body.id"

  - name: "Get Created User"
    request:
      method: GET
      url: "/users/{{created_user_id}}"

    assert:
      status_code: 200
      body:
        id:
          equals: "{{created_user_id}}"

  - name: "Update User"
    request:
      method: PUT
      url: "/users/{{created_user_id}}"
      body:
        name: "{{faker.person.fullName}}"

  - name: "Delete User"
    request:
      method: DELETE
      url: "/users/{{created_user_id}}"
```

## Real-World Example: E-commerce API

Let's look at a complete example using a typical e-commerce API specification:

### OpenAPI Specification (Excerpt)
```yaml
# api-spec.yaml
openapi: 3.0.0
info:
  title: E-commerce API
  version: 1.0.0

paths:
  /products:
    post:
      summary: Create Product
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'

  /orders:
    post:
      summary: Create Order
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderCreate'

components:
  schemas:
    ProductCreate:
      type: object
      required: [name, price, category]
      properties:
        name: { type: string, minLength: 1 }
        price: { type: number, minimum: 0 }
        category: { type: string }
        description: { type: string }

    Product:
      allOf:
        - $ref: '#/components/schemas/ProductCreate'
        - type: object
          properties:
            id: { type: integer }
            created_at: { type: string, format: date-time }
```

### Generated Test Suite
```bash
flow-test --import-swagger api-spec.yaml --swagger-output ./tests/ecommerce
```

This generates comprehensive test files:

```yaml
# ./tests/ecommerce/products-test.yaml
suite_name: "Products API - Generated Tests"
base_url: "{{api_base_url}}"

variables:
  test_product_name: "{{faker.commerce.productName}}"
  test_price: "{{$js.return (Math.random() * 100 + 10).toFixed(2)}}"

steps:
  - name: "Create Product - Valid Data"
    request:
      method: POST
      url: "/products"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{test_product_name}}"
        price: "{{test_price}}"
        category: "{{faker.commerce.department}}"
        description: "{{faker.commerce.productDescription}}"

    assert:
      status_code: 201
      headers:
        content-type:
          contains: "application/json"
      body:
        id:
          type: "number"
          exists: true
        name:
          equals: "{{test_product_name}}"
        price:
          equals: "{{test_price}}"
        category:
          type: "string"
        created_at:
          regex: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"

    capture:
      created_product_id: "body.id"

  - name: "Create Product - Missing Required Field"
    request:
      method: POST
      url: "/products"
      headers:
        Content-Type: "application/json"
      body:
        price: 29.99
        category: "Electronics"
        # Missing required 'name' field

    assert:
      status_code: 400
      body:
        error:
          exists: true
```

## Best Practices for Swagger Integration

### 1. Maintain Clean Specifications
Well-structured OpenAPI specs generate better tests:

```yaml
# Good: Detailed schema with validation
ProductCreate:
  type: object
  required: [name, price, category]
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 100
      example: "Wireless Headphones"
    price:
      type: number
      minimum: 0
      maximum: 10000
      example: 99.99
    category:
      type: string
      enum: [electronics, clothing, books, home]
```

### 2. Use Meaningful Examples
Examples in your spec become test data:

```yaml
# Swagger spec with examples
requestBody:
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/User'
      examples:
        admin_user:
          summary: "Admin User Example"
          value:
            name: "Admin User"
            email: "admin@example.com"
            role: "admin"
        regular_user:
          summary: "Regular User Example"
          value:
            name: "John Doe"
            email: "john@example.com"
            role: "user"
```

### 3. Customize Generated Tests
After generation, enhance tests with specific scenarios:

```yaml
# Add to generated tests
steps:
  # Generated step
  - name: "Create User - Generated"
    # ... generated content

  # Custom enhancement
  - name: "Create User - Edge Case: Long Name"
    request:
      method: POST
      url: "/users"
      body:
        name: "{{$js.return 'a'.repeat(255)}}"  # Test max length
        email: "{{faker.internet.email}}"

    assert:
      status_code: 400  # Expecting validation error
```

## Integration with CI/CD

Automate test generation in your CI pipeline:

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    paths:
      - 'api-spec.yaml'
      - 'src/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Generate Tests from Swagger
        run: |
          flow-test --import-swagger api-spec.yaml --swagger-output ./tests/generated

      - name: Run Generated Tests
        run: |
          flow-test --directory ./tests/generated --tag generated

      - name: Run Manual Tests
        run: |
          flow-test --directory ./tests/manual --tag integration
```

## Advanced Scenarios

### Multiple API Versions
Handle multiple API versions with organized test suites:

```bash
# Generate tests for different API versions
flow-test --import-swagger api-v1.yaml --swagger-output ./tests/api-v1
flow-test --import-swagger api-v2.yaml --swagger-output ./tests/api-v2

# Run version-specific tests
flow-test --directory ./tests/api-v1 --tag v1
flow-test --directory ./tests/api-v2 --tag v2
```

### Microservices Testing
Generate tests for multiple services:

```bash
# Generate tests for each microservice
flow-test --import-swagger user-service.yaml --swagger-output ./tests/user-service
flow-test --import-swagger order-service.yaml --swagger-output ./tests/order-service
flow-test --import-swagger payment-service.yaml --swagger-output ./tests/payment-service

# Run comprehensive microservices test
flow-test --directory ./tests --tag microservices
```

## Conclusion

Swagger/OpenAPI integration in Flow Test Engine transforms your API specifications into comprehensive test suites, ensuring your API implementation matches your documentation. This automation saves time, reduces errors, and maintains consistency between your API contract and actual behavior.

Ready to try it? Start with our [CLI Reference](../docs/cli-reference) to learn more about the import options, or check out the [complete examples](https://github.com/marcuspmd/flow-test/tree/main/tests) in our repository!