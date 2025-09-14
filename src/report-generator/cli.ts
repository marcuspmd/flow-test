
import { HTMLReportGenerator } from './html-generator';
import path from 'path';

async function main() {
  try {
    console.log('Generating HTML report viewer...');
    const generator = new HTMLReportGenerator();
    const jsonPath = path.resolve(process.cwd(), 'results/latest.json');
    const outputPath = await generator.generateFromJSON(jsonPath);
    console.log(`✅ HTML report viewer generated successfully!`);
    console.log(`📄 Report: ${outputPath}`);
    console.log(`🌐 Open in browser: file://${outputPath}`);
  } catch (error) {
    console.error(`❌ Error generating HTML report:`, (error as Error).message);
    process.exit(1);
  }
}

main();
