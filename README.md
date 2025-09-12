# Flow Test Engine

A powerful TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. Features request chaining, variable interpolation, response assertions, and data capture between test steps.

## ✨ Key Features

- **Request Chaining**: Capture values from responses and use them in subsequent requests
- **Variable Interpolation**: Hierarchical variable system with Faker.js and JavaScript support  
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
# Run default test
npm test

# Run specific test file  
npm run dev tests/start-flow.yaml

# Run with different verbosity levels
npm run test:verbose    # Detailed output
npm run test:silent     # Errors only
```

## 📝 YAML Configuration

### Basic Structure

```yaml
suite_name: "API Test Suite"
base_url: "https://api.example.com"

variables:
  user_email: "test@example.com"
  api_key: "your-api-key"

steps:
  - name: "Create User"
    request:
      method: POST
      url: "/users"
      headers:
        Authorization: "Bearer {{api_key}}"
        Content-Type: "application/json"
      body:
        email: "{{user_email}}"
        name: "Test User"

    assert:
      status_code: 201
      body:
        email:
          equals: "{{user_email}}"
        id:
          greater_than: 0

    capture:
      user_id: "body.id"
      created_at: "body.created_at"
```

### Advanced Features

#### Request Chaining
```yaml
steps:
  - name: "Login"
    request:
      method: POST
      url: "/auth/login"
      body:
        email: "user@test.com"
        password: "password123"
    capture:
      auth_token: "body.token"

  - name: "Get Profile" 
    request:
      method: GET
      url: "/profile"
      headers:
        Authorization: "Bearer {{auth_token}}"
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

## 🛠️ CLI Options

```bash
flow-test [file] [options]

Options:
  --verbose     Show detailed request/response information
  --simple      Basic progress output (default)
  --silent      Only show errors
  --no-log      Skip automatic log file generation
  --output      Specify custom output file
  --continue    Continue execution on test failures
  --timeout     Set request timeout in seconds
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