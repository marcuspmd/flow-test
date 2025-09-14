[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / AssertionService

# Class: AssertionService

Defined in: [services/assertion.service.ts:32](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L32)

Service responsible for validating assertions in HTTP responses

This service processes and validates all assertions defined in tests,
including status code, headers, body and response time validations.
Supports flat syntax (body.status) and structured syntax (body: {status}).

## Example

```typescript
const assertionService = new AssertionService();
const results = assertionService.validateAssertions({
  status_code: 200,
  'body.message': { equals: 'success' }
}, executionResult);

results.forEach(result => {
  console.log(`${result.field}: ${result.passed ? 'PASS' : 'FAIL'}`);
});
```

## Constructors

### Constructor

> **new AssertionService**(): `AssertionService`

#### Returns

`AssertionService`

## Methods

### validateAssertions()

> **validateAssertions**(`assertions`, `result`): [`AssertionResult`](../interfaces/AssertionResult.md)[]

Defined in: [services/assertion.service.ts:54](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L54)

Validates all assertions of an HTTP response

Main method that processes all configured assertions
and returns an array with the results of each validation.

#### Parameters

##### assertions

[`Assertions`](../interfaces/Assertions.md)

Object with assertions to be validated

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

HTTP execution result containing response

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)[]

Array of validation results

#### Example

```typescript
const results = assertionService.validateAssertions({
  status_code: 200,
  'body.data.id': { not_null: true },
  'headers.content-type': { contains: 'application/json' }
}, executionResult);
```

***

### preprocessAssertions()

> `private` **preprocessAssertions**(`assertions`): [`Assertions`](../interfaces/Assertions.md)

Defined in: [services/assertion.service.ts:135](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L135)

Pre-processes assertions to support flat and structured syntax

Converts flat assertions (like 'body.status') into hierarchical structure
for uniform processing. Also processes 'headers.header-name'.

#### Parameters

##### assertions

`any`

Object with assertions in mixed format

#### Returns

[`Assertions`](../interfaces/Assertions.md)

Normalized object with hierarchical structure

#### Example

```typescript
// Input: { 'body.status': 'success', 'headers.auth': 'Bearer xyz' }
// Output: {
//   body: { status: 'success' },
//   headers: { auth: 'Bearer xyz' }
// }
```

***

### validateStatusCode()

> `private` **validateStatusCode**(`expected`, `result`): [`AssertionResult`](../interfaces/AssertionResult.md)

Defined in: [services/assertion.service.ts:178](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L178)

Validates the response status code.

#### Parameters

##### expected

`number`

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)

***

### validateHeaders()

> `private` **validateHeaders**(`expectedHeaders`, `result`): [`AssertionResult`](../interfaces/AssertionResult.md)[]

Defined in: [services/assertion.service.ts:197](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L197)

Validates the response headers.

#### Parameters

##### expectedHeaders

`Record`\<`string`, [`AssertionChecks`](../interfaces/AssertionChecks.md)\>

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)[]

***

### validateBody()

> `private` **validateBody**(`expectedBody`, `result`): [`AssertionResult`](../interfaces/AssertionResult.md)[]

Defined in: [services/assertion.service.ts:222](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L222)

Validates the response body using JMESPath.

#### Parameters

##### expectedBody

`Record`\<`string`, [`AssertionChecks`](../interfaces/AssertionChecks.md)\>

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)[]

***

### validateResponseTime()

> `private` **validateResponseTime**(`timeChecks`, `result`): [`AssertionResult`](../interfaces/AssertionResult.md)[]

Defined in: [services/assertion.service.ts:258](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L258)

Validates the response time.

#### Parameters

##### timeChecks

###### less_than?

`number`

###### greater_than?

`number`

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)[]

***

### validateFieldChecks()

> `private` **validateFieldChecks**(`fieldName`, `checks`, `actualValue`): [`AssertionResult`](../interfaces/AssertionResult.md)[]

Defined in: [services/assertion.service.ts:301](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L301)

Validates a set of checks for a specific field.

#### Parameters

##### fieldName

`string`

##### checks

[`AssertionChecks`](../interfaces/AssertionChecks.md)

##### actualValue

`any`

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)[]

***

### deepEqual()

> `private` **deepEqual**(`a`, `b`): `boolean`

Defined in: [services/assertion.service.ts:390](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L390)

Checks if two values are deeply equal with type-tolerant comparison.

#### Parameters

##### a

`any`

##### b

`any`

#### Returns

`boolean`

***

### contains()

> `private` **contains**(`haystack`, `needle`): `boolean`

Defined in: [services/assertion.service.ts:437](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L437)

Checks if a value contains another (for strings, arrays, or objects).

#### Parameters

##### haystack

`any`

##### needle

`any`

#### Returns

`boolean`

***

### matchesRegex()

> `private` **matchesRegex**(`value`, `pattern`): `boolean`

Defined in: [services/assertion.service.ts:458](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L458)

Checks if a value matches a regular expression.

#### Parameters

##### value

`any`

##### pattern

`string`

#### Returns

`boolean`

***

### createAssertionResult()

> `private` **createAssertionResult**(`field`, `expected`, `actual`, `passed`, `message?`): [`AssertionResult`](../interfaces/AssertionResult.md)

Defined in: [services/assertion.service.ts:472](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L472)

Creates a standardized assertion result.

#### Parameters

##### field

`string`

##### expected

`any`

##### actual

`any`

##### passed

`boolean`

##### message?

`string`

#### Returns

[`AssertionResult`](../interfaces/AssertionResult.md)

## Properties

### logger

> `private` **logger**: `LoggerService`

Defined in: [services/assertion.service.ts:33](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/assertion.service.ts#L33)
