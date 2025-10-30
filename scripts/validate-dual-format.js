#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Dual-Format Test Validator
 *
 * Validates that YAML and JSON versions of the same test produce identical results.
 * Tolerates expected differences (node_id, timestamps, UUIDs, dynamic faker data).
 *
 * Usage:
 *   node validate-dual-format.js                    # Validate all pairs
 *   node validate-dual-format.js examples/basic     # Validate specific directory
 *   node validate-dual-format.js --verbose          # Show detailed comparison
 */
class DualFormatValidator {
    constructor(options = {}) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.resultsDir = path.join(this.projectRoot, 'results');
        this.verbose = options.verbose || false;
        this.tolerance = options.tolerance || 'normal'; // strict, normal, relaxed

        this.pairs = [];
        this.validations = [];
        this.errors = [];
    }

    /**
     * Discover paired YAML/JSON test files
     */
    discoverPairs(searchPath = null) {
        console.log('🔍 Discovering dual-format test pairs...\n');

        const fg = require('fast-glob');
        const basePath = searchPath || path.join(this.projectRoot, 'examples');

        // Find all YAML files
        const yamlFiles = fg.sync('**/*.yaml', {
            cwd: basePath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/results/**']
        });

        // Find matching JSON files
        yamlFiles.forEach(yamlFile => {
            const jsonFile = yamlFile.replace(/\.yaml$/, '.json');

            if (fs.existsSync(jsonFile)) {
                this.pairs.push({
                    yaml: yamlFile,
                    json: jsonFile,
                    name: path.basename(yamlFile, '.yaml')
                });
            }
        });

        console.log(`   Found ${this.pairs.length} dual-format pairs\n`);

        if (this.pairs.length === 0) {
            console.log('   ⚠️  No paired YAML/JSON files found');
            console.log('   💡 Use yaml-json-converter.js to create pairs\n');
        }

        return this.pairs;
    }

    /**
     * Run tests and collect results
     */
    async runTests(files, formatTag) {
        console.log(`🧪 Running ${formatTag.toUpperCase()} tests...`);

        try {
            // Build project first
            execSync('npm run build', {
                stdio: 'pipe',
                cwd: this.projectRoot
            });

            // Run tests with tag filter
            const command = `node dist/cli.js --tag ${formatTag} --config flow-test.config.yml`;

            execSync(command, {
                stdio: this.verbose ? 'inherit' : 'pipe',
                cwd: this.projectRoot,
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    FLOW_TEST_AUTO_INPUT: 'true'
                }
            });

            console.log(`   ✅ ${formatTag.toUpperCase()} tests completed\n`);

            // Find latest result file
            return this.findLatestResult();

        } catch (error) {
            console.error(`   ❌ ${formatTag.toUpperCase()} tests failed: ${error.message}\n`);
            throw error;
        }
    }

    /**
     * Find the latest result JSON file
     */
    findLatestResult() {
        const latestPath = path.join(this.resultsDir, 'latest.json');

        if (fs.existsSync(latestPath)) {
            return JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        }

        // Fallback: find most recent file
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.endsWith('.json') && f !== 'latest.json')
            .map(f => ({
                name: f,
                path: path.join(this.resultsDir, f),
                mtime: fs.statSync(path.join(this.resultsDir, f)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
            return JSON.parse(fs.readFileSync(files[0].path, 'utf8'));
        }

        throw new Error('No result files found');
    }

    /**
     * Normalize result data for comparison
     */
    normalizeResult(result) {
        return {
            success: result.success,
            total_tests: result.total_tests,
            passed_tests: result.passed_tests,
            failed_tests: result.failed_tests,
            skipped_tests: result.skipped_tests,
            // Normalize suite results
            suites: result.suites.map(suite => ({
                // Remove node_id (expected to differ)
                suite_name: suite.suite_name,
                success: suite.success,
                total_steps: suite.total_steps,
                successful_steps: suite.successful_steps,
                failed_steps: suite.failed_steps,
                skipped_steps: suite.skipped_steps,
                // Normalize steps
                steps: suite.steps.map(step => ({
                    name: step.name,
                    success: step.success,
                    // Normalize assertions (remove specific values)
                    total_assertions: step.assertions?.total || 0,
                    passed_assertions: step.assertions?.passed || 0,
                    failed_assertions: step.assertions?.failed || 0,
                    // Include captured variables count (not values)
                    captured_variables_count: Object.keys(step.captured_variables || {}).length
                }))
            }))
        };
    }

    /**
     * Compare two normalized results
     */
    compareResults(yamlResult, jsonResult, pairName) {
        const yamlNorm = this.normalizeResult(yamlResult);
        const jsonNorm = this.normalizeResult(jsonResult);

        const differences = [];

        // Compare top-level metrics
        if (yamlNorm.success !== jsonNorm.success) {
            differences.push({
                field: 'success',
                yaml: yamlNorm.success,
                json: jsonNorm.success,
                severity: 'critical'
            });
        }

        if (yamlNorm.total_tests !== jsonNorm.total_tests) {
            differences.push({
                field: 'total_tests',
                yaml: yamlNorm.total_tests,
                json: jsonNorm.total_tests,
                severity: 'high'
            });
        }

        if (yamlNorm.failed_tests !== jsonNorm.failed_tests) {
            differences.push({
                field: 'failed_tests',
                yaml: yamlNorm.failed_tests,
                json: jsonNorm.failed_tests,
                severity: 'critical'
            });
        }

        // Compare suite-level metrics
        yamlNorm.suites.forEach((yamlSuite, idx) => {
            const jsonSuite = jsonNorm.suites[idx];

            if (!jsonSuite) {
                differences.push({
                    field: `suites[${idx}]`,
                    yaml: 'exists',
                    json: 'missing',
                    severity: 'critical'
                });
                return;
            }

            if (yamlSuite.success !== jsonSuite.success) {
                differences.push({
                    field: `suites[${idx}].success`,
                    yaml: yamlSuite.success,
                    json: jsonSuite.success,
                    severity: 'critical'
                });
            }

            if (yamlSuite.failed_steps !== jsonSuite.failed_steps) {
                differences.push({
                    field: `suites[${idx}].failed_steps`,
                    yaml: yamlSuite.failed_steps,
                    json: jsonSuite.failed_steps,
                    severity: 'high'
                });
            }

            // Compare step-level metrics
            yamlSuite.steps.forEach((yamlStep, stepIdx) => {
                const jsonStep = jsonSuite.steps[stepIdx];

                if (!jsonStep) {
                    differences.push({
                        field: `suites[${idx}].steps[${stepIdx}]`,
                        yaml: yamlStep.name,
                        json: 'missing',
                        severity: 'critical'
                    });
                    return;
                }

                if (yamlStep.success !== jsonStep.success) {
                    differences.push({
                        field: `suites[${idx}].steps[${stepIdx}].success`,
                        yaml: yamlStep.success,
                        json: jsonStep.success,
                        severity: 'critical',
                        context: yamlStep.name
                    });
                }

                if (yamlStep.failed_assertions !== jsonStep.failed_assertions) {
                    differences.push({
                        field: `suites[${idx}].steps[${stepIdx}].failed_assertions`,
                        yaml: yamlStep.failed_assertions,
                        json: jsonStep.failed_assertions,
                        severity: 'high',
                        context: yamlStep.name
                    });
                }
            });
        });

        return {
            pairName,
            identical: differences.length === 0,
            differences,
            criticalDifferences: differences.filter(d => d.severity === 'critical').length,
            highDifferences: differences.filter(d => d.severity === 'high').length
        };
    }

    /**
     * Print validation results
     */
    printResults() {
        console.log('\n' + '═'.repeat(70));
        console.log('📊 DUAL-FORMAT VALIDATION RESULTS');
        console.log('═'.repeat(70) + '\n');

        const totalPairs = this.validations.length;
        const identicalPairs = this.validations.filter(v => v.identical).length;
        const differentPairs = totalPairs - identicalPairs;

        console.log(`Total pairs validated: ${totalPairs}`);
        console.log(`✅ Identical results:   ${identicalPairs}`);
        console.log(`❌ Different results:   ${differentPairs}\n`);

        if (differentPairs > 0) {
            console.log('═'.repeat(70));
            console.log('⚠️  DIFFERENCES FOUND\n');

            this.validations
                .filter(v => !v.identical)
                .forEach(validation => {
                    console.log(`📄 ${validation.pairName}`);
                    console.log(`   Critical differences: ${validation.criticalDifferences}`);
                    console.log(`   High-priority differences: ${validation.highDifferences}`);

                    if (this.verbose) {
                        console.log('   Details:');
                        validation.differences.forEach(diff => {
                            const contextStr = diff.context ? ` (${diff.context})` : '';
                            console.log(`      [${diff.severity.toUpperCase()}] ${diff.field}${contextStr}`);
                            console.log(`         YAML: ${JSON.stringify(diff.yaml)}`);
                            console.log(`         JSON: ${JSON.stringify(diff.json)}`);
                        });
                    }
                    console.log('');
                });

            console.log('💡 Use --verbose flag for detailed comparison\n');
        }

        console.log('═'.repeat(70) + '\n');

        return identicalPairs === totalPairs;
    }

    /**
     * Main validation workflow
     */
    async validate(searchPath = null) {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║        Flow Test Engine - Dual Format Validator               ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // Discover pairs
        this.discoverPairs(searchPath);

        if (this.pairs.length === 0) {
            return true; // No pairs to validate
        }

        try {
            // Run YAML tests
            const yamlResults = await this.runTests(this.pairs.map(p => p.yaml), 'yaml');

            // Run JSON tests
            const jsonResults = await this.runTests(this.pairs.map(p => p.json), 'json');

            // Compare results for each pair
            console.log('🔍 Comparing results...\n');

            this.pairs.forEach(pair => {
                const yamlSuiteResult = yamlResults.suites.find(s =>
                    s.file_path.includes(pair.name + '.yaml')
                );
                const jsonSuiteResult = jsonResults.suites.find(s =>
                    s.file_path.includes(pair.name + '.json')
                );

                if (yamlSuiteResult && jsonSuiteResult) {
                    const comparison = this.compareResults(
                        { suites: [yamlSuiteResult], ...yamlResults },
                        { suites: [jsonSuiteResult], ...jsonResults },
                        pair.name
                    );

                    this.validations.push(comparison);

                    if (comparison.identical) {
                        console.log(`   ✅ ${pair.name}: Identical results`);
                    } else {
                        console.log(`   ❌ ${pair.name}: ${comparison.differences.length} differences found`);
                    }
                } else {
                    console.log(`   ⚠️  ${pair.name}: Missing results`);
                }
            });

            console.log('');

            // Print summary
            const allIdentical = this.printResults();

            return allIdentical;

        } catch (error) {
            console.error(`\n❌ Validation failed: ${error.message}\n`);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        searchPath: args.find(arg => !arg.startsWith('--')) || null
    };

    const validator = new DualFormatValidator(options);

    validator.validate(options.searchPath)
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Validation error:', error.message);
            process.exit(1);
        });
}

module.exports = DualFormatValidator;
