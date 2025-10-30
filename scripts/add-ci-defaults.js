#!/usr/bin/env node
/**
 * Script para adicionar ci_default em inputs que não têm
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TESTS_DIR = path.join(__dirname, '..', 'tests');
const DRY_RUN = process.argv.includes('--dry-run');

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

function getDefaultValueForType(type) {
  const defaults = {
    text: 'test-user',
    password: 'test-password',
    email: 'test@example.com',
    number: 1,
    select: 0,  // First option
    multiselect: [],
    confirm: true,
    multiline: 'test multiline\ntext',
    url: 'https://example.com'
  };
  return defaults[type] || 'test-value';
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(content);
    
    if (!doc || !doc.steps) return;

    let modified = false;
    let addedCount = 0;

    doc.steps.forEach((step, stepIdx) => {
      if (step.input) {
        const inputs = Array.isArray(step.input) ? step.input : [step.input];
        inputs.forEach((input, inputIdx) => {
          if (!input.ci_default) {
            modified = true;
            addedCount++;
            
            const type = input.type || 'text';
            const ciDefault = getDefaultValueForType(type);
            
            console.log(`  ✏️  Step "${step.name || stepIdx}" - Input ${inputIdx + 1} (${type}): adding ci_default`);
            
            if (!DRY_RUN) {
              input.ci_default = ciDefault;
            }
          }
        });
      }
    });

    if (modified && !DRY_RUN) {
      const newContent = yaml.dump(doc, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Added ${addedCount} ci_default(s) to ${path.basename(filePath)}\n`);
    } else if (modified) {
      console.log(`🔍 [DRY-RUN] Would add ${addedCount} ci_default(s) to ${path.basename(filePath)}\n`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🚀 CI Default Adder');
console.log('='.repeat(60));
console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}\n`);

const files = findYAMLFiles(TESTS_DIR);
console.log(`Found ${files.length} YAML files\n`);

files.forEach(processFile);

console.log('\n✅ Done!');
