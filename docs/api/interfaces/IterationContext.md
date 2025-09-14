[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / IterationContext

# Interface: IterationContext

Defined in: [types/engine.types.ts:190](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L190)

Context for a single iteration execution

## Properties

### index

> **index**: `number`

Defined in: [types/engine.types.ts:192](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L192)

Current iteration index (0-based)

***

### value

> **value**: `any`

Defined in: [types/engine.types.ts:194](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L194)

Current item (for array iteration) or current value (for range iteration)

***

### variableName

> **variableName**: `string`

Defined in: [types/engine.types.ts:196](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L196)

Variable name to bind the value to

***

### isFirst

> **isFirst**: `boolean`

Defined in: [types/engine.types.ts:198](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L198)

Whether this is the first iteration

***

### isLast

> **isLast**: `boolean`

Defined in: [types/engine.types.ts:200](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L200)

Whether this is the last iteration
