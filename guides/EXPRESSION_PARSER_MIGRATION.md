# Expression Parser Migration Guide

> ⚠️ **IMPORTANT UPDATE**: This guide was originally written as a migration guide, but **both syntaxes are now fully supported permanently**. You can:
> - ✅ **Keep using legacy syntax** (`{{$faker.x}}`, `{{$js:code}}`) - fully supported
> - ✅ **Use new syntax** (`#faker.x`, `$code`) - recommended for new code
> - ✅ **Mix both** in the same project - no problem!
>
> **See**: [interpolation-complete-reference.md](./interpolation-complete-reference.md) for comprehensive documentation of both syntaxes.

## Overview

The Flow Test Engine supports **two expression syntaxes** that work together seamlessly:

1. **Template Syntax** (Universal, Legacy): `{{$faker.x}}`, `{{$js:code}}`
2. **Direct Syntax** (New, Recommended): `#faker.x`, `$code`, `@query`

Both are fully supported indefinitely. This guide shows the differences and helps you choose.

> **Note on YAML Quoting**: In YAML, values that start with special characters (`@`, `#`, `$`) must be quoted to be treated as strings. The parser handles both quoted and unquoted values correctly.

## Quick Comparison

| Feature | Template Syntax | Direct Syntax |
|---------|-----------------|---------------|
| **Faker** | `"{{$faker.person.name}}"` | `"#faker.person.name"` ✨ |
| **JavaScript** | `"{{$js:Date.now()}}"` | `"$Date.now()"` ✨ |
| **JMESPath** | (only in capture) | `"@body.data[0]"` ✨ |
| **Mixing** | ✅ Can mix in one value | ❌ One prefix per value |
| **Composability** | ✅ `"{{env}}/{{path}}"` | Use template for this |
| **Readability** | More `{{}}` noise | Cleaner ✨ |
| **Type Safety** | Dynamic | Deterministic ✨ |
| **Support** | ✅ Forever | ✅ Forever |

**Recommendation**: Use **direct syntax** for single expressions, **templates** for composition.

## New Syntax System

### Expression Types and Prefixes

| Type | Prefix | Example | Use Case |
|------|--------|---------|----------|
| **Literal** | (none) | `"Hello World"` | Fixed text values |
| **Template** | `{{}}` | `{{$env.URL}}/api/{{version}}` | Variable interpolation |
| **JMESPath** | `@` | `@response.data[0].id` | JSON queries |
| **JavaScript** | `$` | `$return items.length * 2` | Calculations/logic |
| **Faker** | `#faker.` | `#faker.internet.email` | Test data generation |

### Deterministic Parsing Order

The parser checks expressions in this exact order:

1. **`#faker.`** prefix → Faker expression
2. **`@`** prefix → JMESPath expression
3. **`$`** prefix → JavaScript expression
4. **`{{`** → Template expression
5. **No prefix** → String literal

This means **the same input always produces the same type**, ensuring predictability.

## Migration from Old Syntax

### Current Syntax (Still Supported in Templates)

```yaml
# OLD: These work inside {{}} templates
variables:
  faker_name: "{{$faker.person.firstName}}"
  env_var: "{{$env.API_URL}}"
  js_calc: "{{$js:return 2 + 2}}"
```

### New Recommended Syntax

```yaml
# NEW: Direct prefix-based syntax
variables:
  # Faker: Remove {{ }} and $ prefix, add # prefix
  faker_name: "#faker.person.firstName"

  # Environment: Keep in template (works as before)
  env_var: "{{$env.API_URL}}"

  # JavaScript: Use $ prefix directly, remove {{}} and $js:
  js_calc: "$return 2 + 2"
  # OR for simple expressions:
  js_calc: "$2 + 2"  # Automatically adds 'return'
```

### Specific Changes

#### 1. Faker Expressions

**Before:**
```yaml
email: "{{$faker.internet.email}}"
name: "{{faker.person.fullName}}"  # Also worked
```

**After:**
```yaml
# ✅ Use #faker. prefix directly
email: "#faker.internet.email"
name: "#faker.person.fullName"
```

#### 2. JavaScript Expressions

**Before:**
```yaml
total: "{{$js:return items.reduce((s, i) => s + i.price, 0)}}"
calculated: "{{js:Math.random()}}"
```

**After:**
```yaml
# ✅ Use $ prefix directly
total: "$return items.reduce((s, i) => s + i.price, 0)"
calculated: "$Math.random()"
# OR (return is optional for simple expressions):
calculated: "$Math.random()"
```

#### 3. JMESPath Expressions (NEW!)

**Before (in capture config):**
```yaml
capture:
  user_id: "body.data.user.id"  # JMESPath implicit
```

**After (can be used anywhere):**
```yaml
# ✅ Use @ prefix for JMESPath queries
capture:
  user_id: "@body.data.user.id"

# Can also use in variables now:
variables:
  first_item: "@response.items[0]"
  active_users: "@users[?active]"
```

#### 4. Templates (Unchanged)

Templates still work exactly as before:

```yaml
# ✅ Templates work as before
url: "{{$env.BASE_URL}}/api/{{version}}/users"
message: "Hello {{username}}, you have {{count}} messages"

# Can still mix $env and $faker in templates:
description: "User {{$faker.person.firstName}} at {{$env.DOMAIN}}"
```

## Backward Compatibility

### What Still Works

✅ All existing templates with `{{}}` syntax
✅ `{{$env.VARIABLE}}` for environment variables
✅ `{{$faker.category.method}}` inside templates
✅ `{{$js:expression}}` inside templates
✅ Regular variable interpolation `{{variable_name}}`

### What's New

🆕 Direct Faker syntax: `#faker.category.method`
🆕 Direct JavaScript syntax: `$expression`
🆕 JMESPath anywhere: `@query`
🆕 Clear error messages for mixed syntax
🆕 Warnings for ambiguous expressions
🆕 Debug/trace mode for understanding parsing

## Common Migration Patterns

### Pattern 1: User Data Generation

**Before:**
```yaml
body:
  email: "{{$faker.internet.email}}"
  username: "{{$faker.internet.userName}}"
  firstName: "{{$faker.person.firstName}}"
```

**After:**
```yaml
body:
  email: "#faker.internet.email"
  username: "#faker.internet.userName"
  firstName: "#faker.person.firstName"
```

### Pattern 2: Calculations

**Before:**
```yaml
variables:
  total: "{{$js:return items.length * price}}"
  timestamp: "{{js:Date.now()}}"
```

**After:**
```yaml
variables:
  total: "$return items.length * price"
  # OR simplified:
  total: "$items.length * price"
  timestamp: "$Date.now()"
```

### Pattern 3: Combining Types

**Before:**
```yaml
body:
  user_id: "{{$faker.string.uuid}}"
  created_at: "{{js:new Date().toISOString()}}"
  api_url: "{{$env.API_BASE}}/users"
```

**After:**
```yaml
body:
  user_id: "#faker.string.uuid"
  created_at: "$new Date().toISOString()"
  # Template still works for env vars:
  api_url: "{{$env.API_BASE}}/users"
```

## Error Prevention

### Mixed Syntax Errors

❌ **Cannot mix prefixes:**
```yaml
# ERROR: Mixing @ and #faker
value: "@data with #faker.name"

# ERROR: Mixing $ and #faker
calc: "$return #faker.number.int"
```

✅ **Solution: Split into separate fields:**
```yaml
query_result: "@data"
fake_name: "#faker.person.name"
```

### Ambiguity Warnings

The parser warns about potentially ambiguous expressions:

⚠️ **Warning: Looks like JMESPath**
```yaml
# This looks like a query but is treated as literal string:
value: response.data[0].id
# Suggestion: Add @ prefix if you want JMESPath
value: @response.data[0].id
# Or quote it to make it explicitly a literal:
value: "response.data[0].id"
```

⚠️ **Warning: Looks like JavaScript**
```yaml
# This looks like code but is treated as literal string:
value: Math.random()
# Suggestion: Add $ prefix to execute
value: $Math.random()
# Or quote it to make it explicitly a literal:
value: "Math.random()"
```

⚠️ **Warning: Looks like Faker**
```yaml
# Missing # prefix:
value: faker.person.firstName
# Suggestion: Add # prefix
value: #faker.person.firstName
# Or quote it to make it explicitly a literal:
value: "faker.person.firstName"
```

## Debug Mode

Enable debug mode to see exactly how expressions are parsed:

```typescript
import { ExpressionParserService } from 'flow-test-engine';

const parser = new ExpressionParserService(logger);
parser.configure({ debug: true });

const result = parser.parseExpression("#faker.person.firstName");
console.log(result.trace);
// Output:
// [PARSE] Input: "#faker.person.firstName"
// [PARSE] Type: faker
// [FAKER] Method: faker.person.firstName
// [FAKER] Result: "John"
// [RESULT] Type: faker, Value: "John"
```

## Best Practices

### ✅ DO

1. **Use clear prefixes** for deterministic parsing
2. **Use `#faker.`** for test data generation
3. **Use `@`** for JSON queries (even in variables!)
4. **Use `$`** for calculations and logic
5. **Use `{{}}`** for variable interpolation
6. **Keep literals** without prefixes

### ❌ DON'T

1. **Don't mix** `@`, `$`, or `#faker` in one expression
2. **Don't use** `{{@query}}` - use `@query` directly
3. **Don't use** `{{$calc}}` for JavaScript - use `$calc`
4. **Don't omit** prefixes if you want special processing

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

## Support

For questions or issues with migration, please see:
- [Examples](../examples/patterns/deterministic-parser.yaml)
- [API Documentation](../docs/)
- [Issue Tracker](https://github.com/marcuspmd/flow-test/issues)

## Summary

**Both syntaxes are fully supported forever!** You don't need to migrate existing code.

### Syntax Support Matrix

| Syntax | Status | When to Use |
|--------|--------|-------------|
| `{{$faker.x}}` | ✅ **Fully Supported** | Existing code, templates with multiple expressions |
| `#faker.x` | ✅ **Fully Supported** | New code, single expressions, cleaner YAML |
| `{{$js:code}}` | ✅ **Fully Supported** | Existing code, nested variable interpolation |
| `$code` | ✅ **Fully Supported** | New code, simple calculations |
| `{{var}}` | ✅ **Fully Supported** | Variable interpolation (universal) |
| `@query` | ✅ **Fully Supported** | JMESPath queries (new feature) |

### Key Principles

The Flow Test Engine provides:
- ✅ **Predictable** expression processing
- ✅ **Clear** prefix-based syntax (new)
- ✅ **Full backward compatibility** (legacy)
- ✅ **Comprehensive** error detection
- ✅ **Debug support** for understanding parsing decisions
- ✅ **No breaking changes** - use what you prefer!

### Learn More

- **[interpolation-complete-reference.md](./interpolation-complete-reference.md)** - Complete guide to both syntaxes
- **[EXPRESSION_PARSER.md](./EXPRESSION_PARSER.md)** - Technical details on expression parser
- **[AGENTS.md](../AGENTS.md#3-sistema-de-interpolação-de-variáveis)** - Quick reference section
- **[Examples](../examples/)** - Example test suites with various syntax patterns

---

**Last Updated**: 2025-01-29
**Status**: Both syntaxes fully supported indefinitely
**Recommendation**: Use direct syntax (`#faker`, `$js`, `@`) for new code, keep legacy for existing code

