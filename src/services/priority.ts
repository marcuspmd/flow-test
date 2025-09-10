import { ConfigManager } from '../core/config';
import { DiscoveredTest } from '../types/engine.types';

/**
 * Serviço de gerenciamento de prioridades e ordenação de testes
 */
export class PriorityService {
  private configManager: ConfigManager;
  private priorityWeights: Map<string, number> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.initializePriorityWeights();
  }

  /**
   * Inicializa os pesos de prioridade baseado na configuração
   */
  private initializePriorityWeights(): void {
    const config = this.configManager.getConfig();
    const levels = config.priorities!.levels;

    // Atribui pesos: maior prioridade = maior peso
    levels.forEach((level, index) => {
      const weight = levels.length - index; // critical=4, high=3, medium=2, low=1
      this.priorityWeights.set(level, weight);
    });
  }

  /**
   * Ordena testes por prioridade e dependências
   */
  orderTests(tests: DiscoveredTest[]): DiscoveredTest[] {
    // 1. Primeiro, ordena por prioridade
    const sortedByPriority = this.sortByPriority(tests);

    // 2. Então, reordena considerando dependências
    const orderedWithDependencies = this.resolveExecutionOrder(sortedByPriority);

    return orderedWithDependencies;
  }

  /**
   * Ordena testes apenas por prioridade
   */
  private sortByPriority(tests: DiscoveredTest[]): DiscoveredTest[] {
    return tests.slice().sort((a, b) => {
      const priorityA = a.priority || 'medium';
      const priorityB = b.priority || 'medium';
      
      const weightA = this.priorityWeights.get(priorityA) || 0;
      const weightB = this.priorityWeights.get(priorityB) || 0;

      // Ordena por peso decrescente (maior prioridade primeiro)
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // Se prioridades iguais, ordena por duração estimada (mais rápidos primeiro)
      const durationA = a.estimated_duration || 0;
      const durationB = b.estimated_duration || 0;
      
      if (durationA !== durationB) {
        return durationA - durationB;
      }

      // Se tudo igual, ordena alfabeticamente
      return a.suite_name.localeCompare(b.suite_name);
    });
  }

  /**
   * Resolve ordem de execução considerando dependências
   */
  private resolveExecutionOrder(tests: DiscoveredTest[]): DiscoveredTest[] {
    const result: DiscoveredTest[] = [];
    const remaining = new Set(tests);
    const completed = new Set<string>();

    // Cria mapa para lookup rápido
    const testMap = new Map<string, DiscoveredTest>();
    tests.forEach(test => {
      testMap.set(test.suite_name, test);
    });

    // Algoritmo de ordenação topológica com respeito à prioridade
    while (remaining.size > 0) {
      const readyTests = Array.from(remaining).filter(test => {
        // Teste está pronto se todas suas dependências foram completadas
        return !test.dependencies || 
               test.dependencies.every(dep => completed.has(dep) || !testMap.has(dep));
      });

      if (readyTests.length === 0) {
        // Detecta dependência circular ou dependência não encontrada
        const stuck = Array.from(remaining)[0];
        console.warn(`⚠️  Warning: Possible circular dependency detected. Forcing execution of '${stuck.suite_name}'`);
        readyTests.push(stuck);
      }

      // Dos testes prontos, pega o de maior prioridade
      const nextTest = this.selectHighestPriority(readyTests);
      
      result.push(nextTest);
      remaining.delete(nextTest);
      completed.add(nextTest.suite_name);
    }

    return result;
  }

  /**
   * Seleciona o teste de maior prioridade de uma lista
   */
  private selectHighestPriority(tests: DiscoveredTest[]): DiscoveredTest {
    if (tests.length === 1) {
      return tests[0];
    }

    return tests.reduce((highest, current) => {
      const highestWeight = this.getPriorityWeight(highest.priority);
      const currentWeight = this.getPriorityWeight(current.priority);

      if (currentWeight > highestWeight) {
        return current;
      }
      
      if (currentWeight === highestWeight) {
        // Se prioridades iguais, prefere o mais rápido
        const highestDuration = highest.estimated_duration || 0;
        const currentDuration = current.estimated_duration || 0;
        
        return currentDuration < highestDuration ? current : highest;
      }

      return highest;
    });
  }

  /**
   * Obtém o peso de uma prioridade
   */
  private getPriorityWeight(priority?: string): number {
    return this.priorityWeights.get(priority || 'medium') || 0;
  }

  /**
   * Verifica se um teste é considerado obrigatório
   */
  isRequiredTest(test: DiscoveredTest): boolean {
    const config = this.configManager.getConfig();
    const requiredPriorities = config.priorities!.required || [];
    
    return requiredPriorities.includes(test.priority || 'medium');
  }

  /**
   * Filtra apenas testes obrigatórios
   */
  getRequiredTests(tests: DiscoveredTest[]): DiscoveredTest[] {
    return tests.filter(test => this.isRequiredTest(test));
  }

  /**
   * Filtra testes por nível de prioridade
   */
  filterByPriority(tests: DiscoveredTest[], priorities: string[]): DiscoveredTest[] {
    return tests.filter(test => {
      const testPriority = test.priority || 'medium';
      return priorities.includes(testPriority);
    });
  }

  /**
   * Agrupa testes por prioridade
   */
  groupByPriority(tests: DiscoveredTest[]): Map<string, DiscoveredTest[]> {
    const groups = new Map<string, DiscoveredTest[]>();
    
    tests.forEach(test => {
      const priority = test.priority || 'medium';
      
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      
      groups.get(priority)!.push(test);
    });

    return groups;
  }

  /**
   * Calcula estatísticas de prioridades
   */
  getPriorityStats(tests: DiscoveredTest[]) {
    const groups = this.groupByPriority(tests);
    const config = this.configManager.getConfig();
    
    const stats = {
      total_tests: tests.length,
      required_tests: this.getRequiredTests(tests).length,
      by_priority: {} as Record<string, { count: number; percentage: number; estimated_duration: number }>,
      total_estimated_duration: 0,
      required_estimated_duration: 0
    };

    // Calcula estatísticas por prioridade
    config.priorities!.levels.forEach(priority => {
      const testsInPriority = groups.get(priority) || [];
      const count = testsInPriority.length;
      const percentage = tests.length > 0 ? (count / tests.length) * 100 : 0;
      const estimatedDuration = testsInPriority.reduce(
        (sum, test) => sum + (test.estimated_duration || 0), 0
      );

      stats.by_priority[priority] = {
        count,
        percentage: Math.round(percentage * 100) / 100,
        estimated_duration: estimatedDuration
      };

      stats.total_estimated_duration += estimatedDuration;
      
      if (this.isRequiredPriority(priority)) {
        stats.required_estimated_duration += estimatedDuration;
      }
    });

    return stats;
  }

  /**
   * Verifica se uma prioridade é obrigatória
   */
  private isRequiredPriority(priority: string): boolean {
    const config = this.configManager.getConfig();
    return config.priorities!.required!.includes(priority);
  }

  /**
   * Sugere otimizações na distribuição de prioridades
   */
  suggestOptimizations(tests: DiscoveredTest[]): string[] {
    const suggestions: string[] = [];
    const stats = this.getPriorityStats(tests);
    const config = this.configManager.getConfig();

    // Verifica se há muitos testes críticos
    const criticalStats = stats.by_priority['critical'];
    if (criticalStats && criticalStats.percentage > 30) {
      suggestions.push(
        `Consider reducing critical tests: ${criticalStats.count} tests (${criticalStats.percentage}%) marked as critical. This may slow down feedback loops.`
      );
    }

    // Verifica se há testes sem prioridade definida
    const unclassified = tests.filter(test => !test.priority);
    if (unclassified.length > 0) {
      suggestions.push(
        `${unclassified.length} tests have no explicit priority. Consider adding priority metadata.`
      );
    }

    // Verifica se há testes órfãos de alta prioridade
    const highPriorityOrphans = tests.filter(test => {
      const isHighPriority = this.getPriorityWeight(test.priority) >= 3;
      const hasNoDependencies = !test.dependencies || test.dependencies.length === 0;
      return isHighPriority && hasNoDependencies;
    });

    if (highPriorityOrphans.length > 5) {
      suggestions.push(
        `Many high-priority tests (${highPriorityOrphans.length}) have no dependencies. Consider if some could be grouped or have dependencies.`
      );
    }

    // Verifica duração estimada dos testes obrigatórios
    if (stats.required_estimated_duration > 300000) { // 5 minutos
      suggestions.push(
        `Required tests estimated duration is ${Math.round(stats.required_estimated_duration / 1000)}s. Consider optimizing for faster feedback.`
      );
    }

    return suggestions;
  }

  /**
   * Cria um plano de execução detalhado
   */
  createExecutionPlan(tests: DiscoveredTest[]): {
    phases: Array<{
      name: string;
      tests: DiscoveredTest[];
      estimated_duration: number;
      is_required: boolean;
    }>;
    total_duration: number;
    critical_path: string[];
  } {
    const orderedTests = this.orderTests(tests);
    const config = this.configManager.getConfig();
    
    // Agrupa por prioridade mantendo a ordem
    const phases: any[] = [];
    let currentPriority: string | null = null;
    let currentPhase: any = null;

    orderedTests.forEach(test => {
      const testPriority = test.priority || 'medium';
      
      if (testPriority !== currentPriority) {
        if (currentPhase) {
          phases.push(currentPhase);
        }
        
        currentPhase = {
          name: `${testPriority.charAt(0).toUpperCase() + testPriority.slice(1)} Priority Tests`,
          tests: [],
          estimated_duration: 0,
          is_required: this.isRequiredPriority(testPriority)
        };
        currentPriority = testPriority;
      }
      
      currentPhase.tests.push(test);
      currentPhase.estimated_duration += test.estimated_duration || 0;
    });

    if (currentPhase) {
      phases.push(currentPhase);
    }

    const totalDuration = phases.reduce(
      (sum, phase) => sum + phase.estimated_duration, 0
    );

    // Identifica caminho crítico (testes que outros dependem)
    const criticalPath = this.identifyCriticalPath(orderedTests);

    return {
      phases,
      total_duration: totalDuration,
      critical_path: criticalPath
    };
  }

  /**
   * Identifica o caminho crítico de dependências
   */
  private identifyCriticalPath(tests: DiscoveredTest[]): string[] {
    const dependencyCount = new Map<string, number>();
    
    // Conta quantas vezes cada teste é dependência
    tests.forEach(test => {
      if (test.dependencies) {
        test.dependencies.forEach(dep => {
          dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
        });
      }
    });

    // Ordena por número de dependentes (descendente)
    const criticalTests = Array.from(dependencyCount.entries())
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([testName]) => testName);

    return criticalTests.slice(0, 5); // Top 5 testes mais críticos
  }
}