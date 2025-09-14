[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / Assertions

# Interface: Assertions

Defined in: [types/engine.types.ts:93](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L93)

Conjunto completo de validações para uma resposta HTTP

Define todas as validações que podem ser aplicadas a uma resposta,
incluindo assertions customizadas e validações de tempo de resposta
com limites superior e inferior.

## Example

```yaml
assert:
  status_code: 200
  body:
    success:
      equals: true
    data:
      type: object
      exists: true
  headers:
    content-type:
      contains: "application/json"
  response_time_ms:
    less_than: 2000
    greater_than: 10
  custom:
    - name: "Valid user ID format"
      condition: "body.user.id && type(body.user.id) == 'number'"
      message: "User ID must be a number"
```

## Properties

### status\_code?

> `optional` **status\_code**: `number` \| [`AssertionChecks`](AssertionChecks.md)

Defined in: [types/engine.types.ts:94](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L94)

***

### body?

> `optional` **body**: `Record`\<`string`, [`AssertionChecks`](AssertionChecks.md)\>

Defined in: [types/engine.types.ts:95](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L95)

***

### headers?

> `optional` **headers**: `Record`\<`string`, [`AssertionChecks`](AssertionChecks.md)\>

Defined in: [types/engine.types.ts:96](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L96)

***

### response\_time\_ms?

> `optional` **response\_time\_ms**: `object`

Defined in: [types/engine.types.ts:97](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L97)

#### less\_than?

> `optional` **less\_than**: `number`

#### greater\_than?

> `optional` **greater\_than**: `number`

***

### custom?

> `optional` **custom**: `object`[]

Defined in: [types/engine.types.ts:101](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L101)

#### name

> **name**: `string`

#### condition

> **condition**: `string`

#### message?

> `optional` **message**: `string`
