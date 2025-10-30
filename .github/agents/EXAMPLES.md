# Example: Test Suite Created by flow-test-specialist Agent

This directory contains example test suites that demonstrate the capabilities of the `flow-test-specialist` custom agent.

## Example 1: Complete E-Commerce API Test Suite

Generated with prompt:
```
@flow-test-specialist create a comprehensive e-commerce API test suite with:
- User registration
- Login and authentication
- Product browsing
- Shopping cart operations
- Checkout process
- Order confirmation
```

### Files:
- `01-user-registration.yaml` - User signup flow
- `02-authentication.yaml` - Login and token management
- `03-product-catalog.yaml` - Browse products
- `04-shopping-cart.yaml` - Cart operations (depends on authentication)
- `05-checkout.yaml` - Order placement (depends on cart)

## Example 2: API Performance Testing

Generated with prompt:
```
@flow-test-specialist create performance tests that measure:
- Response times for critical endpoints
- Pagination performance
- Bulk operations
- Rate limiting behavior
```

### Files:
- `performance-critical-endpoints.yaml`
- `performance-pagination.yaml`

## Example 3: Security Testing

Generated with prompt:
```
@flow-test-specialist create security tests for:
- Authentication failures
- Authorization checks
- Input validation
- Token expiration
```

### Files:
- `security-auth-tests.yaml`
- `security-input-validation.yaml`

## How to Run These Examples

```bash
# Run all examples
npx fest --config flow-test.config.yml

# Run specific example
npx fest tests/examples/01-user-registration.yaml

# Run with verbose output
npx fest --verbose tests/examples/
```

## What You'll Learn

These examples demonstrate:
- **YAML Structure**: Proper test suite organization
- **Variable Management**: Local, runtime, and exported variables
- **Assertions**: Comprehensive validation strategies
- **JMESPath**: Data extraction patterns
- **Hooks**: Lifecycle hook implementations
- **Dependencies**: Cross-suite coordination
- **Error Handling**: Proper scenario management
- **Performance**: Response time validation
- **Security**: Auth and authorization testing

## Customization

You can customize these examples:
- Update `base_url` to point to your API
- Modify environment variables in `.env`
- Adjust assertions for your response formats
- Add your own authentication methods
- Extend with additional test scenarios

## Agent Capabilities Demonstrated

Each example showcases different agent capabilities:

### 01-user-registration.yaml
- Input validation
- Email format checking
- Password strength validation
- Response structure assertions
- Variable capture and export

### 02-authentication.yaml
- Login flow
- JWT token handling
- Token expiration validation
- Refresh token mechanism
- Error scenarios

### 03-product-catalog.yaml
- Pagination testing
- Filtering and search
- JMESPath for data extraction
- Array iterations
- Performance validation

### 04-shopping-cart.yaml
- Dependency on authentication
- Variable reuse from other suites
- CRUD operations
- State management
- Cart total calculations

### 05-checkout.yaml
- Multi-step process
- Conditional scenarios
- Payment validation
- Order confirmation
- Comprehensive error handling

## Next Steps

After reviewing these examples:

1. **Try the Agent**: Use `@flow-test-specialist` in GitHub Copilot
2. **Customize Examples**: Adapt to your API endpoints
3. **Create Your Own**: Design new test suites with the agent
4. **Share Feedback**: Report issues or suggestions

## Additional Resources

- [Agent README](./README.md) - Agent overview and capabilities
- [Usage Examples](./USAGE-EXAMPLES.md) - Detailed usage guide
- [AGENTS.md](../../../AGENTS.md) - Complete property reference
- [Flow Test Guides](../../../guides/) - Comprehensive documentation
