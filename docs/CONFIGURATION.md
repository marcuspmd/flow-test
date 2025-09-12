# Flow Test - Configuration Examples

This document provides examples of configuration files for different environments and use cases.

## Table of Contents
- [Basic Configuration](#basic-configuration)
- [Environment-Specific Configurations](#environment-specific-configurations)
- [Advanced Configuration](#advanced-configuration)
- [CI/CD Integration](#cicd-integration)
- [Performance Tuning](#performance-tuning)

## Basic Configuration

### Minimal Configuration
```yaml
# flow-test.config.yml
execution:
  mode: sequential
  timeout: 30000

globals:
  base_url: "https://api.example.com"

logging:
  level: simple
  format: console
```

### Standard Configuration
```yaml
# flow-test.config.yml
execution:
  mode: sequential
  timeout: 30000
  max_parallel: 5
  fail_fast: true

globals:
  base_url: "https://api.example.com"
  default_headers:
    Accept: "application/json"
    User-Agent: "Flow-Test/2.0"

logging:
  level: detailed
  format: console
  output_file: "test-results.log"

reports:
  enabled: true
  format: json
  output_dir: "./results"
  include_timestamps: true
```

## Environment-Specific Configurations

### Development Environment
```yaml
# flow-test.config.dev.yml
execution:
  mode: sequential
  timeout: 60000
  fail_fast: false

globals:
  base_url: "http://localhost:3000"
  environment: "development"

logging:
  level: verbose
  format: console

reports:
  enabled: true
  format: html
  output_dir: "./results/dev"
```

### Staging Environment
```yaml
# flow-test.config.staging.yml
execution:
  mode: sequential
  timeout: 45000
  fail_fast: true

globals:
  base_url: "https://api-staging.example.com"
  environment: "staging"
  api_key: "${STAGING_API_KEY}"

logging:
  level: detailed
  format: json
  output_file: "staging-results.json"

reports:
  enabled: true
  format: json
  output_dir: "./results/staging"
```

### Production Environment
```yaml
# flow-test.config.prod.yml
execution:
  mode: sequential
  timeout: 30000
  fail_fast: true
  max_retries: 3

globals:
  base_url: "https://api.example.com"
  environment: "production"
  api_key: "${PROD_API_KEY}"

logging:
  level: simple
  format: json
  output_file: "prod-results.json"

reports:
  enabled: true
  format: json
  output_dir: "./results/prod"
  compress_output: true
```

## Advanced Configuration

### Parallel Execution Configuration
```yaml
# flow-test.config.parallel.yml
execution:
  mode: parallel
  timeout: 30000
  max_parallel: 10
  fail_fast: false
  batch_size: 5

globals:
  base_url: "https://api.example.com"

logging:
  level: detailed
  format: console

reports:
  enabled: true
  format: json
  output_dir: "./results/parallel"
  include_performance: true
```

### Load Testing Configuration
```yaml
# flow-test.config.load.yml
execution:
  mode: parallel
  timeout: 60000
  max_parallel: 50
  fail_fast: false
  batch_size: 10
  delay_between_batches: 1000

globals:
  base_url: "https://api.example.com"
  load_test: true

logging:
  level: simple
  format: json
  output_file: "load-test-results.json"

reports:
  enabled: true
  format: json
  output_dir: "./results/load-test"
  include_performance: true
  include_metrics: true
```

### Custom Headers and Authentication
```yaml
# flow-test.config.auth.yml
execution:
  mode: sequential
  timeout: 30000

globals:
  base_url: "https://api.example.com"
  default_headers:
    Accept: "application/json"
    Content-Type: "application/json"
    Authorization: "Bearer ${API_TOKEN}"
    X-API-Key: "${API_KEY}"
    X-Client-Version: "1.0.0"

logging:
  level: detailed
  format: console

reports:
  enabled: true
  format: html
  output_dir: "./results/auth"
```

## CI/CD Integration

### GitHub Actions Configuration
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
      run: npm start
      env:
        API_BASE_URL: ${{ secrets.API_BASE_URL }}
        API_KEY: ${{ secrets.API_KEY }}

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: results/
```

### Jenkins Pipeline Configuration
```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        API_BASE_URL = credentials('api-base-url')
        API_KEY = credentials('api-key')
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }

        stage('API Tests') {
            steps {
                sh 'npm start tests/api-suite.yaml'
            }
        }

        stage('Performance Tests') {
            steps {
                sh 'npm start tests/performance-suite.yaml'
            }
        }
    }

    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'results',
                reportFiles: 'index.html',
                reportName: 'API Test Results'
            ])
        }
    }
}
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create results directory
RUN mkdir -p results

# Run tests
CMD ["npm", "start", "tests/api-suite.yaml"]
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
    command: npm start tests/api-suite.yaml
```

## Performance Tuning

### High-Performance Configuration
```yaml
# flow-test.config.perf.yml
execution:
  mode: parallel
  timeout: 10000
  max_parallel: 100
  fail_fast: false
  batch_size: 20
  connection_pool_size: 50

globals:
  base_url: "https://api.example.com"

http:
  keep_alive: true
  max_redirects: 5
  timeout: 5000
  retry_attempts: 2
  retry_delay: 100

logging:
  level: simple
  format: json
  output_file: "perf-results.json"

reports:
  enabled: true
  format: json
  output_dir: "./results/perf"
  compress_output: true
  include_performance: true
  include_metrics: true
```

### Memory-Optimized Configuration
```yaml
# flow-test.config.memory.yml
execution:
  mode: sequential
  timeout: 30000
  max_parallel: 1
  fail_fast: true

globals:
  base_url: "https://api.example.com"

http:
  keep_alive: false
  max_redirects: 3
  timeout: 15000

logging:
  level: simple
  format: console

reports:
  enabled: true
  format: json
  output_dir: "./results/memory"
  compress_output: true
```

## Configuration Validation

### Configuration Schema
```typescript
// config.schema.ts
export interface FlowTestConfig {
  execution: {
    mode: 'sequential' | 'parallel';
    timeout: number;
    max_parallel?: number;
    fail_fast: boolean;
    batch_size?: number;
    max_retries?: number;
  };

  globals: {
    base_url: string;
    environment?: string;
    default_headers?: Record<string, string>;
    [key: string]: any;
  };

  logging: {
    level: 'silent' | 'simple' | 'detailed' | 'verbose';
    format: 'console' | 'json' | 'html';
    output_file?: string;
  };

  reports: {
    enabled: boolean;
    format: 'json' | 'html' | 'xml';
    output_dir: string;
    include_timestamps: boolean;
    compress_output?: boolean;
    include_performance?: boolean;
    include_metrics?: boolean;
  };

  http?: {
    keep_alive?: boolean;
    max_redirects?: number;
    timeout?: number;
    retry_attempts?: number;
    retry_delay?: number;
    connection_pool_size?: number;
  };
}
```

### Configuration Validation Script
```bash
#!/bin/bash
# validate-config.sh

CONFIG_FILE=$1

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Validate YAML syntax
if command -v yamllint &> /dev/null; then
    yamllint "$CONFIG_FILE"
fi

# Check required fields
required_fields=("execution" "globals" "logging" "reports")

for field in "${required_fields[@]}"; do
    if ! grep -q "^$field:" "$CONFIG_FILE"; then
        echo "Missing required field: $field"
        exit 1
    fi
done

echo "Configuration validation passed"
```

## Environment Variable Management

### .env File Template
```bash
# .env
API_BASE_URL=https://api.example.com
API_KEY=your-api-key-here
AUTH_TOKEN=your-auth-token
DB_CONNECTION_STRING=postgresql://user:pass@localhost:5432/testdb

# Environment-specific overrides
DEV_API_BASE_URL=http://localhost:3000
STAGING_API_BASE_URL=https://api-staging.example.com
PROD_API_BASE_URL=https://api.example.com
```

### Environment Loading Script
```typescript
// load-env.ts
import { config } from 'dotenv';
import { resolve } from 'path';

export function loadEnvironment(env: string = 'development') {
  const envFile = `.env.${env}`;

  // Load base .env file
  config();

  // Load environment-specific .env file
  config({ path: resolve(process.cwd(), envFile) });

  // Validate required environment variables
  const requiredVars = [
    'API_BASE_URL',
    'API_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return process.env;
}
```

## Configuration Best Practices

### 1. Environment Separation
- Use different configurations for each environment
- Store sensitive data in environment variables
- Never commit secrets to version control

### 2. Configuration Inheritance
- Create a base configuration
- Override specific values per environment
- Use environment variables for dynamic values

### 3. Validation and Testing
- Validate configuration on startup
- Test configurations in CI/CD pipelines
- Document all configuration options

### 4. Performance Considerations
- Adjust timeouts based on environment
- Configure parallel execution for performance tests
- Use appropriate logging levels for different environments

### 5. Security
- Use environment variables for sensitive data
- Validate configuration values
- Limit access to configuration files

This configuration guide provides comprehensive examples for various use cases and environments. Choose the appropriate configuration based on your specific requirements and environment constraints.
