#!/usr/bin/env node

import { HTMLReportGenerator } from './html-generator';
import { PostmanExporter } from './postman-exporter';
import { HistoryAnalyzer } from './history-analyzer';
import path from 'path';
import fs from 'fs';

interface CLIOptions {
  input?: string;
  output?: string;
  theme?: 'light' | 'dark' | 'auto';
  includeCurl?: boolean;
  includeRaw?: boolean;
  exportPostman?: boolean;
  exportCurl?: boolean;
  historicalDashboard?: boolean;
  compareBaseline?: string;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-i':
      case '--input':
        options.input = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '--theme':
        const theme = args[++i] as 'light' | 'dark' | 'auto';
        if (['light', 'dark', 'auto'].includes(theme)) {
          options.theme = theme;
        }
        break;
      case '--no-curl':
        options.includeCurl = false;
        break;
      case '--no-raw':
        options.includeRaw = false;
        break;
      case '--export-postman':
        options.exportPostman = true;
        break;
      case '--export-curl':
        options.exportCurl = true;
        break;
      case '--historical':
        options.historicalDashboard = true;
        break;
      case '--compare-baseline':
        options.compareBaseline = args[++i];
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        if (!options.input && !arg.startsWith('-')) {
          options.input = arg;
        }
    }
  }

  // Set defaults
  if (options.includeCurl === undefined) options.includeCurl = true;
  if (options.includeRaw === undefined) options.includeRaw = true;
  if (!options.theme) options.theme = 'light';

  return options;
}

function showHelp() {
  console.log(`
Flow Test HTML Report Generator v1.0

Usage: flow-test-html [options] <input.json>

Options:
  -i, --input <file>     Input JSON report file (required)
  -o, --output <file>    Output HTML file (optional, auto-generated if not specified)
  --theme <theme>        Theme: light, dark, auto (default: light)
  --no-curl             Disable cURL command generation
  --no-raw              Disable raw HTTP data inclusion
  --export-postman      Export as Postman collection (in addition to HTML)
  --export-curl         Export as cURL script file (in addition to HTML)
  --historical          Generate historical dashboard from all JSON files in results directory
  --compare-baseline <file>  Compare current results with baseline file
  -h, --help            Show this help message

Examples:
  flow-test-html results/latest.json
  flow-test-html -i results/test_2024-01-01.json -o report.html
  flow-test-html results/latest.json --theme dark --no-raw
  flow-test-html results/latest.json --export-postman --export-curl
  flow-test-html results/latest.json --compare-baseline results/baseline.json
  flow-test-html --historical

Features:
  ✅ Enhanced HTML reports with Tailwind CSS 4 styling
  ✅ Copy-to-clipboard cURL commands for easy Postman import
  ✅ Raw HTTP request/response data for debugging
  ✅ Postman Collection v2.1 export with sample responses
  ✅ Executable cURL script generation
  ✅ Responsive design for mobile and desktop viewing
  ✅ Interactive collapsible sections
  ✅ Performance metrics visualization
  ✅ Historical dashboard with trend analysis and recommendations
  ✅ Baseline comparison with regression detection
`);
}

async function generateReport(options: CLIOptions) {
  try {
    // Handle historical dashboard generation
    if (options.historicalDashboard) {
      const historyAnalyzer = new HistoryAnalyzer();
      const dashboardPath = await historyAnalyzer.createHistoricalDashboard('./results');
      console.log(`📊 Historical dashboard generated: ${dashboardPath}`);
      console.log(`🌐 Open in browser: file://${path.resolve(dashboardPath)}`);
      return;
    }

    if (!options.input) {
      console.error('❌ Error: Input JSON file is required (or use --historical)');
      console.log('Use --help for usage information');
      process.exit(1);
    }

    if (!fs.existsSync(options.input)) {
      console.error(`❌ Error: Input file not found: ${options.input}`);
      process.exit(1);
    }

    console.log(`🔍 Processing JSON report: ${options.input}`);

    const generator = new HTMLReportGenerator({
      outputDir: options.output ? path.dirname(options.output) : './results',
      includeCurlCommands: options.includeCurl,
      includeRawData: options.includeRaw,
      theme: options.theme
    });

    const outputPath = await generator.generateFromJSON(options.input, options.output);
    
    console.log(`✅ Enhanced HTML report generated successfully!`);
    console.log(`📄 Report: ${outputPath}`);
    console.log(`🌐 Open in browser: file://${path.resolve(outputPath)}`);

    // Export additional formats if requested
    const exportedFiles: string[] = [];
    
    if (options.exportPostman) {
      const postmanExporter = new PostmanExporter();
      const postmanPath = await postmanExporter.exportFromJSON(options.input);
      exportedFiles.push(postmanPath);
      console.log(`📮 Postman Collection: ${postmanPath}`);
    }

    if (options.exportCurl) {
      const postmanExporter = new PostmanExporter();
      const jsonData = JSON.parse(fs.readFileSync(options.input, 'utf8'));
      const curlPath = await postmanExporter.exportCurlScript(jsonData);
      exportedFiles.push(curlPath);
      console.log(`📜 cURL Script: ${curlPath}`);
      console.log(`   Run with: chmod +x ${curlPath} && ${curlPath}`);
    }

    // Handle baseline comparison
    if (options.compareBaseline) {
      if (!fs.existsSync(options.compareBaseline)) {
        console.error(`❌ Error: Baseline file not found: ${options.compareBaseline}`);
      } else {
        const historyAnalyzer = new HistoryAnalyzer();
        const comparison = await historyAnalyzer.compareWithBaseline(options.input, options.compareBaseline);
        
        console.log('\n📈 Baseline Comparison Results:');
        console.log(`   Success Rate Change: ${comparison.comparison.summary.success_rate_change >= 0 ? '+' : ''}${comparison.comparison.summary.success_rate_change.toFixed(1)}%`);
        console.log(`   Duration Change: ${comparison.comparison.summary.duration_change_percent >= 0 ? '+' : ''}${comparison.comparison.summary.duration_change_percent.toFixed(1)}%`);
        console.log(`   Stability Score: ${comparison.comparison.trends.stability_score}%`);
        
        if (comparison.comparison.trends.regression_detected) {
          console.log('   🚨 Regression detected!');
        }
        if (comparison.comparison.trends.improvement_detected) {
          console.log('   ✅ Improvement detected!');
        }
      }
    }
    
    // Show report summary
    const jsonData = JSON.parse(fs.readFileSync(options.input, 'utf8'));
    console.log('\n📊 Report Summary:');
    console.log(`   Project: ${jsonData.project_name}`);
    console.log(`   Success Rate: ${jsonData.success_rate?.toFixed(1) || 'N/A'}%`);
    console.log(`   Total Tests: ${jsonData.total_tests || 'N/A'}`);
    console.log(`   Duration: ${jsonData.total_duration_ms ? formatDuration(jsonData.total_duration_ms) : 'N/A'}`);
    
    if (options.includeCurl) {
      console.log('\n🔧 Features included:');
      console.log('   ✅ cURL commands (copy-to-clipboard ready)');
    }
    if (options.includeRaw) {
      console.log('   ✅ Raw HTTP request/response data');
    }
    
    if (exportedFiles.length > 0) {
      console.log('\n📁 Additional exports:');
      exportedFiles.forEach(file => {
        console.log(`   📄 ${file}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error generating HTML report:`, (error as Error).message);
    process.exit(1);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  await generateReport(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { parseArgs, generateReport };