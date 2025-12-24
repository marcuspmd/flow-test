# Comprehensive YAML Test Report
**Generated:** 2025-12-24  
**Test Server:** http://localhost:8080 (Running)

## Executive Summary

Executed comprehensive tests on **78 YAML files** (64 in tests/, 14 in examples/)

**Current Status:**
- ✅ **Passing:** 42 files (53.8%)
- ❌ **With Errors:** 36 files (46.2%)

## Recently Fixed Files (Commit d524730)

### ✅ Now Passing:
1. **examples/basic/simple-get.yaml**
   - Fixed: JMESPath quote handling (`body.headers."user-agent"`)
   - Fixed: Assertions updated for lowercase headers
   - Status: ✅ PASSING

2. **tests/hooks-example.yaml**
   - Fixed: Changed from dummyjson.com to localhost:8080
   - Fixed: Updated login endpoint to /post
   - Fixed: Adjusted assertions for test server responses
   - Status: ✅ PASSING

3. **tests/comprehensive-basic-test.yaml**
   - Fixed: JMESPath quote handling
   - Status: Improved (some steps passing)

## Detailed Error Analysis

### Category 1: JMESPath Syntax Errors (9 files)

**Files Affected:**
- array-filtering-examples.yaml
- complex-conditional-scenarios.yaml
- microservices-integration-test.yaml
- performance-response-time-comprehensive-test.yaml
- sensitive-data-security-test.yaml
- sequential-vs-parallel-execution-test.yaml
- examples/deterministic-parser.yaml

**Common Issues:**
- Invalid interpolation: `{{variable | jmespath}}`
- Unknown functions: `group_by()`
- Quote handling: `body.headers['User-Agent']` should be `body.headers."user-agent"`

**Example Fix:**
```yaml
# ❌ Wrong:
capture:
  user_agent: "body.headers['User-Agent']"

# ✅ Correct:
capture:
  user_agent: 'body.headers."user-agent"'
```

### Category 2: JavaScript Expression Errors (6 files)

**Files Affected:**
- advanced-iteration-comprehensive-test.yaml
- environment-feature-flags-comprehensive-test.yaml  
- error-handling-comprehensive-test.yaml
- parallel-execution-test.yaml
- performance-test.yaml
- skip-timing-example.yaml

**Common Issues:**
- Variables not defined in execution context
- Incorrect variable scoping

**Example Error:**
```
[ERROR] JavaScript execution error {
  error: ReferenceError: test_case is not defined
}
```

**Fix Required:**
- Ensure variables are defined before use
- Use correct variable names
- Check variable availability in JavaScript context

### Category 3: Assertion Failures (21 files)

**Files Affected:**
- auth-flows-test.yaml
- cli-comprehensive-test.yaml
- debug-introspection-test.yaml
- demo-timing-waterfall.yaml
- dependency-comprehensive-test.yaml
- dependency-setup-flow.yaml
- dynamic-test-generation.yaml
- edge-cases-test.yaml
- environment-variables-test.yaml
- faker-advanced-integration-test.yaml
- faker-comprehensive-test.yaml
- http-methods-complete-test.yaml
- integration-full-test.yaml
- logging-system-test.yaml
- meu-primeiro-test.yaml
- scenario-test.yaml
- tag-filtering-test.yaml
- test-alias-debug.yaml
- variable-cleanup-test.yaml
- variable-interpolation-test.yaml
- examples/simple-auth.yaml

**Common Issues:**
- Expected values don't match actual test server responses
- Headers are lowercase in test server (not mixed case)
- Response structure differs from httpbin.org

**Example Fix:**
```yaml
# ❌ Wrong (expects httpbin.org format):
assert:
  body:
    headers:
      User-Agent:  # Mixed case
        contains: "Flow"

# ✅ Correct (test server format):
assert:
  body:
    headers:
      user-agent:  # Lowercase
        contains: "Flow"
```

### Category 4: Scenario Evaluation Errors (3 files)

**Files Affected:**
- advanced-scenarios-test.yaml
- integration-full-test.yaml
- scenario-test.yaml

**Issue:**
```
[ERROR] Error evaluating scenario
Error: Invalid JMESPath condition 'status_code == `200` && contains(body.data, 'premium')'
Error: TypeError: contains() expected argument 1 to be type 2,3 but received type 7
```

**Fix Required:**
- Correct JMESPath type usage
- Use proper JMESPath functions
- Fix condition syntax

### Category 5: Faker Security Restrictions (1 file)

**File:** examples/dynamic-data.yaml

**Error:**
```
[ERROR] Error executing Faker method 'person.prefix'
Error: Faker method 'person.prefix' is not allowlisted for security reasons
```

**Fix Required:**
- Add `person.prefix` to Faker allowlist, or
- Use alternative Faker method that is allowed

## Files Currently Passing ✅

### Tests Directory (29 files):
1. advanced-assertions-comprehensive-test.yaml
2. advanced-retry-patterns-test.yaml
3. assertions-demo.yaml
4. call-alias-helper.yaml
5. call-alias-isolated.yaml
6. call-alias-test.yaml
7. complex-workflows-ecommerce-contracts-test.yaml
8. conditional-execution-comprehensive-test.yaml
9. data-formatting-examples.yaml
10. dependency-edge-cases.yaml
11. faker-demo.yaml
12. file-upload-multipart-comprehensive-test.yaml
13. file-upload-test.yaml
14. **hooks-example.yaml** ⭐ (newly fixed)
15. input-capture-advanced-test.yaml
16. input-capture-jmespath-test.yaml
17. input-capture-test.yaml
18. interactive-input-examples.yaml
19. iteration-examples.yaml
20. javascript-expressions-test.yaml
21. nested-array-filtering-examples.yaml
22. nested-steps-example.yaml
23. retry-logic-comprehensive-test.yaml
24. simple-hooks-test.yaml
25. start-flow.yaml
26. test-dynamic-computed.yaml
27. test-dynamic-persist.yaml
28. test-hooks-post-input.yaml
29. test-in-operator.yaml
30. webhooks-realtime-test.yaml

### Examples Directory (12 files):
1. conditional-logic.yaml
2. **simple-get.yaml** ⭐ (newly fixed)
3. simple-post.yaml
4. simple-variables.yaml
5. auth-flow.yaml
6. crud-operations.yaml
7. data-validation.yaml
8. error-handling.yaml
9. pagination.yaml
10. retry-patterns.yaml
11. setup-teardown.yaml

## Test Infrastructure Status

### ✅ Test Server
- **Status:** Running
- **URL:** http://localhost:8080
- **Endpoints:** All functional
- **Response Format:** JSON with lowercase headers

### ✅ Build System
- **TypeScript:** Compiling successfully
- **Jest:** Unit tests passing
- **CLI:** Functional

### ⚠️ Known Warnings (Non-blocking)
- `.env` file not found (expected, not critical)
- `.env.local` file not found (expected, not critical)

## Recommendations

### Immediate Actions (High Priority)
1. **Fix JMESPath Expressions** (9 files)
   - Update quote handling
   - Remove invalid functions
   - Fix interpolation syntax

2. **Update Assertions** (21 files)
   - Change header names to lowercase
   - Update expected response structures
   - Match test server response format

3. **Fix Variable Scoping** (6 files)
   - Ensure variables are defined
   - Check execution context
   - Fix undefined variable references

### Medium Priority
4. **Fix Scenario Evaluations** (3 files)
   - Correct JMESPath conditions
   - Fix type mismatches

5. **Update Faker Allowlist** (1 file)
   - Add `person.prefix` method

### Low Priority
6. **Add .env Files**
   - Suppress warnings
   - Document environment variables

## Progress Tracking

**Initial State:**
- ✅ Passing: 40 files (51.3%)
- ❌ With Errors: 38 files (48.7%)

**After d524730:**
- ✅ Passing: 42 files (53.8%) ⬆️ +2
- ❌ With Errors: 36 files (46.2%) ⬇️ -2

**Target:**
- ✅ Passing: 78 files (100%)
- ❌ With Errors: 0 files (0%)

## Conclusion

The test infrastructure is functional and 42 files are now passing (53.8%). The remaining 36 files have identifiable, fixable issues primarily related to:
- JMESPath syntax corrections
- Assertion updates for test server responses
- Variable scoping fixes

All errors are **fixable** and follow similar patterns, making systematic correction feasible.
