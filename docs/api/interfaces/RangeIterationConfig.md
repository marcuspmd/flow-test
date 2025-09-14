[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / RangeIterationConfig

# Interface: RangeIterationConfig

Defined in: [types/engine.types.ts:173](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L173)

Configuration for range iteration in test steps

## Example

```yaml
iterate:
  range: "1..5"
  as: "index"
```

## Properties

### range

> **range**: `string`

Defined in: [types/engine.types.ts:175](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L175)

Range specification in format "start..end" (inclusive)

***

### as

> **as**: `string`

Defined in: [types/engine.types.ts:177](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L177)

Variable name to use for the current index in each iteration
