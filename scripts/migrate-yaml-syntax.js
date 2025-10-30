#!/usr/bin/env node
/**
 * @fileoverview Script to migrate YAML test files to new deterministic expression syntax
 *
 * Migrations:
 * - {{$faker.X.Y}} → #faker.X.Y
 * - {{faker.X.Y}} → #faker.X.Y
 * - {{$js:code}} → $code
 * - {{js:code}} → $code
 * - Keeps {{$env.VAR}} as-is (templates still needed for env vars)
 * - Keeps {{variable}} as-is (regular variables)
 * - capture: JMESPath implicit stays as-is (will be migrated manually if needed)
 *
 * Usage:
 *   node scripts/migrate-yaml-syntax.js [--dry-run] [--file path/to/file.yaml]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const TESTS_DIR = path.join(__dirname, '..', 'tests');
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_FILE = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : null;

// Statistics
const stats = {
  filesProcessed: 0,
  filesChanged: 0,
  fakerMigrations: 0,
  jsMigrations: 0,
  errors: 0
};

/**
 * Migrate a single YAML content string
 */
function migrateYAMLContent(content, filePath) {
  let modified = content;
  let changesMade = false;
  const changes = [];

  // MIGRATION 1: {{$faker.X.Y}} → "#faker.X.Y"
  // Use a more precise regex that handles nested parentheses/brackets
  const fakerWithDollar = /\{\{\$faker\.([\w.]+(?:\([^)]*\))?)\}\}/g;
  const fakerMatches = [...content.matchAll(fakerWithDollar)];
  for (const match of fakerMatches) {
    const fullMatch = match[0];
    const expression = match[1];
    const replacement = `"#faker.${expression}"`;

    modified = modified.replace(fullMatch, replacement);
    changes.push(`  - ${fullMatch} → ${replacement}`);
    stats.fakerMigrations++;
    changesMade = true;
  }

  // MIGRATION 2: {{faker.X.Y}} → "#faker.X.Y" (without $ prefix)
  const fakerWithoutDollar = /\{\{faker\.([\w.]+(?:\([^)]*\))?)\}\}/g;
  const fakerNoDollarMatches = [...modified.matchAll(fakerWithoutDollar)];
  for (const match of fakerNoDollarMatches) {
    const fullMatch = match[0];
    const expression = match[1];
    const replacement = `"#faker.${expression}"`;

    modified = modified.replace(fullMatch, replacement);
    changes.push(`  - ${fullMatch} → ${replacement}`);
    stats.fakerMigrations++;
    changesMade = true;
  }

  // MIGRATION 3: {{$js:code}} → "$code"
  // Match {{$js:...}} with balanced braces
  const jsWithDollarColon = /\{\{\$js:\s*([^\}]+)\}\}/g;
  const jsMatches = [...modified.matchAll(jsWithDollarColon)];
  for (const match of jsMatches) {
    const fullMatch = match[0];
    const jsCode = match[1].trim();
    const replacement = `"$${jsCode}"`;

    modified = modified.replace(fullMatch, replacement);
    const preview = fullMatch.length > 60 ? fullMatch.substring(0, 60) + '...' : fullMatch;
    changes.push(`  - ${preview} → "$${jsCode.substring(0, 40)}..."`);
    stats.jsMigrations++;
    changesMade = true;
  }

  // MIGRATION 4: {{js:code}} → "$code" (without $ prefix)
  const jsWithoutDollar = /\{\{js:\s*([^\}]+)\}\}/g;
  const jsNoDollarMatches = [...modified.matchAll(jsWithoutDollar)];
  for (const match of jsNoDollarMatches) {
    const fullMatch = match[0];
    const jsCode = match[1].trim();
    const replacement = `"$${jsCode}"`;

    modified = modified.replace(fullMatch, replacement);
    const preview = fullMatch.length > 60 ? fullMatch.substring(0, 60) + '...' : fullMatch;
    changes.push(`  - ${preview} → "$${jsCode.substring(0, 40)}..."`);
    stats.jsMigrations++;
    changesMade = true;
  }

  if (changesMade) {
    console.log(`\n✏️  ${path.basename(filePath)}:`);
    changes.forEach(change => console.log(change));
    stats.filesChanged++;
  }

  return { modified, changesMade };
}

/**
 * Process a single YAML file
 */
function processFile(filePath) {
  try {
    stats.filesProcessed++;

    console.log(`\n📄 Processing: ${path.relative(process.cwd(), filePath)}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const { modified, changesMade } = migrateYAMLContent(content, filePath);

    if (changesMade) {
      // Validate YAML is still valid
      try {
        yaml.load(modified);
      } catch (yamlError) {
        console.error(`❌ YAML validation failed after migration: ${yamlError.message}`);
        stats.errors++;
        return;
      }

      if (!DRY_RUN) {
        fs.writeFileSync(filePath, modified, 'utf8');
        console.log(`✅ Migrated successfully`);
      } else {
        console.log(`🔍 [DRY-RUN] Would migrate this file`);
      }
    } else {
      console.log(`⏭️  No migrations needed`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Recursively find all YAML files in a directory
 */
function findYAMLFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findYAMLFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 YAML Syntax Migration Tool');
  console.log('================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no files will be modified)' : 'LIVE (files will be modified)'}`);
  console.log('');
  console.log('Migrations:');
  console.log('  - {{$faker.X.Y}} → #faker.X.Y');
  console.log('  - {{faker.X.Y}} → #faker.X.Y');
  console.log('  - {{$js:code}} → $code');
  console.log('  - {{js:code}} → $code');
  console.log('  - {{$env.VAR}} → kept as-is');
  console.log('  - {{variable}} → kept as-is');
  console.log('================================\n');

  let filesToProcess = [];

  if (SPECIFIC_FILE) {
    const resolvedPath = path.resolve(SPECIFIC_FILE);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ File not found: ${SPECIFIC_FILE}`);
      process.exit(1);
    }
    filesToProcess = [resolvedPath];
    console.log(`Processing specific file: ${resolvedPath}\n`);
  } else {
    filesToProcess = findYAMLFiles(TESTS_DIR);
    console.log(`Found ${filesToProcess.length} YAML files in ${TESTS_DIR}\n`);
  }

  // Process all files
  filesToProcess.forEach(processFile);

  // Print summary
  console.log('\n');
  console.log('================================');
  console.log('📊 Migration Summary');
  console.log('================================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files changed: ${stats.filesChanged}`);
  console.log(`Faker migrations: ${stats.fakerMigrations}`);
  console.log(`JavaScript migrations: ${stats.jsMigrations}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('================================\n');

  if (DRY_RUN) {
    console.log('🔍 This was a DRY-RUN. No files were modified.');
    console.log('   Run without --dry-run to apply changes.\n');
  } else if (stats.filesChanged > 0) {
    console.log('✅ Migration complete!');
    console.log('   Review changes with: git diff\n');
  }

  if (stats.errors > 0) {
    console.log('⚠️  Some files had errors. Review output above.\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateYAMLContent };
