[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ExecutionConfig

# Interface: ExecutionConfig

Defined in: [types/config.types.ts:50](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L50)

Configuração de execução

## Properties

### mode

> **mode**: `"sequential"` \| `"parallel"`

Defined in: [types/config.types.ts:51](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L51)

***

### max\_parallel?

> `optional` **max\_parallel**: `number`

Defined in: [types/config.types.ts:52](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L52)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [types/config.types.ts:53](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L53)

***

### continue\_on\_failure?

> `optional` **continue\_on\_failure**: `boolean`

Defined in: [types/config.types.ts:54](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L54)

***

### retry\_failed?

> `optional` **retry\_failed**: `object`

Defined in: [types/config.types.ts:55](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L55)

#### enabled

> **enabled**: `boolean`

#### max\_attempts

> **max\_attempts**: `number`

#### delay\_ms

> **delay\_ms**: `number`
