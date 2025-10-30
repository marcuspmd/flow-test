# Flow Test Engine - Examples

This directory contains ready-to-use test examples organized by complexity and use case. Use these as starting points for creating your own API test flows.

## Directory Structure

### `/basic` - Getting Started Examples
Simple, single-concept examples perfect for learning the basics:
- **simple-get.yaml** - Basic GET request with assertions
- **simple-post.yaml** - POST request with body and response validation
- **simple-auth.yaml** - Basic authentication flow
- **simple-variables.yaml** - Variable interpolation and capture

### `/intermediate` - Common Patterns
Real-world patterns you'll use frequently:
- **crud-operations.yaml** - Complete CRUD (Create, Read, Update, Delete) flow
- **auth-flow.yaml** - Full authentication with token refresh and logout
- **data-validation.yaml** - Comprehensive assertion examples
- **error-handling.yaml** - Testing error scenarios and edge cases
- **pagination.yaml** - Handling paginated API responses

### `/advanced` - Complex Scenarios
Advanced features and complex workflows:
- **conditional-logic.yaml** - Conditional execution and scenarios
- **data-driven.yaml** - Data-driven testing with iterations
- **multi-suite.yaml** - Cross-suite dependencies and exports
- **performance-testing.yaml** - Performance and load testing patterns

### `/patterns` - Reusable Patterns
Common patterns you can copy and adapt:
- **setup-teardown.yaml** - Test setup and cleanup patterns
- **retry-patterns.yaml** - Retry strategies for flaky endpoints
- **dynamic-data.yaml** - Using Faker.js for test data generation

## How to Use These Examples

### 1. Copy an Example
```bash
cp examples/basic/simple-get.yaml tests/my-first-test.yaml
```

### 2. Customize for Your API
Edit the copied file and update:
- `base_url` - Your API endpoint
- `suite_name` and `node_id` - Descriptive names for your test
- Request URLs and bodies - Match your API structure
- Assertions - Match your expected responses

### 3. Run Your Test
```bash
# Run with npx (no installation needed)
npx flow-test-engine tests/my-first-test.yaml

# Or if installed globally
flow-test-engine tests/my-first-test.yaml

# Or using the short alias
fest tests/my-first-test.yaml
```

## Quick Start Template Selection

Use the interactive init command to create a new test from a template:

```bash
npx flow-test-engine init --interactive
```

This will guide you through:
1. Selecting a template category
2. Choosing a specific template
3. Configuring your test details
4. Generating a ready-to-run test file

## Example Categories Explained

### Basic Examples
Start here if you're new to Flow Test Engine. These examples demonstrate individual features in isolation with clear comments.

**Best for:**
- First-time users
- Learning specific features
- Quick reference

### Intermediate Examples
These combine multiple features to solve common real-world testing scenarios.

**Best for:**
- Building production test suites
- Understanding feature interactions
- Common API testing patterns

### Advanced Examples
Complex workflows showcasing the full power of Flow Test Engine.

**Best for:**
- Complex integration testing
- Advanced automation scenarios
- Performance optimization

### Patterns
Reusable snippets you can integrate into any test suite.

**Best for:**
- Solving specific problems
- Copy-paste reference
- Best practices examples

## Additional Resources

- **[Quick Reference Guide](../guides/1.3.quick-reference.md)** - Syntax cheat sheet
- **[YAML Syntax Reference](../guides/4.yaml-syntax-reference.md)** - Complete YAML documentation
- **[Best Practices](../guides/6.best-practices.md)** - Testing best practices
- **[CLI Reference](../guides/2.cli-reference.md)** - Command-line options

## Contributing Examples

Have a useful pattern or example to share? We welcome contributions!

1. Create your example in the appropriate category
2. Add clear comments explaining each section
3. Include a brief description at the top
4. Test it to ensure it works
5. Submit a pull request

## Need Help?

- Check the [Getting Started Guide](../guides/1.getting-started.md)
- Review the [Configuration Guide](../guides/3.configuration-guide.md)
- Ask questions in [GitHub Discussions](https://github.com/marcuspmd/flow-test/discussions)
- Report issues in [GitHub Issues](https://github.com/marcuspmd/flow-test/issues)
