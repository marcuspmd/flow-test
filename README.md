# Flow Test Engine

A powerful TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. Features request chaining, variable interpolation, response assertions, and data capture between test steps.

## ✨ Key Features

- **Request Chaining**: Capture values from responses and use them in subsequent requests
- **Variable Interpolation**: Hierarchical variable system with Faker.js and JavaScript support
- **Iteration Patterns**: Array and range iteration to eliminate repetitive test steps
- **Advanced Assertions**: Multiple assertion types with flexible operators
- **Conditional Scenarios**: Implement different test paths based on response conditions
- **Comprehensive Reporting**: JSON, Console, and HTML report formats
- **Modular Architecture**: Well-structured TypeScript codebase

## � Directory Structure & Organization

The Flow Test Engine supports **hierarchical test organization** with automatic discovery in subdirectories. This allows you to organize tests by domain, functionality, or any logical grouping.

### Supported Directory Structures

```
tests/
├── start-flow.yaml                    # Root level tests
├── auth-flows-test.yaml
├── api-demo/                         # Subdirectory with 4 tests
│   ├── basic-get.yaml
│   ├── basic-post.yaml
│   ├── headers-test.yaml
│   └── status-codes.yaml
├── ecommerce-api/                    # Complex flows (7 tests)
│   ├── user-onboarding.yaml
│   ├── shopping-journey.yaml
│   ├── checkout-process.yaml
│   ├── post-purchase.yaml
│   ├── payment-flow.yaml
│   ├── inventory-check.yaml
│   └── order-tracking.yaml
└── realistic-flows/                  # User journey tests (4 tests)
    ├── complete-user-journey.yaml
    ├── error-handling.yaml
    ├── data-validation.yaml
    └── performance-check.yaml
```

### Directory-Based Execution

```bash
# Discover all tests (62 total across all directories)
./dist/cli.js --dry-run

# Run specific subdirectory
./dist/cli.js --directory tests/api-demo --verbose        # 4 tests, 100% success
./dist/cli.js --directory tests/realistic-flows --verbose # 4 tests, 100% success
./dist/cli.js --directory tests/ecommerce-api --verbose   # 7 tests available

# Run with tag filtering
./dist/cli.js --tag checkout-process --verbose           # 1 specific test
./dist/cli.js --tag user-onboarding,shopping-journey --verbose

# Run complete user journey (multiple tags)
./dist/cli.js --tag user-onboarding,shopping-journey,checkout-process,post-purchase --verbose
```

### Benefits of Directory Organization

- **🔍 Automatic Discovery**: Finds all `**/*.yaml` files recursively
- **📊 Organized Execution**: Run tests by domain or functionality
- **🎯 Selective Testing**: Execute specific directories or tag combinations
- **📈 Scalability**: Supports unlimited subdirectory depth
- **🔄 Flexibility**: Mix root-level and subdirectory tests seamlessly

## �🚀 Quick Start

### Installation

```bash
git clone https://github.com/marcuspmd/flow-test.git
cd flow-test
npm install
```

### Basic Usage

```bash
# 🚀 COMPLETE WORKFLOW: Import Swagger → Run Tests → Cleanup (Pipeline Ready)
npm test

# Run specific test file
npm run dev tests/start-flow.yaml

# Run with different verbosity levels
npm run test:verbose    # Detailed output with request/response data
npm run test:silent     # Errors only

# Run tests with priority filtering
npm run test:critical   # Only critical priority tests
npm run test:high       # Critical and high priority tests
```

### Advanced Directory-Based Execution

### Benefits of Directory Organization

- **🔍 Automatic Discovery**: Finds all `**/*.yaml` files recursively
- **📊 Organized Execution**: Run tests by domain or functionality
- **🎯 Selective Testing**: Execute specific directories or tag combinations
- **📈 Scalability**: Supports unlimited subdirectory depth
- **🔄 Flexibility**: Mix root-level and subdirectory tests seamlessly

## 🔄 Swagger/OpenAPI Import

Automatically generate comprehensive test suites from OpenAPI/Swagger specifications. The engine converts API documentation into executable YAML test files with proper request/response validation.

### Import Commands

```bash
# Import OpenAPI 3.0 specification
flow-test --import-swagger api.json

# Import with custom output directory
flow-test --import-swagger api.yaml --swagger-output ./tests/imported-api

# Import Swagger 2.0 specification
flow-test --import-swagger swagger.json --swagger-output ./tests/legacy-api

# Import and run immediately
# Import and run immediately
flow-test --import-swagger api.json && flow-test --directory ./tests/imported-api --verbose
```

### Automated Swagger Testing

For a complete import → test → cleanup workflow, use the automated script:

```bash
# 🚀 One-command solution: Import, test, and cleanup
npm test

# This script does:
# 1. Imports tests/__swagger_example.json
# 2. Runs ALL tests (existing + imported) with automatic discovery
# 3. Always cleans up imported test directory (even if tests fail)
# 4. Generates comprehensive reports
```

### CI/CD Pipeline Integration

Perfect for automated testing pipelines:

```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test  # Complete workflow: import → run ALL tests → cleanup
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: results/
```

### Docker Integration

```dockerfile
# Dockerfile (included in repository)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "test"]
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                sh 'npm install'
                sh 'npm test'  // Complete validation: import + ALL tests + cleanup
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'results/*.json', fingerprint: true
        }
    }
}
```

### Docker Integration

```dockerfile
# Dockerfile (included in repository)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "test"]
```

```bash
# Build and run
docker build -t flow-test .
docker run flow-test

# Or use docker-compose (includes mock server)
docker-compose up
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test

test:
  image: node:18
  stage: test
  script:
    - npm install
    - npm test  # Complete validation workflow
  artifacts:
    paths:
      - results/
    expire_in: 1 week
```

## 📋 Example Test Files
```

### Generated Test Structure

When you import a Swagger spec, the engine creates:

```
tests/imported-api/
├── user-operations.yaml     # All user-related endpoints
├── product-catalog.yaml     # Product management endpoints
├── order-processing.yaml    # Order and checkout flows
├── admin-functions.yaml     # Administrative operations
└── integration-flows.yaml   # Cross-API integration tests
```

### Import Features

- **📋 Complete Coverage**: Generates tests for all endpoints and methods
- **🏷️ Smart Tagging**: Automatic tagging by operation type and resource
- **🔗 Request Chaining**: Intelligent linking of related operations
- **✅ Response Validation**: Comprehensive assertions for all response schemas
- **📊 Example Data**: Uses specification examples or generates realistic test data

### Example: Import & Test Workflow

```bash
# 1. Import your API specification
flow-test --import-swagger https://petstore.swagger.io/v2/swagger.json --swagger-output ./tests/petstore

# 2. Review generated tests
ls -la tests/petstore/

# 3. Run the imported tests
flow-test --directory tests/petstore --verbose

# 4. Clean up after testing (optional)
rm -rf tests/petstore
```

### Ready-to-Use CI/CD Files

The repository includes ready-to-use CI/CD configuration files:

- **`.github/workflows/test.yml`** - GitHub Actions workflow
- **`Dockerfile`** - Container build configuration
- **`docker-compose.yml`** - Development environment with mock server

Simply copy these files to your project and customize as needed!

## 📋 Example Test Files

The repository includes comprehensive test examples that you can run immediately:

```bash
# Basic getting started example
tests/start-flow.yaml                    # Simple HTTP flow demo

# Authentication patterns
tests/auth-flows-test.yaml              # JWT, OAuth2, refresh tokens
tests/javascript-expressions-test.yaml  # Advanced JS expressions

# Data generation and variables
tests/faker-demo.yaml                   # Faker.js integration examples
tests/environment-variables-test.yaml   # Environment variable usage
tests/variable-interpolation-test.yaml  # Variable scoping and interpolation

# Advanced features
tests/complex-conditional-scenarios.yaml # Conditional test logic
tests/microservices-integration-test.yaml # Multi-service testing
tests/performance-test.yaml             # Performance validation

# Run any test file:
npm run dev tests/faker-demo.yaml
```

## 📝 YAML Configuration

### Basic Structure

```yaml
# Example from tests/start-flow.yaml
suite_name: "Basic HTTP Test Flow"
base_url: "{{httpbin_url}}"  # Uses httpbin.org for demo

variables:
  user_id: 123
  user_name: "alpha_user"

steps:
  - name: "Send POST data and capture response"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
        X-Custom-Header: "Flow-Test-Demo"
      body:
        user_id: "{{user_id}}"
        username: "{{user_name}}"
        timestamp: "{{$now}}"

    assert:
      status_code: 200
      body:
        json.user_id:
          equals: "{{user_id}}"
        json.username:
          equals: "{{user_name}}"

    capture:
      captured_username: "body.json.username"
      server_data: "body.json"
```

### Advanced Features

#### Request Chaining
```yaml
# Example from tests/auth-flows-test.yaml
steps:
  - name: "Simulate Login"
    request:
      method: POST
      url: "/post"  # httpbin.org endpoint
      body:
        username: "{{test_credentials.username}}"
        password: "{{test_credentials.password}}"
    capture:
      auth_token: "body.json.token"  # Simulate capturing JWT from response
      user_id: "body.json.user_id"

  - name: "Get User Data with Token"
    request:
      method: GET
      url: "/get?user_id={{user_id}}"
      headers:
        Authorization: "Bearer {{auth_token}}"
        X-User-ID: "{{user_id}}"
```

#### Conditional Scenarios
```yaml
steps:
  - name: "API Call with Multiple Outcomes"
    request:
      method: GET
      url: "/data"

    scenarios:
      - condition: "status_code == `200`"
        then:
          capture:
            data: "body.results"

      - condition: "status_code == `404`"
        then:
          capture:
            error: "body.message"
```

#### Assertions
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

#### JavaScript Expressions
```yaml
# Example from tests/javascript-expressions-test.yaml
steps:
  - name: "Dynamic calculations with JavaScript"
    request:
      method: POST
      url: "/post"
      body:
        # Mathematical calculations
        calculated_value: "{{$js.result = base_number * multiplier; return result}}"
        # Current timestamp
        timestamp: "{{$js.return Date.now()}}"
        # Random number generation
        random_id: "{{$js.return Math.floor(Math.random() * 1000) + 1}}"
        # String manipulation
        uppercase_name: "{{$js.return 'flow-test'.toUpperCase()}}"
        # Date formatting
        formatted_date: "{{$js.return new Date().toISOString().split('T')[0]}}"
```

#### Iteration Patterns
```yaml
# Example from tests/iteration-examples.yaml
steps:
  # Array iteration - eliminates repetitive test steps
  - name: "Create user {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      url: "/post"
      headers:
        Content-Type: "application/json"
      body:
        user_id: "{{item.id}}"
        name: "{{item.name}}"
        email: "{{item.email}}"
        role: "{{item.role}}"
    assert:
      status_code: 200
      body:
        json.user_id:
          equals: "{{item.id}}"

  # Range iteration - for load testing or repeated operations
  - name: "Load test iteration {{index}}"
    iterate:
      range: "1..5"
      as: "index"
    request:
      method: GET
      url: "/get"
      headers:
        X-Iteration: "{{index}}"
        X-Test-Batch: "range-iteration"
      params:
        iteration: "{{index}}"
    assert:
      status_code: 200
      body:
        args.iteration:
          equals: "{{index}}"
```

#### Faker.js Integration
```yaml
# Example from tests/faker-demo.yaml
steps:
  - name: "Generate fake user data"
    request:
      method: POST
      url: "/post"
      body:
        # Faker person data (no $ prefix)
        firstName: "{{faker.person.firstName}}"
        lastName: "{{faker.person.lastName}}"
        fullName: "{{faker.person.fullName}}"
        email: "{{faker.internet.email}}"
        phone: "{{faker.phone.number}}"

        # Faker location data
        city: "{{faker.location.city}}"
        streetAddress: "{{faker.location.streetAddress}}"

        # Faker text data
        description: "{{faker.lorem.sentence}}"
```

#### Environment Variables
```yaml
# Example from tests/environment-variables-test.yaml
steps:
  - name: "Use system environment variables"
    request:
      method: POST
      url: "/post"
      headers:
        X-User: "{{$env.USER}}"
        X-Home: "{{$env.HOME}}"
      body:
        current_user: "{{$env.USER}}"
        custom_setting: "{{$env.FLOW_TEST_CUSTOM}}"
```

#### Global Variable Registry
```yaml
# Export variables to be used across different test suites
# In tests/auth-flows-test.yaml:
exports:
  - auth_token
  - user_id
  - auth_status

# In another test suite, access the exported variables:
headers:
  Authorization: "Bearer {{auth_flows_test.auth_token}}"
  X-User-ID: "{{auth_flows_test.user_id}}"
```

## 🛠️ CLI Options

```bash
flow-test [options]

Configuration:
  -c, --config <file>       Configuration file path
  -d, --directory <dir>     Test directory override (supports subdirectories)
  -e, --environment <env>   Environment name for variable resolution

Import/Export:
  --import-swagger <file>   Import OpenAPI/Swagger spec and generate test files
  --swagger-output <dir>    Output directory for imported Swagger tests (default: ./tests/imported)

Verbosity:
  --verbose                 Show detailed output including request/response data
  --detailed                Show detailed progress without full request/response
  --simple                  Show basic progress (default)
  --silent                  Silent execution, errors only

Filtering:
  --priority <levels>       Run only tests with specified priorities
                           Example: --priority critical,high
  --suite <names>          Run only specified test suites
  --tag <tags>             Run only tests with specified tags
                           Example: --tag user-onboarding,checkout-process
  --node <ids>             Run only specified test nodes

Execution:
  --dry-run                Show execution plan without running tests
  --no-log                 Disable automatic log file generation

Other:
  -h, --help               Show help message
  -v, --version            Show version information
```

Verbosity:
  --verbose                 Show detailed output including request/response data
  --detailed                Show detailed progress without full request/response
  --simple                  Show basic progress (default)
  --silent                  Silent execution, errors only

Filtering:
  --priority <levels>       Run only tests with specified priorities
                           Example: --priority critical,high
  --suite <names>          Run only specified test suites
  --tag <tags>             Run only tests with specified tags
  --node <ids>             Run only specified test nodes

Execution:
  --dry-run                Show execution plan without running tests
  --no-log                 Disable automatic log file generation

Other:
  -h, --help               Show help message
  -v, --version            Show version information
```

## 📊 Reports

### Automatic Logging
All test executions automatically generate detailed JSON logs in the `results/` directory:

```
results/
├── suite-name_2024-01-15_10-30-45.json
├── login-test_2024-01-15_10-25-30.json
└── latest.json (symlink to most recent)
```

### HTML Reports
Generate visual HTML reports:

```bash
# Generate HTML report from latest results
npm run report:html

# Generate from specific file
flow-test-html results/my-test.json --output report.html
```

## 🏗️ Project Structure

```
flow-test/
├── src/                          # TypeScript source code
│   ├── cli.ts                   # CLI entry point with directory support
│   ├── core/
│   │   ├── engine.ts           # Main test execution engine
│   │   ├── config.ts           # Configuration management
│   │   ├── discovery.ts        # Recursive test file discovery (**/*.yaml)
│   │   └── swagger/
│   │       └── parser/         # OpenAPI/Swagger parsing
│   ├── services/
│   │   ├── http.service.ts     # HTTP request handling
│   │   ├── assertion.service.ts # Test assertions
│   │   ├── capture.service.ts   # Data extraction
│   │   ├── variable.service.ts  # Variable interpolation
│   │   ├── swagger-import.service.ts # Swagger/OpenAPI import
│   │   └── reporting.ts        # Report generation
│   └── types/
│       ├── engine.types.ts     # Core type definitions
│       ├── config.types.ts     # Configuration types
│       └── swagger.types.ts    # Swagger/OpenAPI types
├── tests/                       # Test files (62 total)
│   ├── start-flow.yaml         # Basic demo
│   ├── auth-flows-test.yaml    # Authentication patterns
│   ├── api-demo/               # 4 basic API tests
│   ├── ecommerce-api/          # 7 complex e-commerce flows
│   └── realistic-flows/        # 4 user journey tests
├── results/                     # Execution results and logs
│   ├── latest.json            # Most recent execution
│   └── *.json                 # Historical results
└── docs/                       # Documentation
    ├── API_DOCUMENTATION.md
    ├── YAML_EXAMPLES.md
    └── ...
```

## 🔧 Development

### Build & Test

```bash
npm run build     # Compile TypeScript
npm test          # 🚀 Complete validation: Import Swagger → Run ALL tests → Cleanup
```

### Development Workflow

```bash
# Development cycle
npm run build     # Build the project
npm run dev       # Run development server with hot reload
npm test          # Validate everything works perfectly (all tests)
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see package.json for details.

## 📚 Documentation

For detailed examples and advanced usage, see the `docs/` directory:

- [YAML Examples](./docs/YAML_EXAMPLES.md) - Comprehensive test examples
- [API Documentation](./docs/API_DOCUMENTATION.md) - Complete API reference
- [Best Practices](./docs/BEST_PRACTICES.md) - Guidelines and recommendations
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Configuration](./docs/CONFIGURATION.md) - Advanced configuration options
