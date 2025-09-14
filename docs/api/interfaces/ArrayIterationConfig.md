[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ArrayIterationConfig

# Interface: ArrayIterationConfig

Defined in: [types/engine.types.ts:156](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L156)

Configuration for array iteration in test steps

## Example

```yaml
iterate:
  over: "{{test_cases}}"
  as: "item"
```

## Properties

### over

> **over**: `string`

Defined in: [types/engine.types.ts:158](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L158)

JMESPath expression or variable name pointing to the array to iterate over

***

### as

> **as**: `string`

Defined in: [types/engine.types.ts:160](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L160)

Variable name to use for the current item in each iteration
