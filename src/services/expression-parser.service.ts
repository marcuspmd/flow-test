/**
 * @fileoverview Deterministic expression parser with clear prefix-based syntax.
 *
 * @remarks
 * This module provides a centralized parser that deterministically identifies
 * and processes different types of expressions based on clear prefixes:
 * - (no prefix): String literal
 * - `{{}}`: Template with variable interpolation
 * - `@`: JMESPath for JSON queries
 * - `$`: JavaScript for logic/computation
 * - `#faker.`: Faker.js for test data generation
 *
 * **Key Features:**
 * - Deterministic: Same input always produces the same type
 * - Clear prefixes eliminate ambiguity
 * - Comprehensive error detection for mixed syntax
 * - Debug/trace mode for understanding parsing decisions
 * - Validation warnings for potentially ambiguous expressions
 *
 * @packageDocumentation
 */

import { injectable, inject } from "inversify";
import { TYPES } from "../di/identifiers";
import { ILogger } from "../interfaces/services/ILogger";
import { InterpolationService, InterpolationContext } from "./interpolation.service";
import { JavaScriptService, JavaScriptExecutionContext } from "./javascript.service";
import { FakerService } from "./faker.service";
import * as jmespath from "jmespath";

/**
 * Type of expression detected by the parser
 */
export type ExpressionType =
  | "literal"
  | "template"
  | "jmespath"
  | "javascript"
  | "faker";

/**
 * Result of parsing an expression
 */
export interface ParseResult {
  /** Type of expression detected */
  type: ExpressionType;
  /** Original expression */
  expression: string;
  /** Resolved result value */
  result: any;
  /** Debug trace showing parsing steps (when debug enabled) */
  trace?: string[];
}

/**
 * Configuration for expression parser
 */
export interface ExpressionParserConfig {
  /** Enable debug/trace mode */
  debug?: boolean;
  /** Enable validation warnings */
  enableWarnings?: boolean;
  /** Strict mode - throw errors on ambiguous expressions */
  strict?: boolean;
}

/**
 * Context for expression parsing
 */
export interface ExpressionParserContext {
  /** Variable resolver function */
  variableResolver?: (path: string) => any;
  /** JavaScript execution context */
  javascriptContext?: JavaScriptExecutionContext;
  /** JMESPath data context (for @ expressions) */
  jmespathContext?: any;
  /** Suppress warnings */
  suppressWarnings?: boolean;
}

/**
 * Deterministic expression parser with prefix-based syntax
 *
 * @remarks
 * Provides a single, predictable way to parse and evaluate expressions.
 * The parser follows a strict order of detection based on clear prefixes,
 * ensuring that the same input always produces the same interpretation.
 *
 * **Detection Order:**
 * 1. Check for `#faker.` prefix → Faker expression
 * 2. Check for `@` prefix → JMESPath expression
 * 3. Check for `$` prefix → JavaScript expression
 * 4. Check for `{{` → Template expression
 * 5. Otherwise → String literal
 *
 * @example Basic usage
 * ```typescript
 * const parser = new ExpressionParserService(logger);
 *
 * // Literal
 * const literal = parser.parseExpression("hello world");
 * // { type: "literal", result: "hello world" }
 *
 * // Template
 * const template = parser.parseExpression("{{$env.API_URL}}/users");
 * // { type: "template", result: "https://api.example.com/users" }
 *
 * // JMESPath
 * const query = parser.parseExpression("@response.data[0].id", {
 *   jmespathContext: { response: { data: [{ id: 123 }] } }
 * });
 * // { type: "jmespath", result: 123 }
 *
 * // JavaScript
 * const calc = parser.parseExpression("$return items.length * 2", {
 *   javascriptContext: { variables: { items: [1, 2, 3] } }
 * });
 * // { type: "javascript", result: 6 }
 *
 * // Faker
 * const fake = parser.parseExpression("#faker.person.firstName");
 * // { type: "faker", result: "John" }
 * ```
 *
 * @public
 */
@injectable()
export class ExpressionParserService {
  private logger: ILogger;
  private config: Required<ExpressionParserConfig>;
  private interpolationService: InterpolationService;
  private javascriptService: JavaScriptService;
  private fakerService: FakerService;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    interpolationService?: InterpolationService,
    javascriptService?: JavaScriptService,
    fakerService?: FakerService
  ) {
    this.logger = logger;
    this.config = {
      debug: false,
      enableWarnings: true,
      strict: false,
    };
    this.interpolationService = interpolationService || new InterpolationService();
    this.javascriptService = javascriptService || new JavaScriptService();
    this.fakerService = fakerService || FakerService.getInstance();
  }

  /**
   * Configure the parser
   */
  configure(config: Partial<ExpressionParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Parse and evaluate an expression
   *
   * @param value - Expression to parse
   * @param context - Parsing context with resolvers
   * @returns Parse result with type and value
   */
  parseExpression(
    value: string,
    context: ExpressionParserContext = {}
  ): ParseResult {
    const trace: string[] = [];

    if (this.config.debug) {
      trace.push(`[PARSE] Input: "${value}"`);
    }

    // Validation: Check for mixed syntax
    const mixedSyntaxError = this.detectMixedSyntax(value);
    if (mixedSyntaxError) {
      const error = `Cannot mix prefixes in expression: ${mixedSyntaxError}`;
      trace.push(`[ERROR] ${error}`);
      throw new Error(error);
    }

    // Deterministic order of detection
    let result: ParseResult;

    // 1. Check for Faker prefix (#faker.)
    if (value.startsWith("#faker.")) {
      result = this.parseFaker(value, trace);
    }
    // 2. Check for JMESPath prefix (@)
    else if (value.startsWith("@")) {
      result = this.parseJMESPath(value, context, trace);
    }
    // 3. Check for JavaScript prefix ($)
    else if (value.startsWith("$")) {
      result = this.parseJavaScript(value, context, trace);
    }
    // 4. Check for Template ({{)
    else if (value.includes("{{")) {
      result = this.parseTemplate(value, context, trace);
    }
    // 5. String literal (no prefix)
    else {
      result = this.parseLiteral(value, trace);
    }

    // Add warnings for potentially ambiguous expressions
    if (this.config.enableWarnings && !context.suppressWarnings) {
      this.addAmbiguityWarnings(value, result, trace);
    }

    if (this.config.debug) {
      trace.push(`[RESULT] Type: ${result.type}, Value: ${JSON.stringify(result.result)}`);
      result.trace = trace;
      this.logger.debug(`Expression parsing trace:\n${trace.join("\n")}`);
    }

    return result;
  }

  /**
   * Parse a Faker expression (#faker.category.method)
   */
  private parseFaker(value: string, trace: string[]): ParseResult {
    if (this.config.debug) {
      trace.push(`[PARSE] Type: faker`);
    }

    // Remove #faker. prefix
    const fakerExpr = value.substring(1); // Remove '#', keep 'faker.'

    try {
      const result = this.fakerService.parseFakerExpression(fakerExpr);

      if (this.config.debug) {
        trace.push(`[FAKER] Method: ${fakerExpr}`);
        trace.push(`[FAKER] Result: ${JSON.stringify(result)}`);
      }

      return {
        type: "faker",
        expression: value,
        result,
        trace: this.config.debug ? trace : undefined,
      };
    } catch (error) {
      trace.push(`[FAKER] Error: ${error}`);
      throw new Error(`Failed to parse Faker expression "${value}": ${error}`);
    }
  }

  /**
   * Parse a JMESPath expression (@query)
   */
  private parseJMESPath(
    value: string,
    context: ExpressionParserContext,
    trace: string[]
  ): ParseResult {
    if (this.config.debug) {
      trace.push(`[PARSE] Type: jmespath`);
    }

    // Remove @ prefix
    const jmesPathExpr = value.substring(1);

    if (!jmesPathExpr) {
      throw new Error("JMESPath expression cannot be empty after @ prefix");
    }

    try {
      const data = context.jmespathContext || {};
      const result = jmespath.search(data, jmesPathExpr);

      if (this.config.debug) {
        trace.push(`[JMESPATH] Query: ${jmesPathExpr}`);
        trace.push(`[JMESPATH] Context: ${JSON.stringify(data).substring(0, 100)}...`);
        trace.push(`[JMESPATH] Result: ${JSON.stringify(result)}`);
      }

      return {
        type: "jmespath",
        expression: value,
        result,
        trace: this.config.debug ? trace : undefined,
      };
    } catch (error) {
      trace.push(`[JMESPATH] Error: ${error}`);
      throw new Error(`Failed to parse JMESPath expression "${value}": ${error}`);
    }
  }

  /**
   * Parse a JavaScript expression ($code)
   */
  private parseJavaScript(
    value: string,
    context: ExpressionParserContext,
    trace: string[]
  ): ParseResult {
    if (this.config.debug) {
      trace.push(`[PARSE] Type: javascript`);
    }

    // Remove $ prefix
    const jsExpr = value.substring(1);

    if (!jsExpr) {
      throw new Error("JavaScript expression cannot be empty after $ prefix");
    }

    try {
      // Check if it starts with "return " - if not, add it for expression evaluation
      const isReturn = jsExpr.trim().startsWith("return ");
      const codeToExecute = isReturn ? jsExpr : `return ${jsExpr}`;

      const result = this.javascriptService.executeExpression(
        codeToExecute,
        context.javascriptContext || {},
        true // Execute as code block
      );

      if (this.config.debug) {
        trace.push(`[JAVASCRIPT] Code: ${jsExpr}`);
        trace.push(`[JAVASCRIPT] Executed: ${codeToExecute}`);
        trace.push(`[JAVASCRIPT] Result: ${JSON.stringify(result)}`);
      }

      return {
        type: "javascript",
        expression: value,
        result,
        trace: this.config.debug ? trace : undefined,
      };
    } catch (error) {
      trace.push(`[JAVASCRIPT] Error: ${error}`);
      throw new Error(`Failed to parse JavaScript expression "${value}": ${error}`);
    }
  }

  /**
   * Parse a template expression ({{variable}})
   */
  private parseTemplate(
    value: string,
    context: ExpressionParserContext,
    trace: string[]
  ): ParseResult {
    if (this.config.debug) {
      trace.push(`[PARSE] Type: template`);
    }

    try {
      const interpolationContext: InterpolationContext = {
        variableResolver: context.variableResolver || (() => undefined),
        javascriptContext: context.javascriptContext,
        suppressWarnings: context.suppressWarnings,
      };

      const result = this.interpolationService.interpolate(value, interpolationContext);

      if (this.config.debug) {
        trace.push(`[TEMPLATE] Expression: ${value}`);
        trace.push(`[TEMPLATE] Result: ${JSON.stringify(result)}`);
      }

      return {
        type: "template",
        expression: value,
        result,
        trace: this.config.debug ? trace : undefined,
      };
    } catch (error) {
      trace.push(`[TEMPLATE] Error: ${error}`);
      throw new Error(`Failed to parse template expression "${value}": ${error}`);
    }
  }

  /**
   * Parse a string literal (no prefix)
   */
  private parseLiteral(value: string, trace: string[]): ParseResult {
    if (this.config.debug) {
      trace.push(`[PARSE] Type: literal`);
      trace.push(`[LITERAL] Value: ${value}`);
    }

    return {
      type: "literal",
      expression: value,
      result: value,
      trace: this.config.debug ? trace : undefined,
    };
  }

  /**
   * Detect mixed syntax errors
   */
  private detectMixedSyntax(value: string): string | null {
    const prefixes: Array<{ prefix: string; name: string; test: (v: string) => boolean }> = [
      { prefix: "#faker.", name: "Faker", test: (v) => v.includes("#faker.") },
      { prefix: "@", name: "JMESPath", test: (v) => v.startsWith("@") },
      { prefix: "$", name: "JavaScript", test: (v) => v.startsWith("$") && !v.startsWith("$env.") && !v.startsWith("$faker.") },
    ];

    const detected: string[] = [];
    for (const { name, test } of prefixes) {
      if (test(value)) {
        detected.push(name);
      }
    }

    // Check for mixing @ or $ with #faker
    if (detected.length > 1) {
      return `Found ${detected.join(" and ")} in same expression. Split into separate fields.`;
    }

    // Check for @ or $ inside templates (when not at start)
    if (value.includes("{{")) {
      // This is okay - templates can contain variables
      // But @ and $ prefixes should not be used inside {{}}
      const templateMatch = value.match(/\{\{([^}]+)\}\}/g);
      if (templateMatch) {
        for (const match of templateMatch) {
          const inner = match.slice(2, -2);
          // Check if inner content starts with @ or $ (not $env or $faker which are valid)
          if (
            (inner.startsWith("@") ||
              (inner.startsWith("$") &&
                !inner.startsWith("$env.") &&
                !inner.startsWith("$faker.") &&
                !inner.startsWith("$js:")))
          ) {
            return `Cannot use ${inner.charAt(0)} prefix inside {{}}. Use prefix outside template or use appropriate template syntax.`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Add warnings for potentially ambiguous expressions
   */
  private addAmbiguityWarnings(
    value: string,
    result: ParseResult,
    trace: string[]
  ): void {
    // Warn if looks like JMESPath but doesn't have @ prefix
    if (
      result.type === "literal" &&
      /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+(\[\d+\]|\[.+\])?/.test(value)
    ) {
      const warning = `Looks like JMESPath query. Add @ prefix for JSON query, or wrap in quotes for literal string.`;
      trace.push(`[WARNING] ${warning}`);
      this.logger.warn(`Ambiguous expression "${value}": ${warning}`);
    }

    // Warn if looks like JavaScript but doesn't have $ prefix
    if (
      result.type === "literal" &&
      (value.includes("return ") || /^(Math\.|Date\.|JSON\.)/.test(value))
    ) {
      const warning = `Looks like JavaScript expression. Add $ prefix to execute as code.`;
      trace.push(`[WARNING] ${warning}`);
      this.logger.warn(`Ambiguous expression "${value}": ${warning}`);
    }

    // Warn if looks like Faker but doesn't have #faker prefix
    if (
      result.type === "literal" &&
      /^faker\.[a-z]+\.[a-z]+/i.test(value)
    ) {
      const warning = `Looks like Faker expression. Add # prefix (#faker.category.method) for data generation.`;
      trace.push(`[WARNING] ${warning}`);
      this.logger.warn(`Ambiguous expression "${value}": ${warning}`);
    }
  }

  /**
   * Parse a value that could be of any type
   *
   * @remarks
   * This is a convenience method that handles strings and non-strings.
   * For non-strings, returns them as-is (literals).
   * For strings, uses parseExpression.
   */
  parseValue(value: any, context: ExpressionParserContext = {}): ParseResult {
    if (typeof value !== "string") {
      return {
        type: "literal",
        expression: String(value),
        result: value,
      };
    }

    return this.parseExpression(value, context);
  }

  /**
   * Parse multiple expressions in batch
   */
  parseExpressions(
    values: Record<string, any>,
    context: ExpressionParserContext = {}
  ): Record<string, ParseResult> {
    const results: Record<string, ParseResult> = {};

    for (const [key, value] of Object.entries(values)) {
      results[key] = this.parseValue(value, context);
    }

    return results;
  }

  /**
   * Get a quick reference guide for syntax
   */
  static getSyntaxGuide(): string {
    return `
┌──────────────────────────┬────────────────┬──────────────────────────┐
│ Quero gerar...           │ Uso...         │ Exemplo                  │
├──────────────────────────┼────────────────┼──────────────────────────┤
│ Texto fixo               │ "texto"        │ "Hello World"            │
│ Variável/Template        │ {{var}}        │ {{$env.URL}}/{{id}}      │
│ Consulta JSON            │ @query         │ @response.data[0].id     │
│ Cálculo/Lógica           │ $código        │ $return x * 2            │
│ Dado falso (teste)       │ #faker.tipo    │ #faker.internet.email    │
└──────────────────────────┴────────────────┴──────────────────────────┘

FAKER MAIS USADOS:
• #faker.person.fullName     → "João Silva"
• #faker.internet.email      → "joao@example.com"  
• #faker.phone.number        → "(11) 98765-4321"
• #faker.string.uuid         → "a5f3c2d1-..."
• #faker.number.int({min,max})→ 42
• #faker.lorem.paragraph     → "Lorem ipsum..."
• #faker.date.recent         → "2025-01-29T10:30:00Z"
`;
  }
}
