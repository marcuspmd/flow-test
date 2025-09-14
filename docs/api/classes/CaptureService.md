[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / CaptureService

# Class: CaptureService

Defined in: [services/capture.service.ts:24](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L24)

Service responsible for capturing variables from HTTP responses

Uses JMESPath expressions to extract specific values from HTTP responses
and store them as variables for use in subsequent steps.

## Example

```typescript
const captureService = new CaptureService();

const captured = captureService.captureVariables({
  user_id: 'body.data.user.id',
  token: 'body.access_token',
  status: 'status_code'
}, executionResult);

console.log(captured.user_id); // Value extracted from body.data.user.id
```

## Constructors

### Constructor

> **new CaptureService**(): `CaptureService`

#### Returns

`CaptureService`

## Methods

### captureVariables()

> **captureVariables**(`captureConfig`, `result`, `variableContext?`): `Record`\<`string`, `any`\>

Defined in: [services/capture.service.ts:47](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L47)

Captures variables from HTTP response using JMESPath expressions

Processes a map of captures where the key is the variable name
to be created and the value is the JMESPath expression to extract the data.

#### Parameters

##### captureConfig

`Record`\<`string`, `string`\>

Map of variable_name -> jmespath_expression

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

HTTP execution result containing the response

##### variableContext?

`Record`\<`string`, `any`\>

Current variable context for JavaScript expressions

#### Returns

`Record`\<`string`, `any`\>

Object with captured variables

#### Example

```typescript
const captured = captureService.captureVariables({
  user_id: 'body.user.id',
  auth_token: 'body.token',
  response_time: 'duration_ms'
}, executionResult, currentVariables);
```

***

### extractValue()

> `private` **extractValue**(`expression`, `result`, `variableContext?`): `any`

Defined in: [services/capture.service.ts:93](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L93)

Extracts a value from the response using JMESPath or evaluates expressions

#### Parameters

##### expression

`string`

JMESPath expression, JavaScript expression, or direct value

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

Execution result

##### variableContext?

`Record`\<`string`, `any`\>

Current variable context for JavaScript expressions

#### Returns

`any`

Extracted value

#### Throws

Error if expression is invalid

***

### buildContext()

> `private` **buildContext**(`result`): `any`

Defined in: [services/capture.service.ts:193](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L193)

Builds the complete context for data extraction via JMESPath

Creates an object containing all available data from the HTTP response
that can be accessed via JMESPath expressions.

#### Parameters

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

HTTP execution result

#### Returns

`any`

Structured context for JMESPath

#### Example

```typescript
// Returned context:
{
  status_code: 200,
  headers: { 'content-type': 'application/json' },
  body: { user: { id: 123 } },
  duration_ms: 250,
  size_bytes: 1024
}
```

***

### formatValue()

> `private` **formatValue**(`value`): `string`

Defined in: [services/capture.service.ts:215](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L215)

Formats a value for readable console display

Truncates long strings and objects to avoid visual clutter
in variable capture logs.

#### Parameters

##### value

`any`

Value to be formatted

#### Returns

`string`

Formatted string for display

***

### validateCapturePaths()

> **validateCapturePaths**(`capturePaths`): `string`[]

Defined in: [services/capture.service.ts:233](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L233)

Validates if a set of JMESPath are valid.

#### Parameters

##### capturePaths

`Record`\<`string`, `string`\>

#### Returns

`string`[]

***

### listAvailablePaths()

> **listAvailablePaths**(`obj`, `prefix`, `maxDepth`): `string`[]

Defined in: [services/capture.service.ts:251](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L251)

Lists all available paths in an object for debugging.

#### Parameters

##### obj

`any`

##### prefix

`string` = `""`

##### maxDepth

`number` = `3`

#### Returns

`string`[]

***

### suggestCapturePaths()

> **suggestCapturePaths**(`result`): `string`[]

Defined in: [services/capture.service.ts:279](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L279)

Suggests possible JMESPath based on response content.

#### Parameters

##### result

[`StepExecutionResult`](../interfaces/StepExecutionResult.md)

#### Returns

`string`[]

## Properties

### logger

> `private` **logger**: `LoggerService`

Defined in: [services/capture.service.ts:25](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/capture.service.ts#L25)
