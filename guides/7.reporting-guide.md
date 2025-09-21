# Reporting Guide

The Flow Test Engine provides comprehensive reporting capabilities with both JSON artifacts and interactive HTML reports for test results analysis.

## Report Types

### JSON Results

JSON reports contain complete execution data and are generated automatically after each test run.

**Location:** `results/latest.json`

**Structure:**
```json
{
  "project_name": "My API Tests",
  "start_time": "2025-09-17T10:51:16.787Z",
  "end_time": "2025-09-17T10:51:18.841Z",
  "total_duration_ms": 2054,
  "total_tests": 32,
  "successful_tests": 32,
  "failed_tests": 0,
  "success_rate": 100,
  "suites_results": [
    {
      "node_id": "auth-tests",
      "suite_name": "Authentication Tests",
      "status": "success",
      "duration_ms": 1250,
      "steps_results": [...]
    }
  ]
}
```

### HTML Reports

Interactive HTML reports provide a user-friendly interface for analyzing test results.

**Generation:**
```bash
# Generate HTML report from latest results
npm run report:html

# Or use the CLI directly
node dist/report-generator/cli.js
```

**Features:**
- Interactive test suite navigation
- Detailed request/response inspection
- Performance metrics visualization
- Error highlighting and filtering
- Export capabilities

## Report Configuration

Configure reporting behavior in `flow-test.config.yml`:

```yaml
reporting:
  formats: ["html", "json"]        # Output formats
  output_dir: "./results"          # Output directory
  aggregate: true                  # Create aggregated results
  include_performance_metrics: true # Include timing data
  include_variables_state: true    # Include variable values
```

## Custom Report Templates

### HTML Template Customization

The HTML reports use modular components that can be customized:

**Location:** `src/report-generator/components/`

**Available Components:**
- `HeaderComponent` - Report header with summary
- `SummaryCardsComponent` - Key metrics cards
- `TestSuiteComponent` - Individual test suite details
- `TestStepComponent` - Step-by-step execution details

### Custom Styling

Modify report appearance by editing CSS:

**File:** `src/templates/styles.css`

```css
/* Custom report styling */
.test-results {
  font-family: 'Inter', sans-serif;
}

.status-success {
  background-color: #10b981;
}

.status-failed {
  background-color: #ef4444;
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Generate report
        run: npm run report:html

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: results/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'npm install'
                sh 'npm test'
            }
            post {
                always {
                    sh 'npm run report:html'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'results',
                        reportFiles: 'latest.html',
                        reportName: 'API Test Report'
                    ])
                }
            }
        }
    }
}
```

### GitLab CI

```yaml
stages:
  - test

api-tests:
  stage: test
  image: node:18
  script:
    - npm install
    - npm test
    - npm run report:html
  artifacts:
    paths:
      - results/
    expire_in: 1 week
  coverage: '/All files[^|]*\|[^|]*\s*([\d\.]+)/'
```

## Report Analysis

### Performance Metrics

Analyze response times and identify bottlenecks:

```bash
# Check slow requests
cat results/latest.json | jq '.suites_results[].steps_results[] | select(.duration_ms > 1000) | {step: .step_name, duration: .duration_ms}'

# Calculate average response time
cat results/latest.json | jq '[.suites_results[].steps_results[].duration_ms] | add / length'
```

### Failure Analysis

Identify common failure patterns:

```bash
# Find failed tests
cat results/latest.json | jq '.suites_results[] | select(.status == "failed") | {suite: .suite_name, failures: .steps_failed}'

# Get failure details
cat results/latest.json | jq '.suites_results[].steps_results[] | select(.status == "failed") | {step: .step_name, error: .error_message}'
```

### Success Rate Trends

Track test reliability over time:

```bash
# Store historical data
cp results/latest.json results/$(date +%Y%m%d_%H%M%S).json

# Compare success rates
for file in results/*.json; do
  echo "$file: $(jq '.success_rate' $file)%"
done
```

## Custom Report Generation

### Programmatic Report Generation

```typescript
import { HTMLReportGenerator } from './src/report-generator/html-generator';
import { EngineExecutionResult } from './src/types/engine.types';

async function generateCustomReport(results: EngineExecutionResult) {
  const generator = new HTMLReportGenerator();

  // Generate HTML report
  const htmlPath = await generator.generate(results);

  console.log(`Report generated: ${htmlPath}`);
}
```

### Custom JSON Processing

```typescript
import fs from 'fs';
import path from 'path';

interface TestMetrics {
  totalTests: number;
  successRate: number;
  avgResponseTime: number;
  failureCount: number;
}

function analyzeResults(jsonPath: string): TestMetrics {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const steps = data.suites_results.flatMap(s => s.steps_results);
  const avgResponseTime = steps.reduce((sum, step) => sum + step.duration_ms, 0) / steps.length;

  return {
    totalTests: data.total_tests,
    successRate: data.success_rate,
    avgResponseTime,
    failureCount: data.failed_tests
  };
}
```

## Report Archiving

### Automatic Archiving

```bash
# Archive reports with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p reports/archive/$TIMESTAMP
cp results/latest.json reports/archive/$TIMESTAMP/
cp results/latest.html reports/archive/$TIMESTAMP/

# Clean old archives (keep last 30 days)
find reports/archive -type d -mtime +30 -exec rm -rf {} +
```

### Report Retention Policy

Configure retention in your CI/CD:

```yaml
# Keep reports for 90 days
- name: Clean old reports
  run: |
    find results/archive -type d -mtime +90 -exec rm -rf {} +
    find results -name "*.json" -mtime +30 -exec rm {} +
```

## Integration with External Tools

### Slack Notifications

```bash
#!/bin/bash
# Send test results to Slack

RESULTS=$(cat results/latest.json)
SUCCESS_RATE=$(echo $RESULTS | jq '.success_rate')
FAILED=$(echo $RESULTS | jq '.failed_tests')

if [ "$FAILED" -gt 0 ]; then
  COLOR="danger"
  STATUS="❌ Tests Failed"
else
  COLOR="good"
  STATUS="✅ Tests Passed"
fi

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$STATUS - Success Rate: ${SUCCESS_RATE}%\"}" \
  $SLACK_WEBHOOK_URL
```

### Email Reports

```bash
#!/bin/bash
# Send HTML report via email

REPORT_PATH="results/latest.html"
SUBJECT="API Test Results - $(date)"

# Using mail command
cat $REPORT_PATH | mail -s "$SUBJECT" -a "Content-Type: text/html" team@example.com

# Or using sendmail
(
  echo "To: team@example.com"
  echo "Subject: $SUBJECT"
  echo "Content-Type: text/html"
  echo ""
  cat $REPORT_PATH
) | sendmail -t
```

### Dashboard Integration

```typescript
// Send metrics to monitoring dashboard
async function sendMetricsToDashboard(resultsPath: string) {
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  const metrics = {
    timestamp: new Date().toISOString(),
    success_rate: results.success_rate,
    total_tests: results.total_tests,
    failed_tests: results.failed_tests,
    avg_duration: results.total_duration_ms / results.total_tests
  };

  await fetch('https://dashboard.example.com/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metrics)
  });
}
```

## Troubleshooting Reports

### Common Issues

1. **Report not generated**
   ```bash
   # Check if JSON results exist
   ls -la results/latest.json

   # Verify JSON is valid
   cat results/latest.json | jq '.'
   ```

2. **HTML report not opening**
   ```bash
   # Check file permissions
   ls -la results/latest.html

   # Try different browser
   open results/latest.html  # macOS
   xdg-open results/latest.html  # Linux
   start results/latest.html  # Windows
   ```

3. **Missing test details**
   ```bash
   # Enable verbose logging during test execution
   flow-test --verbose

   # Check configuration includes detailed reporting
   cat flow-test.config.yml | grep reporting
   ```

### Performance Optimization

For large test suites, optimize report generation:

```yaml
reporting:
  formats: ["json"]  # Skip HTML for faster execution
  include_performance_metrics: false  # Reduce JSON size
  include_variables_state: false
```

Generate HTML reports separately when needed:

```bash
# Fast test execution
flow-test --silent --no-log

# Generate report only when needed
npm run report:html
```

## Advanced Reporting Features

### Custom Metrics

Add custom metrics to your test results:

```yaml
steps:
  - name: "Performance test"
    request:
      method: "GET"
      url: "/api/data"
    metadata:
      custom_metrics:
        expected_response_time: 500
        business_critical: true
    assert:
      response_time_ms: { max: 1000 }
```

### Report Annotations

Add contextual information to reports:

```yaml
metadata:
  annotations:
    environment: "staging"
    test_type: "integration"
    business_unit: "payments"
    sla_response_time: "200ms"
```

### Comparative Reporting

Compare results between runs:

```bash
# Generate comparison report
npm run report:compare results/run1.json results/run2.json
```

This comprehensive reporting system ensures you have full visibility into your API testing results, performance metrics, and can integrate seamlessly with your CI/CD pipelines and monitoring tools.