[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / AggregatedResult

# Interface: AggregatedResult

Defined in: [types/config.types.ts:103](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L103)

Resultado agregado de execução

## Properties

### project\_name

> **project\_name**: `string`

Defined in: [types/config.types.ts:104](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L104)

***

### start\_time

> **start\_time**: `string`

Defined in: [types/config.types.ts:105](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L105)

***

### end\_time

> **end\_time**: `string`

Defined in: [types/config.types.ts:106](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L106)

***

### total\_duration\_ms

> **total\_duration\_ms**: `number`

Defined in: [types/config.types.ts:107](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L107)

***

### total\_tests

> **total\_tests**: `number`

Defined in: [types/config.types.ts:108](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L108)

***

### successful\_tests

> **successful\_tests**: `number`

Defined in: [types/config.types.ts:109](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L109)

***

### failed\_tests

> **failed\_tests**: `number`

Defined in: [types/config.types.ts:110](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L110)

***

### skipped\_tests

> **skipped\_tests**: `number`

Defined in: [types/config.types.ts:111](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L111)

***

### success\_rate

> **success\_rate**: `number`

Defined in: [types/config.types.ts:112](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L112)

***

### suites\_results

> **suites\_results**: [`SuiteExecutionResult`](SuiteExecutionResult.md)[]

Defined in: [types/config.types.ts:113](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L113)

***

### global\_variables\_final\_state

> **global\_variables\_final\_state**: `Record`\<`string`, `any`\>

Defined in: [types/config.types.ts:114](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L114)

***

### performance\_summary?

> `optional` **performance\_summary**: [`PerformanceSummary`](PerformanceSummary.md)

Defined in: [types/config.types.ts:115](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L115)
