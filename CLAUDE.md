# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flow Test Engine is a TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. The engine supports request chaining, variable interpolation, response assertions, data capture between test steps, and cross-suite step reuse. It provides both `flow-test-engine` and `fest` as CLI aliases.

## Key Commands

### Testing & Development
- `npm test` - Smart test runner (checks Docker, builds, runs flow tests)
- `npm run test:unit` - Run Jest unit tests only
- `npm run test:unit:watch` - Run Jest tests in watch mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev <file.yaml>` - Run CLI in development mode with specific YAML file
- `npm run init` - Initialize configuration and sample test suites
- `npm run orchestrator` - Run server-based test orchestrator (after build)
- `npm run orchestrator:dev` - Run orchestrator in development mode

### Docker Services
- `npm run server:docker` - Start httpbin mock server in Docker
- `npm run server:down` - Stop and remove Docker services
- `npm run server:logs` - View httpbin container logs

### Flow Test CLI (after build)

Both `flow-test-engine` and `fest` work as CLI aliases (interchangeable).

**Basic execution:**
- `fest` or `flow-test-engine` - Run default test suite
- `fest <test.yaml>` - Run specific test file
- `fest --config <file>` or `fest -c <file>` - Use specific config file
- `fest --dry-run` - Show execution plan without running tests
- `fest --verbose` - Detailed output
- `fest --silent` - Minimal output

**Filtering:**
- `fest --priority critical,high` - Filter by priority levels
- `fest --tag <tags>` - Filter by YAML tags
- `fest --suite <names>` - Filter by suite names
- `fest --environment staging` - Run with specific environment

**Import/Export:**
- `fest --swagger-import <file>` - Import OpenAPI/Swagger spec and generate tests
- `fest --swagger-import <file> --swagger-output <dir>` - Import with custom output directory
- `fest --postman-import <file> --postman-import-output <dir>` - Import Postman collection
- `fest --postman-export <yaml> --postman-output <file>` - Export YAML to Postman collection
- `fest --postman-export-from-results <json> --postman-output <dir>` - Export from test results

**Discovery graphs:**
- `fest graph mermaid` - Generate Mermaid discovery graph (prints to console)
- `fest graph mermaid --output <file.mmd>` - Generate and save to file
- `fest graph --direction LR` - Generate graph with left-to-right layout (TD, LR, BT, RL)
- `fest graph --no-orphans` - Hide tests without dependencies

**Dashboard CLI:**
- `fest dashboard install` - Install dashboard dependencies
- `fest dashboard dev` - Start dashboard in development mode
- `fest dashboard build` - Build static dashboard for production
- `fest dashboard preview` - Preview built dashboard
- `fest dashboard serve` - Build and serve dashboard

**Initialization:**
- `fest init` - Interactive configuration wizard
- `fest init --template basic` - Use basic template (non-interactive)

## Architecture

The codebase follows a modular architecture:

### Core Components

- **`src/cli.ts`** - CLI entry point with argument parsing
- **`src/core/engine.ts`** - Main FlowTestEngine that orchestrates test execution
- **`src/core/config.ts`** - Configuration management system
- **`src/core/discovery.ts`** - Test discovery and filtering system

### Services Layer

- `src/services/http.service.ts` - HTTP request execution with enhanced error handling
- `src/services/assertion.service.ts` - Assertion validation with multiple operators
- `src/services/capture.service.ts` - JMESPath data extraction and variable capture
- `src/services/variable.service.ts` - Variable interpolation with Faker.js support
- `src/services/global-variables.ts` - Global variable management with hierarchical scoping
- `src/services/execution.ts` - Step execution orchestration
- `src/services/reporting.ts` - Report generation and metrics
- `src/services/scenario.service.ts` - Conditional scenario processing
- `src/services/logger.service.ts` - Centralized logging
- `src/services/faker.service.ts` - Faker.js integration for test data
- `src/services/javascript.service.ts` - JavaScript expression evaluation
- `src/services/dependency.service.ts` - Flow dependency management
- `src/services/priority.ts` - Priority-based execution
- `src/services/global-registry.service.ts` - Global state management
- `src/services/swagger-import.service.ts` - Swagger/OpenAPI import functionality
- `src/services/postman-collection.service.ts` - Postman collection import/export
- `src/services/call.service.ts` - Cross-suite step call orchestration
- `src/services/iteration.service.ts` - Step iteration and loop handling
- `src/services/input.service.ts` - Interactive user input handling
- `src/services/computed.service.ts` - Computed variable evaluation
- `src/services/dynamic-expression.service.ts` - Dynamic expression evaluation
- `src/services/discovery-graph.service.ts` - Test discovery graph generation
- `src/services/realtime-reporter.ts` - Real-time test execution reporting
- `src/services/hook-factory.ts` - Factory for creating execution hooks
- `src/services/log-streaming.service.ts` - Log streaming for remote monitoring

### Types

- `src/types/engine.types.ts` - Core engine types and interfaces
- `src/types/config.types.ts` - Configuration and result types
- `src/types/swagger.types.ts` - Swagger/OpenAPI specification types
- `src/types/call.types.ts` - Cross-suite step call types
- `src/types/common.types.ts` - Shared common types

### Additional Components

- `src/commands/init.ts` - Interactive initialization wizard
- `src/commands/graph.ts` - Discovery graph generation command
- `src/server/orchestrator.ts` - Server-based test orchestration
- `src/core/swagger/parser/` - Swagger/OpenAPI parsing and validation
- `report-dashboard/` - Astro-based dashboard for visualizing test results

## Test Configuration Structure

YAML files define test suites with:
- `suite_name` - Descriptive name for the test suite
- `base_url` - Optional base URL prepended to relative URLs
- `variables` - Global variables for template interpolation using `{{variable_name}}` syntax
- `steps` - Array of test steps executed sequentially

Each step supports:
- `request` - HTTP requests with full method support (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- `assert` - Assertions with multiple operators (equals, contains, not_equals, greater_than, less_than, regex, in, etc.)
- `capture` - Variable capture using JMESPath expressions
- `scenarios` - Conditional scenario processing for happy/sad path testing
- `call` - Cross-suite step calls to reuse steps from other YAML files
- `iterate` - Loop through arrays or ranges to repeat steps with different data
- `input` - Interactive user input prompts for manual testing flows
- `computed` - Computed variables derived from other variables or expressions

## Enhanced Features

- **Variable System**: Environment variables, Faker.js integration, JavaScript expressions, hierarchical scoping, computed variables
- **Cross-Suite Step Calls**: Reuse steps from other YAML files using `call` directive with isolated or shared context
- **Advanced Dependencies**: Flow dependencies with caching and retry logic between test suites
- **Iteration Support**: Loop through arrays or ranges with `iterate` to generate dynamic test scenarios
- **Interactive Testing**: Support for user input prompts during test execution via `input` directive
- **Comprehensive Logging**: Automatic JSON logs with detailed execution information via centralized logger
- **HTML Reports**: Generated via Astro-based dashboard consuming `results/latest.json` artifact
- **Priority Execution**: Tests can be filtered and executed by priority levels (critical, high, medium, low)
- **Swagger/OpenAPI Import**: Automatic test generation from API specifications with support for OpenAPI 3.x and Swagger 2.0
- **Postman Integration**: Import Postman collections and export YAML tests to Postman format
- **Discovery Graphs**: Generate Mermaid diagrams showing test dependencies and execution flow
- **Real-time Reporting**: Live test execution monitoring with progress updates
- **Parallel Execution**: Configurable parallel test execution with worker management

## Development Workflow

### Smart Testing
The `npm test` command uses a smart test runner (`scripts/smart-test.js`) that:
- Checks Docker status and starts missing services automatically (httpbin)
- Builds the project before testing
- Supports environment variable `FLOW_TEST_ARGS` for custom CLI arguments
- Uses `CLEANUP_AFTER_TESTS=true` to cleanup Docker services after tests
- Intelligently decides between Docker Compose or direct execution based on service status

### Unit Testing
- Jest configuration requires 80% code coverage across all metrics (statements, branches, functions, lines)
- Tests use `ts-jest` preset with TypeScript support
- Test files: `**/__tests__/**/*.ts`, `**/*.test.ts`, `**/*.spec.ts`
- HTML test reports generated in `coverage/html-report/test-report.html`
- Test timeout: 10 seconds (configurable in jest.config.js)

### Report System
- Every execution writes `results/latest.json` artifact with full test results
- Astro-based dashboard in `report-dashboard/` consumes this JSON
- Dashboard can be linked: `ln -sf ../results/latest.json report-dashboard/src/data/latest.json`
- Dashboard auto-discovers report location from config if symlink not present
- HTML reports can also be generated directly via `--html-output` flag

## Key Architecture Patterns

### Cross-Suite Step Calls
The `call` feature allows reusing steps from other YAML files:
- Implemented in `src/services/call.service.ts`
- Uses `CallService` to resolve and execute remote steps
- Supports variable injection via `call.variables`
- **Alias support** (`alias: "short_name"`): Use custom prefixes for captured variables instead of long node_ids
  - With alias: `alias: "auth"` → variables like `auth.access_token`
  - Without alias: variables prefixed with `node_id` → `func_auth.access_token`
  - Alias is interpolated and supports variables
- Context isolation by default (`isolate_context: true`) - captured variables return namespaced
- Set `isolate_context: false` to mutate parent scope (no namespace applied)
- **Full visibility**: Call steps now include `request_details`, `response_details`, `assertions_results` in JSON and HTML reports
- Error strategies: `fail` (default), `warn`, `continue` (skips step)
- Max recursion depth: 10 levels (prevents infinite loops)
- Suite caching with file mtime validation
- Paths must be relative to current file and sandboxed within `test_directory`

**Example with alias:**
```yaml
steps:
  - name: "Authenticate"
    call:
      test: "../functions/auth.yaml"
      step: "get-token"
      alias: "auth"  # Variables will be prefixed with "auth." instead of node_id
      isolate_context: false
      variables:
        username: "{{env.API_USERNAME}}"
        password: "{{env.API_PASSWORD}}"
    # Captured variables accessible as: auth.access_token, auth.token_expires_in

  - name: "Use token"
    request:
      method: GET
      url: "/api/protected-resource"
      headers:
        Authorization: "Bearer {{auth.access_token}}"
```

### Variable Resolution Priority
Variables are resolved in this order (highest to lowest):
1. Step-level variables (inline or from `call.variables`)
2. Suite-level variables
3. Global variables from config
4. Environment variables with `FLOW_TEST_` prefix
5. Faker.js expressions (`{{$faker.person.firstName}}`)
6. JavaScript expressions (`{{$js:Math.random()}}`)

### Test Discovery and Execution
- Discovery handled by `src/core/discovery.ts` (TestDiscovery class)
- Execution orchestrated by `src/core/engine.ts` (FlowTestEngine class)
- Dependencies resolved by `src/services/dependency.service.ts`
- Priority filtering by `src/services/priority.ts`
- Step execution in `src/services/execution.ts` with comprehensive error handling

## Important Instructions

- Always use `z.uuid()` instead of `z.string().uuid()` (deprecated)
- When starting servers, use background execution with `&` at the end of commands
- Follow TypeScript strict mode conventions (enabled in tsconfig.json)
- All services use centralized logging through `logger.service.ts`
- Variable interpolation supports nested object access and array indexing with `{{user.profile.name}}` or `{{items[0].id}}`
- The project targets ES6 with CommonJS modules (see tsconfig.json)
- Node.js 16+ required (engines field in package.json)
- Binary names: Both `flow-test-engine` and `fest` are available as CLI commands
