#!/usr/bin/env node

/**
 * CLI do Flow Test Engine v2.0
 */

import { FlowTestEngine } from './core/engine';
import { EngineExecutionOptions } from './types/engine.types';

async function main() {
  const args = process.argv.slice(2);
  
  // Parsing dos argumentos
  const options: EngineExecutionOptions = {
    verbosity: 'simple'
  };
  
  let configFile: string | undefined;
  let showHelp = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-c':
      case '--config':
        if (i + 1 < args.length) {
          configFile = args[++i];
        }
        break;
        
      case '-d':
      case '--directory':
        if (i + 1 < args.length) {
          options.test_directory = args[++i];
        }
        break;
        
      case '-e':
      case '--environment':
        if (i + 1 < args.length) {
          options.environment = args[++i];
        }
        break;
        
      case '--verbose':
        options.verbosity = 'verbose';
        break;
        
      case '--detailed':
        options.verbosity = 'detailed';
        break;
        
      case '--simple':
        options.verbosity = 'simple';
        break;
        
      case '--silent':
        options.verbosity = 'silent';
        break;
        
      case '--priority':
        if (i + 1 < args.length) {
          const priorities = args[++i].split(',');
          options.filters = { ...options.filters, priority: priorities };
        }
        break;
        
      case '--suite':
        if (i + 1 < args.length) {
          const suites = args[++i].split(',');
          options.filters = { ...options.filters, suite_names: suites };
        }
        break;
        
      case '--dry-run':
        dryRun = true;
        break;
        
      case '-h':
      case '--help':
        showHelp = true;
        break;
        
      case '-v':
      case '--version':
        console.log('Flow Test Engine v2.0.0');
        process.exit(0);
        break;
        
      default:
        if (!arg.startsWith('-')) {
          // Assume que é um arquivo de configuração
          configFile = arg;
        } else {
          console.error(`❌ Unknown argument: ${arg}`);
          showHelp = true;
        }
        break;
    }
  }

  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  try {
    // Configura opções com arquivo de config se especificado
    const engineOptions = configFile ? { ...options, config_file: configFile } : options;
    
    // Cria o engine
    const engine = new FlowTestEngine(engineOptions, {
      onExecutionStart: (stats) => {
        if (options.verbosity !== 'silent') {
          console.log(`🚀 Starting execution of ${stats.tests_discovered} test(s)`);
        }
      },
      onTestDiscovered: (test) => {
        if (options.verbosity === 'verbose') {
          console.log(`📋 Discovered: ${test.suite_name} (${test.priority})`);
        }
      },
      onSuiteStart: (suite) => {
        if (options.verbosity === 'detailed' || options.verbosity === 'verbose') {
          console.log(`▶️  Starting: ${suite.suite_name}`);
        }
      },
      onSuiteEnd: (suite, result) => {
        if (options.verbosity === 'detailed' || options.verbosity === 'verbose') {
          const status = result.status === 'success' ? '✅' : '❌';
          console.log(`${status} Finished: ${suite.suite_name} (${result.duration_ms}ms)`);
        }
      },
      onError: (error) => {
        console.error(`💥 Engine error: ${error.message}`);
        if (options.verbosity === 'verbose') {
          console.error(error.stack);
        }
      }
    });

    if (dryRun) {
      // Execução em modo dry-run
      const plan = await engine.dryRun();
      
      console.log(`\n📊 Execution plan would run ${plan.length} test(s):`);
      plan.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.suite_name} (${test.priority || 'medium'})`);
      });
      
      process.exit(0);
    } else {
      // Execução normal
      const result = await engine.run();
      
      // Exit code baseado no resultado
      const exitCode = result.success_rate === 100 ? 0 : 1;
      
      if (options.verbosity !== 'silent') {
        console.log(`\n🏁 Execution completed with ${result.success_rate.toFixed(1)}% success rate`);
      }
      
      process.exit(exitCode);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    if (options.verbosity === 'verbose') {
      console.error((error as Error).stack);
    }
    
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🚀 Flow Test Engine v2.0.0

USAGE:
  flow-test [CONFIG_FILE] [OPTIONS]

ARGUMENTS:
  CONFIG_FILE              Path to configuration file (default: flow-test.config.yml)

OPTIONS:
  -c, --config <file>      Configuration file path
  -d, --directory <dir>    Test directory override
  -e, --environment <env>  Environment name for variable resolution
  
VERBOSITY:
  --verbose               Show detailed output including request/response data
  --detailed              Show detailed progress without full request/response
  --simple                Show basic progress (default)
  --silent                Silent execution, errors only

FILTERING:
  --priority <levels>     Run only tests with specified priorities (comma-separated)
                         Example: --priority critical,high
  --suite <names>         Run only specified test suites (comma-separated)
                         Example: --suite "login,checkout"

EXECUTION:
  --dry-run              Show execution plan without running tests

OTHER:
  -h, --help             Show this help message
  -v, --version          Show version information

EXAMPLES:
  flow-test                                    # Run with default config
  flow-test my-config.yml                      # Run with specific config
  flow-test --priority critical,high          # Run only critical and high priority tests
  flow-test --dry-run                         # Show what would be executed
  flow-test --directory ./api-tests --verbose # Run from specific directory with verbose output
  flow-test --environment staging --silent    # Run in staging environment silently

CONFIGURATION:
  The engine looks for configuration files in this order:
  1. Specified via --config or as argument
  2. flow-test.config.yml
  3. flow-test.config.yaml
  4. flow-test.yml
  5. flow-test.yaml

  For configuration file format and options, see documentation.
`);
}

// Tratamento de sinais para cleanup graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(143);
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Executa o CLI
main().catch(error => {
  console.error('💥 CLI execution failed:', error);
  process.exit(1);
});