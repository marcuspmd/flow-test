# Getting Started with Flow Test Engine

This guide will help you quickly install, configure, and run your first API tests using the Flow Test Engine.

## Installation

### Requirements

- Node.js 16 or higher
- Docker (optional, for running complete test suite with httpbin mock server)

### Install Dependencies

```bash
npm install
```

## Running Your First Test

### Quick Start with Development Mode

Run a specific YAML test file in development mode:

```bash
npm run dev tests/start-flow.yaml
```

### Full Test Suite with Docker

Run the complete test suite using Docker (includes httpbin mock server):

```bash
npm test              # Complete suite
npm run test:verbose  # Detailed logs
npm run test:silent   # Silent execution
```

## Basic YAML Test Structure

Create a file called `tests/my-first-test.yaml`:

```yaml
suite_name: "My First Test Suite"
base_url: "http://localhost:8080"

steps:
  - name: "Test GET request"
    request:
      method: "GET"
      url: "/get"
    assert:
      status_code: 200
      body:
        url: { exists: true }

  - name: "Test POST request"
    request:
      method: "POST"
      url: "/post"
      headers:
        "Content-Type": "application/json"
      body:
        name: "test user"
        email: "test@example.com"
    assert:
      status_code: 200
      body:
        json:
          name: { equals: "test user" }
          email: { equals: "test@example.com" }
```

## Useful CLI Options

```bash
# Discover and plan without executing
flow-test --dry-run --detailed

# Filter by priority, suite, node, or tags
flow-test --priority critical,high
flow-test --suite "login,checkout"
flow-test --node auth-tests
flow-test --tag smoke,regression

# Use custom configuration file
flow-test --config ./my-config.yml
```

## Next Steps

- Learn about [YAML Syntax](./yaml-syntax-reference.md) for advanced test writing
- Explore [Configuration Options](./configuration-guide.md) for customization
- Check out [CLI Reference](./cli-reference.md) for all available commands
- Generate [HTML Reports](./reporting-guide.md) for test results