[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ExecutionStats

# Interface: ExecutionStats

Defined in: [types/engine.types.ts:550](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L550)

Real-time execution statistics and metrics

Provides comprehensive metrics about the current execution state,
including counts, timing, and performance data.

## Example

```typescript
const stats: ExecutionStats = {
  tests_discovered: 15,
  tests_completed: 10,
  tests_successful: 8,
  tests_failed: 2,
  tests_skipped: 0,
  current_test: "User Authentication Tests",
  estimated_time_remaining_ms: 45000,
  requests_made: 127,
  total_response_time_ms: 12500
};
```

## Properties

### tests\_discovered

> **tests\_discovered**: `number`

Defined in: [types/engine.types.ts:552](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L552)

Total number of test suites discovered

***

### tests\_completed

> **tests\_completed**: `number`

Defined in: [types/engine.types.ts:554](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L554)

Number of test suites completed

***

### tests\_successful

> **tests\_successful**: `number`

Defined in: [types/engine.types.ts:556](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L556)

Number of test suites that passed

***

### tests\_failed

> **tests\_failed**: `number`

Defined in: [types/engine.types.ts:558](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L558)

Number of test suites that failed

***

### tests\_skipped

> **tests\_skipped**: `number`

Defined in: [types/engine.types.ts:560](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L560)

Number of test suites that were skipped

***

### current\_test?

> `optional` **current\_test**: `string`

Defined in: [types/engine.types.ts:562](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L562)

Name of currently executing test

***

### estimated\_time\_remaining\_ms?

> `optional` **estimated\_time\_remaining\_ms**: `number`

Defined in: [types/engine.types.ts:564](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L564)

Estimated time remaining in milliseconds

***

### requests\_made

> **requests\_made**: `number`

Defined in: [types/engine.types.ts:566](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L566)

Total HTTP requests made

***

### total\_response\_time\_ms

> **total\_response\_time\_ms**: `number`

Defined in: [types/engine.types.ts:568](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L568)

Cumulative response time across all requests
