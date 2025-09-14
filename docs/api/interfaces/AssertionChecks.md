[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / AssertionChecks

# Interface: AssertionChecks

Defined in: [types/engine.types.ts:48](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L48)

Regras de validação estendidas para um campo específico

Versão aprimorada das regras de assertion incluindo validações de tipo,
existência, comprimento e outras verificações avançadas.

## Example

```yaml
assert:
  body:
    user_id:
      type: number
      greater_than: 0
    email:
      exists: true
      regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
    items:
      length:
        greater_than: 0
        less_than: 100
```

## Properties

### equals?

> `optional` **equals**: `any`

Defined in: [types/engine.types.ts:49](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L49)

***

### contains?

> `optional` **contains**: `any`

Defined in: [types/engine.types.ts:50](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L50)

***

### not\_equals?

> `optional` **not\_equals**: `any`

Defined in: [types/engine.types.ts:51](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L51)

***

### greater\_than?

> `optional` **greater\_than**: `number`

Defined in: [types/engine.types.ts:52](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L52)

***

### less\_than?

> `optional` **less\_than**: `number`

Defined in: [types/engine.types.ts:53](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L53)

***

### regex?

> `optional` **regex**: `string`

Defined in: [types/engine.types.ts:54](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L54)

***

### exists?

> `optional` **exists**: `boolean`

Defined in: [types/engine.types.ts:55](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L55)

***

### type?

> `optional` **type**: `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"array"`

Defined in: [types/engine.types.ts:56](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L56)

***

### length?

> `optional` **length**: `object`

Defined in: [types/engine.types.ts:57](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L57)

#### equals?

> `optional` **equals**: `number`

#### greater\_than?

> `optional` **greater\_than**: `number`

#### less\_than?

> `optional` **less\_than**: `number`
