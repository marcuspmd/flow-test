# Coverage Improvement Plan

> **Status**: Active | **Priority**: High | **Owner**: TBD

This document outlines the plan to improve test coverage across the Flow Test Engine codebase.

## 📊 Current State

Based on coverage reports in `coverage/lcov-report/`, the following areas need attention:

### Coverage by Service

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| `assertion.service.ts` | ~75% | 90% | High |
| `variable.service.ts` | ~80% | 95% | Critical |
| `http.service.ts` | ~60% | 85% | High |
| `capture.service.ts` | ~70% | 90% | Medium |
| `execution.service.ts` | ~65% | 85% | High |
| `global-registry.service.ts` | ~50% | 80% | Medium |
| `faker.service.ts` | ~85% | 95% | Low |
| `logger.service.ts` | ~40% | 70% | Low |

### Coverage by Component

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Core Engine | ~70% | 90% | Critical |
| Strategies | ~60% | 85% | High |
| Validators | ~55% | 80% | Medium |
| Utils | ~75% | 90% | Medium |
| CLI | ~45% | 70% | Low |

## 🎯 Goals

1. **Critical Path Coverage**: Achieve 90%+ coverage on core execution flow
2. **Edge Cases**: Document and test all edge cases for interpolation
3. **Error Handling**: Full coverage of error paths
4. **Integration Tests**: Increase YAML-based flow test coverage

## 📋 Action Items

### Phase 1: Critical Services (Week 1-2)

#### Variable Service
- [ ] Test nested object interpolation (`{{user.profile.name}}`)
- [ ] Test array index access (`{{items[0].id}}`)
- [ ] Test Faker integration (`{{$faker.person.name}}`)
- [ ] Test JavaScript expressions (`{{$js:Date.now()}}`)
- [ ] Test environment variables (`{{$env.VAR}}`)
- [ ] Test cross-suite variables (`{{suite-id.variable}}`)
- [ ] Test direct syntax (`#faker.internet.email`, `$Date.now()`)
- [ ] Test error handling for invalid expressions

#### Assertion Service
- [ ] Test all comparison operators (`equals`, `contains`, `regex`, etc.)
- [ ] Test type assertions (`type: "string"`, `type: "number"`, etc.)
- [ ] Test nested body assertions
- [ ] Test header assertions
- [ ] Test status_code assertions
- [ ] Test response_time_ms assertions
- [ ] Test custom assertions with JMESPath
- [ ] Test assertion failure messages

### Phase 2: Execution Flow (Week 2-3)

#### Execution Service
- [ ] Test sequential execution mode
- [ ] Test parallel execution mode
- [ ] Test step dependencies
- [ ] Test retry logic
- [ ] Test timeout handling
- [ ] Test continue_on_failure behavior
- [ ] Test skip conditions (pre_execution and post_capture)

#### HTTP Service
- [ ] Test all HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- [ ] Test header interpolation
- [ ] Test body serialization
- [ ] Test query params handling
- [ ] Test timeout behavior
- [ ] Test certificate configuration (mTLS)
- [ ] Test error responses

### Phase 3: Advanced Features (Week 3-4)

#### Capture Service
- [ ] Test JMESPath expressions
- [ ] Test capture from headers
- [ ] Test capture from body
- [ ] Test capture from status
- [ ] Test full response capture (`@`)
- [ ] Test capture with filters
- [ ] Test capture with projections

#### Global Registry
- [ ] Test variable export
- [ ] Test cross-suite access
- [ ] Test optional exports
- [ ] Test namespace isolation
- [ ] Test merge behavior

#### Hooks System
- [ ] Test all hook points (12 lifecycle hooks)
- [ ] Test compute actions
- [ ] Test validate actions
- [ ] Test log actions
- [ ] Test metric actions
- [ ] Test script actions
- [ ] Test call actions
- [ ] Test wait actions

### Phase 4: Edge Cases & Integration (Week 4-5)

#### Scenarios
- [ ] Test conditional execution
- [ ] Test nested steps in scenarios
- [ ] Test variable capture in then/else
- [ ] Test depth limiting

#### Iteration
- [ ] Test array iteration (`over` + `as`)
- [ ] Test range iteration (`range`)
- [ ] Test iteration context variables
- [ ] Test iteration with failures

#### Call Steps
- [ ] Test cross-suite calls
- [ ] Test alias namespacing
- [ ] Test isolate_context behavior
- [ ] Test error handling strategies

## 🧪 Test Patterns

### Unit Test Template

```typescript
// src/services/__tests__/my-service.test.ts
import { Container } from 'inversify';
import { MyService } from '../my-service';
import { TYPES } from '../../di/types';

describe('MyService', () => {
  let container: Container;
  let service: MyService;

  beforeEach(() => {
    container = new Container();
    // Setup mocks and bindings
    service = container.get(MyService);
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should throw on invalid input', () => {
      // Test error handling
      expect(() => service.methodName(null)).toThrow();
    });
  });
});
```

### Flow Test Template

```yaml
# tests/__tests__/feature-name.yaml
suite_name: "Feature Name Test Suite"
node_id: "feature-test"
base_url: "{{$env.TEST_BASE_URL}}"

variables:
  test_var: "value"

steps:
  - name: "Test scenario description"
    request:
      method: POST
      url: "/endpoint"
      body:
        field: "{{test_var}}"
    assert:
      status_code: 200
      body:
        result: { exists: true }
    capture:
      result_id: "body.id"
```

## 📈 Metrics & Reporting

### Coverage Reports

Generate coverage reports:

```bash
# Run tests with coverage
npm test -- --coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### CI Integration

Coverage is tracked in CI via:
- Jest coverage reports
- Coverage badges (optional)
- PR checks for coverage thresholds

### Thresholds

Configure in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/services/': {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

## 🔧 Tools & Utilities

### Test Helpers

Located in `src/test-utils/`:
- `di-test-helpers.ts` - DI container setup for tests
- Mock factories for common types

### Running Specific Tests

```bash
# Run tests matching pattern
npm test -- --testPathPattern="variable"

# Run single file
npm test -- src/services/__tests__/variable.service.test.ts

# Run with verbose output
npm test -- --verbose
```

## 📅 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1-2 | Critical Services | Variable & Assertion tests |
| 2-3 | Execution Flow | Execution & HTTP tests |
| 3-4 | Advanced Features | Hooks, Capture, Registry tests |
| 4-5 | Edge Cases | Scenarios, Iteration, Call tests |
| 5+ | Maintenance | Ongoing coverage improvements |

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Writing tests
- Code style
- Pull request process

## 📚 References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Project Architecture](./docs/README.md)
