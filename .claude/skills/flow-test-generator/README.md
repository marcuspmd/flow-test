# Flow Test Generator Skill

A Claude Code skill for generating advanced Flow Test Engine YAML test suites from code analysis or manual descriptions.

## Overview

This skill helps you quickly generate comprehensive, production-ready Flow Test YAML files with:
- Full analysis of API code (Express, NestJS, FastAPI, Flask, etc.)
- Complete CRUD operations
- Authentication flows with token management
- Advanced features (scenarios, iterations, captures, dependencies)
- Comprehensive assertions and error handling
- Best practices and patterns

## Installation

This skill is located in the Flow Test project at:
```
.claude/skills/flow-test-generator/
```

No installation is required if you're working within the Flow Test project.

## Usage

### Invoke the Skill

In Claude Code, use the Skill tool to invoke this skill:

```
/flow-test-generator
```

Or simply mention that you want to generate Flow Test YAML files.

### Example Requests

**From Code Analysis:**
```
"Generate flow tests for my user API"
"Create comprehensive tests for the products controller"
"Generate e-commerce checkout flow tests"
```

**From Manual Description:**
```
"Create tests for a login endpoint at /auth/login that takes email and password"
"Generate CRUD tests for a blog posts API"
"Create tests for a payment processing workflow"
```

## What It Generates

The skill generates complete YAML test suites with:

### Basic Structure
- ✅ Proper `node_id`, `suite_name`, and `description`
- ✅ Configured `base_url` and variables
- ✅ Dependencies and exports
- ✅ Comprehensive metadata (priority, tags, timeouts)

### Advanced Features
- ✅ **Authentication flows** with token capture
- ✅ **Request chaining** with variable capture/reuse
- ✅ **Comprehensive assertions** (status, body, headers, timing)
- ✅ **Scenarios** for conditional logic (happy/sad paths)
- ✅ **Iterations** for data-driven and pagination tests
- ✅ **Cross-suite calls** for reusable flows
- ✅ **Interactive inputs** for manual testing flows
- ✅ **Faker.js integration** for dynamic test data
- ✅ **Error handling** with proper status codes

### Type Inference
- Automatically generates assertions based on TypeScript/Python types
- Infers validation rules from code
- Creates regex patterns for email, phone, etc.

## Templates

The skill includes ready-to-use templates:

### 1. Authentication Template
`templates/auth-template.yaml`
- User registration
- Login with credentials
- Token capture and usage
- Protected endpoint access
- Error scenarios (wrong password, no token)
- Token refresh
- Logout

### 2. CRUD Template
`templates/crud-template.yaml`
- Create resource
- Read resource (individual and list)
- Update resource (PUT and PATCH)
- Delete resource
- Verification steps
- Error validation
- Pagination

### 3. Complex Workflow Template
`templates/complex-workflow-template.yaml`
- E-commerce checkout flow
- Product search
- Shopping cart management
- Multiple item additions (iterations)
- Discount codes
- Shipping address
- Payment processing
- Order creation
- Email notifications (cross-suite calls)
- Order tracking

## File Structure

```
.claude/skills/flow-test-generator/
├── README.md                          # This file
├── skill.md                           # Main skill instructions
├── flow-test-reference.md             # Complete YAML syntax reference
└── templates/                         # Example templates
    ├── auth-template.yaml            # Authentication flow
    ├── crud-template.yaml            # CRUD operations
    └── complex-workflow-template.yaml # Complex workflows
```

## How It Works

### 1. Analysis Phase
The skill first analyzes your code or description to understand:
- API framework (Express, NestJS, FastAPI, etc.)
- Available endpoints and their HTTP methods
- Request/response schemas
- Authentication requirements
- Dependencies between endpoints

### 2. Generation Phase
Based on the analysis, the skill generates:
- Complete test suite structure
- Comprehensive test steps with assertions
- Variable capture and interpolation
- Advanced features (scenarios, iterations, etc.)
- Metadata and tags
- Dependencies and exports

### 3. Quality Check
Before presenting the tests, the skill verifies:
- All endpoints are covered
- Authentication is properly handled
- Variables are captured and reused
- Assertions are comprehensive
- Error cases are included
- YAML syntax is valid

## Quality Standards

Generated tests follow these quality standards:

### Assertions
- ✅ Status code validation
- ✅ Response body field validation
- ✅ Type checking for all fields
- ✅ Header validation
- ✅ Response time checks
- ✅ Custom assertions for business logic

### Variables
- ✅ Faker.js for dynamic data
- ✅ Proper variable capture from responses
- ✅ Variable reuse across steps
- ✅ Environment variable support

### Metadata
- ✅ Appropriate priority levels
- ✅ Comprehensive tags for filtering
- ✅ Retry configuration where needed
- ✅ Descriptive step descriptions
- ✅ Step dependencies

### Error Handling
- ✅ Invalid credentials
- ✅ Missing authorization
- ✅ Validation errors
- ✅ Resource not found
- ✅ Proper error assertions

## Examples

### Example 1: Simple Endpoint

**Input:**
```
"Generate test for GET /api/users/:id that returns user details"
```

**Generated:**
```yaml
node_id: "get-user-by-id"
suite_name: "Get User By ID Test"
base_url: "{{base_url}}"

steps:
  - name: "Get user by ID"
    request:
      method: "GET"
      url: "/api/users/{{user_id}}"
    assert:
      status_code: 200
      body:
        id: { type: "number", equals: "{{user_id}}" }
        email: { type: "string", regex: "..." }
        name: { type: "string", notEmpty: true }
    # ... more comprehensive assertions
```

### Example 2: CRUD Flow

**Input:**
```
"Create complete CRUD tests for articles API"
```

**Generated:**
Complete test suite with:
- Create article (POST)
- Read article (GET)
- Update article (PUT/PATCH)
- Delete article (DELETE)
- List articles with pagination
- Error scenarios
- Variable chaining between steps

### Example 3: Complex Workflow

**Input:**
```
"Generate checkout flow: add to cart → apply discount → checkout → payment"
```

**Generated:**
Complete workflow with:
- Product search and selection
- Cart creation and item additions
- Discount code application (with scenarios)
- Shipping address
- Payment processing
- Order confirmation
- Dependencies and exports

## Best Practices

### When Using the Skill

1. **Be Specific**: Provide details about your API or describe endpoints clearly
2. **Review Generated Tests**: Always review and customize for your specific needs
3. **Adjust Variables**: Update test data variables as needed
4. **Configure base_url**: Set proper base URL in your config
5. **Run Tests**: Test the generated YAML to ensure it works with your API

### Customization

After generation, you may want to:
- Adjust assertion values to match your API
- Add more error scenarios specific to your domain
- Customize variable names
- Add or remove steps based on your workflow
- Adjust timeouts and retry logic

## Troubleshooting

### Tests Fail with 404
- Check that `base_url` is configured correctly
- Verify endpoint paths match your API

### Authentication Errors
- Ensure auth dependency is configured
- Check that token capture path is correct
- Verify auth_token variable name matches

### Assertion Failures
- Review expected vs actual values
- Adjust assertion operators as needed
- Check response structure matches expectations

## Contributing

To improve this skill:
1. Add more templates for common patterns
2. Enhance framework detection
3. Add support for more API frameworks
4. Improve type inference logic

## License

This skill is part of the Flow Test Engine project.

## Support

For issues or questions:
- Check the Flow Test documentation
- Review example templates
- Consult the YAML reference (`flow-test-reference.md`)
