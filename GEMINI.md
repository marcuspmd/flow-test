# Gemini Context: Flow Test Engine

This document provides a comprehensive overview of the "Flow Test Engine" project to guide Gemini in assisting with development, testing, and documentation tasks.

## 1. Project Overview

The "Flow Test Engine" is a powerful, TypeScript-based API testing framework. It allows developers to define and execute complex API test scenarios using declarative YAML files. The engine is designed for automation, CI/CD integration, and ease of use.

- **Core Technology**: TypeScript, Node.js
- **Current Version**: 3.0.0 (Major Architecture Refactoring)
- **Primary Goal**: To enable flexible, powerful, and easy-to-maintain API testing.
- **Key Features**:
    - **Declarative YAML Tests**: Test flows are defined in `.yaml` files.
    - **Request Chaining**: Capture data from one API response and use it in subsequent requests.
    - **Dynamic Data**: In-built support for Faker.js (`{{faker.*}}`), JavaScript expressions (`{{$js.*}}`), and environment variables (`{{$env.*}}`).
    - **Advanced Assertions**: Validate status codes, headers, response times, and body content using JMESPath.
    - **Conditional Logic**: Define different execution paths based on response data.
    - **Swagger/OpenAPI Import**: Automatically generate test suites from API specifications.
    - **Interactive Init**: `npx fest init` command to quickly scaffold new projects with templates.
    - **Comprehensive Reporting**: Generates JSON artifacts consumed by a dedicated HTML dashboard.
    - **CLI Tool**: A rich command-line interface (`flow-test` or `fest`) for running and managing tests.

## 2. Architecture (v3.0.0)

Version 3.0.0 introduced a modular architecture based on SOLID principles, splitting the monolithic `ExecutionService` into focused services:

- **`StepExecutorService`**: Handles execution of individual test steps, strategies, and skip conditions.
- **`VariableContextManager`**: Manages variable lifecycles, scopes (global, suite, runtime), and exports.
- **`ResultBuilderService`**: Aggregates results, tracks performance, and builds execution reports.
- **Dependency Injection**: Uses InversifyJS for loose coupling and better testability.

## 3. Key Files & Directories

- **`src/`**: Contains all the TypeScript source code.
    - **`src/cli.ts`**: The main entry point for the command-line interface.
    - **`src/services/`**: Core business logic (Execution, Variable Management, Result Building).
    - **`src/di/`**: Dependency Injection container and identifiers.
    - **`src/commands/`**: CLI command implementations (e.g., `init.ts`).
- **`tests/`**: Default directory for YAML test files.
- **`examples/`**: A collection of 13+ example test files covering basic to advanced patterns (CRUD, Auth, Logic).
- **`docs/`**: Project documentation.
- **`results/`**: Default output directory for test execution logs (JSON format).
- **`flow-test.config.yml`**: Main configuration file for the engine (base URL, timeouts, etc.).
- **`package.json`**: Defines project metadata, dependencies, and scripts.
- **Documentation Files**:
    - **`QUICKSTART.md`**: 5-minute guide to get started.
    - **`CHEATSHEET.md`**: Quick reference for syntax and commands.
    - **`V3.0.0-REFACTORING.md`**: Details on the architectural changes.

## 4. Building and Running

The project uses `npm` for script and dependency management.

- **Install Dependencies**:
  ```bash
  npm install
  ```

- **Build the Project**:
  ```bash
  npm run build
  ```

- **Initialize a New Project**:
  ```bash
  npm run init
  # or directly via CLI
  npx fest init
  ```

- **Run All Tests**:
  ```bash
  npm test
  ```

- **Run a Specific Test File (Development)**:
  ```bash
  npm run dev tests/path/to/your-test.yaml
  ```

- **Orchestrator**:
  ```bash
  npm run orchestrator:dev
  ```

## 5. Development Conventions

- **Testing**:
    - **Unit Tests**: Written in Jest, focusing on individual services (e.g., `StepExecutorService`).
    - **Flow Tests**: YAML-based integration tests in `tests/`.
- **Code Style**: TypeScript with strict typing. Follows the patterns in `src/` (Service-Repository, DI).
- **CLI First**: New features should be exposed through the `flow-test` (or `fest`) CLI.
- **Documentation**: Use `api-extractor` for TSDoc. Keep `CHEATSHEET.md` and `examples/` updated with new features.

## 6. CLI Usage

The CLI is available as `flow-test` or `fest`.

- **Initialize Project**:
  ```bash
  fest init
  ```

- **Run tests in a directory**:
  ```bash
  fest --directory ./tests --verbose
  ```

- **Filter tests by tag**:
  ```bash
  fest --tag user-onboarding
  ```

- **Import OpenAPI spec**:
  ```bash
  fest --swagger-import api.json --swagger-output ./tests/imported
  ```

## 7. CI/CD & Docker

- **GitHub Actions**: Workflow in `.github/workflows/test.yml`.
- **Docker**: `Dockerfile` and `docker-compose.yml` available for containerized execution (often used with httpbin for testing).
