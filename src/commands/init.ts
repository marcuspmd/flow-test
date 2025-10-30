/**
 * @fileoverview Init command handler
 * Scaffolds a new Flow Test project with templates and configuration
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface TemplateOption {
  name: string;
  category: string;
  description: string;
  filename: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    name: "Simple GET Request",
    category: "basic",
    description: "Basic GET request with assertions",
    filename: "simple-get.yaml",
  },
  {
    name: "Simple POST Request",
    category: "basic",
    description: "POST request with JSON body",
    filename: "simple-post.yaml",
  },
  {
    name: "Simple Authentication",
    category: "basic",
    description: "Login flow with token capture",
    filename: "simple-auth.yaml",
  },
  {
    name: "Variable Examples",
    category: "basic",
    description: "Variable interpolation and dynamic data",
    filename: "simple-variables.yaml",
  },
  {
    name: "CRUD Operations",
    category: "intermediate",
    description: "Complete Create, Read, Update, Delete flow",
    filename: "crud-operations.yaml",
  },
  {
    name: "Data Validation",
    category: "intermediate",
    description: "Comprehensive assertion examples",
    filename: "data-validation.yaml",
  },
  {
    name: "Conditional Logic",
    category: "advanced",
    description: "Conditions, scenarios, and branching",
    filename: "conditional-logic.yaml",
  },
  {
    name: "Setup/Teardown Pattern",
    category: "patterns",
    description: "Test lifecycle management",
    filename: "setup-teardown.yaml",
  },
];

const DEFAULT_CONFIG = `project_name: My Flow Test Project
test_directory: ./tests
globals:
  variables:
    api_base_url: http://localhost:3000
    default_timeout: 30000
  timeouts:
    default: 60000
    slow_tests: 120000
discovery:
  patterns:
    - '**/*.yaml'
    - '**/tests/**/*.yaml'
  exclude:
    - '**/node_modules/**'
    - '**/dist/**'
    - '**/results/**'
priorities:
  levels:
    - critical
    - high
    - medium
    - low
  required:
    - critical
    - high
  fail_fast_on_required: false
execution:
  mode: sequential
  max_parallel: 3
  timeout: 60000
  continue_on_failure: true
  retry_failed:
    enabled: true
    max_attempts: 2
    delay_ms: 2000
reporting:
  formats:
    - json
    - html
  output_dir: ./results
  aggregate: true
  include_performance_metrics: true
  include_variables_state: true
`;

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function interactiveInit(targetDir: string): Promise<void> {
  const rl = createInterface();

  console.log("\n🚀 Flow Test Engine - Interactive Initialization\n");

  // Ask for project name
  const projectName = await question(
    rl,
    "Project name (My Flow Test Project): "
  );

  // Ask if user wants to select a template
  const useTemplate = await question(
    rl,
    "\nWould you like to start with a template? (Y/n): "
  );

  let selectedTemplate: TemplateOption | null = null;

  if (!useTemplate || useTemplate.toLowerCase() !== "n") {
    console.log("\n📋 Available Templates:\n");

    // Group templates by category
    const categories = [...new Set(TEMPLATES.map((t) => t.category))];
    categories.forEach((category, idx) => {
      console.log(`\n${category.toUpperCase()}:`);
      const categoryTemplates = TEMPLATES.filter((t) => t.category === category);
      categoryTemplates.forEach((template, tidx) => {
        const globalIdx =
          TEMPLATES.findIndex((t) => t === template) + 1;
        console.log(
          `  ${globalIdx}. ${template.name} - ${template.description}`
        );
      });
    });

    const templateChoice = await question(
      rl,
      "\nSelect a template number (or press Enter to skip): "
    );

    if (templateChoice) {
      const idx = parseInt(templateChoice, 10) - 1;
      if (idx >= 0 && idx < TEMPLATES.length) {
        selectedTemplate = TEMPLATES[idx];
      }
    }
  }

  rl.close();

  // Create directory structure
  const testsDir = path.join(targetDir, "tests");
  const resultsDir = path.join(targetDir, "results");

  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Create config file
  let config = DEFAULT_CONFIG;
  if (projectName) {
    config = config.replace("My Flow Test Project", projectName.trim());
  }

  const configPath = path.join(targetDir, "flow-test.config.yml");
  fs.writeFileSync(configPath, config);
  console.log(`\n✅ Created configuration: ${configPath}`);

  // Copy template if selected
  if (selectedTemplate) {
    const examplesDir = path.join(__dirname, "../../examples");
    const templatePath = path.join(
      examplesDir,
      selectedTemplate.category,
      selectedTemplate.filename
    );

    if (fs.existsSync(templatePath)) {
      const destPath = path.join(testsDir, selectedTemplate.filename);
      fs.copyFileSync(templatePath, destPath);
      console.log(`✅ Created test from template: ${destPath}`);
    } else {
      console.warn(
        `⚠️  Template file not found: ${templatePath}. Creating basic example instead.`
      );
      // Create a basic example if template not found
      createBasicExample(testsDir);
    }
  } else {
    // Create a basic getting started example
    createBasicExample(testsDir);
  }

  // Create .gitignore if it doesn't exist
  const gitignorePath = path.join(targetDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `# Flow Test Results
results/
*.log

# Environment variables
.env
.env.local

# Dependencies
node_modules/

# Build output
dist/
`;
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log(`✅ Created .gitignore`);
  }

  // Create README
  const readmePath = path.join(targetDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    const readmeContent = `# ${projectName || "Flow Test Project"}

This project uses [Flow Test Engine](https://github.com/marcuspmd/flow-test) for API testing.

## Quick Start

\`\`\`bash
# Run all tests
npx flow-test-engine

# Run with verbose output
npx flow-test-engine --verbose

# Run specific test
npx flow-test-engine tests/my-test.yaml

# Generate HTML report
npx flow-test-engine --html-output
\`\`\`

## Directory Structure

- \`tests/\` - Your test YAML files
- \`results/\` - Test execution results and reports
- \`flow-test.config.yml\` - Engine configuration

## Documentation

- [Examples](https://github.com/marcuspmd/flow-test/tree/main/examples)
- [Getting Started Guide](https://github.com/marcuspmd/flow-test/blob/main/guides/1.getting-started.md)
- [YAML Syntax Reference](https://github.com/marcuspmd/flow-test/blob/main/guides/4.yaml-syntax-reference.md)

## Next Steps

1. Edit the test file in \`tests/\`
2. Update \`base_url\` to point to your API
3. Customize assertions to match your API responses
4. Run the tests with \`npx flow-test-engine\`
`;
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ Created README.md`);
  }

  console.log("\n🎉 Flow Test project initialized successfully!\n");
  console.log("Next steps:");
  console.log(`  1. cd ${targetDir === "." ? "into your project" : targetDir}`);
  console.log("  2. Edit tests/*.yaml to match your API");
  console.log("  3. Run: npx flow-test-engine\n");
}

function createBasicExample(testsDir: string): void {
  const basicExample = `# Getting Started with Flow Test
# This is a simple example to help you get started

suite_name: "My First API Test"
node_id: "first-test"
description: "A simple GET request example"

# Replace with your API URL
base_url: "https://httpbin.org"

metadata:
  priority: "high"
  tags: ["example", "getting-started"]

steps:
  - name: "Test API health"
    request:
      method: "GET"
      url: "/get"
      headers:
        Accept: "application/json"

    assert:
      status_code: 200
      headers:
        content-type:
          contains: "application/json"

# Next steps:
# 1. Change base_url to your API endpoint
# 2. Update the URL path
# 3. Customize assertions to match your API
# 4. Add more steps as needed
#
# See examples at: https://github.com/marcuspmd/flow-test/tree/main/examples
`;

  const examplePath = path.join(testsDir, "getting-started.yaml");
  fs.writeFileSync(examplePath, basicExample);
  console.log(`✅ Created example test: ${examplePath}`);
}

/**
 * Handles the init command
 * @param args - Command arguments
 */
export async function handleInitCommand(args: string[]): Promise<void> {
  const targetDir = args[0] || ".";

  // Check if directory already has config
  const configPath = path.join(targetDir, "flow-test.config.yml");
  if (fs.existsSync(configPath)) {
    console.error(
      `❌ Configuration file already exists: ${configPath}`
    );
    console.error("   Remove it first or use a different directory.");
    process.exit(1);
  }

  try {
    await interactiveInit(targetDir);
  } catch (error) {
    console.error("❌ Failed to initialize project:", error);
    process.exit(1);
  }
}
