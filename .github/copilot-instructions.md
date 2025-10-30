# Copilot Instructions — Flow Test Engine

## Project Overview

**Flow Test Engine** is a comprehensive TypeScript-based API testing engine that executes declarative test flows defined in YAML files. It's designed to be language-agnostic and can be integrated into any repository regardless of the tech stack.

**Purpose**: Execute API test suites with advanced features including:
- Request chaining and variable interpolation
- Flexible assertions and conditional scenarios
- Global variable registry across test suites
- Priority-driven test execution
- Dependency management between test suites
- Comprehensive JSON and HTML reporting

**Status**: Mature, production-ready system with modular service-based architecture.

## Technology Stack

- **Runtime**: Node.js 16+ (TypeScript 5.4+ with strict mode enabled)
- **Compilation**: TypeScript → CommonJS (target: ES6)
- **Execution**: ts-node for development, compiled CLI for production
- **Package Manager**: npm 8+
- **Optional**: Docker Desktop (for bundled httpbin mock server)

## Key Dependencies

- **axios**: HTTP client for making API requests
- **js-yaml**: YAML parsing for test suite files
- **jmespath**: JSON query language for data extraction
- **@faker-js/faker**: Dynamic test data generation
- **inversify**: Dependency injection container
- **zod**: Schema validation
- **jest**: Testing framework

## Repository Structure

```
flow-test/
├── src/
│   ├── cli.ts                    # CLI entry point with argument parsing
│   ├── core/
│   │   └── engine.ts             # Main orchestrator for test execution
│   ├── services/                 # Modular service layer
│   │   ├── execution/
│   │   │   ├── execution.service.ts        # Test execution orchestrator
│   │   │   └── hook-executor.service.ts    # Pre/post hook execution
│   │   ├── http.service.ts                 # HTTP request handling
│   │   ├── assertion/assertion.service.ts  # Assertion validation
│   │   ├── variable.service.ts             # Variable interpolation
│   │   ├── capture.service.ts              # Response data extraction
│   │   ├── global-registry.service.ts      # Cross-suite variables
│   │   ├── faker.service.ts                # Faker integration
│   │   ├── logger.service.ts               # Structured logging
│   │   └── qa-report.service.ts            # Report generation
│   ├── types/
│   │   └── common.types.ts       # Core type definitions
│   └── utils/                    # Utility functions
├── tests/                        # Example YAML test suites
│   └── start-flow.yaml           # Demo suite using httpbin.org
├── results/                      # Test execution artifacts (git-ignored)
├── dist/                         # Compiled JavaScript (git-ignored)
├── flow-test.config.yml          # Engine configuration file
└── package.json                  # npm scripts and dependencies
```

## Core Type System

All types are defined in `src/types/common.types.ts`:

- **TestSuite**: Root structure (`suite_name`, `base_url?`, `variables?`, `exports?`, `metadata?`, `steps[]`)
- **TestStep**: Individual test step with request, assertions, and capture definitions
- **RequestDetails**: HTTP request configuration (`method`, `url`, `headers?`, `body?`)
- **Assertions**: Validation rules (`status_code?`, `body?`, custom checks)
- **AssertionChecks**: Field-level validation (equals, contains, regex, type checks, etc.)

## Development Workflow

### Building
```bash
npm run build              # Compile TypeScript to dist/
```
Output: CommonJS modules in `dist/` directory

### Running Tests
```bash
# Run Jest unit tests
npm test

# Run flow tests (executes YAML suites)
npm run test:flow

# Run with development mode (ts-node)
npm run dev tests/my-suite.yaml
```

### CLI Usage
```bash
# Using npx (no install)
npx --yes flow-test-engine init
npx --yes fest --config flow-test.config.yml

# After global install
fest --config flow-test.config.yml --verbose
fest --priority critical --dry-run
```

### Mock Server (Optional)
```bash
npm run server:docker      # Start httpbin in Docker
npm run server:logs        # View server logs
npm run server:down        # Stop and remove containers
```

## YAML Test Suite Format

### Suite Structure
```yaml
node_id: "unique-id"                    # Unique identifier
suite_name: "Payment API Smoke Tests"   # Human-readable name
base_url: "https://api.example.com"     # Base URL for relative paths

metadata:
  priority: "critical"                  # critical|high|medium|low
  tags: ["smoke", "payments"]           # Tags for filtering
  dependencies: ["auth-suite"]          # Execute these suites first

variables:                              # Suite-local variables
  user_id: 123
  api_key: "{{$env.API_KEY}}"          # Environment variable

exports: ["auth_token", "user_data"]   # Make variables globally available

steps:
  - name: "Create payment"
    request:
      method: POST
      url: "/payments"                  # Relative to base_url
      headers:
        Authorization: "Bearer {{auth_token}}"
      body:
        amount: 100
        currency: "USD"
    assert:
      status_code: 201
      body:
        id: { exists: true, type: "string" }
        status: { in: ["CREATED", "PENDING"] }
    capture:
      payment_id: "body.id"             # JMESPath expression
```

### Variable Interpolation
- `{{variable_name}}` - Local or captured variable
- `{{$env.VAR_NAME}}` - Environment variable
- `{{$faker.internet.email}}` - Faker.js dynamic data
- `{{suite-name.exported_var}}` - Globally exported variable

### URL Resolution
- Relative URLs (starting with `/`) are prefixed with `base_url`
- Absolute URLs are used as-is

### Assertions
Supported checks: `equals`, `contains`, `regex`, `exists`, `type`, `in`, `length`, `greater_than`, `less_than`

### Capture Expressions
Use JMESPath syntax on response object: `{ status, headers, body }`

Example: `body.data[0].id` captures the first item's ID

## Coding Standards

### TypeScript
- **Strict mode enabled**: All strict TypeScript checks are enforced
- **No any types**: Use proper typing for all variables and functions
- **Decorators**: Use for dependency injection (`@injectable()`, `@inject()`)
- **Type safety**: Maintain union literal types (e.g., `RequestDetails.method: "GET" | "POST" | ...`)

### Code Style
- **Functional approach**: Prefer pure functions where possible
- **Service pattern**: Business logic in injectable services
- **Single Responsibility**: Each service has a clear, focused purpose
- **Error handling**: Use structured error types from `errors.types.ts`

### Logging
- Use standardized log prefixes: `[INFO]`, `[ERROR]`, `[DEBUG]`, `[STEP x/y]`
- Maintain existing logging patterns for consistency
- Respect `--verbose` flag for detailed output

### Dependencies
- **Minimize new dependencies**: Prefer existing libraries
- **Core trio**: axios, js-yaml, jmespath cover most needs
- **Security**: Never commit secrets, keys, or certificates
- **Version pinning**: Use exact versions for critical dependencies

## Testing Guidelines

### Unit Tests (Jest)
- Location: `src/**/__tests__/*.test.ts`
- Run with: `npm test`
- Coverage reports in `coverage/` (git-ignored)
- Mock external services appropriately

### Flow Tests (YAML)
- Location: `tests/*.yaml`
- Run with: `npm run test:flow` or `npm run dev <file>`
- Example: `tests/start-flow.yaml` demonstrates core features
- Use httpbin.org for public API testing

## Common Commands Reference

```bash
# Development
npm run dev tests/suite.yaml    # Run specific suite with ts-node
npm run build                   # Compile TypeScript

# Testing
npm test                        # Run Jest unit tests
npm run test:watch              # Watch mode for tests
npm run test:flow               # Execute YAML flow tests

# CLI Tool
npm run init                    # Initialize config and samples
fest --config flow-test.config.yml --verbose
fest --priority critical --tag smoke

# Docker (Mock Server)
npm run server:docker           # Start httpbin container
npm run server:down             # Stop containers

# Server Orchestrator
npm run orchestrator            # Run compiled orchestrator
npm run orchestrator:dev        # Run with ts-node
```

## Best Practices

### When Making Changes
1. **Minimal modifications**: Change only what's necessary
2. **Type safety first**: Maintain strict TypeScript compliance
3. **Test before PR**: Run `npm test` and `npm run build`
4. **No breaking changes**: Preserve existing API contracts
5. **Documentation**: Update relevant docs for public APIs

### Variable Management
- Suite variables are local to that suite
- Use `exports` to share variables globally (namespaced by suite name)
- Captured variables can overwrite existing ones in the same suite
- Environment variables are read-only

### Error Handling
- Assertions failures should abort execution with non-zero exit code
- HTTP errors should be logged with full request/response details
- Use structured error types for consistent handling

### Security
- Never commit `.env` files (use `.env.example` for templates)
- Avoid logging sensitive data (tokens, passwords, API keys)
- Certificates and keys go in `.gitignore`d directories
- Use variable masking utilities when logging requests

## Debugging Tips

- **Dry run**: `fest --dry-run` shows execution plan without running
- **Verbose mode**: `fest --verbose` includes full request/response details
- **Reports**: Check `results/latest.json` for detailed execution artifacts
- **Logs**: Structured output helps trace execution flow
- **Step isolation**: Test individual steps by creating minimal suites

## Additional Notes

- **CLI aliases**: `fest` is a shorter alias for `flow-test-engine`
- **Config precedence**: CLI flags override config file settings
- **Discovery**: Engine auto-discovers `**/*.yaml` files (configurable)
- **Priority execution**: Higher priority suites can fail-fast
- **Dependency resolution**: Dependencies are executed in topological order

## Contributing

- Follow existing code patterns and service architecture
- Write tests for new features
- Update this file when adding significant functionality
- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Keep PRs focused and atomic
