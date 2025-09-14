[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [types/engine.types.ts:512](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L512)

Execution context for a running test

Contains all runtime information and state for the currently executing test,
including suite definition, variable scopes, and execution metadata.

## Example

```typescript
const context: ExecutionContext = {
  suite: {
    suite_name: "User API Tests",
    steps: [...]
  },
  global_variables: {
    api_base_url: "https://api.example.com",
    auth_token: "abc123"
  },
  runtime_variables: {
    user_id: "user_456",
    test_timestamp: "2024-01-01T12:00:00Z"
  },
  step_index: 2,
  total_steps: 5,
  start_time: new Date("2024-01-01T12:00:00Z"),
  execution_id: "exec_789"
};
```

## Properties

### suite

> **suite**: [`TestSuite`](TestSuite.md)

Defined in: [types/engine.types.ts:514](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L514)

The test suite being executed

***

### global\_variables

> **global\_variables**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:516](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L516)

Variables shared across all tests

***

### runtime\_variables

> **runtime\_variables**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:518](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L518)

Variables specific to current execution

***

### step\_index

> **step\_index**: `number`

Defined in: [types/engine.types.ts:520](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L520)

Current step index (0-based)

***

### total\_steps

> **total\_steps**: `number`

Defined in: [types/engine.types.ts:522](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L522)

Total number of steps in suite

***

### start\_time

> **start\_time**: `Date`

Defined in: [types/engine.types.ts:524](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L524)

When execution started

***

### execution\_id

> **execution\_id**: `string`

Defined in: [types/engine.types.ts:526](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L526)

Unique identifier for this execution
