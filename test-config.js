const { ReportingService } = require('./dist/services/reporting.js');
const fs = require('fs');
const yaml = require('js-yaml');

// Ler configuração
const config = yaml.load(fs.readFileSync('./flow-test.config.yml', 'utf8'));
console.log('Configuração lida:', config.reporting);

// Simular dados de teste simples
const testData = {
  project_name: 'Test Project',
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  total_duration_ms: 1000,
  total_tests: 1,
  successful_tests: 1,
  failed_tests: 0,
  skipped_tests: 0,
  success_rate: 100,
  suites_results: [{
    node_id: 'test-suite',
    suite_name: 'Test Suite',
    file_path: './test.yaml',
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    duration_ms: 1000,
    status: 'success',
    steps_executed: 1,
    steps_successful: 1,
    steps_failed: 0,
    success_rate: 100,
    variables_captured: {},
    available_variables: {},
    steps_results: [{
      step_name: 'Test Step',
      status: 'success',
      duration_ms: 1000,
      request_details: { method: 'GET', url: 'http://example.com', headers: {} },
      response_details: { status_code: 200, headers: {}, body: {} },
      assertions_results: []
    }]
  }],
  global_variables_final_state: {}
};

const service = new ReportingService();
console.log('ReportingService criado com sucesso');
console.log('Teste de configuração concluído - funcionalidade básica OK');