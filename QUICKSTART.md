# Flow Test Engine - Quick Start Guide

Get up and running with Flow Test Engine in 5 minutes.

## Prerequisites

- Node.js 16+ (get it from [nodejs.org](https://nodejs.org))
- That's it! Flow Test works with any language/framework

## 1. Initialize a New Project (30 seconds)

```bash
# Create and navigate to your test directory
mkdir my-api-tests && cd my-api-tests

# Initialize with interactive wizard
npx flow-test-engine init

# Or use the short alias
npx fest init
```

The wizard will:
- ✅ Create configuration file (`flow-test.config.yml`)
- ✅ Set up test directory structure
- ✅ Offer template selection (basic, CRUD, auth, etc.)
- ✅ Generate a ready-to-run example

## 2. Your First Test (2 minutes)

The init command created `tests/getting-started.yaml`. Let's customize it:

```yaml
suite_name: "My First API Test"
node_id: "first-test"

# 👉 Replace with your API URL
base_url: "https://api.example.com"

metadata:
  priority: "high"
  tags: ["smoke"]

steps:
  - name: "Health check"
    request:
      method: "GET"
      url: "/health"  # 👉 Your endpoint
      headers:
        Accept: "application/json"

    assert:
      status_code: 200  # 👉 Expected status
      body:
        status:
          equals: "healthy"  # 👉 Expected response
```

**Three things to change:**
1. `base_url` - Your API endpoint
2. `url` - Your API path
3. `assert` - What you expect in the response

## 3. Run Your Test (30 seconds)

```bash
# Run all tests
npx flow-test-engine

# Or with short alias
npx fest

# With verbose output to see details
npx fest --verbose
```

You should see:
```
✓ My First API Test
  ✓ Health check (145ms)

Tests: 1 passed, 1 total
Time:  0.15s
```

## 4. View Results

Check the HTML report in `results/` directory:

```bash
# Open the HTML report
open results/report.html

# Or serve it locally
npx http-server results/
```

## What's Next?

### Add More Tests

Copy one of the examples:

```bash
# Browse available examples
ls node_modules/flow-test-engine/examples/

# Copy a template
cp node_modules/flow-test-engine/examples/basic/simple-post.yaml tests/
```

Or use templates from this repo:

```bash
# Copy from examples directory
cp examples/intermediate/crud-operations.yaml tests/my-crud-test.yaml
```

### Common Test Patterns

**Create a Resource (POST)**
```yaml
- name: "Create user"
  request:
    method: "POST"
    url: "/users"
    headers:
      Content-Type: "application/json"
    body:
      name: "{{$faker.person.fullName}}"
      email: "{{$faker.internet.email}}"
  
  assert:
    status_code: 201
  
  capture:
    user_id: "body.id"  # Save for later use
```

**Use Captured Data**
```yaml
- name: "Get created user"
  request:
    method: "GET"
    url: "/users/{{user_id}}"  # Use captured ID
  
  assert:
    status_code: 200
```

**Test Authentication**
```yaml
- name: "Login"
  request:
    method: "POST"
    url: "/auth/login"
    body:
      username: "admin"
      password: "{{$env.ADMIN_PASSWORD}}"  # From .env file
  
  capture:
    auth_token: "body.token"

- name: "Access protected endpoint"
  request:
    method: "GET"
    url: "/admin/dashboard"
    headers:
      Authorization: "Bearer {{auth_token}}"
  
  assert:
    status_code: 200
```

### Environment Variables

Create a `.env` file:

```bash
# .env
API_BASE_URL=https://staging.api.example.com
API_KEY=your-secret-key
ADMIN_PASSWORD=super-secret
```

Use in tests:

```yaml
base_url: "{{$env.API_BASE_URL}}"

steps:
  - request:
      headers:
        X-API-Key: "{{$env.API_KEY}}"
```

### CLI Shortcuts

```bash
# Run specific test
fest tests/my-test.yaml

# Filter by priority
fest --priority critical,high

# Filter by tags
fest --tag smoke

# Dry run (plan without executing)
fest --dry-run --detailed

# Generate only JSON report
fest --report json

# Verbose output
fest --verbose
```

## Common Use Cases

### Use Case 1: API Smoke Tests

```yaml
# tests/smoke-test.yaml
suite_name: "API Smoke Test"
node_id: "smoke"

metadata:
  priority: "critical"
  tags: ["smoke"]

base_url: "{{$env.API_URL}}"

steps:
  - name: "Health check"
    request:
      method: "GET"
      url: "/health"
    assert:
      status_code: 200

  - name: "Auth check"
    request:
      method: "POST"
      url: "/auth/login"
      body:
        username: "test"
        password: "test"
    assert:
      status_code: 200
```

### Use Case 2: E2E User Journey

```yaml
# tests/user-journey.yaml
suite_name: "Complete User Journey"
node_id: "user-journey"

base_url: "{{$env.API_URL}}"

steps:
  - name: "Register"
    request:
      method: "POST"
      url: "/auth/register"
      body:
        email: "{{$faker.internet.email}}"
        password: "Test123!"
    capture:
      user_id: "body.id"
      auth_token: "body.token"

  - name: "Update profile"
    request:
      method: "PUT"
      url: "/users/{{user_id}}"
      headers:
        Authorization: "Bearer {{auth_token}}"
      body:
        name: "{{$faker.person.fullName}}"
    assert:
      status_code: 200

  - name: "Get profile"
    request:
      method: "GET"
      url: "/users/{{user_id}}"
      headers:
        Authorization: "Bearer {{auth_token}}"
    assert:
      status_code: 200
```

### Use Case 3: Integration with CI/CD

```yaml
# .github/workflows/api-tests.yml
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
      
      - name: Run API tests
        run: npx flow-test-engine --report json
        env:
          API_URL: ${{ secrets.API_URL }}
          API_KEY: ${{ secrets.API_KEY }}
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: results/
```

## Troubleshooting

### Tests not found?

Check `flow-test.config.yml` discovery patterns:

```yaml
discovery:
  patterns:
    - '**/*.yaml'
    - '**/tests/**/*.yaml'
```

### Environment variables not working?

1. Create `.env` file in project root
2. Reference with `{{$env.VARIABLE_NAME}}`
3. Or set in shell: `export API_URL=https://api.example.com`

### Assertions failing?

Use `--verbose` to see actual vs expected:

```bash
fest --verbose
```

### Need help?

- 📖 [Full Documentation](https://github.com/marcuspmd/flow-test)
- 💬 [GitHub Discussions](https://github.com/marcuspmd/flow-test/discussions)
- 🐛 [Report Issues](https://github.com/marcuspmd/flow-test/issues)
- 📘 [Examples](https://github.com/marcuspmd/flow-test/tree/main/examples)

## Learning Resources

**Start Here:**
- [Examples Directory](../examples/README.md) - Ready-to-use templates
- [YAML Syntax Reference](./4.yaml-syntax-reference.md) - Complete syntax guide

**Dive Deeper:**
- [Best Practices](./6.best-practices.md) - Testing patterns
- [Advanced Features](./5.advanced-features.md) - Power user features
- [Configuration Guide](./3.configuration-guide.md) - Engine configuration

**Reference:**
- [CLI Reference](./2.cli-reference.md) - All command-line options
- [Quick Reference](./1.3.quick-reference.md) - Syntax cheat sheet

## Summary

You now know how to:
- ✅ Initialize a Flow Test project
- ✅ Write basic API tests
- ✅ Run tests and view results
- ✅ Use variables and environment config
- ✅ Capture and reuse data between steps
- ✅ Run tests in CI/CD

**Next:** Browse the [examples](../examples/) directory for more patterns!
