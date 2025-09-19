const { ReportingService } = require('./dist/services/reporting');
const { ConfigManager } = require('./dist/core/config');
const fs = require('fs');

// Create a simple test result
const testResult = {
  project_name: 'Test Project V2',
  timestamp: new Date().toISOString(),
  summary: {
    total_suites: 1,
    total_tests: 1,
    passed: 1,
    failed: 0,
    skipped: 0,
    duration_ms: 100
  },
  suites_results: [{
    suite_name: 'Test Suite',
    status: 'success',
    duration_ms: 100,
    steps: [{
      name: 'Test Step',
      status: 'success',
      duration_ms: 50,
      request_details: {
        method: 'GET',
        url: 'http://example.com',
        curl_command: 'curl -X GET http://example.com'
      },
      response: {
        status_code: 200,
        headers: {},
        body: { message: 'OK' }
      }
    }]
  }]
};

// Test the reporting service
const configManager = new ConfigManager();
const reportingService = new ReportingService(configManager);

console.log('Testing V2 report generation...');
console.log('Config version:', configManager.getConfig()?.reporting?.version);

reportingService.generateReports(testResult, './results/test-v2-verification', 'test-v2-verification')
  .then(() => {
    console.log('Report generation completed');
    // Check if the file was created
    const files = fs.readdirSync('./results/test-v2-verification');
    console.log('Generated files:', files);
  })
  .catch(error => {
    console.error('Error generating report:', error);
  });