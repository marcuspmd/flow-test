# CLI Reference

This guide provides comprehensive documentation for the Flow Test Engine command-line interface.

## Installation and Setup

### Global Installation

```bash
npm install -g flow-test-engine
```

### Project Installation

```bash
npm install flow-test-engine
# Run with npx
npx flow-test [options]
```

### Development Setup

```bash
git clone https://github.com/marcuspmd/flow-test.git
cd flow-test
npm install
npm run build

# Run the CLI
node dist/cli.js [options]
```

## Basic Usage

```bash
flow-test [options]
```

### Quick Start Examples

```bash
# Run all tests in default directory
flow-test

# Run with verbose output
flow-test --verbose

# Run specific test file
flow-test --directory tests/auth-flow.yaml

# Run tests with specific tags
flow-test --tag smoke,critical

# Dry run to see execution plan
flow-test --dry-run
```

## Command-Line Options

### Configuration Options

#### `--config, -c <file>`
Specify custom configuration file path.

```bash
flow-test --config ./custom-config.yml
flow-test -c ./staging-config.yml
```

**Default:** `flow-test.config.yml`

#### `--directory, -d <path>`
Override test directory or specify a single test file.

```bash
# Run all tests in specific directory
flow-test --directory tests/integration

# Run specific test file
flow-test --directory tests/auth-flow.yaml

# Run tests in subdirectory
flow-test --directory tests/api/v2
```

**Default:** `./tests`

#### `--environment, -e <env>`
Set environment name for variable resolution.

```bash
flow-test --environment staging
flow-test --environment production
flow-test -e dev
```

This affects variable resolution from environment-specific configuration.

### Import/Export Options

#### `--import-swagger <file>`
Import OpenAPI/Swagger specification and generate test files.

```bash
# Import OpenAPI 3.0 specification
flow-test --import-swagger api-spec.json

# Import Swagger 2.0 specification
flow-test --import-swagger swagger.yaml

# Import from URL
flow-test --import-swagger https://api.example.com/swagger.json
```

**Supported formats:**
- OpenAPI 3.0 (JSON/YAML)
- Swagger 2.0 (JSON/YAML)
- Remote URLs

#### `--swagger-output <directory>`
Specify output directory for imported Swagger tests.

```bash
flow-test --import-swagger api.json --swagger-output ./tests/generated
```

**Default:** `./tests/imported`

### Verbosity Options

#### `--verbose`
Show detailed output including full request/response data.

```bash
flow-test --verbose
```

**Output includes:**
- Request headers and body
- Response headers and body
- Variable states
- Detailed timing information

#### `--detailed`
Show detailed progress without full request/response data.

```bash
flow-test --detailed
```

**Output includes:**
- Step-by-step progress
- Variable changes
- Assertion results
- Performance metrics

#### `--simple`
Show basic progress information (default).

```bash
flow-test --simple
```

#### `--silent`
Silent execution, show errors only.

```bash
flow-test --silent
```

### Filtering Options

#### `--priority <levels>`
Run only tests with specified priority levels.

```bash
# Run critical tests only
flow-test --priority critical

# Run critical and high priority tests
flow-test --priority critical,high

# Multiple priorities
flow-test --priority "critical, high, medium"
```

**Priority levels:** `critical`, `high`, `medium`, `low`

#### `--suite <names>`
Run only specified test suites.

```bash
# Run single suite
flow-test --suite auth-tests

# Run multiple suites
flow-test --suite "auth-tests,user-management,payment-flow"
```

#### `--tag <tags>`
Run only tests with specified tags.

```bash
# Run tests with specific tag
flow-test --tag smoke

# Run tests with multiple tags (OR logic)
flow-test --tag "smoke,regression"

# Complex tag filtering
flow-test --tag "api,integration,critical"
```

#### `--node <ids>`
Run only specified test nodes by their IDs.

```bash
# Run specific test nodes
flow-test --node "auth-001,user-003"

# Run single node
flow-test --node payment-checkout-001
```

### Execution Options

#### `--dry-run`
Show execution plan without actually running tests.

```bash
flow-test --dry-run
```

**Output includes:**
- Discovered test files
- Execution order
- Variable resolution
- Dependency analysis

#### `--no-log`
Disable automatic log file generation.

```bash
flow-test --no-log
```

By default, Flow Test Engine generates detailed JSON logs in the `results/` directory.

### Help and Version

#### `--help, -h`
Show help message with all available options.

```bash
flow-test --help
flow-test -h
```

#### `--version, -v`
Show version information.

```bash
flow-test --version
flow-test -v
```

## Advanced Usage Patterns

### Complex Filtering

Combine multiple filters for precise test selection:

```bash
# Run critical API tests in staging environment
flow-test --tag api --priority critical --environment staging

# Run specific suites with high priority
flow-test --suite "user-management,auth-flow" --priority "critical,high"

# Dry run for regression tests
flow-test --tag regression --dry-run --verbose
```

### Environment-Specific Testing

```bash
# Development environment
flow-test --environment dev --tag smoke

# Staging environment with full regression
flow-test --environment staging --tag regression --priority "critical,high"

# Production monitoring
flow-test --environment prod --tag health-check --silent
```

### CI/CD Integration

```bash
# CI pipeline - critical tests only
flow-test --priority critical --silent --no-log

# Full regression suite
flow-test --tag regression --detailed

# Generate and test from Swagger
flow-test --import-swagger api.json && flow-test --directory ./tests/imported --tag generated
```

## Configuration File Integration

The CLI respects configuration from `flow-test.config.yml`:

```yaml
# flow-test.config.yml
project_name: "My API Tests"
test_directory: "./tests"

execution:
  mode: sequential
  timeout: 60000
  continue_on_failure: true

filtering:
  default_tags: ["smoke"]
  default_priority: ["critical", "high"]

verbosity:
  default_level: "simple"
  show_skipped: false
```

CLI options override configuration file settings:

```bash
# Config says simple, but CLI overrides to verbose
flow-test --verbose

# Config says ./tests, but CLI overrides to specific directory
flow-test --directory ./integration-tests
```

## Exit Codes

Flow Test Engine uses standard exit codes:

- **0**: All tests passed
- **1**: One or more tests failed
- **2**: Configuration error
- **3**: Import/export error
- **4**: Invalid command-line arguments

### Exit Code Usage in Scripts

```bash
#!/bin/bash

# Run tests and capture exit code
flow-test --priority critical
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    echo "All tests passed!"
    # Continue with deployment
elif [ $TEST_RESULT -eq 1 ]; then
    echo "Tests failed - aborting deployment"
    exit 1
else
    echo "Configuration or setup error"
    exit $TEST_RESULT
fi
```

## Output Formats and Reports

### Console Output

The CLI provides different levels of console output:

```bash
# Minimal output
flow-test --silent
# Output: Only errors and final summary

# Standard output
flow-test
# Output: Progress indicators and summary

# Detailed output
flow-test --detailed
# Output: Step details, timing, variable changes

# Verbose output
flow-test --verbose
# Output: Full request/response data
```

### JSON Reports

Automatic JSON report generation (unless `--no-log` is specified):

```bash
# Generated files:
# ./results/latest.json - Latest execution results
# ./results/YYYY-MM-DD-HH-mm-ss.json - Timestamped results
```

### HTML Reports

Generate HTML reports using the report generator:

```bash
# Generate HTML report from latest results
npm run report:html

# Or use the CLI directly
node dist/report-generator/cli.js --input results/latest.json --output reports/
```

## Integration Examples

### GitHub Actions

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run critical tests
        run: flow-test --priority critical --environment ci

      - name: Run full regression on main
        if: github.ref == 'refs/heads/main'
        run: flow-test --tag regression
```

### Docker Integration

```bash
# Run tests in Docker container
docker run --rm -v $(pwd):/workspace flow-test:latest \
  flow-test --directory /workspace/tests --priority critical

# Docker Compose integration
version: '3.8'
services:
  api-tests:
    build: .
    command: flow-test --environment docker --tag integration
    depends_on:
      - api-server
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('API Tests') {
            steps {
                sh 'flow-test --priority critical --environment staging'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'results',
                        reportFiles: 'latest.html',
                        reportName: 'API Test Report'
                    ])
                }
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

#### Configuration Not Found
```bash
Error: Configuration file not found: flow-test.config.yml
```
**Solution:** Create configuration file or specify with `--config`

#### No Tests Discovered
```bash
Warning: No test files found in directory: ./tests
```
**Solution:** Check directory path or create test files

#### Import Failures
```bash
Error: Failed to import Swagger file: Invalid JSON
```
**Solution:** Validate Swagger/OpenAPI file format

### Debug Mode

Enable debug output for troubleshooting:

```bash
DEBUG=flow-test:* flow-test --verbose
```

### Verbose Logging

Combine multiple verbosity options:

```bash
flow-test --verbose --detailed --dry-run
```

This comprehensive CLI reference covers all aspects of using Flow Test Engine from the command line. For more specific use cases, refer to the [Configuration Guide](configuration) and [Examples Repository](https://github.com/marcuspmd/flow-test/tree/main/tests).