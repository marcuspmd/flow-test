[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / TestSuite

# Interface: TestSuite

Defined in: [types/engine.types.ts:458](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L458)

Complete test suite definition with extended metadata

## Example

```typescript
const testSuite: TestSuite = {
  node_id: "user-mgmt-e2e",
  suite_name: "E2E User Management Tests",
  description: "Complete end-to-end testing of user management features",
  base_url: "https://api.example.com",
  // Flow dependencies replaced by 'depends' field
  variables: {
    test_user_email: "test@example.com",
    api_version: "v1"
  },
  steps: [
    {
      name: "Create user",
      request: {
        method: "POST",
        url: "/users",
        body: { email: "{{test_user_email}}" }
      }
    }
  ],
  exports: ["created_user_id", "auth_token"],
  depends: [
    {
      node_id: "database_setup",
      required: true
    }
  ],
  metadata: {
    priority: "high",
    tags: ["e2e", "user-management", "regression"],
    timeout: 30000,
    estimated_duration_ms: 15000
  }
};
```

## Properties

### node\_id

> **node\_id**: `string`

Defined in: [types/engine.types.ts:460](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L460)

Unique node identifier for this test suite

***

### suite\_name

> **suite\_name**: `string`

Defined in: [types/engine.types.ts:462](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L462)

Name of the test suite

***

### description?

> `optional` **description**: `string`

Defined in: [types/engine.types.ts:464](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L464)

Description of what this suite tests

***

### base\_url?

> `optional` **base\_url**: `string`

Defined in: [types/engine.types.ts:466](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L466)

Base URL for all requests in this suite

***

### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>

Defined in: [types/engine.types.ts:468](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L468)

Variables available to all steps

***

### steps

> **steps**: [`TestStep`](TestStep.md)[]

Defined in: [types/engine.types.ts:470](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L470)

Test steps to execute

***

### exports?

> `optional` **exports**: `string`[]

Defined in: [types/engine.types.ts:472](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L472)

Variables to export to global scope

***

### depends?

> `optional` **depends**: [`FlowDependency`](FlowDependency.md)[]

Defined in: [types/engine.types.ts:474](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L474)

Dependencies that must be satisfied before execution

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [types/engine.types.ts:476](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L476)

Extended metadata for suite configuration

#### priority?

> `optional` **priority**: `string`

#### tags?

> `optional` **tags**: `string`[]

#### timeout?

> `optional` **timeout**: `number`

#### estimated\_duration\_ms?

> `optional` **estimated\_duration\_ms**: `number`
