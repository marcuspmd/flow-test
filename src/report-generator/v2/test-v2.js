#!/usr/bin/env node

/**
 * Script CLI para testar o Report Generator V2
 */

// Usa o gerador compilado em dist para evitar problemas de require TS
const { ReportGeneratorV2 } = require('../../../dist/report-generator/v2/report-generator-v2.js');
const fs = require('fs');
const path = require('path');

// Dados de teste simplificados
const testData = {
  project_name: 'Flow Test V2 Demo',
  total_tests: 8,
  successful_tests: 6,
  failed_tests: 2,
  success_rate: 75.0,
  total_duration_ms: 32000,
  generated_at: new Date().toISOString(),
  metadata: {
    version: '2.0.0',
    environment: 'demo',
    author: 'Flow Test V2'
  },
  suites_results: [
    {
      suite_name: 'Authentication Flow',
      status: 'success',
      duration_ms: 12000,
      metadata: {
        priority: 'critical',
        tags: ['auth', 'security']
      },
      steps_results: [
        {
          step_name: 'Login Success',
          status: 'success',
          duration_ms: 2000,
          assertions_results: [
            {
              type: 'status_code',
              expected: 200,
              actual: 200,
              passed: true,
              operator: 'equals'
            }
          ],
          request_details: {
            method: 'POST',
            url: '/auth/login',
            headers: { 'Content-Type': 'application/json' },
            body: { email: 'test@demo.com', password: '***' }
          },
          response_details: {
            status_code: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { token: 'abc123', user: 'demo' }
          }
        },
        {
          step_name: 'Profile Access',
          status: 'success',
          duration_ms: 1500,
          assertions_results: [
            {
              type: 'status_code',
              expected: 200,
              actual: 200,
              passed: true,
              operator: 'equals'
            }
          ]
        }
      ]
    },
    {
      suite_name: 'API Tests',
      status: 'failed',
      duration_ms: 15000,
      metadata: {
        priority: 'high',
        tags: ['api', 'crud']
      },
      steps_results: [
        {
          step_name: 'Get Users',
          status: 'success',
          duration_ms: 3000,
          assertions_results: [
            {
              type: 'status_code',
              expected: 200,
              actual: 200,
              passed: true,
              operator: 'equals'
            }
          ]
        },
        {
          step_name: 'Create User',
          status: 'failed',
          duration_ms: 5000,
          assertions_results: [
            {
              type: 'status_code',
              expected: 201,
              actual: 500,
              passed: false,
              operator: 'equals'
            }
          ],
          error_context: {
            message: 'Internal Server Error',
            type: 'HTTPError',
            details: 'Database connection timeout'
          }
        }
      ]
    }
  ]
};

async function main() {
  const args = process.argv.slice(2);
  const theme = args[0] || 'default';
  const outputFile = args[1] || `report-v2-${theme}.html`;

  console.log('🚀 Gerando relatório V2...');
  console.log(`📝 Tema: ${theme}`);
  console.log(`📁 Arquivo: ${outputFile}`);

  try {
    // Criar diretório results se não existir
    const resultsDir = path.resolve(__dirname, '../../../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const outputPath = path.join(resultsDir, outputFile);

    const generator = new ReportGeneratorV2();
    await generator.generateReport(testData, outputPath, { theme });

    console.log('✅ Relatório gerado com sucesso!');
    console.log(`📂 Localização: ${outputPath}`);
    console.log(`🌐 Abra no navegador: file://${outputPath}`);

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    process.exit(1);
  }
}

// Mostrar ajuda
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📖 Flow Test Report Generator V2 - CLI

Uso:
  node test-v2.js [tema] [arquivo]

Parâmetros:
  tema      Tema a usar (default, dark, high-contrast, compact)
  arquivo   Nome do arquivo de saída (padrão: report-v2-[tema].html)

Exemplos:
  node test-v2.js
  node test-v2.js dark
  node test-v2.js compact report-compacto.html

Temas disponíveis:
  default        Tema padrão com cores azuis
  dark           Tema escuro para menor fadiga visual
  high-contrast  Tema de alto contraste para acessibilidade
  compact        Tema compacto para relatórios densos

O arquivo será salvo em: results/
  `);
  process.exit(0);
}

main().catch(console.error);
