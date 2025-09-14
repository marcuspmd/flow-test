[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / PriorityService

# Class: PriorityService

Defined in: [services/priority.ts:7](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L7)

Service for managing priorities and test ordering

## Constructors

### Constructor

> **new PriorityService**(`configManager`): `PriorityService`

Defined in: [services/priority.ts:11](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L11)

#### Parameters

##### configManager

[`ConfigManager`](ConfigManager.md)

#### Returns

`PriorityService`

## Methods

### initializePriorityWeights()

> `private` **initializePriorityWeights**(): `void`

Defined in: [services/priority.ts:19](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L19)

Inicializa os pesos de prioridade baseado na configuração

#### Returns

`void`

***

### orderTests()

> **orderTests**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [services/priority.ts:33](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L33)

Orders tests by priority and dependencies

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### sortByPriority()

> `private` **sortByPriority**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [services/priority.ts:47](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L47)

Orders tests only by priority

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### resolveExecutionOrder()

> `private` **resolveExecutionOrder**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [services/priority.ts:76](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L76)

Resolves execution order considering dependencies

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### selectHighestPriority()

> `private` **selectHighestPriority**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)

Defined in: [services/priority.ts:122](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L122)

Seleciona o teste de maior prioridade de uma lista

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

***

### getPriorityWeight()

> `private` **getPriorityWeight**(`priority?`): `number`

Defined in: [services/priority.ts:150](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L150)

Obtém o peso de uma prioridade

#### Parameters

##### priority?

`string`

#### Returns

`number`

***

### isRequiredTest()

> **isRequiredTest**(`test`): `boolean`

Defined in: [services/priority.ts:157](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L157)

Checks if a test is considered required

#### Parameters

##### test

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

#### Returns

`boolean`

***

### getRequiredTests()

> **getRequiredTests**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [services/priority.ts:167](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L167)

Filtra apenas testes obrigatórios

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### filterByPriority()

> **filterByPriority**(`tests`, `priorities`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [services/priority.ts:174](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L174)

Filtra testes por nível de prioridade

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

##### priorities

`string`[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### groupByPriority()

> **groupByPriority**(`tests`): `Map`\<`string`, [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

Defined in: [services/priority.ts:187](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L187)

Groups tests by priority

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`Map`\<`string`, [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

***

### getPriorityStats()

> **getPriorityStats**(`tests`): `object`

Defined in: [services/priority.ts:206](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L206)

Calculates priority statistics

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`object`

##### total\_tests

> **total\_tests**: `number` = `tests.length`

##### required\_tests

> **required\_tests**: `number`

##### by\_priority

> **by\_priority**: `Record`\<`string`, \{ `count`: `number`; `percentage`: `number`; `estimated_duration`: `number`; \}\>

##### total\_estimated\_duration

> **total\_estimated\_duration**: `number` = `0`

##### required\_estimated\_duration

> **required\_estimated\_duration**: `number` = `0`

***

### isRequiredPriority()

> `private` **isRequiredPriority**(`priority`): `boolean`

Defined in: [services/priority.ts:250](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L250)

Checks if a priority is required

#### Parameters

##### priority

`string`

#### Returns

`boolean`

***

### suggestOptimizations()

> **suggestOptimizations**(`tests`): `string`[]

Defined in: [services/priority.ts:258](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L258)

Suggests optimizations in priority distribution

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`string`[]

***

### createExecutionPlan()

> **createExecutionPlan**(`tests`): `object`

Defined in: [services/priority.ts:309](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L309)

Creates a detailed execution plan

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`object`

##### phases

> **phases**: `object`[]

##### total\_duration

> **total\_duration**: `number`

##### critical\_path

> **critical\_path**: `string`[]

***

### identifyCriticalPath()

> `private` **identifyCriticalPath**(`tests`): `string`[]

Defined in: [services/priority.ts:372](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L372)

Identifies the critical path of dependencies

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`string`[]

## Properties

### configManager

> `private` **configManager**: [`ConfigManager`](ConfigManager.md)

Defined in: [services/priority.ts:8](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L8)

***

### priorityWeights

> `private` **priorityWeights**: `Map`\<`string`, `number`\>

Defined in: [services/priority.ts:9](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/priority.ts#L9)
