[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / SuiteExecutionResult

# Interface: SuiteExecutionResult

Defined in: [types/config.types.ts:121](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L121)

Resultado de execução de uma suíte individual

## Properties

### node\_id

> **node\_id**: `string`

Defined in: [types/config.types.ts:122](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L122)

***

### suite\_name

> **suite\_name**: `string`

Defined in: [types/config.types.ts:123](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L123)

***

### file\_path

> **file\_path**: `string`

Defined in: [types/config.types.ts:124](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L124)

***

### priority?

> `optional` **priority**: `string`

Defined in: [types/config.types.ts:125](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L125)

***

### start\_time

> **start\_time**: `string`

Defined in: [types/config.types.ts:126](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L126)

***

### end\_time

> **end\_time**: `string`

Defined in: [types/config.types.ts:127](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L127)

***

### duration\_ms

> **duration\_ms**: `number`

Defined in: [types/config.types.ts:128](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L128)

***

### status

> **status**: `"skipped"` \| `"success"` \| `"failure"`

Defined in: [types/config.types.ts:129](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L129)

***

### steps\_executed

> **steps\_executed**: `number`

Defined in: [types/config.types.ts:130](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L130)

***

### steps\_successful

> **steps\_successful**: `number`

Defined in: [types/config.types.ts:131](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L131)

***

### steps\_failed

> **steps\_failed**: `number`

Defined in: [types/config.types.ts:132](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L132)

***

### success\_rate

> **success\_rate**: `number`

Defined in: [types/config.types.ts:133](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L133)

***

### steps\_results

> **steps\_results**: [`StepExecutionResult`](StepExecutionResult.md)[]

Defined in: [types/config.types.ts:134](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L134)

***

### error\_message?

> `optional` **error\_message**: `string`

Defined in: [types/config.types.ts:135](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L135)

***

### variables\_captured

> **variables\_captured**: `Record`\<`string`, `any`\>

Defined in: [types/config.types.ts:136](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L136)

***

### available\_variables?

> `optional` **available\_variables**: `Record`\<`string`, `any`\>

Defined in: [types/config.types.ts:137](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L137)
