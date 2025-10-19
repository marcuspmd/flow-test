# Zod Schemas - Flow Test Engine

Este diretório contém schemas Zod para validação runtime de todos os tipos utilizados no Flow Test Engine. Os schemas fornecem validação de dados, inferência de tipos TypeScript e documentação executável.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Instalação](#instalação)
- [Módulos Disponíveis](#módulos-disponíveis)
- [Uso Básico](#uso-básico)
- [Exemplos Práticos](#exemplos-práticos)
- [Utilitários](#utilitários)
- [Melhores Práticas](#melhores-práticas)

## 🎯 Visão Geral

Os schemas Zod fornecem:

- ✅ **Validação Runtime**: Valide dados em tempo de execução, não apenas em tempo de compilação
- ✅ **Type Safety**: Inferência automática de tipos TypeScript a partir dos schemas
- ✅ **Mensagens de Erro Claras**: Erros detalhados e fáceis de entender
- ✅ **Documentação**: Schemas servem como documentação viva do sistema
- ✅ **Compatibilidade**: Totalmente compatível com os tipos TypeScript existentes

## 📦 Instalação

Os schemas já estão incluídos no pacote. Zod é uma dependência do projeto:

```bash
npm install zod@^3.22.0
```

## 📁 Módulos Disponíveis

### 1. `common.schemas.ts`
Schemas para tipos compartilhados e variáveis dinâmicas:
- `DynamicVariableDefinitionSchema`
- `DynamicVariableAssignmentSchema`
- `InputValidationConfigSchema`
- `InputDynamicConfigSchema`

### 2. `engine.schemas.ts`
Schemas principais do motor de testes:
- `TestSuiteSchema` - Definição completa de suite de testes
- `TestStepSchema` - Definição de step individual
- `RequestDetailsSchema` - Configuração de requisições HTTP
- `AssertionsSchema` - Validações de resposta
- `ConditionalScenarioSchema` - Cenários condicionais

### 3. `config.schemas.ts`
Schemas de configuração e resultados:
- `EngineConfigSchema` - Configuração global do engine
- `ExecutionConfigSchema` - Configuração de execução
- `ReportingConfigSchema` - Configuração de relatórios
- `StepExecutionResultSchema` - Resultado de execução de step
- `SuiteExecutionResultSchema` - Resultado de execução de suite

### 4. `call.schemas.ts`
Schemas para chamadas cross-suite:
- `StepCallConfigSchema` - Configuração de chamada de step
- `StepCallResultSchema` - Resultado de chamada
- `StepCallExecutionOptionsSchema` - Opções de execução

### 5. `swagger.schemas.ts`
Schemas OpenAPI/Swagger completos:
- `OpenAPISpecSchema` - Especificação OpenAPI completa
- `OpenAPIOperationSchema` - Operação/endpoint
- `OpenAPISchemaObjectSchema` - Schema de dados
- `SwaggerParseResultSchema` - Resultado de parsing

## 🚀 Uso Básico

### Importar Schemas

```typescript
// Importar schemas específicos
import { TestSuiteSchema, TestStepSchema } from './schemas';

// Importar todos os schemas
import * as Schemas from './schemas';

// Importar utilitários
import { SchemaUtils } from './schemas';
```

### Validar Dados

```typescript
import { TestSuiteSchema } from './schemas';

// Parse com exceção em caso de erro
const suite = TestSuiteSchema.parse(yamlData);

// Parse seguro (retorna null em erro)
const result = TestSuiteSchema.safeParse(yamlData);
if (result.success) {
  console.log('Suite válida:', result.data);
} else {
  console.error('Erro de validação:', result.error);
}
```

### Inferir Tipos

```typescript
import { z } from 'zod';
import { TestSuiteSchema } from './schemas';

// Tipo inferido automaticamente do schema
type TestSuite = z.infer<typeof TestSuiteSchema>;

// Ou usar o tipo exportado
import { type TestSuite } from './schemas';
```

## 💡 Exemplos Práticos

### Exemplo 1: Validar Configuração YAML

```typescript
import { EngineConfigSchema, SchemaUtils } from './schemas';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

// Carregar arquivo YAML
const configFile = fs.readFileSync('flow-test.config.yml', 'utf8');
const configData = yaml.load(configFile);

// Validar com mensagens de erro detalhadas
const result = SchemaUtils.parseWithErrors(EngineConfigSchema, configData);

if (result.success) {
  const config = result.data;
  console.log(`Projeto: ${config.project_name}`);
  console.log(`Diretório de testes: ${config.test_directory}`);
} else {
  console.error('Erros de validação:');
  result.errors?.forEach(err => console.error(`  - ${err}`));
}
```

### Exemplo 2: Validar Suite de Testes

```typescript
import { TestSuiteSchema } from './schemas';

const suiteData = {
  node_id: 'user-api-test',
  suite_name: 'User API Tests',
  base_url: 'https://api.example.com',
  steps: [
    {
      name: 'Get user',
      request: {
        method: 'GET',
        url: '/users/123'
      },
      assert: {
        status_code: 200,
        body: {
          id: { type: 'number', exists: true }
        }
      }
    }
  ]
};

try {
  const suite = TestSuiteSchema.parse(suiteData);
  console.log('Suite válida!', suite);
} catch (error) {
  console.error('Erro de validação:', error);
}
```

### Exemplo 3: Validar Request com Tipo Seguro

```typescript
import { RequestDetailsSchema, type RequestDetails } from './schemas';

function executeRequest(request: RequestDetails) {
  // request é type-safe aqui
  console.log(`${request.method} ${request.url}`);
}

// Validar e usar
const requestData = {
  method: 'POST',
  url: '/api/users',
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
};

const request = RequestDetailsSchema.parse(requestData);
executeRequest(request);
```

### Exemplo 4: Validar Resultado de Execução

```typescript
import { StepExecutionResultSchema } from './schemas';

function logStepResult(result: unknown) {
  const validatedResult = StepExecutionResultSchema.parse(result);
  
  console.log(`Step: ${validatedResult.step_name}`);
  console.log(`Status: ${validatedResult.status}`);
  console.log(`Duration: ${validatedResult.duration_ms}ms`);
  
  if (validatedResult.error_message) {
    console.error(`Error: ${validatedResult.error_message}`);
  }
}
```

### Exemplo 5: Validação com Transformação

```typescript
import { z } from 'zod';
import { TestStepMetadataSchema } from './schemas';

// Extender schema com transformação
const EnhancedMetadataSchema = TestStepMetadataSchema.extend({
  created_at: z.string().datetime()
}).transform(data => ({
  ...data,
  created_at: new Date(data.created_at)
}));

const metadata = EnhancedMetadataSchema.parse({
  priority: 'high',
  tags: ['smoke', 'api'],
  created_at: '2024-01-15T10:30:00Z'
});

console.log(metadata.created_at instanceof Date); // true
```

## 🛠️ Utilitários

### `SchemaUtils.safeParse()`

Validação segura que retorna `null` em caso de erro:

```typescript
import { SchemaUtils, TestSuiteSchema } from './schemas';

const suite = SchemaUtils.safeParse(TestSuiteSchema, data);
if (suite) {
  // Uso seguro do suite
  console.log(suite.suite_name);
} else {
  console.error('Dados inválidos');
}
```

### `SchemaUtils.parseWithErrors()`

Validação com mensagens de erro formatadas:

```typescript
import { SchemaUtils, EngineConfigSchema } from './schemas';

const result = SchemaUtils.parseWithErrors(EngineConfigSchema, data);
if (result.success) {
  console.log('Config válida:', result.data);
} else {
  console.error('Erros encontrados:');
  result.errors?.forEach(err => console.error(`  - ${err}`));
}
```

### `SchemaUtils.validateOrThrow()`

Validação que lança exceção com contexto:

```typescript
import { SchemaUtils, TestStepSchema } from './schemas';

try {
  const step = SchemaUtils.validateOrThrow(
    TestStepSchema,
    stepData,
    'Validação de Step'
  );
  // Usar step validado
} catch (error) {
  console.error(error.message);
  // "Validação de Step: name: Required"
}
```

## 📚 Melhores Práticas

### 1. Sempre Valide Dados Externos

```typescript
// ✅ BOM - Valida dados YAML antes de usar
const configData = yaml.load(configFile);
const config = EngineConfigSchema.parse(configData);

// ❌ RUIM - Usa dados sem validar
const config = yaml.load(configFile);
```

### 2. Use Type Inference

```typescript
// ✅ BOM - Tipo inferido do schema
import { type TestSuite } from './schemas';

// ❌ RUIM - Tipo duplicado manualmente
interface TestSuite {
  node_id: string;
  suite_name: string;
  // ... duplicação de definição
}
```

### 3. Valide em Pontos de Entrada

```typescript
// ✅ BOM - Valida no ponto de entrada
export function loadTestSuite(filePath: string) {
  const data = yaml.load(fs.readFileSync(filePath, 'utf8'));
  return TestSuiteSchema.parse(data); // Validação aqui
}

// ❌ RUIM - Passa dados não validados adiante
export function loadTestSuite(filePath: string) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}
```

### 4. Use Validação Segura em Operações Opcionais

```typescript
// ✅ BOM - Tratamento de erro gracioso
const suite = SchemaUtils.safeParse(TestSuiteSchema, data);
if (!suite) {
  console.warn('Suite inválida, usando defaults');
  return defaultSuite;
}

// ❌ RUIM - Pode crashar a aplicação
const suite = TestSuiteSchema.parse(data);
```

### 5. Combine Schemas para Casos Específicos

```typescript
// ✅ BOM - Reutiliza e estende schemas existentes
const CustomStepSchema = TestStepSchema.extend({
  custom_field: z.string().optional()
});

// ✅ BOM - Compõe schemas menores
const PartialRequestSchema = RequestDetailsSchema.pick({
  method: true,
  url: true
});
```

## 🔍 Debugging

### Ver Erros Detalhados

```typescript
import { TestSuiteSchema } from './schemas';

const result = TestSuiteSchema.safeParse(data);
if (!result.success) {
  console.error('Erros de validação:');
  result.error.errors.forEach(err => {
    console.error(`Campo: ${err.path.join('.')}`);
    console.error(`Mensagem: ${err.message}`);
    console.error(`Código: ${err.code}`);
  });
}
```

### Validação Parcial

```typescript
// Validar apenas parte de um schema
const PartialSuiteSchema = TestSuiteSchema.partial();

// Agora todos os campos são opcionais
const partialSuite = PartialSuiteSchema.parse({
  node_id: 'test-1'
  // suite_name não é mais obrigatório
});
```

## 🤝 Contribuindo

Para adicionar novos schemas:

1. Crie o schema no arquivo apropriado (`engine.schemas.ts`, `config.schemas.ts`, etc.)
2. Adicione documentação JSDoc completa
3. Inclua exemplos de uso
4. Exporte o schema e seu tipo no `index.ts`
5. Adicione testes para o schema

## 📖 Recursos Adicionais

- [Documentação oficial do Zod](https://zod.dev)
- [Guia de validação TypeScript](https://github.com/colinhacks/zod#readme)
- [Exemplos avançados de Zod](https://github.com/colinhacks/zod/tree/master/deno/lib/__tests__)

---

**Nota**: Todos os schemas são totalmente compatíveis com os tipos TypeScript existentes em `src/types/`. Use os schemas para validação runtime e os tipos para anotações de tipo estáticas.
