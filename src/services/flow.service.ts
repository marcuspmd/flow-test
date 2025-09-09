import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { FlowImport, ReusableFlow, TestStep, VariableContext } from '../types/common.types';
import { VariableService } from './variable.service';

export class FlowManager {
  private readonly loadedFlows: Map<string, ReusableFlow> = new Map();
  private readonly variableService: VariableService;
  private readonly verbosity: string;

  constructor(variableService: VariableService, verbosity: string = 'simple') {
    this.variableService = variableService;
    this.verbosity = verbosity;
  }

  /**
   * Carrega e processa todas as importações de fluxos.
   */
  async loadImports(imports: FlowImport[], basePath: string): Promise<TestStep[]> {
    const allSteps: TestStep[] = [];

    for (const flowImport of imports) {
      if (this.verbosity !== 'silent') {
        console.log(`[INFO] Carregando fluxo: ${flowImport.name} de ${flowImport.path}`);
      }

      const flow = await this.loadFlow(flowImport.path, basePath);
      const processedSteps = this.processFlowImport(flow, flowImport);
      
      allSteps.push(...processedSteps);

      // Adiciona variáveis do fluxo ao contexto
      const flowVariables = this.collectFlowVariables(flow, flowImport);
      this.variableService.addImportedFlow(flowImport.name, flowVariables);

      if (this.verbosity === 'detailed' || this.verbosity === 'verbose') {
        console.log(`  [✓] Fluxo "${flow.flow_name}" carregado com ${processedSteps.length} etapa(s)`);
      }
    }

    return allSteps;
  }

  /**
   * Carrega um fluxo de um arquivo YAML.
   */
  private async loadFlow(flowPath: string, basePath: string): Promise<ReusableFlow> {
    // Verifica se já foi carregado (cache)
    const cacheKey = path.resolve(basePath, flowPath);
    if (this.loadedFlows.has(cacheKey)) {
      return this.loadedFlows.get(cacheKey)!;
    }

    try {
      // Resolve o caminho do arquivo
      const fullPath = this.resolveFlowPath(flowPath, basePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Arquivo de fluxo não encontrado: ${fullPath}`);
      }

      // Carrega e parseia o arquivo
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const flow = yaml.load(fileContent) as ReusableFlow;

      // Validação básica
      this.validateFlow(flow, fullPath);

      // Armazena no cache
      this.loadedFlows.set(cacheKey, flow);
      
      return flow;
    } catch (error) {
      throw new Error(`Erro ao carregar fluxo "${flowPath}": ${error}`);
    }
  }

  /**
   * Resolve o caminho completo do arquivo de fluxo.
   */
  private resolveFlowPath(flowPath: string, basePath: string): string {
    // Se é caminho absoluto, usa como está
    if (path.isAbsolute(flowPath)) {
      return flowPath;
    }

    // Resolve relativo ao arquivo base
    const baseDir = path.dirname(basePath);
    return path.resolve(baseDir, flowPath);
  }

  /**
   * Valida a estrutura de um fluxo.
   */
  private validateFlow(flow: ReusableFlow, filePath: string): void {
    if (!flow.flow_name || typeof flow.flow_name !== 'string') {
      throw new Error(`Campo 'flow_name' obrigatório em ${filePath}`);
    }

    if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
      throw new Error(`Campo 'steps' deve ser um array não vazio em ${filePath}`);
    }

    // Valida cada etapa
    flow.steps.forEach((step, index) => {
      if (!step.name || typeof step.name !== 'string') {
        throw new Error(`Etapa ${index + 1} deve ter um 'name' válido em ${filePath}`);
      }
      if (!step.request || typeof step.request !== 'object') {
        throw new Error(`Etapa ${index + 1} deve ter um 'request' válido em ${filePath}`);
      }
    });
  }

  /**
   * Processa a importação de um fluxo, aplicando override de variáveis.
   */
  private processFlowImport(flow: ReusableFlow, flowImport: FlowImport): TestStep[] {
    // Cria um contexto temporário para este fluxo
    const flowContext: VariableContext = {
      global: {},
      imported: {},
      suite: { ...(flow.variables || {}), ...(flowImport.variables || {}) },
      runtime: {}
    };

    const tempVariableService = new VariableService(flowContext);

    // Processa cada etapa aplicando interpolação
    return flow.steps.map(step => {
      const interpolatedStep: TestStep = {
        ...step,
        name: `[${flowImport.name}] ${step.name}`,
        request: tempVariableService.interpolate(step.request)
      };

      // Interpola outras propriedades se existirem
      if (step.assert) {
        interpolatedStep.assert = tempVariableService.interpolate(step.assert);
      }
      
      // Modifica a captura para incluir o prefixo do fluxo nas variáveis exportadas
      if (step.capture) {
        const modifiedCapture: Record<string, string> = {};
        const exportedVars = flow.exports || [];
        
        for (const [varName, jmesPath] of Object.entries(step.capture)) {
          // Se a variável está na lista de exports, cria também a versão com prefixo
          if (exportedVars.includes(varName)) {
            modifiedCapture[`${flowImport.name}.${varName}`] = jmesPath;
          }
          // Mantém a versão original também
          modifiedCapture[varName] = jmesPath;
        }
        
        interpolatedStep.capture = modifiedCapture;
      }

      return interpolatedStep;
    });
  }

  /**
   * Coleta as variáveis finais de um fluxo após a importação.
   */
  private collectFlowVariables(flow: ReusableFlow, flowImport: FlowImport): Record<string, any> {
    const variables: Record<string, any> = {};

    // Variáveis padrão do fluxo
    if (flow.variables) {
      Object.assign(variables, flow.variables);
    }

    // Override com variáveis da importação
    if (flowImport.variables) {
      Object.assign(variables, flowImport.variables);
    }

    return variables;
  }

  /**
   * Lista todos os fluxos carregados.
   */
  getLoadedFlows(): Array<{ path: string; flow: ReusableFlow }> {
    return Array.from(this.loadedFlows.entries()).map(([path, flow]) => ({
      path,
      flow
    }));
  }

  /**
   * Limpa o cache de fluxos carregados.
   */
  clearCache(): void {
    this.loadedFlows.clear();
  }

  /**
   * Verifica se um fluxo está no cache.
   */
  isFlowCached(flowPath: string, basePath: string): boolean {
    const cacheKey = path.resolve(basePath, flowPath);
    return this.loadedFlows.has(cacheKey);
  }

  /**
   * Obtém informações de debug sobre fluxos carregados.
   */
  getDebugInfo(): any {
    const info: any = {
      totalFlows: this.loadedFlows.size,
      flows: []
    };

    for (const [path, flow] of this.loadedFlows.entries()) {
      info.flows.push({
        path,
        name: flow.flow_name,
        description: flow.description || 'Sem descrição',
        stepsCount: flow.steps.length,
        variablesCount: flow.variables ? Object.keys(flow.variables).length : 0,
        exports: flow.exports || []
      });
    }

    return info;
  }
}