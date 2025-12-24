# Contributing to Flow Test Engine

First off, thank you for considering contributing to Flow Test Engine! 🎉

This document provides guidelines and steps for contributing. Following these guidelines helps communicate that you respect the time of the developers managing and developing this open source project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)
- [Commit Messages](#commit-messages)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 16.0.0 or higher
- **npm** 8.0.0 or higher
- **Git**
- **Docker Desktop** (optional, for mock server testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flow-test.git
   cd flow-test
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/marcuspmd/flow-test.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Verify Setup

Run the test suite to ensure everything is working:

```bash
# Run unit tests
npm test

# Run flow tests (requires httpbin - see step 4)
npm run test:flow
```

### 4. Start Mock Server (Optional)

For integration testing, start the httpbin mock server:

```bash
# Using Docker
npm run server:docker

# Check logs
npm run server:logs

# Stop when done
npm run server:down
```

### 5. Development Mode

Run the CLI directly with ts-node for quick iteration:

```bash
# Run a specific test suite
npm run dev tests/start-flow.yaml

# Or use ts-node directly
npx ts-node src/cli.ts --config flow-test.config.yml
```

## Project Structure

```
flow-test/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── core/
│   │   └── engine.ts          # Main test orchestrator
│   ├── services/              # Business logic services
│   │   ├── execution/         # Test execution services
│   │   ├── assertion/         # Assertion validation
│   │   ├── variable.service.ts # Variable interpolation
│   │   └── ...
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Utility functions
├── tests/                     # Example YAML test suites
├── examples/                  # Template examples
├── guides/                    # Documentation guides
├── report-dashboard/          # Astro-based dashboard
└── scripts/                   # Build and utility scripts
```

### Key Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | CLI command parsing and execution |
| `src/core/engine.ts` | Main test engine orchestrator |
| `src/services/variable.service.ts` | Variable interpolation logic |
| `src/types/common.types.ts` | Core type definitions |
| `flow-test.config.yml` | Default configuration |

## Making Changes

### 1. Create a Branch

```bash
# Sync with upstream first
git fetch upstream
git checkout master
git merge upstream/master

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, documented code
- Follow the existing code style
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run unit tests
npm test

# Run linting (if configured)
npm run lint

# Build to check for TypeScript errors
npm run build

# Run flow tests to ensure nothing broke
npm run test:flow
```

## Testing

### Unit Tests

We use Jest for unit testing. Tests are located in `__tests__` directories.

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Flow Tests

These are integration tests using YAML suites:

```bash
# Run all flow tests
npm run test:flow

# Run a specific suite
npm run dev tests/your-suite.yaml
```

### Writing Tests

When adding new features:

1. Write unit tests for individual functions/services
2. Add flow test examples demonstrating the feature
3. Ensure all existing tests pass

Example unit test:

```typescript
// src/services/__tests__/my-service.test.ts
import { MyService } from '../my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something specific', () => {
    const result = service.doSomething('input');
    expect(result).toBe('expected output');
  });
});
```

## Pull Request Process

### Before Submitting

1. ✅ Ensure all tests pass
2. ✅ Update documentation if needed
3. ✅ Add yourself to contributors (optional)
4. ✅ Write a clear PR description

### PR Title Format

Use conventional commits format:

```
feat: add new assertion operator
fix: resolve variable interpolation bug
docs: update API documentation
refactor: simplify execution service
test: add coverage for capture service
chore: update dependencies
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
- [ ] I have updated the documentation accordingly
```

### Review Process

1. Submit your PR against the `master` branch
2. Automated CI checks will run
3. A maintainer will review your code
4. Address any feedback
5. Once approved, the PR will be merged

## Style Guide

### TypeScript

- Use strict TypeScript (enabled in tsconfig.json)
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Interpolates variables in a template string.
 * @param template - The template containing {{variable}} placeholders
 * @param variables - Key-value pairs to substitute
 * @returns The interpolated string
 */
export function interpolate(
  template: string,
  variables: Record<string, unknown>
): string {
  // Implementation
}
```

### YAML Test Suites

- Use 2-space indentation
- Include descriptive `suite_name` and step `name` values
- Add comments for complex logic
- Follow examples in `examples/` directory

### Code Principles

- **Single Responsibility**: Each service/class should do one thing well
- **Dependency Injection**: Use Inversify for service dependencies
- **Immutability**: Prefer immutable data structures
- **Error Handling**: Use typed errors from `types/errors.types.ts`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or fixing tests
- `chore` - Maintenance tasks

### Examples

```
feat(assertions): add regex pattern matching operator

fix(variable-service): resolve nested object interpolation

docs(readme): add PHP integration example

test(capture-service): add edge case coverage
```

## Issue Guidelines

### Bug Reports

Include:
- Flow Test Engine version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Minimal YAML example if applicable

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Example YAML showing desired syntax

## Community

### Getting Help

- 📖 Check the [documentation](./guides/)
- 💬 Open a [GitHub Discussion](https://github.com/marcuspmd/flow-test/discussions)
- 🐛 Report bugs via [GitHub Issues](https://github.com/marcuspmd/flow-test/issues)

### Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes for significant contributions

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript |
| `npm test` | Run unit tests |
| `npm run test:flow` | Run flow tests |
| `npm run dev <file>` | Run single suite with ts-node |
| `npm run server:docker` | Start mock server |
| `npm run server:down` | Stop mock server |

---

Thank you for contributing to Flow Test Engine! 🚀
