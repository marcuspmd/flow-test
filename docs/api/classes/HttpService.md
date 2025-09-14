[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / HttpService

# Class: HttpService

Defined in: [services/http.service.ts:23](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L23)

Serviço HTTP responsável por executar requisições e processar respostas

Este serviço encapsula a lógica de execução de requisições HTTP usando axios,
incluindo construção de URLs, tratamento de erros, medição de performance
e normalização de respostas.

## Example

```typescript
const httpService = new HttpService('https://api.exemplo.com', 30000);
const result = await httpService.executeRequest('Login', {
  method: 'POST',
  url: '/auth/login',
  body: { username: 'user', password: 'pass' }
});
```

## Constructors

### Constructor

> **new HttpService**(`baseUrl?`, `timeout?`): `HttpService`

Defined in: [services/http.service.ts:50](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L50)

Construtor do HttpService

#### Parameters

##### baseUrl?

`string`

URL base opcional para prefixar requisições relativas

##### timeout?

`number` = `60000`

Timeout em milissegundos (padrão: 30000ms)

#### Returns

`HttpService`

#### Example

```typescript
// Com URL base
const service = new HttpService('https://api.exemplo.com');

// Com timeout customizado
const service = new HttpService('https://api.exemplo.com', 60000);

// Sem URL base (URLs absolutas only)
const service = new HttpService();
```

## Methods

### executeRequest()

> **executeRequest**(`stepName`, `request`): `Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

Defined in: [services/http.service.ts:80](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L80)

Executes an HTTP request and returns the execution details

Main method for executing HTTP requests. Automatically measures
response time, handles errors appropriately and normalizes the response
in a standardized format.

#### Parameters

##### stepName

`string`

Step name for identification in logs and results

##### request

[`RequestDetails`](../interfaces/RequestDetails.md)

HTTP request details to be executed

#### Returns

`Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

Promise that resolves to the execution result

#### Example

```typescript
const result = await httpService.executeRequest('Get User', {
  method: 'GET',
  url: '/users/123',
  headers: { 'Authorization': 'Bearer token' }
});

if (result.status === 'success') {
  console.log('Status:', result.response_details?.status_code);
  console.log('Body:', result.response_details?.body);
}
```

***

### buildFullUrl()

> `private` **buildFullUrl**(`url`): `string`

Defined in: [services/http.service.ts:178](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L178)

Builds the complete URL by combining base_url and request URL

If the request URL is absolute (contains http/https), returns as is.
Otherwise, combines with the baseUrl configured in the constructor.

#### Parameters

##### url

`string`

Request URL (absolute or relative)

#### Returns

`string`

Complete URL for the request

#### Example

```typescript
// With baseUrl = 'https://api.example.com'
buildFullUrl('/users') // returns 'https://api.example.com/users'
buildFullUrl('https://other.com/api') // returns 'https://other.com/api'
```

***

### calculateResponseSize()

> `private` **calculateResponseSize**(`response`): `number`

Defined in: [services/http.service.ts:199](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L199)

Calculates the approximate response size in bytes.

#### Parameters

##### response

`AxiosResponse`

#### Returns

`number`

***

### formatError()

> `private` **formatError**(`error`): `string`

Defined in: [services/http.service.ts:217](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L217)

Formats HTTP request errors for readable messages.

#### Parameters

##### error

`any`

#### Returns

`string`

***

### setTimeout()

> **setTimeout**(`timeout`): `void`

Defined in: [services/http.service.ts:248](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L248)

Sets a new timeout for requests.

#### Parameters

##### timeout

`number`

#### Returns

`void`

***

### setBaseUrl()

> **setBaseUrl**(`baseUrl`): `void`

Defined in: [services/http.service.ts:255](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L255)

Sets a new base URL.

#### Parameters

##### baseUrl

`undefined` | `string`

#### Returns

`void`

***

### sanitizeHeaders()

> `private` **sanitizeHeaders**(`headers`): `Record`\<`string`, `string`\>

Defined in: [services/http.service.ts:263](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L263)

Sanitizes headers to remove invalid characters

#### Parameters

##### headers

`Record`\<`string`, `any`\>

#### Returns

`Record`\<`string`, `string`\>

***

### normalizeHeaders()

> `private` **normalizeHeaders**(`headers`): `Record`\<`string`, `string`\>

Defined in: [services/http.service.ts:286](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L286)

Normalizes axios headers to Record<string, string>.

#### Parameters

##### headers

`any`

#### Returns

`Record`\<`string`, `string`\>

***

### generateCurlCommand()

> `private` **generateCurlCommand**(`url`, `request`): `string`

Defined in: [services/http.service.ts:303](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L303)

Generates a complete cURL command for the request

#### Parameters

##### url

`string`

##### request

[`RequestDetails`](../interfaces/RequestDetails.md)

#### Returns

`string`

***

### generateRawRequest()

> `private` **generateRawRequest**(`url`, `request`): `string`

Defined in: [services/http.service.ts:341](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L341)

Generates raw HTTP request text

#### Parameters

##### url

`string`

##### request

[`RequestDetails`](../interfaces/RequestDetails.md)

#### Returns

`string`

***

### generateRawResponse()

> `private` **generateRawResponse**(`response`): `string`

Defined in: [services/http.service.ts:382](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L382)

Generates raw HTTP response text

#### Parameters

##### response

`AxiosResponse`

#### Returns

`string`

## Properties

### baseUrl?

> `private` `optional` **baseUrl**: `string`

Defined in: [services/http.service.ts:25](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L25)

URL base para construção de URLs completas

***

### timeout

> `private` **timeout**: `number`

Defined in: [services/http.service.ts:28](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L28)

Timeout em milissegundos para requisições HTTP

***

### logger

> `private` **logger**: `LoggerService`

Defined in: [services/http.service.ts:30](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/http.service.ts#L30)
