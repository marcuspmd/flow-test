[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / CacheConfig

# Interface: CacheConfig

Defined in: [types/engine.types.ts:821](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L821)

Configuração de cache

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/engine.types.ts:822](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L822)

***

### variable\_interpolation

> **variable\_interpolation**: `boolean`

Defined in: [types/engine.types.ts:823](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L823)

***

### response\_cache?

> `optional` **response\_cache**: `object`

Defined in: [types/engine.types.ts:824](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L824)

#### enabled

> **enabled**: `boolean`

#### ttl\_ms

> **ttl\_ms**: `number`

#### key\_strategy

> **key\_strategy**: `"custom"` \| `"url"` \| `"url_and_headers"`
