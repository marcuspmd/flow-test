import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as yaml from 'js-yaml';

interface ConfigTemplate {
  project_name: string;
  test_directory: string;
  globals: {
    variables: Record<string, any>;
    timeouts: {
      default: number;
      slow_tests: number;
    };
  };
  discovery: {
    patterns: string[];
    exclude: string[];
  };
  priorities: {
    levels: string[];
    required: string[];
    fail_fast_on_required: boolean;
  };
  execution: {
    mode: 'sequential' | 'parallel';
    max_parallel: number;
    timeout: number;
    continue_on_failure: boolean;
    retry_failed: {
      enabled: boolean;
      max_attempts: number;
      delay_ms: number;
    };
  };
  reporting: {
    formats: string[];
    output_dir: string;
    aggregate: boolean;
    include_performance_metrics: boolean;
    include_variables_state: boolean;
  };
}

interface InitOptions {
  interactive?: boolean;
  template?: string;
  output?: string;
  force?: boolean;
}

export class ConfigInitializer {
  private rl: readline.Interface;
  private config: ConfigTemplate;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.config = this.getDefaultConfig();
  }

  /**
   * Get default configuration template
   */
  private getDefaultConfig(): ConfigTemplate {
    return {
      project_name: "My API Test Project",
      test_directory: "./tests",
      globals: {
        variables: {
          api_base_url: "http://localhost:3000",
          default_timeout: 30000
        },
        timeouts: {
          default: 60000,
          slow_tests: 120000
        }
      },
      discovery: {
        patterns: [
          "**/*.yaml",
          "**/tests/**/*.yaml"
        ],
        exclude: [
          "**/temp/**",
          "**/node_modules/**",
          "**/results/**"
        ]
      },
      priorities: {
        levels: ["critical", "high", "medium", "low"],
        required: ["critical", "high"],
        fail_fast_on_required: false
      },
      execution: {
        mode: "sequential",
        max_parallel: 3,
        timeout: 60000,
        continue_on_failure: true,
        retry_failed: {
          enabled: true,
          max_attempts: 2,
          delay_ms: 2000
        }
      },
      reporting: {
        formats: ["html", "json"],
        output_dir: "./results",
        aggregate: true,
        include_performance_metrics: true,
        include_variables_state: true
      }
    };
  }

  /**
   * Ask a question and return the answer
   */
  private async ask(question: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
      const prompt = defaultValue
        ? `${question} (${defaultValue}): `
        : `${question}: `;

      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue || '');
      });
    });
  }

  /**
   * Ask a yes/no question
   */
  private async askBoolean(question: string, defaultValue: boolean = false): Promise<boolean> {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    const answer = await this.ask(`${question} (${defaultStr})`);

    if (!answer) return defaultValue;

    return answer.toLowerCase().startsWith('y');
  }

  /**
   * Ask for multiple choice selection
   */
  private async askChoice(question: string, choices: string[], defaultIndex: number = 0): Promise<string> {
    console.log(`\n${question}`);
    choices.forEach((choice, index) => {
      const marker = index === defaultIndex ? '→' : ' ';
      console.log(`${marker} ${index + 1}. ${choice}`);
    });

    const answer = await this.ask(`Enter choice (1-${choices.length})`, (defaultIndex + 1).toString());
    const choiceIndex = parseInt(answer) - 1;

    if (choiceIndex >= 0 && choiceIndex < choices.length) {
      return choices[choiceIndex];
    }

    return choices[defaultIndex];
  }

  /**
   * Interactive configuration setup
   */
  async runInteractiveSetup(): Promise<void> {
    console.log('🚀 Flow Test Engine Configuration Setup');
    console.log('=====================================\n');

    // Project Information
    console.log('📋 Project Information');
    console.log('----------------------');

    this.config.project_name = await this.ask(
      'Project name',
      this.config.project_name
    );

    this.config.test_directory = await this.ask(
      'Test directory',
      this.config.test_directory
    );

    // API Configuration
    console.log('\n🌐 API Configuration');
    console.log('--------------------');

    const apiUrl = await this.ask(
      'API base URL',
      this.config.globals.variables.api_base_url as string
    );
    this.config.globals.variables.api_base_url = apiUrl;

    const addMoreVariables = await this.askBoolean('Add additional global variables?');
    if (addMoreVariables) {
      await this.setupAdditionalVariables();
    }

    // Execution Configuration
    console.log('\n⚙️  Execution Configuration');
    console.log('---------------------------');

    const executionMode = await this.askChoice(
      'Execution mode:',
      ['sequential', 'parallel'],
      this.config.execution.mode === 'parallel' ? 1 : 0
    );
    this.config.execution.mode = executionMode as 'sequential' | 'parallel';

    if (this.config.execution.mode === 'parallel') {
      const maxParallel = await this.ask(
        'Maximum parallel executions',
        this.config.execution.max_parallel.toString()
      );
      this.config.execution.max_parallel = parseInt(maxParallel) || 3;
    }

    this.config.execution.continue_on_failure = await this.askBoolean(
      'Continue execution on test failure?',
      this.config.execution.continue_on_failure
    );

    // Retry Configuration
    console.log('\n🔄 Retry Configuration');
    console.log('----------------------');

    this.config.execution.retry_failed.enabled = await this.askBoolean(
      'Enable automatic retry on failure?',
      this.config.execution.retry_failed.enabled
    );

    if (this.config.execution.retry_failed.enabled) {
      const maxAttempts = await this.ask(
        'Maximum retry attempts',
        this.config.execution.retry_failed.max_attempts.toString()
      );
      this.config.execution.retry_failed.max_attempts = parseInt(maxAttempts) || 2;

      const delayMs = await this.ask(
        'Delay between retries (milliseconds)',
        this.config.execution.retry_failed.delay_ms.toString()
      );
      this.config.execution.retry_failed.delay_ms = parseInt(delayMs) || 2000;
    }

    // Priority Configuration
    console.log('\n📊 Priority Configuration');
    console.log('-------------------------');

    const setupPriorities = await this.askBoolean('Configure custom test priorities?');
    if (setupPriorities) {
      await this.setupPriorities();
    }

    // Reporting Configuration
    console.log('\n📝 Reporting Configuration');
    console.log('---------------------------');

    const reportFormats = await this.askChoice(
      'Report formats:',
      ['HTML only', 'JSON only', 'Both HTML and JSON'],
      2
    );

    switch (reportFormats) {
      case 'HTML only':
        this.config.reporting.formats = ['html'];
        break;
      case 'JSON only':
        this.config.reporting.formats = ['json'];
        break;
      default:
        this.config.reporting.formats = ['html', 'json'];
    }

    this.config.reporting.output_dir = await this.ask(
      'Reports output directory',
      this.config.reporting.output_dir
    );

    this.config.reporting.include_performance_metrics = await this.askBoolean(
      'Include performance metrics in reports?',
      this.config.reporting.include_performance_metrics
    );

    // Test Discovery
    console.log('\n🔍 Test Discovery Configuration');
    console.log('-------------------------------');

    const setupDiscovery = await this.askBoolean('Configure custom test discovery patterns?');
    if (setupDiscovery) {
      await this.setupDiscovery();
    }

    console.log('\n✅ Configuration setup complete!');
  }

  /**
   * Setup additional global variables
   */
  private async setupAdditionalVariables(): Promise<void> {
    const variables: Record<string, any> = { ...this.config.globals.variables };

    while (true) {
      const varName = await this.ask('\nVariable name (or press Enter to finish)');
      if (!varName) break;

      const varValue = await this.ask(`Value for "${varName}"`);

      // Try to parse as number or boolean
      let parsedValue: any = varValue;
      if (varValue.toLowerCase() === 'true') parsedValue = true;
      else if (varValue.toLowerCase() === 'false') parsedValue = false;
      else if (!isNaN(Number(varValue)) && varValue !== '') parsedValue = Number(varValue);

      variables[varName] = parsedValue;
      console.log(`✅ Added: ${varName} = ${JSON.stringify(parsedValue)}`);
    }

    this.config.globals.variables = variables;
  }

  /**
   * Setup priority configuration
   */
  private async setupPriorities(): Promise<void> {
    console.log('\nCurrent priority levels:', this.config.priorities.levels.join(', '));

    const customLevels = await this.ask(
      'Enter priority levels (comma-separated)',
      this.config.priorities.levels.join(', ')
    );

    this.config.priorities.levels = customLevels.split(',').map(level => level.trim());

    const requiredLevels = await this.ask(
      'Required priority levels (comma-separated)',
      this.config.priorities.required.join(', ')
    );

    this.config.priorities.required = requiredLevels.split(',').map(level => level.trim());

    this.config.priorities.fail_fast_on_required = await this.askBoolean(
      'Fail fast when required priority tests fail?',
      this.config.priorities.fail_fast_on_required
    );
  }

  /**
   * Setup test discovery patterns
   */
  private async setupDiscovery(): Promise<void> {
    console.log('\nCurrent include patterns:');
    this.config.discovery.patterns.forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern}`);
    });

    const addPatterns = await this.askBoolean('Add additional include patterns?');
    if (addPatterns) {
      const patterns = [...this.config.discovery.patterns];

      while (true) {
        const pattern = await this.ask('\nInclude pattern (or press Enter to finish)');
        if (!pattern) break;

        patterns.push(pattern);
        console.log(`✅ Added include pattern: ${pattern}`);
      }

      this.config.discovery.patterns = patterns;
    }

    const addExcludes = await this.askBoolean('Add additional exclude patterns?');
    if (addExcludes) {
      const excludes = [...this.config.discovery.exclude];

      while (true) {
        const pattern = await this.ask('\nExclude pattern (or press Enter to finish)');
        if (!pattern) break;

        excludes.push(pattern);
        console.log(`✅ Added exclude pattern: ${pattern}`);
      }

      this.config.discovery.exclude = excludes;
    }
  }

  /**
   * Generate configuration from template
   */
  async generateFromTemplate(templateName: string): Promise<void> {
    const templates = this.getTemplates();

    if (!templates[templateName]) {
      console.error(`❌ Template "${templateName}" not found.`);
      console.log('Available templates:', Object.keys(templates).join(', '));
      return;
    }

    this.config = { ...this.config, ...templates[templateName] };
    console.log(`✅ Configuration generated from template: ${templateName}`);
  }

  /**
   * Get predefined templates
   */
  private getTemplates(): Record<string, Partial<ConfigTemplate>> {
    return {
      basic: {
        project_name: "Basic API Tests",
        execution: {
          mode: "sequential",
          max_parallel: 1,
          timeout: 30000,
          continue_on_failure: true,
          retry_failed: {
            enabled: false,
            max_attempts: 1,
            delay_ms: 1000
          }
        }
      },

      performance: {
        project_name: "Performance API Tests",
        execution: {
          mode: "parallel",
          max_parallel: 10,
          timeout: 30000,
          continue_on_failure: false,
          retry_failed: {
            enabled: false,
            max_attempts: 1,
            delay_ms: 500
          }
        },
        reporting: {
          formats: ["json"],
          output_dir: "./results",
          aggregate: true,
          include_performance_metrics: true,
          include_variables_state: false
        }
      },

      ci_cd: {
        project_name: "CI/CD API Tests",
        execution: {
          mode: "parallel",
          max_parallel: 5,
          timeout: 60000,
          continue_on_failure: false,
          retry_failed: {
            enabled: true,
            max_attempts: 2,
            delay_ms: 1000
          }
        },
        priorities: {
          levels: ["critical", "high", "medium", "low"],
          required: ["critical"],
          fail_fast_on_required: true
        },
        reporting: {
          formats: ["html", "json", "junit"],
          output_dir: "./test-results",
          aggregate: true,
          include_performance_metrics: true,
          include_variables_state: true
        }
      },

      comprehensive: {
        project_name: "Comprehensive API Test Suite",
        discovery: {
          patterns: [
            "**/*.yaml",
            "**/tests/**/*.yaml",
            "**/integration/**/*.yaml",
            "**/e2e/**/*.yaml"
          ],
          exclude: [
            "**/temp/**",
            "**/node_modules/**",
            "**/results/**",
            "**/dist/**",
            "**/backup/**"
          ]
        },
        execution: {
          mode: "parallel",
          max_parallel: 3,
          timeout: 120000,
          continue_on_failure: true,
          retry_failed: {
            enabled: true,
            max_attempts: 3,
            delay_ms: 2000
          }
        },
        priorities: {
          levels: ["critical", "high", "medium", "low", "experimental"],
          required: ["critical", "high"],
          fail_fast_on_required: false
        }
      }
    };
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration(outputPath: string, force: boolean = false): Promise<void> {
    const configPath = path.resolve(outputPath);

    // Check if file exists
    if (fs.existsSync(configPath) && !force) {
      const overwrite = await this.askBoolean(
        `Configuration file "${configPath}" already exists. Overwrite?`
      );

      if (!overwrite) {
        console.log('❌ Configuration not saved.');
        return;
      }
    }

    try {
      // Generate YAML with comments
      const yamlContent = this.generateYamlWithComments();

      // Ensure directory exists
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(configPath, yamlContent, 'utf8');
      console.log(`✅ Configuration saved to: ${configPath}`);

      // Show next steps
      this.showNextSteps(configPath);

    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
    }
  }

  /**
   * Generate YAML content with helpful comments
   */
  private generateYamlWithComments(): string {
    const yaml_content = `# Flow Test Engine Configuration
# Generated by: flow-test init
# Created: ${new Date().toISOString()}

# Project Information
project_name: "${this.config.project_name}"
test_directory: "${this.config.test_directory}"

# Global variables and settings
globals:
  variables:
${Object.entries(this.config.globals.variables).map(([key, value]) =>
  `    ${key}: ${typeof value === 'string' ? `"${value}"` : value}`
).join('\n')}

  # Timeout settings for different test types
  timeouts:
    default: ${this.config.globals.timeouts.default}
    slow_tests: ${this.config.globals.timeouts.slow_tests}

# Test discovery configuration
discovery:
  patterns:
${this.config.discovery.patterns.map(pattern => `    - "${pattern}"`).join('\n')}
  exclude:
${this.config.discovery.exclude.map(pattern => `    - "${pattern}"`).join('\n')}

# Priority system settings
priorities:
  levels: [${this.config.priorities.levels.map(level => `"${level}"`).join(', ')}]
  required: [${this.config.priorities.required.map(level => `"${level}"`).join(', ')}]
  fail_fast_on_required: ${this.config.priorities.fail_fast_on_required}

# Execution behavior
execution:
  mode: "${this.config.execution.mode}"  # "sequential" or "parallel"
  max_parallel: ${this.config.execution.max_parallel}
  timeout: ${this.config.execution.timeout}
  continue_on_failure: ${this.config.execution.continue_on_failure}
  retry_failed:
    enabled: ${this.config.execution.retry_failed.enabled}
    max_attempts: ${this.config.execution.retry_failed.max_attempts}
    delay_ms: ${this.config.execution.retry_failed.delay_ms}

# Reporting settings
reporting:
  formats: [${this.config.reporting.formats.map(format => `"${format}"`).join(', ')}]
  output_dir: "${this.config.reporting.output_dir}"
  aggregate: ${this.config.reporting.aggregate}
  include_performance_metrics: ${this.config.reporting.include_performance_metrics}
  include_variables_state: ${this.config.reporting.include_variables_state}
`;

    return yaml_content;
  }

  /**
   * Show helpful next steps
   */
  private showNextSteps(configPath: string): void {
    console.log('\n🎉 Configuration Setup Complete!');
    console.log('================================\n');

    console.log('📋 Next Steps:');
    console.log(`1. Review your configuration: cat ${configPath}`);
    console.log('2. Create your first test file in the test directory');
    console.log('3. Run tests: npm test');
    console.log('4. Generate reports: npm run report:html');

    console.log('\n🚀 Quick Start Commands:');
    console.log(`flow-test --config ${configPath}`);
    console.log(`flow-test --config ${configPath} --dry-run`);
    console.log(`flow-test --config ${configPath} --verbose`);

    console.log('\n📚 Documentation:');
    console.log('- Configuration Guide: ./guides/configuration-guide.md');
    console.log('- YAML Syntax Reference: ./guides/yaml-syntax-reference.md');
    console.log('- Getting Started: ./guides/getting-started.md');
  }

  /**
   * List available templates
   */
  listTemplates(): void {
    const templates = this.getTemplates();

    console.log('📋 Available Configuration Templates:');
    console.log('=====================================\n');

    Object.entries(templates).forEach(([name, template]) => {
      console.log(`🔧 ${name}`);
      console.log(`   Project: ${template.project_name || 'Default'}`);
      if (template.execution) {
        console.log(`   Mode: ${template.execution.mode || 'sequential'}`);
        console.log(`   Parallel: ${template.execution.max_parallel || 'N/A'}`);
      }
      console.log('');
    });

    console.log('Usage: flow-test init --template <template-name>');
  }

  /**
   * Cleanup resources
   */
  close(): void {
    this.rl.close();
  }

  /**
   * Main init command handler
   */
  async run(options: InitOptions): Promise<void> {
    try {
      const outputPath = options.output || 'flow-test.config.yml';

      if (options.template) {
        if (options.template === 'list') {
          this.listTemplates();
          return;
        }

        await this.generateFromTemplate(options.template);
      } else if (options.interactive !== false) {
        await this.runInteractiveSetup();
      }

      await this.saveConfiguration(outputPath, options.force);

    } finally {
      this.close();
    }
  }
}

/**
 * CLI handler for init command
 */
export async function handleInitCommand(args: string[]): Promise<void> {
  const options: InitOptions = {
    interactive: true,
    force: false
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--template':
      case '-t':
        options.template = args[++i];
        options.interactive = false;
        break;

      case '--output':
      case '-o':
        options.output = args[++i];
        break;

      case '--force':
      case '-f':
        options.force = true;
        break;

      case '--no-interactive':
        options.interactive = false;
        break;

      case '--help':
      case '-h':
        showInitHelp();
        return;
    }
  }

  const initializer = new ConfigInitializer();
  await initializer.run(options);
}

/**
 * Show help for init command
 */
function showInitHelp(): void {
  console.log(`
🚀 Flow Test Engine - Configuration Initializer

USAGE:
  flow-test init [options]

OPTIONS:
  -t, --template <name>     Use predefined template
  -o, --output <file>       Output file path (default: flow-test.config.yml)
  -f, --force              Overwrite existing file
  --no-interactive         Skip interactive setup
  -h, --help               Show this help

TEMPLATES:
  basic                    Basic sequential configuration
  performance              Optimized for performance testing
  ci_cd                    CI/CD pipeline configuration
  comprehensive            Full-featured configuration

EXAMPLES:
  flow-test init                           # Interactive setup
  flow-test init --template basic          # Use basic template
  flow-test init --template list           # List all templates
  flow-test init -t ci_cd -o ci.config.yml # CI config to custom file
  flow-test init --force                   # Overwrite existing config

After initialization, run:
  flow-test --config <your-config>.yml --dry-run
`);
}