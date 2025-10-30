# Expression Parser - Deterministic Syntax Guide

## Quick Reference

```
┌──────────────────────────┬────────────────┬──────────────────────────┐
│ What I Want              │ Syntax         │ Example                  │
├──────────────────────────┼────────────────┼──────────────────────────┤
│ Fixed text               │ "text"         │ "Hello World"            │
│ Variable/Template        │ {{var}}        │ {{$env.URL}}/{{id}}      │
│ JSON Query               │ @query         │ @response.data[0].id     │
│ Calculation/Logic        │ $code          │ $return x * 2            │
│ Fake test data           │ #faker.type    │ #faker.internet.email    │
└──────────────────────────┴────────────────┴──────────────────────────┘
```

## Overview

The Expression Parser provides a **deterministic**, **predictable** way to process expressions in your test suites. Every expression type has a clear prefix, eliminating ambiguity about how values will be processed.

## Expression Types

### 1. String Literals (No Prefix)

Plain text values that are used as-is without any processing.

```yaml
# String literals
name: "John Doe"
status: "active"
message: "Hello World"
```

### 2. Templates ({{}} Syntax)

Variable interpolation using double curly braces. Can reference environment variables, suite variables, and captured variables.

```yaml
# Environment variables
api_url: "{{$env.API_BASE_URL}}"

# Suite variables
full_path: "{{base_url}}/api/{{version}}/users"

# Multiple variables
message: "Hello {{username}}, you have {{count}} messages"
```

### 3. JMESPath Queries (@ Prefix)

Extract and query JSON data using JMESPath syntax. Now usable anywhere, not just in capture configurations!

```yaml
# Simple property access
user_id: "@response.data.user.id"

# Array indexing
first_item: "@items[0]"

# Filtering
active_users: "@users[?active]"

# Projection
all_names: "@users[*].name"

# Complex queries
high_value_orders: "@orders[?total > `100`]"
```

### 4. JavaScript Expressions ($ Prefix)

Execute JavaScript code for calculations, logic, and transformations.

```yaml
# Simple expression (return is optional)
total: "$10 * 5"

# With explicit return
calculated: "$return items.length * 2"

# Using Math
random: "$Math.random()"
max_value: "$Math.max(10, 20, 30)"

# Date operations
timestamp: "$Date.now()"
iso_date: "$new Date().toISOString()"

# Array operations
sum: "$[1, 2, 3].reduce((a, b) => a + b, 0)"
```

### 5. Faker Test Data (#faker. Prefix)

Generate realistic test data using Faker.js.

```yaml
# Person data
name: "#faker.person.fullName"
first_name: "#faker.person.firstName"
last_name: "#faker.person.lastName"

# Internet/Contact
email: "#faker.internet.email"
username: "#faker.internet.userName"
url: "#faker.internet.url"

# Location
city: "#faker.location.city"
street: "#faker.location.streetAddress"
country: "#faker.location.country"

# Numbers and IDs
uuid: "#faker.string.uuid"
random_int: "#faker.number.int"
age: "#faker.number.int({min: 18, max: 65})"

# Dates
recent_date: "#faker.date.recent"
future_date: "#faker.date.future"
```

## Deterministic Parsing

The parser checks expressions in a **specific order**:

1. **`#faker.`** → Faker expression
2. **`@`** → JMESPath expression  
3. **`$`** → JavaScript expression
4. **`{{`** → Template expression
5. **No prefix** → String literal

This ensures **the same input always produces the same type**, making tests predictable and reliable.

## Rules and Best Practices

### ✅ DO

- Use clear prefixes for deterministic parsing
- Use `#faker.` for test data generation
- Use `@` for JSON queries
- Use `$` for calculations and logic
- Use `{{}}` for variable interpolation
- Keep literals without prefixes

### ❌ DON'T

- Don't mix `@`, `$`, or `#faker` in one expression
- Don't use `{{@query}}` - use `@query` directly
- Don't use `{{$calc}}` for JavaScript - use `$calc`
- Don't omit prefixes if you want special processing

## Error Prevention

### Mixed Syntax Errors

```yaml
# ❌ ERROR: Cannot mix @ and #faker
value: "@data with #faker.name"

# ✅ SOLUTION: Split into separate fields
query_result: "@data"
fake_name: "#faker.person.name"
```

### Ambiguity Warnings

The parser warns about potentially ambiguous expressions:

```yaml
# ⚠️ Warning: Looks like JMESPath but treated as literal
value: "response.data[0].id"
# Suggestion: Add @ prefix
value: "@response.data[0].id"

# ⚠️ Warning: Looks like JavaScript but treated as literal
value: "Math.random()"
# Suggestion: Add $ prefix
value: "$Math.random()"
```

## Debug Mode

Enable debug mode to see exactly how expressions are parsed:

```typescript
import { ExpressionParserService } from 'flow-test-engine';

const parser = new ExpressionParserService(logger);
parser.configure({ debug: true });

const result = parser.parseExpression("#faker.person.firstName");
console.log(result.trace);
// Shows complete parsing steps
```

## Examples

See:
- **Example File**: `examples/patterns/deterministic-parser.yaml`
- **Migration Guide**: `guides/EXPRESSION_PARSER_MIGRATION.md`
- **API Documentation**: Generated TypeDoc

## Common Patterns

### User Registration

```yaml
body:
  email: "#faker.internet.email"
  username: "#faker.internet.userName"
  password: "#faker.internet.password"
  profile:
    first_name: "#faker.person.firstName"
    last_name: "#faker.person.lastName"
    age: "#faker.number.int({min: 18, max: 65})"
```

### Dynamic Calculations

```yaml
variables:
  item_count: 5
  unit_price: 10.99

body:
  quantity: "{{item_count}}"
  unit_price: "{{unit_price}}"
  subtotal: "$return {{item_count}} * {{unit_price}}"
  tax: "$return ({{item_count}} * {{unit_price}}) * 0.1"
  total: "$return ({{item_count}} * {{unit_price}}) * 1.1"
```

### Data Extraction and Transformation

```yaml
capture:
  # Extract with JMESPath
  user_ids: "@response.users[*].id"
  active_count: "@response.users[?active] | length(@)"
  
  # Calculate with JavaScript
  total_users: "$return response.users.length"
  has_admin: "$response.users.some(u => u.role === 'admin')"
```

## Benefits

✅ **Predictable**: Always know how expressions will be processed  
✅ **Clear**: Visual syntax indicates processing type  
✅ **Debuggable**: Trace mode shows each step  
✅ **Error-Safe**: Validation prevents syntax mixing  
✅ **Productive**: Short, intuitive prefixes  
✅ **Backward Compatible**: Existing templates still work

---

For complete documentation, see `EXPRESSION_PARSER_MIGRATION.md`.
