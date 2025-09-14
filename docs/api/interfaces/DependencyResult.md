[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / DependencyResult

# Interface: DependencyResult

Defined in: [types/engine.types.ts:352](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L352)

Result of dependency execution

## Example

```typescript
const result: DependencyResult = {
  flowPath: "./auth/setup-auth.yaml",
  suiteName: "Authentication Setup",
  success: true,
  executionTime: 1250,
  exportedVariables: {
    auth_token: "abc123",
    user_id: "user_456"
  },
  cached: false
};
```

## Properties

### flowPath

> **flowPath**: `string`

Defined in: [types/engine.types.ts:354](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L354)

Path to the executed dependency flow

***

### nodeId

> **nodeId**: `string`

Defined in: [types/engine.types.ts:356](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L356)

Node ID of the executed dependency

***

### suiteName

> **suiteName**: `string`

Defined in: [types/engine.types.ts:358](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L358)

Name of the executed suite

***

### success

> **success**: `boolean`

Defined in: [types/engine.types.ts:360](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L360)

Whether the dependency executed successfully

***

### executionTime

> **executionTime**: `number`

Defined in: [types/engine.types.ts:362](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L362)

Execution time in milliseconds

***

### exportedVariables

> **exportedVariables**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:364](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L364)

Variables exported by the dependency

***

### cached

> **cached**: `boolean`

Defined in: [types/engine.types.ts:366](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L366)

Whether the result was retrieved from cache

***

### error?

> `optional` **error**: `string`

Defined in: [types/engine.types.ts:368](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L368)

Error message if execution failed
