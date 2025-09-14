[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / RequestDetails

# Interface: RequestDetails

Defined in: [types/engine.types.ts:17](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L17)

Detalhes de uma requisição HTTP com suporte estendido

Versão aprimorada que inclui timeout configurável e métodos HTTP adicionais
como HEAD e OPTIONS para casos de uso avançados.

## Properties

### method

> **method**: `"GET"` \| `"POST"` \| `"PUT"` \| `"DELETE"` \| `"PATCH"` \| `"HEAD"` \| `"OPTIONS"`

Defined in: [types/engine.types.ts:18](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L18)

***

### url

> **url**: `string`

Defined in: [types/engine.types.ts:19](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L19)

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [types/engine.types.ts:20](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L20)

***

### body?

> `optional` **body**: `any`

Defined in: [types/engine.types.ts:21](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L21)

***

### params?

> `optional` **params**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:22](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L22)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [types/engine.types.ts:23](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L23)
