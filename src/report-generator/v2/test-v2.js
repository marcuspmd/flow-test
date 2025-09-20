#!/usr/bin/env node

/**
 * Script de teste para o Report Generator V2
 * Gera relatórios usando a arquitetura V2 existente
 */

const fs = require('fs');
const path = require('path');

// Importa o gerador V2 compilado
let ReportGeneratorV2;
try {
  const v2Module = require('../../../dist/report-generator/v2/report-generator-v2.js');
  ReportGeneratorV2 = v2Module.ReportGeneratorV2;
} catch (error) {
  console.error('❌ Erro ao importar ReportGeneratorV2. Execute `npm run build` primeiro.');
  console.error('Detalhes:', error.message);
  process.exit(1);
}

/**
 * Encontra o arquivo JSON mais recente na pasta results
 */
function findLatestResultFile() {
  const resultsDir = path.join(__dirname, '../../../results');

  if (!fs.existsSync(resultsDir)) {
    throw new Error('Pasta results/ não encontrada');
  }

  const files = fs.readdirSync(resultsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(resultsDir, file),
      mtime: fs.statSync(path.join(resultsDir, file)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    throw new Error('Nenhum arquivo JSON encontrado na pasta results/');
  }

  return files[0];
}

/**
 * Gera relatório V2 com tema especificado
 */
async function generateV2Report(theme = 'default') {
  try {
    console.log(`🚀 Gerando relatório V2 com tema: ${theme}`);

    // Encontra arquivo mais recente
    const latestFile = findLatestResultFile();
    console.log(`📊 Usando arquivo: ${latestFile.name}`);

    // Lê os dados
    const data = JSON.parse(fs.readFileSync(latestFile.path, 'utf-8'));

    // Cria configuração baseada no tema
    const config = {
      theme: {
        name: theme,
        mode: theme === 'dark' ? 'dark' : 'light'
      },
      layout: {
        showSidebar: true,
        sidebarWidth: 300
      },
      outputPath: path.join(__dirname, '../../../results', `report-v2-${theme}.html`)
    };

    // Gera relatório
    const generator = new ReportGeneratorV2(config);
    await generator.generateReport(data, config.outputPath);

    console.log(`✅ Relatório V2 gerado com sucesso!`);
    console.log(`📁 Arquivo: ${config.outputPath}`);
    console.log(`🌐 Para abrir: open ${config.outputPath}`);

  } catch (error) {
    console.error('❌ Erro ao gerar relatório V2:', error);
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  const theme = process.argv[2] || 'default';
  generateV2Report(theme);
}

module.exports = { generateV2Report };