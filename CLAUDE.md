# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based API testing engine that allows creating complex test flows using declarative YAML configuration files. The engine supports request chaining, variable interpolation, response assertions, and data capture between test steps.

## Key Commands

- `npm start` - Run tests with default file (./tests/start-flow.yaml)
- `npm start <file>` - Run tests with a specific YAML file
- `npm run build` - Compile TypeScript to JavaScript
- `ts-node src/main.ts <file>` - Direct execution with ts-node

## Architecture

The codebase follows a simple modular structure:

### Core Components

- **`src/main.ts`** - Entry point that handles CLI arguments and initializes the Runner
- **`src/core/runner.core.ts`** - Main execution engine that loads YAML suites and orchestrates test execution
- **`src/types/common.types.ts`** - TypeScript interfaces defining the structure of test suites and requests

### Key Types

- `TestSuite` - Root configuration containing suite metadata, base URL, variables, and steps
- `TestStep` - Individual test step with request details, assertions, and capture rules
- `RequestDetails` - HTTP request specification (method, URL, headers, body)
- `Assertions` - Response validation rules (currently supports status_code checks)

### Test Configuration Structure

YAML files define test suites with:
- `suite_name` - Descriptive name for the test suite
- `base_url` - Optional base URL prepended to relative URLs
- `variables` - Global variables for template interpolation using `{{variable_name}}` syntax
- `steps` - Array of test steps executed sequentially
  - Each step can capture response data using JMESPath syntax
  - Variables captured in one step are available in subsequent steps

### Current Implementation Status

The Runner class loads YAML configurations but the core execution logic (HTTP requests, assertions, variable capture) is not yet implemented - it's marked as "LÓGICA PRINCIPAL VIRÁ AQUI" (main logic comes here).

## Default Test File Location

- Default test file: `./tests/start-flow.yaml`
- Test files use httpbin.org for demonstration purposes