# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. The engine supports request chaining, variable interpolation, response assertions, and data capture between test steps.

## Key Commands

- `npm start` - Run tests with default file (auto-generates log)
- `npm start <file>` - Run tests with a specific YAML file
- `npm start -- <file> --verbose` - Run with detailed request/response logging
- `npm start -- <file> --detailed` - Run with detailed output but compact responses
- `npm start -- <file> --silent` - Run silently (errors only)
- `npm start -- <file> --no-log` - Run without generating automatic log file
- `npm start -- <file> --output custom.json` - Save results to specific file
- `npm start -- <file> --continue` - Continue execution even on step failures
- `npm run build` - Compile TypeScript to JavaScript

## Automatic Logging

By default, the system automatically generates detailed JSON logs for every test execution:
- **Location**: `results/suite-name_YYYY-MM-DD_HH-MM-SS.json`
- **Format**: Complete execution details with timing, requests, responses, and variables
- **Disable**: Use `--no-log` flag to skip automatic log generation

## Architecture

The codebase follows a simple modular structure:

### Core Components

- **`src/main.ts`** - Entry point with CLI argument parsing and execution options
- **`src/core/runner.core.ts`** - Main execution engine that orchestrates test flows
- **`src/services/`** - Service layer containing specialized functionality:
  - `variable.service.ts` - Variable interpolation and scoping management
  - `http.service.ts` - HTTP request execution with axios
  - `assertion.service.ts` - Response validation and assertion checking
  - `capture.service.ts` - Response data extraction using JMESPath
  - `flow.service.ts` - Reusable flow import and management
  - `scenario.service.ts` - Conditional scenario processing (happy/sad paths)
- **`src/types/common.types.ts`** - TypeScript interfaces for all system components

### Key Types

- `TestSuite` - Root configuration with metadata, imports, variables, and steps
- `TestStep` - Individual test step with request, assertions, capture, and scenarios
- `RequestDetails` - HTTP request specification (method, URL, headers, body)
- `Assertions` - Response validation (status_code, body, headers, response_time)
- `ConditionalScenario` - Happy/sad path logic with JMESPath conditions
- `FlowImport` - Reusable flow import configuration with variable overrides
- `ExecutionResult` - Detailed step execution results with timing and captures

### Test Configuration Structure

YAML files define test suites with:
- `suite_name` - Descriptive name for the test suite
- `base_url` - Optional base URL prepended to relative URLs
- `imports` - Array of reusable flow imports with variable overrides
- `variables` - Global variables for template interpolation using `{{variable_name}}` syntax
- `steps` - Array of test steps executed sequentially
  - Each step supports assertions, variable capture, and conditional scenarios
  - Variables captured in one step are available in subsequent steps
  - Scenarios enable happy/sad path testing with JMESPath conditions

### Advanced Features

#### Reusable Flows
- **Flow Import**: Import reusable flows from separate YAML files
- **Variable Scoping**: Hierarchical variable resolution (runtime > suite > imported > global)
- **Variable Override**: Override flow variables during import
- **Flow Exports**: Define which variables flows export to parent suites

#### Conditional Scenarios
- **Happy/Sad Path Testing**: Use JMESPath conditions to branch test logic
- **Dynamic Assertions**: Different validations based on response conditions
- **Conditional Capture**: Capture different variables based on response state
- **Multiple Scenarios**: Multiple condition blocks per test step

#### Comprehensive Reporting
- **Multiple Verbosity Levels**: silent, simple, detailed, verbose
- **File Output**: JSON and text format results with timing and metrics
- **Detailed Metrics**: Response times, success rates, assertion results
- **Variable Tracking**: Complete variable state throughout execution

## Default Test File Location

- Default test file: `./tests/start-flow.yaml`
- Test files use httpbin.org for demonstration purposes