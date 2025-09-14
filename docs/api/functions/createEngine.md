[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / createEngine

# Function: createEngine()

> **createEngine**(`configPath?`): `any`

Defined in: [index.ts:60](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/index.ts#L60)

Função de conveniência para criação rápida do engine

Cria uma instância do FlowTestEngine com configuração mínima,
ideal para uso em scripts ou integração simples.

## Parameters

### configPath?

`string`

Caminho opcional para arquivo de configuração

## Returns

`any`

Nova instância do FlowTestEngine configurada

## Example

```typescript
const engine = createEngine('./my-config.yml');
const result = await engine.run();
```
