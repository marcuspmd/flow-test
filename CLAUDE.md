# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. The engine supports request chaining, variable interpolation, response assertions, and data capture between test steps.

## Key Commands

- `npm test` - Run tests with default configuration
- `npm run test:verbose` - Run tests with detailed output
- `npm run test:silent` - Run tests silently (errors only)
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run CLI in development mode
- `flow-test` - CLI command for running tests (after build)
- `flow-test --import-swagger <file>` - Import OpenAPI/Swagger spec and generate tests

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

- `src/core/swagger/parser/` - OpenAPI/Swagger parsing and validation
  - `swagger-parser.ts` - Main parser for JSON/YAML specifications
  - `validator.ts` - Comprehensive validation for OpenAPI 3.x and Swagger 2.0

### Report Generator

- `src/report-generator/` - HTML report generation with PostmanExporter and HistoryAnalyzer

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
- **HTML Reports**: Visual report generation with Tailwind CSS styling
- **Priority Execution**: Tests can be filtered and executed by priority levels
- **Swagger/OpenAPI Import**: Automatic test generation from API specifications with support for OpenAPI 3.x and Swagger 2.0

## Default Test File Location

- Default test file: `./tests/start-flow.yaml`
- Test files use httpbin.org for demonstration purposes

## Important Instructions

- Always use z.uuid() instead of z.string().uuid() (deprecated)
- When starting servers, use background execution with `&` at the end of commands
- Follow TypeScript strict mode conventions
- All services use centralized logging through logger.service.ts
- Variable interpolation supports nested object access and array indexing