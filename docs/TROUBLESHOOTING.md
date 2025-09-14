# Flow Test - Troubleshooting Guide

This guide helps you diagnose and resolve common issues when working with the Flow Test Engine.

## Table of Contents
- [Common Issues](#common-issues)
- [Debugging Techniques](#debugging-techniques)
- [Performance Issues](#performance-issues)
- [Configuration Problems](#configuration-problems)
- [Variable Issues](#variable-issues)
- [Assertion Failures](#assertion-failures)
- [Network and Connectivity](#network-and-connectivity)

## Common Issues

### YAML Syntax Errors

**Symptoms:**
- Engine fails to start with "Invalid YAML" error
- Unexpected token errors
- Parsing failures

**Solutions:**

1. **Validate YAML syntax:**
```bash
# Use online YAML validator or
npm install -g yaml-validator
yaml-validator your-test.yaml
```

2. **Common YAML mistakes:**
```yaml
# ❌ Wrong - Missing quotes around strings with special characters
variables:
  url: https://api.com?param=value&other=123

# ✅ Correct
variables:
  url: "https://api.com?param=value&other=123"

# ❌ Wrong - Incorrect indentation
steps:
- name: "Test"
request:
  method: GET  # Wrong indentation

# ✅ Correct
steps:
  - name: "Test"
    request:
      method: GET
```

3. **Check for special characters:**
```yaml
# ❌ Wrong - Unescaped special characters
variables:
  regex_pattern: ^[a-z]+$

# ✅ Correct
variables:
  regex_pattern: "^[a-z]+$"
```

### Engine Startup Failures

**Symptoms:**
- "Cannot find module" errors
- "Command not found" errors
- Import/require failures

**Solutions:**

1. **Check Node.js version:**
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be compatible
```

2. **Install dependencies:**
```bash
npm install
```

3. **Check file paths:**
```bash
# Ensure test files exist
ls -la tests/your-test.yaml

# Check if paths are absolute or relative correctly
node dist/cli.js ./tests/your-test.yaml  # Use relative path
```

4. **Clear node_modules and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## Debugging Techniques

### Verbose Logging

**Enable detailed logging:**
```bash
# Maximum verbosity
node dist/cli.js your-test.yaml --verbose

# Detailed output
node dist/cli.js your-test.yaml --detailed
```

**Log levels:**
- `--silent`: Only errors
- `--simple`: Basic progress (default)
- `--detailed`: Detailed information
- `--verbose`: Complete request/response details

### Save Debug Output

Execution results are written automatically to `results/` (latest at `results/latest.json`).
Generate an HTML viewer with:
```bash
npm run report:html
```

**Debug output includes:**
- Full request/response details
- Variable values at each step
- Assertion results
- Performance metrics
- Error stack traces

### Step-by-Step Execution

**Debug individual steps:**
```yaml
# Add debug steps to isolate issues
steps:
  - name: "Debug - Check variables"
    request:
      method: POST
      url: "/debug/log"
      body:
        variables: "{{_all_variables}}"
        step: 1

  - name: "Actual test step"
    request:
      method: GET
      url: "/api/test"
    # ... rest of your test

  - name: "Debug - Check response"
    request:
      method: POST
      url: "/debug/log"
      body:
        response: "{{_last_response}}"
        step: 2
```

## Performance Issues

### Slow Test Execution

**Symptoms:**
- Tests taking longer than expected
- Timeout errors
- Performance assertions failing

**Solutions:**

1. **Check network connectivity:**
```bash
# Test API endpoint directly
curl -X GET "https://api.example.com/health" \
  -H "Accept: application/json" \
  -w "@curl-format.txt"
```

2. **Adjust timeouts:**
```yaml
# Increase timeout for slow endpoints
variables:
  custom_timeout: 30000

steps:
  - name: "Slow operation"
    request:
      method: GET
      url: "/slow-endpoint"
      timeout: "{{custom_timeout}}"
```

3. **Optimize assertions:**
```yaml
# Use less expensive assertions
assert:
  status_code: 200
  # Instead of complex body validation
  body:
    success: true  # Simple check first
```

4. **Check for resource leaks:**
```yaml
# Add cleanup steps
steps:
  # ... test steps ...

  - name: "Cleanup"
    request:
      method: DELETE
      url: "/test/cleanup/{{test_session_id}}"
    continue_on_failure: true
```

### Memory Issues

**Symptoms:**
- Out of memory errors
- Engine crashes during large test suites
- Slow performance over time

**Solutions:**

1. **Increase Node.js memory limit:**
```bash
# Run with increased memory
node --max-old-space-size=4096 ./dist/main.js your-test.yaml
```

2. **Split large test suites:**
```yaml
# Instead of one large suite, create multiple smaller ones
# suite-1.yaml, suite-2.yaml, suite-3.yaml
```

3. **Use streaming for large responses:**
```yaml
# For large file downloads/uploads
steps:
  - name: "Large file download"
    request:
      method: GET
      url: "/large-file.zip"
      responseType: "stream"  # If supported
```

## Configuration Problems

### Environment Variables

**Symptoms:**
- Variables not resolving
- "Undefined variable" errors
- Environment-specific failures

**Solutions:**

1. **Check environment file:**
```bash
# Ensure .env file exists
ls -la .env

# Check .env content
cat .env
```

2. **Load environment variables:**
```bash
# Load .env file
npm install dotenv
node -r dotenv/config ./dist/main.js your-test.yaml
```

3. **Debug variable resolution:**
```yaml
steps:
  - name: "Debug environment"
    request:
      method: POST
      url: "/debug/variables"
      body:
        env_vars: "{{_environment_variables}}"
        all_vars: "{{_all_variables}}"
```

### Configuration File Issues

**Symptoms:**
- Config not loading
- Default values not applied
- Environment overrides not working

**Solutions:**

1. **Validate config file:**
```bash
# Check if config file exists
ls -la flow-test.config.yml

# Validate YAML syntax
npm install -g yaml-validator
yaml-validator flow-test.config.yml
```

2. **Check config structure:**
```yaml
# Example config structure
execution:
  mode: sequential
  timeout: 30000
  max_parallel: 5

globals:
  base_url: "https://api.example.com"
  timeouts:
    default: 30000
    slow: 60000

priorities:
  fail_fast_on_required: true
```

3. **Inspect effective config:**
Temporarily add a debug step or run a quick script that calls `ConfigManager.saveDebugConfig('results/config-debug.yaml')` if you need a full dump.

## Variable Issues

### Variable Not Found

**Symptoms:**
- "Variable not defined" errors
- Interpolation failures
- Empty values in requests

**Solutions:**

1. **Check variable scope:**
```yaml
# Variables must be defined before use
variables:
  user_id: 123

steps:
  - name: "Use variable"
    request:
      method: GET
      url: "/users/{{user_id}}"  # Variable defined above
```

2. **Check variable naming:**
```yaml
# Variable names are case-sensitive
variables:
  UserId: 123  # ❌ Wrong case
  user_id: 123  # ✅ Correct

steps:
  - name: "Use variable"
    request:
      method: GET
      url: "/users/{{user_id}}"  # Must match exactly
```

3. **Debug variable values:**
```yaml
steps:
  - name: "Debug variables"
    request:
      method: POST
      url: "/debug"
      body:
        available_vars: "{{_available_variables}}"
        all_vars: "{{_all_variables}}"
```

### Variable Interpolation Issues

**Symptoms:**
- Variables not replaced in URLs/headers
- Literal "{{variable}}" in requests
- Wrong variable values used

**Solutions:**

1. **Check syntax:**
```yaml
# ✅ Correct syntax
url: "/users/{{user_id}}"
headers:
  Authorization: "Bearer {{auth_token}}"

# ❌ Wrong syntax
url: "/users/{user_id}"        # Wrong braces
url: "/users/{{ user_id }}"    # Spaces not allowed
```

2. **Check variable availability:**
```yaml
# Variables must be available at interpolation time
steps:
  - name: "Capture first"
    request:
      method: POST
      url: "/login"
    capture:
      auth_token: "body.token"

  - name: "Use captured variable"
    request:
      method: GET
      url: "/protected"
      headers:
        Authorization: "Bearer {{auth_token}}"  # Now available
```

3. **Check for circular references:**
```yaml
# ❌ Circular reference
variables:
  url: "https://{{domain}}"
  domain: "{{url}}"  # References url which references domain

# ✅ Correct
variables:
  domain: "api.example.com"
  url: "https://{{domain}}"
```

## Assertion Failures

### Common Assertion Patterns

**Status code assertions:**
```yaml
# ✅ Correct
assert:
  status_code: 200

# ❌ Wrong - String instead of number
assert:
  status_code: "200"
```

**Body assertions:**
```yaml
# ✅ Correct
assert:
  body:
    success: true
    data:
      id: { greater_than: 0 }

# ❌ Wrong - Missing quotes for JMESPath
assert:
  body:
    data.id: { greater_than: 0 }  # Should be "data.id"
```

**Header assertions:**
```yaml
# ✅ Correct
assert:
  headers:
    content-type: "application/json"

# ❌ Wrong - Case sensitive
assert:
  headers:
    Content-Type: "application/json"  # Wrong case
```

### Debugging Assertions

**Add debug information:**
```yaml
steps:
  - name: "Test with debug"
    request:
      method: GET
      url: "/api/test"

    # Add debug before assertions
    capture:
      debug_response: "body"
      debug_headers: "headers"
      debug_status: "status_code"

  - name: "Debug step"
    request:
      method: POST
      url: "/debug"
      body:
        status: "{{debug_status}}"
        headers: "{{debug_headers}}"
        response: "{{debug_response}}"

    assert:
      status_code: 200
      body:
        success: true
```

**Test assertions individually:**
```yaml
# Test one assertion at a time
assert:
  status_code: 200
  # Comment out others temporarily
  # body:
  #   success: true
```

## Network and Connectivity

### Connection Timeouts

**Symptoms:**
- "ECONNREFUSED" errors
- "ETIMEDOUT" errors
- Slow connection establishment

**Solutions:**

1. **Check network connectivity:**
```bash
# Test basic connectivity
ping api.example.com

# Test specific port
telnet api.example.com 443
```

2. **Configure timeouts:**
```yaml
variables:
  connection_timeout: 10000
  request_timeout: 30000

steps:
  - name: "Test with custom timeout"
    request:
      method: GET
      url: "/api/test"
      timeout: "{{request_timeout}}"
```

3. **Use retry logic:**
```yaml
steps:
  - name: "Unstable endpoint"
    request:
      method: GET
      url: "/unstable"
    continue_on_failure: true

    scenarios:
      - condition: "status_code >= `500`"
        then:
          capture:
            retry_needed: "`true`"

  - name: "Retry if needed"
    request:
      method: GET
      url: "/unstable"
    continue_on_failure: false
```

### SSL/TLS Issues

**Symptoms:**
- "CERT_HAS_EXPIRED" errors
- "SSL handshake failed" errors
- "UNABLE_TO_VERIFY_LEAF_SIGNATURE" errors

**Solutions:**

1. **Disable SSL verification (development only):**
```yaml
steps:
  - name: "Test with SSL bypass"
    request:
      method: GET
      url: "/api/test"
      rejectUnauthorized: false  # Only for development
```

2. **Check certificates:**
```bash
# Check certificate validity
openssl s_client -connect api.example.com:443 -servername api.example.com

# Check certificate chain
openssl s_client -connect api.example.com:443 -showcerts
```

3. **Update certificates:**
```bash
# Update CA certificates
brew update && brew upgrade openssl  # macOS
# or
apt-get update && apt-get install ca-certificates  # Ubuntu
```

### Proxy Configuration

**Symptoms:**
- "ECONNREFUSED" through proxy
- Authentication failures
- SSL proxy issues

**Solutions:**

1. **Configure proxy:**
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1
```

2. **Test proxy configuration:**
```bash
# Test proxy connectivity
curl -x http://proxy.company.com:8080 https://api.example.com/health
```

3. **Configure proxy in tests:**
```yaml
# Set proxy in request configuration
steps:
  - name: "Test through proxy"
    request:
      method: GET
      url: "/api/test"
      proxy: "http://proxy.company.com:8080"
```

## Getting Help

### Log Analysis

**Enable comprehensive logging:**
```bash
node dist/cli.js your-test.yaml --verbose
```

**Analyze logs for patterns:**
- Look for "ERROR" or "WARN" messages
- Check variable values at failure points
- Verify request/response details
- Examine assertion failure reasons

### Community Support

1. **Check existing issues:**
   - Search GitHub issues for similar problems
   - Check closed issues for solutions

2. **Create minimal reproduction:**
   - Isolate the failing test
   - Remove unnecessary complexity
   - Include full error messages

3. **Provide debug information:**
   - Engine version
   - Node.js version
   - Operating system
   - Full test file
   - Complete error output

### Performance Profiling

**Profile test execution:**
```bash
# Use Node.js profiler
node --prof dist/cli.js your-test.yaml

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

**Memory profiling:**
```bash
# Check memory usage
node --expose-gc --inspect ./dist/main.js your-test.yaml
```

This troubleshooting guide should help you resolve most common issues. If you encounter problems not covered here, please check the GitHub issues or create a new issue with detailed information about your problem.
