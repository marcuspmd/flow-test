# Development Workflow Guide

Best practices and workflows for developing and maintaining Flow Test suites.

## Table of Contents
1. [Project Setup](#project-setup)
2. [Writing Your First Test](#writing-your-first-test)
3. [Organizing Tests](#organizing-tests)
4. [Development Cycle](#development-cycle)
5. [CI/CD Integration](#cicd-integration)
6. [Debugging Tests](#debugging-tests)
7. [Maintenance](#maintenance)

---

## Project Setup

### New Project

```bash
# Create project directory
mkdir my-api-tests && cd my-api-tests

# Initialize with wizard
npx fest init

# Install as dev dependency (optional)
npm install --save-dev flow-test-engine
```

### Existing Project

```bash
# Add to existing project
cd my-existing-project

# Create tests directory
mkdir tests

# Initialize config
npx fest init
```

### Directory Structure

```
my-api-tests/
├── .env                      # Environment variables (gitignored)
├── .env.example              # Example env vars (committed)
├── .gitignore                # Ignore results, .env
├── flow-test.config.yml      # Engine configuration
├── README.md                 # Project documentation
├── tests/                    # Test suites
│   ├── smoke/                # Smoke tests
│   │   ├── health-check.yaml
│   │   └── auth-basic.yaml
│   ├── api/                  # API tests by domain
│   │   ├── users/
│   │   │   ├── create-user.yaml
│   │   │   ├── update-user.yaml
│   │   │   └── delete-user.yaml
│   │   └── orders/
│   │       ├── create-order.yaml
│   │       └── cancel-order.yaml
│   ├── integration/          # Integration tests
│   │   └── checkout-flow.yaml
│   └── shared/               # Shared setup/utilities
│       └── auth-setup.yaml
└── results/                  # Test results (gitignored)
    ├── latest.json
    └── report.html
```

---

## Writing Your First Test

### Step 1: Start from a Template

```bash
# Copy an appropriate template
cp examples/basic/simple-get.yaml tests/my-first-test.yaml
```

### Step 2: Customize for Your API

```yaml
suite_name: "User API - Get User"
node_id: "user-api-get"
description: "Test retrieving user by ID"

# 1. Set your API URL
base_url: "{{$env.API_URL}}"

metadata:
  priority: "high"
  tags: ["users", "smoke"]

# 2. Define any variables
variables:
  test_user_id: "123"

steps:
  # 3. Configure your request
  - name: "Get user by ID"
    request:
      method: "GET"
      url: "/api/users/{{test_user_id}}"
      headers:
        Authorization: "Bearer {{$env.API_TOKEN}}"
        Accept: "application/json"

    # 4. Set your assertions
    assert:
      status_code: 200
      body:
        id:
          equals: "{{test_user_id}}"
        email:
          type: "string"
          regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
```

### Step 3: Test Incrementally

```bash
# Run just your test
npx fest tests/my-first-test.yaml --verbose

# Check the output
# Fix any issues
# Add more assertions
# Repeat
```

---

## Organizing Tests

### By Business Domain

✅ **Recommended**
```
tests/
├── auth/                    # Authentication tests
├── users/                   # User management
├── products/                # Product catalog
├── orders/                  # Order processing
└── payments/                # Payment flows
```

❌ **Avoid**
```
tests/
├── unit/
├── integration/
└── e2e/
```

### Naming Conventions

**Files:**
- `create-user.yaml` - Action-based
- `user-registration-flow.yaml` - Flow-based
- `smoke-test.yaml` - Purpose-based

**Suites:**
```yaml
suite_name: "User Registration - Complete Flow"
node_id: "user-registration-flow"
```

**Steps:**
```yaml
steps:
  - name: "Submit registration form with valid data"
  - name: "Verify email confirmation is sent"
  - name: "Complete email verification"
```

### Test Categories

**Smoke Tests** (Priority: critical)
- Quick validation of core functionality
- Runs on every commit
- < 5 minutes total

**API Tests** (Priority: high/medium)
- Comprehensive API coverage
- Runs on every PR
- 10-30 minutes total

**Integration Tests** (Priority: medium)
- Cross-system flows
- Runs nightly
- Can be slower

**Regression Tests** (Priority: low)
- Edge cases
- Historical bugs
- Runs weekly

---

## Development Cycle

### 1. Red-Green-Refactor

**Red:** Write a failing test
```yaml
- name: "Create user with valid data"
  request:
    method: "POST"
    url: "/api/users"
    body:
      email: "{{$faker.internet.email}}"
      name: "{{$faker.person.fullName}}"
  assert:
    status_code: 201  # Expect this to pass
```

**Green:** Make it pass
```bash
npx fest tests/create-user.yaml --verbose
# ✓ Create user with valid data (120ms)
```

**Refactor:** Improve the test
```yaml
# Add more assertions
assert:
  status_code: 201
  body:
    id: { type: "number", greater_than: 0 }
    email: { regex: "^[\\w-\\.]+@" }
    created_at: { type: "string" }

# Add cleanup
- name: "Cleanup - Delete test user"
  metadata:
    always_run: true
  request:
    method: "DELETE"
    url: "/api/users/{{created_user_id}}"
  continue_on_failure: true
```

### 2. Iterative Development

```bash
# 1. Write basic test
vim tests/feature.yaml

# 2. Run and see what fails
npx fest tests/feature.yaml --verbose

# 3. Fix and enhance
# Add more steps
# Add assertions
# Add error cases

# 4. Run again
npx fest tests/feature.yaml --verbose

# 5. Commit when passing
git add tests/feature.yaml
git commit -m "Add feature test"
```

### 3. Test-Driven API Development

```yaml
# Write test BEFORE implementing API
suite_name: "New Feature - Widget API"
node_id: "widget-api"

steps:
  - name: "Create widget"
    request:
      method: "POST"
      url: "/api/widgets"
      body:
        name: "My Widget"
        type: "standard"
    assert:
      status_code: 201  # Not implemented yet!
      body:
        id: { exists: true }
```

```bash
# Run to see it fail
npx fest tests/widget-api.yaml
# ✗ Create widget - Expected 201, got 404

# Implement the API
# ...

# Run again to see it pass
npx fest tests/widget-api.yaml
# ✓ Create widget (85ms)
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run smoke tests
        run: npx fest --priority critical --tag smoke
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: smoke-test-results
          path: results/

  full-tests:
    needs: smoke-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run all tests
        run: npx fest --verbose
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}
      
      - name: Upload HTML report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-report
          path: results/report.html
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

smoke-tests:
  stage: test
  image: node:18
  script:
    - npx fest --priority critical --tag smoke
  variables:
    API_URL: $STAGING_API_URL
    API_TOKEN: $API_TOKEN
  artifacts:
    when: always
    paths:
      - results/
    reports:
      junit: results/latest.json

api-tests:
  stage: test
  image: node:18
  needs: [smoke-tests]
  script:
    - npx fest --verbose
  artifacts:
    when: always
    paths:
      - results/
```

### Local Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
echo "Running smoke tests..."
npx fest --priority critical --tag smoke --silent

if [ $? -ne 0 ]; then
  echo "❌ Smoke tests failed. Commit aborted."
  exit 1
fi

echo "✅ Smoke tests passed!"
```

---

## Debugging Tests

### Use Verbose Mode

```bash
# See full request/response
npx fest tests/failing-test.yaml --verbose
```

### Dry Run

```bash
# See what would run without executing
npx fest --dry-run --detailed
```

### Test Single Step

```yaml
# Comment out other steps to isolate
steps:
  # - name: "Step 1"
  #   ...
  
  - name: "Step 2 - The failing one"
    request:
      method: "GET"
      url: "/api/resource"
```

### Add Debug Captures

```yaml
capture:
  debug_full_response: "body"
  debug_status: "status"
  debug_headers: "headers"
```

### Use httpbin for Testing

```yaml
# Test your YAML syntax with httpbin
base_url: "https://httpbin.org"

steps:
  - name: "Debug request"
    request:
      method: "POST"
      url: "/post"
      body:
        test: "{{my_variable}}"
    assert:
      status_code: 200
```

---

## Maintenance

### Regular Review

**Monthly:**
- Remove obsolete tests
- Update API endpoints
- Review flaky tests
- Update documentation

**Quarterly:**
- Refactor duplicated logic
- Update dependencies
- Review test coverage
- Optimize slow tests

### Version Control

```bash
# Tag releases
git tag -a v1.0.0 -m "API v1.0.0 tests"
git push origin v1.0.0

# Branch for experiments
git checkout -b test/new-feature
```

### Documentation

Update README with:
- How to run tests
- Environment setup
- Common issues
- Contact for help

```markdown
# API Tests

## Quick Start
\`\`\`bash
npx fest --priority critical
\`\`\`

## Environment Variables
Create `.env` file:
\`\`\`
API_URL=https://staging.api.example.com
API_TOKEN=your-token-here
\`\`\`

## Troubleshooting
- If tests timeout: Increase timeout in config
- If auth fails: Check API_TOKEN is valid
\`\`\`
```

### Performance Optimization

**Profile slow tests:**
```bash
npx fest --verbose | grep "ms)"
```

**Parallelize when possible:**
```yaml
# flow-test.config.yml
execution:
  mode: parallel
  max_parallel: 5
```

**Use test dependencies wisely:**
```yaml
# Share expensive setup
depends:
  - node_id: "auth-setup"
    cache: 300  # Cache for 5 minutes
```

---

## Summary

✅ **Development Workflow Best Practices:**

1. Start with templates
2. Test incrementally
3. Organize by domain
4. Use descriptive names
5. Clean up test data
6. Run in CI/CD
7. Debug systematically
8. Maintain regularly

🎯 **Key Principles:**

- **Fast feedback:** Smoke tests < 5 min
- **Isolated:** Each test is independent
- **Maintainable:** Clear names and structure
- **Reliable:** Use dynamic data, clean up
- **Documented:** README and examples

📚 **Next Steps:**

- Browse [examples](../examples/)
- Read [best practices](./6.best-practices.md)
- Check [YAML reference](./4.yaml-syntax-reference.md)
