[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / FlowDependency

# Interface: FlowDependency

Defined in: [types/engine.types.ts:314](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L314)

Flow dependency configuration

## Example

```typescript
const dependency: FlowDependency = {
  path: "./auth/setup-auth.yaml",
  required: true,
  cache: 300, // 5 minutes TTL
  condition: "environment == 'test'",
  variables: {
    test_mode: true
  },
  retry: {
    max_attempts: 2,
    delay_ms: 1000
  }
};
```

## Properties

### path?

> `optional` **path**: `string`

Defined in: [types/engine.types.ts:316](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L316)

Path to the dependency flow or node_id for direct reference

***

### node\_id?

> `optional` **node\_id**: `string`

Defined in: [types/engine.types.ts:318](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L318)

Node ID for direct reference to another test suite

***

### required?

> `optional` **required**: `boolean`

Defined in: [types/engine.types.ts:320](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L320)

Whether this dependency is required for execution

***

### cache?

> `optional` **cache**: `number` \| `boolean`

Defined in: [types/engine.types.ts:322](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L322)

Cache configuration: true, false, or TTL in seconds

***

### condition?

> `optional` **condition**: `string`

Defined in: [types/engine.types.ts:324](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L324)

JMESPath condition for conditional execution

***

### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:326](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L326)

Variables to override in the dependency

***

### retry?

> `optional` **retry**: `object`

Defined in: [types/engine.types.ts:328](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L328)

Retry configuration for failed dependencies

#### max\_attempts

> **max\_attempts**: `number`

#### delay\_ms

> **delay\_ms**: `number`
