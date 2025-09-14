[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / planTests

# Function: planTests()

> **planTests**(`configPath?`): `Promise`\<`any`\>

Defined in: [index.ts:112](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/index.ts#L112)

Função para dry-run (apenas descoberta e planejamento)

Executa apenas a fase de descoberta e planejamento dos testes
sem executar as requisições HTTP. Útil para validar configuração
e visualizar o plano de execução.

## Parameters

### configPath?

`string`

Caminho opcional para arquivo de configuração

## Returns

`Promise`\<`any`\>

Promise que resolve para informações sobre testes descobertos

## Example

```typescript
const plan = await planTests('./config.yml');
console.log(`Found ${plan.total_tests} tests to execute`);
plan.suites_results.forEach(suite => {
  console.log(`- ${suite.suite_name} (${suite.total_steps} steps)`);
});
```
