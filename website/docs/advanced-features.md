# Advanced Features

Flow Test Engine provides powerful advanced features for complex testing scenarios. This guide covers sophisticated patterns and techniques for comprehensive API testing.

## Request Chaining & Data Flow

### Basic Chaining

Request chaining allows you to pass data between test steps, creating realistic test flows:

```yaml
suite_name: "E-commerce User Journey"
base_url: "https://api.shop.example.com"

steps:
  # Step 1: User Registration
  - name: "Register new user"
    request:
      method: POST
      url: "/auth/register"
      body:
        email: "{{faker.internet.email}}"
        password: "SecurePass123!"
        first_name: "{{faker.person.firstName}}"
        last_name: "{{faker.person.lastName}}"

    assert:
      status_code: 201
      body:
        success:
          equals: true

    capture:
      user_id: "body.user.id"
      access_token: "body.tokens.access_token"
      refresh_token: "body.tokens.refresh_token"

  # Step 2: Create Shopping Cart
  - name: "Create shopping cart"
    request:
      method: POST
      url: "/cart"
      headers:
        Authorization: "Bearer {{access_token}}"
      body:
        user_id: "{{user_id}}"

    capture:
      cart_id: "body.cart.id"

  # Step 3: Add Items to Cart
  - name: "Add product to cart"
    request:
      method: POST
      url: "/cart/{{cart_id}}/items"
      headers:
        Authorization: "Bearer {{access_token}}"
      body:
        product_id: "PROD-123"
        quantity: 2
        price: 29.99

    capture:
      cart_total: "body.cart.total"
      item_count: "body.cart.item_count"

  # Step 4: Checkout Process
  - name: "Process checkout"
    request:
      method: POST
      url: "/orders"
      headers:
        Authorization: "Bearer {{access_token}}"
      body:
        cart_id: "{{cart_id}}"
        payment_method: "credit_card"
        shipping_address:
          street: "{{faker.location.streetAddress}}"
          city: "{{faker.location.city}}"
          country: "{{faker.location.country}}"

    assert:
      status_code: 201
      body:
        order.total:
          equals: "{{cart_total}}"
        order.status:
          equals: "confirmed"

    capture:
      order_id: "body.order.id"
      order_number: "body.order.number"
```

### Advanced Data Transformation

Use JavaScript expressions for complex data manipulation:

```yaml
steps:
  - name: "Get user data and transform"
    request:
      method: GET
      url: "/users/{{user_id}}"

    capture:
      # Basic extraction
      raw_user_data: "body.user"

      # Computed values
      full_name: "{{$js.return raw_user_data.first_name + ' ' + raw_user_data.last_name}}"

      # Date calculations
      days_since_registration: "{{$js.
        const regDate = new Date(raw_user_data.created_at);
        const now = new Date();
        return Math.floor((now - regDate) / (1000 * 60 * 60 * 24));
      }}"

      # Conditional logic
      user_status: "{{$js.
        if (raw_user_data.last_login) {
          const lastLogin = new Date(raw_user_data.last_login);
          const daysSince = (new Date() - lastLogin) / (1000 * 60 * 60 * 24);
          return daysSince < 30 ? 'active' : 'inactive';
        }
        return 'never_logged_in';
      }}"

      # Array processing
      active_subscriptions: "{{$js.
        return raw_user_data.subscriptions
          .filter(sub => sub.status === 'active')
          .map(sub => sub.id);
      }}"
```

## Complex Iteration Patterns

### Nested Iterations

Handle complex data structures with nested iterations:

```yaml
variables:
  departments:
    - name: "Engineering"
      teams:
        - { name: "Backend", members: 5 }
        - { name: "Frontend", members: 3 }
        - { name: "DevOps", members: 2 }
    - name: "Marketing"
      teams:
        - { name: "Digital", members: 4 }
        - { name: "Content", members: 2 }

steps:
  - name: "Create department {{dept.name}}"
    iterate:
      over: "{{departments}}"
      as: "dept"
    request:
      method: POST
      url: "/departments"
      body:
        name: "{{dept.name}}"
    capture:
      "dept_{{dept.name}}_id": "body.department.id"

  - name: "Create team {{team.name}} in {{dept.name}}"
    iterate:
      over: "{{departments}}"
      as: "dept"
      nested:
        over: "{{dept.teams}}"
        as: "team"
    request:
      method: POST
      url: "/teams"
      body:
        name: "{{team.name}}"
        department_id: "{{variables['dept_' + dept.name + '_id']}}"
        member_count: "{{team.members}}"
```

### Dynamic Range Iteration

Create ranges based on captured data:

```yaml
steps:
  - name: "Get configuration"
    request:
      method: GET
      url: "/config"
    capture:
      max_iterations: "body.settings.max_test_runs"

  - name: "Run test iteration {{index}}"
    iterate:
      range: "1..{{max_iterations}}"
      as: "index"
    request:
      method: POST
      url: "/test-runs"
      body:
        iteration: "{{index}}"
        timestamp: "{{$now}}"
```

### Conditional Iteration

Skip iterations based on conditions:

```yaml
variables:
  test_environments:
    - { name: "dev", enabled: true }
    - { name: "staging", enabled: true }
    - { name: "prod", enabled: false }

steps:
  - name: "Test {{env.name}} environment"
    iterate:
      over: "{{test_environments}}"
      as: "env"
      when: "{{env.enabled}}"  # Only iterate when enabled is true
    request:
      method: GET
      url: "{{env.base_url}}/health"
```

## Advanced Scenarios & Conditional Logic

### Multi-Condition Scenarios

Handle complex response conditions:

```yaml
steps:
  - name: "API call with complex response handling"
    request:
      method: GET
      url: "/api/data"

    scenarios:
      # Success with data
      - condition: "status_code == `200` && body.data && body.data | length(@) > `0`"
        then:
          capture:
            item_count: "body.data | length(@)"
            first_item: "body.data[0]"
            has_more: "body.pagination.has_more"

      # Success but empty
      - condition: "status_code == `200` && (!body.data || body.data | length(@) == `0`)"
        then:
          capture:
            empty_result: true
            message: "No data found"

      # Rate limited
      - condition: "status_code == `429`"
        then:
          capture:
            rate_limit_reset: "headers.x-rate-limit-reset"
            retry_after: "headers.retry-after"

      # Server error
      - condition: "status_code >= `500`"
        then:
          assert:
            body:
              error:
                exists: true
          capture:
            error_code: "body.error_code"
            error_message: "body.message"
            incident_id: "headers.x-incident-id"

      # Client error
      - condition: "status_code >= `400` && status_code < `500`"
        then:
          capture:
            validation_errors: "body.errors"
            error_details: "body.details"
```

### Scenario Chaining

Chain scenarios for complex flows:

```yaml
steps:
  - name: "Authenticate and handle responses"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"

    scenarios:
      # Successful authentication
      - condition: "status_code == `200`"
        then:
          capture:
            access_token: "body.access_token"
            user_role: "body.user.role"
            permissions: "body.user.permissions"

      # Two-factor authentication required
      - condition: "status_code == `202` && body.requires_2fa == `true`"
        then:
          capture:
            temp_token: "body.temp_token"
            mfa_methods: "body.available_methods"

      # Account locked
      - condition: "status_code == `423`"
        then:
          capture:
            lockout_reason: "body.reason"
            unlock_time: "body.unlock_at"

  # Follow-up step for 2FA
  - name: "Complete two-factor authentication"
    when: "{{temp_token}}"  # Only run if 2FA is required
    request:
      method: POST
      url: "/auth/verify-2fa"
      body:
        temp_token: "{{temp_token}}"
        code: "123456"  # In real tests, this would be dynamic

    capture:
      access_token: "body.access_token"
      user_role: "body.user.role"
```

## Performance Testing Features

### Response Time Monitoring

Monitor and assert on response times:

```yaml
steps:
  - name: "Performance-critical endpoint"
    request:
      method: GET
      url: "/api/critical-data"

    assert:
      # Response time assertions
      response_time_ms:
        less_than: 500          # Must respond within 500ms
        greater_than: 10        # Sanity check - shouldn't be too fast

      # Status assertions
      status_code: 200

    capture:
      actual_response_time: "response_time_ms"

  - name: "Log performance metrics"
    request:
      method: POST
      url: "/metrics"
      body:
        endpoint: "/api/critical-data"
        response_time: "{{actual_response_time}}"
        timestamp: "{{$now}}"
```

### Load Testing Patterns

Create load testing scenarios:

```yaml
variables:
  concurrent_users: 10
  requests_per_user: 20

steps:
  - name: "Load test - User {{user_id}} Request {{request_id}}"
    iterate:
      range: "1..{{concurrent_users}}"
      as: "user_id"
      nested:
        range: "1..{{requests_per_user}}"
        as: "request_id"
    request:
      method: GET
      url: "/api/endpoint"
      headers:
        X-User-ID: "{{user_id}}"
        X-Request-ID: "{{request_id}}"

    assert:
      status_code:
        not_equals: 500  # No server errors under load
      response_time_ms:
        less_than: 2000  # Acceptable performance under load

    capture:
      "performance_user_{{user_id}}_req_{{request_id}}": "response_time_ms"
```

## Error Handling & Resilience Testing

### Retry Logic

Implement custom retry patterns:

```yaml
steps:
  - name: "Flaky endpoint with retry"
    request:
      method: GET
      url: "/api/flaky-endpoint"

    retry:
      max_attempts: 3
      delay_ms: 1000
      exponential_backoff: true
      retry_on:
        - status_code: [500, 502, 503, 504]
        - timeout: true

    assert:
      status_code: 200

  - name: "Custom retry logic"
    request:
      method: POST
      url: "/api/process"
      body:
        data: "{{test_data}}"

    scenarios:
      # Success case
      - condition: "status_code == `200`"
        then:
          capture:
            result: "body.result"

      # Retry case
      - condition: "status_code == `202` && body.status == 'processing'"
        then:
          # Wait and retry
          wait: 2000
          retry:
            max_attempts: 5
            check_url: "/api/process/{{body.process_id}}/status"
            success_condition: "body.status == 'completed'"
```

### Circuit Breaker Pattern

Implement circuit breaker for resilience testing:

```yaml
variables:
  max_failures: 3
  failure_count: 0

steps:
  - name: "Circuit breaker test {{attempt}}"
    iterate:
      range: "1..10"
      as: "attempt"
    request:
      method: GET
      url: "/api/unreliable"

    scenarios:
      # Success case
      - condition: "status_code == `200`"
        then:
          capture:
            failure_count: 0  # Reset failure count

      # Failure case
      - condition: "status_code >= `500`"
        then:
          capture:
            failure_count: "{{$js.return failure_count + 1}}"

      # Circuit breaker open
      - condition: "failure_count >= max_failures"
        then:
          capture:
            circuit_open: true
          skip_remaining: true
```

## Global Variable Registry & Cross-Suite Communication

### Advanced Export Patterns

```yaml
# In data-setup.yaml
suite_name: "Data Setup"

steps:
  - name: "Create test organization"
    request:
      method: POST
      url: "/organizations"
      body:
        name: "Test Org {{$uuid}}"

    capture:
      org_id: "body.organization.id"
      org_name: "body.organization.name"
      api_key: "body.api_credentials.key"

  - name: "Create test users"
    iterate:
      range: "1..5"
      as: "index"
    request:
      method: POST
      url: "/users"
      body:
        organization_id: "{{org_id}}"
        email: "user{{index}}@testorg.com"
        role: "{{index == 1 ? 'admin' : 'user'}}"

    capture:
      "user_{{index}}_id": "body.user.id"

# Export for other suites
exports:
  - org_id
  - org_name
  - api_key
  - user_1_id
  - user_2_id
  - user_3_id
  - user_4_id
  - user_5_id
```

### Using Exported Data

```yaml
# In api-tests.yaml
suite_name: "API Tests"

dependencies:
  - suite: "data-setup"
    required: true

variables:
  # Reference exported data
  test_org_id: "{{data_setup.org_id}}"
  admin_user_id: "{{data_setup.user_1_id}}"
  regular_user_id: "{{data_setup.user_2_id}}"

steps:
  - name: "Test admin operations"
    request:
      method: GET
      url: "/admin/users"
      headers:
        Authorization: "Bearer {{data_setup.api_key}}"
        X-Organization-ID: "{{test_org_id}}"

    assert:
      status_code: 200
      body:
        users:
          length:
            equals: 5  # Should have 5 users from setup
```

## Custom JavaScript Integration

### Advanced JavaScript Expressions

```yaml
steps:
  - name: "Complex data processing"
    request:
      method: GET
      url: "/api/analytics"

    capture:
      # Complex data transformation
      processed_data: "{{$js.
        const rawData = body.data;
        const aggregated = rawData.reduce((acc, item) => {
          const key = item.category;
          if (!acc[key]) {
            acc[key] = { count: 0, total: 0 };
          }
          acc[key].count += 1;
          acc[key].total += item.value;
          acc[key].average = acc[key].total / acc[key].count;
          return acc;
        }, {});
        return aggregated;
      }}"

      # Validation logic
      data_valid: "{{$js.
        const data = body.data;
        return data.every(item =>
          item.hasOwnProperty('id') &&
          item.hasOwnProperty('value') &&
          typeof item.value === 'number' &&
          item.value >= 0
        );
      }}"

      # Generate test data
      test_payload: "{{$js.
        const categories = ['A', 'B', 'C'];
        return Array.from({length: 10}, (_, i) => ({
          id: `item_${i + 1}`,
          category: categories[i % categories.length],
          value: Math.floor(Math.random() * 100) + 1,
          timestamp: new Date().toISOString()
        }));
      }}"
```

### External Library Integration

```yaml
steps:
  - name: "Cryptographic operations"
    request:
      method: POST
      url: "/api/secure-data"
      body:
        # Generate hash
        checksum: "{{$js.
          const crypto = require('crypto');
          const data = JSON.stringify(payload_data);
          return crypto.createHash('sha256').update(data).digest('hex');
        }}"

        # Generate JWT-like token
        token: "{{$js.
          const crypto = require('crypto');
          const header = Buffer.from(JSON.stringify({typ: 'JWT', alg: 'HS256'})).toString('base64');
          const payload = Buffer.from(JSON.stringify({
            sub: user_id,
            exp: Math.floor(Date.now() / 1000) + 3600
          })).toString('base64');
          return `${header}.${payload}.signature`;
        }}"
```

This comprehensive guide covers the advanced features of Flow Test Engine. These patterns enable sophisticated testing scenarios that closely mirror real-world application behavior and provide robust validation of your APIs under various conditions.