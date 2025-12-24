# Flow Test Server - Quick Start Guide

## Overview

The Flow Test Server is a lightweight HTTP server that provides endpoints for testing the Flow Test Engine without requiring external services. It mimics httpbin functionality and is perfect for local development and testing.

## Starting the Server

### Development Mode (TypeScript)
```bash
npm run server:test:dev
```

### Production Mode (Compiled)
```bash
npm run build
npm run server:test
```

### Using Docker (httpbin)
```bash
# Start httpbin container (alternative to test server)
npm run server:docker

# View logs
npm run server:logs

# Stop container
npm run server:down
```

## Server Details

- **Default Port**: 8080
- **Base URL**: http://localhost:8080
- **Environment Variable**: `TEST_SERVER_PORT` (optional)

## Available Endpoints

### Health & Monitoring
- `GET /health` - Health check endpoint
- `GET /logs` - View request logs  
- `DELETE /logs` - Clear request logs

### HTTP Methods (Echo Endpoints)
- `GET /get` - Echo GET request
- `POST /post` - Echo POST request
- `PUT /put` - Echo PUT request
- `PATCH /patch` - Echo PATCH request
- `DELETE /delete` - Echo DELETE request

### Testing Utilities
- `GET /status/:code` - Return specific HTTP status code (e.g., `/status/404`)
- `GET /delay/:seconds` - Delayed response (max 10 seconds)
- `GET /json` - Sample JSON response
- `GET /uuid` - Generate UUID
- `GET /user-agent` - Echo user agent
- `GET /headers` - Echo all headers
- `GET /ip` - Return client IP

### Authentication
- `GET /basic-auth` - Test Basic authentication
- `GET /bearer` - Test Bearer token authentication

### Custom Headers
- `GET /response-headers?key=value` - Return custom headers from query params

## Usage Examples

### Simple GET Request
```bash
curl http://localhost:8080/get
```

### POST with JSON Body
```bash
curl -X POST http://localhost:8080/post \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "user_id": 123}'
```

### Test Status Codes
```bash
# Get a 404 response
curl http://localhost:8080/status/404

# Get a 500 response
curl http://localhost:8080/status/500
```

### Test Delays
```bash
# 2 second delay
curl http://localhost:8080/delay/2
```

### Basic Authentication
```bash
curl -u username:password http://localhost:8080/basic-auth
```

### Bearer Token
```bash
curl -H "Authorization: Bearer mytoken123" http://localhost:8080/bearer
```

## Running Flow Tests

Once the server is running, you can execute flow tests that use `localhost:8080`:

```bash
# Run a specific test file
node dist/cli.js tests/start-flow.yaml --verbose

# Run all tests
node dist/cli.js --verbose

# Run with custom config
node dist/cli.js -c flow-test.config.yml
```

## Configuration

Update `flow-test.config.yml` to use the local test server:

```yaml
globals:
  variables:
    httpbin_url: http://localhost:8080
    api_base_url: http://localhost:8080
```

## Features

- ✅ CORS enabled for all endpoints
- ✅ Request logging (last 100 requests)
- ✅ JSON response format
- ✅ Error handling
- ✅ Graceful shutdown (SIGTERM/SIGINT)
- ✅ Mimics httpbin.org behavior
- ✅ No external dependencies

## Troubleshooting

### Port Already in Use
If port 8080 is already in use, set a custom port:

```bash
TEST_SERVER_PORT=8888 npm run server:test:dev
```

Then update your config:
```yaml
globals:
  variables:
    httpbin_url: http://localhost:8888
```

### Server Not Starting
1. Ensure dependencies are installed: `npm install`
2. Build the project: `npm run build`
3. Check for port conflicts: `lsof -i :8080`

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running. The server will shut down gracefully.

## Integration with CI/CD

Start the server in the background before running tests:

```bash
# Start server in background
npm run server:test:dev &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Run tests
npm run test:flow

# Stop server
kill $SERVER_PID
```

## Differences from httpbin.org

The test server provides a subset of httpbin functionality focused on common testing scenarios:
- No image endpoints
- No redirect endpoints (yet)
- Simplified auth (no digest auth)
- Max 10 second delay (vs unlimited)
- No streaming endpoints (yet)

For full httpbin compatibility, use Docker:
```bash
npm run server:docker
```
