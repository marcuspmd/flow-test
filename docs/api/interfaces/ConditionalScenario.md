[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ConditionalScenario

# Interface: ConditionalScenario

Defined in: [types/engine.types.ts:127](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L127)

Conditional scenarios for happy/sad path testing

## Example

```typescript
const scenario: ConditionalScenario = {
  name: "Check user role",
  condition: "body.user.role == 'admin'",
  then: {
    assert: { status_code: 200 },
    capture: { admin_id: "body.user.id" }
  },
  else: {
    assert: { status_code: 403 },
    variables: { is_admin: false }
  }
};
```

## Properties

### name?

> `optional` **name**: `string`

Defined in: [types/engine.types.ts:129](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L129)

Optional name for the scenario

***

### condition

> **condition**: `string`

Defined in: [types/engine.types.ts:131](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L131)

JMESPath expression to evaluate condition

***

### then?

> `optional` **then**: `object`

Defined in: [types/engine.types.ts:133](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L133)

Actions to execute if condition is true

#### assert?

> `optional` **assert**: [`Assertions`](Assertions.md)

#### capture?

> `optional` **capture**: `Record`\<`string`, `string`\>

#### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>

***

### else?

> `optional` **else**: `object`

Defined in: [types/engine.types.ts:139](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L139)

Actions to execute if condition is false

#### assert?

> `optional` **assert**: [`Assertions`](Assertions.md)

#### capture?

> `optional` **capture**: `Record`\<`string`, `string`\>

#### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>
