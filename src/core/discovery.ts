import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { ConfigManager } from './config';
import { DiscoveredTest, TestSuite, FlowDependency } from '../types/engine.types';

/**
 * Serviço de descoberta de testes
 */
export class TestDiscovery {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Descobre todos os testes no diretório configurado
   */
  async discoverTests(): Promise<DiscoveredTest[]> {
    const config = this.configManager.getConfig();
    const testDirectory = path.resolve(config.test_directory);

    if (!fs.existsSync(testDirectory)) {
      throw new Error(`Test directory does not exist: ${testDirectory}`);
    }

    const discoveredTests: DiscoveredTest[] = [];

    // Para cada padrão de descoberta, encontra arquivos correspondentes
    for (const pattern of config.discovery!.patterns) {
      const fullPattern = path.join(testDirectory, pattern);
      const files = await fg(fullPattern, {
        ignore: config.discovery!.exclude,
        absolute: true,
        onlyFiles: true
      });

      for (const filePath of files) {
        try {
          const test = await this.parseTestFile(filePath);
          if (test) {
            discoveredTests.push(test);
          }
        } catch (error) {
          console.warn(`⚠️  Warning: Failed to parse test file ${filePath}: ${error}`);
        }
      }
    }

    // Remove duplicatas baseado no file_path
    const uniqueTests = this.removeDuplicates(discoveredTests);

    // Resolve dependências entre testes
    const testsWithDependencies = this.resolveDependencies(uniqueTests);

    return testsWithDependencies;
  }

  /**
   * Analisa um arquivo de teste individual
   */
  private async parseTestFile(filePath: string): Promise<DiscoveredTest | null> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const suite = yaml.load(fileContent) as TestSuite;

      if (!suite || !suite.suite_name) {
        console.warn(`⚠️  Warning: Invalid test suite in ${filePath} - missing suite_name`);
        return null;
      }

      const discoveredTest: DiscoveredTest = {
        file_path: filePath,
        suite_name: suite.suite_name,
        priority: suite.metadata?.priority || this.inferPriorityFromName(suite.suite_name),
        dependencies: this.extractDependencies(suite),
        depends: this.extractFlowDependencies(suite),
        exports: this.extractExports(suite),
        estimated_duration: suite.metadata?.estimated_duration_ms || this.estimateDuration(suite)
      };

      return discoveredTest;
    } catch (error) {
      throw new Error(`Failed to parse test file ${filePath}: ${error}`);
    }
  }

  /**
   * Infere prioridade baseada no nome da suíte
   */
  private inferPriorityFromName(suiteName: string): string {
    const name = suiteName.toLowerCase();
    
    // Palavras-chave que indicam prioridade crítica
    if (name.includes('critical') || name.includes('smoke') || name.includes('health')) {
      return 'critical';
    }
    
    // Palavras-chave que indicam alta prioridade
    if (name.includes('auth') || name.includes('login') || name.includes('core')) {
      return 'high';
    }
    
    // Palavras-chave que indicam baixa prioridade
    if (name.includes('edge') || name.includes('optional') || name.includes('experimental')) {
      return 'low';
    }
    
    // Padrão é média prioridade
    return 'medium';
  }

  /**
   * Extrai dependências de uma suíte de testes
   */
  private extractDependencies(suite: TestSuite): string[] {
    const dependencies: string[] = [];

    // Dependências explícitas nos metadados
    if (suite.metadata?.requires) {
      dependencies.push(...suite.metadata.requires);
    }

    // Dependências implícitas através de imports
    if (suite.imports) {
      suite.imports.forEach(imp => {
        dependencies.push(imp.name);
      });
    }

    return [...new Set(dependencies)]; // Remove duplicatas
  }

  /**
   * Extrai dependências de fluxo no novo formato
   */
  private extractFlowDependencies(suite: TestSuite): FlowDependency[] {
    const dependencies: FlowDependency[] = [];

    // Dependências diretas especificadas na suite
    if (suite.depends) {
      dependencies.push(...suite.depends);
    }

    // Converte dependências do formato simples (array de strings) para FlowDependency
    if (Array.isArray((suite as any).depends)) {
      const simpleDeps = (suite as any).depends as string[];
      for (const dep of simpleDeps) {
        dependencies.push({
          path: dep,
          required: true, // Assume required by default
          cache: true
        });
      }
    }

    return dependencies;
  }

  /**
   * Extrai lista de variáveis exportadas
   */
  private extractExports(suite: TestSuite): string[] {
    return suite.exports || [];
  }

  /**
   * Estima duração baseada no número de steps
   */
  private estimateDuration(suite: TestSuite): number {
    let totalSteps = suite.steps.length;

    // Adiciona steps de flows importados (estimativa)
    if (suite.imports) {
      totalSteps += suite.imports.length * 3; // Assume 3 steps por import em média
    }

    // Estimativa: 500ms por step como baseline
    return totalSteps * 500;
  }

  /**
   * Remove testes duplicados baseado no caminho do arquivo
   */
  private removeDuplicates(tests: DiscoveredTest[]): DiscoveredTest[] {
    const seen = new Set<string>();
    return tests.filter(test => {
      if (seen.has(test.file_path)) {
        return false;
      }
      seen.add(test.file_path);
      return true;
    });
  }

  /**
   * Resolve dependências entre testes
   */
  private resolveDependencies(tests: DiscoveredTest[]): DiscoveredTest[] {
    // Cria mapa de nome -> teste para lookup rápido
    const testMap = new Map<string, DiscoveredTest>();
    tests.forEach(test => {
      testMap.set(test.suite_name, test);
    });

    // Valida dependências e atualiza lista
    return tests.map(test => {
      if (test.dependencies && test.dependencies.length > 0) {
        // Filtra dependências que realmente existem
        const validDependencies = test.dependencies.filter(dep => {
          const exists = testMap.has(dep);
          if (!exists) {
            console.warn(`⚠️  Warning: Dependency '${dep}' not found for test '${test.suite_name}'`);
          }
          return exists;
        });

        return {
          ...test,
          dependencies: validDependencies
        };
      }
      return test;
    });
  }

  /**
   * Obtém estatísticas da descoberta
   */
  getDiscoveryStats(tests: DiscoveredTest[]) {
    const stats = {
      total_tests: tests.length,
      by_priority: {} as Record<string, number>,
      total_estimated_duration: 0,
      with_dependencies: 0,
      files_scanned: 0
    };

    tests.forEach(test => {
      // Contagem por prioridade
      const priority = test.priority || 'medium';
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;

      // Duração total estimada
      stats.total_estimated_duration += test.estimated_duration || 0;

      // Testes com dependências
      if (test.dependencies && test.dependencies.length > 0) {
        stats.with_dependencies++;
      }
    });

    return stats;
  }

  /**
   * Valida se um arquivo é um teste válido sem carregá-lo completamente
   */
  async isValidTestFile(filePath: string): Promise<boolean> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const firstLines = fileContent.split('\n').slice(0, 10).join('\n');
      
      // Verifica se tem estrutura básica de um teste
      return firstLines.includes('suite_name') && 
             firstLines.includes('steps');
    } catch (error) {
      return false;
    }
  }

  /**
   * Descobre e organiza testes em grupos lógicos
   */
  async discoverTestGroups(): Promise<Map<string, DiscoveredTest[]>> {
    const tests = await this.discoverTests();
    const groups = new Map<string, DiscoveredTest[]>();

    tests.forEach(test => {
      // Agrupa por diretório
      const dir = path.dirname(test.file_path);
      const dirName = path.basename(dir);
      
      if (!groups.has(dirName)) {
        groups.set(dirName, []);
      }
      groups.get(dirName)!.push(test);
    });

    return groups;
  }

  /**
   * Detecta testes órfãos (sem dependências e que ninguém depende)
   */
  findOrphanTests(tests: DiscoveredTest[]): DiscoveredTest[] {
    const allDependencies = new Set<string>();
    
    // Coleta todas as dependências
    tests.forEach(test => {
      if (test.dependencies) {
        test.dependencies.forEach(dep => allDependencies.add(dep));
      }
    });

    // Encontra testes que não têm dependências E ninguém depende deles
    return tests.filter(test => {
      const hasNoDependencies = !test.dependencies || test.dependencies.length === 0;
      const nobodyDependsOnIt = !allDependencies.has(test.suite_name);
      
      return hasNoDependencies && nobodyDependsOnIt;
    });
  }
}