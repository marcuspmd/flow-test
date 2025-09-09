import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { Runner } from "./core/runner.core";
import { ExecutionOptions } from "./types/common.types";

// Ponto de entrada da aplicação
async function main() {
  const args = process.argv.slice(2);
  
  // Parsing básico dos argumentos
  let testFile = "./tests/start-flow.yaml";
  const options: ExecutionOptions = {
    verbosity: 'simple',
    format: 'json',
    continueOnFailure: false,
    timeout: 30000
  };
  
  let generateLog = true; // Por padrão, sempre gera log

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      switch (arg) {
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
        case '--continue':
          options.continueOnFailure = true;
          break;
        case '--no-log':
          generateLog = false;
          break;
        case '--output':
          if (i + 1 < args.length) {
            options.outputFile = args[++i];
          }
          break;
        case '--format':
          if (i + 1 < args.length) {
            const format = args[++i];
            if (format === 'json' || format === 'console' || format === 'html') {
              options.format = format as any;
            }
          }
          break;
        case '--timeout':
          if (i + 1 < args.length) {
            const timeout = parseInt(args[++i]);
            if (!isNaN(timeout)) {
              options.timeout = timeout * 1000; // converter para ms
            }
          }
          break;
        case '--help':
          printHelp();
          return;
        default:
          console.error(`[ERRO] Argumento desconhecido: ${arg}`);
          printHelp();
          return;
      }
    } else {
      // Assume que é o arquivo de teste
      testFile = arg;
    }
  }

  if (!fs.existsSync(testFile)) {
    console.error(`[ERRO] Arquivo de teste não encontrado: ${testFile}`);
    return;
  }

  // Se deve gerar log e não foi especificado um arquivo de output, gera automaticamente
  if (generateLog && !options.outputFile) {
    try {
      const fileContent = fs.readFileSync(testFile, 'utf8');
      const suite = yaml.load(fileContent) as any;
      const suiteName = suite.suite_name || 'test-suite';
      
      // Limpa o nome da suite para usar como nome de arquivo
      const cleanSuiteName = suiteName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/-+/g, '-') // Remove hífens duplos
        .replace(/^-|-$/g, ''); // Remove hífens no início/fim
      
      // Gera timestamp
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-') // Substitui : e . por -
        .replace(/T/, '_') // Substitui T por _
        .slice(0, 19); // Remove milissegundos e timezone
      
      options.outputFile = `results/${cleanSuiteName}_${timestamp}.json`;
      options.format = 'json';
      
      // Cria o diretório results se não existir
      const resultsDir = path.dirname(options.outputFile);
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
    } catch (error) {
      console.warn('[AVISO] Não foi possível gerar nome automático do log, usando padrão');
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace(/T/, '_')
        .slice(0, 19);
      options.outputFile = `results/test-suite_${timestamp}.json`;
      options.format = 'json';
      
      // Cria o diretório results se não existir
      if (!fs.existsSync('results')) {
        fs.mkdirSync('results', { recursive: true });
      }
    }
  }
  
  // Agora cria o Runner com as opções corretas
  const runner = new Runner(testFile, options);
  const result = await runner.run();
  
  // Código de saída baseado no sucesso
  process.exit(result.success_rate === 100 ? 0 : 1);
}

function printHelp() {
  console.log(`
Motor de Testes de API - Flow Test

Uso: npm start [arquivo] [opções]

Argumentos:
  arquivo          Arquivo YAML da suíte de testes (padrão: ./tests/start-flow.yaml)

Opções:
  --verbose        Exibe informações detalhadas incluindo req/res completos
  --detailed       Exibe informações detalhadas mas sem bodies completos  
  --simple         Exibe apenas progresso básico (padrão)
  --silent         Execução silenciosa, apenas erros
  --continue       Continua executando mesmo com falhas
  --no-log         Não gera arquivo de log automático (padrão: gera log)
  --output <file>  Salva resultados em arquivo específico
  --format <type>  Formato do output: console, json, html (padrão: json)
  --timeout <seg>  Timeout para requisições em segundos (padrão: 30)
  --help           Exibe esta mensagem

Exemplos:
  npm start                                    # Executa com log automático
  npm start meu-teste.yaml                     # Executa arquivo específico
  npm start --no-log                          # Executa sem gerar arquivo de log
  npm start --verbose --output custom.json    # Modo verbose com arquivo específico
  npm start --detailed --continue             # Modo detalhado, continua com falhas
  
Logs automáticos:
  Por padrão, todos os testes geram logs detalhados em:
  results/nome-da-suite_AAAA-MM-DD_HH-MM-SS.json
  `);
}

main().catch(error => {
  console.error('[ERRO] Falha na execução:', error);
  process.exit(1);
});
