const { ReportingService } = require('./dist/services/reporting.js');
const { ConfigManager } = require('./dist/core/config.js');

// Simular dados de teste simples
const testData = {
  project_name: 'Test Project V2',
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

async function testV2Generation() {
  const configManager = new ConfigManager();
  const service = new ReportingService(configManager);

  try {
    console.log('[INFO] Testando geração de relatório V2...');
    await service.generateHtmlReport(testData, './results/test-v2-report.html');
    console.log('[SUCCESS] Relatório V2 gerado com sucesso em ./results/test-v2-report.html');
  } catch (error) {
    console.error('[ERRO] Falha ao gerar relatório V2:', error.message);
  }
}

testV2Generation();