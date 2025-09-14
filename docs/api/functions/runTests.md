[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / runTests

# Function: runTests()

> **runTests**(`configPath?`): `Promise`\<`any`\>

Defined in: [index.ts:87](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/index.ts#L87)

Função de conveniência para execução one-shot

Cria um engine, executa todos os testes e retorna o resultado.
Ideal para automação e integração em pipelines de CI/CD.

## Parameters

### configPath?

`string`

Caminho opcional para arquivo de configuração

## Returns

`Promise`\<`any`\>

Promise que resolve para o resultado agregado da execução

## Example

```typescript
// Execução simples
const result = await runTests();
console.log(`Success rate: ${result.success_rate}%`);

// Com configuração específica
const result2 = await runTests('./prod-config.yml');
if (result2.failed_tests > 0) {
  process.exit(1);
}
```
