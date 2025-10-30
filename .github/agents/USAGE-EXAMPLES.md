# Custom Agent Usage Examples

This guide demonstrates how to use the `flow-test-specialist` custom agent in GitHub Copilot.

## Prerequisites

- GitHub Copilot enabled in your IDE
- Access to GitHub Copilot custom agents feature
- Flow Test Engine repository open

## Basic Usage

### Invoking the Agent

To invoke the custom agent, use the `@` mention syntax followed by the agent name:

```
@flow-test-specialist [your request]
```

## Example Use Cases

### 1. Creating a New Test Suite

**Prompt:**
```
@flow-test-specialist create a comprehensive test suite for a user registration API that:
- Tests POST /api/users/register endpoint
- Validates email format
- Checks password strength
- Captures the user ID and auth token
- Exports variables for other suites
- Uses environment variables for base URL
- Includes response time validation
```

**Expected Output:**
The agent will create a complete YAML test suite with:
- Proper structure (node_id, suite_name, base_url)
- Metadata with priority and tags
- Variables using environment variables
- Steps with comprehensive assertions
- JMESPath capture expressions
- Exported variables for cross-suite usage

### 2. Adding Lifecycle Hooks

**Prompt:**
```
@flow-test-specialist add lifecycle hooks to this test step to:
- Generate a unique request ID before the request
- Log the request start time
- Calculate and log the duration after the request
- Emit a metric for monitoring
- Validate that the user_id was captured

[paste your existing test step here]
```

**Expected Output:**
Enhanced test step with:
- `hooks_pre_request` for setup and logging
- `hooks_post_request` for metrics and validation
- Proper variable computation
- Structured logging

### 3. Debugging JMESPath Expressions

**Prompt:**
```
@flow-test-specialist I'm trying to extract all product IDs from this response structure:
{
  "data": {
    "categories": [
      {
        "name": "Electronics",
        "products": [
          {"id": 1, "name": "Laptop"},
          {"id": 2, "name": "Phone"}
        ]
      },
      {
        "name": "Books",
        "products": [
          {"id": 3, "name": "Novel"},
          {"id": 4, "name": "Magazine"}
        ]
      }
    ]
  }
}

My current expression `body.data.categories.products[*].id` is not working. Help me fix it.
```

**Expected Output:**
- Corrected JMESPath expression: `body.data.categories[*].products[*].id`
- Explanation of why the original didn't work
- Alternative expressions for different extraction needs
- Suggestion to use flatten if needed

### 4. Implementing Authentication Flow

**Prompt:**
```
@flow-test-specialist create an authentication test suite that:
- Performs login with username/password from env vars
- Captures the JWT token
- Validates token expiration time
- Exports the token for use in other suites
- Tests token refresh
- Handles authentication failures with proper scenarios
```

**Expected Output:**
Complete authentication suite with:
- Multiple steps for login, validate, and refresh
- Proper error handling scenarios
- Token capture and export
- Environment variable usage
- Comprehensive assertions

### 5. Code Review and Optimization

**Prompt:**
```
@flow-test-specialist review this test suite and suggest improvements:

[paste your YAML test suite here]

Focus on:
- Performance optimization
- Better assertions
- Proper variable scoping
- Missing edge cases
- Code organization
```

**Expected Output:**
- Detailed review with specific suggestions
- Improved version of the test suite
- Explanations for each change
- Best practice recommendations

### 6. TypeScript Service Enhancement

**Prompt:**
```
@flow-test-specialist I need to add a new feature to the HTTP service that supports request retries with exponential backoff. Show me how to:
- Maintain strict TypeScript compliance
- Follow the existing service pattern
- Add proper error handling
- Include logging
- Write unit tests
```

**Expected Output:**
- TypeScript code with proper typing
- Dependency injection pattern
- Comprehensive error handling
- Structured logging
- Jest unit tests

### 7. Implementing Cross-Suite Dependencies

**Prompt:**
```
@flow-test-specialist create two test suites:
1. setup-suite.yaml that creates test data and exports variables
2. main-test.yaml that depends on the setup and uses the exported variables

Include proper dependency configuration with caching.
```

**Expected Output:**
Two coordinated test suites with:
- Proper dependency declaration
- Variable exports from setup suite
- Variable consumption in main suite
- Caching configuration
- Error handling

### 8. Adding Input Validation

**Prompt:**
```
@flow-test-specialist enhance this test step to include interactive input that:
- Prompts for environment selection (dev, staging, prod)
- Validates the input against allowed values
- Has a default for CI/CD
- Supports timeout
- Uses the selected environment in the request

[paste your test step]
```

**Expected Output:**
Enhanced step with:
- InputConfig with proper validation
- Environment selection dropdown
- CI/CD defaults
- Timeout configuration
- Dynamic URL based on selection

## Advanced Scenarios

### 9. Performance Testing Suite

**Prompt:**
```
@flow-test-specialist create a performance testing suite that:
- Tests an endpoint with iteration from 1 to 100
- Measures response times
- Captures min, max, and average response times
- Validates all responses are under 500ms
- Uses lifecycle hooks to add delays between requests
- Generates metrics for monitoring
```

### 10. Security Testing

**Prompt:**
```
@flow-test-specialist create a security test suite that validates:
- JWT token expiration handling
- Invalid token rejection
- Role-based access control
- SQL injection protection
- XSS attack prevention
Include proper scenarios for each security test.
```

## Tips for Best Results

1. **Be Specific**: Provide clear requirements and constraints
2. **Provide Context**: Include relevant code snippets or structures
3. **Ask for Explanations**: Request explanations when learning
4. **Iterate**: Refine the output by asking follow-up questions
5. **Combine Tools**: Use the agent with standard Copilot for best results

## Common Agent Responses

The agent is trained to:
- Follow strict TypeScript practices
- Use proper YAML structure
- Include comprehensive error handling
- Add detailed logging
- Provide complete, runnable examples
- Explain complex concepts
- Suggest best practices

## Troubleshooting

### Agent Not Responding
- Ensure you're using the correct syntax: `@flow-test-specialist`
- Check that the agent configuration exists in `.github/agents/`
- Verify you have access to GitHub Copilot custom agents

### Incorrect Suggestions
- Provide more context about your specific needs
- Reference existing code patterns in your prompt
- Ask for clarification on specific points
- Request alternative approaches

### Need More Detail
- Ask follow-up questions
- Request step-by-step explanations
- Ask for examples of specific patterns
- Request documentation references

## Feedback

If you encounter issues or have suggestions for improving the agent:
1. Document the problem or desired improvement
2. Provide examples of current vs. expected behavior
3. Open an issue with the `custom-agent` label

## Version

This guide is for `flow-test-specialist` v1.0.0 (2025-10-30)
