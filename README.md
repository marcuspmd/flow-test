# Flow Test - TypeScript API Testing Engine

Advanced and configurable API testing engine, built with TypeScript and Node.js. Allows creating complex test flows declaratively using YAML files, with support for request chaining, conditional scenarios, flow imports, and detailed reports.

## ✨ Main Features

### 🔗 **Advanced Test Flows**
- **Request Chaining**: Capture values from one response (tokens, IDs, etc.) and use them in subsequent requests
- **Flow Imports**: Reuse complete flows from other YAML files for modularity
- **Conditional Scenarios**: Implement happy paths and sad paths based on dynamic conditions
- **Contextual Variables**: Hierarchical variable system (global, imported, suite, runtime)

### 🧪 **Robust Assertion System**
- **Multiple Types**: status_code, body, headers, response_time
- **Advanced Operators**: equals, contains, not_equals, greater_than, less_than, regex
- **Flexible Syntaxes**: Support for flat syntax (`body.status: "success"`) and structured syntax
- **Nested Validation**: Access to deep fields (`body.data.user.email`)

### 📊 **Reports and Logging**
- **Multiple Formats**: JSON, Console, HTML
- **Verbosity Levels**: Silent, Simple, Detailed, Verbose
- **Automatic Logs**: Automatic generation with timestamps and suite-based names
- **Performance Analysis**: Response time and size metrics

### 🏗️ **Modular Architecture**
- **Specialized Services**: HTTP, Assertions, Capture, Variables, Flow, Scenarios
- **TypeScript Strict**: Strict typing and well-defined contracts
- **Extensibility**: Easy addition of new features

## 🚀 Installation and Configuration

### Prerequisites
- Node.js 18.x or higher
- npm (included with Node.js)

### Installation
```bash
# Clone the repository
git clone https://github.com/marcuspmd/flow-test.git

# Navigate to the directory
cd flow-test

# Install dependencies
npm install
```

## 📖 How to Use

### Basic Execution
```bash
# Execute the default file (tests/start-flow.yaml)
npm start

# Execute a specific file
npm start tests/start-flow.yaml

# With detailed verbosity
npm start tests/start-flow.yaml --detailed
```

### Command Line Options
```bash
# Verbosity options
npm start meu-teste.yaml --verbose    # Complete details (req/res)
npm start meu-teste.yaml --detailed   # Detailed information
npm start meu-teste.yaml --simple     # Basic progress (default)
npm start meu-teste.yaml --silent     # Only errors

# Execution control
npm start meu-teste.yaml --continue   # Continue even with failures
npm start meu-teste.yaml --timeout 60 # 60 second timeout

# Output and format
npm start meu-teste.yaml --no-log     # Don't generate log file
npm start meu-teste.yaml --output results/custom.json
npm start meu-teste.yaml --format json|console|html

# Help
npm start --help
```

## � Documentation

### �📋 Complete Examples
- **[Documentation Index](./docs/INDEX.md)**: Complete navigation guide for all documentation resources organized by user type and use case.
- **[YAML Examples](./docs/YAML_EXAMPLES.md)**: Comprehensive collection of YAML test suite examples covering authentication, CRUD operations, data-driven testing, error handling, performance testing, and advanced scenarios.
- **[API Documentation](./docs/API_DOCUMENTATION.md)**: Detailed API reference with usage examples for all services and components.
- **[Best Practices](./docs/BEST_PRACTICES.md)**: Guidelines for writing maintainable, scalable test suites with proven patterns and recommendations.
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)**: Comprehensive guide for diagnosing and resolving common issues, debugging techniques, and performance optimization.
- **[Configuration Guide](./docs/CONFIGURATION.md)**: Complete configuration examples for different environments, CI/CD integration, and performance tuning.
- **[Automation Scripts](./docs/AUTOMATION.md)**: Ready-to-use scripts for test execution, parallel testing, performance testing, and CI/CD integration.
- **[Changelog](./CHANGELOG.md)**: Complete history of changes, new features, and improvements.
- **[Enhancement Summary](./docs/ENHANCEMENT_SUMMARY.md)**: Overview of all documentation improvements and new features.

### Quick Start Examples

### 1. Basic API Test Flow
```yaml
# File: tests/basic-api-test.yaml
suite_name: "Basic API Test"
base_url: "https://jsonplaceholder.typicode.com"

variables:
  user_id: 1

steps:
  - name: "Get user data"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        id:
          equals: 1
        name:
          contains: "Leanne"

    capture:
      user_email: "body.email"
      user_name: "body.name"

  - name: "Create new post"
    request:
      method: POST
      url: "/posts"
      headers:
        Content-Type: "application/json"
      body:
        title: "Test Post"
        body: "This is a test post by {{user_name}}"
        userId: "{{user_id}}"

    assert:
      status_code: 201
      body:
        id:
          greater_than: 100

    capture:
      post_id: "body.id"
```

### 2. Authentication Flow with Token Management
```yaml
# File: tests/auth-flow.yaml
suite_name: "Authentication Flow"
base_url: "https://api.example.com"

# Export variables for use in other flows
exports: ["auth_token", "user_id", "refresh_token"]

variables:
  username: "test@example.com"
  password: "secure_password"

steps:
  - name: "User Login"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{username}}"
        password: "{{password}}"

    assert:
      status_code: 200
      body:
        success: true
        token:
          regex: "^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$"

    capture:
      auth_token: "body.token"
      user_id: "body.user.id"
      refresh_token: "body.refresh_token"

  - name: "Verify Token"
    request:
      method: GET
      url: "/auth/verify"
      headers:
        Authorization: "Bearer {{auth_token}}"

    assert:
      status_code: 200
      body:
        valid: true
        user_id:
          equals: "{{user_id}}"
```

### 3. E-commerce Flow with Multiple Scenarios
```yaml
# File: tests/ecommerce-flow.yaml
suite_name: "E-commerce Purchase Flow"
base_url: "https://api.store.com"

imports:
  - name: "auth"
    path: "./auth-flow.yaml"
    variables:
      username: "customer@example.com"

variables:
  product_id: "PROD-123"
  quantity: 2

steps:
  - name: "Add to Cart"
    request:
      method: POST
      url: "/cart/items"
      headers:
        Authorization: "Bearer {{auth.auth_token}}"
        Content-Type: "application/json"
      body:
        product_id: "{{product_id}}"
        quantity: "{{quantity}}"

    assert:
      status_code: 201
      body:
        cart_id:
          regex: "^CART-[0-9]+$"
        total_items:
          equals: "{{quantity}}"

    capture:
      cart_id: "body.cart_id"
      item_price: "body.items[0].price"

  - name: "Checkout Process"
    request:
      method: POST
      url: "/checkout"
      headers:
        Authorization: "Bearer {{auth.auth_token}}"
        Content-Type: "application/json"
      body:
        cart_id: "{{cart_id}}"
        shipping_address:
          street: "123 Main St"
          city: "Anytown"
          zip: "12345"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body:
              order_id:
                regex: "^ORD-[0-9]+$"
              status: "confirmed"
              total_amount:
                greater_than: 0
          capture:
            order_id: "body.order_id"
            order_status: "body.status"

      - condition: "status_code == `400`"
        then:
          assert:
            body:
              error: "insufficient_inventory"
          capture:
            error_code: "body.error_code"
            available_quantity: "body.available_quantity"
```

### 4. Data-Driven Testing with Multiple Test Cases
```yaml
# File: tests/data-driven-test.yaml
suite_name: "Data Driven User Registration"
base_url: "https://api.users.com"

variables:
  test_cases:
    - name: "valid_user"
      email: "john.doe@example.com"
      password: "SecurePass123!"
      expected_status: 201
    - name: "invalid_email"
      email: "invalid-email"
      password: "SecurePass123!"
      expected_status: 400
    - name: "weak_password"
      email: "jane.doe@example.com"
      password: "123"
      expected_status: 400

steps:
  - name: "Register User - {{test_cases[0].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{test_cases[0].email}}"
        password: "{{test_cases[0].password}}"

    assert:
      status_code: "{{test_cases[0].expected_status}}"

    scenarios:
      - condition: "status_code == `201`"
        then:
          capture:
            user_id: "body.user_id"
            registration_token: "body.token"

      - condition: "status_code == `400`"
        then:
          capture:
            error_message: "body.message"

  - name: "Register User - {{test_cases[1].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{test_cases[1].email}}"
        password: "{{test_cases[1].password}}"

    assert:
      status_code: "{{test_cases[1].expected_status}}"
      body:
        message:
          contains: "invalid email"

  - name: "Register User - {{test_cases[2].name}}"
    request:
      method: POST
      url: "/users/register"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{test_cases[2].email}}"
        password: "{{test_cases[2].password}}"

    assert:
      status_code: "{{test_cases[2].expected_status}}"
      body:
        message:
          contains: "password too weak"
```

### 5. Performance Testing with Response Time Validation
```yaml
# File: tests/performance-test.yaml
suite_name: "API Performance Test"
base_url: "https://api.performance.com"

variables:
  concurrent_users: 10
  test_duration: 60

steps:
  - name: "Health Check"
    request:
      method: GET
      url: "/health"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 100
      body:
        status: "healthy"

  - name: "Database Query Performance"
    request:
      method: GET
      url: "/users?limit=100&page=1"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Accept: "application/json"

    assert:
      status_code: 200
      response_time_ms:
        less_than: 500
      body:
        data:
          length:
            equals: 100

    capture:
      query_time: "response_time_ms"

  - name: "File Upload Performance"
    request:
      method: POST
      url: "/files/upload"
      headers:
        Authorization: "Bearer {{auth_token}}"
        Content-Type: "multipart/form-data"
      body:
        file: "@test-file-1MB.jpg"
        metadata:
          name: "performance_test.jpg"
          size: 1048576

    assert:
      status_code: 201
      response_time_ms:
        less_than: 2000
      body:
        upload_id:
          regex: "^UPLOAD-[0-9]+$"

    capture:
      upload_time: "response_time_ms"
      file_url: "body.url"
```

### 6. Error Handling and Recovery Flow
```yaml
# File: tests/error-handling-test.yaml
suite_name: "Error Handling and Recovery"
base_url: "https://api.unreliable.com"

variables:
  max_retries: 3
  retry_delay: 1000

steps:
  - name: "Test Circuit Breaker Pattern"
    request:
      method: GET
      url: "/unstable-endpoint"
      headers:
        Accept: "application/json"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body:
              data:
                not_equals: null
          capture:
            response_data: "body.data"

      - condition: "status_code >= `500`"
        then:
          assert:
            status_code:
              greater_than: 499
          capture:
            error_code: "status_code"
            retry_after: "headers.retry-after || '60'"

  - name: "Graceful Degradation"
    request:
      method: GET
      url: "/fallback-endpoint"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      body:
        fallback_mode: true
        limited_data: true

    capture:
      fallback_data: "body.data"

  - name: "Recovery Test"
    request:
      method: POST
      url: "/recovery-test"
      headers:
        Content-Type: "application/json"
      body:
        previous_error: "{{error_code}}"
        fallback_data: "{{fallback_data}}"

    assert:
      status_code: 200
      body:
        recovery_successful: true
```

## 📋 YAML File Structure

### Basic Structure
```yaml
suite_name: "Test Suite Name"
base_url: "https://api.exemplo.com/v1"  # Optional

# Imports from other flows (optional)
imports:
  - name: "setup"
    path: "./setup-flow.yaml"
    variables:
      env: "development"

# Global variables (optional)
variables:
  user_email: "teste@exemplo.com"
  api_key: "sk-test-123"

# Flow steps
steps:
  - name: "Step Name"
    request:
      method: POST
      url: "/endpoint"
      headers:
        Content-Type: "application/json"
        Authorization: "Bearer {{token}}"
      body:
        email: "{{user_email}}"

    assert:
      status_code: 200
      body:
        status:
          equals: "success"

    capture:
      user_id: "body.data.id"

    continue_on_failure: false  # Optional
```

### Assertion Syntaxes

#### Flat Syntax (Recommended for simple cases)
```yaml
assert:
  status_code: 200
  body.status: "success"
  body.data.email: "user@test.com"
  headers.content-type: "application/json"
```

#### Structured Syntax (For complex validations)
```yaml
assert:
  status_code: 200
  body:
    status:
      equals: "success"
    data:
      count:
        greater_than: 0
      email:
        regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
  headers:
    content-type:
      contains: "application/json"
  response_time_ms:
    less_than: 1000
```

#### Available Operators
- `equals`: Exact equality
- `contains`: Contains substring/element
- `not_equals`: Different from
- `greater_than`: Greater than (numbers)
- `less_than`: Less than (numbers)
- `regex`: Regex matching

### Conditional Scenarios
```yaml
steps:
  - name: "Login with multiple scenarios"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"

    scenarios:
      # Happy Path
      - condition: "status_code == `200`"
        then:
          assert:
            body.status: "success"
          capture:
            auth_token: "body.data.token"

      # Sad Path
      - condition: "status_code == `401`"
        then:
          assert:
            body.error: "invalid_credentials"
          capture:
            error_code: "body.error_code"
```

### Flow Imports
```yaml
# main.yaml file
imports:
  - name: "authentication"
    path: "./auth/login-flow.yaml"
    variables:
      username: "admin"
      password: "secret"

  - name: "configuration"
    path: "./setup/initial-setup.yaml"

steps:
  # Imported steps are executed first
  - name: "Use login data"
    request:
      method: GET
      url: "/profile"
      headers:
        Authorization: "Bearer {{token}}"  # token comes from imported flow
```

### Reusable Flow (example: auth/login-flow.yaml)
```yaml
flow_name: "Login Flow"
description: "Standard authentication flow"

variables:
  username: "default_user"
  password: "default_pass"

exports:
  - token
  - refresh_token

steps:
  - name: "Authenticate user"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"
    assert:
      status_code: 200
    capture:
      token: "body.access_token"
      refresh_token: "body.refresh_token"
```

## 🔧 Advanced Features

### Hierarchical Variable System
1. **Global**: Defined in the system
2. **Imported**: Coming from imported flows
3. **Suite**: Defined in the `variables:` section
4. **Runtime**: Captured during execution

### Variable Interpolation
```yaml
# Supports interpolation anywhere
request:
  url: "/users/{{user_id}}/posts"
  headers:
    Authorization: "Bearer {{auth_token}}"
    X-Custom: "Value with {{variable}} interpolated"
  body:
    title: "Post by {{username}}"
    tags: ["{{tag1}}", "{{tag2}}"]
```

### Data Capture (JMESPath)
```yaml
capture:
  # Simple fields
  user_id: "body.data.id"

  # Arrays
  first_email: "body.users[0].email"
  all_names: "body.users[*].name"

  # Nested fields
  nested_value: "body.response.meta.pagination.total"

  # Calculated values
  is_admin: "body.user.role == 'admin'"

  # Static values
  test_run_id: "`test_12345`"
```

## 📊 Logs and Reports

### Automatic Logs
By default, all tests generate detailed logs:
```
results/
├── suite-name_2025-01-09_14-30-15.json
├── login_2025-01-09_14-25-10.json
└── e2e-flow_2025-01-09_14-20-05.json
```

### JSON Log Structure
```json
{
  "suite_name": "My Suite",
  "start_time": "2025-01-09T14:30:15.123Z",
  "end_time": "2025-01-09T14:30:18.456Z",
  "total_duration_ms": 3333,
  "success_rate": 85.5,
  "steps_results": [
    {
      "step_name": "User login",
      "status": "success",
      "duration_ms": 245,
      "request_details": {
        "method": "POST",
        "url": "https://api.com/auth/login",
        "headers": {...},
        "body": {...}
      },
      "response_details": {
        "status_code": 200,
        "headers": {...},
        "body": {...},
        "size_bytes": 156
      },
      "assertions_results": [
        {
          "field": "status_code",
          "expected": 200,
          "actual": 200,
          "passed": true
        }
      ],
      "captured_variables": {
        "auth_token": "eyJ0eXAiOiJKV1QiLCJhb..."
      }
    }
  ],
  "variables_final_state": {
    "auth_token": "eyJ0eXAiOiJKV1QiLCJhb...",
    "user_id": 123
  },
  "imported_flows": ["setup", "auth"]
}
```

## 🏗️ System Architecture

### Main Components

#### Core
- **`Runner`**: Main orchestrator that executes suites
- **`main.ts`**: CLI and entry point

#### Services
- **`HttpService`**: HTTP request execution with axios
- **`AssertionService`**: Multiple assertion validation
- **`CaptureService`**: Data extraction with JMESPath
- **`VariableService`**: Contextual variable management
- **`FlowService`**: Flow import and reuse
- **`ScenarioService`**: Conditional scenario processing

#### Types
- **`common.types.ts`**: TypeScript contracts for YAML and internal structures

### Execution Flow
1. **Parsing**: YAML loading and validation
2. **Imports**: Imported flow processing
3. **Execution**: For each step:
   - Variable interpolation
   - HTTP execution
   - Assertion validation
   - Variable capture
   - Scenario processing
4. **Reporting**: Log and report generation

## 📁 File Organization

### Recommended Structure
```
project/
├── flows/
│   ├── auth/
│   │   ├── login-flow.yaml
│   │   └── register-flow.yaml
│   ├── api/
│   │   ├── users-crud.yaml
│   │   └── products-crud.yaml
│   ├── e2e/
│   │   └── complete-workflow.yaml
│   └── setup/
│       └── environment-setup.yaml
├── results/
│   └── [automatic logs]
└── tests/
    └── [system unit tests]
```

## 💡 Practical Examples

### Example 1: Complete REST API
```yaml
suite_name: "User CRUD"
base_url: "https://api.exemplo.com/v1"

variables:
  admin_token: "sk-admin-123"
  user_email: "novo@usuario.com"

steps:
  - name: "Create user"
    request:
      method: POST
      url: "/users"
      headers:
        Authorization: "Bearer {{admin_token}}"
        Content-Type: "application/json"
      body:
        email: "{{user_email}}"
        name: "Test User"
        role: "user"
    assert:
      status_code: 201
      body.email: "{{user_email}}"
    capture:
      user_id: "body.id"

  - name: "Fetch created user"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Authorization: "Bearer {{admin_token}}"
    assert:
      status_code: 200
      body:
        id:
          equals: "{{user_id}}"
        email:
          equals: "{{user_email}}"
```

### Example 2: Flow with Scenarios
```yaml
suite_name: "Login Test with Multiple Scenarios"
base_url: "https://auth.exemplo.com"

steps:
  - name: "Login attempt"
    request:
      method: POST
      url: "/login"
      body:
        email: "{{email}}"
        password: "{{password}}"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body.success: true
          capture:
            access_token: "body.access_token"
            user_name: "body.user.name"

      - condition: "status_code == `401`"
        then:
          assert:
            body.error: "invalid_credentials"
          capture:
            login_failed: "`true`"

      - condition: "status_code == `422`"
        then:
          assert:
            body.validation_errors:
              contains: "email"
          capture:
            validation_error: "body.message"
```

### Example 3: E2E Flow with Imports
```yaml
# main-e2e.yaml
suite_name: "Complete E2E Flow"
base_url: "https://api.sistema.com"

imports:
  - name: "setup"
    path: "./flows/setup/environment.yaml"

  - name: "auth"
    path: "./flows/auth/admin-login.yaml"
    variables:
      username: "admin@sistema.com"

steps:
  - name: "Create resource using admin token"
    request:
      method: POST
      url: "/resources"
      headers:
        Authorization: "Bearer {{admin_token}}"
      body:
        name: "E2E Resource"
        description: "Created in E2E test"
    assert:
      status_code: 201
    capture:
      resource_id: "body.id"
```

## 🔍 Debugging and Troubleshooting

### Debug Commands
```bash
# Maximum detail for debugging
npm start meu-teste.yaml --verbose

# Continue even with failures to see all problems
npm start meu-teste.yaml --continue --detailed

# Save detailed output for analysis
npm start meu-teste.yaml --verbose --output debug-session.json
```

### Common Problems

#### Non-interpolated variables
```yaml
# ❌ Wrong - quotes in capture
capture:
  token: "body.access_token"  # Remove quotes from JMESPath

# ✅ Correct
capture:
  token: body.access_token
```

#### Malformed URLs
```yaml
# ❌ Wrong - absolute URL with base_url
base_url: "https://api.com"
request:
  url: "https://api.com/users"  # Redundant

# ✅ Correct - relative URL
base_url: "https://api.com"
request:
  url: "/users"  # Automatically concatenates
```

#### Failing assertions
```yaml
# ❌ Common problems
assert:
  status_code: "200"  # Should be number, not string
  body.count: 5       # If body.count is string "5"

# ✅ Correct
assert:
  status_code: 200
  body.count: "5"     # Exact type match
```

## 🚀 Automation Scripts

### Batch Execution Script
```bash
#!/bin/bash
# run-all-tests.sh

echo "🧪 Running all tests..."

# Unit tests
npm start flows/auth/login-flow.yaml --simple
npm start flows/api/users-crud.yaml --simple

# Integration tests
npm start flows/e2e/complete-workflow.yaml --detailed

# Regression tests
for file in flows/regression/*.yaml; do
    echo "Running: $file"
    npm start "$file" --continue
done

echo "✅ All tests completed!"
```

## 🛣️ Roadmap

### Planned Features
- [ ] **GraphQL Support**: Queries and mutations
- [ ] **Integrated Mocks**: Built-in mock server for testing
- [ ] **Dynamic Data**: faker.js data generation
- [ ] **Parallelization**: Parallel execution of independent steps
- [ ] **Plugins**: Extensible plugin system
- [ ] **Web Dashboard**: Visual interface for results
- [ ] **CI/CD Integration**: Plugins for Jenkins, GitHub Actions
- [ ] **Performance Testing**: Load and stress metrics

### Technical Improvements
- [ ] **Result Caching**: To optimize re-executions
- [ ] **Automatic Retry**: With exponential backoff
- [ ] **Schema Validation**: JSON Schema for YAMLs
- [ ] **IntelliSense**: VS Code extension with autocomplete

## 🤝 Contribution

### How to Contribute
1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript strict mode
- Eslint + Prettier
- Mandatory unit tests
- JSDoc documentation for public functions

## 📄 License

This project is licensed under the **ISC License**. See the `package.json` file for details.

---

## 📞 Support

For questions, issues, or suggestions:
- 🐛 **Issues**: [GitHub Issues](https://github.com/marcuspmd/flow-test/issues)
- 📧 **Email**: Check `package.json` for author contact
- 📖 **Documentation**: This README and code comments

### Exemplo 3: Fluxo E2E com Importações
```yaml
# main-e2e.yaml
suite_name: "Fluxo E2E Completo"
base_url: "https://api.sistema.com"

imports:
  - name: "setup"
    path: "./flows/setup/environment.yaml"

  - name: "auth"
    path: "./flows/auth/admin-login.yaml"
    variables:
      username: "admin@sistema.com"

steps:
  - name: "Criar recurso usando token do admin"
    request:
      method: POST
      url: "/resources"
      headers:
        Authorization: "Bearer {{admin_token}}"
      body:
        name: "Recurso E2E"
        description: "Criado no teste E2E"
    assert:
      status_code: 201
    capture:
      resource_id: "body.id"
```

## 🔍 Debugging e Troubleshooting

### Comandos de Debug
```bash
# Máximo detalhe para debugging
npm start meu-teste.yaml --verbose

# Continua mesmo com falhas para ver todos os problemas
npm start meu-teste.yaml --continue --detailed

# Salva output detalhado para análise
npm start meu-teste.yaml --verbose --output debug-session.json
```

### Problemas Comuns

#### Variáveis não interpoladas
```yaml
# ❌ Errado - aspas na captura
capture:
  token: "body.access_token"  # Remove as aspas do JMESPath

# ✅ Correto
capture:
  token: body.access_token
```

#### URLs mal formadas
```yaml
# ❌ Errado - URL absoluta com base_url
base_url: "https://api.com"
request:
  url: "https://api.com/users"  # Redundante

# ✅ Correto - URL relativa
base_url: "https://api.com"
request:
  url: "/users"  # Concatena automaticamente
```

#### Asserções falhando
```yaml
# ❌ Problemas comuns
assert:
  status_code: "200"  # Deveria ser number, não string
  body.count: 5       # Se body.count for string "5"

# ✅ Correto
assert:
  status_code: 200
  body.count: "5"     # Match exato do tipo
```

## 🚀 Scripts de Automação

### Script de Execução em Lote
```bash
#!/bin/bash
# run-all-tests.sh

echo "🧪 Executando todos os testes..."

# Testes unitários
npm start flows/auth/login-flow.yaml --simple
npm start flows/api/users-crud.yaml --simple

# Testes de integração
npm start flows/e2e/complete-workflow.yaml --detailed

# Testes de regressão
for file in flows/regression/*.yaml; do
    echo "Executando: $file"
    npm start "$file" --continue
done

echo "✅ Todos os testes concluídos!"
```

## 🛣️ Roadmap

### Funcionalidades Planejadas
- [ ] **Suporte a GraphQL**: Queries e mutations
- [ ] **Mocks Integrados**: Mock server embutido para testes
- [ ] **Dados Dinâmicos**: Geração de dados faker.js
- [ ] **Paralelização**: Execução paralela de etapas independentes
- [ ] **Plugins**: Sistema de plugins extensível
- [ ] **Dashboard Web**: Interface visual para resultados
- [ ] **CI/CD Integration**: Plugins para Jenkins, GitHub Actions
- [ ] **Performance Testing**: Métricas de carga e stress

### Melhorias Técnicas
- [ ] **Cache de Resultados**: Para otimizar re-execuções
- [ ] **Retry Automático**: Com backoff exponencial
- [ ] **Validação de Schema**: JSON Schema para YAMLs
- [ ] **IntelliSense**: Extensão VS Code com autocomplete

## 🤝 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código
- TypeScript strict mode
- Eslint + Prettier
- Testes unitários obrigatórios
- Documentação JSDoc para funções públicas

## 📄 Licença

Este projeto está licenciado sob a **ISC License**. Veja o arquivo `package.json` para detalhes.

---

## 📞 Suporte

Para dúvidas, problemas ou sugestões:
- 🐛 **Issues**: [GitHub Issues](https://github.com/marcuspmd/flow-test/issues)
- 📧 **Email**: Verifique o `package.json` para contato do autor
- 📖 **Documentação**: Este README e comentários no código
