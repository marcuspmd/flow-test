# Guia de Migração - Schemas Zod

Este guia mostra como migrar código existente para utilizar os schemas Zod para validação runtime.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Quando Usar Schemas](#quando-usar-schemas)
3. [Migrações por Componente](#migrações-por-componente)
4. [Exemplos Antes/Depois](#exemplos-antesdepois)
5. [FAQ](#faq)

## 🎯 Visão Geral

Os schemas Zod complementam os tipos TypeScript existentes, adicionando validação runtime. Você pode adotar gradualmente sem quebrar código existente.

### Estratégia de Adoção

**Fase 1** - Validar entradas externas (arquivos YAML, configurações)
**Fase 2** - Validar pontos de integração (APIs, serviços externos)
**Fase 3** - Validar dados críticos (resultados de execução, relatórios)

## 🔍 Quando Usar Schemas

### ✅ Use Schemas Para:

- ✅ Carregar arquivos YAML ou JSON
- ✅ Validar configurações do usuário
- ✅ Processar dados de APIs externas
- ✅ Validar resultados antes de salvar
- ✅ Debugging de dados em produção

### ❌ Não Precisa de Schemas Para:

- ❌ Dados já validados em etapas anteriores
- ❌ Tipos internos do TypeScript (já verificados em compile-time)
- ❌ Dados hardcoded ou constantes
- ❌ Performance crítica loops (use type assertions)

## 🔧 Migrações por Componente

### 1. Discovery Service

**Antes:**
```typescript
// src/core/discovery.ts
import * as yaml from 'js-yaml';
import { TestSuite } from '../types/engine.types';

export class DiscoveryService {
  loadSuite(filePath: string): TestSuite {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content) as TestSuite; // ⚠️ Sem validação!
  }
}
```

**Depois:**
```typescript
// src/core/discovery.ts
import * as yaml from 'js-yaml';
import { TestSuite } from '../types/engine.types';
import { TestSuiteSchema, SchemaUtils } from '../schemas';

export class DiscoveryService {
  loadSuite(filePath: string): TestSuite {
    const content = fs.readFileSync(filePath, 'utf8');
    const rawData = yaml.load(content);
    
    // ✅ Validação com mensagem clara
    return SchemaUtils.validateOrThrow(
      TestSuiteSchema,
      rawData,
      `Loading test suite from ${filePath}`
    );
  }
}
```

### 2. Config Loader

**Antes:**
```typescript
// src/core/config.ts
import { EngineConfig } from '../types/config.types';

export class ConfigService {
  loadConfig(path: string): EngineConfig {
    const configData = yaml.load(fs.readFileSync(path, 'utf8'));
    return configData as EngineConfig; // ⚠️ Type assertion sem validação
  }
}
```

**Depois:**
```typescript
// src/core/config.ts
import { EngineConfig } from '../types/config.types';
import { EngineConfigSchema, SchemaUtils } from '../schemas';

export class ConfigService {
  loadConfig(path: string): EngineConfig {
    const configData = yaml.load(fs.readFileSync(path, 'utf8'));
    
    const result = SchemaUtils.parseWithErrors(EngineConfigSchema, configData);
    
    if (!result.success) {
      const errors = result.errors?.join('\n  - ') || 'Unknown error';
      throw new Error(
        `Invalid configuration in ${path}:\n  - ${errors}\n\n` +
        `Please check your configuration file.`
      );
    }
    
    return result.data!;
  }
}
```

### 3. HTTP Service

**Antes:**
```typescript
// src/services/http.service.ts
import { RequestDetails } from '../types/engine.types';

export class HttpService {
  async executeRequest(stepName: string, request: RequestDetails) {
    // ⚠️ Confia que request está correto
    const response = await axios({
      method: request.method,
      url: request.url,
      headers: request.headers,
      data: request.body
    });
    return response;
  }
}
```

**Depois:**
```typescript
// src/services/http.service.ts
import { RequestDetails } from '../types/engine.types';
import { RequestDetailsSchema } from '../schemas';

export class HttpService {
  async executeRequest(stepName: string, request: RequestDetails) {
    // ✅ Validar request (detecta erros antes de fazer HTTP call)
    const validated = RequestDetailsSchema.parse(request);
    
    const response = await axios({
      method: validated.method,
      url: validated.url,
      headers: validated.headers,
      data: validated.body
    });
    return response;
  }
}
```

### 4. Execution Service

**Antes:**
```typescript
// src/services/execution.service.ts
export class ExecutionService {
  async executeSuite(suite: TestSuite): Promise<SuiteExecutionResult> {
    // Processa suite sem validação prévia
    const results = await this.runSteps(suite.steps);
    return this.buildResult(results);
  }
}
```

**Depois:**
```typescript
// src/services/execution.service.ts
import { TestSuiteSchema, SchemaUtils } from '../schemas';

export class ExecutionService {
  async executeSuite(suite: unknown): Promise<SuiteExecutionResult> {
    // ✅ Validar suite antes de executar
    const result = SchemaUtils.parseWithErrors(TestSuiteSchema, suite);
    
    if (!result.success) {
      return this.buildErrorResult(
        `Suite validation failed: ${result.errors?.join(', ')}`
      );
    }
    
    const validatedSuite = result.data!;
    const results = await this.runSteps(validatedSuite.steps);
    return this.buildResult(results);
  }
}
```

### 5. Report Writer

**Antes:**
```typescript
// src/services/reporting.service.ts
export class ReportingService {
  saveResults(results: SuiteExecutionResult[], outputPath: string) {
    // Salva sem validar
    fs.writeFileSync(
      outputPath,
      JSON.stringify(results, null, 2)
    );
  }
}
```

**Depois:**
```typescript
// src/services/reporting.service.ts
import { SuiteExecutionResultSchema } from '../schemas';

export class ReportingService {
  saveResults(results: unknown[], outputPath: string) {
    // ✅ Validar cada resultado antes de salvar
    const validatedResults = results.map((result, index) => {
      try {
        return SuiteExecutionResultSchema.parse(result);
      } catch (error: any) {
        throw new Error(
          `Invalid result at index ${index}: ${error.message}`
        );
      }
    });
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify(validatedResults, null, 2)
    );
  }
}
```

## 📝 Exemplos Antes/Depois

### Exemplo 1: Carregamento de Suite

**❌ Antes (Sem Validação)**
```typescript
function loadTestSuite(filePath: string): TestSuite {
  const yaml = require('js-yaml');
  const fs = require('fs');
  
  const data = yaml.load(fs.readFileSync(filePath, 'utf8'));
  
  // ⚠️ Problema: Se o YAML tiver erro, só vai falhar na execução
  return data as TestSuite;
}

// Uso
try {
  const suite = loadTestSuite('./test.yaml');
  // Erro só aparece aqui, longe da origem
  await executeSuite(suite);
} catch (error) {
  // Mensagem de erro genérica, difícil debugar
  console.error('Execution failed:', error);
}
```

**✅ Depois (Com Validação)**
```typescript
import { TestSuiteSchema, SchemaUtils } from '../schemas';

function loadTestSuite(filePath: string): TestSuite {
  const yaml = require('js-yaml');
  const fs = require('fs');
  
  const data = yaml.load(fs.readFileSync(filePath, 'utf8'));
  
  // ✅ Validação imediata com erro claro
  return SchemaUtils.validateOrThrow(
    TestSuiteSchema,
    data,
    `Loading ${filePath}`
  );
}

// Uso
try {
  const suite = loadTestSuite('./test.yaml');
  await executeSuite(suite);
} catch (error) {
  // Mensagem detalhada: "Loading ./test.yaml: steps.0.request.method: Invalid enum value"
  console.error(error.message);
}
```

### Exemplo 2: Validação de Request

**❌ Antes**
```typescript
function createRequest(data: any): RequestDetails {
  // ⚠️ Confia cegamente nos dados
  return {
    method: data.method,
    url: data.url,
    headers: data.headers,
    body: data.body
  };
}

// Se method for inválido, erro só aparece no axios
const request = createRequest({ method: 'INVALID', url: '/api' });
```

**✅ Depois**
```typescript
import { RequestDetailsSchema } from '../schemas';

function createRequest(data: unknown): RequestDetails {
  // ✅ Validação imediata
  return RequestDetailsSchema.parse(data);
}

// Erro claro: "method: Invalid enum value. Expected 'GET' | 'POST'..."
const request = createRequest({ method: 'INVALID', url: '/api' });
```

### Exemplo 3: Validação Condicional

**Antes:**
```typescript
function processData(data: any) {
  // Validação manual propensa a erros
  if (!data.suite_name || typeof data.suite_name !== 'string') {
    throw new Error('Invalid suite_name');
  }
  if (!Array.isArray(data.steps)) {
    throw new Error('Invalid steps');
  }
  // ... mais 50 linhas de validação manual
}
```

**Depois:**
```typescript
import { TestSuiteSchema } from '../schemas';

function processData(data: unknown) {
  // ✅ Validação completa em 1 linha
  const suite = TestSuiteSchema.parse(data);
  // Todos os campos já validados!
}
```

## 🚀 Padrões Recomendados

### Pattern 1: Validar na Borda (Boundary)

```typescript
// ✅ BOM - Validar ao receber dados externos
export function loadExternalData(source: string): ValidatedData {
  const rawData = fetchFromExternal(source);
  return DataSchema.parse(rawData); // Validação na borda
}

// Dentro do sistema, dados já são válidos
function processValidatedData(data: ValidatedData) {
  // Não precisa validar novamente
  return data.someField.toUpperCase();
}
```

### Pattern 2: Fail Fast com Mensagens Claras

```typescript
// ✅ BOM - Falhar cedo com contexto
export function loadConfig(path: string): Config {
  try {
    const data = yaml.load(fs.readFileSync(path, 'utf8'));
    return ConfigSchema.parse(data);
  } catch (error: any) {
    throw new Error(
      `Failed to load configuration from ${path}:\n${error.message}\n\n` +
      `Please check your configuration file for errors.`
    );
  }
}
```

### Pattern 3: Validação Defensiva em APIs Públicas

```typescript
// ✅ BOM - Validar em métodos públicos de serviços
export class TestRunner {
  // Método público - validar entrada
  public async runSuite(suite: unknown): Promise<Result> {
    const validSuite = TestSuiteSchema.parse(suite);
    return this.executeValidatedSuite(validSuite);
  }
  
  // Método privado - dados já validados
  private async executeValidatedSuite(suite: TestSuite): Promise<Result> {
    // Não precisa validar novamente
    return this.runSteps(suite.steps);
  }
}
```

## ❓ FAQ

### P: Preciso validar dados em todos os lugares?

**R:** Não! Valide nas "bordas" do sistema (entradas externas) e confie nos tipos TypeScript internamente.

### P: A validação não vai deixar tudo mais lento?

**R:** A validação tem custo mínimo comparado com operações de I/O (ler arquivos, fazer requests HTTP). Valide uma vez ao carregar dados, não em loops.

### P: Posso misturar tipos TypeScript e schemas Zod?

**R:** Sim! Use `z.infer<typeof Schema>` para extrair o tipo TypeScript de um schema.

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

// Extrair tipo TypeScript
type User = z.infer<typeof UserSchema>;

// Agora User é equivalente a: { name: string; age: number }
```

### P: O que fazer com código legado?

**R:** Adicione validação gradualmente, começando pelos pontos de entrada (YAML, configs). Não precisa validar código interno imediatamente.

### P: Como debugar erros de validação?

**R:** Use `safeParse()` para ver todos os erros:

```typescript
const result = schema.safeParse(data);
if (!result.success) {
  console.log('Validation errors:', result.error.errors);
  // Mostra todos os campos inválidos
}
```

### P: Schemas afetam o bundle size?

**R:** Zod adiciona ~12KB minificado + gzipped. É mínimo comparado aos benefícios de validação runtime.

## 📚 Recursos Adicionais

- [README dos Schemas](./README.md) - Guia completo de uso
- [Exemplos Práticos](./examples.ts) - Código de exemplo
- [Documentação Zod](https://zod.dev) - Referência completa

## 🎯 Checklist de Migração

Use este checklist para migrar cada componente:

- [ ] Identificar onde dados externos entram no sistema
- [ ] Importar schema apropriado de `../schemas`
- [ ] Substituir `as Type` por `Schema.parse()`
- [ ] Adicionar tratamento de erro apropriado
- [ ] Testar com dados inválidos
- [ ] Verificar mensagens de erro são claras
- [ ] Documentar mudança no código

---

**Dúvidas?** Consulte os [exemplos práticos](./examples.ts) ou a [documentação completa](./README.md).
