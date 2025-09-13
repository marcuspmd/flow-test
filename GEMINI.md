# Gemini Context: Flow Test Engine

This document provides a comprehensive overview of the "Flow Test Engine" project to guide Gemini in assisting with development, testing, and documentation tasks.

## 1. Project Overview

The "Flow Test Engine" is a powerful, TypeScript-based API testing framework. It allows developers to define and execute complex API test scenarios using declarative YAML files. The engine is designed for automation and CI/CD integration.

- **Core Technology**: TypeScript, Node.js
- **Primary Goal**: To enable flexible, powerful, and easy-to-maintain API testing.
- **Key Features**:
    - **Declarative YAML Tests**: Test flows are defined in `.yaml` files.
    - **Request Chaining**: Capture data from one API response and use it in subsequent requests.
    - **Dynamic Data**: In-built support for Faker.js (`{{faker.*}}`), JavaScript expressions (`{{$js.*}}`), and environment variables (`{{$env.*}}`).
    - **Advanced Assertions**: Validate status codes, headers, response times, and body content using JMESPath.
    - **Conditional Logic**: Define different execution paths based on response data.
    - **Swagger/OpenAPI Import**: Automatically generate test suites from API specifications.
    - **Comprehensive Reporting**: Generates JSON and HTML reports.
    - **CLI Tool**: A rich command-line interface (`flow-test`) for running and managing tests.

## 2. Key Files & Directories

- **`src/`**: Contains all the TypeScript source code.
    - **`src/cli.ts`**: The main entry point for the command-line interface.
    - **`src/core/engine.ts`**: The core logic for parsing YAML files and executing test steps.
    - **`src/core/discovery.ts`**: Handles the automatic discovery of test files in directories.
    - **`src/services/`**: Contains services for handling HTTP requests, assertions, variable interpolation, etc.
    - **`src/report-generator/`**: Code for generating HTML reports.
- **`tests/`**: Contains all the YAML test files (`.yaml`). This is where test scenarios are defined. The engine automatically discovers tests in this directory and its subdirectories.
- **`package.json`**: Defines project metadata, dependencies, and, most importantly, the `scripts` for building, running, and testing the project.
- **`flow-test.config.yml`**: The main configuration file for the test engine (though not present in the initial file listing, it's a key concept).
- **`results/`**: The default output directory for test execution logs (JSON format).
- **`docs/`**: Project documentation.

## 3. Building and Running

The project uses `npm` for script and dependency management.

- **Install Dependencies**:
  ```bash
  npm install
  ```

- **Build the Project**: Compiles TypeScript to JavaScript.
  ```bash
  npm run build
  ```
  *Output is placed in the `dist/` directory.*

- **Run All Tests (Primary Command)**: This is the main command for running the entire test suite. It performs a full cycle: build, import a Swagger spec for testing, run all discovered `.yaml` tests, and clean up.
  ```bash
  npm test
  ```

- **Run a Specific Test File (Development)**: Use `ts-node` to execute a single test file without a separate build step.
  ```bash
  npm run dev tests/path/to/your-test.yaml
  ```

- **Generate HTML Report**: After tests have run, you can generate an HTML report from the latest results.
  ```bash
  npm run report:html
  ```

## 4. Development Conventions

- **Testing**: All tests are written in YAML and reside in the `tests/` directory. The framework is built around the idea of file-based test discovery.
- **Code Style**: The project uses TypeScript. Adhere to the existing coding style and patterns found in the `src/` directory.
- **CLI First**: The primary interface for the tool is the `flow-test` CLI. New features should be exposed through this interface.
- **Documentation**: The project uses `api-extractor` to generate API documentation from TSDoc comments.

## 5. CLI Usage

The compiled CLI is available as `dist/cli.js` and can be invoked via `flow-test`.

- **Run all tests in a directory**:
  ```bash
  flow-test --directory ./tests --verbose
  ```

- **Filter tests by tag**:
  ```bash
  flow-test --tag user-onboarding,checkout-process
  ```

- **Import a Swagger/OpenAPI file**:
  ```bash
  flow-test --import-swagger path/to/api.json --swagger-output ./tests/imported
  ```

- **Dry Run**: Display the execution plan without making any HTTP requests.
  ```bash
  flow-test --dry-run
  ```

## 6. CI/CD & Docker

The project is well-equipped for CI/CD environments.
- **GitHub Actions**: A workflow is defined in `.github/workflows/test.yml` that runs `npm test` on every push.
- **Docker**: A `Dockerfile` and `docker-compose.yml` are provided to build and run the engine in a containerized environment, which also includes a mock server for testing.
