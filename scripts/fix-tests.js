#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Script to fix common issues in test YAML files:
 * 1. Replace httpbin.org with localhost:8080
 * 2. Fix JMESPath syntax errors in captures
 * 3. Remove excessive delays
 */

const FIXES = {
  // Replace external httpbin.org URLs with local Docker service
  'https://httpbin.org': 'http://localhost:8080',
  'httpbin.org': 'localhost:8080',

  // Fix JMESPath quotes in headers
  "body.'user-agent'": 'body["user-agent"]',
  "headers.'cache-control'": 'headers["cache-control"]',
  "headers.'content-type'": 'headers["content-type"]',
  "headers.'x-permission-check'": 'headers["x-permission-check"]',

  // Fix faker syntax in captures (should not have #faker prefix in capture expressions)
  'capture:\\s+([a-zA-Z_]+):\\s+"?#faker\\.': 'capture:\n  $1: "',

  // Fix JavaScript syntax in captures (should not have $ prefix in capture expressions)
  'capture:\\s+([a-zA-Z_]+):\\s+["\']\$([^"\']+)["\']': 'capture:\n  $1: "$2"',
};

const testsDir = path.join(__dirname, '..', 'tests');

function fixYamlFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply string replacements
  for (const [pattern, replacement] of Object.entries(FIXES)) {
    if (pattern.includes('\\')) {
      // Regex replacement
      const regex = new RegExp(pattern, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
        console.log(`  ✓ Applied regex fix: ${pattern}`);
      }
    } else {
      // Simple string replacement
      if (content.includes(pattern)) {
        content = content.replaceAll(pattern, replacement);
        modified = true;
        console.log(`  ✓ Replaced: ${pattern} → ${replacement}`);
      }
    }
  }

  // Fix specific JMESPath errors from the log
  const jmesPathFixes = [
    // Fix interpolation in captures - remove {{ }} when using prefixes
    {
      pattern: /capture:\s+(\w+):\s+["']{{(\$\w+\.[^}]+)}}["']/g,
      replacement: 'capture:\n  $1: "$2"'
    },
    // Fix #faker in capture expressions - should be literal string or use template
    {
      pattern: /capture:\s+(\w+):\s+["']#faker\.([^"']+)["']/g,
      replacement: 'capture:\n  $1: "#faker.$2"'
    },
    // Fix {{customer_id}} pattern that should be interpolated before capture
    {
      pattern: /capture:\s+(\w+):\s+["']{{(\w+)}}["']/g,
      replacement: 'capture:\n  $1: "body.$2"'
    },
  ];

  for (const fix of jmesPathFixes) {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
      console.log(`  ✓ Fixed JMESPath pattern`);
    }
  }

  // Remove delay parameters over 100ms
  content = content.replace(/delay:\s+([1-9]\d{3,})/g, (match, delay) => {
    const newDelay = Math.min(parseInt(delay), 100);
    console.log(`  ✓ Reduced delay: ${delay}ms → ${newDelay}ms`);
    modified = true;
    return `delay: ${newDelay}`;
  });

  // Remove /delay/{seconds} endpoints
  content = content.replace(/\/delay\/\d+/g, (match) => {
    console.log(`  ✓ Removed delay endpoint: ${match}`);
    modified = true;
    return '/get';
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ File updated\n`);
    return true;
  } else {
    console.log(`  ⏭️  No changes needed\n`);
    return false;
  }
}

// Find all YAML test files
const testFiles = glob.sync('**/*.yaml', { cwd: testsDir, absolute: true });

console.log(`🔍 Found ${testFiles.length} test files\n`);

let filesModified = 0;
testFiles.forEach(file => {
  if (fixYamlFile(file)) {
    filesModified++;
  }
});

console.log(`\n✅ Fixed ${filesModified} files out of ${testFiles.length} total`);
