# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. The engine supports request chaining, variable interpolation, response assertions, and data capture between test steps.

## Key Commands

- `npm test` - Run tests with default configuration using FlowTestEngine v2.0
- `npm run test:all` - Run all test files in the tests directory
- `npm run test:verbose` - Run all tests with verbose output
- `npm run test:silent` - Run all tests silently (errors only)
- `npm run build` - Compile TypeScript to JavaScript
- `flow-test` - CLI command for running tests with various options
- `flow-test --help` - Show all available CLI options

## Automatic Logging

By default, the system automatically generates detailed JSON logs for every test execution:
- **Location**: `results/suite-name_YYYY-MM-DD_HH-MM-SS.json`
- **Format**: Complete execution details with timing, requests, responses, and variables
- **Disable**: Use `--no-log` flag to skip automatic log generation

## Architecture v2.0

The codebase follows a modern, modular architecture with enhanced capabilities:

### Core Components

- **`src/cli.ts`** - Modern CLI entry point with comprehensive argument parsing
- **`src/core/engine.ts`** - Main FlowTestEngine v2.0 that orchestrates all test execution
- **`src/core/config.ts`** - Configuration management system
- **`src/core/discovery.ts`** - Test discovery and filtering system
- **`src/services/`** - Enhanced service layer:
  - `global-variables.ts` - Global variable management with hierarchical scoping
  - `variable.service.ts` - Variable interpolation with Faker.js and JavaScript support
  - `http.service.ts` - HTTP request execution with enhanced error handling
  - `assertion.service.ts` - Advanced assertion validation with custom checks
  - `capture.service.ts` - JMESPath data extraction and variable capture
  - `scenario.service.ts` - Conditional scenario processing for complex flows
  - `execution.ts` - Step execution orchestration
  - `reporting.ts` - Comprehensive reporting and metrics
- **`src/types/`** - Modern TypeScript interfaces:
  - `engine.types.ts` - Core v2.0 engine types and interfaces
  - `config.types.ts` - Configuration and execution result types

### Key Types v2.0

- `TestSuite` - Enhanced test suite with priority, tags, dependencies, and metadata
- `TestStep` - Advanced test step with retry logic, timeouts, and extended metadata
- `RequestDetails` - HTTP request with timeout support and additional methods (HEAD, OPTIONS)
- `Assertions` - Enhanced assertions with custom validation and type checking
- `ConditionalScenario` - Advanced conditional logic with named scenarios
- `StepExecutionResult` - Comprehensive execution results with performance metrics
- `GlobalVariableContext` - Hierarchical variable context with environment support

### Test Configuration Structure

YAML files define test suites with:
- `suite_name` - Descriptive name for the test suite
- `base_url` - Optional base URL prepended to relative URLs
- `variables` - Global variables for template interpolation using `{{variable_name}}` syntax
- `steps` - Array of test steps executed sequentially
  - Each step supports assertions, variable capture, and conditional scenarios
  - Variables captured in one step are available in subsequent steps
  - Scenarios enable happy/sad path testing with JMESPath conditions

### Enhanced Features v2.0

#### Advanced Test Discovery and Execution
- **Priority-based Execution**: Execute tests by priority levels (critical, high, medium, low)
- **Tag-based Filtering**: Filter tests by tags for targeted execution
- **Dependency Management**: Automatic dependency resolution and execution ordering
- **Parallel Execution**: Support for concurrent test execution with configurable limits

#### Enhanced Variable System
- **Environment Variables**: Automatic environment variable loading
- **Faker.js Integration**: Generate realistic test data using Faker.js
- **JavaScript Expressions**: Execute JavaScript code for dynamic data generation
- **Hierarchical Scoping**: Advanced variable resolution (environment > global > suite > imported > runtime)

#### Advanced Dependency Management
- **Flow Dependencies**: Define and manage complex flow dependencies using `depends` field
- **Dependency Caching**: Cache dependency results with configurable TTL
- **Conditional Dependencies**: Execute dependencies based on JMESPath conditions
- **Dependency Retry Logic**: Automatic retry with configurable delays

#### Comprehensive Engine Hooks
- **Lifecycle Events**: Hook into test discovery, execution start/end, step events
- **Custom Monitoring**: Integrate with external monitoring and alerting systems
- **Real-time Statistics**: Live execution metrics and progress tracking
- **Error Handling**: Advanced error reporting and recovery mechanisms

## Default Test File Location

- Default test file: `./tests/start-flow.yaml`
- Test files use httpbin.org for demonstration purposes