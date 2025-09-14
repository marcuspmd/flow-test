[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ReusableFlow

# Interface: ReusableFlow

Defined in: [types/engine.types.ts:396](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L396)

Reusable flow definition

## Example

```typescript
const reusableFlow: ReusableFlow = {
  flow_name: "User Registration Flow",
  description: "Complete user registration with validation",
  variables: {
    base_url: "https://api.example.com",
    test_email: "test@example.com"
  },
  steps: [
    {
      name: "Create user account",
      request: {
        method: "POST",
        url: "/users",
        body: { email: "{{test_email}}" }
      }
    }
  ]
};
```

## Properties

### flow\_name

> **flow\_name**: `string`

Defined in: [types/engine.types.ts:398](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L398)

Name of the reusable flow

***

### description?

> `optional` **description**: `string`

Defined in: [types/engine.types.ts:400](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L400)

Description of what this flow does

***

### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:402](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L402)

Default variables for the flow

***

### steps

> **steps**: [`TestStep`](TestStep.md)[]

Defined in: [types/engine.types.ts:404](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L404)

Test steps that comprise the flow

***

### exports?

> `optional` **exports**: `string`[]

Defined in: [types/engine.types.ts:406](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L406)

Variables to export to global scope after execution

***

### depends?

> `optional` **depends**: [`FlowDependency`](FlowDependency.md)[]

Defined in: [types/engine.types.ts:408](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L408)

Flow dependencies that must be executed first

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [types/engine.types.ts:410](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L410)

Additional metadata for flow execution

#### priority?

> `optional` **priority**: `string`

#### tags?

> `optional` **tags**: `string`[]

#### estimated\_duration\_ms?

> `optional` **estimated\_duration\_ms**: `number`
