import * as jmespath from "jmespath";
import {
  Assertions,
  AssertionResult,
  AssertionChecks,
  ExecutionResult,
} from "../types/common.types";

export class AssertionService {
  /**
   * Valida todas as assertions de uma resposta HTTP.
   */
  validateAssertions(
    assertions: Assertions,
    result: ExecutionResult
  ): AssertionResult[] {
    const assertionResults: AssertionResult[] = [];

    if (!result.response_details) {
      return [
        this.createAssertionResult(
          "response",
          "exists",
          null,
          false,
          "Resposta não disponível"
        ),
      ];
    }

    // Processa assertions flat (como body.status) e estruturadas
    const processedAssertions = this.preprocessAssertions(assertions);

    // Valida status code
    if (processedAssertions.status_code !== undefined) {
      assertionResults.push(
        this.validateStatusCode(processedAssertions.status_code, result)
      );
    }

    // Valida headers
    if (processedAssertions.headers) {
      assertionResults.push(
        ...this.validateHeaders(processedAssertions.headers, result)
      );
    }

    // Valida body
    if (processedAssertions.body) {
      assertionResults.push(
        ...this.validateBody(processedAssertions.body, result)
      );
    }

    // Valida tempo de resposta
    if (processedAssertions.response_time_ms) {
      assertionResults.push(
        ...this.validateResponseTime(
          processedAssertions.response_time_ms,
          result
        )
      );
    }

    return assertionResults;
  }

  /**
   * Pré-processa assertions para suportar tanto sintaxe flat (body.status) quanto estruturada (body: {status}).
   */
  private preprocessAssertions(assertions: any): Assertions {
    const processed: any = { ...assertions };

    // Processa propriedades flat que começam com "body."
    const bodyFlat: Record<string, any> = {};
    const headersFlat: Record<string, any> = {};

    for (const [key, value] of Object.entries(assertions)) {
      if (key.startsWith("body.")) {
        // Extrai o caminho do campo (ex: "body.status" -> "status")
        const fieldPath = key.substring(5); // Remove "body."
        bodyFlat[fieldPath] = { equals: value }; // Converte para AssertionChecks
        delete processed[key]; // Remove a propriedade flat
      } else if (key.startsWith("headers.")) {
        // Extrai o nome do header (ex: "headers.content-type" -> "content-type")
        const headerName = key.substring(8); // Remove "headers."
        headersFlat[headerName] = { equals: value }; // Converte para AssertionChecks
        delete processed[key]; // Remove a propriedade flat
      }
    }

    // Combina body flat com body estruturado existente
    if (Object.keys(bodyFlat).length > 0) {
      processed.body = {
        ...processed.body,
        ...bodyFlat,
      };
    }

    // Combina headers flat com headers estruturados existentes
    if (Object.keys(headersFlat).length > 0) {
      processed.headers = {
        ...processed.headers,
        ...headersFlat,
      };
    }

    return processed as Assertions;
  }

  /**
   * Valida o status code da resposta.
   */
  private validateStatusCode(
    expected: number,
    result: ExecutionResult
  ): AssertionResult {
    const actual = result.response_details!.status_code;
    const passed = actual === expected;

    return this.createAssertionResult(
      "status_code",
      expected,
      actual,
      passed,
      passed ? undefined : `Esperado: ${expected}, Recebido: ${actual}`
    );
  }

  /**
   * Valida os headers da resposta.
   */
  private validateHeaders(
    expectedHeaders: Record<string, AssertionChecks>,
    result: ExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualHeaders = result.response_details!.headers;

    for (const [headerName, checks] of Object.entries(expectedHeaders)) {
      const actualValue =
        actualHeaders[headerName] || actualHeaders[headerName.toLowerCase()];
      results.push(
        ...this.validateFieldChecks(
          `headers.${headerName}`,
          checks,
          actualValue
        )
      );
    }

    return results;
  }

  /**
   * Valida o body da resposta usando JMESPath.
   */
  private validateBody(
    expectedBody: Record<string, AssertionChecks>,
    result: ExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualBody = result.response_details!.body;

    for (const [fieldPath, checks] of Object.entries(expectedBody)) {
      let actualValue: any;

      try {
        actualValue = jmespath.search(actualBody, fieldPath);
      } catch (error) {
        results.push(
          this.createAssertionResult(
            `body.${fieldPath}`,
            checks,
            undefined,
            false,
            `Erro ao avaliar JMESPath: ${error}`
          )
        );
        continue;
      }

      results.push(
        ...this.validateFieldChecks(`body.${fieldPath}`, checks, actualValue)
      );
    }

    return results;
  }

  /**
   * Valida o tempo de resposta.
   */
  private validateResponseTime(
    timeChecks: { less_than?: number; greater_than?: number },
    result: ExecutionResult
  ): AssertionResult[] {
    const results: AssertionResult[] = [];
    const actualTime = result.duration_ms;

    if (timeChecks.less_than !== undefined) {
      const passed = actualTime < timeChecks.less_than;
      results.push(
        this.createAssertionResult(
          "response_time_ms.less_than",
          timeChecks.less_than,
          actualTime,
          passed,
          passed
            ? undefined
            : `Tempo de resposta ${actualTime}ms excede o limite de ${timeChecks.less_than}ms`
        )
      );
    }

    if (timeChecks.greater_than !== undefined) {
      const passed = actualTime > timeChecks.greater_than;
      results.push(
        this.createAssertionResult(
          "response_time_ms.greater_than",
          timeChecks.greater_than,
          actualTime,
          passed,
          passed
            ? undefined
            : `Tempo de resposta ${actualTime}ms é menor que o mínimo de ${timeChecks.greater_than}ms`
        )
      );
    }

    return results;
  }

  /**
   * Valida um conjunto de checks para um campo específico.
   */
  private validateFieldChecks(
    fieldName: string,
    checks: AssertionChecks,
    actualValue: any
  ): AssertionResult[] {
    const results: AssertionResult[] = [];

    if (checks.equals !== undefined) {
      const passed = this.deepEqual(actualValue, checks.equals);
      results.push(
        this.createAssertionResult(
          `${fieldName}.equals`,
          checks.equals,
          actualValue,
          passed
        )
      );
    }

    if (checks.not_equals !== undefined) {
      const passed = !this.deepEqual(actualValue, checks.not_equals);
      results.push(
        this.createAssertionResult(
          `${fieldName}.not_equals`,
          `not ${checks.not_equals}`,
          actualValue,
          passed
        )
      );
    }

    if (checks.contains !== undefined) {
      const passed = this.contains(actualValue, checks.contains);
      results.push(
        this.createAssertionResult(
          `${fieldName}.contains`,
          checks.contains,
          actualValue,
          passed,
          passed ? undefined : `Valor não contém: ${checks.contains}`
        )
      );
    }

    if (checks.greater_than !== undefined) {
      const passed =
        typeof actualValue === "number" && actualValue > checks.greater_than;
      results.push(
        this.createAssertionResult(
          `${fieldName}.greater_than`,
          `> ${checks.greater_than}`,
          actualValue,
          passed
        )
      );
    }

    if (checks.less_than !== undefined) {
      const passed =
        typeof actualValue === "number" && actualValue < checks.less_than;
      results.push(
        this.createAssertionResult(
          `${fieldName}.less_than`,
          `< ${checks.less_than}`,
          actualValue,
          passed
        )
      );
    }

    if (checks.regex !== undefined) {
      const passed = this.matchesRegex(actualValue, checks.regex);
      results.push(
        this.createAssertionResult(
          `${fieldName}.regex`,
          checks.regex,
          actualValue,
          passed,
          passed
            ? undefined
            : `Valor não corresponde ao padrão: ${checks.regex}`
        )
      );
    }

    return results;
  }

  /**
   * Verifica se dois valores são profundamente iguais.
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Verifica se um valor contém outro (para strings, arrays, ou objetos).
   */
  private contains(haystack: any, needle: any): boolean {
    if (typeof haystack === "string" && typeof needle === "string") {
      return haystack.includes(needle);
    }

    if (Array.isArray(haystack)) {
      return haystack.some((item) => this.deepEqual(item, needle));
    }

    if (typeof haystack === "object" && haystack !== null) {
      return Object.values(haystack).some((value) =>
        this.deepEqual(value, needle)
      );
    }

    return false;
  }

  /**
   * Verifica se um valor corresponde a uma expressão regular.
   */
  private matchesRegex(value: any, pattern: string): boolean {
    if (typeof value !== "string") return false;

    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch {
      return false;
    }
  }

  /**
   * Cria um resultado de assertion padronizado.
   */
  private createAssertionResult(
    field: string,
    expected: any,
    actual: any,
    passed: boolean,
    message?: string
  ): AssertionResult {
    return {
      field,
      expected,
      actual,
      passed,
      message:
        message ||
        (passed ? "OK" : `Esperado: ${expected}, Recebido: ${actual}`),
    };
  }
}
