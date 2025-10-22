# Fix: Export de Variáveis de Input

## Problema

Variáveis definidas via `input` interativo não estavam sendo exportadas corretamente, mesmo quando listadas em `exports`, causando o erro:

```
[ERROR] ⚠️  Export 'benefitId' not found in captured variables for suite 'Dataprev - Listar benefícios do CPF'
```

## Análise da Causa Raiz

O problema estava relacionado ao **timing da captura de exports**:

### Fluxo Original (Com Bug):
1. `executeSingleTest(Suite)` executa → steps definem variáveis runtime
2. `executeSingleTest` **retorna o resultado**
3. `captureAndRegisterExports` é chamado **após** a suite terminar
4. Mas `executeSingleTest` já montou `variables_captured: this.getExportedVariables()` **antes** do export!
5. Resultado: variáveis de input não eram exportadas

### Raiz do Problema:
- Variáveis de input eram armazenadas em **runtime scope** ✅
- Também eram adicionadas a `captured_variables` do step ✅
- Mas `captureAndRegisterExports` era chamado **DEPOIS** que `executeSingleTest` já tinha construído o resultado final
- Isso criava um **chicken-and-egg problem**: o resultado precisava das variáveis exportadas, mas as variáveis só eram exportadas após criar o resultado

## Solução Implementada

Movi a chamada de `captureAndRegisterExports` para **DENTRO** de `executeSingleTest`, **ANTES** de construir o resultado final:

### Fluxo Corrigido:
1. `executeSingleTest` executa todos os steps
2. Cria um `preliminaryResult` temporário
3. **Chama `captureAndRegisterExports` com o resultado preliminar** ✅
4. **Depois** busca as variáveis exportadas: `getExportedVariables()`
5. Monta o resultado final com as variáveis já exportadas

## Arquivos Modificados

### 1. `src/services/execution/execution.service.ts`

#### Mudança 1: Moveu captura de exports para dentro de `executeSingleTest`

**Antes:**
```typescript
const result: SuiteExecutionResult = {
  // ...
  variables_captured: this.getExportedVariables(discoveredTest),
  // ...
};

return result;
```

**Depois:**
```typescript
// Create preliminary result for export capture
const preliminaryResult: SuiteExecutionResult = {
  // ...
  variables_captured: {}, // Will be populated after export
  // ...
};

// Capture and register exports BEFORE finalizing result
if (discoveredTest.exports && discoveredTest.exports.length > 0) {
  this.captureAndRegisterExports(discoveredTest, preliminaryResult);
}

// Now get the exported variables after they've been registered
const result: SuiteExecutionResult = {
  ...preliminaryResult,
  variables_captured: this.getExportedVariables(discoveredTest),
};

return result;
```

#### Mudança 2: Removeu chamada duplicada em `executeTestsWithDependencies`

**Antes:**
```typescript
const result = await this.executeSingleTest(test);
results.push(result);

// Captures exported variables and registers in Global Registry
if (test.exports && test.exports.length > 0) {
  this.captureAndRegisterExports(test, result); // ❌ Chamada duplicada
}
```

**Depois:**
```typescript
const result = await this.executeSingleTest(test);
results.push(result);

// Exports are now handled inside executeSingleTest
```

### 2. `src/services/__tests__/execution-coverage.test.ts`

Atualizado teste para refletir a nova arquitetura onde `captureAndRegisterExports` é chamado dentro de `executeSingleTest`:

```typescript
jest
  .spyOn(executionService as any, "executeSingleTest")
  .mockImplementation(async (discoveredTest: any) => {
    // Simulate the internal call to captureAndRegisterExports
    if (discoveredTest.exports && discoveredTest.exports.length > 0) {
      (executionService as any).captureAndRegisterExports(discoveredTest, mockResult);
    }
    return mockResult;
  });
```

## Validação

### Testes Criados
Criados arquivos YAML de teste temporários para validar o fix:
- `tests/test-input-export-suite1.yaml` - Define variáveis via input e exporta
- `tests/test-input-export-suite2.yaml` - Usa variáveis exportadas da Suite 1

### Resultados
✅ Variáveis de input foram exportadas corretamente
✅ Suite 2 conseguiu acessar `{{input_export_test_1.user_selection}}`
✅ Todos os testes unitários passaram (48 testes relacionados a export)
✅ Compilação TypeScript sem erros

## Impacto

### Benefícios
- ✅ Variáveis de `input` agora podem ser exportadas normalmente
- ✅ Melhor consistência: todos os tipos de variáveis (capture, input, computed) seguem o mesmo fluxo de export
- ✅ Resolve problema relatado pelo usuário no caso Dataprev

### Compatibilidade
- ✅ Mudança é transparente para usuários finais
- ✅ Não quebra funcionalidades existentes
- ✅ Todos os testes passaram

## Exemplo de Uso

### Suite que Exporta Input
```yaml
suite_name: "User Input Suite"
node_id: "user_input"
exports: ["benefitId", "userName"]  # ✅ Agora funciona!

steps:
  - name: "Select benefit"
    input:
      prompt: "Select benefit:"
      variable: "benefitId"
      type: "select"
      options: [...]

  - name: "Enter name"
    input:
      prompt: "Your name:"
      variable: "userName"
      type: "text"
```

### Suite que Usa Exports
```yaml
suite_name: "Use Exported Data"
node_id: "use_data"
depends:
  - path: "./user-input.yaml"

steps:
  - name: "Query API with user data"
    request:
      method: GET
      url: "/benefits/{{user_input.benefitId}}"  # ✅ Funciona!
      headers:
        X-User: "{{user_input.userName}}"        # ✅ Funciona!
```

## Conclusão

O problema foi resolvido movendo a lógica de captura de exports para dentro do método `executeSingleTest`, garantindo que as variáveis sejam exportadas **antes** de construir o resultado final da suite. Isso permite que variáveis de qualquer origem (capture, input, computed) sejam exportadas corretamente.
