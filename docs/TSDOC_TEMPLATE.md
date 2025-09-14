# TSDoc Documentation Template

Este documento fornece templates e diretrizes para documentação TSDoc no projeto Flow Test Engine.

## Template para Classes

```typescript
/**
 * Brief description of the class purpose
 *
 * More detailed description explaining what this class does,
 * its main responsibilities, and how it fits in the system architecture.
 * Include usage patterns and important behavior notes.
 *
 * @example
 * ```typescript
 * // Basic usage example
 * const instance = new MyClass(param1, param2);
 * const result = await instance.mainMethod();
 * console.log(result);
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage example
 * const instance = new MyClass(param1, param2);
 * instance.configure({ option: 'value' });
 * const result = await instance.advancedMethod(data);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class MyClass {
```

## Template para Métodos

```typescript
/**
 * Brief description of what this method does
 *
 * More detailed explanation of the method's behavior,
 * side effects, and important considerations.
 *
 * @param paramName - Description of what this parameter is for
 * @param optionalParam - Optional parameter description
 * @returns Description of what is returned
 * @throws {ErrorType} Description of when this error occurs
 *
 * @example
 * ```typescript
 * const result = await instance.methodName(param1, param2);
 * if (result.success) {
 *   console.log('Operation successful');
 * }
 * ```
 *
 * @see {@link RelatedClass} for related functionality
 * @since 1.0.0
 */
public async methodName(paramName: string, optionalParam?: number): Promise<Result> {
```

## Template para Interfaces

```typescript
/**
 * Brief description of what this interface represents
 *
 * Detailed explanation of when and how to use this interface,
 * what it represents in the domain, and any important constraints.
 *
 * @example
 * ```typescript
 * const config: MyInterface = {
 *   property1: 'value',
 *   property2: 42,
 *   optionalProperty: true
 * };
 * ```
 *
 * @public
 */
export interface MyInterface {
  /**
   * Description of this property's purpose and expected values
   *
   * @example "https://api.example.com"
   */
  property1: string;

  /**
   * Description of this property
   *
   * @remarks Must be a positive integer
   * @defaultValue 0
   */
  property2: number;

  /**
   * Optional property description
   *
   * @defaultValue false
   */
  optionalProperty?: boolean;
}
```

## Template para Types

```typescript
/**
 * Brief description of this type alias
 *
 * Explanation of what this type represents and when to use it.
 * Include information about the union members or structure.
 *
 * @example
 * ```typescript
 * const status: ExecutionStatus = 'completed';
 * // or
 * const status: ExecutionStatus = 'failed';
 * ```
 *
 * @public
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';
```

## Template para Enums

```typescript
/**
 * Brief description of what this enum represents
 *
 * Detailed explanation of the different values and their meanings.
 * Include usage guidelines and any important constraints.
 *
 * @example
 * ```typescript
 * if (result.level === LogLevel.ERROR) {
 *   console.error('Critical error occurred');
 * }
 * ```
 *
 * @public
 */
export enum LogLevel {
  /** Debug information for development */
  DEBUG = 'debug',

  /** General information messages */
  INFO = 'info',

  /** Warning messages that don't stop execution */
  WARN = 'warn',

  /** Error messages for failures */
  ERROR = 'error'
}
```

## Tags Recomendados

### Classificação
- `@public` - API pública
- `@internal` - Uso interno apenas
- `@beta` - Funcionalidade em beta
- `@deprecated` - Funcionalidade descontinuada

### Versionamento
- `@since version` - Versão em que foi introduzido
- `@version` - Versão atual da funcionalidade

### Documentação
- `@example` - Exemplos de código
- `@remarks` - Observações importantes
- `@see` - Referências relacionadas
- `@throws` - Exceções que podem ser lançadas
- `@returns` - Descrição do retorno
- `@param` - Descrição dos parâmetros
- `@defaultValue` - Valor padrão

### Categorização (para TypeDoc)
- `@category "Core"` - Componentes principais
- `@category "Services"` - Serviços
- `@category "Types"` - Definições de tipos
- `@category "Utils"` - Utilitários

## Diretrizes de Escrita

### Estilo
1. Use português para descrições quando apropriado
2. Primeira linha deve ser um resumo conciso
3. Exemplos devem ser funcionais e relevantes
4. Inclua informações sobre side effects
5. Documente exceções que podem ocorrer

### Estrutura
1. Resumo (primeira linha)
2. Descrição detalhada (parágrafo)
3. Parâmetros (@param)
4. Retorno (@returns)
5. Exceções (@throws)
6. Exemplos (@example)
7. Referências (@see)
8. Metadados (@since, @category, etc.)

### Exemplos
- Devem ser completos e executáveis
- Incluir imports necessários se relevante
- Mostrar casos de uso comuns
- Incluir tratamento de erros quando apropriado

## Validação

Para validar a documentação:
```bash
npm run docs:check
```

Para gerar documentação:
```bash
npm run docs:typedoc
```