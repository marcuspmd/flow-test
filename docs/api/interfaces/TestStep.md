[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / TestStep

# Interface: TestStep

Defined in: [types/engine.types.ts:275](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L275)

Complete test step definition with extended metadata

## Example

```typescript
const step: TestStep = {
  name: "Create new user account",
  request: {
    method: "POST",
    url: "/api/users",
    headers: { "Content-Type": "application/json" },
    body: {
      username: "{{test_username}}",
      email: "{{test_email}}"
    }
  },
  assert: {
    status_code: 201,
    body: {
      "id": { exists: true },
      "username": { equals: "{{test_username}}" }
    }
  },
  capture: {
    user_id: "body.id",
    created_at: "body.created_at"
  },
  continue_on_failure: false,
  metadata: {
    priority: "high",
    tags: ["user-management", "regression"],
    timeout: 10000
  }
};
```

## Properties

### name

> **name**: `string`

Defined in: [types/engine.types.ts:277](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L277)

Descriptive name for the test step

***

### request

> **request**: [`RequestDetails`](RequestDetails.md)

Defined in: [types/engine.types.ts:279](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L279)

HTTP request configuration

***

### assert?

> `optional` **assert**: [`Assertions`](Assertions.md)

Defined in: [types/engine.types.ts:281](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L281)

Response assertions to validate

***

### capture?

> `optional` **capture**: `Record`\<`string`, `string`\>

Defined in: [types/engine.types.ts:283](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L283)

Data extraction from response

***

### scenarios?

> `optional` **scenarios**: [`ConditionalScenario`](ConditionalScenario.md)[]

Defined in: [types/engine.types.ts:285](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L285)

Conditional scenarios for complex flows

***

### iterate?

> `optional` **iterate**: [`IterationConfig`](../type-aliases/IterationConfig.md)

Defined in: [types/engine.types.ts:287](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L287)

Iteration configuration for repeating the step multiple times

***

### continue\_on\_failure?

> `optional` **continue\_on\_failure**: `boolean`

Defined in: [types/engine.types.ts:289](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L289)

Whether to continue execution if this step fails

***

### metadata?

> `optional` **metadata**: [`TestStepMetadata`](TestStepMetadata.md)

Defined in: [types/engine.types.ts:291](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L291)

Additional metadata for step configuration
