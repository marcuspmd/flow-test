[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / TestStepMetadata

# Interface: TestStepMetadata

Defined in: [types/engine.types.ts:221](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L221)

Metadata for test step configuration and behavior

## Example

```typescript
const metadata: TestStepMetadata = {
  priority: "high",
  tags: ["auth", "smoke"],
  timeout: 5000,
  retry: {
    max_attempts: 3,
    delay_ms: 1000
  },
  depends_on: ["login_step"],
  description: "Validates user authentication token"
};
```

## Properties

### priority?

> `optional` **priority**: `string`

Defined in: [types/engine.types.ts:223](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L223)

Execution priority (high, medium, low)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/engine.types.ts:225](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L225)

Tags for categorization and filtering

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [types/engine.types.ts:227](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L227)

Maximum execution time in milliseconds

***

### retry?

> `optional` **retry**: `object`

Defined in: [types/engine.types.ts:229](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L229)

Retry configuration for failed steps

#### max\_attempts

> **max\_attempts**: `number`

#### delay\_ms

> **delay\_ms**: `number`

***

### depends\_on?

> `optional` **depends\_on**: `string`[]

Defined in: [types/engine.types.ts:234](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L234)

Array of step names this step depends on

***

### description?

> `optional` **description**: `string`

Defined in: [types/engine.types.ts:236](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L236)

Human-readable description of the step
