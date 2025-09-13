# Flow Test Engine v1.0 - API Documentation

## Overview

The Flow Test Engine v1.0 is a comprehensive API testing engine with support for directory-based execution, global variables, and priority-driven test management.

## Architecture

### Main Classes

#### `FlowTestEngine`
Main engine responsible for test discovery, planning, and execution.

```typescript
// See GlobalVariablesService section below for variable management and interpolation
```

**Main responsibilities:**
- Variable interpolation in templates with `{{variable}}` syntax
- Hierarchical scope resolution (global → suite → runtime → imported)
- Support for dot notation for imported variables (`suite.variable`)
- Type-safe variable resolution
- Circular reference detection

**Example usage:**
```typescript
import { GlobalVariablesService } from './src/services/global-variables';

async function demonstrateVariables() {
  const config = new ConfigManager({ config_file: './flow-test.config.yml' });
  const registry = new GlobalRegistryService();
  const variables = new GlobalVariablesService(config, registry);

  // Set different scopes (globals come from configuration)
  variables.setSuiteVariables({
    endpoint: 'users',
    default_limit: 10
  });

  variables.setRuntimeVariables({
    user_id: 123,
    auth_token: 'dynamic-token-123'
  });

  // Complex interpolation examples
  const examples = [
    '{{base_url}}/{{api_version}}/{{endpoint}}/{{user_id}}',
    'Bearer {{auth_token}}',
    'User {{user_id}} has role {{auth.session_token}}',
    '{{endpoint}}?limit={{default_limit}}&token={{auth_token}}'
  ];

  examples.forEach(template => {
    const result = variables.interpolateString(template);
    console.log(`${template} → ${result}`);
  });

  // Output:
  // {{base_url}}/{{api_version}}/{{endpoint}}/{{user_id}} → https://api.example.com/v1/users/123
  // Bearer {{auth_token}} → Bearer dynamic-token-123
  // User {{user_id}} has role {{auth.session_token}} → User 123 has role session-456
  // {{endpoint}}?limit={{default_limit}}&token={{auth_token}} → users?limit=10&token=dynamic-token-123
}
```

```typescript
// Basic usage
const engine = new FlowTestEngine('./config.yaml');
const result = await engine.run();

// With custom configuration
const engine = new FlowTestEngine({
  config_file: './flow-test.config.yml',
  environment: 'staging',
  verbosity: 'verbose',
  output_dir: './custom-results'
});
const result = await engine.run();
```

**Main responsibilities:**
- Test discovery from directories
- Filter application based on patterns
- Priority sorting and execution order
- Coordinated execution with dependencies
- Report generation in multiple formats

**Example usage:**
```typescript
import { FlowTestEngine } from './src/core/engine';

async function runTests() {
  const engine = new FlowTestEngine('./flow-test.config.yml');

  try {
    const results = await engine.run();

    console.log(`Tests completed: ${results.totalTests}`);
    console.log(`Tests successful: ${results.successfulTests}`);
    console.log(`Tests failed: ${results.failedTests}`);

    if (results.failedTests > 0) {
      console.log('Failed tests:');
      results.testResults
        .filter(r => r.status === 'failure')
        .forEach(r => console.log(`- ${r.suiteName}: ${r.errorMessage}`));
    }
  } catch (error) {
    console.error('Engine execution failed:', error);
  }
}
```

#### `ConfigManager`
Configuration manager that loads and validates all engine configurations.

```typescript
const configManager = new ConfigManager({
  config_file: './flow-test.config.yml',
  environment: 'staging',
  verbosity: 'verbose'
});
```

**Main responsibilities:**
- Configuration loading
- Environment variable resolution
- Runtime override application

#### `HttpService`
HTTP service responsible for executing requests and processing responses.

```typescript
// Basic usage
const httpService = new HttpService('https://api.example.com', 30000);
const result = await httpService.executeRequest('Login', {
  method: 'POST',
  url: '/auth/login',
  headers: { 'Content-Type': 'application/json' },
  body: { username: 'user', password: 'pass' }
});

// With custom timeout
const httpService = new HttpService('https://api.example.com', 60000);
```

**Main responsibilities:**
- HTTP request execution with multiple methods
- Performance measurement and timing
- Error handling and retry logic
- Response normalization and parsing
- Cookie and session management

**Example usage:**
```typescript
import { HttpService } from './src/services/http.service';

async function testAPI() {
  const httpService = new HttpService('https://jsonplaceholder.typicode.com');

  // GET request
  const getResult = await httpService.executeRequest('Get Users', {
    method: 'GET',
    url: '/users/1'
  });

  console.log('User:', getResult.response_details.body);

  // POST request with body
  const postResult = await httpService.executeRequest('Create Post', {
    method: 'POST',
    url: '/posts',
    headers: { 'Content-Type': 'application/json' },
    body: {
      title: 'Test Post',
      body: 'This is a test',
      userId: 1
    }
  });

  console.log('Created post ID:', postResult.response_details.body.id);
}
```

#### `AssertionService`
Service for validating assertions in HTTP responses.

```typescript
// Basic usage
const assertionService = new AssertionService();
const results = assertionService.validateAssertions({
  status_code: 200,
  body: {
    status: { equals: 'success' },
    data: { id: { greater_than: 0 } }
  },
  headers: {
    'content-type': { contains: 'application/json' }
  },
  response_time_ms: { less_than: 1000 }
}, executionResult);

// Note: custom validators via constructor are not supported in this version
```

**Main responsibilities:**
- Status code validation with operators
- Header validation with flexible matching
- Body validation using JMESPath expressions
- Response time validation
- Custom validation functions
- Detailed error reporting

**Example usage:**
```typescript
import { AssertionService } from './src/services/assertion.service';

async function validateResponse() {
  const assertionService = new AssertionService();

  const assertions = {
    status_code: 201,
    body: {
      user: {
        id: { greater_than: 0 },
        email: { regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        name: { not_equals: null }
      },
      created_at: { contains: new Date().getFullYear().toString() }
    },
    headers: {
      'content-type': { equals: 'application/json' },
      'x-api-version': { regex: '^v\\d+\\.\\d+$' }
    },
    response_time_ms: {
      less_than: 500,
      greater_than: 0
    }
  };

  const mockResponse = {
    status_code: 201,
    headers: {
      'content-type': 'application/json',
      'x-api-version': 'v1.2'
    },
    body: {
      user: {
        id: 123,
        email: 'user@example.com',
        name: 'John Doe'
      },
      created_at: '2024-01-15T10:30:00Z'
    },
    response_time_ms: 245
  };

  const results = assertionService.validateAssertions(assertions, mockResponse);

  results.forEach(result => {
    if (!result.passed) {
      console.log(`Assertion failed: ${result.field} - ${result.message}`);
    }
  });
}
```

#### `CaptureService`
Service for capturing variables from HTTP responses using JMESPath.

```typescript
// Basic usage
const captureService = new CaptureService();
const captured = captureService.captureVariables({
  user_id: 'body.user.id',
  token: 'body.access_token',
  user_email: 'body.user.email'
}, executionResult);
```

**Main responsibilities:**
- Data extraction using JMESPath expressions
- Variable capture for later use in requests
- Value formatting and transformation
- Support for nested object access
- Array indexing and filtering

## 📚 Complete Usage Examples

### 1. End-to-End API Testing Flow
```typescript
import { FlowTestEngine } from './src/core/engine';
import { ConfigManager } from './src/core/config';

async function runCompleteTestFlow() {
  // Initialize configuration
  const configManager = new ConfigManager({
    config_file: './flow-test.config.yml',
    environment: 'staging',
    verbosity: 'detailed'
  });

  // Create and run engine
  const engine = new FlowTestEngine(configManager.getConfig());
  const results = await engine.run();

  // Process results
  console.log(`Total tests: ${results.totalTests}`);
  console.log(`Successful: ${results.successfulTests}`);
  console.log(`Failed: ${results.failedTests}`);

  // Generate detailed report
  if (results.failedTests > 0) {
    console.log('\nFailed tests:');
    results.testResults
      .filter(r => r.status === 'failure')
      .forEach(r => {
        console.log(`- ${r.suiteName}: ${r.errorMessage}`);
        r.stepResults?.forEach(step => {
          if (step.status === 'failure') {
            console.log(`  Step "${step.stepName}": ${step.errorMessage}`);
          }
        });
      });
  }
}
```

### 2. HTTP Service Usage
```typescript
import { HttpService } from './src/services/http.service';

async function testWithCustomHttpService() {
  // Create HTTP service with custom configuration
  const httpService = new HttpService('https://api.example.com', 30000);

  try {
    // Test authentication
    const authResult = await httpService.executeRequest('Authentication', {
      method: 'POST',
      url: '/auth/login',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FlowTest/2.0'
      },
      body: {
        username: 'test@example.com',
        password: 'secure_password'
      }
    });

    console.log('Auth successful:', authResult.status === 'success');
    console.log('Response time:', authResult.duration_ms, 'ms');

    // Use token in subsequent requests
    const token = authResult.response_details?.body?.token;

    if (token) {
      const userResult = await httpService.executeRequest('Get User Profile', {
        method: 'GET',
        url: '/user/profile',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log('User profile:', userResult.response_details?.body);
    }

  } catch (error) {
    console.error('HTTP request failed:', error);
  }
}
```

### 3. Advanced Assertions Examples
```typescript
import { AssertionService } from './src/services/assertion.service';

async function advancedAssertionsExample() {
  const assertionService = new AssertionService({
    customValidators: {
      isValidEmail: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      isValidUUID: (value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      },
      isRecentDate: (value) => {
        const date = new Date(value);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        return diffInHours <= 24; // Within last 24 hours
      }
    }
  });

  const mockResponse = {
    status_code: 201,
    headers: {
      'content-type': 'application/json',
      'x-request-id': '550e8400-e29b-41d4-a716-446655440000'
    },
    body: {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'john.doe@example.com',
        name: 'John Doe',
        created_at: new Date().toISOString(),
        role: 'user'
      },
      metadata: {
        request_id: '550e8400-e29b-41d4-a716-446655440000',
        processing_time_ms: 150
      }
    },
    response_time_ms: 245
  };

  const assertions = {
    status_code: 201,
    body: {
      user: {
        id: { custom: 'isValidUUID' },
        email: { custom: 'isValidEmail' },
        name: { not_equals: null },
        created_at: { custom: 'isRecentDate' },
        role: { equals: 'user' }
      },
      metadata: {
        request_id: { custom: 'isValidUUID' },
        processing_time_ms: { less_than: 500 }
      }
    },
    headers: {
      'content-type': { equals: 'application/json' },
      'x-request-id': { custom: 'isValidUUID' }
    },
    response_time_ms: {
      less_than: 1000,
      greater_than: 0
    }
  };

  const results = assertionService.validateAssertions(assertions, mockResponse);

  console.log('All assertions passed:', results.every(r => r.passed));

  results.forEach(result => {
    if (!result.passed) {
      console.log(`❌ ${result.field}: ${result.message}`);
    } else {
      console.log(`✅ ${result.field}: OK`);
    }
  });
}
```

### 4. Variable Management Across Multiple Suites
```typescript
import { GlobalVariablesService } from './src/services/global-variables';
import { GlobalRegistryService } from './src/services/global-registry.service';
import { ConfigManager } from './src/core/config';

async function crossSuiteVariableManagement() {
  const config = new ConfigManager({ config_file: './flow-test.config.yml' });
  const registry = new GlobalRegistryService();
  const variables = new GlobalVariablesService(config, registry);

  // Suite/runtime variables (globals come from configuration)
  variables.setSuiteVariables({
    endpoint: 'users',
    default_limit: 20
  });

  // Register suites in registry
  registry.registerNode('auth', 'Authentication Suite', ['token', 'user_id'], './auth.yaml');
  registry.registerNode('users', 'User Management Suite', ['created_user', 'profile'], './users.yaml');

  // Simulate auth suite execution
  registry.setExportedVariable('auth', 'token', 'jwt-super-secret-token');
  registry.setExportedVariable('auth', 'user_id', 'user-12345');

  // Simulate user creation
  registry.setExportedVariable('users', 'created_user', 'user-67890');
  registry.setExportedVariable('users', 'profile', {
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'admin'
  });

  // Demonstrate variable resolution
  const templates = [
    '{{base_url}}/{{api_version}}/{{endpoint}}',
    'Bearer {{auth.token}}',
    'User {{auth.user_id}} created {{users.created_user}}',
    '{{users.profile.name}} <{{users.profile.email}}>'
  ];

  console.log('Variable interpolation examples:');
  templates.forEach(template => {
    const result = variables.interpolateString(template);
    console.log(`${template} → ${result}`);
  });

  // Show all available variables
  const availableVars = registry.getAvailableVariableNames();
  console.log('\nAvailable variables:', availableVars);

  // Demonstrate hierarchical access
  console.log('\nDirect registry access:');
  console.log('Auth token:', registry.getExportedVariable('auth.token'));
  console.log('User profile:', registry.getExportedVariable('users.profile'));
}
```

### 5. Complex Capture Scenarios with JMESPath
```typescript
import { CaptureService } from './src/services/capture.service';

async function complexCaptureExample() {
  const captureService = new CaptureService();

  const mockResponse = {
    status_code: 200,
    headers: {
      'content-type': 'application/json',
      'x-api-version': '2.1.0'
    },
    body: {
      order: {
        id: 'ORD-2024-001',
        customer: {
          id: 'CUST-123',
          name: 'Alice Johnson',
          email: 'alice.johnson@company.com',
          tier: 'premium'
        },
        items: [
          { id: 'ITEM-1', name: 'Laptop', price: 1200, quantity: 1 },
          { id: 'ITEM-2', name: 'Mouse', price: 25, quantity: 2 },
          { id: 'ITEM-3', name: 'Keyboard', price: 75, quantity: 1 }
        ],
        shipping: {
          address: '123 Main St, Anytown, USA',
          method: 'express',
          cost: 15.99
        },
        payment: {
          method: 'credit_card',
          status: 'approved',
          transaction_id: 'TXN-789012'
        },
        metadata: {
          created_at: '2024-01-15T14:30:00Z',
          source: 'web',
          tags: ['electronics', 'premium_customer']
        }
      },
      related_orders: [
        { id: 'ORD-2024-002', status: 'pending' },
        { id: 'ORD-2024-003', status: 'shipped' }
      ]
    }
  };

  const captureRules = {
    // Basic field extraction
    order_id: 'body.order.id',
    customer_name: 'body.order.customer.name',
    customer_email: 'body.order.customer.email',

    // Array operations
    first_item_name: 'body.order.items[0].name',
    all_item_names: 'body.order.items[].name',
    expensive_items: 'body.order.items[?price > `100`]',

    // Conditional extraction
    payment_status: 'body.order.payment.status',
    shipping_cost: 'body.order.shipping.cost',

    // Derived values can be computed later with {{js:}} during interpolation if needed
    item_count: 'length(body.order.items)',

    // String transformations
    customer_domain: 'body.order.customer.email | extractDomain(@)',
    customer_name_upper: 'body.order.customer.name | toUpperCase(@)',

    // Nested object extraction
    shipping_address: 'body.order.shipping.address',
    transaction_id: 'body.order.payment.transaction_id',

    // Metadata extraction
    order_tags: 'body.order.metadata.tags',
    order_source: 'body.order.metadata.source',

    // Related data
    related_order_count: 'length(body.related_orders)',
    first_related_order: 'body.related_orders[0].id'
  };

  const captured = captureService.captureVariables(captureRules, mockResponse);

  console.log('Captured variables:');
  Object.entries(captured).forEach(([key, value]) => {
    console.log(`${key}: ${JSON.stringify(value)}`);
  });
}
```

### 6. Error Handling and Recovery Patterns
```typescript
import { HttpService } from './src/services/http.service';
import { AssertionService } from './src/services/assertion.service';

async function errorHandlingExample() {
  const httpService = new HttpService('https://api.unreliable.com', 10000, {
    retries: 3,
    retryDelay: 2000
  });

  const assertionService = new AssertionService();

  async function executeWithRetry(requestConfig: any, maxRetries = 3) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);

        const result = await httpService.executeRequest(
          `Request (attempt ${attempt})`,
          requestConfig
        );

        // Validate response
        const assertions = {
          status_code: { less_than: 500 },
          response_time_ms: { less_than: 5000 }
        };

        const assertionResults = assertionService.validateAssertions(assertions, result);

        if (assertionResults.every(r => r.passed)) {
          console.log('✅ Request successful');
          return result;
        } else {
          console.log('⚠️  Response validation failed, but not a server error');
          return result;
        }

      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError?.message}`);
  }

  // Test different scenarios
  const testCases = [
    {
      name: 'Stable endpoint',
      config: { method: 'GET', url: '/health' }
    },
    {
      name: 'Unstable endpoint',
      config: { method: 'GET', url: '/unstable' }
    },
    {
      name: 'Slow endpoint',
      config: { method: 'GET', url: '/slow' }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      const result = await executeWithRetry(testCase.config);
      console.log(`Status: ${result.status_code}, Time: ${result.response_time_ms}ms`);
    } catch (error) {
      console.log(`💥 Test failed: ${error.message}`);
    }
  }
}
```

**Example usage:**
```typescript
import { CaptureService } from './src/services/capture.service';

async function captureVariables() {
  const captureService = new CaptureService();

  const captureRules = {
    // Simple field extraction
    user_id: 'body.data.user.id',
    username: 'body.data.user.username',

    // Array access
    first_post_title: 'body.data.posts[0].title',
    all_tags: 'body.data.tags[]',

    // Conditional extraction
    auth_token: 'body.token || headers.authorization',
    error_code: 'body.error.code || `UNKNOWN_ERROR`',

    // Complex expressions
    full_name: 'join(` `, [body.data.user.first_name, body.data.user.last_name])',
    is_active: 'body.data.user.status == `active`',

    // Headers extraction
    content_type: 'headers.content-type',
    request_id: 'headers.x-request-id'
  };

  const mockResponse = {
    status_code: 200,
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req-12345'
    },
    body: {
      data: {
        user: {
          id: 123,
          username: 'johndoe',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        posts: [
          { id: 1, title: 'First Post' },
          { id: 2, title: 'Second Post' }
        ],
        tags: ['javascript', 'typescript', 'api']
      },
      token: 'jwt-token-here'
    }
  };

  const captured = captureService.captureVariables(captureRules, mockResponse);

  console.log('Captured variables:', captured);
  // Output:
  // {
  //   user_id: 123,
  //   username: 'johndoe',
  //   first_post_title: 'First Post',
  //   all_tags: ['javascript', 'typescript', 'api'],
  //   auth_token: 'jwt-token-here',
  //   full_name: 'John Doe',
  //   is_active: true,
  //   content_type: 'application/json',
  //   request_id: 'req-12345'
  // }
}
```

#### `VariableService`
Variable interpolation and resolution service.

```typescript
const variableService = new VariableService(variableContext);
const interpolated = variableService.interpolate('{{api_url}}/users/{{user_id}}');
```

**Main responsibilities:**
- Variable interpolation in templates
- Hierarchical scope resolution
- Support for dot notation for imported variables

#### `IterationService`
Service for handling iteration patterns in test steps, supporting both array and range iterations.

```typescript
// Basic usage
const iterationService = new IterationService();

// Array iteration configuration
const arrayConfig: ArrayIterationConfig = {
  over: "{{test_users}}",
  as: "item"
};

// Range iteration configuration
const rangeConfig: RangeIterationConfig = {
  range: "1..5",
  as: "index"
};

// Expand iteration contexts
const contexts = iterationService.expandIteration(arrayConfig, variableContext);
contexts.forEach(context => {
  console.log(`Iteration ${context.index}: ${context.value}`);
});
```

**Main responsibilities:**
- Parse and validate iteration configurations
- Expand array iterations into individual contexts
- Generate range iterations with start/end bounds
- Provide iteration metadata (index, isFirst, isLast)
- Variable isolation and scoping for each iteration

**Example usage:**
```typescript
import { IterationService } from './src/services/iteration.service';

async function demonstrateIteration() {
  const iterationService = new IterationService();

  // Array iteration example
  const testUsers = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ];

  const arrayConfig = {
    over: "{{test_users}}",
    as: "item"
  };

  const arrayContexts = iterationService.expandIteration(arrayConfig, { test_users: testUsers });
  console.log('Array iteration contexts:');
  arrayContexts.forEach(ctx => {
    console.log(`- Iteration ${ctx.index}: ${ctx.value.name} (${ctx.value.email})`);
    console.log(`  isFirst: ${ctx.isFirst}, isLast: ${ctx.isLast}`);
  });

  // Range iteration example
  const rangeConfig = {
    range: "1..5",
    as: "index"
  };

  const rangeContexts = iterationService.expandIteration(rangeConfig, {});
  console.log('Range iteration contexts:');
  rangeContexts.forEach(ctx => {
    console.log(`- Iteration ${ctx.index}: value=${ctx.value}`);
  });

  // Validation
  console.log('Array config valid:', iterationService.validateIterationConfig(arrayConfig));
  console.log('Range config valid:', iterationService.validateIterationConfig(rangeConfig));
}
```

#### `GlobalRegistryService`
Global registry service for variables exported between flows.

```typescript
// Basic usage
const registry = new GlobalRegistryService();

// Register a suite with exports
registry.registerNode('auth-suite', 'Authentication Flow', ['user_token', 'user_id'], './auth.yaml');

// Set exported variables
registry.setExportedVariable('auth-suite', 'user_token', 'abc123');
registry.setExportedVariable('auth-suite', 'user_id', 'user-456');

// Access variables in other suites
const token = registry.getExportedVariable('auth-suite.user_token');
const userId = registry.getExportedVariable('auth-suite.user_id');

// List all available variables
const availableVars = registry.getAvailableVariableNames();
console.log('Available variables:', availableVars);
// Output: ['auth-suite.user_token', 'auth-suite.user_id']
```

**Main responsibilities:**
- Suite registration and export declaration
- Variable sharing between different test suites
- Namespace management to avoid conflicts
- Registry integrity validation
- Fast variable lookup and indexing

**Example usage:**
```typescript
import { GlobalRegistryService } from './src/services/global-registry.service';

async function demonstrateRegistry() {
  const registry = new GlobalRegistryService();

  // Register multiple suites with their exports
  registry.registerNode('auth', 'Authentication Suite', ['token', 'user_id', 'permissions'], './auth.yaml');
  registry.registerNode('user-mgmt', 'User Management Suite', ['created_user_id', 'profile_data'], './user-mgmt.yaml');
  registry.registerNode('payment', 'Payment Suite', ['transaction_id', 'payment_status'], './payment.yaml');

  // Set variables for each suite
  registry.setExportedVariable('auth', 'token', 'jwt-token-123');
  registry.setExportedVariable('auth', 'user_id', 'user-456');
  registry.setExportedVariable('auth', 'permissions', ['read', 'write']);

  registry.setExportedVariable('user-mgmt', 'created_user_id', 'user-789');
  registry.setExportedVariable('user-mgmt', 'profile_data', { name: 'John Doe', email: 'john@example.com' });

  registry.setExportedVariable('payment', 'transaction_id', 'txn-999');
  registry.setExportedVariable('payment', 'payment_status', 'completed');

  // Access variables with full namespace
  console.log('Auth token:', registry.getExportedVariable('auth.token'));
  console.log('User ID:', registry.getExportedVariable('auth.user_id'));
  console.log('Created user:', registry.getExportedVariable('user-mgmt.created_user_id'));
  console.log('Transaction:', registry.getExportedVariable('payment.transaction_id'));

  // Get all available variables
  const allVars = registry.getAvailableVariableNames();
  console.log('All available variables:', allVars);
  // Output: ['auth.token', 'auth.user_id', 'auth.permissions', 'user-mgmt.created_user_id', ...]

  // Get detailed info about a specific suite
  const authInfo = registry.getNodeInfo('auth');
  console.log('Auth suite info:', authInfo);
  // Output: { nodeId: 'auth', suiteName: 'Authentication Suite', exports: [...], ... }

  // List all registered suites
  const suites = registry.getRegisteredNodes();
  console.log('Registered suites:', suites);
  // Output: ['auth', 'user-mgmt', 'payment']
}
```

## Main Types

### `RequestDetails`
Defines a complete HTTP request.

```typescript
interface RequestDetails {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}
```

### `Assertions`
Defines validations for an HTTP response.

```typescript
interface Assertions {
  status_code?: number | AssertionChecks;
  body?: Record<string, AssertionChecks>;
  headers?: Record<string, AssertionChecks>;
  response_time_ms?: {
    less_than?: number;
    greater_than?: number;
  };
  custom?: Array<{
    name: string;
    condition: string; // JMESPath expression
    message?: string;
  }>;
}
```

### `AssertionChecks`
Validation operators for specific fields.

```typescript
interface AssertionChecks {
  equals?: any;
  contains?: any;
  not_equals?: any;
  greater_than?: number;
  less_than?: number;
  regex?: string;
  exists?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  length?: {
    equals?: number;
    greater_than?: number;
    less_than?: number;
  };
}
```

### `VariableContext`
Hierarchical variable context.

```typescript
interface VariableContext {
  global: Record<string, any>;
  imported: Record<string, Record<string, any>>; // flow_name -> variables
  suite: Record<string, any>;
  runtime: Record<string, any>;
}
```

### `IterationConfig`
Configuration for iteration patterns in test steps.

```typescript
interface ArrayIterationConfig {
  over: string; // Variable reference like "{{test_users}}"
  as: string;   // Variable name for each item like "item"
}

interface RangeIterationConfig {
  range: string; // Range expression like "1..10"
  as: string;    // Variable name for index like "index"
}

type IterationConfig = ArrayIterationConfig | RangeIterationConfig;
```

### `IterationContext`
Context information for each iteration execution.

```typescript
interface IterationContext {
  index: number;      // 0-based iteration index
  value: any;         // Current iteration value (array item or range number)
  variableName: string; // Variable name from "as" field
  isFirst: boolean;   // True if this is the first iteration
  isLast: boolean;    // True if this is the last iteration
}
```

## Convenience Functions

### `createEngine(configPath?: string)`
Creates an engine instance with minimal configuration.

```typescript
const engine = createEngine('./my-config.yml');
const result = await engine.run();
```

### `runTests(configPath?: string)`
One-shot execution of all tests.

```typescript
const result = await runTests('./config.yml');
console.log(`Success rate: ${result.success_rate}%`);
```

### `planTests(configPath?: string)`
Dry-run for planning and configuration validation.

```typescript
const plan = await planTests('./config.yml');
console.log(`Found ${plan.total_tests} tests to execute`);
```

## Complete Usage Example

```typescript
import { FlowTestEngine, EngineExecutionOptions } from 'flow-test-engine';

// Advanced configuration with hooks
const options: EngineExecutionOptions = {
  config_file: './flow-test.config.yml',
  test_directory: './tests',
  environment: 'staging',
  verbosity: 'detailed',
  filters: {
    priorities: ['critical', 'high'],
    suite_names: ['auth', 'checkout']
  }
};

const hooks = {
  onExecutionStart: (stats) => {
    console.log(`🚀 Starting execution of ${stats.tests_discovered} test(s)`);
  },
  onTestDiscovered: (test) => {
    console.log(`📋 Discovered: ${test.suite_name} (${test.priority})`);
  },
  onExecutionEnd: (result) => {
    console.log(`✅ Completed with ${result.success_rate}% success rate`);
  },
  onError: (error) => {
    console.error(`❌ Error: ${error.message}`);
  }
};

// Create and execute engine
const engine = new FlowTestEngine(options, hooks);

try {
  const result = await engine.run();

  if (result.failed_tests > 0) {
    console.log(`❌ ${result.failed_tests} test(s) failed`);
    process.exit(1);
  }

  console.log(`✅ All tests passed! (${result.successful_tests}/${result.total_tests})`);
} catch (error) {
  console.error('Execution failed:', error);
  process.exit(1);
}
```

## CLI Usage

```bash
# Basic execution
flow-test

# With specific configuration file
flow-test -c ./config/prod.yml

# With filters
flow-test --priority high,critical --verbose

# Dry run to plan execution
flow-test --dry-run --detailed

# Silent execution for CI/CD
flow-test --environment production --silent
```

## Test File Structure

```yaml
suite_name: "Login Flow"
description: "User authentication tests"
base_url: "https://api.example.com"

variables:
  test_user: "user@example.com"
  test_password: "password123"

# Use Global Registry to reference variables from other test nodes
# Example: {{common_test.api_version}}

steps:
  - name: "Login"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{test_user}}"
        password: "{{test_password}}"
    assert:
      status_code: 200
      body:
        success:
          equals: true
        token:
          type: string
          exists: true
    capture:
      auth_token: "body.token"
      user_id: "body.user.id"

  - name: "Verify Token"
    request:
      method: GET
      url: "/auth/verify"
      headers:
        Authorization: "Bearer {{auth_token}}"
    assert:
      status_code: 200
      body:
        valid:
          equals: true

exports:
  - auth_token
  - user_id
```

This documentation provides a complete view of the Flow Test Engine v1.0 API and architecture.
