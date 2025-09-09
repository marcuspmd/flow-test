import * as jmespath from 'jmespath';
import { ConditionalScenario, ExecutionResult, Assertions, AssertionResult } from '../types/common.types';
import { AssertionService } from './assertion.service';
import { CaptureService } from './capture.service';

export class ScenarioService {
  private readonly assertionService: AssertionService;
  private readonly captureService: CaptureService;

  constructor() {
    this.assertionService = new AssertionService();
    this.captureService = new CaptureService();
  }

  /**
   * Processa cenários condicionais e executa o cenário apropriado.
   */
  processScenarios(
    scenarios: ConditionalScenario[],
    result: ExecutionResult,
    verbosity: string
  ): void {
    for (const scenario of scenarios) {
      try {
        const conditionMet = this.evaluateCondition(scenario.condition, result);
        
        if (verbosity === 'detailed' || verbosity === 'verbose') {
          console.log(`  [SCENARIO] Condição "${scenario.condition}": ${conditionMet ? 'TRUE' : 'FALSE'}`);
        }

        const scenarioBlock = conditionMet ? scenario.then : scenario.else;
        
        if (scenarioBlock) {
          this.executeScenarioBlock(scenarioBlock, result, verbosity);
        }

      } catch (error) {
        console.log(`  [✗] Erro ao avaliar cenário: ${error}`);
        result.error_message = `Erro no cenário: ${error}`;
        result.status = 'failure';
      }
    }
  }

  /**
   * Avalia uma condição JMESPath contra a resposta HTTP.
   */
  private evaluateCondition(condition: string, result: ExecutionResult): boolean {
    if (!result.response_details) {
      throw new Error('Resposta não disponível para avaliação da condição');
    }

    // Constrói o contexto completo para avaliação
    const context = this.buildEvaluationContext(result);
    
    try {
      const conditionResult = jmespath.search(context, condition);
      
      // Converte o resultado para boolean
      if (typeof conditionResult === 'boolean') {
        return conditionResult;
      }
      
      // Trata valores truthy/falsy
      return Boolean(conditionResult);
    } catch (error) {
      throw new Error(`Condição JMESPath inválida '${condition}': ${error}`);
    }
  }

  /**
   * Constrói o contexto para avaliação de condições.
   */
  private buildEvaluationContext(result: ExecutionResult): any {
    const response = result.response_details!;
    
    return {
      status_code: response.status_code,
      headers: response.headers,
      body: response.body,
      duration_ms: result.duration_ms,
      size_bytes: response.size_bytes,
      step_status: result.status
    };
  }

  /**
   * Executa um bloco de cenário (then ou else).
   */
  private executeScenarioBlock(
    block: { assert?: Assertions; capture?: Record<string, string> },
    result: ExecutionResult,
    verbosity: string
  ): void {
    // Executa assertions do cenário
    if (block.assert) {
      const scenarioAssertions = this.assertionService.validateAssertions(block.assert, result);
      
      // Adiciona as assertions do cenário aos resultados existentes
      if (!result.assertions_results) {
        result.assertions_results = [];
      }
      result.assertions_results.push(...scenarioAssertions);

      // Verifica se alguma assertion falhou
      const failedAssertions = scenarioAssertions.filter(a => !a.passed);
      if (failedAssertions.length > 0) {
        result.status = 'failure';
        result.error_message = `${failedAssertions.length} assertion(s) de cenário falharam`;
        
        if (verbosity === 'simple' || verbosity === 'detailed' || verbosity === 'verbose') {
          console.log('  [✗] Assertions de cenário falharam:');
          failedAssertions.forEach(assertion => {
            console.log(`    - ${assertion.field}: ${assertion.message}`);
          });
        }
      } else if (verbosity === 'detailed' || verbosity === 'verbose') {
        console.log(`  [✓] Todas as ${scenarioAssertions.length} assertion(s) de cenário passaram`);
      }
    }

    // Executa capture do cenário
    if (block.capture) {
      const capturedVariables = this.captureService.captureVariables(block.capture, result);
      
      // Adiciona as variáveis capturadas aos resultados existentes
      if (!result.captured_variables) {
        result.captured_variables = {};
      }
      Object.assign(result.captured_variables, capturedVariables);
    }
  }

  /**
   * Valida se todas as condições dos cenários são JMESPath válidos.
   */
  validateScenarios(scenarios: ConditionalScenario[]): string[] {
    const errors: string[] = [];
    
    scenarios.forEach((scenario, index) => {
      try {
        // Tenta compilar/validar a condição
        const testContext = {
          status_code: 200,
          headers: {},
          body: {},
          duration_ms: 100,
          size_bytes: 0
        };
        
        jmespath.search(testContext, scenario.condition);
      } catch (error) {
        errors.push(`Cenário ${index + 1}: condição inválida '${scenario.condition}' - ${error}`);
      }
    });
    
    return errors;
  }

  /**
   * Gera sugestões de condições comuns baseadas na resposta.
   */
  suggestConditions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    
    if (!result.response_details) {
      return suggestions;
    }

    const response = result.response_details;
    
    // Condições básicas
    suggestions.push(
      `status_code == \`${response.status_code}\``,
      `status_code != \`${response.status_code}\``,
      `status_code >= \`200\``,
      `status_code < \`400\``,
      `duration_ms < \`1000\``,
      `size_bytes > \`100\``
    );

    // Condições baseadas no body (se for objeto)
    if (response.body && typeof response.body === 'object') {
      // Sugere algumas verificações comuns
      const bodyKeys = Object.keys(response.body);
      if (bodyKeys.length > 0) {
        suggestions.push(
          `body && body.error`,
          `body && !body.error`,
          `body.status == 'success'`,
          `body.data && length(body.data) > \`0\``
        );
        
        // Adiciona sugestões para keys específicas
        bodyKeys.slice(0, 3).forEach(key => {
          suggestions.push(`body.${key}`);
        });
      }
    }

    // Condições baseadas em headers comuns
    const commonHeaders = ['content-type', 'authorization', 'x-api-version'];
    commonHeaders.forEach(header => {
      if (response.headers[header] || response.headers[header.toLowerCase()]) {
        suggestions.push(`headers."${header}"`);
      }
    });
    
    return suggestions;
  }
}