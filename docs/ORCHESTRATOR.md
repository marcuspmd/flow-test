# Flow Test Orchestrator - Quick Start Guide

## Overview

The Flow Test Orchestrator is an HTTP server that provides a REST API for running and monitoring Flow Test Engine executions. It enables remote test execution, real-time event streaming, and centralized test management.

## Starting the Orchestrator

### Development Mode (TypeScript)
```bash
npm run orchestrator:dev
```

### Production Mode (Compiled)
```bash
npm run build
npm run orchestrator
```

## Server Details

- **Default Port**: 3333
- **Base URL**: http://localhost:3333
- **Environment Variable**: `ORCHESTRATOR_PORT` (optional)
- **Live Events Path**: `results/live-events.jsonl` (or set via `LIVE_EVENTS_PATH`)

## API Endpoints

### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "activeRunId": "mjjbn46r-2cyvi3" | null
}
```

### Start Test Run
```bash
POST /run
Content-Type: application/json

{
  "options": {
    "filters": {
      "suite_names": ["auth-flow", "checkout"],
      "priorities": ["critical", "high"],
      "tags": ["smoke"]
    },
    "execution": {
      "mode": "sequential",
      "continue_on_failure": true
    }
  },
  "label": "Smoke Test Run"
}
```

**Response:**
```json
{
  "runId": "mjjbn46r-2cyvi3"
}
```

**Status Codes:**
- `202 Accepted` - Run started successfully
- `400 Bad Request` - Invalid options or run already in progress

### List All Runs
```bash
GET /runs
```

**Response:**
```json
{
  "runs": [
    {
      "runId": "mjjbn46r-2cyvi3",
      "status": "success",
      "startTime": "2025-12-24T01:14:28.789Z",
      "endTime": "2025-12-24T01:14:35.123Z",
      "label": "Smoke Test Run",
      "options": { /* execution options */ }
    }
  ]
}
```

### Get Specific Run
```bash
GET /runs/:runId
```

**Response:**
```json
{
  "runId": "mjjbn46r-2cyvi3",
  "status": "success",
  "startTime": "2025-12-24T01:14:28.789Z",
  "endTime": "2025-12-24T01:14:35.123Z",
  "label": "Smoke Test Run",
  "options": { /* execution options */ },
  "events": [ /* all execution events */ ]
}
```

**Status Codes:**
- `200 OK` - Run found
- `404 Not Found` - Run not found

### Retry Run
```bash
POST /runs/:runId/retry
```

Retries a previous run with the same options.

**Response:**
```json
{
  "runId": "new-run-id"
}
```

### Real-Time Events (SSE)
```bash
GET /events
```

Server-Sent Events stream for real-time execution updates.

**Event Types:**
- `run:start` - Test run started
- `suite:start` - Suite execution started
- `suite:end` - Suite execution completed
- `step:start` - Step execution started
- `step:end` - Step execution completed
- `run:end` - Test run completed
- `run:error` - Execution error

**Example Event:**
```
event: suite:start
data: {"type":"suite:start","timestamp":"2025-12-24T01:14:28.789Z","suite":"auth-flow"}

event: step:end
data: {"type":"step:end","timestamp":"2025-12-24T01:14:29.123Z","step":"login","status":"success"}
```

### Log Streaming (SSE)
```bash
GET /logs?levels=info,error&runId=mjjbn46r-2cyvi3&limit=100
```

Server-Sent Events stream for real-time log output.

**Query Parameters:**
- `levels` - Comma-separated log levels (debug, info, warn, error)
- `runId` - Filter logs for specific run
- `limit` - Number of backlog events to send initially (default: 200)

**Event Types:**
- `runs` - List of available sessions (sent once on connect)
- `log` - Log entry
- `ping` - Heartbeat every 15 seconds

**Example Event:**
```
event: log
data: {"level":"info","message":"Starting suite: auth-flow","timestamp":"2025-12-24T01:14:28.789Z","runId":"mjjbn46r-2cyvi3"}
```

## Usage Examples

### Run Specific Suites
```bash
curl -X POST http://localhost:3333/run \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "filters": {
        "suite_names": ["auth-flow", "checkout"]
      }
    },
    "label": "Auth and Checkout Tests"
  }'
```

### Run by Priority
```bash
curl -X POST http://localhost:3333/run \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "filters": {
        "priorities": ["critical"]
      }
    }
  }'
```

### Run by Tags
```bash
curl -X POST http://localhost:3333/run \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "filters": {
        "tags": ["smoke", "regression"]
      }
    }
  }'
```

### Check Run Status
```bash
RUN_ID="mjjbn46r-2cyvi3"
curl http://localhost:3333/runs/$RUN_ID | jq '.status'
```

### Watch Events in Real-Time
```bash
curl -N http://localhost:3333/events
```

### Watch Logs in Real-Time
```bash
# All logs
curl -N http://localhost:3333/logs

# Errors only
curl -N "http://localhost:3333/logs?levels=error"

# Specific run
curl -N "http://localhost:3333/logs?runId=mjjbn46r-2cyvi3"
```

### Retry Failed Run
```bash
RUN_ID="mjjbn46r-2cyvi3"
curl -X POST http://localhost:3333/runs/$RUN_ID/retry
```

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Start run
const { data } = await axios.post('http://localhost:3333/run', {
  options: {
    filters: { tags: ['smoke'] }
  },
  label: 'Smoke Tests'
});

const runId = data.runId;

// Poll for completion
const pollInterval = setInterval(async () => {
  const { data: run } = await axios.get(`http://localhost:3333/runs/${runId}`);
  
  if (run.status !== 'running') {
    console.log(`Run completed with status: ${run.status}`);
    clearInterval(pollInterval);
  }
}, 1000);
```

### Python
```python
import requests
import time

# Start run
response = requests.post('http://localhost:3333/run', json={
    'options': {
        'filters': {'tags': ['smoke']}
    },
    'label': 'Smoke Tests'
})

run_id = response.json()['runId']

# Poll for completion
while True:
    run = requests.get(f'http://localhost:3333/runs/{run_id}').json()
    
    if run['status'] != 'running':
        print(f"Run completed with status: {run['status']}")
        break
    
    time.sleep(1)
```

### Curl Script
```bash
#!/bin/bash

# Start run
RESPONSE=$(curl -s -X POST http://localhost:3333/run \
  -H "Content-Type: application/json" \
  -d '{"options":{"filters":{"tags":["smoke"]}},"label":"Smoke Tests"}')

RUN_ID=$(echo $RESPONSE | jq -r '.runId')
echo "Started run: $RUN_ID"

# Poll for completion
while true; do
  STATUS=$(curl -s http://localhost:3333/runs/$RUN_ID | jq -r '.status')
  
  if [ "$STATUS" != "running" ]; then
    echo "Run completed with status: $STATUS"
    break
  fi
  
  sleep 1
done
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Flow Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Test Server
        run: npm run server:test:dev &
        
      - name: Start Orchestrator
        run: npm run orchestrator:dev &
        
      - name: Wait for servers
        run: |
          timeout 30 bash -c 'until curl -f http://localhost:8080/health; do sleep 1; done'
          timeout 30 bash -c 'until curl -f http://localhost:3333/health; do sleep 1; done'
      
      - name: Run Tests
        run: |
          RESPONSE=$(curl -s -X POST http://localhost:3333/run \
            -H "Content-Type: application/json" \
            -d '{"options":{"filters":{"priorities":["critical","high"]}}}')
          
          RUN_ID=$(echo $RESPONSE | jq -r '.runId')
          
          # Wait for completion
          while true; do
            STATUS=$(curl -s http://localhost:3333/runs/$RUN_ID | jq -r '.status')
            if [ "$STATUS" != "running" ]; then
              echo "Tests completed with status: $STATUS"
              [ "$STATUS" = "success" ] && exit 0 || exit 1
            fi
            sleep 2
          done
```

## Configuration

### Environment Variables
```bash
# Orchestrator port (default: 3333)
export ORCHESTRATOR_PORT=3333

# Live events file location (default: results/live-events.jsonl)
export LIVE_EVENTS_PATH=/path/to/events.jsonl
```

### Multiple Test Environments
Run multiple orchestrators for different environments:

```bash
# Production tests
ORCHESTRATOR_PORT=3333 npm run orchestrator &

# Staging tests  
ORCHESTRATOR_PORT=3334 npm run orchestrator &
```

## Features

- ✅ REST API for remote test execution
- ✅ Real-time event streaming (Server-Sent Events)
- ✅ Live log streaming with filtering
- ✅ Run history and status tracking
- ✅ Retry failed runs
- ✅ CORS enabled
- ✅ Concurrent run prevention
- ✅ Graceful shutdown

## Troubleshooting

### Port Already in Use
```bash
ORCHESTRATOR_PORT=3334 npm run orchestrator:dev
```

### Cannot Start Run (Run Already in Progress)
Only one run can execute at a time. Wait for the current run to complete or check status:

```bash
curl http://localhost:3333/health
```

### Events Not Streaming
Ensure your client supports Server-Sent Events (SSE). Test with curl:

```bash
curl -N http://localhost:3333/events
```

### Server Not Responding
1. Check if server is running: `curl http://localhost:3333/health`
2. Check logs in console
3. Ensure dependencies are installed: `npm install`
4. Rebuild: `npm run build`

## Stopping the Orchestrator

Press `Ctrl+C` in the terminal where the orchestrator is running. The server will shut down gracefully.

## Advanced Usage

### Custom Execution Options
```bash
curl -X POST http://localhost:3333/run \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "filters": {
        "suite_names": ["auth-flow"],
        "step_ids": ["login", "logout"]
      },
      "execution": {
        "mode": "sequential",
        "continue_on_failure": false,
        "timeout": 120000
      },
      "reporting": {
        "formats": ["json", "html", "qa"]
      }
    },
    "label": "Custom Test Run"
  }'
```

### Monitoring with Realtime Events
```javascript
const evtSource = new EventSource('http://localhost:3333/events');

evtSource.addEventListener('suite:start', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Suite started: ${data.suite}`);
});

evtSource.addEventListener('run:end', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Run completed: ${data.status}`);
  evtSource.close();
});
```

## Security Considerations

The orchestrator is designed for local development and trusted environments. For production use:

1. Add authentication (API keys, OAuth)
2. Enable HTTPS
3. Implement rate limiting
4. Add request validation
5. Configure firewall rules
6. Use environment-specific configurations

## Next Steps

- Integrate with CI/CD pipeline
- Build monitoring dashboards
- Set up alerting for failed runs
- Create custom integrations
- Scale with multiple orchestrators
