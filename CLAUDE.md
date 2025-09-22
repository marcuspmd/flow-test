# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. The engine supports request chaining, variable interpolation, response assertions, and data capture between test steps.

## Key Commands

### Testing & Development
- `npm test` - Smart test runner (checks Docker, builds, runs flow tests)
- `npm run test:unit` - Run Jest unit tests only
- `npm run test:unit:watch` - Run Jest tests in watch mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev <file.yaml>` - Run CLI in development mode with specific YAML file
- `npm run init` - Initialize configuration and sample test suites

### Docker Services
- `npm run server:docker` - Start httpbin mock server in Docker
- `npm run server:down` - Stop and remove Docker services
- `npm run server:logs` - View httpbin container logs

### Flow Test CLI (after build)
- `flow-test` - Run default test suite (./tests/start-flow.yaml)
- `flow-test --config <file>` - Use specific config file
- `flow-test --swagger-import <file>` - Import OpenAPI/Swagger spec and generate tests
- `flow-test --dry-run` - Show execution plan without running
- `flow-test --verbose` - Detailed output
- `flow-test --priority critical,high` - Filter by priority levels
- `flow-test --tag <tags>` - Filter by YAML tags

### Report Dashboard
- `npm run report:dashboard:install` - Install dashboard dependencies
- `npm run report:dashboard:dev` - Start development server
- `npm run report:dashboard:build` - Build static dashboard
- `npm run report:dashboard:serve` - Build and serve dashboard

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

### Types

- `src/types/engine.types.ts` - Core engine types and interfaces
- `src/types/config.types.ts` - Configuration and result types
- `src/types/swagger.types.ts` - Swagger/OpenAPI specification types

### Swagger/OpenAPI Integration

- `src/services/swagger-import.service.ts` - Importer that reads OpenAPI/Swagger specs and generates YAML suites
- CLI support: `--swagger-import <file>` with optional `--swagger-output <dir>`

### Report Dashboard

- `report-dashboard/` - Aplicação Astro independente para visualizar `results/latest.json` como dashboard HTML

## Test Configuration Structure

YAML files define test suites with:
- `suite_name` - Descriptive name for the test suite
- `base_url` - Optional base URL prepended to relative URLs
- `variables` - Global variables for template interpolation using `{{variable_name}}` syntax
- `steps` - Array of test steps executed sequentially

Each step supports:
- HTTP requests with full method support (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- Assertions with multiple operators (equals, contains, not_equals, greater_than, less_than, regex)
- Variable capture using JMESPath expressions
- Conditional scenarios for happy/sad path testing

## Enhanced Features

- **Variable System**: Environment variables, Faker.js integration, JavaScript expressions, hierarchical scoping
- **Advanced Dependencies**: Flow dependencies with caching and retry logic
- **Comprehensive Logging**: Automatic JSON logs with detailed execution information
- **HTML Reports**: Geração via dashboard externo consumindo o artefato JSON (`results/latest.json`)
- **Priority Execution**: Tests can be filtered and executed by priority levels
- **Swagger/OpenAPI Import**: Automatic test generation from API specifications with support for OpenAPI 3.x and Swagger 2.0

## Default Test File Location

- Default test file: `./tests/start-flow.yaml`
- Test files use httpbin.org for demonstration purposes

## Development Workflow

### Smart Testing
The `npm test` command uses a smart test runner (`scripts/smart-test.js`) that:
- Checks Docker status and starts missing services automatically
- Builds the project before testing
- Supports environment variable `FLOW_TEST_ARGS` for custom arguments
- Uses `CLEANUP_AFTER_TESTS=true` to cleanup Docker services after tests

### Unit Testing
- Jest configuration requires 80% code coverage across all metrics
- Tests use `ts-jest` preset with TypeScript support
- Test files: `**/__tests__/**/*.ts`, `**/*.test.ts`, `**/*.spec.ts`
- HTML test reports generated in `coverage/html-report/test-report.html`

### Report System
- Every execution writes `results/latest.json` artifact
- Astro-based dashboard in `report-dashboard/` consumes this JSON
- Dashboard can be linked or copied: `ln -sf ../results/latest.json report-dashboard/src/data/latest.json`

## Important Instructions

- Always use `z.uuid()` instead of `z.string().uuid()` (deprecated)
- When starting servers, use background execution with `&` at the end of commands
- Follow TypeScript strict mode conventions (enabled in tsconfig.json)
- All services use centralized logging through `logger.service.ts`
- Variable interpolation supports nested object access and array indexing
- The project targets ES6 with CommonJS modules (see tsconfig.json)
- Node.js 16+ required (engines field in package.json)
