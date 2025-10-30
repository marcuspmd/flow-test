# GitHub Copilot Custom Agents

This directory contains custom GitHub Copilot agents specialized for the Flow Test Engine project.

## Available Agents

### flow-test-specialist

**Model:** Claude 4.5 Sonnet

**Expertise:**
- Flow Test Engine architecture and services
- YAML test suite design and best practices
- TypeScript development with strict mode
- API testing strategies and patterns
- Advanced features (hooks, scenarios, iterations, dependencies)
- JMESPath expressions and data capture
- Client certificate (mTLS) configuration

**When to use:**
- Creating new YAML test suites
- Modifying TypeScript services
- Debugging test execution issues
- Designing authentication flows
- Implementing lifecycle hooks
- Optimizing test performance
- Setting up cross-suite dependencies
- Reviewing and improving existing tests

**Usage in GitHub Copilot:**

When working on Flow Test Engine tasks, you can invoke this agent with prompts like:

```
@flow-test-specialist create a test suite for user registration with email validation
```

```
@flow-test-specialist help me add lifecycle hooks to track API response times
```

```
@flow-test-specialist review this test suite and suggest improvements
```

```
@flow-test-specialist debug why this JMESPath expression is not capturing the data
```

## Agent Configuration

The agent is configured to:
- Use Claude 4.5 Sonnet for superior performance
- Follow strict TypeScript best practices
- Maintain consistency with existing code patterns
- Make minimal, surgical changes
- Provide comprehensive test coverage
- Include proper error handling and logging

## Key Capabilities

### Test Suite Creation
- Design comprehensive YAML test flows
- Implement authentication patterns
- Use variable interpolation effectively
- Create robust assertions
- Leverage advanced features

### TypeScript Development
- Strict mode compliance
- Proper typing (no `any` types)
- Dependency injection patterns
- Service-based architecture
- Error handling

### Debugging & Optimization
- Analyze test execution logs
- Identify variable scoping issues
- Debug JMESPath expressions
- Troubleshoot HTTP requests
- Optimize performance

## Documentation References

The agent has access to and knowledge of:
- `AGENTS.md` - Comprehensive property reference
- `guides/` - Full documentation directory
- `src/types/common.types.ts` - Type definitions
- `src/services/` - Service implementations
- `.github/copilot-instructions.md` - Project guidelines

## Examples

### Creating a Login Test Suite

```
@flow-test-specialist create a comprehensive login test suite with:
- Environment variable usage
- Token capture
- Response time validation
- Proper exports for other suites
```

### Adding Lifecycle Hooks

```
@flow-test-specialist add lifecycle hooks to track request timing and log metrics
```

### Debugging JMESPath

```
@flow-test-specialist this JMESPath expression is not working: body.data[*].users
Help me extract all user IDs from the nested structure
```

## Best Practices

When working with the custom agent:

1. **Be specific** about what you want to achieve
2. **Provide context** from existing files when relevant
3. **Ask for explanations** if you want to understand the approach
4. **Request reviews** of existing code for improvement suggestions
5. **Combine with standard Copilot** for general coding tasks

## Model Information

**Claude 4.5 Sonnet** is chosen for this agent because:
- Superior understanding of complex TypeScript patterns
- Excellent at YAML structure and syntax
- Strong reasoning for test design decisions
- Better context retention for large codebases
- More accurate code generation with fewer errors

## Feedback and Improvements

If you notice the agent could be improved in certain areas, please:
1. Document the issue or limitation
2. Provide examples of desired behavior
3. Open an issue with the `custom-agent` label
4. Suggest improvements to the agent configuration

## Version History

- **v1.0.0** (2025-10-30) - Initial creation
  - Flow Test Engine expertise
  - TypeScript strict mode support
  - Advanced YAML features (hooks, scenarios, iterations)
  - JMESPath and data capture
  - Authentication and security patterns
