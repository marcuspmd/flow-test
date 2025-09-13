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

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/marcuspmd/flow-test.git
cd flow-test
npm install
```

### Basic Usage

```bash
# Run default test suite (uses httpbin.org for demo)
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
      captured_username: "json.username"
      server_data: "json"
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
      jwt_token: "json.token"  # Simulate capturing JWT from response
      user_id: "json.user_id"

  - name: "Get User Data with Token"
    request:
      method: GET
      url: "/get?user_id={{user_id}}"
      headers:
        Authorization: "Bearer {{jwt_token}}"
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
  - jwt_token
  - user_id
  - auth_status

# In another test suite, access the exported variables:
headers:
  Authorization: "Bearer {{auth_flows_test.jwt_token}}"
  X-User-ID: "{{auth_flows_test.user_id}}"
```

## 🛠️ CLI Options

```bash
flow-test [options]

Configuration:
  -c, --config <file>       Configuration file path
  -d, --directory <dir>     Test directory override
  -e, --environment <env>   Environment name for variable resolution

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
src/
├── cli.ts                 # CLI entry point
├── core/
│   ├── engine.ts         # Main test execution engine
│   ├── config.ts         # Configuration management
│   └── discovery.ts      # Test file discovery
├── services/
│   ├── http.service.ts   # HTTP request handling
│   ├── assertion.service.ts # Test assertions
│   ├── capture.service.ts   # Data extraction
│   ├── variable.service.ts  # Variable interpolation
│   └── reporting.ts      # Report generation
└── types/
    ├── engine.types.ts   # Core type definitions
    └── config.types.ts   # Configuration types
```

## 🔧 Development

### Build & Test

```bash
npm run build     # Compile TypeScript
npm test          # Run tests
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