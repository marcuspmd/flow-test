# Flow Test Generator Skill

Generate advanced Flow Test YAML test suites from code analysis or manual descriptions.

## Purpose

This skill helps generate comprehensive Flow Test Engine test suites by:
- Analyzing API code (Express, NestJS, FastAPI, Flask, etc.)
- Understanding endpoint structures and data flows
- Creating sophisticated tests with all Flow Test features
- Following best practices and patterns

## Complete YAML Reference

Before generating tests, read the complete Flow Test YAML reference:
- File: `flow-test-reference.md` (in this same directory)
- Contains all syntax, features, and examples

## When to Use This Skill

Use this skill when:
- User wants to generate Flow Test YAML files
- User asks for API test creation
- User mentions "flow test", "API testing", "test generation"
- User provides API code or endpoint descriptions

## How It Works

### 1. Understand the Context

First, gather information:

**From Code Analysis:**
- Search for API routes/endpoints in the codebase
- Identify the framework (Express, NestJS, FastAPI, etc.)
- Extract route handlers, request/response schemas
- Identify authentication patterns
- Find related test files for inspiration

**From Manual Description:**
- Ask clarifying questions about the API
- Understand endpoint purposes and flows
- Identify dependencies between endpoints
- Determine authentication requirements

### 2. Framework Detection

Detect the API framework to understand patterns:

**Express.js**
```javascript
app.get('/users/:id', (req, res) => {})
app.post('/users', (req, res) => {})
router.put('/users/:id', (req, res) => {})
```

**NestJS**
```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  @Post()
  @Put(':id')
}
```

**FastAPI (Python)**
```python
@app.get("/users/{user_id}")
@app.post("/users")
async def create_user()
```

**Flask (Python)**
```python
@app.route('/users/<int:user_id>', methods=['GET'])
@app.route('/users', methods=['POST'])
```

### 3. Extract Endpoint Information

For each endpoint, identify:

- **HTTP Method**: GET, POST, PUT, DELETE, PATCH
- **URL Path**: Including path parameters
- **Headers**: Authorization, Content-Type, etc.
- **Request Body**: Schema/structure
- **Response**: Expected status codes and body structure
- **Authentication**: Required tokens, API keys
- **Dependencies**: Other endpoints that must run first

### 4. Generate Test Structure

Create a comprehensive test suite following this structure:

```yaml
node_id: "generated-test-suite"
suite_name: "API Test Suite"
description: "Auto-generated from code analysis"
base_url: "{{base_url}}"

variables:
  # Extract from code or ask user

depends:
  # Identify dependencies

steps:
  # Generate steps for each endpoint
```

### 5. Generate Advanced Features

Always include advanced features when appropriate:

**Authentication Flow**
```yaml
steps:
  - name: "Authenticate"
    request:
      method: "POST"
      url: "/auth/login"
      body:
        username: "{{test_username}}"
        password: "{{test_password}}"
    capture:
      auth_token: "body.token"
    metadata:
      priority: "critical"
      tags: ["auth", "setup"]
```

**Request Chaining**
```yaml
  - name: "Create resource"
    request:
      method: "POST"
      url: "/api/items"
      headers:
        Authorization: "Bearer {{auth_token}}"
    capture:
      item_id: "body.id"

  - name: "Verify created resource"
    request:
      method: "GET"
      url: "/api/items/{{item_id}}"
    metadata:
      depends_on: ["Create resource"]
```

**Comprehensive Assertions**
```yaml
assert:
  status_code: 200
  body:
    id:
      type: "number"
      greater_than: 0
      exists: true
    email:
      type: "string"
      regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
    created_at:
      type: "string"
      notEmpty: true
    items:
      type: "array"
      length:
        greater_than: 0
  response_time_ms:
    less_than: 2000
```

**Scenarios for Different Paths**
```yaml
scenarios:
  - name: "Admin user"
    condition: "body.role == 'admin'"
    then:
      assert:
        body:
          permissions:
            type: "array"
            contains: "admin_access"
      capture:
        admin_permissions: "body.permissions"
    else:
      assert:
        body:
          permissions:
            type: "array"
            notEmpty: true
```

**Iterations for Data-Driven Tests**
```yaml
iterate:
  over: "{{test_cases}}"
  as: "test_case"
request:
  method: "{{test_case.method}}"
  url: "{{test_case.url}}"
assert:
  status_code: "{{test_case.expected_status}}"
```

### 6. Type Inference

Infer assertion types from code:

**TypeScript/JavaScript**
```typescript
interface User {
  id: number;        // → type: "number"
  email: string;     // → type: "string", regex for email
  active: boolean;   // → type: "boolean"
  roles: string[];   // → type: "array"
  profile: {         // → type: "object"
    name: string;
  }
}
```

**Python (with type hints)**
```python
class User(BaseModel):
    id: int              # → type: "number"
    email: EmailStr      # → type: "string", regex
    active: bool         # → type: "boolean"
    roles: List[str]     # → type: "array"
```

Generate corresponding assertions:
```yaml
assert:
  body:
    id:
      type: "number"
      greater_than: 0
    email:
      type: "string"
      regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
    active:
      type: "boolean"
    roles:
      type: "array"
      notEmpty: true
    profile:
      type: "object"
      exists: true
```

### 7. Common Patterns to Generate

**CRUD Operations**
```yaml
steps:
  - name: "Create {{resource}}"
    request:
      method: "POST"
      url: "/api/{{resource}}"
    capture:
      "{{resource}}_id": "body.id"

  - name: "Read {{resource}}"
    request:
      method: "GET"
      url: "/api/{{resource}}/{{{{resource}}_id}}"

  - name: "Update {{resource}}"
    request:
      method: "PUT"
      url: "/api/{{resource}}/{{{{resource}}_id}}"

  - name: "Delete {{resource}}"
    request:
      method: "DELETE"
      url: "/api/{{resource}}/{{{{resource}}_id}}"
```

**Pagination**
```yaml
  - name: "Test pagination"
    iterate:
      range: "1..3"
      as: "page"
    request:
      method: "GET"
      url: "/api/items"
      params:
        page: "{{page}}"
        limit: 10
```

**Error Handling**
```yaml
  - name: "Test validation error"
    request:
      method: "POST"
      url: "/api/users"
      body:
        email: "invalid"
    assert:
      status_code: 400
      body:
        error:
          exists: true
```

### 8. Use Faker.js for Test Data

Generate realistic test data:

```yaml
variables:
  test_user_name: "{{$faker.person.firstName}}"
  test_user_email: "{{$faker.internet.email}}"
  test_company: "{{$faker.company.name}}"
  test_phone: "{{$faker.phone.number}}"
  test_address: "{{$faker.location.streetAddress}}"
  test_uuid: "{{$faker.string.uuid}}"
  test_number: "{{$faker.number.int}}"
```

### 9. Add Metadata and Tags

Always include comprehensive metadata:

```yaml
metadata:
  priority: "high"  # Determine from endpoint importance
  tags:
    - integration
    - {{resource_name}}
    - {{http_method | lower}}
  timeout: 30000
  retry:
    max_attempts: 3
    delay_ms: 1000
  description: "Auto-generated test for {{endpoint_description}}"
```

### 10. Dependencies and Exports

Identify and configure dependencies:

```yaml
# If this suite needs auth
depends:
  - path: "./auth/login.yaml"
    required: true
    cache: 300

# Export variables for other suites
exports:
  - auth_token
  - user_id
  - created_resource_id
```

## Step-by-Step Generation Process

1. **Analyze or Ask**
   - Search codebase for routes/controllers
   - Or ask user for endpoint details

2. **Identify Framework**
   - Detect from code patterns
   - Understand route syntax

3. **Extract Endpoints**
   - List all routes
   - Get methods, paths, handlers

4. **Analyze Schemas**
   - Find request/response types
   - Infer validation rules

5. **Determine Flow**
   - Identify auth requirements
   - Map dependencies between endpoints
   - Plan execution order

6. **Generate Suite Structure**
   - Create node_id and suite_name
   - Set base_url
   - Define variables

7. **Generate Steps**
   - One step per endpoint (or logical operation)
   - Include request details
   - Add comprehensive assertions
   - Add capture for IDs/tokens
   - Include scenarios where appropriate

8. **Add Advanced Features**
   - Iterations for pagination/bulk operations
   - Scenarios for conditional logic
   - Cross-suite calls if needed
   - Input prompts if interactive

9. **Add Metadata**
   - Set priorities
   - Add tags
   - Configure retries
   - Add descriptions

10. **Review and Refine**
    - Ensure all features are used appropriately
    - Verify variable interpolation
    - Check assertion completeness
    - Validate YAML syntax

## Quality Checklist

Before presenting generated tests, verify:

- [ ] All endpoints are covered
- [ ] Authentication is properly handled
- [ ] Variables are captured and reused
- [ ] Assertions are comprehensive (status, body, headers, timing)
- [ ] Error cases are tested
- [ ] Scenarios are used for conditional logic
- [ ] Dependencies are properly configured
- [ ] Faker.js is used for dynamic data
- [ ] Metadata includes priority and tags
- [ ] YAML syntax is valid
- [ ] File follows naming conventions (`*-test.yaml` or `*-spec.yaml`)

## Example Interaction Flows

### Flow 1: Code Analysis

```
User: "Generate flow tests for my user API"
Assistant (Skill):
1. Search codebase for user-related files
2. Find routes/controllers
3. Analyze endpoint structure
4. Generate comprehensive test suite

Step 1: Search for user API code
[Uses Glob/Grep to find user routes]

Step 2: Analyze endpoints
Found:
- POST /api/users (create)
- GET /api/users/:id (read)
- PUT /api/users/:id (update)
- DELETE /api/users/:id (delete)

Step 3: Generate test suite
[Creates user-api-test.yaml with:
- Full CRUD flow
- Authentication
- Comprehensive assertions
- Variable capture
- Error handling
]
```

### Flow 2: Manual Description

```
User: "Create tests for a login endpoint that takes email and password, returns a token"

Assistant (Skill):
1. Ask clarifying questions:
   - What's the endpoint URL?
   - What HTTP method?
   - What's the response format?
   - Any specific error cases to test?

2. User provides details:
   - URL: /auth/login
   - Method: POST
   - Response: { "token": "...", "user": {...} }
   - Errors: 401 for invalid credentials

3. Generate test suite with:
   - Happy path (successful login)
   - Error case (invalid credentials)
   - Token capture for future use
   - Comprehensive assertions
```

### Flow 3: Complete Application

```
User: "Generate complete test suite for my e-commerce API"

Assistant (Skill):
1. Discover all endpoints across codebase
2. Group by domain (products, cart, orders, users, etc.)
3. Identify dependencies (auth → cart → checkout)
4. Generate multiple YAML files:
   - auth-test.yaml (authentication)
   - products-test.yaml (product catalog)
   - cart-test.yaml (shopping cart, depends on auth)
   - checkout-test.yaml (checkout flow, depends on cart)
5. Configure inter-suite dependencies
6. Add comprehensive test coverage
```

## Best Practices

### Naming Conventions

```
# File names
user-api-test.yaml
auth-flow-test.yaml
e-commerce-checkout-spec.yaml

# Node IDs (lowercase, hyphenated)
node_id: "user-api-tests"
node_id: "auth-flow"
node_id: "e-commerce-checkout"

# Step names (descriptive, title case)
name: "Create User Account"
name: "Login With Valid Credentials"
name: "Verify Cart Total Calculation"
```

### Variable Organization

```yaml
# Global config-level variables
variables:
  base_url: "{{$env.API_URL}}"
  api_version: "v1"

# Suite-level variables (test data)
variables:
  test_username: "{{$faker.internet.userName}}"
  test_email: "{{$faker.internet.email}}"
  admin_role: "admin"

# Runtime variables (captured during execution)
# These are captured via the 'capture' directive
```

### Prioritization

```yaml
# Critical - Must pass, auth/setup flows
metadata:
  priority: "critical"

# High - Important business logic
metadata:
  priority: "high"

# Medium - Standard features
metadata:
  priority: "medium"

# Low - Nice-to-have, edge cases
metadata:
  priority: "low"
```

### Tagging Strategy

```yaml
metadata:
  tags:
    - integration         # Test type
    - user-management     # Domain
    - post                # HTTP method
    - smoke               # Test suite
    - regression          # Test suite
    - happy-path          # Scenario type
```

## Common Issues to Avoid

1. **Missing Variable Interpolation**
   ```yaml
   # ❌ Bad
   url: "/users/user_id"

   # ✅ Good
   url: "/users/{{user_id}}"
   ```

2. **Incomplete Assertions**
   ```yaml
   # ❌ Bad - Only status
   assert:
     status_code: 200

   # ✅ Good - Comprehensive
   assert:
     status_code: 200
     body:
       id: { type: "number", exists: true }
       email: { type: "string", regex: "..." }
     response_time_ms: { less_than: 2000 }
   ```

3. **Not Capturing IDs**
   ```yaml
   # ❌ Bad - Can't use in next step
   - name: "Create user"
     request:
       method: "POST"
       url: "/users"

   # ✅ Good - Capture for reuse
   - name: "Create user"
     request:
       method: "POST"
       url: "/users"
     capture:
       user_id: "body.id"
   ```

4. **Missing Dependencies**
   ```yaml
   # ❌ Bad - Auth not configured
   node_id: "protected-endpoints"
   steps:
     - name: "Get user data"
       request:
         headers:
           Authorization: "Bearer {{auth_token}}"  # Where does this come from?

   # ✅ Good - Explicit dependency
   node_id: "protected-endpoints"
   depends:
     - path: "./auth/login.yaml"
       required: true
   steps:
     - name: "Get user data"
       request:
         headers:
           Authorization: "Bearer {{auth_token}}"
   ```

5. **Hardcoded Values**
   ```yaml
   # ❌ Bad
   variables:
     test_email: "test@example.com"  # Same every time

   # ✅ Good
   variables:
     test_email: "{{$faker.internet.email}}"  # Dynamic
   ```

## Templates Reference

The skill includes ready-to-use templates for common patterns:

1. **auth-template.yaml** - Authentication and token management
2. **crud-template.yaml** - Complete CRUD operations
3. **pagination-template.yaml** - Pagination testing
4. **error-handling-template.yaml** - Error scenarios
5. **complex-workflow-template.yaml** - Multi-step workflows with dependencies

See the `templates/` directory for full examples.

## Output Format

When generating tests, always:

1. **Explain what you're doing**
   ```
   "I'll generate a comprehensive Flow Test suite for your user API.
   First, let me analyze the codebase to understand your endpoints..."
   ```

2. **Show analysis summary**
   ```
   "Found 4 endpoints:
   - POST /api/users - Create user
   - GET /api/users/:id - Get user
   - PUT /api/users/:id - Update user
   - DELETE /api/users/:id - Delete user"
   ```

3. **Present the generated YAML**
   ```yaml
   # Complete, ready-to-use YAML file
   ```

4. **Explain features used**
   ```
   "This test suite includes:
   ✅ Authentication flow with token capture
   ✅ Complete CRUD operations with variable chaining
   ✅ Comprehensive assertions for all fields
   ✅ Error case testing
   ✅ Faker.js for dynamic test data
   ✅ Priority tagging for execution control"
   ```

5. **Provide usage instructions**
   ```
   "To run these tests:
   1. Save as tests/user-api-test.yaml
   2. Update base_url in flow-test.config.yml
   3. Run: fest tests/user-api-test.yaml"
   ```

## Summary

This skill generates production-ready Flow Test YAML files that:
- Leverage all advanced features (scenarios, iterations, captures, etc.)
- Follow best practices and naming conventions
- Include comprehensive assertions and error handling
- Are maintainable and well-documented
- Can be immediately executed

Always strive for completeness and quality over speed. It's better to generate one excellent, comprehensive test suite than multiple basic ones.
