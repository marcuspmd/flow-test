# Interpolation Complete Reference

**Status**: ✅ Active | **Version**: 2.1 | **Last Updated**: 2025-01-29

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Syntax Overview](#syntax-overview)
3. [Template Variables `{{}}`](#template-variables-)
4. [Direct Expression Syntax](#direct-expression-syntax)
5. [Environment Variables](#environment-variables)
6. [Faker Test Data](#faker-test-data)
7. [JavaScript Expressions](#javascript-expressions)
8. [JMESPath Queries](#jmespath-queries)
9. [Priority and Resolution Order](#priority-and-resolution-order)
10. [Best Practices](#best-practices)
11. [Migration Guide](#migration-guide)
12. [Troubleshooting](#troubleshooting)

---

## Quick Reference

| **What You Want** | **Recommended Syntax** | **Also Works (Legacy)** |
|-------------------|------------------------|-------------------------|
| Variable | `{{user_id}}` | - |
| Environment Var | `{{$env.API_KEY}}` | - |
| Faker Data | **`"#faker.internet.email"`** | `{{$faker.internet.email}}` |
| JavaScript Code | **`"$Date.now()"`** | `{{$js:Date.now()}}` |
| JMESPath Query | **`"@body.data[0].id"`** | (in capture only) |
| Mixed Template | `"{{$env.URL}}/{{version}}"` | - |

> 💡 **TL;DR**: Use **direct syntax** (`#faker`, `$js`, `@query`) for cleaner code. Templates `{{}}` still work everywhere for backward compatibility.

---

## Syntax Overview

Flow Test Engine supports **two expression systems** that work together:

### 1. Template System (Universal)

```yaml
# ✅ Works everywhere - wraps expressions in {{}}
url: "{{$env.BASE_URL}}/api/v{{version}}/users"
email: "{{$faker.internet.email}}"
calc: "{{$js:items.length * 2}}"
```

**Characteristics**:
- Wrapped in `{{` and `}}`
- Supports variable interpolation
- Can mix multiple expressions
- Works in all YAML fields
- Backward compatible with all versions

### 2. Direct Expression System (New in v2.0)

```yaml
# ✅ Recommended - cleaner, deterministic
email: "#faker.internet.email"
calc: "$items.length * 2"
query: "@response.data[0].id"
```

**Characteristics**:
- Uses clear prefixes: `#`, `$`, `@`
- One expression per value (no mixing)
- Deterministic parsing (same input → same type)
- Cleaner YAML (less `{{}}` noise)
- Must be quoted in YAML

---

## Template Variables `{{}}`

### Basic Variable Interpolation

```yaml
variables:
  user_id: 123
  api_version: "v2"

steps:
  - name: "Get user"
    request:
      url: "/api/{{api_version}}/users/{{user_id}}"
      #     Results in: /api/v2/users/123
```

### Nested Object Access (Dot Notation)

```yaml
variables:
  user:
    profile:
      name: "John Doe"
      email: "john@example.com"

steps:
  - name: "Send email"
    request:
      body:
        recipient: "{{user.profile.email}}"
        greeting: "Hello {{user.profile.name}}"
```

### Array Access

```yaml
variables:
  items: [100, 200, 300]

steps:
  - name: "Use first item"
    request:
      body:
        price: "{{items[0]}}"  # 100
        total: "{{items.length}}"  # 3
```

### Cross-Suite Variables (Exported)

```yaml
# File: auth-suite.yaml
suite_name: "Authentication"
node_id: "auth"
exports: ["auth_token", "user_id"]

# File: main-suite.yaml
depends:
  - path: "./auth-suite.yaml"

steps:
  - name: "Protected request"
    request:
      headers:
        Authorization: "Bearer {{auth.auth_token}}"
        #                            ↑ suite node_id
      url: "/users/{{auth.user_id}}"
```

### Type Preservation

```yaml
variables:
  count: 42
  active: true
  tags: ["api", "test"]

# Single variable templates preserve types
assert:
  body:
    count: "{{count}}"  # → 42 (number)
    active: "{{active}}"  # → true (boolean)
    tags: "{{tags}}"  # → ["api", "test"] (array)

# Multi-variable templates become strings
url: "/items/{{count}}"  # → "/items/42" (string)
```

---

## Direct Expression Syntax

**New in v2.0**: Deterministic, prefix-based parsing with clear semantics.

### Parsing Order (Deterministic)

The parser checks expressions in this **exact order**:

1. `#faker.` → Faker expression
2. `@` → JMESPath expression
3. `$` → JavaScript expression
4. `{{` → Template expression
5. (no prefix) → String literal

This ensures **the same input always produces the same type**.

### Syntax Rules

✅ **DO**:
- Use ONE prefix per value
- Quote expressions in YAML (e.g., `"#faker.person.name"`)
- Use templates `{{}}` for mixing multiple types

❌ **DON'T**:
- Mix prefixes in one value: `"@data with #faker.name"` ❌
- Nest direct syntax: `"#faker.${other}}"` ❌
- Use direct syntax inside templates: `"{{#faker.name}}"` ❌ (use `{{$faker.name}}`)

---

## Environment Variables

### Syntax

```yaml
# ✅ Inside templates (REQUIRED for env vars)
base_url: "{{$env.API_BASE_URL}}"
api_key: "{{$env.SECRET_KEY}}"
timeout: "{{$env.REQUEST_TIMEOUT}}"

# ❌ Direct syntax NOT supported for env vars
base_url: "$env.API_BASE_URL"  # Won't work
```

### Configuration

**In `.env` file**:
```bash
FLOW_TEST_API_BASE_URL=https://api.example.com
FLOW_TEST_SECRET_KEY=abc123xyz
FLOW_TEST_REQUEST_TIMEOUT=30000
```

**In `flow-test.config.yml`**:
```yaml
globals:
  env_files:
    - .env
    - .env.local
    - .env.test
```

### Rules

- ✅ Variables MUST start with `FLOW_TEST_` prefix
- ✅ Use in YAML without prefix: `{{$env.API_KEY}}` reads `FLOW_TEST_API_KEY`
- ✅ Files loaded in order (last overwrites first)
- ✅ Not found = warning (doesn't fail test)

**See**: [guides/10.environment-variables-guide.md](./10.environment-variables-guide.md) for complete guide.

---

## Faker Test Data

### Syntax Comparison

| **Recommended (New)** | **Legacy (Still Works)** |
|-----------------------|--------------------------|
| `"#faker.person.firstName"` | `"{{$faker.person.firstName}}"` |
| `"#faker.internet.email"` | `"{{faker.internet.email}}"` |
| `"#faker.string.uuid"` | `"{{$faker.string.uuid}}"` |

### Direct Syntax (Recommended)

```yaml
body:
  # Simple values
  email: "#faker.internet.email"
  username: "#faker.internet.userName"
  uuid: "#faker.string.uuid"

  # With arguments
  age: "#faker.number.int({min: 18, max: 65})"
  product: "#faker.commerce.productName"

  # Dates
  created_at: "#faker.date.recent"
  birth_date: "#faker.date.past"
```

### Template Syntax (Legacy)

```yaml
body:
  email: "{{$faker.internet.email}}"
  name: "{{faker.person.fullName}}"  # $ optional
  id: "{{$faker.string.uuid}}"

  # Can mix in templates
  welcome: "Welcome {{$faker.person.firstName}}!"
```

### Popular Faker Categories

| Category | Examples | Use Case |
|----------|----------|----------|
| `#faker.person` | `firstName`, `lastName`, `fullName` | Names |
| `#faker.internet` | `email`, `url`, `userName`, `password` | Internet data |
| `#faker.string` | `uuid`, `alphanumeric`, `numeric` | Unique IDs |
| `#faker.number` | `int`, `float`, `binary` | Numbers |
| `#faker.date` | `past`, `future`, `recent`, `soon` | Timestamps |
| `#faker.commerce` | `productName`, `price`, `department` | E-commerce |
| `#faker.company` | `name`, `catchPhrase`, `bs` | Company data |
| `#faker.location` | `city`, `country`, `streetAddress` | Geography |
| `#faker.phone` | `number`, `imei` | Phone numbers |
| `#faker.lorem` | `word`, `sentence`, `paragraph` | Text content |

### Faker with Arguments

```yaml
# Number with range
age: "#faker.number.int({min: 18, max: 99})"

# Array element
status: "#faker.helpers.arrayElement(['active', 'pending', 'inactive'])"

# Multiple words
description: "#faker.lorem.words(5)"

# Price with decimals
price: "#faker.commerce.price({min: 10, max: 100, dec: 2})"
```

---

## JavaScript Expressions

### Syntax Comparison

| **Recommended (New)** | **Legacy (Still Works)** |
|-----------------------|--------------------------|
| `"$Date.now()"` | `"{{$js:Date.now()}}"` |
| `"$items.length * 2"` | `"{{js:items.length * 2}}"` |
| `"$return x > 10"` | `"{{$js:return x > 10}}"` |

### Direct Syntax (Recommended)

```yaml
variables:
  # Timestamps
  timestamp: "$Date.now()"
  iso_date: "$new Date().toISOString()"

  # Calculations
  total: "$price * quantity"
  tax: "$total * 0.1"
  final: "$total + tax"

  # Conditionals (auto-adds 'return')
  is_valid: "$status === 200"
  has_data: "$items.length > 0"

  # Explicit return
  result: "$return items.filter(i => i.active).length"

  # Complex logic
  encoded: "$Buffer.from('user:pass').toString('base64')"
  random: "$Math.floor(Math.random() * 100)"
```

### Template Syntax (Legacy)

```yaml
variables:
  timestamp: "{{$js:Date.now()}}"
  calculated: "{{js:10 * 5}}"  # $ optional

  # Can mix with variables
  message: "Count: {{$js:items.length}}, User: {{username}}"
```

### JavaScript Context

Available variables in JS expressions:

```yaml
variables:
  items: [1, 2, 3]
  user: {name: "John", age: 30}

steps:
  - request:
      body:
        # Access 'variables' object
        count: "$variables.items.length"  # 3
        name: "$variables.user.name"  # "John"

        # Or use directly (variables are in scope)
        count_direct: "$items.length"  # 3
        adult: "$user.age >= 18"  # true
```

### Common Patterns

```yaml
# Timestamps
variables:
  now: "$Date.now()"
  today: "$new Date().toISOString().split('T')[0]"
  tomorrow: "$new Date(Date.now() + 86400000).toISOString()"

# String manipulation
variables:
  uppercase: "$name.toUpperCase()"
  slug: "$title.toLowerCase().replace(/\s+/g, '-')"

# Base64 encoding
headers:
  Authorization: "$'Basic ' + Buffer.from('{{user}}:{{pass}}').toString('base64')"

# Array operations
variables:
  total: "$prices.reduce((sum, p) => sum + p, 0)"
  ids: "$users.map(u => u.id)"
  active: "$users.filter(u => u.status === 'active')"

# Conditional logic
variables:
  discount: "$isPremium ? price * 0.2 : 0"
  status_text: "$code >= 200 && code < 300 ? 'success' : 'error'"
```

---

## JMESPath Queries

### Syntax Comparison

| **Recommended (New)** | **Legacy (Capture Only)** |
|-----------------------|---------------------------|
| `"@body.data[0].id"` | `"body.data[0].id"` |
| `"@response.items[*].name"` | `"response.items[*].name"` |

### Direct Syntax (New in v2.0)

```yaml
# Can use in any field now!
variables:
  first_user: "@response.users[0]"
  all_ids: "@response.data[*].id"
  active_count: "@users[?active].length(@)"

assert:
  body:
    user_id: "@body.data.user.id"  # Extract nested value
```

### In Capture (Both Syntaxes Work)

```yaml
steps:
  - name: "Get users"
    request:
      method: GET
      url: "/users"

    capture:
      # ✅ New syntax (explicit)
      first_id: "@body.data[0].id"

      # ✅ Legacy syntax (implicit - still works)
      first_id_legacy: "body.data[0].id"

      # Both produce the same result
```

### JMESPath Response Context

The `@` queries operate on the response object:

```typescript
{
  status: 200,
  status_code: 200,
  headers: {...},
  body: {...},
  data: {...},  // alias for body
  response_time_ms: 245
}
```

### Common JMESPath Patterns

```yaml
capture:
  # Simple field access
  user_id: "@body.user.id"
  status: "@status_code"

  # Array indexing
  first_item: "@body.items[0]"
  last_item: "@body.items[-1]"

  # Projections (all elements)
  all_ids: "@body.users[*].id"
  all_names: "@body.data[*].name"

  # Filtering
  active_users: "@body.users[?status=='active']"
  premium_products: "@body.products[?price > `100`]"

  # Multi-select (create new object)
  user_summary: "@body.user.{id: id, name: name, email: email}"

  # Functions
  total_items: "length(@body.items)"
  max_price: "max(@body.products[*].price)"
  sorted: "sort_by(@body.items, &created_at)"

  # Complex queries
  active_premium: "@body.users[?status=='active' && tier=='premium']"
  recent_expensive: "@body.products[?price > `50`] | [0:5]"
```

---

## Priority and Resolution Order

### InterpolationService Strategy Priority

When using templates `{{}}`, strategies are evaluated in this order:

1. **EnvironmentVariableStrategy** (10): `{{$env.VAR}}`
2. **FakerStrategy** (20): `{{$faker.X.Y}}` or `{{faker.X.Y}}`
3. **JavaScriptStrategy** (30): `{{$js:code}}` or `{{js:code}}`
4. **VariableStrategy** (100): `{{variable}}` or `{{object.path}}`

### Variable Scope Hierarchy

When resolving `{{variable_name}}`, the search order is:

1. **Runtime variables** (captured in current step)
2. **Iteration variable** (`as` variable in loops)
3. **Suite local variables** (defined in `variables:`)
4. **Imported variables** (from `depends`)
5. **Global exported variables** (from other suites' `exports`)
6. **Global registry** (cross-suite shared state)

### Expression Parser Determinism

For direct syntax, parsing is deterministic and order-independent:

```yaml
# These are DIFFERENT types based on prefix alone
"#faker.person.name"  # → Always Faker
"$person.name"         # → Always JavaScript
"@person.name"         # → Always JMESPath
"{{person.name}}"      # → Always Template (→ Variable lookup)
"person.name"          # → Always literal string
```

---

## Best Practices

### ✅ Recommended

```yaml
# 1. Use direct syntax for single expressions
email: "#faker.internet.email"
timestamp: "$Date.now()"
user_id: "@body.user.id"

# 2. Use templates for composition
url: "{{$env.BASE_URL}}/api/v{{version}}/users"
message: "Hello {{user.name}}, your score is {{score}}"

# 3. Quote all expressions in YAML
correct: "#faker.person.name"  # ✅ Quoted
wrong: #faker.person.name      # ❌ YAML comment!

# 4. Use environment variables for secrets
api_key: "{{$env.API_KEY}}"  # ✅ Not hardcoded
api_key: "abc123xyz"          # ❌ Security risk

# 5. Prefer direct syntax for clarity
# Cleaner ✅
email: "#faker.internet.email"

# More verbose ❌
email: "{{$faker.internet.email}}"
```

### ❌ Anti-Patterns

```yaml
# 1. DON'T mix prefixes
value: "@data with #faker.name"  # ❌ Parse error

# 2. DON'T nest direct syntax
calc: "#faker.$other"  # ❌ Won't work

# 3. DON'T use direct syntax IN templates
name: "{{#faker.person.name}}"  # ❌ Use {{$faker.person.name}}

# 4. DON'T hardcode sensitive data
password: "my_secret_pass"  # ❌ Use {{$env.PASSWORD}}

# 5. DON'T use complex JS inline
# Hard to read ❌
value: "$users.filter(u => u.active).map(u => u.id).reduce((a,b) => a+b)"

# Better ✅
active_users: "$users.filter(u => u.active)"
active_ids: "$active_users.map(u => u.id)"
total: "$active_ids.reduce((a,b) => a+b)"
```

### Performance Tips

```yaml
# 1. Cache expensive calculations in variables
variables:
  current_timestamp: "$Date.now()"

steps:
  - request:
      headers:
        X-Request-Time: "{{current_timestamp}}"  # Reuse
        X-Expires-At: "${{current_timestamp}} + 3600000"

# 2. Avoid re-computing in loops
# Bad ❌
iterate:
  over: "{{items}}"
  as: "item"
  request:
    body:
      timestamp: "$Date.now()"  # Called for each iteration

# Good ✅
variables:
  batch_timestamp: "$Date.now()"

iterate:
  over: "{{items}}"
  as: "item"
  request:
    body:
      timestamp: "{{batch_timestamp}}"  # Computed once
```

---

## Migration Guide

### From Legacy to New Syntax

Not required! Both syntaxes work. But if you prefer cleaner YAML:

**Before (Legacy)**:
```yaml
body:
  email: "{{$faker.internet.email}}"
  username: "{{faker.person.firstName}}"
  timestamp: "{{$js:Date.now()}}"
  calculated: "{{js:10 * 5}}"
```

**After (New)**:
```yaml
body:
  email: "#faker.internet.email"
  username: "#faker.person.firstName"
  timestamp: "$Date.now()"
  calculated: "$10 * 5"
```

### Automated Migration Script

```bash
# Dry-run to preview changes
node scripts/migrate-yaml-syntax.js --dry-run

# Migrate specific file
node scripts/migrate-yaml-syntax.js --file tests/my-suite.yaml

# Migrate all tests
node scripts/migrate-yaml-syntax.js
```

### When to Migrate

**Migrate if**:
- ✅ Starting new test suites
- ✅ Want cleaner, more readable YAML
- ✅ Prefer deterministic parsing

**Keep legacy if**:
- ✅ Existing tests work fine
- ✅ Team is familiar with current syntax
- ✅ No time for migration

**Both syntaxes are fully supported indefinitely!**

---

## Troubleshooting

### Variables Not Found

```yaml
# ❌ Problem
url: "/users/{{user_id}}"
# Warning: Variable 'user_id' not found

# ✅ Solutions
# 1. Define in suite variables
variables:
  user_id: 123

# 2. Capture from previous step
steps:
  - request:
      method: POST
      url: "/users"
    capture:
      user_id: "body.id"

  - request:
      url: "/users/{{user_id}}"  # Now works
```

### Faker Expression Errors

```yaml
# ❌ Problem
email: "#faker.internet.emailAddress"  # Method doesn't exist
# Error: faker.internet.emailAddress is not a function

# ✅ Solution: Check correct method name
email: "#faker.internet.email"  # Correct
```

### JavaScript Syntax Errors

```yaml
# ❌ Problem
calc: "$items.lenght"  # Typo
# Error: items.lenght is undefined

# ✅ Solution: Check spelling
calc: "$items.length"

# ❌ Problem
encoded: "$Buffer.from({{user}}:{{pass}})"  # Wrong nesting
# Error: Unexpected token

# ✅ Solution: Use template for nested vars
encoded: "{{$js:Buffer.from('{{user}}:{{pass}}').toString('base64')}}"
```

### JMESPath Query Errors

```yaml
# ❌ Problem
id: "@body.users[[[0]]]"  # Invalid syntax
# Error: Failed to parse JMESPath expression

# ✅ Solution: Fix syntax
id: "@body.users[0]"

# ❌ Problem
ids: "@users.*.id"  # Wrong wildcard
# Error: Invalid JMESPath

# ✅ Solution: Use correct wildcard
ids: "@users[*].id"
```

### YAML Quoting Issues

```yaml
# ❌ Problem
email: #faker.internet.email  # YAML treats # as comment
# Result: email is null

# ✅ Solution: Always quote
email: "#faker.internet.email"

# ❌ Problem
calc: $10 * 5  # YAML anchor reference
# Error: Unknown alias

# ✅ Solution: Always quote
calc: "$10 * 5"
```

### Mixed Syntax Errors

```yaml
# ❌ Problem
value: "@data with #faker.name"
# Error: Cannot mix prefixes in expression

# ✅ Solution: Split into separate fields
data_value: "@data"
fake_name: "#faker.person.name"
combined: "{{data_value}} with {{fake_name}}"  # OK in template
```

---

## See Also

- **[EXPRESSION_PARSER_MIGRATION.md](./EXPRESSION_PARSER_MIGRATION.md)** - Original migration guide (both syntaxes work!)
- **[EXPRESSION_PARSER.md](./EXPRESSION_PARSER.md)** - Technical details on expression parser
- **[10.environment-variables-guide.md](./10.environment-variables-guide.md)** - Complete environment variables guide
- **[AGENTS.md](../AGENTS.md#3-sistema-de-interpolação-de-variáveis)** - Section 3: Variable interpolation system
- **[examples/](../examples/)** - Example test suites with various syntax patterns

---

**Last Updated**: 2025-01-29
**Version**: 2.1
**Status**: ✅ Active - Both syntaxes fully supported
