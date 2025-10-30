# Flow Test Engine - Examples

This directory contains ready-to-use test examples organized by complexity and use case. Use these as starting points for creating your own API test flows.

## Directory Structure

### `/basic` - Getting Started Examples
Simple, single-concept examples perfect for learning the basics:
- **simple-get.yaml** / **simple-get.json** - Basic GET request with assertions
- **simple-post.yaml** / **simple-post.json** - POST request with body and response validation
- **simple-auth.yaml** / **simple-auth.json** - Basic authentication flow
- **simple-variables.yaml** / **simple-variables.json** - Variable interpolation and capture

### `/intermediate` - Common Patterns
Real-world patterns you'll use frequently:
- **crud-operations.yaml** / **crud-operations.json** - Complete CRUD (Create, Read, Update, Delete) flow
- **auth-flow.yaml** / **auth-flow.json** - Full authentication with token refresh and logout
- **data-validation.yaml** - Comprehensive assertion examples
- **error-handling.yaml** - Testing error scenarios and edge cases
- **pagination.yaml** - Handling paginated API responses

### `/advanced` - Complex Scenarios
Advanced features and complex workflows:
- **conditional-logic.yaml** / **conditional-logic.json** - Conditional execution and scenarios
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

## Dual-Format Support (YAML + JSON)

Flow Test Engine supports both **YAML** and **JSON** formats for test definitions. Many examples are provided in both formats for validation and reference.

### Format Conventions

**YAML Files** (`.yaml`):
- More human-readable and compact
- Supports comments for documentation
- Recommended for manual test authoring
- Example: `simple-get.yaml` with `node_id: "simple-get-example-yaml"`

**JSON Files** (`.json`):
- Better for programmatic generation
- Strict syntax validation
- Easier integration with JSON-based tools
- Example: `simple-get.json` with `node_id: "simple-get-example-json"`

### Dual-Format Pairs

Paired YAML/JSON files validate mutual compatibility:
- Both formats produce **identical test results**
- `node_id` differs by format suffix (`-yaml` vs `-json`)
- Metadata tags include format identifier (`["yaml"]` or `["json"]`)
- All assertions and behaviors remain identical

### Converting Between Formats

**Convert single file:**
```bash
# YAML → JSON (auto-detect)
npm run convert:yaml-to-json examples/basic/simple-get.yaml

# JSON → YAML (auto-detect)
npm run convert:yaml-to-json examples/basic/simple-get.json
```

**Batch convert directory:**
```bash
# Convert all YAML files in a directory to JSON
npm run convert:batch examples/basic
```

### Validating Dual Formats

Verify that YAML and JSON versions produce identical results:

```bash
# Validate all paired examples
npm run validate:formats

# Validate with detailed comparison
npm run validate:formats:verbose

# Validate specific directory
npm run validate:formats examples/basic
```

**Validation Process:**
1. Discovers paired YAML/JSON files (e.g., `simple-get.yaml` + `simple-get.json`)
2. Runs both formats separately (respects priority execution order)
3. Compares normalized results (ignoring node_id, timestamps, UUIDs)
4. Reports any critical differences (failed assertions, different outcomes)

**Tolerances:**
- ✅ **Ignored differences**: `node_id`, `timestamps`, `duration_ms`, UUID values, Faker-generated data
- ⚠️ **Reported differences**: Success/failure status, assertion counts, step execution order
- ❌ **Critical failures**: Different success rates, failed assertions, missing steps

### Why Dual Formats?

1. **Validation**: Ensures format compatibility and engine consistency
2. **Flexibility**: Choose the format that fits your workflow
3. **Migration**: Easy conversion between formats as needs change
4. **Documentation**: Examples in both formats serve as references
5. **Tool Integration**: JSON for programmatic tools, YAML for human authoring

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
