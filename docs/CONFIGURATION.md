# Flow Test – Configuration Guide

This guide describes the supported configuration for the Flow Test Engine and provides copy‑paste samples. The default file is `flow-test.config.yml` (override with `--config`).

Notes:
- Verbosity is a CLI flag (`--verbose|--detailed|--simple|--silent`). There is no `logging` section.
- Reporting is configured with `reporting` (not `reports`).
- Environment variables with prefix `FLOW_TEST_` override `globals.variables` (e.g., `FLOW_TEST_HTTPBIN_URL`).

## Basic Configuration

```yaml
# flow-test.config.yml
project_name: "Flow Test Demo Project"
test_directory: "./tests"

globals:
  variables:
    httpbin_url: "http://localhost:3000"
  timeouts:
    default: 30000
    slow_tests: 60000

discovery:
  patterns: ["**/*.yaml"]
  exclude: ["**/node_modules/**", "**/dist/**", "**/results/**", "**/temp/**"]

priorities:
  levels: [critical, high, medium, low]
  required: [critical]
  fail_fast_on_required: false

execution:
  mode: sequential      # or parallel
  max_parallel: 3
  timeout: 60000
  continue_on_failure: true
  retry_failed:
    enabled: true
    max_attempts: 2
    delay_ms: 2000

reporting:
  formats: [json, html]
  output_dir: "./results"
  aggregate: true
  include_performance_metrics: true
  include_variables_state: true
```

## Environment-Specific Configs

### Development
```yaml
# flow-test.config.dev.yml
project_name: "Flow Test – Dev"
test_directory: "./tests"

globals:
  variables:
    httpbin_url: "http://localhost:3000"
  timeouts:
    default: 60000
    slow_tests: 120000

execution:
  mode: sequential
  timeout: 60000
  continue_on_failure: true

reporting:
  formats: [html, json]
  output_dir: "./results/dev"
  aggregate: true
```

### Staging
```yaml
# flow-test.config.staging.yml
project_name: "Flow Test – Staging"
test_directory: "./tests"

globals:
  variables:
    base_url: "https://api-staging.example.com"
    api_key: "${STAGING_API_KEY}"

execution:
  mode: sequential
  timeout: 45000

reporting:
  formats: [json]
  output_dir: "./results/staging"
  aggregate: true
```

### Production
```yaml
# flow-test.config.prod.yml
project_name: "Flow Test – Prod"
test_directory: "./tests"

globals:
  variables:
    base_url: "https://api.example.com"
    api_key: "${PROD_API_KEY}"

execution:
  mode: sequential
  timeout: 30000
  retry_failed:
    enabled: true
    max_attempts: 3
    delay_ms: 1000

reporting:
  formats: [json]
  output_dir: "./results/prod"
  aggregate: true
```

## Advanced Options

### Parallel Execution
```yaml
# flow-test.config.parallel.yml
project_name: "Flow Test – Parallel"
test_directory: "./tests"

execution:
  mode: parallel
  timeout: 30000
  max_parallel: 10
  continue_on_failure: false

reporting:
  formats: [json]
  output_dir: "./results/parallel"
  aggregate: true
  include_performance_metrics: true
```

### Load/Stress
```yaml
# flow-test.config.load.yml
project_name: "Flow Test – Load"
test_directory: "./tests"

execution:
  mode: parallel
  timeout: 60000
  max_parallel: 50
  continue_on_failure: false
  retry_failed:
    enabled: true
    max_attempts: 2
    delay_ms: 200

reporting:
  formats: [json]
  output_dir: "./results/load-test"
  aggregate: true
  include_performance_metrics: true
```

### Auth Variables
```yaml
# flow-test.config.auth.yml
project_name: "Flow Test – Auth"
test_directory: "./tests"

globals:
  variables:
    base_url: "https://api.example.com"
    authorization: "Bearer ${API_TOKEN}"
    api_key: "${API_KEY}"

execution:
  mode: sequential
  timeout: 30000

reporting:
  formats: [html]
  output_dir: "./results/auth"
```

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
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run API tests
        run: npm test
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: results
          path: results/
```

### Jenkins Pipeline
```groovy
// Jenkinsfile
pipeline {
  agent any
  stages {
    stage('Setup') { steps { sh 'npm ci' } }
    stage('API Tests') { steps { sh 'node dist/cli.js tests/api-suite.yaml || true' } }
    stage('Performance Tests') { steps { sh 'node dist/cli.js tests/performance-suite.yaml || true' } }
  }
  post {
    always { archiveArtifacts artifacts: 'results/*.json', fingerprint: true }
  }
}
```

### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p results
CMD ["node", "dist/cli.js", "tests/api-suite.yaml"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api-tests:
    build: .
    environment:
      - API_BASE_URL=https://api.example.com
      - API_KEY=${API_KEY}
    volumes:
      - ./results:/app/results
    command: node dist/cli.js tests/api-suite.yaml
```

## Performance Tuning

```yaml
# flow-test.config.perf.yml
project_name: "Flow Test – Perf"
test_directory: "./tests"
execution:
  mode: parallel
  timeout: 10000
  max_parallel: 100
  continue_on_failure: false
reporting:
  formats: [json]
  output_dir: "./results/perf"
  aggregate: true
  include_performance_metrics: true
```

## Environment Variables

```bash
# .env (example)
API_BASE_URL=https://api.example.com
API_KEY=your-api-key-here
AUTH_TOKEN=your-auth-token
```

To inject into the engine as globals, export them with the `FLOW_TEST_` prefix (e.g., `FLOW_TEST_API_BASE_URL`).

## Best Practices

- Separate configs per environment.
- Keep secrets in environment variables; never commit secrets.
- Validate config in CI.
- Use parallel mode for performance suites only.

