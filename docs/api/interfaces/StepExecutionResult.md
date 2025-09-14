[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / StepExecutionResult

# Interface: StepExecutionResult

Defined in: [types/config.types.ts:143](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L143)

Resultado de execução de um step individual

## Properties

### step\_name

> **step\_name**: `string`

Defined in: [types/config.types.ts:144](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L144)

***

### status

> **status**: `"skipped"` \| `"success"` \| `"failure"`

Defined in: [types/config.types.ts:145](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L145)

***

### duration\_ms

> **duration\_ms**: `number`

Defined in: [types/config.types.ts:146](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L146)

***

### request\_details?

> `optional` **request\_details**: `object`

Defined in: [types/config.types.ts:147](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L147)

#### method

> **method**: `string`

#### url

> **url**: `string`

#### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

#### body?

> `optional` **body**: `any`

#### full\_url?

> `optional` **full\_url**: `string`

#### curl\_command?

> `optional` **curl\_command**: `string`

#### raw\_request?

> `optional` **raw\_request**: `string`

***

### response\_details?

> `optional` **response\_details**: `object`

Defined in: [types/config.types.ts:156](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L156)

#### status\_code

> **status\_code**: `number`

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `any`

#### size\_bytes

> **size\_bytes**: `number`

#### raw\_response?

> `optional` **raw\_response**: `string`

***

### assertions\_results?

> `optional` **assertions\_results**: [`AssertionResult`](AssertionResult.md)[]

Defined in: [types/config.types.ts:163](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L163)

***

### captured\_variables?

> `optional` **captured\_variables**: `Record`\<`string`, `any`\>

Defined in: [types/config.types.ts:164](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L164)

***

### available\_variables?

> `optional` **available\_variables**: `Record`\<`string`, `any`\>

Defined in: [types/config.types.ts:165](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L165)

***

### iteration\_results?

> `optional` **iteration\_results**: `StepExecutionResult`[]

Defined in: [types/config.types.ts:166](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L166)

***

### scenarios\_meta?

> `optional` **scenarios\_meta**: [`ScenarioMeta`](ScenarioMeta.md)

Defined in: [types/config.types.ts:167](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L167)

***

### error\_message?

> `optional` **error\_message**: `string`

Defined in: [types/config.types.ts:168](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/config.types.ts#L168)
