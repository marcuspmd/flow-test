#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

function run(cmd, args, opts = {}) {
  console.log('> ' + [cmd].concat(args).join(' '));
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (res.error) {
    console.error('Failed to run', cmd, res.error);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`Command exited with code ${res.status}`);
    process.exit(res.status);
  }
}

// 1) build project (ensure .d.ts produced)
run('npm', ['run', 'build']);

// 2) run api-extractor (produces api-report and .api.json)
run('npx', ['@microsoft/api-extractor', 'run', '--config', 'api-extractor.json']);

// 3) run api-documenter to generate markdown from the extractor output (temp folder)
const docsOut = path.join(process.cwd(), 'docs', 'markdown');
// api-extractor writes a package API model to the temp folder (e.g. temp/*.api.json)
run('npx', ['@microsoft/api-documenter', 'markdown', '--input', 'temp', '--output', docsOut]);

console.log('📚 API docs generated at', docsOut);
