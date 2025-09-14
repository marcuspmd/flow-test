#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { HTMLReportGenerator } from './src/report-generator/html-generator';
import { AggregatedResult } from './src/types/config.types';

async function regenerateHTML(): Promise<void> {
  try {
    console.log('🔄 Regenerating HTML report...');

    // First, regenerate CSS
    console.log('🎨 Regenerating CSS...');
    const { execSync } = require('child_process');
    try {
      execSync('npm run build:css', { stdio: 'pipe' });
      console.log('✅ CSS regenerated successfully');
    } catch (error: any) {
      console.warn('⚠️ CSS regeneration failed:', error.message);
    }

    // Read the latest JSON file
    const jsonPath = path.join(__dirname, 'results', 'latest.json');

    if (!fs.existsSync(jsonPath)) {
      console.error('❌ File latest.json not found in results directory');
      process.exit(1);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data: AggregatedResult = JSON.parse(rawData);

    console.log(`📊 Loaded data for: ${data.project_name}`);
    console.log(`📋 Tests: ${data.total_tests} | Success Rate: ${data.success_rate}%`);

    // Generate HTML report
    const generator = new HTMLReportGenerator({
      outputDir: './results'
    });

    const htmlPath = await generator.generateHTML(data, path.join(__dirname, 'results', 'latest.html'));

    console.log(`✅ HTML report regenerated: ${htmlPath}`);
    console.log('🌐 Open the file in your browser to view the report');

  } catch (error: any) {
    console.error('❌ Error regenerating HTML:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  regenerateHTML();
}

export { regenerateHTML };