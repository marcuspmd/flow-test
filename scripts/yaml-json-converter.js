#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Bidirectional YAML ↔ JSON Converter for Flow Test Engine
 *
 * Features:
 * - Converts YAML to JSON and vice versa
 * - Automatically adjusts node_id with format suffixes (-yaml, -json)
 * - Adds format tags to metadata
 * - Preserves priorities and all metadata
 * - Handles both single files and batch conversion
 */
class YamlJsonConverter {
    constructor() {
        this.processedFiles = [];
        this.errors = [];
    }

    /**
     * Detect source format from file extension
     */
    detectFormat(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.yaml' || ext === '.yml') return 'yaml';
        if (ext === '.json') return 'json';
        return null;
    }

    /**
     * Read and parse file content
     */
    readFile(filePath) {
        const format = this.detectFormat(filePath);
        if (!format) {
            throw new Error(`Unsupported file format: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');

        if (format === 'yaml') {
            return { data: yaml.load(content), sourceFormat: 'yaml' };
        } else {
            return { data: JSON.parse(content), sourceFormat: 'json' };
        }
    }

    /**
     * Adjust node_id with format suffix
     */
    adjustNodeId(nodeId, targetFormat, sourceFormat) {
        if (!nodeId) return nodeId;

        // Remove existing format suffix if present
        const cleanId = nodeId
            .replace(/-yaml$/i, '')
            .replace(/-json$/i, '');

        // Add target format suffix
        return `${cleanId}-${targetFormat}`;
    }

    /**
     * Update metadata tags with format tag
     */
    updateMetadataTags(metadata, targetFormat) {
        if (!metadata) {
            return {
                tags: [targetFormat]
            };
        }

        const tags = metadata.tags || [];

        // Remove existing format tags
        const cleanTags = tags.filter(tag =>
            tag !== 'yaml' && tag !== 'json'
        );

        // Add target format tag
        return {
            ...metadata,
            tags: [...cleanTags, targetFormat]
        };
    }

    /**
     * Transform test suite data for target format
     */
    transformData(data, targetFormat, sourceFormat) {
        const transformed = { ...data };

        // Adjust node_id
        if (transformed.node_id) {
            transformed.node_id = this.adjustNodeId(
                transformed.node_id,
                targetFormat,
                sourceFormat
            );
        }

        // Update metadata tags
        transformed.metadata = this.updateMetadataTags(
            transformed.metadata,
            targetFormat
        );

        return transformed;
    }

    /**
     * Convert YAML file to JSON
     */
    yamlToJson(yamlFilePath, outputPath = null) {
        console.log(`📄 Converting YAML → JSON: ${path.basename(yamlFilePath)}`);

        try {
            const { data, sourceFormat } = this.readFile(yamlFilePath);

            // Transform data
            const transformed = this.transformData(data, 'json', sourceFormat);

            // Determine output path
            const jsonPath = outputPath || yamlFilePath.replace(/\.ya?ml$/, '.json');

            // Write JSON file
            fs.writeFileSync(
                jsonPath,
                JSON.stringify(transformed, null, 2),
                'utf8'
            );

            this.processedFiles.push({
                source: yamlFilePath,
                target: jsonPath,
                direction: 'YAML → JSON'
            });

            console.log(`   ✅ Created: ${path.basename(jsonPath)}`);
            return jsonPath;

        } catch (error) {
            const errorMsg = `Failed to convert ${yamlFilePath}: ${error.message}`;
            console.error(`   ❌ ${errorMsg}`);
            this.errors.push(errorMsg);
            return null;
        }
    }

    /**
     * Convert JSON file to YAML
     */
    jsonToYaml(jsonFilePath, outputPath = null) {
        console.log(`📄 Converting JSON → YAML: ${path.basename(jsonFilePath)}`);

        try {
            const { data, sourceFormat } = this.readFile(jsonFilePath);

            // Transform data
            const transformed = this.transformData(data, 'yaml', sourceFormat);

            // Determine output path
            const yamlPath = outputPath || jsonFilePath.replace(/\.json$/, '.yaml');

            // Write YAML file
            fs.writeFileSync(
                yamlPath,
                yaml.dump(transformed, {
                    indent: 2,
                    lineWidth: 120,
                    noRefs: true,
                    sortKeys: false
                }),
                'utf8'
            );

            this.processedFiles.push({
                source: jsonFilePath,
                target: yamlPath,
                direction: 'JSON → YAML'
            });

            console.log(`   ✅ Created: ${path.basename(yamlPath)}`);
            return yamlPath;

        } catch (error) {
            const errorMsg = `Failed to convert ${jsonFilePath}: ${error.message}`;
            console.error(`   ❌ ${errorMsg}`);
            this.errors.push(errorMsg);
            return null;
        }
    }

    /**
     * Convert file (auto-detect direction)
     */
    convert(filePath, outputPath = null) {
        const format = this.detectFormat(filePath);

        if (format === 'yaml') {
            return this.yamlToJson(filePath, outputPath);
        } else if (format === 'json') {
            return this.jsonToYaml(filePath, outputPath);
        } else {
            throw new Error(`Cannot convert file: ${filePath}`);
        }
    }

    /**
     * Batch convert files in a directory
     */
    convertDirectory(dirPath, pattern = '**/*.yaml', targetFormat = 'json') {
        console.log(`\n📁 Batch converting directory: ${dirPath}`);
        console.log(`   Pattern: ${pattern}`);
        console.log(`   Target format: ${targetFormat}\n`);

        const fg = require('fast-glob');
        const files = fg.sync(pattern, {
            cwd: dirPath,
            absolute: true
        });

        console.log(`Found ${files.length} files to convert\n`);

        files.forEach(file => {
            if (targetFormat === 'json' && this.detectFormat(file) === 'yaml') {
                this.yamlToJson(file);
            } else if (targetFormat === 'yaml' && this.detectFormat(file) === 'json') {
                this.jsonToYaml(file);
            }
        });

        this.printSummary();
    }

    /**
     * Print conversion summary
     */
    printSummary() {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 CONVERSION SUMMARY');
        console.log('═'.repeat(60));

        console.log(`\n✅ Successfully converted: ${this.processedFiles.length} files`);

        if (this.processedFiles.length > 0) {
            this.processedFiles.forEach(({ source, target, direction }) => {
                console.log(`   ${direction}: ${path.basename(source)} → ${path.basename(target)}`);
            });
        }

        if (this.errors.length > 0) {
            console.log(`\n❌ Errors: ${this.errors.length}`);
            this.errors.forEach(error => {
                console.log(`   ${error}`);
            });
        }

        console.log('\n' + '═'.repeat(60) + '\n');
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Flow Test Engine - YAML ↔ JSON Converter              ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  node yaml-json-converter.js <file>                 # Convert single file
  node yaml-json-converter.js <file> <output>        # Convert to specific path
  node yaml-json-converter.js --batch <dir>          # Batch convert directory
  node yaml-json-converter.js --batch <dir> --to json  # Batch with target format

Examples:
  # Convert YAML to JSON (auto-detect)
  node yaml-json-converter.js examples/basic/simple-get.yaml

  # Convert JSON to YAML (auto-detect)
  node yaml-json-converter.js examples/basic/simple-get.json

  # Batch convert all YAML files in directory to JSON
  node yaml-json-converter.js --batch examples/basic

  # Batch convert with custom pattern
  node yaml-json-converter.js --batch examples --pattern "intermediate/*.yaml"

Features:
  ✓ Bidirectional conversion (YAML ↔ JSON)
  ✓ Auto-adjusts node_id with format suffixes
  ✓ Adds format tags to metadata
  ✓ Preserves all metadata and priorities
  ✓ Batch processing support
        `);
        process.exit(0);
    }

    const converter = new YamlJsonConverter();

    try {
        if (args[0] === '--batch') {
            const dirPath = args[1] || '.';
            const patternIndex = args.indexOf('--pattern');
            const toIndex = args.indexOf('--to');

            const pattern = patternIndex !== -1 ? args[patternIndex + 1] : '**/*.yaml';
            const targetFormat = toIndex !== -1 ? args[toIndex + 1] : 'json';

            converter.convertDirectory(dirPath, pattern, targetFormat);
        } else {
            const inputFile = args[0];
            const outputFile = args[1] || null;

            converter.convert(inputFile, outputFile);
            converter.printSummary();
        }

        // Exit with error code if any errors occurred
        if (converter.errors.length > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error(`\n❌ Fatal error: ${error.message}\n`);
        process.exit(1);
    }
}

module.exports = YamlJsonConverter;
